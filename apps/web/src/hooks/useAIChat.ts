"use client"
import { useState, useCallback } from "react"
import apiClient from "@/lib/api-client"

type Message = { role: "user" | "assistant"; content: string }

export function useAIChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return
    setIsLoading(true)

    const userMsg: Message = { role: "user", content }
    const loadingMsg: Message = { role: "assistant", content: "" }
    setMessages((prev) => {
      const capped = prev.slice(-40)
      return [...capped, userMsg, loadingMsg]
    })

    try {
      const res = await apiClient.post("/api/v1/ai/chat", {
        message: content,
        history: messages.slice(-6),
      })

      const responseText = res.data.data.message

      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: "assistant",
          content: responseText,
        }
        return updated
      })
    } catch (error: any) {
      const detail = error.response?.data?.detail || "I could not process that right now. Please try again."
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: "assistant",
          content: detail,
        }
        return updated
      })
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading])

  const clearMessages = () => setMessages([])
  return { messages, sendMessage, isStreaming: isLoading, clearMessages }
}
