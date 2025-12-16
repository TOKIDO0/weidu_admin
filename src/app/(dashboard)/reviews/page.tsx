"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { ReviewRow } from "@/lib/types"
import { Button, Card, Textarea, Input } from "@/components/ui"
import { Upload, X } from "lucide-react"

function clip(text: string, n = 80) {
  const t = (text ?? "").trim()
  if (t.length <= n) return t
  return t.slice(0, n) + "…"
}

export default function ReviewsPage() {
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [editing, setEditing] = useState<ReviewRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

  async function load() {
    setError("")
    setLoading(true)
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setRows((data ?? []) as ReviewRow[])
  }

  useEffect(() => {
    load()
  }, [])

  async function toggle(id: string, patch: Partial<ReviewRow>) {
    const { error } = await supabase.from("reviews").update(patch).eq("id", id)
    if (error) {
      alert(error.message)
      return
    }
    await load()
  }

  async function remove(id: string) {
    const { error } = await supabase.from("reviews").delete().eq("id", id)
    if (error) {
      alert(error.message)
      return
    }
    setDeleteConfirm(null)
    await load()
  }

  async function uploadAvatar(file: File) {
    if (!editing) return
    
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // 先尝试使用avatars bucket，如果不存在则使用images bucket
      let bucketName = 'avatars'
      let uploadError = null
      
      const { error: avatarsError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (avatarsError) {
        // 如果avatars bucket不存在，尝试使用images bucket
        if (avatarsError.message.includes('not found') || avatarsError.message.includes('Bucket')) {
          bucketName = 'images'
          const imagesPath = `avatars/${fileName}`
          const { error: imagesError } = await supabase.storage
            .from('images')
            .upload(imagesPath, file)
          
          if (imagesError) {
            uploadError = imagesError
          }
        } else {
          uploadError = avatarsError
        }
      }

      if (uploadError) {
        alert('上传失败: ' + uploadError.message + '\n\n请确保在Supabase Storage中创建了"avatars"或"images"存储桶。')
        setUploading(false)
        return
      }

      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      setEditing({ ...editing, avatar_url: data.publicUrl })
      setUploading(false)
    } catch (err: any) {
      alert('上传失败: ' + (err.message || '请重试'))
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(file => file.type.startsWith('image/'))
    if (imageFile) {
      uploadAvatar(imageFile)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadAvatar(e.target.files[0])
    }
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    const { error } = await supabase
      .from("reviews")
      .update({
        name: editing.name,
        project_name: editing.project_name,
        rating: editing.rating,
        content: editing.content,
        avatar_url: editing.avatar_url,
        approved: editing.approved,
        pinned: editing.pinned,
      })
      .eq("id", editing.id)
    setSaving(false)
    if (error) {
      alert(error.message)
      return
    }
    setEditing(null)
    await load()
  }

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))' }}>
      <Card
        title="评价列表"
        right={
          <div className="flex items-center gap-2">
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
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {r.name || "匿名"}
                      </div>
                      <span className="text-xs text-gray-500">
                        {r.project_name || "-"}
                      </span>
                      {r.approved ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] text-green-700 font-medium">
                          已通过
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] text-gray-600 font-medium">
                          待审核
                        </span>
                      )}
                      {r.pinned ? (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] text-orange-700 font-medium">
                          置顶
                        </span>
                      ) : null}
                      <span className="text-xs text-gray-500">
                        {r.rating ? `⭐ ${r.rating}` : "未评分"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      {clip(r.content, 120)}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button variant="ghost" onClick={() => setEditing(r)}>
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => toggle(r.id, { approved: !r.approved })}
                    >
                      {r.approved ? "撤销通过" : "通过"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => toggle(r.id, { pinned: !r.pinned })}
                    >
                      {r.pinned ? "取消置顶" : "置顶"}
                    </Button>
                    <Button variant="danger" onClick={() => setDeleteConfirm({ id: r.id, name: r.name || "匿名" })}>
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">暂无评价</div>
        )}
      </Card>

      <Card
        title={editing ? "编辑评价" : "编辑区"}
        right={
          editing ? (
            <Button variant="ghost" onClick={() => setEditing(null)}>
              取消
            </Button>
          ) : null
        }
      >
        {!editing ? (
          <div className="text-sm text-gray-500">
            在左侧选择一条评价点击"编辑"。
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-600 mb-2 font-medium">
                  昵称
                </label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-2 font-medium">
                  项目名
                </label>
                <Input
                  value={editing.project_name ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, project_name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-600 mb-2 font-medium">
                  评分（1-5）
                </label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={editing.rating ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      rating: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-2 font-medium">
                  头像 URL（可选）
                </label>
                <div className="space-y-2">
                  <Input
                    value={editing.avatar_url ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, avatar_url: e.target.value })
                    }
                    placeholder="输入头像URL或使用下方上传"
                  />
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                      ${isDragging 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
                      }
                      ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={uploading}
                    />
                    <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                    <p className="text-xs text-gray-600 mb-1">
                      {uploading ? '上传中...' : '拖动图片到此处或点击选择上传'}
                    </p>
                    <p className="text-xs text-gray-400">
                      支持 JPG、PNG、GIF 格式
                    </p>
                  </div>
                  {editing.avatar_url && (
                    <div className="relative inline-block">
                      <img 
                        src={editing.avatar_url} 
                        alt="头像预览" 
                        className="w-16 h-16 rounded-full object-cover border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditing({ ...editing, avatar_url: "" })
                        }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-2">
                内容
              </label>
              <Textarea
                rows={8}
                value={editing.content}
                onChange={(e) =>
                  setEditing({ ...editing, content: e.target.value })
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editing.approved}
                  onChange={(e) =>
                    setEditing({ ...editing, approved: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 bg-white text-purple-600 focus:ring-purple-500"
                />
                审核通过
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editing.pinned}
                  onChange={(e) =>
                    setEditing({ ...editing, pinned: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 bg-white text-purple-600 focus:ring-purple-500"
                />
                置顶
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={saveEdit} disabled={saving}>
                {saving ? "保存中..." : "保存"}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                关闭
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 删除确认模态框 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-sm text-gray-600 mb-6">
              确定要删除客户 <span className="font-medium">{deleteConfirm.name}</span> 的评价吗？此操作无法撤销。
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
    </div>
  )
}
