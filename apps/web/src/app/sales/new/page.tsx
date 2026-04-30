"use client"

import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MagnifyingGlassIcon, 
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  ArrowLeftOnRectangleIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline"
import { toast } from "sonner"
import { useAuthStore } from "@/store/auth.store"
import { useRole } from "@/hooks/useRole"
import apiClient from "@/lib/api-client"
import { formatNGN, cn, formatDate, getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Logo } from "@/components/ui/Logo"
import { useRouter } from "next/navigation"

interface CartItem {
  product_id: string
  name: string
  quantity: number
  unit_price_kobo: number
  stock_quantity: number
}

export default function NewSalePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { ownerName, businessName, logout, userId } = useAuthStore()
  const { isCashier } = useRole()
  
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [saleResult, setSaleResult] = useState<any>(null)

  // Fetch today's sales for this cashier
  const { data: mySalesData } = useQuery({
    queryKey: ["my-sales", userId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/sales?user_id=${userId}&date=today`)
      return res.data
    },
    enabled: !!userId
  })

  const mySales = mySalesData?.data || []

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
        return prev.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
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
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["my-sales"] })
      toast.success("Sale completed successfully!")
      setSaleResult(response.data.data)
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, "Failed to record sale"))
    }
  })

  const handleComplete = () => {
    if (!paymentMethod || cart.length === 0) return
    mutation.mutate({
      payment_method: paymentMethod,
      items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity }))
    })
  }

  const handleLogout = () => {
    logout()
    router.push("/auth/login")
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Cashier Header */}
      <header className="h-20 border-b border-[#1a1a1a] bg-[#0f0f0f]/50 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <Logo />
          <div className="h-8 w-px bg-[#1a1a1a]" />
          <div>
            <h1 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Register</h1>
            <p className="text-xl font-black text-white">{businessName}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cashier</p>
            <p className="text-sm font-bold text-emerald-400">{ownerName}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all border border-red-500/20"
            title="Logout"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: Sale Interface */}
        <div className="flex-1 flex flex-col p-8 overflow-y-auto">
          <div className="max-w-4xl w-full mx-auto space-y-8">
            <div className="flex items-center justify-between">
               <h2 className="text-3xl font-black">New Sale</h2>
               <div className="flex items-center gap-2 text-gray-500 text-sm">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                 System Online
               </div>
            </div>

            {/* Product Search */}
            <div className="relative group">
              <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                className="w-full bg-[#0f0f0f] border-2 border-[#1a1a1a] rounded-3xl pl-14 pr-6 py-5 text-lg text-white focus:border-emerald-500 outline-none transition-all placeholder:text-gray-700 shadow-2xl"
                placeholder="Scan items or search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute top-full left-0 right-0 mt-4 bg-[#111111] border border-[#2a2a2a] rounded-[2rem] shadow-[0_32px_64px_rgba(0,0,0,0.5)] z-[60] overflow-hidden divide-y divide-[#2a2a2a]">
                    {searchResults.map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => addToCart(p)}
                        disabled={p.stock_quantity <= 0}
                        className="w-full flex items-center justify-between p-6 hover:bg-emerald-500/5 disabled:opacity-50 text-left group transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-[#0a0a0a] flex items-center justify-center border border-[#2a2a2a] group-hover:border-emerald-500/50">
                            <PlusIcon className="h-6 w-6 text-gray-500 group-hover:text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-lg font-bold group-hover:text-emerald-400">{p.name}</p>
                            <p className="text-xs text-gray-500 font-mono">{p.sku || "NO SKU"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-white">{formatNGN(p.selling_price_kobo)}</p>
                          <p className={cn("text-[10px] font-bold uppercase tracking-widest", p.stock_quantity < 5 ? "text-amber-500" : "text-gray-500")}>In Stock: {p.stock_quantity}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* My Sales Today */}
            <div className="pt-12 border-t border-[#1a1a1a]">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-bold text-gray-500 uppercase tracking-widest">My Recent Sales</h3>
                 <span className="px-3 py-1 bg-[#1a1a1a] rounded-full text-[10px] font-bold text-gray-400 uppercase">{mySales.length} Total Today</span>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {mySales.slice(0, 4).map((s: any) => (
                   <div key={s.id} className="bg-[#0f0f0f] border border-[#1a1a1a] p-5 rounded-3xl flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                         <CheckCircleIcon className="h-5 w-5" />
                       </div>
                       <div>
                         <p className="font-bold text-white">{formatNGN(s.grand_total_kobo)}</p>
                         <p className="text-[10px] text-gray-500 uppercase">{formatDate(s.sale_date)}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-xs font-bold text-gray-400 uppercase">{s.payment_method}</p>
                       <p className="text-[10px] text-gray-600">{s.items.length} items</p>
                     </div>
                   </div>
                 ))}
                 {mySales.length === 0 && (
                   <div className="col-span-full py-12 text-center text-gray-700 italic border-2 border-dashed border-[#1a1a1a] rounded-[2.5rem]">
                     No sales recorded by you today
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>

        {/* Right Side: Checkout Sidebar */}
        <div className="w-96 bg-[#0f0f0f] border-l border-[#1a1a1a] flex flex-col">
          {saleResult ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mb-4">
                <CheckCircleIcon className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Sale Recorded
              </h3>
              <p className="text-2xl font-bold text-emerald-400 mb-4">
                {formatNGN(saleResult.grand_total_kobo)}
              </p>
              <div className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl p-4 mb-6 text-left">
                {saleResult.items.map((item: any) => (
                  <div key={item.product_id} className="flex justify-between py-1.5 border-b border-[#1a1a1a] last:border-0">
                    <span className="text-sm text-gray-300">
                      {item.product_name} x{item.quantity}
                    </span>
                    <span className="text-sm text-gray-400">
                      {formatNGN(item.total_kobo)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 mt-1">
                  <span className="text-sm font-medium text-gray-200">
                    Total
                  </span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatNGN(saleResult.grand_total_kobo)}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    setSaleResult(null)
                    setCart([])
                    setPaymentMethod(null)
                  }}
                  className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-medium text-white"
                >
                  Log Another Sale
                </button>
                <button
                  onClick={() => {
                    setSaleResult(null)
                    setCart([])
                    setPaymentMethod(null)
                    router.push("/dashboard")
                  }}
                  className="flex-1 h-10 border border-[#2a2a2a] rounded-xl text-sm text-gray-400 hover:text-gray-200"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-8 border-b border-[#1a1a1a]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Current Order</span>
              <button onClick={() => setCart([])} className="text-[10px] font-bold text-red-500 uppercase hover:underline">Clear All</button>
            </div>
            <p className="text-sm text-gray-400">{cart.length} items in cart</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.map(item => (
              <motion.div layout key={item.product_id} className="bg-[#111111] border border-[#2a2a2a] rounded-3xl p-5 space-y-4 shadow-xl">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-bold text-gray-200">{item.name}</p>
                    <p className="text-[10px] text-gray-500 font-mono uppercase mt-0.5">{formatNGN(item.unit_price_kobo)} each</p>
                  </div>
                  <button onClick={() => removeFromCart(item.product_id)} className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-[#0a0a0a] rounded-2xl border border-[#2a2a2a] p-1.5 gap-2">
                    <button onClick={() => updateQuantity(item.product_id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-[#1a1a1a] rounded-xl text-gray-400"><MinusIcon className="h-3 w-3" /></button>
                    <span className="w-8 text-center text-sm font-black text-white">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-[#1a1a1a] rounded-xl text-gray-400"><PlusIcon className="h-3 w-3" /></button>
                  </div>
                  <p className="text-lg font-black text-emerald-400">{formatNGN(item.unit_price_kobo * item.quantity)}</p>
                </div>
              </motion.div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-30">
                <ShoppingCartIcon className="h-16 w-16 text-gray-500" />
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Cart is empty</p>
              </div>
            )}
          </div>

          <div className="p-8 bg-[#0d0d0d] border-t border-[#1a1a1a] space-y-6">
            <div className="space-y-4">
               <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Payment Method</span>
               <div className="grid grid-cols-2 gap-2">
                 {["cash", "transfer", "pos", "ussd"].map(method => (
                   <button 
                     key={method} 
                     onClick={() => setPaymentMethod(method)}
                     className={cn(
                       "h-12 rounded-2xl border text-[10px] font-black uppercase transition-all shadow-lg",
                       paymentMethod === method 
                         ? "bg-emerald-500 border-emerald-400 text-white" 
                         : "bg-[#111111] border-[#2a2a2a] text-gray-500 hover:border-gray-700"
                     )}
                   >
                     {method}
                   </button>
                 ))}
               </div>
            </div>

            <div className="pt-6 border-t border-[#1a1a1a]">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Grand Total</span>
                <span className="text-4xl font-black text-white">{formatNGN(grandTotal)}</span>
              </div>
              <Button 
                onClick={handleComplete} 
                className="w-full h-16 text-lg font-black rounded-3xl shadow-[0_20px_40px_rgba(16,185,129,0.2)]" 
                disabled={cart.length === 0 || !paymentMethod}
                isLoading={mutation.isPending}
              >
                Complete Sale
              </Button>
            </div>
          </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
