"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  PlusIcon, 
  FunnelIcon,
  PencilSquareIcon, 
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline"
import { toast } from "sonner"
import DashboardLayout from "@/components/layout/DashboardLayout"
import apiClient from "@/lib/api-client"
import { formatNGN, cn, getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { SlideOver } from "@/components/ui/SlideOver"
import { Badge } from "@/components/ui/Badge"

import { useRole } from "@/hooks/useRole"

export default function ExpensesPage() {
  const { isOwner } = useRole()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState("")
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", page, category],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append("page", page.toString())
      if (category) params.append("category", category)
      const res = await apiClient.get(`/api/v1/expenses?${params.toString()}`)
      return res.data
    },
    enabled: isOwner
  })

  const { data: categoriesData } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/expenses/categories")
      return res.data.data
    },
    enabled: isOwner
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      toast.success("Expense deleted")
      setDeleteConfirmId(null)
    }
  })

  if (!isOwner) return null

  const expenses = data?.data || []
  const meta = data?.meta || { total: 0, page: 1, per_page: 10 }
  const categories = categoriesData || []

  // Stats calculation (mocked if not provided by API)
  // In a real app, these would come from a summary endpoint
  const stats = {
    month: expenses.reduce((acc: number, e: any) => acc + e.amount_kobo, 0), // Should ideally be from API
    week: expenses.slice(0, 5).reduce((acc: number, e: any) => acc + e.amount_kobo, 0),
    today: expenses.filter((e: any) => new Date(e.expense_date).toDateString() === new Date().toDateString())
                    .reduce((acc: number, e: any) => acc + e.amount_kobo, 0)
  }

  // Category breakdown for chart
  const breakdown = categories.map((cat: string) => {
    const amount = expenses.filter((e: any) => e.category === cat).reduce((acc: number, e: any) => acc + e.amount_kobo, 0)
    return { name: cat, amount }
  }).sort((a: any, b: any) => b.amount - a.amount).slice(0, 5)

  const maxAmount = Math.max(...breakdown.map((b: any) => b.amount), 1)

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Expenses</h1>
            <p className="text-sm text-gray-500">
              Total this month: <span className="text-red-400 font-bold">{formatNGN(stats.month)}</span>
            </p>
          </div>
          <Button onClick={() => { setEditingExpense(null); setIsPanelOpen(true); }} className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            Log Expense
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "This Month", value: stats.month, color: "text-red-400" },
            { label: "This Week", value: stats.week, color: "text-amber-400" },
            { label: "Today", value: stats.today, color: "text-orange-400" },
          ].map((s, i) => (
            <div key={i} className="bg-[#0f0f0f] border border-[#1a1a1a] p-6 rounded-3xl">
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">{s.label}</p>
              <p className={cn("text-2xl font-black", s.color)}>{formatNGN(s.value)}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Breakdown Chart */}
          <div className="lg:col-span-1 bg-[#0f0f0f] border border-[#1a1a1a] p-6 rounded-3xl space-y-6">
            <h3 className="text-sm font-bold text-gray-300">Category Breakdown</h3>
            <div className="space-y-4">
              {breakdown.map((b: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400 capitalize">{b.name}</span>
                    <span className="text-gray-200 font-medium">{formatNGN(b.amount)}</span>
                  </div>
                  <div className="h-2 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(b.amount / maxAmount) * 100}%` }}
                      className="h-full bg-red-500/50 rounded-full"
                    />
                  </div>
                </div>
              ))}
              {breakdown.length === 0 && (
                <p className="text-xs text-gray-600 italic">No category data available</p>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-4 bg-[#0f0f0f] border border-[#1a1a1a] p-4 rounded-2xl">
              <div className="relative flex-1">
                <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <select 
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-emerald-500 outline-none appearance-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#111111] text-[10px] uppercase tracking-widest font-bold text-gray-500">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]">
                    {expenses.map((e: any) => (
                      <tr key={e.id} className="text-sm hover:bg-[#1a1a1a]/30 group">
                        <td className="px-6 py-4 text-gray-400">
                          {new Date(e.expense_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="gray" className="capitalize">{e.category}</Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-200">{e.description}</td>
                        <td className="px-6 py-4 font-bold text-red-400">{formatNGN(e.amount_kobo)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {deleteConfirmId === e.id ? (
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="danger" className="h-7 px-2 text-[10px]" onClick={() => deleteMutation.mutate(e.id)}>Confirm</Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                              </div>
                            ) : (
                              <>
                                <button 
                                  onClick={() => { setEditingExpense(e); setIsPanelOpen(true); }}
                                  className="p-2 text-gray-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirmId(e.id)}
                                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-gray-500 italic">No expenses found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {meta.total > meta.per_page && (
                <div className="p-4 border-t border-[#1a1a1a] flex items-center justify-between bg-[#0d0d0d]">
                  <span className="text-xs text-gray-500">Showing {expenses.length} of {meta.total}</span>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" variant="outline" disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" variant="outline" disabled={page * meta.per_page >= meta.total}
                      onClick={() => setPage(p => p + 1)}
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ExpensePanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
        expense={editingExpense}
        categories={categories}
      />
    </DashboardLayout>
  )
}

function ExpensePanel({ isOpen, onClose, expense, categories }: any) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    amount_ngn: 0,
    expense_date: new Date().toISOString().split("T")[0]
  })

  useEffect(() => {
    if (expense) {
      setFormData({
        category: expense.category,
        description: expense.description,
        amount_ngn: expense.amount_kobo / 100,
        expense_date: new Date(expense.expense_date).toISOString().split("T")[0]
      })
    } else {
      setFormData({
        category: "",
        description: "",
        amount_ngn: 0,
        expense_date: new Date().toISOString().split("T")[0]
      })
    }
  }, [expense, isOpen])

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (expense) return apiClient.patch(`/api/v1/expenses/${expense.id}`, data)
      return apiClient.post("/api/v1/expenses", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      toast.success(expense ? "Expense updated" : "Expense logged")
      onClose()
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, "Failed to save expense"))
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.category || formData.amount_ngn <= 0) {
      toast.error("Please fill required fields")
      return
    }
    mutation.mutate(formData)
  }

  return (
    <SlideOver 
      isOpen={isOpen} 
      onClose={onClose} 
      title={expense ? "Edit Expense" : "Log New Expense"}
      footer={
        <Button onClick={handleSubmit} className="w-full" isLoading={mutation.isPending}>
          {expense ? "Save Changes" : "Log Expense"}
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Category</label>
          <select 
            className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none appearance-none"
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            required
          >
            <option value="">Select Category</option>
            {categories.map((cat: string) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <Input 
          label="Description" 
          placeholder="What was this for?" 
          value={formData.description} 
          onChange={(e) => setFormData({...formData, description: e.target.value})} 
          required
        />

        <Input 
          label="Amount (NGN)" 
          type="number" 
          value={formData.amount_ngn} 
          onChange={(e) => setFormData({...formData, amount_ngn: parseFloat(e.target.value) || 0})} 
          required
        />

        <Input 
          label="Date" 
          type="date" 
          value={formData.expense_date} 
          onChange={(e) => setFormData({...formData, expense_date: e.target.value})} 
          required
        />
      </form>
    </SlideOver>
  )
}
