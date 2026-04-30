"use client"

import React, { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { SlideOver } from "@/components/ui/SlideOver"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import apiClient from "@/lib/api-client"
import { formatNGN, formatDate, cn, getErrorMessage } from "@/lib/utils"

interface ProcessRefundPanelProps {
  sale: any
  isOpen: boolean
  onClose: () => void
}

export function ProcessRefundPanel({ sale, isOpen, onClose }: ProcessRefundPanelProps) {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState("")
  const [amountNgn, setAmountNgn] = useState(0)
  const [restock, setRestock] = useState(true)
  const [itemsToReturn, setItemsToReturn] = useState<any[]>([])

  useEffect(() => {
    if (sale) {
      setAmountNgn(sale.grand_total_kobo / 100)
      setItemsToReturn(sale.items.map((item: any) => ({
        sale_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        original_quantity: item.quantity,
        quantity_to_return: item.quantity
      })))
      setReason("")
      setRestock(true)
    }
  }, [sale, isOpen])

  const mutation = useMutation({
    mutationFn: (data: any) => apiClient.post("/api/v1/refunds", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["refunds"] })
      toast.success("Refund processed")
      onClose()
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, "Failed to process refund"))
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) {
      toast.error("Reason is required")
      return
    }
    if (amountNgn * 100 > sale.grand_total_kobo) {
      toast.error("Refund amount cannot exceed original sale total")
      return
    }

    mutation.mutate({
      sale_id: sale.id,
      reason,
      amount_ngn: amountNgn,
      restock: restock ? "yes" : "no",
      items: restock ? itemsToReturn.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity_to_return
      })) : []
    })
  }

  if (!sale) return null

  return (
    <SlideOver 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Process Refund"
      maxWidth="max-w-md"
      footer={
        <Button 
          onClick={handleSubmit} 
          className="w-full" 
          variant="danger" 
          isLoading={mutation.isPending}
        >
          Complete Refund
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Sale Summary */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase text-gray-500">Sale Date</span>
            <span className="text-sm text-gray-200">{formatDate(sale.sale_date)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase text-gray-500">Original Total</span>
            <span className="text-sm font-bold text-emerald-400">{formatNGN(sale.grand_total_kobo)}</span>
          </div>
        </div>

        <div className="space-y-6">
          <Input 
            label="Reason for Refund" 
            placeholder="e.g. Defective product, wrong item" 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
            required
          />

          <div className="space-y-2">
            <Input 
              label="Refund Amount (NGN)" 
              type="number" 
              value={amountNgn} 
              onChange={(e) => setAmountNgn(parseFloat(e.target.value) || 0)} 
              max={sale.grand_total_kobo / 100}
              required
            />
            {amountNgn * 100 > sale.grand_total_kobo && (
              <p className="text-[10px] text-red-500 font-bold">Cannot exceed {formatNGN(sale.grand_total_kobo)}</p>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-[#111111] rounded-2xl border border-[#2a2a2a]">
            <div>
              <p className="text-sm font-bold">Return items to stock</p>
              <p className="text-[10px] text-gray-500">Inventory counts will be restored</p>
            </div>
            <button 
              type="button"
              onClick={() => setRestock(!restock)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                restock ? "bg-emerald-500" : "bg-gray-700"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                restock ? "right-1" : "left-1"
              )} />
            </button>
          </div>

          {restock && (
            <div className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Items to Restock</p>
              <div className="space-y-3">
                {itemsToReturn.map((item, idx) => (
                  <div key={item.sale_item_id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs text-gray-300 font-medium">{item.product_name}</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        className="w-16 bg-[#111111] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-center"
                        value={item.quantity_to_return}
                        max={item.original_quantity}
                        min={0}
                        onChange={(e) => {
                          const newItems = [...itemsToReturn]
                          newItems[idx].quantity_to_return = parseInt(e.target.value) || 0
                          setItemsToReturn(newItems)
                        }}
                      />
                      <span className="text-[10px] text-gray-500">/ {item.original_quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </form>
    </SlideOver>
  )
}
