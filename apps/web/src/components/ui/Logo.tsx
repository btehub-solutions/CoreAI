import React from "react"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-lg leading-none">cAI</span>
      </div>
      <div className="flex items-center">
        <span className="text-white font-bold text-xl">Core</span>
        <span className="text-emerald-400 font-bold text-xl">AI</span>
      </div>
    </div>
  )
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20", className)}>
      <span className="text-white font-bold text-xl">cAI</span>
    </div>
  )
}
