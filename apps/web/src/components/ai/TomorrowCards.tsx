"use client"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckIcon, CheckCircleIcon } from "@heroicons/react/24/solid"
import { ExclamationTriangleIcon, InformationCircleIcon }
  from "@heroicons/react/24/outline"
import apiClient from "@/lib/api-client"
import { cn } from "@/lib/utils"

const PRIORITY_STYLES = {
  high: {
    border: "border-l-red-500",
    badge: "bg-red-950 text-red-400",
  },
  medium: {
    border: "border-l-amber-500",
    badge: "bg-amber-950 text-amber-400",
  },
  info: {
    border: "border-l-blue-500",
    badge: "bg-blue-950 text-blue-400",
  },
}

export function TomorrowCards() {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  const { data, isPending } = useQuery({
    queryKey: ["tomorrow"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/ai/tomorrow")
      return res.data.data.cards as any[]
    },
  })

  if (isPending) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i}
            className="h-24 animate-pulse rounded-xl bg-[#1a1a1a]" />
        ))}
      </div>
    )
  }

  const visible = data?.filter((_, i) => !dismissed.has(i)) ?? []

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <CheckCircleIcon className="h-10 w-10 text-emerald-500 mb-3" />
        <p className="text-sm font-medium text-gray-300">
          All done for today
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Check back tomorrow evening for new recommendations
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {data?.map((card, i) => {
          if (dismissed.has(i)) return null
          const style = PRIORITY_STYLES[
            card.priority as keyof typeof PRIORITY_STYLES
          ] ?? PRIORITY_STYLES.info

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "rounded-xl border border-[#2a2a2a] border-l-2 bg-[#1a1a1a] p-4",
                style.border
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn(
                  "text-[10px] font-medium uppercase tracking-wide",
                  "px-2 py-0.5 rounded-full",
                  style.badge
                )}>
                  {card.priority}
                </span>
                <button
                  onClick={() => setDismissed(
                    (prev) => new Set([...prev, i])
                  )}
                  className="text-gray-600 hover:text-gray-400"
                >
                  <CheckIcon className="h-4 w-4" />
                </button>
              </div>
              <h3 className="text-sm font-semibold text-gray-100 mt-2">
                {card.headline}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                {card.body}
              </p>
              {card.action_label && (
                <button
                  onClick={() => setDismissed(
                    (prev) => new Set([...prev, i])
                  )}
                  className="mt-3 text-xs border border-[#3a3a3a]
                    px-3 py-1.5 rounded-lg text-gray-300
                    hover:bg-[#2a2a2a]"
                >
                  {card.action_label}
                </button>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
