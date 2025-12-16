"use client"

import { useState, useRef, useEffect } from "react"
import { X, Send, Bot, User } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

// API Key 现在通过服务器端 API 路由保护，不再在客户端使用

// 可用的模型列表
const AVAILABLE_MODELS = [
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro", description: "最强大的模型，适合复杂推理" },
  { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash", description: "快速响应模型" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "稳定可靠的生产模型" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "快速轻量级模型" },
]

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

  async function fetchDataForContext() {
    try {
      // 获取所有项目信息（包括标题、分类、地点等）
      const { data: allProjects } = await supabase
        .from("projects")
        .select("id, title, category, location, description, published")
        .order("created_at", { ascending: false })
        .limit(20)

      // 获取最近的客户预约
      const { data: recentLeads } = await supabase
        .from("leads")
        .select("name, appointment_time, message, status, phone")
        .eq("contact_type", "appointment")
        .not("appointment_time", "is", null)
        .order("appointment_time", { ascending: false })
        .limit(10)

      // 获取所有日程
      const { data: allSchedules } = await supabase
        .from("schedules")
        .select("title, scheduled_date, scheduled_time, description")
        .order("scheduled_date", { ascending: false })
        .limit(20)

      // 获取最近的客户需求
      const { data: recentLeadsAll } = await supabase
        .from("leads")
        .select("name, phone, message, status, contact_type, appointment_time, created_at")
        .order("created_at", { ascending: false })
        .limit(10)

      // 获取项目统计
      const { count: projectCount } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })

      const { count: leadCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "new")

      // 从知识库获取额外信息
      const { data: knowledgeBase } = await supabase
        .from("knowledge_base")
        .select("content_type, title, content, metadata")
        .order("updated_at", { ascending: false })
        .limit(50)

      return {
        allProjects: allProjects || [],
        recentLeads: recentLeads || [],
        allSchedules: allSchedules || [],
        recentLeadsAll: recentLeadsAll || [],
        projectCount: projectCount || 0,
        pendingLeads: leadCount || 0,
        knowledgeBase: knowledgeBase || [],
      }
    } catch (error) {
      console.error("获取上下文数据失败:", error)
      return null
    }
  }

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
      // 获取上下文数据
      const contextData = await fetchDataForContext()

      // 构建系统提示
      const systemPrompt = `你是一个公司网站的智能助手，可以帮助用户回答各种问题。你可以回答关于维度空间设计工作室的后台系统、公司、项目、客户需求、日程安排等问题，也可以回答其他任何问题，包括但不限于技术问题、生活问题、学习问题等，并且你的回复格式要尽量干净，如果你需要给用户回复数据相关的内容，你可以使用markdown格式来让用户看起来更加清晰，除非特殊情况，否则不得使用*号出现在你的回复中，同时你的回答当中不能够出现情色、血腥、暴力、引导犯罪、影响中国政治稳定、违法乱纪、等任何违法违规的内容。

当前系统数据（如果用户询问相关问题时可以使用）：
${contextData ? `
- 总项目数：${contextData.projectCount}
- 待处理客户需求：${contextData.pendingLeads}

项目列表：
${contextData.allProjects.map((project: any) => 
  `  - ${project.title}（${project.category || "未分类"}，${project.location || "未指定地点"}）${project.published ? "已发布" : "未发布"}`
).join("\n")}

最近的客户预约：
${contextData.recentLeads.map((lead: any) => 
  `  - ${lead.name}（${lead.phone}），预约时间：${new Date(lead.appointment_time).toLocaleString("zh-CN")}，状态：${lead.status === "new" ? "待处理" : lead.status === "contacted" ? "已联系" : "已完成"}，需求：${lead.message?.substring(0, 50) || "无"}`
).join("\n")}

所有日程安排：
${contextData.allSchedules.map((schedule: any) => 
  `  - ${schedule.title}，日期：${schedule.scheduled_date}${schedule.scheduled_time ? ` ${schedule.scheduled_time}` : ""}${schedule.description ? `，描述：${schedule.description.substring(0, 50)}` : ""}`
).join("\n")}

最近的客户需求：
${contextData.recentLeadsAll.map((lead: any) => 
  `  - ${lead.name}（${lead.phone}），${lead.contact_type === "appointment" ? `预约时间：${lead.appointment_time ? new Date(lead.appointment_time).toLocaleString("zh-CN") : "未设置"}` : "立即联系"}，状态：${lead.status === "new" ? "待处理" : lead.status === "contacted" ? "已联系" : "已完成"}，需求：${lead.message?.substring(0, 100) || "无"}`
).join("\n")}

${contextData.knowledgeBase.length > 0 ? `
知识库信息：
${contextData.knowledgeBase.map((kb: any) => 
  `  - [${kb.content_type}] ${kb.title || "无标题"}：${kb.content?.substring(0, 100) || ""}`
).join("\n")}
` : ""}
` : "无法获取数据"}

请用中文回答，回答要准确、有帮助性。无论用户问什么问题，都要尽力回答。如果问题与系统数据相关，可以使用上面的数据；如果问题与系统无关，请根据你的知识回答。`

      // 通过 API 路由调用，保护 API Key
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AIChat.tsx:161',message:'Starting API request',data:{messageLength:userInput.length,hasContextData:!!contextData,loadingState:loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userInput,
          contextData: contextData,
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
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />
      
      {/* 聊天窗口 */}
      <div className="relative w-full max-w-2xl h-[80vh] max-h-[800px] bg-white rounded-xl shadow-2xl flex flex-col border border-gray-200 pointer-events-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI 助手</h3>
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
          className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
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
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
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
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
