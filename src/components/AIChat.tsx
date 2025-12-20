"use client"

import { useState, useRef, useEffect } from "react"
import { X, Send, Bot, User } from "lucide-react"

// API Key 现在通过服务器端 API 路由保护，不再在客户端使用
// 使用智谱AI API（GLM-4.5-Flash）

type Message = {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function AIChat({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const shouldAutoScrollRef = useRef(true)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = "hidden"
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
    }
  }, [isOpen])

  useEffect(() => {
    // 只在用户主动滚动到底部时才自动滚动
    if (shouldAutoScrollRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])
  
  // 监听滚动事件，判断用户是否手动滚动
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      shouldAutoScrollRef.current = isNearBottom
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  async function handleSend() {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    const userInput = input
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)
    shouldAutoScrollRef.current = true // 用户发送消息时，允许自动滚动

    try {
      // 通过 API 路由调用，保护 API Key
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AIChat.tsx:161',message:'Starting API request',data:{messageLength:userInput.length,loadingState:loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userInput,
        }),
      })
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AIChat.tsx:172',message:'API response received',data:{status:response.status,ok:response.ok,contentType:response.headers.get('content-type')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "API 请求失败" }))
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AIChat.tsx:175',message:'API request failed',data:{status:response.status,error:errorData.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        throw new Error(errorData.error || "API 请求失败")
      }

      // 检查响应类型
      const contentType = response.headers.get('content-type')
      let assistantContent = ""

      if (contentType && contentType.includes('text/event-stream')) {
        // 处理流式响应
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        
        if (!reader) {
          throw new Error("无法读取响应流")
        }

        // 创建临时消息用于流式更新
        const tempMessage: Message = {
          role: "assistant",
          content: "",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, tempMessage])
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AIChat.tsx:191',message:'Stream reader created',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        try {
          while (true) {
            const { done, value } = await reader.read()
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AIChat.tsx:199',message:'Reading stream chunk',data:{done,hasValue:!!value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                if (data === '[DONE]' || data === '') continue

                try {
                  const json = JSON.parse(data)
                  const content = json.content || ''
                  if (content) {
                    assistantContent += content
                    // 更新最后一条消息
                    setMessages((prev) => {
                      const newMessages = [...prev]
                      newMessages[newMessages.length - 1] = {
                        ...tempMessage,
                        content: assistantContent,
                      }
                      return newMessages
                    })
                  }
                } catch (e) {
                  // 忽略解析错误，继续处理下一行
                  console.warn('解析流式数据失败:', e, data)
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AIChat.tsx:262',message:'JSON parse error in stream',data:{error:String(e),dataPreview:data.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                  // #endregion
                }
              }
            }
          }
        } finally {
          // 确保reader被正确释放
          reader.releaseLock()
        }
      } else {
        // 处理非流式响应
        const data = await response.json()
        if (!data.message) {
          throw new Error("AI 服务返回了无效的响应")
        }
        assistantContent = data.message
        const assistantMessage: Message = {
          role: "assistant",
          content: assistantContent,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: "assistant",
        content: `抱歉，发生了错误：${error.message || "未知错误"}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-6 py-6 pointer-events-none">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />

      {/* 聊天窗口 */}
      <div className="relative w-full max-w-[min(100%,720px)] lg:max-w-3xl h-[92vh] sm:h-[80vh] max-h-[760px] bg-white rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col border border-gray-200 pointer-events-auto overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">AI 助手</h3>
              <p className="text-xs text-gray-500">维度空间智能助手</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 消息列表 */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#a0a0a0 #f0f0f0'
          }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                欢迎使用 AI 助手
              </h4>
              <p className="text-sm text-gray-500 max-w-md">
                我可以帮助您查询项目信息、客户预约、日程安排等。试试问我：
                <br />
                "我最近的一次客户预约是什么时候？"
                <br />
                "我最近的一个日程是做什么事情？"
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2 text-sm sm:text-base ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-200/60"
                      : "bg-gray-100 text-gray-900 shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-gray-700" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的问题..."
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="sm:w-auto w-full justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
