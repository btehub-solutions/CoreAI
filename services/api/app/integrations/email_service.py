from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.config import settings

def _get_mail_config() -> ConnectionConfig:
    return ConnectionConfig(
        MAIL_USERNAME=settings.mail_username,
        MAIL_PASSWORD=settings.mail_password,
        MAIL_FROM=settings.mail_from,
        MAIL_FROM_NAME=settings.mail_from_name,
        MAIL_PORT=settings.mail_port,
        MAIL_SERVER=settings.mail_server,
        MAIL_STARTTLS=settings.mail_starttls,
        MAIL_SSL_TLS=settings.mail_ssl_tls,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )

def _build_brief_email(
    owner_name: str,
    business_name: str,
    brief_content: str,
    revenue_kobo: int,
    expenses_kobo: int,
    profit_kobo: int,
    transaction_count: int,
    app_url: str = "https://coreai.app",
) -> str:
    revenue = f"NGN {revenue_kobo / 100:,.0f}"
    expenses = f"NGN {expenses_kobo / 100:,.0f}"
    profit = f"NGN {max(0, profit_kobo / 100):,.0f}"

    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your CoreAI Daily Brief</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;
  font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#0a0a0a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="max-width:520px;background:#1a1a1a;
          border-radius:16px;border:1px solid #2a2a2a;">

          <tr>
            <td style="padding:28px 28px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;height:36px;background:#10b981;
                    border-radius:8px;text-align:center;
                    vertical-align:middle;">
                    <span style="color:white;font-weight:700;
                      font-size:13px;">cAI</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="color:white;font-weight:700;
                      font-size:16px;">Core</span>
                    <span style="color:#10b981;font-weight:700;
                      font-size:16px;">AI</span>
                  </td>
                </tr>
              </table>
              <h2 style="color:#f9fafb;font-size:20px;
                font-weight:700;margin:16px 0 4px;">
                Daily Brief
              </h2>
              <p style="color:#6b7280;font-size:13px;margin:0;">
                {business_name}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#0f0f0f;border-radius:12px;
                border:1px solid #2a2a2a;padding:16px;">
                <tr>
                  <td style="padding:6px 0;color:#9ca3af;
                    font-size:13px;">Revenue</td>
                  <td style="padding:6px 0;color:#f9fafb;
                    font-size:13px;font-weight:600;
                    text-align:right;">{revenue}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#9ca3af;
                    font-size:13px;">Expenses</td>
                  <td style="padding:6px 0;color:#f9fafb;
                    font-size:13px;font-weight:600;
                    text-align:right;">{expenses}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#9ca3af;
                    font-size:13px;border-top:1px solid #2a2a2a;">
                    Profit</td>
                  <td style="padding:6px 0;color:#10b981;
                    font-size:14px;font-weight:700;
                    text-align:right;border-top:1px solid #2a2a2a;">
                    {profit}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#9ca3af;
                    font-size:13px;">Transactions</td>
                  <td style="padding:6px 0;color:#f9fafb;
                    font-size:13px;font-weight:600;
                    text-align:right;">{transaction_count}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px 20px;">
              <div style="background:#0d1f17;border-radius:12px;
                border:1px solid #166534;border-left:3px solid #10b981;
                padding:16px;">
                <p style="color:#10b981;font-size:11px;font-weight:600;
                  text-transform:uppercase;letter-spacing:0.05em;
                  margin:0 0 8px;">CoreAI</p>
                <p style="color:#d1d5db;font-size:14px;line-height:1.7;
                  margin:0;">{brief_content}</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px 28px;">
              <a href="{app_url}/tomorrow"
                style="display:block;background:#10b981;color:white;
                text-decoration:none;text-align:center;padding:12px;
                border-radius:10px;font-size:14px;font-weight:600;">
                See Tomorrow's Action Plan
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 28px;border-top:1px solid #2a2a2a;">
              <p style="color:#4b5563;font-size:11px;
                text-align:center;margin:0;">
                You opted in to daily briefs from CoreAI.
                <a href="{app_url}/settings"
                  style="color:#6b7280;text-decoration:underline;">
                  Manage preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

async def send_daily_brief_email(
    to_email: str,
    owner_name: str,
    business_name: str,
    brief_content: str,
    revenue_kobo: int,
    expenses_kobo: int,
    profit_kobo: int,
    transaction_count: int,
) -> bool:
    html = _build_brief_email(
        owner_name=owner_name,
        business_name=business_name,
        brief_content=brief_content,
        revenue_kobo=revenue_kobo,
        expenses_kobo=expenses_kobo,
        profit_kobo=profit_kobo,
        transaction_count=transaction_count,
    )
    message = MessageSchema(
        subject=f"Your CoreAI Brief - {business_name}",
        recipients=[to_email],
        body=html,
        subtype=MessageType.html,
    )
    try:
        fm = FastMail(_get_mail_config())
        await fm.send_message(message)
        return True
    except Exception:
        return False
