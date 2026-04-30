"use client"

import React, { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from "recharts"
import { 
  ArrowUpIcon, ArrowDownIcon, 
  ExclamationTriangleIcon 
} from "@heroicons/react/24/solid"
import Link from "next/link"
import DashboardLayout from "@/components/layout/DashboardLayout"
import apiClient from "@/lib/api-client"
import { formatNGN, formatDateShort } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

import { useRole } from "@/hooks/useRole"
import { SmartAlerts } from "@/components/ai/SmartAlerts"
import { DailyBriefCard } from "@/components/ai/DailyBriefCard"

export default function DashboardPage() {
  // const { isOwner } = useRole()
  // if (!isOwner) return null
  const [showAI, setShowAI] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowAI(true), 2000)
    return () => clearTimeout(timer)
  }, [])
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/dashboard")
      return res.data.data
    },
    refetchInterval: 60000,
  })

  const stats = response || {}

  const pulseColors: Record<string, string> = {
    strong: "border-emerald-500 bg-emerald-500/10 text-emerald-500",
    good: "border-emerald-400 bg-emerald-400/10 text-emerald-400",
    average: "border-amber-400 bg-amber-400/10 text-amber-400",
    slow: "border-blue-400 bg-blue-400/10 text-blue-400",
    alert: "border-red-400 bg-red-400/10 text-red-400",
  }

  const pulseState = stats.pulse_state || "average"

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-8 animate-pulse">
          <div className="h-40 w-40 rounded-full bg-[#1a1a1a] mx-auto" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-[#1a1a1a] rounded-2xl" />)}
          </div>
          <div className="h-64 bg-[#1a1a1a] rounded-2xl" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-12 pb-12">
        {/* Pulse Section */}
        <section className="flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={cn(
                "absolute inset-0 rounded-full blur-2xl",
                pulseColors[pulseState].split(" ")[1]
              )}
            />
            <div className={cn(
              "relative h-48 w-48 rounded-full border-2 flex flex-col items-center justify-center transition-colors duration-1000",
              pulseColors[pulseState].split(" ")[0],
              pulseColors[pulseState].split(" ")[1]
            )}>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Revenue Today</span>
              <span className="text-3xl font-black text-white">{formatNGN(stats.today_revenue_kobo || 0)}</span>
            </div>
          </div>
          <div className="text-center max-w-sm">
            <p className={cn("text-sm font-semibold mb-1", pulseColors[pulseState].split(" ")[2])}>
              {stats.pulse_state?.toUpperCase()} GROWTH
            </p>
            <p className="text-sm text-gray-500">{stats.pulse_message}</p>
          </div>
        </section>

        {/* Smart Alerts */}
        {showAI && <SmartAlerts />}

        {/* KPI Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Revenue Today" 
            value={formatNGN(stats.today_revenue_kobo || 0)}
            change={stats.revenue_change_pct}
          />
          <StatCard 
            title="Expenses Today" 
            value={formatNGN(stats.today_expenses_kobo || 0)}
            isNegative
          />
          <StatCard 
            title="Estimated Profit" 
            value={formatNGN(stats.profit_kobo || 0)}
            isProfit
          />
          <StatCard 
            title="Transactions" 
            value={(stats.transaction_count || 0).toString()}
          />
        </section>

        {/* Daily Brief */}
        {showAI ? (
          <DailyBriefCard />
        ) : (
          <div className="h-24 animate-pulse rounded-xl bg-[#0d1f17] border border-emerald-900/30" />
        )}

        {/* Alerts & Chart Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-3xl p-8 space-y-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Revenue vs Expenses</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.week_chart}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      dy={10}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", borderRadius: "12px" }}
                      itemStyle={{ fontSize: "12px" }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue_ngn" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRev)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expenses_ngn" 
                      stroke="#f43f5e" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorExp)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-3xl overflow-hidden">
              <div className="p-8 border-b border-[#1a1a1a]">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Top Products Today</h3>
              </div>
              <table className="w-full text-left">
                <thead className="bg-[#111111] text-[10px] uppercase tracking-widest font-bold text-gray-500">
                  <tr>
                    <th className="px-8 py-4">Product Name</th>
                    <th className="px-8 py-4">Qty Sold</th>
                    <th className="px-8 py-4">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {stats.top_products?.map((p: any) => (
                    <tr key={p.product_id} className="text-sm hover:bg-[#1a1a1a]/50">
                      <td className="px-8 py-4 font-medium">{p.name}</td>
                      <td className="px-8 py-4 text-gray-400">{p.quantity_sold}</td>
                      <td className="px-8 py-4 font-semibold">{formatNGN(p.revenue_kobo)}</td>
                    </tr>
                  ))}
                  {(!stats.top_products || stats.top_products.length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-8 py-12 text-center text-gray-500 italic">No sales recorded today</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            {/* Low Stock Alerts */}
            <AnimatePresence>
              {stats.low_stock_products?.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-950/20 border border-red-900/30 rounded-3xl p-6"
                >
                  <div className="flex items-center gap-3 text-red-500 mb-4">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Restock Needed</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.low_stock_products.map((product: any) => (
                      <div
                        key={product.id}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                          product.stock_quantity === 0
                            ? "bg-red-950/40 border border-red-700/60"
                            : "bg-amber-950/30 border border-amber-900/40"
                        }`}
                      >
                        <span className="text-sm text-gray-200">{product.name}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          product.stock_quantity === 0
                            ? "bg-red-900 text-red-300"
                            : "bg-amber-900 text-amber-300"
                        }`}>
                          {product.stock_quantity === 0
                            ? "Out of stock"
                            : `${product.stock_quantity} left`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="danger" 
                    className="w-full mt-6 text-xs h-9"
                    onClick={() => window.location.href = "/products?low_stock=true"}
                  >
                    Manage Low Stock
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Actions */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-3xl p-6 space-y-4">
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Quick Actions</h3>
               <Link href="/sales" className="flex items-center justify-between p-4 bg-[#1a1a1a] hover:bg-[#222222] rounded-2xl transition-all group">
                 <span className="text-sm font-semibold">New Sale</span>
                 <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                   +
                 </div>
               </Link>
               <Link href="/products" className="flex items-center justify-between p-4 bg-[#1a1a1a] hover:bg-[#222222] rounded-2xl transition-all group">
                 <span className="text-sm font-semibold">Add Product</span>
                 <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                   +
                 </div>
               </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function StatCard({ title, value, change, isNegative, isProfit }: any) {
  return (
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-3xl p-6 space-y-3 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <div className={cn("w-12 h-12 rounded-full", isNegative ? "bg-red-500" : isProfit ? "bg-emerald-500" : "bg-gray-500")} />
      </div>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{title}</p>
      <div className="flex items-end justify-between">
        <h4 className="text-2xl font-black">{value}</h4>
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
            change >= 0 ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10"
          )}>
            {change >= 0 ? <ArrowUpIcon className="h-2.5 w-2.5" /> : <ArrowDownIcon className="h-2.5 w-2.5" />}
            {Math.abs(change * 100).toFixed(0)}%
          </div>
        )}
      </div>
    </div>
  )
}

function cn(...inputs: any) {
  return inputs.filter(Boolean).join(" ")
}
