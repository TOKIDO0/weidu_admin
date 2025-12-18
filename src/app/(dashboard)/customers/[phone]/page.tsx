"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button, Card, Input, Textarea } from "@/components/ui"

type FollowupRow = {
  id: string
  customer_phone: string
  customer_name: string | null
  content: string
  mentions: string[] | null
  next_follow_at: string | null
  created_by: string | null
  created_at: string
}

function parseMentions(text: string) {
  const found = text.match(/@[^\s@]+/g) ?? []
  const normalized = found
    .map((s) => s.replace(/^@/, "").trim())
    .filter(Boolean)
  return Array.from(new Set(normalized))
}

function fmt(dt: string | null) {
  if (!dt) return "-"
  const d = new Date(dt)
  if (Number.isNaN(d.getTime())) return dt
  return d.toLocaleString("zh-CN")
}

export default function CustomerTimelinePage() {
  const params = useParams()
  const phone = decodeURIComponent(String(params.phone ?? "")).trim()

  const [rows, setRows] = useState<FollowupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  const [customerName, setCustomerName] = useState("")
  const [content, setContent] = useState("")
  const [nextFollowAt, setNextFollowAt] = useState("")
  const [saving, setSaving] = useState(false)

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const mentions = useMemo(() => parseMentions(content), [content])

  async function load() {
    if (!phone) return
    setError("")
    setLoading(true)
    const { data, error } = await supabase
      .from("followups")
      .select("*")
      .eq("customer_phone", phone)
      .order("created_at", { ascending: false })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setRows((data ?? []) as FollowupRow[])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone])

  async function createFollowup() {
    if (!phone) return
    if (!content.trim()) {
      alert("请输入跟进内容")
      return
    }

    setSaving(true)
    setError("")

    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id ?? null

    const payload = {
      customer_phone: phone,
      customer_name: customerName.trim() || null,
      content: content.trim(),
      mentions,
      next_follow_at: nextFollowAt ? new Date(nextFollowAt).toISOString() : null,
      created_by: userId,
    }

    const { error } = await supabase.from("followups").insert(payload)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }

    setCustomerName("")
    setContent("")
    setNextFollowAt("")
    await load()
  }

  async function confirmDelete() {
    if (!deleteConfirmId || deleting) return
    setDeleting(true)
    try {
      const { error } = await supabase.from("followups").delete().eq("id", deleteConfirmId)
      if (error) {
        alert(error.message)
        return
      }
      setDeleteConfirmId(null)
      await load()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客户时间线</h1>
          <p className="text-sm text-gray-600 mt-1">手机号：{phone || "-"}</p>
        </div>
        <Link href="/leads" className="text-sm text-gray-600 hover:text-gray-900">
          返回客户需求
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <Card title="新增跟进" right={<span className="text-xs text-gray-500">@xxx 可自动识别提醒</span>}>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs text-gray-600 mb-2 font-medium">客户姓名（可选）</label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="例如：张三" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-2 font-medium">下次跟进时间（可选）</label>
              <Input
                type="datetime-local"
                value={nextFollowAt}
                onChange={(e) => setNextFollowAt(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium">跟进内容</label>
            <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="例如：已沟通预算，@小李 下周一回访" />
            {mentions.length ? (
              <div className="mt-2 text-xs text-gray-500">识别到 @提醒：{mentions.join(", ")}</div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={createFollowup} disabled={saving}>
              {saving ? "保存中..." : "新增记录"}
            </Button>
          </div>
        </div>
      </Card>

      <Card title="历史跟进记录">
        {loading ? (
          <div className="text-sm text-gray-500">加载中...</div>
        ) : rows.length ? (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">创建：{fmt(r.created_at)}</div>
                    {r.customer_name ? (
                      <div className="text-xs text-gray-500 mt-1">客户：{r.customer_name}</div>
                    ) : null}
                    {r.next_follow_at ? (
                      <div className="text-xs text-gray-500 mt-1">下次跟进：{fmt(r.next_follow_at)}</div>
                    ) : null}
                    <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{r.content}</div>
                    {Array.isArray(r.mentions) && r.mentions.length ? (
                      <div className="mt-2 text-xs text-gray-500">@提醒：{r.mentions.join(", ")}</div>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    <Button variant="danger" onClick={() => setDeleteConfirmId(r.id)}>
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">暂无记录</div>
        )}
      </Card>

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-sm text-gray-600 mb-6">确定要删除这条跟进记录吗？此操作无法撤销。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={deleting}
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors"
                disabled={deleting}
              >
                {deleting ? "删除中..." : "确认"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
