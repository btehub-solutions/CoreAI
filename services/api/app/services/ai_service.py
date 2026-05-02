# google-genai is imported lazily inside _get_client() to avoid a
# Pydantic ArbitraryTypeWarning that the library triggers on Python 3.13
# when its internal models are introspected at module-load time.
from app.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

async def _generate_with_retry(
    client,
    model: str,
    contents: str,
    config,
    max_retries: int = 2,
) -> str:
    for attempt in range(max_retries + 1):
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
            return response.text
        except Exception as e:
            error_str = str(e).lower()
            is_quota = "quota" in error_str or "resource_exhausted" in error_str
            is_last_attempt = attempt == max_retries

            if is_quota and not is_last_attempt:
                wait_seconds = (attempt + 1) * 3
                logger.warning(
                    f"Gemini quota hit, retrying in {wait_seconds}s "
                    f"(attempt {attempt + 1}/{max_retries})"
                )
                await asyncio.sleep(wait_seconds)
                continue

            logger.error(f"Gemini error on attempt {attempt + 1}: {e}")
            raise

    raise Exception("Max retries exceeded")

SYSTEM_PROMPT = """
You are CoreAI, an intelligent business assistant for a Nigerian
retail business. You have access to real business data.

Rules you must always follow:
- Speak plainly and directly in simple English
- Always reference actual numbers from the data provided
- Format all currency as NGN with comma separators
- Never give generic advice, every response must use real data
- Keep responses concise and actionable
- Never use em dashes, use commas or full stops instead
- Never make up numbers that are not in the data provided
- If data is insufficient to answer, say so honestly
"""

def _get_client():
    from google import genai  # lazy import — avoids Pydantic warning at module load
    return genai.Client(api_key=settings.gemini_api_key)

