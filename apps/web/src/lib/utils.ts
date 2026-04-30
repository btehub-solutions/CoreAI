import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNGN(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kobo / 100)
}

export function parseNGN(input: string): number {
  return Math.round(parseFloat(input.replace(/[^0-9.]/g, "") || "0") * 100)
}

export function formatDate(iso: string): string {
  if (!iso) return ""
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function formatDateShort(iso: string): string {
  if (!iso) return ""
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso))
}

export function getErrorMessage(err: any, fallback = "Something went wrong"): string {
  const detail = err?.response?.data?.detail
  
  if (typeof detail === "string") return detail
  
  if (Array.isArray(detail) && detail.length > 0) {
    // Handle Pydantic validation errors: [{ msg: "...", ... }]
    const firstError = detail[0]
    if (typeof firstError === "string") return firstError
    if (firstError?.msg) return firstError.msg
    return JSON.stringify(firstError)
  }

  if (typeof detail === "object" && detail !== null) {
    return JSON.stringify(detail)
  }

  return err?.message || fallback
}
