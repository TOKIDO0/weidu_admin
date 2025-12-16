"use client"

import { useEffect, useState } from "react"

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // 从 localStorage 读取深色模式状态
    const darkmode = localStorage.getItem("darkmode")
    const shouldEnable = darkmode === "active"
    
    setIsDarkMode(shouldEnable)
    
    // 应用深色模式 class（同时添加 dark 和 darkmode 以支持 Tailwind 和 CSS 变量）
    // 确保在客户端渲染时应用
    if (typeof window !== 'undefined') {
      if (shouldEnable) {
        document.documentElement.classList.add("dark")
        document.body.classList.add("darkmode")
      } else {
        document.documentElement.classList.remove("dark")
        document.body.classList.remove("darkmode")
      }
    }
  }, [])

  const toggleDarkMode = () => {
    const newState = !isDarkMode
    setIsDarkMode(newState)
    
    // 确保在客户端执行
    if (typeof window !== 'undefined') {
      if (newState) {
        document.documentElement.classList.add("dark")
        document.body.classList.add("darkmode")
        localStorage.setItem("darkmode", "active")
      } else {
        document.documentElement.classList.remove("dark")
        document.body.classList.remove("darkmode")
        localStorage.setItem("darkmode", "")
      }
    }
  }

  return { isDarkMode, toggleDarkMode, mounted }
}

