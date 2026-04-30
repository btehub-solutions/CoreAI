import React from "react"
import { cn } from "@/lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-xs font-medium text-gray-400 ml-1">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-emerald-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500/50 focus:border-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-[10px] font-medium text-red-500 ml-1">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"
