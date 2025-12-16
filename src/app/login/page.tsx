"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")

  // 检查是否已登录
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/")
      }
    })
  }, [router])

  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    
    if (!email || !password) {
      setError("请填写邮箱和密码")
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      if (data.session) {
        await new Promise(resolve => setTimeout(resolve, 100))
        router.push("/")
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || "登录失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ 
      backgroundImage: "url('https://dl.img.timecdn.cn/2025/12/15/aurora.png')",
      backgroundSize: "cover",
      backgroundPosition: "right",
      overflow: "hidden"
    }}>
      <div className="wrapper" style={{
        boxSizing: "border-box",
        backgroundColor: "white",
        height: "100vh",
        width: "max(40%, 600px)",
        padding: "10px",
        borderRadius: "0 20px 20px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: 900,
          textTransform: "uppercase",
          color: "#2E2B41",
          marginBottom: "20px"
        }}>登录</h1>
        
        {error && (
          <p id="error-message" style={{
            color: "#f06272",
            marginBottom: "10px",
            fontSize: "0.9rem"
          }}>{error}</p>
        )}

        <form 
          id="form" 
          onSubmit={onLogin}
          style={{
            width: "min(400px, 100%)",
            marginTop: "20px",
            marginBottom: "50px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px"
          }}
        >
          <div style={{
            width: "100%",
            display: "flex",
            justifyContent: "center"
          }}>
            <label htmlFor="email-input" style={{
              flexShrink: 0,
              height: "50px",
              width: "50px",
              backgroundColor: "#8672FF",
              color: "white",
              borderRadius: "10px 0 0 10px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "1.5rem",
              fontWeight: 500
            }}>
              <span>@</span>
            </label>
            <input
              type="email"
              name="email"
              id="email-input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError("")
              }}
              placeholder="邮箱"
              required
              style={{
                boxSizing: "border-box",
                flexGrow: 1,
                minWidth: 0,
                height: "50px",
                padding: "1em",
                font: "inherit",
                borderRadius: "0 10px 10px 0",
                border: "2px solid #F3F0FF",
                borderLeft: "none",
                backgroundColor: "#F3F0FF",
                transition: "150ms ease",
                outline: "none"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#2E2B41"
                e.currentTarget.parentElement!.querySelector("label")!.style.backgroundColor = "#2E2B41"
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#F3F0FF"
                e.currentTarget.parentElement!.querySelector("label")!.style.backgroundColor = "#8672FF"
              }}
            />
          </div>

          <div style={{
            width: "100%",
            display: "flex",
            justifyContent: "center"
          }}>
            <label htmlFor="password-input" style={{
              flexShrink: 0,
              height: "50px",
              width: "50px",
              backgroundColor: "#8672FF",
              fill: "white",
              color: "white",
              borderRadius: "10px 0 0 10px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "1.5rem",
              fontWeight: 500
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" style={{ fill: "white" }}>
                <path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm240-200q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z"/>
              </svg>
            </label>
            <input
              type="password"
              name="password"
              id="password-input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError("")
              }}
              placeholder="密码"
              required
              style={{
                boxSizing: "border-box",
                flexGrow: 1,
                minWidth: 0,
                height: "50px",
                padding: "1em",
                font: "inherit",
                borderRadius: "0 10px 10px 0",
                border: "2px solid #F3F0FF",
                borderLeft: "none",
                backgroundColor: "#F3F0FF",
                transition: "150ms ease",
                outline: "none"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#2E2B41"
                e.currentTarget.parentElement!.querySelector("label")!.style.backgroundColor = "#2E2B41"
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#F3F0FF"
                e.currentTarget.parentElement!.querySelector("label")!.style.backgroundColor = "#8672FF"
              }}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            style={{
              marginTop: "10px",
              border: "none",
              borderRadius: "1000px",
              padding: ".85em 4em",
              backgroundColor: loading ? "#a0a0a0" : "#8672FF",
              color: "white",
              font: "inherit",
              fontWeight: 600,
              textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "150ms ease"
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = "#2E2B41"
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = "#8672FF"
            }}
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <p style={{ color: "#2E2B41" }}>
          维度空间后台管理系统
        </p>
      </div>

      <style jsx global>{`
        @media (max-width: 1100px) {
          .wrapper {
            width: min(600px, 100%) !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