class AIService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = _get_client()

    async def _build_context(self, business_id: UUID) -> str:
        from app.services.analytics import AnalyticsService
        analytics = AnalyticsService(self.db)
        dashboard = await analytics.get_dashboard(business_id)

        low_stock = dashboard.get("low_stock_products", [])
        low_stock_text = "\n".join(
            f"- {p['name']}: {p['stock_quantity']} units left "
            f"(alert at {p['low_stock_threshold']})"
            for p in low_stock
        ) if low_stock else "None"

        top_products = dashboard.get("top_products", [])
        top_text = "\n".join(
            f"- {p['name']}: {p['quantity_sold']} units sold, "
            f"NGN {p['revenue_kobo'] / 100:,.0f}"
            for p in top_products
        ) if top_products else "No sales recorded today"

        week = dashboard.get("week_chart", [])
        week_text = ", ".join(
            f"{d['label']}: NGN {d['revenue_ngn']:,}"
            for d in week
        )

        return f"""
LIVE BUSINESS DATA:
Today Revenue: NGN {dashboard['today_revenue_kobo'] / 100:,.0f}
Yesterday Revenue: NGN {dashboard['yesterday_revenue_kobo'] / 100:,.0f}
Today Expenses: NGN {dashboard['today_expenses_kobo'] / 100:,.0f}
Today Refunds: NGN {dashboard['today_refunds_kobo'] / 100:,.0f}
Today Profit: NGN {dashboard['profit_kobo'] / 100:,.0f}
Transactions Today: {dashboard['transaction_count']}
Business Health: {dashboard['pulse_state']}

Low Stock Products:
{low_stock_text}

Top Products Today:
{top_text}

This Week Revenue (Mon-Sun):
{week_text}
"""

    async def generate_daily_brief(
        self,
        business_id: UUID,
        business_name: str,
        owner_name: str,
    ) -> str:
        context = await self._build_context(business_id)
        prompt = f"""
{context}

Write an end-of-day business brief for {owner_name} at {business_name}.

Format:
- Greeting using first name only
- 2 to 3 sentences covering the most important numbers
- 1 sentence about what went well or needs attention
- 1 specific action for tomorrow based on the data

Maximum 120 words. Warm but direct. No bullet points.
"""
        try:
            from google.genai import types
            response_text = await _generate_with_retry(
                client=self.client,
                model=settings.ai_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=300,
                    temperature=0.7,
                ),
            )
            return response_text
        except Exception as e:
            return (
                f"Good evening {owner_name}. Your business data has been "
                f"recorded for today. Check your dashboard for the latest "
                f"numbers and review your stock levels before tomorrow."
            )

    async def generate_tomorrow_brief(
        self,
        business_id: UUID,
    ) -> list[dict]:
        context = await self._build_context(business_id)
        prompt = f"""
{context}

Generate exactly 3 specific action recommendations for tomorrow.
Return ONLY a valid JSON array, no markdown, no explanation:

[
  {{
    "priority": "high",
    "headline": "action title, maximum 8 words",
    "body": "exactly 2 sentences with specific NGN amounts or quantities",
    "action_label": "short button label or null"
  }}
]

Priority: high (urgent), medium (important), info (observation).
Every recommendation must use actual numbers from the data.
"""
        try:
            from google.genai import types
            response_text = await _generate_with_retry(
                client=self.client,
                model=settings.ai_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=500,
                    temperature=0.5,
                ),
            )
            text = response_text.strip()
            start = text.find("[")
            end = text.rfind("]") + 1
            return json.loads(text[start:end])
        except Exception:
            return [{
                "priority": "info",
                "headline": "Review your stock levels",
                "body": "Check your product inventory and restock "
                        "any items running low before you open tomorrow.",
                "action_label": None,
            }]

    async def generate_smart_alerts(
        self,
        business_id: UUID,
    ) -> list[str]:
        context = await self._build_context(business_id)
        prompt = f"""
{context}

Generate short proactive alert messages for the business owner.
Return ONLY a JSON array of strings, no markdown:
["alert message", "alert message"]

Rules:
- Only generate alerts for genuine problems in the data
- Focus on: critically low stock, revenue drops, high refunds
- Each alert maximum 20 words, use specific names and numbers
- If everything looks fine return an empty array: []
- Maximum 3 alerts
"""
        try:
            from google.genai import types
            response_text = await _generate_with_retry(
                client=self.client,
                model=settings.ai_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    max_output_tokens=200,
                    temperature=0.3,
                ),
            )
            text = response_text.strip()
            start = text.find("[")
            end = text.rfind("]") + 1
            return json.loads(text[start:end])
        except Exception:
            return []

    async def chat(
        self,
        business_id: UUID,
        message: str,
        history: list[dict],
    ) -> str:
        context = await self._build_context(business_id)
        history_text = "\n".join(
            f"{m['role'].upper()}: {m['content']}"
            for m in history[-6:]
        ) if history else "No previous messages."

        prompt = f"""
{context}

Previous conversation:
{history_text}

Owner asks: {message}

Answer using only the real business data above.
Be direct and specific. Maximum 150 words.
"""
        from google.genai import types
        response_text = await _generate_with_retry(
            client=self.client,
            model=settings.ai_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=400,
                temperature=0.7,
            ),
        )
        return response_text

    async def stream_chat(
        self,
        business_id: UUID,
        message: str,
        history: list[dict],
    ):
        context = await self._build_context(business_id)
        history_text = "\n".join(
            f"{m['role'].upper()}: {m['content']}"
            for m in history[-6:]
        ) if history else "No previous messages."

        prompt = f"""
{context}

Previous conversation:
{history_text}

Owner asks: {message}

Answer using only the real business data above.
Be direct and specific. Maximum 150 words.
"""
        from google.genai import types
        response = self.client.models.generate_content_stream(
            model=settings.ai_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=400,
                temperature=0.7,
            ),
        )
        for chunk in response:
            if chunk.text:
                yield chunk.text
