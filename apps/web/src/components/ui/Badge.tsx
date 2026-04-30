import React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps {
  children: React.ReactNode
  variant?: "success" | "warning" | "danger" | "gray" | "blue" | "purple" | "emerald"
  className?: string
}

export function Badge({ children, variant = "gray", className }: BadgeProps) {
  const variants = {
    success: "text-emerald-500 bg-emerald-500/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
    warning: "text-amber-500 bg-amber-500/10",
    danger: "text-red-500 bg-red-500/10",
    gray: "text-gray-500 bg-gray-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    purple: "text-purple-500 bg-purple-500/10",
  }

  return (
    <span className={cn(
      "text-[10px] uppercase font-bold px-2 py-1 rounded-full",
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}
