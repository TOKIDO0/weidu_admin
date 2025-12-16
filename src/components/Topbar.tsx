"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { LogOut } from "lucide-react"

export function Topbar() {
  const router = useRouter()
  const [email, setEmail] = useState<string>("")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "")
    })
  }, [])

  async function onLogout() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">
      <div className="text-xs sm:text-sm text-gray-600">
        <span className="text-gray-900 font-medium">后台</span>
        <span className="mx-1 sm:mx-2">/</span>
        <span className="hidden sm:inline">数据管理</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {email && (
          <div className="hidden text-xs sm:text-sm text-gray-600 md:block truncate max-w-[120px] sm:max-w-none">{email}</div>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1 sm:gap-2 rounded-lg border border-gray-300 bg-white px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">退出登录</span>
        </button>
      </div>
    </header>
  )
}
