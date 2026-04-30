"use client"
import { useState, useCallback, useRef } from "react"
import { useAuthStore } from "@/store/auth.store"

type Message = { role: "user" | "assistant"; content: string }

export function useAIChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const streamingRef = useRef(false)
  const { accessToken } = useAuthStore()

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || streamingRef.current) return
    streamingRef.current = true
    setIsStreaming(true)

    setMessages((prev) => {
      const capped = prev.slice(-40)
      return [
        ...capped,
        { role: "user", content },
        { role: "assistant", content: "" },
      ]
    })

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/ai/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: content,
            history: messages.slice(-6),
          }),
        }
      )

      if (!response.ok) throw new Error(`Request failed: ${response.status}`)

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        
        const parts = buffer.split("\n\n")
        buffer = parts.pop() || "" // Keep the last incomplete part in the buffer
        
        for (const part of parts) {
          if (!part.trim()) continue
          const lines = part.split("\n")
          const dataLine = lines.find((l) => l.startsWith("data: "))
          if (!dataLine) continue
          
          const data = dataLine.slice(6)
          if (data === "[DONE]") return
          
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              throw new Error(parsed.error)
            }
            if (parsed.token) {
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + parsed.token,
                }
                return updated
              })
            }
          } catch (e: any) {
            if (e instanceof SyntaxError) {
              continue
            }
            throw e
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: err?.message?.includes("401")
            ? "Session expired. Please refresh the page."
            : "Something went wrong. Please try again.",
        }
        return updated
      })
    } finally {
      streamingRef.current = false
      setIsStreaming(false)
    }
  }, [messages, accessToken])

  const clearMessages = () => setMessages([])
  return { messages, sendMessage, isStreaming, clearMessages }
}
