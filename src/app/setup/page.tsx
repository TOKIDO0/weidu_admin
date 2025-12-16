"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { SliderCaptcha } from "@/components/SliderCaptcha"

export default function SetupPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string>("")
  const [captchaVerified, setCaptchaVerified] = useState(false)

  async function onSetup(e: React.FormEvent) {
    e.preventDefault()
    setMsg("")
    
    if (!captchaVerified) {
      setMsg("请先完成人机验证")
      return
    }
    
    setLoading(true)

    // 1) 注册用户
    const signUp = await supabase.auth.signUp({ email, password })
    if (signUp.error) {
      setLoading(false)
      setMsg(signUp.error.message)
      return
    }

    // 2) 重新取 session（部分情况下 signUp 不会立即返回 session）
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      setLoading(false)
      setMsg("注册成功，但当前未登录。请回到登录页登录后再继续。")
      return
    }

    // 3) 认领首个管理员（如果已经存在管理员会报错）
    const claim = await supabase.rpc("claim_admin")
    setLoading(false)
    if (claim.error) {
      // 这里主要是两种情况：已存在管理员/权限错误
      setMsg(claim.error.message)
      return
    }

    router.replace("/projects")
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div className="text-xs tracking-[0.35em] text-orange-500">
          WEIDU ADMIN
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-white">首次初始化</h1>
        <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
          这一步会创建你的第一个后台管理员账号，并自动写入数据库的{" "}
          <code className="text-neutral-300">admins</code> 表。
          <br />
          <span className="text-orange-200">
            注意：只允许第一次认领，后续会提示已存在管理员。
          </span>
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSetup}>
          <div>
            <label className="block text-xs text-neutral-400 mb-2">邮箱</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm outline-none focus:border-orange-500"
              placeholder="admin@weidu.com"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-2">密码</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={8}
              className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm outline-none focus:border-orange-500"
              placeholder="至少 8 位"
            />
          </div>

          <div className="py-2">
            <SliderCaptcha onVerify={setCaptchaVerified} />
          </div>

          {msg ? (
            <div className="rounded-2xl border border-white/10 bg-neutral-950/50 px-4 py-3 text-sm text-neutral-200 whitespace-pre-wrap">
              {msg}
            </div>
          ) : null}

          <button
            disabled={loading || !captchaVerified}
            className="w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
            type="submit"
          >
            {loading ? "初始化中..." : "创建管理员并进入后台"}
          </button>
        </form>

        <div className="mt-6 text-xs text-neutral-500">
          已有管理员？去{" "}
          <Link className="text-orange-300 hover:text-orange-200" href="/login">
            登录页
          </Link>
        </div>
      </div>
    </div>
  )
}





