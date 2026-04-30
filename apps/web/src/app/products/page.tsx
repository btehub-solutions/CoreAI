"use client"

import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  ArrowUpTrayIcon
} from "@heroicons/react/24/outline"
import { toast } from "sonner"
import DashboardLayout from "@/components/layout/DashboardLayout"
import apiClient from "@/lib/api-client"
import { formatNGN, cn, getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import CSVImportPanel from "@/components/products/CSVImportPanel"

import { useRole } from "@/hooks/useRole"

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const { isOwner } = useRole()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [isLowStockOnly, setIsLowStockOnly] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [adjustingProduct, setAdjustingProduct] = useState<any>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isImportPanelOpen, setIsImportPanelOpen] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ["products", debouncedSearch, isLowStockOnly],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.append("search", debouncedSearch)
      if (isLowStockOnly) params.append("low_stock", "true")
      const res = await apiClient.get(`/api/v1/products?${params.toString()}`)
      return res.data
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Product deleted")
      setDeleteConfirmId(null)
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, "Failed to delete product"))
      setDeleteConfirmId(null)
    }
  })

  const productsData = data?.data || []
  const totalProducts = data?.meta?.total ?? 0
  const lowStockCount = productsData?.filter(
    (p: any) => p.is_low_stock && p.stock_quantity > 0
  ).length ?? 0
  const outOfStockCount = productsData?.filter(
    (p: any) => p.stock_quantity === 0
  ).length ?? 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Products</h1>
            <p className="text-sm text-gray-500">{data?.meta?.total || 0} items in inventory</p>
          </div>
          {isOwner && (
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsImportPanelOpen(true)} 
                className="flex items-center gap-2 border-[#2a2a2a] text-gray-400 hover:text-gray-200 hover:border-emerald-800"
              >
                <ArrowUpTrayIcon className="h-4 w-4" />
                Import CSV
              </Button>
              <Button onClick={() => { setEditingProduct(null); setIsPanelOpen(true); }} className="flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                Add Product
              </Button>
            </div>
          )}
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
            <p className="text-xs text-gray-500">Total Products</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {totalProducts}
            </p>
          </div>
          <div className={`rounded-xl p-3 border ${
            lowStockCount > 0
              ? "bg-amber-950/30 border-amber-900/50"
              : "bg-[#1a1a1a] border-[#2a2a2a]"
          }`}>
            <p className="text-xs text-gray-500">Low Stock</p>
            <p className={`text-xl font-bold mt-0.5 ${
              lowStockCount > 0 ? "text-amber-400" : "text-white"
            }`}>
              {lowStockCount}
            </p>
          </div>
          <div className={`rounded-xl p-3 border ${
            outOfStockCount > 0
              ? "bg-red-950/30 border-red-900/50"
              : "bg-[#1a1a1a] border-[#2a2a2a]"
          }`}>
            <p className="text-xs text-gray-500">Out of Stock</p>
            <p className={`text-xl font-bold mt-0.5 ${
              outOfStockCount > 0 ? "text-red-400" : "text-white"
            }`}>
              {outOfStockCount}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-[#0f0f0f] border border-[#1a1a1a] p-4 rounded-2xl">
          <div className="relative flex-1 w-full">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input 
              className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-emerald-500 outline-none"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant={isLowStockOnly ? "danger" : "outline"} 
              size="sm"
              onClick={() => setIsLowStockOnly(!isLowStockOnly)}
              className="flex-1 sm:flex-none whitespace-nowrap"
            >
              Low Stock Only
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 sm:flex-none"
              onClick={() => toast.info("Filter options coming soon")}
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#111111] text-[10px] uppercase tracking-widest font-bold text-gray-500">
                <tr>
                  <th className="px-6 py-4">Name & SKU</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Cost Price</th>
                  <th className="px-6 py-4">Selling Price</th>
                  <th className="px-6 py-4 text-center">Stock</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {productsData.map((p: any) => (
                  <tr key={p.id} className="text-sm group hover:bg-[#1a1a1a]/30">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-200">{p.name}</div>
                      <div className="text-[10px] text-gray-600 font-mono">{p.sku || "NO SKU"}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 capitalize">{p.category || "General"}</td>
                    <td className="px-6 py-4 text-gray-400">{formatNGN(p.cost_price_kobo)}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-400">{formatNGN(p.selling_price_kobo)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center">
                        <span className={cn("font-bold text-lg", p.is_low_stock ? "text-amber-500" : "text-white")}>
                          {p.stock_quantity}
                        </span>
                        {p.is_low_stock && (
                          <span className="text-[8px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1 rounded">Low Stock</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] uppercase font-bold px-2 py-1 rounded-full",
                        p.is_active ? "text-emerald-500 bg-emerald-500/10" : "text-gray-500 bg-gray-500/10"
                      )}>
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isOwner && (
                          deleteConfirmId === p.id ? (
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="danger" className="h-7 px-2 text-[10px]" onClick={() => deleteMutation.mutate(p.id)}>Confirm</Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => setAdjustingProduct(p)}
                                className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="Adjust Stock"
                              >
                                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => { setEditingProduct(p); setIsPanelOpen(true); }}
                                className="p-2 text-gray-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmId(p.id)}
                                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {productsData.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-gray-500 italic">
                      No products found. Add your first item to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ProductPanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
        product={editingProduct}
      />

      <StockAdjustmentModal 
        product={adjustingProduct} 
        onClose={() => setAdjustingProduct(null)} 
      />

      <CSVImportPanel 
        open={isImportPanelOpen}
        onClose={() => {
          setIsImportPanelOpen(false)
          queryClient.invalidateQueries({ queryKey: ["products"] })
        }}
      />
    </DashboardLayout>
  )
}

function StockAdjustmentModal({ product, onClose }: any) {
  const queryClient = useQueryClient()
  const [adjustment, setAdjustment] = useState(0)
  const [reason, setReason] = useState("")

  const mutation = useMutation({
    mutationFn: (data: any) => apiClient.post(`/api/v1/products/${product.id}/adjust-stock`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Stock adjusted")
      onClose()
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, "Failed to adjust stock"))
    }
  })

  if (!product) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-sm bg-[#0f0f0f] border border-[#1a1a1a] rounded-3xl p-8 space-y-6"
        >
          <div>
            <h2 className="text-lg font-bold">Adjust Stock</h2>
            <p className="text-xs text-gray-500 mt-1">{product.name}</p>
          </div>
          
          <div className="bg-[#111111] p-4 rounded-2xl border border-[#2a2a2a] flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Current Stock</span>
            <span className="text-xl font-black text-white">{product.stock_quantity}</span>
          </div>

          <div className="space-y-4">
            <Input 
              label="Adjustment (e.g. 10 or -5)" 
              type="number" 
              value={adjustment} 
              onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)} 
            />
            <Input 
              label="Reason" 
              placeholder="e.g. Restock or Damage" 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button 
              className="flex-1" 
              onClick={() => mutation.mutate({ adjustment, reason })}
              isLoading={mutation.isPending}
            >
              Update
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function ProductPanel({ isOpen, onClose, product }: any) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: "", sku: "", category: "", 
    cost_price_ngn: 0, selling_price_ngn: 0, 
    stock_quantity: 0, low_stock_threshold: 5, 
    unit: "unit"
  })

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku || "",
        category: product.category || "",
        cost_price_ngn: product.cost_price_kobo / 100,
        selling_price_ngn: product.selling_price_kobo / 100,
        stock_quantity: product.stock_quantity,
        low_stock_threshold: product.low_stock_threshold,
        unit: product.unit || "unit"
      })
    } else {
      setFormData({
        name: "", sku: "", category: "", 
        cost_price_ngn: 0, selling_price_ngn: 0, 
        stock_quantity: 0, low_stock_threshold: 5, 
        unit: "unit"
      })
    }
  }, [product, isOpen])

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (product) return apiClient.patch(`/api/v1/products/${product.id}`, data)
      return apiClient.post("/api/v1/products", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success(product ? "Product updated" : "Product created")
      onClose()
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, "Failed to save product"))
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  // Margin calculation
  const margin = formData.selling_price_ngn > 0 
    ? ((formData.selling_price_ngn - formData.cost_price_ngn) / formData.selling_price_ngn) * 100 
    : 0

  const marginColor = margin > 20 ? "text-emerald-500" : margin > 10 ? "text-amber-500" : "text-red-500"

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div 
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            className="fixed right-0 top-0 h-screen w-full max-w-sm bg-[#0f0f0f] border-l border-[#1a1a1a] z-50 flex flex-col"
          >
            <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
              <h2 className="text-lg font-bold">{product ? "Edit Product" : "Add New Product"}</h2>
              <button onClick={onClose} className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <Input label="Product Name" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="SKU" placeholder="Optional" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} />
                <Input label="Category" placeholder="e.g. Dairy" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} />
              </div>

              <div className="p-4 bg-[#111111] rounded-2xl border border-[#2a2a2a] space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Cost Price (NGN)" 
                    type="number" 
                    step="0.01" 
                    value={formData.cost_price_ngn} 
                    onChange={(e) => setFormData({...formData, cost_price_ngn: parseFloat(e.target.value) || 0})} 
                  />
                  <Input 
                    label="Selling Price (NGN)" 
                    type="number" 
                    step="0.01" 
                    value={formData.selling_price_ngn} 
                    onChange={(e) => setFormData({...formData, selling_price_ngn: parseFloat(e.target.value) || 0})} 
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2a]">
                   <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Expected Margin</span>
                   <span className={cn("text-lg font-black", marginColor)}>{margin.toFixed(1)}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Initial Stock" 
                  type="number" 
                  value={formData.stock_quantity} 
                  onChange={(e) => setFormData({...formData, stock_quantity: parseInt(e.target.value) || 0})} 
                />
                <Input 
                  label="Alert Threshold" 
                  type="number" 
                  value={formData.low_stock_threshold} 
                  onChange={(e) => setFormData({...formData, low_stock_threshold: parseInt(e.target.value) || 0})} 
                />
              </div>
              <Input label="Unit" placeholder="e.g. bottle, pack" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} />
              <div className="p-6 border-t border-[#1a1a1a] bg-[#0d0d0d] mt-6">
                <Button type="submit" className="w-full" isLoading={mutation.isPending}>
                  {product ? "Save Changes" : "Create Product"}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
