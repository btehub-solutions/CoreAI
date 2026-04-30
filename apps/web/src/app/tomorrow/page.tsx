"use client"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { TomorrowCards } from "@/components/ai/TomorrowCards"
import { useRole } from "@/hooks/useRole"
import { AIErrorBoundary } from "@/components/ai/AIErrorBoundary"

export default function TomorrowPage() {
  const { isOwner } = useRole()
  
  if (!isOwner) return null

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-100">Tomorrow</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Based on today's data, updated each evening
          </p>
        </div>
        <AIErrorBoundary fallbackMessage="Tomorrow's brief will be ready shortly.">
          <TomorrowCards />
        </AIErrorBoundary>
      </div>
    </DashboardLayout>
  )
}
