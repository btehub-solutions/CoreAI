"use client"

import React, { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  ShoppingCartIcon,
  XMarkIcon,
  MinusIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline"
import { toast } from "sonner"
import DashboardLayout from "@/components/layout/DashboardLayout"
import apiClient from "@/lib/api-client"
import { formatNGN, cn, formatDate, getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { ProcessRefundPanel } from "@/components/sales/ProcessRefundPanel"

interface CartItem {
  product_id: string
  name: string
  quantity: number
  unit_price_kobo: number
  stock_quantity: number
}

import { useRole } from "@/hooks/useRole"
import { useAuthStore } from "@/store/auth.store"

export default function SalesPage() {
  const queryClient = useQueryClient()
  const { isCashier } = useRole()
  const { userId } = useAuthStore()
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [isRefundPanelOpen, setIsRefundPanelOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["sales", userId, isCashier],
    queryFn: async () => {
      const url = isCashier ? `/api/v1/sales?user_id=${userId}` : "/api/v1/sales"
      const res = await apiClient.get(url)
      return res.data
    }
  })

  const sales = data?.data || []
  const todayTotal = sales.reduce((acc: number, s: any) => {
    const isToday = new Date(s.sale_date).toDateString() === new Date().toDateString()
    return isToday ? acc + s.grand_total_kobo : acc
  }, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Sales</h1>
            <p className="text-sm text-gray-500">Today&apos;s Revenue: <span className="text-emerald-400 font-bold">{formatNGN(todayTotal)}</span></p>
          </div>
          {!isCashier && (
            <Button onClick={() => setIsPanelOpen(true)} className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              New Sale
            </Button>
          )}
        </div>

        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-3xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#111111] text-[10px] uppercase tracking-widest font-bold text-gray-500">
              <tr>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-center">Payment</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {sales.map((s: any) => (
                <tr key={s.id} className="text-sm hover:bg-[#1a1a1a]/30 group">
                  <td className="px-6 py-4">
                    <div className="font-medium">{formatDate(s.sale_date)}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{s.items.length} items</td>
                  <td className="px-6 py-4 font-bold text-emerald-400">{formatNGN(s.grand_total_kobo)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-[10px] font-bold uppercase text-gray-500 bg-[#1a1a1a] px-2 py-1 rounded-lg">
                      {s.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] uppercase font-bold px-2 py-1 rounded-full",
                      s.status === "completed" ? "text-emerald-500 bg-emerald-500/10" : 
                      s.status === "refunded" ? "text-red-500 bg-red-500/10" : 
                      "text-amber-500 bg-amber-500/10"
                    )}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedSale(s)}
                      className="p-2 text-gray-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-500 italic">No sales recorded yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewSalePanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
      />

      <SaleDetailPanel 
        sale={selectedSale} 
        onClose={() => setSelectedSale(null)} 
        onProcessRefund={() => setIsRefundPanelOpen(true)}
      />

      <ProcessRefundPanel 
        sale={selectedSale}
        isOpen={isRefundPanelOpen}
        onClose={() => setIsRefundPanelOpen(false)}
      />
    </DashboardLayout>
  )
}

