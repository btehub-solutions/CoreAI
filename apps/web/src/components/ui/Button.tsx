import React from "react"
import { cn } from "@/lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg" | "icon"
  isLoading?: boolean
}

export function Button({ 
  className, 
  variant = "primary", 
  size = "md", 
  isLoading, 
  children, 
  ...props 
}: ButtonProps) {
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/10",
    secondary: "bg-[#1a1a1a] hover:bg-[#222222] text-gray-200",
    outline: "border border-[#2a2a2a] hover:border-emerald-500/50 hover:bg-emerald-500/5 text-gray-300",
    ghost: "hover:bg-[#1a1a1a] text-gray-400 hover:text-gray-200",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20",
  }
  
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-6 text-sm",
    lg: "h-12 px-8 text-base",
    icon: "h-10 w-10 p-0",
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : children}
    </button>
  )
}
