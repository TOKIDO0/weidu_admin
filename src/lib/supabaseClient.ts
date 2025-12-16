import { createClient } from "@supabase/supabase-js"

// 默认使用我们已创建好的 Supabase 项目（方便你零配置直接跑起来）
// 如需替换项目，配置环境变量即可覆盖：
// NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
const DEFAULT_SUPABASE_URL = "https://aitxgwfqtcrxxcglwmrq.supabase.co"
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpdHhnd2ZxdGNyeHhjZ2x3bXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NDc1NTQsImV4cCI6MjA4MTIyMzU1NH0.OLDft-LmrRZEGEUEzJ9srevbnI68vV9jWf4Ym05lkAw"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

export const supabase = createClient(url, anonKey)


