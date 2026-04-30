"use client"

import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { 
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline"
import DashboardLayout from "@/components/layout/DashboardLayout"
import apiClient from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { format } from "date-fns"

const ACTION_CATEGORIES: Record<string, string> = {
  "product.": "product",
  "sale.": "sale",
  "expense.": "expense",
  "refund.": "refund",
  "auth.": "auth",
  "staff.": "staff"
}

const CATEGORY_STYLES: Record<string, string> = {
  product: "bg-blue-950 text-blue-400 border-blue-900",
  sale: "bg-emerald-950 text-emerald-400 border-emerald-900",
  expense: "bg-amber-950 text-amber-400 border-amber-900",
  refund: "bg-purple-950 text-purple-400 border-purple-900",
  auth: "bg-gray-800 text-gray-400 border-gray-700",
  staff: "bg-red-950 text-red-400 border-red-900"
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    action: "",
    user_id: "",
    start_date: "",
    end_date: ""
  })

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: "20",
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      })
      const res = await apiClient.get(`/api/v1/audit-logs?${params.toString()}`)
      return res.data
    }
  })

  const logs = data?.data || []
  const meta = data?.meta || { page: 1, per_page: 20, total: 0 }

  const getCategory = (action: string) => {
    for (const [prefix, cat] of Object.entries(ACTION_CATEGORIES)) {
      if (action.startsWith(prefix)) return cat
    }
    return "other"
  }

  const formatActionName = (action: string) => {
    return action
      .split(".")
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).replace("_", " "))
      .join(" ")
  }

  const handleExport = () => {
    const headers = ["Time", "Staff", "Role", "Action", "Details", "IP Address"]
    const rows = logs.map((log: any) => [
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      log.user_name,
      log.user_role,
      log.action,
      log.detail,
      log.ip_address
    ])
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `audit_log_${format(new Date(), "yyyyMMdd_HHmm")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Activity Log</h1>
            <p className="text-sm text-gray-500">Traceable history of all administrative actions</p>
          </div>
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2 border-[#1a1a1a] hover:bg-[#111111]">
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard 
            label="Actions Today" 
            value={logs.filter((l: any) => format(new Date(l.created_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")).length} 
          />
          <SummaryCard 
            label="Most Active Staff" 
            value={logs.length > 0 ? logs[0].user_name : "N/A"} 
            subtitle="Today's top contributor"
          />
          <SummaryCard 
            label="Last Activity" 
            value={logs.length > 0 ? format(new Date(logs[0].created_at), "HH:mm") : "N/A"} 
            subtitle={logs.length > 0 ? format(new Date(logs[0].created_at), "EEE, d MMM") : "No recent activity"}
          />
        </div>

        {/* Filters */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-4 rounded-2xl flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Action Type</label>
            <Input 
              placeholder="Filter by action..." 
              value={filters.action}
              onChange={(e) => setFilters({...filters, action: e.target.value})}
              className="bg-[#111111] h-10 text-xs"
            />
          </div>
          <div className="w-48 space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Start Date</label>
            <Input 
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({...filters, start_date: e.target.value})}
              className="bg-[#111111] h-10 text-xs"
            />
          </div>
          <div className="w-48 space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">End Date</label>
            <Input 
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({...filters, end_date: e.target.value})}
              className="bg-[#111111] h-10 text-xs"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setFilters({ action: "", user_id: "", start_date: "", end_date: "" })}
            className="h-10 border-[#1a1a1a] text-xs"
          >
            Clear Filters
          </Button>
        </div>

        {/* Table */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#111111] text-[10px] uppercase tracking-widest font-bold text-gray-500">
                <tr>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Staff Member</th>
                  <th className="px-6 py-4 text-center">Action</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111111]">
                {logs.map((log: any) => {
                  const category = getCategory(log.action)
                  return (
                    <tr key={log.id} className="text-sm hover:bg-[#1a1a1a]/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-200 font-medium">{format(new Date(log.created_at), "h:mm a")}</div>
                        <div className="text-[10px] text-gray-500">{format(new Date(log.created_at), "EEE, d MMM")}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-200 font-semibold">{log.user_name}</span>
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">{log.user_role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          CATEGORY_STYLES[category] || "bg-gray-800 text-gray-400 border-gray-700"
                        )}>
                          {formatActionName(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-400 max-w-md truncate" title={log.detail}>
                          {log.detail}
                        </p>
                      </td>
                    </tr>
                  )
                })}
                {logs.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-[#111111] rounded-full">
                          <ClipboardDocumentListIcon className="h-8 w-8 text-gray-700" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">No activity recorded yet</p>
                          <p className="text-sm text-gray-500">Wait for staff to perform administrative actions</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {meta.total > meta.per_page && (
            <div className="p-4 border-t border-[#111111] flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * meta.per_page + 1} to {Math.min(page * meta.per_page, meta.total)} of {meta.total} entries
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="h-8 border-[#1a1a1a]"
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={page * meta.per_page >= meta.total}
                  onClick={() => setPage(p => p + 1)}
                  className="h-8 border-[#1a1a1a]"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

function SummaryCard({ label, value, subtitle }: { label: string, value: string | number, subtitle?: string }) {
  return (
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-6 rounded-3xl">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-black text-white">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}