function NewSalePanel({ isOpen, onClose }: any) {
  const queryClient = useQueryClient()
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

  // Search products
  useEffect(() => {
    if (search.length < 2) {
      setSearchResults([])
      return
    }
    const fetchProducts = async () => {
      setIsLoadingProducts(true)
      try {
        const res = await apiClient.get(`/api/v1/products?search=${search}`)
        setSearchResults(res.data.data)
      } catch (err) {} finally {
        setIsLoadingProducts(false)
      }
    }
    const timer = setTimeout(fetchProducts, 300)
    return () => clearTimeout(timer)
  }, [search])

  const addToCart = (product: any) => {
    if (product.stock_quantity <= 0) return
    
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev
        return prev.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        )
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price_kobo: product.selling_price_kobo,
        stock_quantity: product.stock_quantity
      }]
    })
    setSearch("")
    setSearchResults([])
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id !== id) return item
      const newQty = item.quantity + delta
      if (newQty < 1) return item
      if (newQty > item.stock_quantity) {
        toast.error(`Only ${item.stock_quantity} available`)
        return item
      }
      return { ...item, quantity: newQty }
    }))
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.product_id !== id))
  }

  const grandTotal = cart.reduce((acc, item) => acc + (item.unit_price_kobo * item.quantity), 0)

  const mutation = useMutation({
    mutationFn: (data: any) => apiClient.post("/api/v1/sales", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      toast.success("Sale recorded")
      setCart([])
      setPaymentMethod(null)
      setNotes("")
      onClose()
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, "Failed to record sale"))
    }
  })

  const handleComplete = () => {
    if (!paymentMethod || cart.length === 0) return
    mutation.mutate({
      payment_method: paymentMethod,
      notes,
      items: cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }))
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="fixed right-0 top-0 h-screen w-full max-w-md bg-[#0f0f0f] border-l border-[#1a1a1a] z-50 flex flex-col">
            <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
              <h2 className="text-lg font-bold">New Sale</h2>
              <button onClick={onClose} className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"><XMarkIcon className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Product Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input 
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-emerald-500 outline-none"
                  placeholder="Scan SKU or type product name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="absolute top-full left-0 right-0 mt-2 bg-[#111111] border border-[#2a2a2a] rounded-2xl shadow-2xl z-10 overflow-hidden divide-y divide-[#2a2a2a]">
                      {searchResults.map(p => (
                        <button 
                          key={p.id} 
                          onClick={() => addToCart(p)}
                          disabled={p.stock_quantity <= 0}
                          className="w-full flex items-center justify-between p-4 hover:bg-emerald-500/5 disabled:opacity-50 text-left group"
                        >
                          <div>
                            <p className="text-sm font-semibold group-hover:text-emerald-400">{p.name}</p>
                            <p className="text-[10px] text-gray-500 uppercase">{p.sku || "No SKU"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-gray-300">{formatNGN(p.selling_price_kobo)}</p>
                            <p className={cn("text-[10px] font-bold uppercase", p.stock_quantity < 5 ? "text-amber-500" : "text-gray-500")}>Stock: {p.stock_quantity}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Cart */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-gray-500">
                  <span className="text-[10px] uppercase font-bold tracking-widest">Cart Items ({cart.length})</span>
                  {cart.length > 0 && <button onClick={() => setCart([])} className="text-[10px] uppercase font-bold text-red-500 hover:underline">Clear</button>}
                </div>
                
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.product_id} className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-bold truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">{formatNGN(item.unit_price_kobo)} / unit</p>
                        </div>
                        <button onClick={() => removeFromCart(item.product_id)} className="text-gray-600 hover:text-red-400">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-[#0a0a0a] rounded-xl border border-[#2a2a2a] p-1">
                          <button onClick={() => updateQuantity(item.product_id, -1)} className="p-1.5 hover:bg-[#1a1a1a] rounded-lg"><MinusIcon className="h-3 w-3" /></button>
                          <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product_id, 1)} className="p-1.5 hover:bg-[#1a1a1a] rounded-lg"><PlusIcon className="h-3 w-3" /></button>
                        </div>
                        <p className="text-sm font-black text-emerald-400">{formatNGN(item.unit_price_kobo * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-gray-600 space-y-2 border-2 border-dashed border-[#1a1a1a] rounded-3xl">
                      <ShoppingCartIcon className="h-8 w-8 opacity-20" />
                      <p className="text-sm">Scan items to start sale</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-4">
                 <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Payment Method</span>
                 <div className="grid grid-cols-2 gap-3">
                   {["cash", "transfer", "pos", "ussd"].map(method => (
                     <button 
                       key={method} 
                       onClick={() => setPaymentMethod(method)}
                       className={cn(
                         "h-12 rounded-2xl border text-xs font-bold uppercase transition-all",
                         paymentMethod === method 
                           ? "bg-[#0d1f17] border-emerald-500 text-emerald-500" 
                           : "bg-[#111111] border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a]"
                       )}
                     >
                       {method}
                     </button>
                   ))}
                 </div>
              </div>
            </div>

            <div className="p-6 bg-[#0d0d0d] border-t border-[#1a1a1a] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Total Amount</span>
                <span className="text-3xl font-black text-white">{formatNGN(grandTotal)}</span>
              </div>
              <Button 
                onClick={handleComplete} 
                className="w-full h-14 text-base" 
                disabled={cart.length === 0 || !paymentMethod}
                isLoading={mutation.isPending}
              >
                Complete Sale
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function SaleDetailPanel({ sale, onClose, onProcessRefund }: any) {
  if (!sale) return null
  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-[#0f0f0f] border border-[#1a1a1a] rounded-3xl overflow-hidden"
        >
          <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
            <h2 className="font-bold">Sale Receipt</h2>
            <button onClick={onClose} className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"><XMarkIcon className="h-5 w-5" /></button>
          </div>
          <div className="p-8 space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Receipt ID</p>
                <p className="text-sm font-mono text-gray-300">{sale.id}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Date</p>
                <p className="text-sm text-gray-300">{formatDate(sale.sale_date)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Items</p>
              <div className="divide-y divide-[#1a1a1a]">
                {sale.items.map((item: any) => (
                  <div key={item.id} className="py-3 flex justify-between items-center text-sm">
                    <div className="flex-1">
                      <p className="font-bold">{item.product_name}</p>
                      <p className="text-[10px] text-gray-500">{item.quantity} x {formatNGN(item.unit_price_kobo)}</p>
                    </div>
                    <p className="font-bold">{formatNGN(item.total_kobo)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-[#1a1a1a] flex items-center justify-between">
               <div>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Payment Method</p>
                 <span className="text-xs font-bold uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">{sale.payment_method}</span>
               </div>
               <div className="text-right">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Total Paid</p>
                 <p className="text-3xl font-black">{formatNGN(sale.grand_total_kobo)}</p>
               </div>
            </div>
          </div>
          <div className="p-6 bg-[#0d0d0d] flex gap-3">
             <Button variant="secondary" className="flex-1 h-12" onClick={onClose}>Close</Button>
             {sale.status === "completed" && (
               <Button variant="danger" className="flex-1 h-12 gap-2" onClick={onProcessRefund}>
                 <ArrowPathIcon className="h-4 w-4" />
                 Refund
               </Button>
             )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
