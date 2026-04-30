"use client"
import { useMutation } from "@tanstack/react-query"
import { useEffect } from "react"
import { SparklesIcon, ArrowPathIcon } from "@heroicons/react/24/outline"
import apiClient from "@/lib/api-client"

export function DailyBriefCard() {
  const { data, isPending, mutate } = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/api/v1/ai/daily-brief")
      return res.data.data
    },
  })

  useEffect(() => { mutate() }, [])

  return (
    <div className="bg-[#0d1f17] border border-emerald-900/50
      rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">
            CoreAI Daily Brief
          </span>
          {data?.cached && (
            <span className="text-[10px] text-gray-600 ml-auto">
              cached
            </span>
          )}
        </div>
        <button
          onClick={() => mutate()}
          disabled={isPending}
          className="text-gray-600 hover:text-gray-400 transition-colors"
          title="Refresh brief"
        >
          <ArrowPathIcon
            className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {isPending ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-[#1a2e1a] rounded w-full" />
          <div className="h-3 bg-[#1a2e1a] rounded w-5/6" />
          <div className="h-3 bg-[#1a2e1a] rounded w-4/6" />
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {data?.content ?? "Your brief is being prepared..."}
          </p>
          {data?.generated_at && (
            <p className="text-xs text-gray-600 mt-3">
              {data.cached ? `From earlier today` : `Updated just now`}
            </p>
          )}
        </>
      )}
    </div>
  )
}
