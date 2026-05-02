"use client"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { TomorrowCards } from "@/components/ai/TomorrowCards"
import { useRole } from "@/hooks/useRole"
import { AIErrorBoundary } from "@/components/ai/AIErrorBoundary"

import { LockClosedIcon } from "@heroicons/react/24/outline"

export default function TomorrowPage() {
  const { isOwner } = useRole()
  
  if (!isOwner) return null

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-[#111111] border border-[#2a2a2a] rounded-2xl flex items-center justify-center shadow-lg">
          <LockClosedIcon className="h-8 w-8 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Tomorrow feature Locked</h2>
          <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
            This advanced AI feature is temporarily locked and will be unlocked in version 2. Stay tuned!
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
