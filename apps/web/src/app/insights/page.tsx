"use client"
import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { DailyBriefCard } from "@/components/ai/DailyBriefCard"
import { AIChatPanel } from "@/components/ai/AIChatPanel"
import { cn } from "@/lib/utils"
import { useRole } from "@/hooks/useRole"
import { AIErrorBoundary } from "@/components/ai/AIErrorBoundary"

export default function InsightsPage() {
  const { isOwner } = useRole()
  const [tab, setTab] = useState<"brief" | "chat">("brief")

  if (!isOwner) return null

  return (
    <DashboardLayout>
      <AIErrorBoundary fallbackMessage="Insights are temporarily unavailable. Your business data is safe.">
        <div className="flex flex-col h-[calc(100vh-160px)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-gray-100">
                Insights
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                AI-powered business intelligence
              </p>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            {(["brief", "chat"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                  tab === t
                    ? "bg-emerald-600 text-white"
                    : "border border-[#2a2a2a] text-gray-500 hover:text-gray-300"
                )}
              >
                {t === "brief" ? "Daily Brief" : "Ask CoreAI"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {tab === "brief" ? (
              <div className="max-w-2xl">
                <DailyBriefCard />
              </div>
            ) : (
              <AIChatPanel />
            )}
          </div>
        </div>
      </AIErrorBoundary>
    </DashboardLayout>
  )
}
