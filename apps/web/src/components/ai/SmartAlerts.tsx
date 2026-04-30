"use client"
import { useQuery } from "@tanstack/react-query"
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid"
import apiClient from "@/lib/api-client"

export function SmartAlerts() {
  const { data } = useQuery({
    queryKey: ["ai-alerts"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/ai/alerts")
      return res.data.data.alerts as string[]
    },
    refetchInterval: 60000,
  })

  if (!data || data.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      {data.map((alert, i) => (
        <div
          key={i}
          className="flex items-start gap-3 bg-amber-950/30
            border border-amber-900/50 rounded-xl px-4 py-3"
        >
          <ExclamationTriangleIcon
            className="h-4 w-4 text-amber-400 shrink-0 mt-0.5"
          />
          <p className="text-sm text-amber-200">{alert}</p>
        </div>
      ))}
    </div>
  )
}
