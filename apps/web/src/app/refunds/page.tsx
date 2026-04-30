"use client"

import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { EyeIcon } from "@heroicons/react/24/outline"
import DashboardLayout from "@/components/layout/DashboardLayout"
import apiClient from "@/lib/api-client"
import { formatNGN, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/Badge"
import { SlideOver } from "@/components/ui/SlideOver"

import { useRole } from "@/hooks/useRole"

export default function RefundsPage() {
  const { isOwner } = useRole()
  const [selectedRefund, setSelectedRefund] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["refunds"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/refunds")
      return res.data
    },
    enabled: isOwner
  })

  if (!isOwner) return null

  const refunds = data?.data || []
  const monthTotal = refunds.reduce((acc: number, r: any) => {
    const isThisMonth = new Date(r.refund_date).getMonth() === new Date().getMonth()
    return isThisMonth ? acc + r.amount_kobo : acc
  }, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Refunds</h1>
            <p className="text-sm text-gray-500">
              This month refunded: <span className="text-red-400 font-bold">{formatNGN(monthTotal)}</span>
            </p>
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#111111] text-[10px] uppercase tracking-widest font-bold text-gray-500">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Sale Ref</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Restock</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {refunds.map((r: any) => (
                  <tr key={r.id} className="text-sm hover:bg-[#1a1a1a]/30 group">
                    <td className="px-6 py-4 text-gray-400">{formatDate(r.refund_date)}</td>
                    <td className="px-6 py-4 font-mono text-[10px] text-gray-500 uppercase">{r.sale_id.slice(-8)}</td>
                    <td className="px-6 py-4 text-gray-300">{r.reason}</td>
                    <td className="px-6 py-4 font-bold text-red-400">{formatNGN(r.amount_kobo)}</td>
                    <td className="px-6 py-4">
                      {r.restocked ? (
                        <Badge variant="emerald">Stock Returned</Badge>
                      ) : (
                        <Badge variant="gray">No Restock</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedRefund(r)}
                        className="p-2 text-gray-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {refunds.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-gray-500 italic">No refunds processed</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RefundDetailPanel 
        refund={selectedRefund} 
        onClose={() => setSelectedRefund(null)} 
      />
    </DashboardLayout>
  )
}

function RefundDetailPanel({ refund, onClose }: any) {
  if (!refund) return null

  return (
    <SlideOver isOpen={!!refund} onClose={onClose} title="Refund Details">
      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Refund ID</p>
            <p className="text-sm font-mono text-gray-300">{refund.id}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Date</p>
            <p className="text-sm text-gray-300">{formatDate(refund.refund_date)}</p>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Reason</p>
          <p className="text-sm text-white">{refund.reason}</p>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-[#1a1a1a]">
          <span className="text-sm font-medium text-gray-400">Total Refunded</span>
          <span className="text-2xl font-black text-red-400">{formatNGN(refund.amount_kobo)}</span>
        </div>
      </div>
    </SlideOver>
  )
}
