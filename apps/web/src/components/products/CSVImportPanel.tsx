"use client"

import React, { useState, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { 
  XMarkIcon, 
  ArrowDownTrayIcon, 
  CloudArrowUpIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from "@heroicons/react/24/outline"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import { Button } from "@/components/ui/Button"
import { cn, getErrorMessage } from "@/lib/utils"

interface CSVImportPanelProps {
  open: boolean
  onClose: () => void
}

type Step = "UPLOAD" | "PREVIEW" | "SUCCESS"

export default function CSVImportPanel({ open, onClose }: CSVImportPanelProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>("UPLOAD")
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [showErrors, setShowErrors] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const reset = () => {
    setStep("UPLOAD")
    setFile(null)
    setPreviewData(null)
    setShowErrors(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiClient.get("/api/v1/products/csv-template", {
        responseType: "blob",
      })
      
      // Check if the response is actually a JSON error (happens sometimes with blobs)
      if (response.data.type === "application/json") {
        const text = await response.data.text()
        const error = JSON.parse(text)
        const message = typeof error.detail === "string" 
          ? error.detail 
          : Array.isArray(error.detail) 
            ? error.detail[0]?.msg || JSON.stringify(error.detail[0])
            : "Failed to download template"
        toast.error(message)
        return
      }

      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", "coreai_products_template.csv")
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      toast.error("Failed to download template")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast.error("Please upload a CSV file")
        return
      }
      setFile(selectedFile)
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => {
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      if (!droppedFile.name.endsWith(".csv")) {
        toast.error("Please upload a CSV file")
        return
      }
      setFile(droppedFile)
    }
  }

  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      const res = await apiClient.post("/api/v1/products/import-csv/preview", formData)
      return res.data.data
    },
    onSuccess: (data) => {
      setPreviewData(data)
      setStep("PREVIEW")
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, "Failed to analyze file"))
    }
  })

  const confirmMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiClient.post("/api/v1/products/import-csv/confirm", {
        import_token: token
      })
      return res.data.data
    },
    onSuccess: (data) => {
      setPreviewData({ ...previewData, ...data })
      setStep("SUCCESS")
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, "Import failed"))
    }
  })

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div 
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            className="fixed right-0 top-0 h-screen w-full max-w-[600px] bg-[#0f0f0f] border-l border-[#1a1a1a] z-[70] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between bg-[#0d0d0d]">
              <div className="flex items-center gap-3">
                {step === "PREVIEW" && (
                  <button onClick={() => setStep("UPLOAD")} className="p-1.5 hover:bg-[#1a1a1a] rounded-lg text-gray-400">
                    <ArrowLeftIcon className="h-4 w-4" />
                  </button>
                )}
                <h2 className="text-lg font-bold text-white">
                  {step === "UPLOAD" ? "Import Products" : step === "PREVIEW" ? "Review Import" : "Import Complete"}
                </h2>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors text-gray-400">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {step === "UPLOAD" && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6 space-y-4 hover:border-emerald-500/50 transition-colors">
                      <div className="bg-emerald-500/10 h-10 w-10 rounded-xl flex items-center justify-center">
                        <ArrowDownTrayIcon className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-200">Download Template</h3>
                        <p className="text-xs text-gray-500 mt-1">Start with our ready-made format to ensure perfect mapping.</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full" onClick={handleDownloadTemplate}>
                        Download CSV Template
                      </Button>
                    </div>

                    <div 
                      className={cn(
                        "relative flex flex-col items-center justify-center bg-[#111111] border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer",
                        isDragging ? "border-emerald-600 bg-emerald-950/10" : "border-[#2a2a2a] hover:border-emerald-700/50"
                      )}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input 
                        type="file" ref={fileInputRef} className="hidden" accept=".csv" 
                        onChange={handleFileChange} 
                      />
                      <CloudArrowUpIcon className="h-10 w-10 text-gray-600 mb-3" />
                      <div>
                        <p className="text-sm text-gray-400 font-medium">Drop your CSV here</p>
                        <p className="text-xs text-gray-600 mt-1">or click to browse</p>
                      </div>
                      {file && (
                        <div className="mt-4 flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                          <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs text-emerald-400 font-medium truncate max-w-[150px]">{file.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#1a1a1a]">
                    <Button 
                      className="w-full h-11" 
                      disabled={!file || previewMutation.isPending}
                      isLoading={previewMutation.isPending}
                      onClick={() => file && previewMutation.mutate(file)}
                    >
                      {previewMutation.isPending ? "Analyzing your file..." : "Analyze File"}
                    </Button>
                  </div>
                </div>
              )}

              {step === "PREVIEW" && previewData && (
                <div className="space-y-6">
                  {/* Summary Bar */}
                  <div className="flex flex-wrap gap-2">
                    <div className="bg-emerald-950/30 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/20">
                      {previewData.total_rows} products found
                    </div>
                    {previewData.error_rows > 0 && (
                      <div className="bg-red-950/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/20">
                        {previewData.error_rows} skipped
                      </div>
                    )}
                    <div className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border",
                      previewData.confidence === "high" ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/20" :
                      previewData.confidence === "medium" ? "bg-amber-950/30 text-amber-400 border-amber-500/20" :
                      "bg-red-950/30 text-red-400 border-red-500/20"
                    )}>
                      Confidence: {previewData.confidence}
                    </div>
                  </div>

                  {/* Mappings */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">How we mapped your columns</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(previewData.mapping).map(([csv_col, schema_field]: [string, any]) => (
                        <div key={csv_col} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs">
                          <span className="text-gray-500 font-medium">{csv_col}</span>
                          <span className="mx-2 text-gray-700">→</span>
                          <span className="text-emerald-400 font-bold">{schema_field}</span>
                        </div>
                      ))}
                    </div>
                    {previewData.unmapped_columns?.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs text-gray-600 italic">Ignored columns:</span>
                        {previewData.unmapped_columns.map((col: string) => (
                          <span key={col} className="text-[10px] bg-[#161616] text-gray-500 px-2 py-1 rounded border border-[#222]">
                            {col}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Warnings */}
                  {previewData.warnings?.length > 0 && (
                    <div className="bg-amber-950/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-amber-400">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Import Warnings</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1">
                        {previewData.warnings.map((w: string, i: number) => (
                          <li key={i} className="text-xs text-amber-300/80">{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Table Preview */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Preview (first 10 rows)</h3>
                    <div className="border border-[#1a1a1a] rounded-xl overflow-hidden bg-[#111111]">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 bg-[#161616] text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                            <tr>
                              <th className="px-4 py-3">Product Name</th>
                              <th className="px-4 py-3">Price</th>
                              <th className="px-4 py-3">Stock</th>
                              <th className="px-4 py-3">Unit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1a1a1a]">
                            {previewData.preview_rows.map((row: any, i: number) => (
                              <tr key={i} className={cn(i % 2 === 0 ? "bg-[#111111]" : "bg-[#0f0f0f]")}>
                                <td className="px-4 py-3 text-gray-200 font-medium">{row.product_name || "-"}</td>
                                <td className="px-4 py-3 text-emerald-400 font-bold">₦{row.selling_price_ngn?.toLocaleString() || "-"}</td>
                                <td className="px-4 py-3 text-gray-300">{row.stock_quantity ?? "-"}</td>
                                <td className="px-4 py-3 text-gray-500 italic">{row.unit || "unit"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Errors Section */}
                  {previewData.errors?.length > 0 && (
                    <div className="border border-red-500/20 rounded-xl overflow-hidden">
                      <button 
                        onClick={() => setShowErrors(!showErrors)}
                        className="w-full flex items-center justify-between p-3 bg-red-950/10 text-red-400 text-xs font-bold uppercase tracking-widest"
                      >
                        <span>Show {previewData.error_rows} skipped rows</span>
                        {showErrors ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                      </button>
                      <AnimatePresence>
                        {showErrors && (
                          <motion.div 
                            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                            className="bg-[#0d0d0d] border-t border-red-500/10 overflow-hidden"
                          >
                            <ul className="p-4 space-y-2 max-h-40 overflow-y-auto">
                              {previewData.errors.map((err: string, i: number) => (
                                <li key={i} className="text-xs text-red-400/80 flex gap-2">
                                  <span className="text-red-500">•</span>
                                  {err}
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}

              {step === "SUCCESS" && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
                  <div className="h-20 w-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircleIcon className="h-12 w-12 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{previewData.created} products imported</h3>
                    <p className="text-gray-500 mt-2">
                      {previewData.failed > 0 
                        ? `${previewData.failed} rows were skipped due to errors.` 
                        : "Everything was imported successfully."}
                    </p>
                  </div>
                  <Button className="w-full max-w-xs h-11" onClick={handleClose}>
                    View Products
                  </Button>
                </div>
              )}
            </div>

            {/* Footer Buttons for PREVIEW step */}
            {step === "PREVIEW" && (
              <div className="p-6 border-t border-[#1a1a1a] bg-[#0d0d0d] flex gap-4">
                <Button variant="secondary" className="flex-1" onClick={() => setStep("UPLOAD")}>
                  Start Over
                </Button>
                <Button 
                  className="flex-[2]" 
                  disabled={previewData.total_rows === 0 || confirmMutation.isPending}
                  isLoading={confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate(previewData.import_token)}
                >
                  Import {previewData.total_rows} Products
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
