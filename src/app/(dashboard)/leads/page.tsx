"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import type { LeadRow } from "@/lib/types"
import { Button, Card, Input, Textarea } from "@/components/ui"
import { useMobileDrawerStatus } from "@/hooks/useMobileDrawerStatus"

function fmt(dt: string | null) {
  if (!dt) return "-"
  const d = new Date(dt)
  if (Number.isNaN(d.getTime())) return dt
  return d.toLocaleString()
}

export default function LeadsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [rows, setRows] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [editing, setEditing] = useState<LeadRow | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false)
  const isDrawerClosingRef = useRef(false)
  useMobileDrawerStatus(drawerOpen)

  async function load() {
    setError("")
    setLoading(true)
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setRows((data ?? []) as LeadRow[])
  }

  useEffect(() => {
    const id = searchParams.get("id")
    if (!id) return
    if (!rows.length) return
    if (drawerOpen) return
    if (isDrawerClosingRef.current) return

    const matched = rows.find((r) => r.id === id)
    if (!matched) return
    setEditing(matched)
    setDrawerOpen(true)
  }, [drawerOpen, rows, searchParams])

  useEffect(() => {
    load()
  }, [])

  function clearIdFromUrl() {
    if (!searchParams.get("id")) return
    const nextParams = new URLSearchParams()
    searchParams.forEach((value, key) => {
      if (key === "id") return
      nextParams.set(key, value)
    })
    const qs = nextParams.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function closeDrawer() {
    isDrawerClosingRef.current = true
    clearIdFromUrl()
    setDrawerOpen(false)
    setEditing(null)
  }

  useEffect(() => {
    if (!isDrawerClosingRef.current) return
    if (!searchParams.get("id")) {
      isDrawerClosingRef.current = false
    }
  }, [searchParams])

  async function remove(id: string) {
    const { error } = await supabase.from("leads").delete().eq("id", id)
    if (error) {
      alert(error.message)
      return
    }
    setDeleteConfirm(null)
    setSelectedIds(new Set())
    await load()
  }

  async function batchRemove() {
    if (selectedIds.size === 0) return
    
    const ids = Array.from(selectedIds)
    const { error } = await supabase.from("leads").delete().in("id", ids)
    if (error) {
      alert(error.message)
      return
    }
    setBatchDeleteConfirm(false)
    setSelectedIds(new Set())
    await load()
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  function toggleSelectAll() {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(rows.map(r => r.id)))
    }
  }

  async function quickStatus(id: string, status: LeadRow["status"]) {
    const { error } = await supabase.from("leads").update({ status }).eq("id", id)
    if (error) {
      alert(error.message)
      return
    }
    await load()
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    const { error } = await supabase
      .from("leads")
      .update({
        status: editing.status,
        note: editing.note,
      })
      .eq("id", editing.id)
    setSaving(false)
    if (error) {
      alert(error.message)
      return
    }
    closeDrawer()
    await load()
  }

  return (
    <>
      <div className="relative">
        <Card
          title="客户需求列表"
          right={
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button 
                  variant="danger" 
                  onClick={() => setBatchDeleteConfirm(true)}
                >
                  批量删除 ({selectedIds.size})
                </Button>
              )}
              <Button variant="ghost" onClick={load} disabled={loading}>
                刷新
              </Button>
            </div>
          }
        >
          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="text-sm text-gray-500">加载中...</div>
          ) : rows.length ? (
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {/* 全选按钮 */}
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <input
                  type="checkbox"
                  checked={selectedIds.size === rows.length && rows.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-600">
                  全选 ({selectedIds.size}/{rows.length})
                </span>
              </div>
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <div className="font-semibold text-gray-900 truncate">{r.name}</div>
                          <Link
                            href={`/customers/${encodeURIComponent(r.phone)}`}
                            className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2"
                          >
                            {r.phone}
                          </Link>
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] text-gray-600 font-medium">
                            {r.contact_type === "appointment" ? "预约时间" : "立即联系"}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              r.status === "new"
                                ? "bg-red-100 text-red-700 border border-red-300"
                                : r.status === "contacted"
                                ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                : "bg-green-100 text-green-700 border border-green-300"
                            }`}
                          >
                            {r.status === "new" ? "待处理" : r.status === "contacted" ? "已联系" : "已完成"}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {r.message}
                        </div>
                        <div className="grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
                          <div>创建：{fmt(r.created_at)}</div>
                          {r.appointment_time && <div>预约：{fmt(r.appointment_time)}</div>}
                        </div>
                        {r.note && (
                          <div className="mt-2 p-2 rounded-xl bg-blue-50 border border-blue-100">
                            <div className="text-xs font-medium text-blue-700 mb-1">备注（内部）</div>
                            <div className="text-xs text-blue-600 whitespace-pre-wrap">{r.note}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 flex-1 sm:flex-none">
                        <Button
                          variant="ghost"
                          className="justify-center"
                          onClick={() => {
                            setEditing(r)
                            setDrawerOpen(true)
                          }}
                        >
                          处理
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-center"
                          onClick={() => quickStatus(r.id, "contacted")}
                        >
                          已联系
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-center"
                          onClick={() => quickStatus(r.id, "done")}
                        >
                          已完成
                        </Button>
                        <Button
                          variant="danger"
                          className="justify-center"
                          onClick={() => setDeleteConfirm({ id: r.id, name: r.name })}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">暂无客户需求</div>
          )}
        </Card>

        <div
          className={[
            "fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity",
            drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          ].join(" ")}
          onClick={closeDrawer}
        />

        <aside
          className={[
            "fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white border-l border-gray-200 shadow-2xl transition-transform duration-300 ease-out",
            drawerOpen ? "translate-x-0" : "translate-x-full",
          ].join(" ")}
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
              <div className="min-w-0">
                <div className="text-base font-semibold text-gray-900">{editing ? "处理客户需求" : "处理区"}</div>
                <div className="text-xs text-gray-500 mt-1">{editing ? "修改状态/备注后保存" : "在左侧选择一条需求点击“处理”。"}</div>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="shine-hover shine-hover-dark rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
              >
                关闭
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {!editing ? (
                <div className="text-sm text-gray-500">在左侧选择一条需求点击"处理"。</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">客户</label>
                      <Input value={editing.name} readOnly />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">电话</label>
                      <Input value={editing.phone} readOnly />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">联系方式</label>
                      <Input
                        value={editing.contact_type === "appointment" ? "预约时间" : "立即联系"}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">预约时间</label>
                      <Input value={fmt(editing.appointment_time)} readOnly />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-2">需求</label>
                    <Textarea rows={6} value={editing.message} readOnly />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-2 font-medium">状态</label>
                      <select
                        value={editing.status}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            status: e.target.value as LeadRow["status"],
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                      >
                        <option value="new">待处理</option>
                        <option value="contacted">已联系</option>
                        <option value="done">已完成</option>
                      </select>
                    </div>
                    <div />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-2">备注（内部）</label>
                    <Textarea
                      rows={5}
                      value={editing.note ?? ""}
                      onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                      placeholder="例如：已加微信，约周三上午回访"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Button onClick={saveEdit} disabled={saving}>
                      {saving ? "保存中..." : "保存"}
                    </Button>
                    <Button variant="ghost" onClick={closeDrawer}>
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* 删除确认模态框 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-sm text-gray-600 mb-6">
              确定要删除客户 <span className="font-medium">{deleteConfirm.name}</span> 的需求吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors relative overflow-hidden group"
              >
                <span className="relative z-10">取消</span>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
              </button>
              <button
                onClick={() => remove(deleteConfirm.id)}
                className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors relative overflow-hidden group"
              >
                <span className="relative z-10">确认</span>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量删除确认模态框 */}
      {batchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认批量删除</h3>
            <p className="text-sm text-gray-600 mb-6">
              确定要删除选中的 <span className="font-medium">{selectedIds.size}</span> 条客户需求吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setBatchDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors relative overflow-hidden group"
              >
                <span className="relative z-10">取消</span>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
              </button>
              <button
                onClick={batchRemove}
                className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors relative overflow-hidden group"
              >
                <span className="relative z-10">确认</span>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
