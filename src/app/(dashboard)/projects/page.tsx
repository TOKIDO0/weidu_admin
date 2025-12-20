"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import type { ProjectRow } from "@/lib/types"
import { Button } from "@/components/ui"
import {
  Search,
  X,
  Plus,
  LayoutGrid,
  List as ListIcon,
  MapPin,
  Image as ImageIcon,
  ArrowUp,
  Edit3,
  Trash2,
  DollarSign,
  Save,
  CheckCircle2,
  Upload,
  Trash,
  Calendar,
  Maximize2,
} from "lucide-react"
import { useMobileDrawerStatus } from "@/hooks/useMobileDrawerStatus"

type ProjectDraft = {
  id?: string
  title: string
  category: string
  location: string
  duration: string
  area: string
  cost: string
  description: string
  cover_url: string
  images_text: string
  published: boolean
  pinned: boolean
  sort_order: number
}

const emptyDraft = (): ProjectDraft => ({
  title: "",
  category: "",
  location: "",
  duration: "",
  area: "",
  cost: "",
  description: "",
  cover_url: "",
  images_text: "",
  published: true,
  pinned: false,
  sort_order: 0,
})

function toImages(text: string) {
  const arr = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
  return arr.length ? arr : null
}

// 图片管理组件
function ImageManager({ images, onImagesChange }: { images: string[], onImagesChange: (images: string[]) => void }) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

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
    handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
  }

  const handleFiles = async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"))
    if (!imageFiles.length) return
    if (uploading) return

    setUploading(true)
    try {
      const newUrls: string[] = []

      for (const file of imageFiles) {
        const fileExt = file.name.split(".").pop() || "png"
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `projects/${fileName}`

        let bucketName = "project-images"
        let uploadError: { message: string } | null = null

        const { error: primaryErr } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file)

        if (primaryErr) {
          if (primaryErr.message.includes("not found") || primaryErr.message.includes("Bucket")) {
            bucketName = "images"
            const { error: fallbackErr } = await supabase.storage
              .from(bucketName)
              .upload(filePath, file)
            if (fallbackErr) uploadError = fallbackErr
          } else {
            uploadError = primaryErr
          }
        }

        if (uploadError) {
          alert(
            "上传失败: " +
              uploadError.message +
              "\n\n请确保 Supabase Storage 中存在 \"project-images\" 或 \"images\" 存储桶，并且当前登录账号有上传权限。"
          )
          continue
        }

        const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath)
        if (data?.publicUrl) newUrls.push(data.publicUrl)
      }

      if (newUrls.length) {
        onImagesChange([...images, ...newUrls])
      }
    } finally {
      setUploading(false)
    }
  }

  const addImageUrl = () => {
    const url = prompt('请输入图片 URL:')
    if (url && url.trim()) {
      onImagesChange([...images, url.trim()])
    }
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
  }

  return (
    <div className="space-y-3">
      {/* 图片网格 */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <img 
                src={url} 
                alt={`项目图片 ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-slate-200"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E图片加载失败%3C/text%3E%3C/svg%3E'
                }}
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 上传区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (uploading) return
          fileInputRef.current?.click()
        }}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-50' 
            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
          }
          ${uploading ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p className="text-sm text-slate-600 mb-1">
          {uploading ? '上传中...' : '拖动图片到此处或点击选择'}
        </p>
        <p className="text-xs text-slate-500">
          或 <button type="button" onClick={(e) => { e.stopPropagation(); addImageUrl(); }} className="text-indigo-600 hover:underline">添加图片 URL</button>
        </p>
      </div>
    </div>
  )
}

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'success' | 'warning' | 'default' | 'outline' }) => {
  const styles = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    warning: "bg-amber-50 text-amber-600 border border-amber-100",
    outline: "border border-slate-200 text-slate-500"
  }
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  )
}

export default function ProjectsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [rows, setRows] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>("")
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft())
  const [privateCustomerPhone, setPrivateCustomerPhone] = useState("")
  const [privateMetaLoading, setPrivateMetaLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerAnimation, setDrawerAnimation] = useState<"animate-slide-in" | "animate-slide-out" | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null)

  useMobileDrawerStatus(isDrawerOpen)

  const isEditing = useMemo(() => Boolean(draft.id), [draft.id])
  
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    const query = searchQuery.toLowerCase().trim()
    return rows.filter((r) => {
      const id = r.id?.toLowerCase() || ""
      const location = r.location?.toLowerCase() || ""
      const category = r.category?.toLowerCase() || ""
      const title = r.title?.toLowerCase() || ""
      return id.includes(query) || location.includes(query) || category.includes(query) || title.includes(query)
    })
  }, [rows, searchQuery])

  async function load() {
    setError("")
    setLoading(true)
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("pinned", { ascending: false })
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setRows((data ?? []) as ProjectRow[])
  }

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

  function openDrawer() {
    setDrawerAnimation("animate-slide-in")
    setIsDrawerOpen(true)
  }

  function closeDrawer() {
    if (!isDrawerOpen) return
    setDrawerAnimation("animate-slide-out")
    window.setTimeout(() => {
      clearIdFromUrl()
      setIsDrawerOpen(false)
      setDraft(emptyDraft())
      setPrivateCustomerPhone("")
      setDrawerAnimation(null)
    }, 280)
  }

  async function loadPrivateMeta(projectId: string) {
    setPrivateMetaLoading(true)
    try {
      const { data, error } = await supabase
        .from("project_private_meta")
        .select("customer_phone")
        .eq("project_id", projectId)
        .maybeSingle()
      if (error) {
        setPrivateCustomerPhone("")
        return
      }
      setPrivateCustomerPhone((data?.customer_phone ?? "") as string)
    } finally {
      setPrivateMetaLoading(false)
    }
  }

  useEffect(() => {
    const id = searchParams.get("id")
    if (!id) return
    if (!rows.length) return
    if (isDrawerOpen) return

    const matched = rows.find((r) => r.id === id)
    if (!matched) return
    editRow(matched)
  }, [isDrawerOpen, rows, searchParams])

  function editRow(r: ProjectRow) {
    setDraft({
      id: r.id,
      title: r.title ?? "",
      category: r.category ?? "",
      location: r.location ?? "",
      duration: r.duration ?? "",
      area: r.area ?? "",
      cost: r.cost ?? "",
      description: r.description ?? "",
      cover_url: r.cover_url ?? "",
      images_text: (r.images ?? []).join("\n"),
      published: Boolean(r.published),
      pinned: Boolean(r.pinned),
      sort_order: Number(r.sort_order ?? 0),
    })
    setPrivateCustomerPhone("")
    void loadPrivateMeta(r.id)
    openDrawer()
  }

  function resetDraft() {
    setDraft(emptyDraft())
    setPrivateCustomerPhone("")
  }

  function handleCreate() {
    resetDraft()
    openDrawer()
  }

  async function save(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setSaving(true)
    setError("")
    const payload = {
      title: draft.title.trim(),
      category: draft.category.trim() || null,
      location: draft.location.trim() || null,
      duration: draft.duration.trim() || null,
      area: draft.area.trim() || null,
      cost: draft.cost.trim() || null,
      description: draft.description.trim() || null,
      cover_url: draft.cover_url.trim() || null,
      images: toImages(draft.images_text),
      published: draft.published,
      pinned: draft.pinned,
      sort_order: Number.isFinite(draft.sort_order) ? draft.sort_order : 0,
    }

    if (!payload.title) {
      setSaving(false)
      setError("标题不能为空")
      return
    }

    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id ?? null

    const res = draft.id
      ? await supabase
          .from("projects")
          .update(payload)
          .eq("id", draft.id)
          .select("id")
          .single()
      : await supabase
          .from("projects")
          .insert(payload)
          .select("id")
          .single()

    if (res.error) {
      setSaving(false)
      setError(res.error.message)
      return
    }

    const projectId = (res.data as any)?.id as string | undefined
    const trimmedPhone = privateCustomerPhone.trim()

    if (projectId) {
      if (trimmedPhone) {
        const upsertRes = await supabase
          .from("project_private_meta")
          .upsert(
            {
              project_id: projectId,
              customer_phone: trimmedPhone,
              updated_by: userId,
            },
            { onConflict: "project_id" }
          )
        if (upsertRes.error) {
          setSaving(false)
          setError(upsertRes.error.message)
          return
        }
      } else {
        const delRes = await supabase
          .from("project_private_meta")
          .delete()
          .eq("project_id", projectId)
        if (delRes.error) {
          setSaving(false)
          setError(delRes.error.message)
          return
        }
      }
    }

    setSaving(false)
    closeDrawer()
    await load()
  }

  async function remove(id: string) {
    const { error } = await supabase.from("projects").delete().eq("id", id)
    if (error) {
      alert(error.message)
      return
    }
    setDeleteConfirm(null)
    await load()
  }

  async function togglePublish(r: ProjectRow) {
    const { error } = await supabase
      .from("projects")
      .update({ published: !r.published })
      .eq("id", r.id)
    if (error) {
      alert(error.message)
      return
    }
    await load()
  }

  async function togglePin(r: ProjectRow) {
    const { error } = await supabase
      .from("projects")
      .update({ pinned: !r.pinned })
      .eq("id", r.id)
    if (error) {
      alert(error.message)
      return
    }
    await load()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">项目管理台</h1>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="relative group w-full md:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="搜索项目..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm w-full md:w-64 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
              />
            </div>
            
            <div className="h-6 w-px bg-slate-200 mx-2 md:block hidden"></div>

            <button 
              onClick={handleCreate}
              className="hidden md:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-slate-200 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>新建项目</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-800">全部项目</h2>
            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">{rows.length}</span>
          </div>

          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Project Grid */}
        {loading ? (
          <div className="text-center text-slate-500 py-12">加载中...</div>
        ) : (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {filteredRows.map((project) => {
              const coverImage = project.cover_url || (project.images && project.images.length > 0 ? project.images[0] : null)
              return (
                <div 
                  key={project.id} 
                  className={`group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden ${viewMode === 'list' ? 'flex items-center p-4 gap-6' : ''}`}
                >
                  {/* Image Section */}
                  <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-48 h-32 rounded-xl flex-shrink-0' : 'aspect-[4/3]'}`}>
                    {coverImage ? (
                      <img 
                        src={coverImage} 
                        alt={project.title || "项目图片"} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.src = "https://via.placeholder.com/800x600?text=No+Image"
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {project.published ? (
                        <Badge variant="success">已发布</Badge>
                      ) : (
                        <Badge variant="warning">草稿</Badge>
                      )}
                      {project.pinned && (
                        <span className="bg-indigo-600 text-white p-1 rounded-full shadow-lg">
                          <ArrowUp className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className={`flex-1 ${viewMode === 'grid' ? 'p-5' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs font-semibold text-indigo-600 mb-1 uppercase tracking-wider">{project.category || "未分类"}</p>
                        <h3 className="text-lg font-bold text-slate-800 leading-tight mb-1">{project.title || "未命名项目"}</h3>
                        <div className="flex items-center text-slate-500 text-xs gap-2">
                          <MapPin className="w-3 h-3" />
                          <span>{project.location || "未指定地点"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-3 gap-2 py-4 my-2 border-t border-b border-slate-50">
                      <div className="text-center px-2 border-r border-slate-50">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">工期</p>
                        <p className="text-sm font-medium text-slate-700">{project.duration || "-"}</p>
                      </div>
                      <div className="text-center px-2 border-r border-slate-50">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">面积</p>
                        <p className="text-sm font-medium text-slate-700">{project.area ? `${project.area}m²` : "-"}</p>
                      </div>
                      <div className="text-center px-2">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">造价</p>
                        <p className="text-sm font-medium text-slate-700">{project.cost || "-"}</p>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-slate-400">
                        更新于 {project.updated_at ? new Date(project.updated_at).toLocaleDateString("zh-CN") : "-"}
                      </span>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => editRow(project)}
                          className="p-2 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors" 
                          title="编辑"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm({ id: project.id, title: project.title || "未命名项目" })}
                          className="p-2 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors" 
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Add New Card */}
            <button 
              onClick={handleCreate}
              className={`group flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer ${viewMode === 'list' ? 'h-32' : 'aspect-[4/5]'}`}
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-indigo-100 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center mb-3 transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-500 group-hover:text-indigo-600">新建项目</p>
            </button>
          </div>
        )}
      </main>

      {/* Mobile floating new button */}
      <button
        onClick={handleCreate}
        className="fixed bottom-6 right-4 z-40 flex md:hidden items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-full text-sm font-medium shadow-xl shadow-slate-900/20 active:scale-95"
      >
        <Plus className="w-4 h-4" />
        新建项目
      </button>

      {/* Editor Drawer / Slide-over */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/20 transition-opacity" 
            onClick={closeDrawer}
          />
          
          {/* Drawer Panel - 从右往左滑入动画 */}
          <div 
            id="project-drawer"
            className={`relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col ${drawerAnimation ?? "animate-slide-in"}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {isEditing ? '编辑项目' : '新建项目'}
                </h2>
                <p className="text-sm text-slate-500">填写下方的详细信息以发布到前台</p>
              </div>
              <button 
                onClick={closeDrawer}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-8" style={{ willChange: 'scroll-position', transform: 'translateZ(0)' }}>
              <form id="project-form" onSubmit={save} className="space-y-8">
                
                {/* Section 1: Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                    基本信息
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">项目标题 <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        value={draft.title}
                        onChange={e => setDraft({...draft, title: e.target.value})}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 text-slate-900"
                        placeholder="例如：静谧·私宅设计"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">客户手机号（仅后台）</label>
                        <input
                          type="text"
                          value={privateCustomerPhone}
                          onChange={(e) => setPrivateCustomerPhone(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 text-slate-900"
                          placeholder={privateMetaLoading ? "加载中..." : "例如：13800000000"}
                          disabled={privateMetaLoading}
                        />
                      </div>
                      <div className="flex items-end">
                        {privateCustomerPhone.trim() ? (
                          <Link
                            href={`/customers/${encodeURIComponent(privateCustomerPhone.trim())}`}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-center"
                          >
                            查看客户时间线
                          </Link>
                        ) : (
                          <div className="w-full px-4 py-2 rounded-lg border border-slate-100 bg-slate-50 text-slate-400 text-center text-sm">
                            填写手机号后可查看
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">分类</label>
                        <select 
                          value={draft.category}
                          onChange={e => setDraft({...draft, category: e.target.value})}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none text-slate-900"
                        >
                          <option value="">请选择分类</option>
                          <option value="住宅设计">住宅设计</option>
                          <option value="商业办公">商业办公</option>
                          <option value="展厅设计">展厅设计</option>
                          <option value="景观规划">景观规划</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">地点</label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            value={draft.location}
                            onChange={e => setDraft({...draft, location: e.target.value})}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900 placeholder:text-slate-300"
                            placeholder="上海 / 北京..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Specs */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                    项目规格
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">工期</label>
                      <div className="relative">
                        <Calendar className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={draft.duration}
                          onChange={e => setDraft({...draft, duration: e.target.value})}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border-none rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900 placeholder:text-slate-300"
                          placeholder="8 个月"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">面积 (m²)</label>
                      <div className="relative">
                        <Maximize2 className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={draft.area}
                          onChange={e => setDraft({...draft, area: e.target.value})}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border-none rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900 placeholder:text-slate-300"
                          placeholder="240"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">造价 (RMB)</label>
                      <div className="relative">
                        <DollarSign className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={draft.cost}
                          onChange={e => setDraft({...draft, cost: e.target.value})}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border-none rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900 placeholder:text-slate-300"
                          placeholder="850,000"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Media */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                    媒体资源
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">封面图 URL</label>
                    <div className="flex gap-4 items-start">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={draft.cover_url}
                          onChange={e => setDraft({...draft, cover_url: e.target.value})}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-mono text-slate-600 placeholder:text-slate-300"
                          placeholder="https://..."
                        />
                        <p className="text-xs text-slate-400 mt-1">推荐尺寸: 1600x1200, 支持 JPG/PNG</p>
                      </div>
                      <div className="w-24 h-16 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {draft.cover_url ? (
                          <img src={draft.cover_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">项目图片</label>
                    <ImageManager 
                      images={toImages(draft.images_text) || []}
                      onImagesChange={(images) => {
                        setDraft({...draft, images_text: images.join('\n')})
                      }}
                    />
                  </div>

                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">项目描述</label>
                    <textarea 
                      rows={4}
                      value={draft.description}
                      onChange={e => setDraft({...draft, description: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-slate-900 placeholder:text-slate-300"
                      placeholder="输入项目的设计理念、背景故事等..."
                    ></textarea>
                  </div>
                </div>

                {/* Section 4: Settings */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                   <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                    发布设置
                  </h3>
                  
                  <div className="flex items-center gap-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                     <label className="flex items-center gap-3 cursor-pointer">
                      <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${draft.published ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${draft.published ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={draft.published || false}
                        onChange={e => setDraft({...draft, published: e.target.checked})}
                      />
                      <span className="text-sm font-medium text-slate-700">立即发布</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${draft.pinned ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                        {draft.pinned && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={draft.pinned || false}
                        onChange={e => setDraft({...draft, pinned: e.target.checked})}
                      />
                      <span className="text-sm font-medium text-slate-700">置顶项目</span>
                    </label>

                    <div className="flex-1 flex items-center justify-end gap-2">
                        <span className="text-sm text-slate-500">排序权重:</span>
                        <input 
                          type="number" 
                          value={draft.sort_order}
                          onChange={e => setDraft({...draft, sort_order: parseInt(e.target.value) || 0})}
                          className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-center text-sm text-slate-900"
                        />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button 
                type="button"
                onClick={closeDrawer}
                className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button 
                type="submit"
                form="project-form"
                onClick={save}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "保存中..." : "保存项目"}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-sm text-gray-600 mb-6">
              确定要删除项目 <span className="font-medium">{deleteConfirm.title}</span> 吗？此操作无法撤销。
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
