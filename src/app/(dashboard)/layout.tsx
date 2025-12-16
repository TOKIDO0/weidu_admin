"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Sidebar } from "@/components/Sidebar"
import { Topbar } from "@/components/Topbar"
import { AIChat } from "@/components/AIChat"
import { Menu } from "lucide-react"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const checkingRef = useRef(false)

  useEffect(() => {
    let mounted = true
    
    async function checkAuth() {
      // 防止重复检查
      if (checkingRef.current) return
      checkingRef.current = true

      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (error) {
          console.error("Session check error:", error)
          checkingRef.current = false
          router.replace("/login")
          return
        }

        if (!data.session) {
          checkingRef.current = false
          router.replace("/login")
          return
        }

        // 有 session，设置 ready
        setReady(true)
        checkingRef.current = false
      } catch (err) {
        console.error("Auth check failed:", err)
        if (mounted) {
          checkingRef.current = false
          router.replace("/login")
        }
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      
      if (!session) {
        setReady(false)
        checkingRef.current = false
        router.replace("/login")
      } else if (!ready) {
        setReady(true)
        checkingRef.current = false
      }
    })

    return () => {
      mounted = false
      checkingRef.current = false
      subscription.unsubscribe()
    }
  }, [router, ready])

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">
        <div className="text-sm text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onChatOpen={() => setChatOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col w-full lg:w-auto">
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="ml-3 text-sm font-medium text-gray-900">维度空间</div>
        </div>
        <div className="lg:mt-0 mt-14">
          <Topbar />
        </div>
        <main className="flex-1 p-4 sm:p-6 relative">
          {children}
          {/* AI 聊天组件 - 放在主内容区域 */}
          <AIChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </main>
      </div>
    </div>
  )
}


