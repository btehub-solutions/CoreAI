"use client"
import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { PaperAirplaneIcon, SparklesIcon }
  from "@heroicons/react/24/solid"
import { useAIChat } from "@/hooks/useAIChat"
import { cn } from "@/lib/utils"

const SUGGESTED = [
  "How was today?",
  "Which product sells most?",
  "Am I profitable this week?",
  "What should I restock?",
]

export function AIChatPanel() {
  const { messages, sendMessage, isStreaming } = useAIChat()
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    sendMessage(input.trim())
    setInput("")
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 px-1">
        {messages.length === 0 ? (
          <div className="py-12 text-center">
            <SparklesIcon
              className="h-8 w-8 text-emerald-600 mx-auto mb-3"
            />
            <p className="text-sm text-gray-500">
              Ask anything about your business
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs border border-[#2a2a2a] bg-[#1a1a1a]
                    px-3 py-1.5 rounded-full text-gray-400
                    hover:border-emerald-800 hover:text-emerald-400"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                "max-w-[85%] whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-emerald-700 text-white rounded-br-sm"
                  : "bg-[#1a1a1a] border border-[#2a2a2a] text-gray-200 rounded-bl-sm"
              )}>
                {msg.content}
                {isStreaming
                  && i === messages.length - 1
                  && msg.role === "assistant"
                  && msg.content === "" && (
                  <span className="inline-flex gap-1 ml-1">
                    {[0, 1, 2].map((j) => (
                      <motion.span
                        key={j}
                        className="h-1.5 w-1.5 rounded-full bg-gray-500"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: j * 0.2,
                        }}
                      />
                    ))}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-3 border-t border-[#1a1a1a]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Ask about your business..."
          disabled={isStreaming}
          className="flex-1 h-10 bg-[#111111] border border-[#2a2a2a]
            rounded-xl px-4 text-sm text-gray-100 placeholder-gray-600
            focus:border-emerald-700 focus:outline-none
            disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700
            rounded-xl flex items-center justify-center
            disabled:opacity-40 shrink-0"
        >
          <PaperAirplaneIcon className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  )
}
