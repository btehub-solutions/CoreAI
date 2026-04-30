import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { cn } from "@/lib/utils"

interface SlideOverProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
}

export function SlideOver({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  maxWidth = "max-w-sm" 
}: SlideOverProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ x: "100%" }} 
            animate={{ x: 0 }} 
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed right-0 top-0 h-screen w-full bg-[#0f0f0f] border-l border-[#1a1a1a] z-[110] flex flex-col",
              maxWidth
            )}
          >
            <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>

            {footer && (
              <div className="p-6 border-t border-[#1a1a1a] bg-[#0d0d0d]">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
