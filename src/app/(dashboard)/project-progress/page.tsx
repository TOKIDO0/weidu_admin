"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import type { ProjectRow } from "@/lib/types"
import { Button, Card, Input, Textarea } from "@/components/ui"
import { Upload, X, Image as ImageIcon, Video, Calendar } from "lucide-react"

type ProjectProgress = {
  id: string
  project_id: string
  customer_phone: string
  stage: "design" | "construction" | "finishing" | "completed"
  title: string
  description: string | null
  images: string[] | null
  videos: string[] | null
  progress_date: string
  created_at: string
  updated_at: string
}

const STAGE_OPTIONS = [
  { value: "design", label: "设计阶段" },
  { value: "construction", label: "施工阶段" },
  { value: "finishing", label: "收尾阶段" },
  { value: "completed", label: "已完成" },
]

export default function ProjectProgressPage() {
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [progresses, setProgresses] = useState<ProjectProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [editing, setEditing] = useState<Partial<ProjectProgress> | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [filterPhone, setFilterPhone] = useState("")
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const id = searchParams.get("id")
    if (!id) return
    if (!progresses.length) return
    if (drawerOpen) return

    const matched = progresses.find((p) => p.id === id)
    if (!matched) return
    setEditing(matched)
    setSelectedProjectId(matched.project_id)
    setDrawerOpen(true)
  }, [drawerOpen, progresses, searchParams])

  function openCreateDrawer() {
    setSelectedProjectId("")
    setEditing({
      stage: "design",
      progress_date: new Date().toISOString().split('T')[0],
    })
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditing(null)
    setSelectedProjectId("")
  }

  async function loadData() {
    setLoading(true)
    try {
      // 加载所有项目
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })

      // 加载所有进度记录
      const { data: progressData } = await supabase
        .from("project_progress")
        .select("*")
        .order("progress_date", { ascending: false })

      setProjects((projectsData ?? []) as ProjectRow[])
      setProgresses((progressData ?? []) as ProjectProgress[])
    } catch (error) {
      console.error("加载失败:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, isVideo = false) {
    if (!e.target.files || e.target.files.length === 0 || !editing) return
    
    setUploading(true)
    try {
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `project-progress/${isVideo ? 'videos' : 'images'}/${fileName}`

      // 使用 project-media bucket
      const bucketName = 'project-media'

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      if (isVideo) {
        const currentVideos = editing.videos || []
        setEditing({
          ...editing,
          videos: [...currentVideos, data.publicUrl],
        })
      } else {
        const currentImages = editing.images || []
        setEditing({
          ...editing,
          images: [...currentImages, data.publicUrl],
        })
      }
    } catch (err: any) {
      alert(`上传失败: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  function removeMedia(index: number, isVideo = false) {
    if (!editing) return
    if (isVideo) {
      const newVideos = [...(editing.videos || [])]
      newVideos.splice(index, 1)
      setEditing({ ...editing, videos: newVideos })
    } else {
      const newImages = [...(editing.images || [])]
      newImages.splice(index, 1)
      setEditing({ ...editing, images: newImages })
    }
  }

  async function saveProgress() {
    if (!editing || !selectedProjectId) {
      alert("请选择项目")
      return
    }

    setSaving(true)
    try {
      const payload = {
        project_id: selectedProjectId,
        customer_phone: editing.customer_phone || "",
        stage: editing.stage || "design",
        title: editing.title || "",
        description: editing.description || null,
        images: editing.images || null,
        videos: editing.videos || null,
        progress_date: editing.progress_date || new Date().toISOString().split('T')[0],
      }

      if (!payload.title || !payload.customer_phone) {
        alert("请填写标题和客户手机号")
        setSaving(false)
        return
      }

      if (editing.id) {
        const { error } = await supabase
          .from("project_progress")
          .update(payload)
          .eq("id", editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("project_progress")
          .insert(payload)
        if (error) throw error
      }

      closeDrawer()
      await loadData()
    } catch (err: any) {
      alert(`保存失败: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  function requestDeleteProgress(id: string) {
    setPendingDeleteId(id)
  }

  async function confirmDeleteProgress() {
    if (!pendingDeleteId || deleting) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from("project_progress")
        .delete()
        .eq("id", pendingDeleteId)
      if (error) {
        alert(error.message)
        return
      }
      setPendingDeleteId(null)
      await loadData()
    } finally {
      setDeleting(false)
    }
  }

  const filteredProgresses = filterPhone
    ? progresses.filter(p => p.customer_phone.includes(filterPhone))
    : progresses

  // 按项目分组，每个项目的最新更新显示在顶部
  const groupedProgresses = filteredProgresses.reduce((acc, progress) => {
    const projectId = progress.project_id
    if (!acc[projectId]) {
      acc[projectId] = []
    }
    acc[projectId].push(progress)
    return acc
  }, {} as Record<string, ProjectProgress[]>)

  // 对每个项目的进度按日期排序（最新的在前）
  Object.keys(groupedProgresses).forEach(projectId => {
    groupedProgresses[projectId].sort((a, b) => 
      new Date(b.progress_date).getTime() - new Date(a.progress_date).getTime()
    )
  })

  function toggleProjectExpansion(projectId: string) {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">项目进度追踪</h1>
        <p className="text-sm text-gray-600 mt-1">
          管理项目进度，更新施工状态和照片
        </p>
      </div>

      <div className="relative">
        <Card
          title="进度记录"
          right={
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="按手机号筛选"
                value={filterPhone}
                onChange={(e) => setFilterPhone(e.target.value)}
                className="w-40"
              />
              <Button variant="ghost" onClick={loadData} disabled={loading}>
                刷新
              </Button>
              <button
                type="button"
                onClick={openCreateDrawer}
                className="shine-hover rounded-full bg-black text-white px-4 py-2 text-xs font-semibold border border-black hover:bg-gray-900 transition-colors"
              >
                添加进度
              </button>
            </div>
          }
        >
          {loading ? (
            <div className="text-sm text-gray-500">加载中...</div>
          ) : Object.keys(groupedProgresses).length > 0 ? (
            <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {Object.entries(groupedProgresses).map(([projectId, projectProgresses]) => {
                const project = projects.find(p => p.id === projectId)
                const latestProgress = projectProgresses[0]
                const olderProgresses = projectProgresses.slice(1)
                const isExpanded = expandedProjects.has(projectId)
                const hasOlder = olderProgresses.length > 0

                return (
                  <div key={projectId} className="space-y-2">
                    {/* 最新更新 - 始终显示 */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-medium text-purple-600">
                              {project?.title || "未知项目"}
                            </span>
                            <Link
                              href={`/customers/${encodeURIComponent(latestProgress.customer_phone)}`}
                              className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2"
                            >
                              {latestProgress.customer_phone}
                            </Link>
                            <span className="text-xs text-gray-400">最新更新</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-sm font-semibold text-gray-900">
                              {latestProgress.title}
                            </div>
                            <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[11px] font-semibold">
                              {STAGE_OPTIONS.find(s => s.value === latestProgress.stage)?.label || latestProgress.stage}
                            </span>
                          </div>
                          {latestProgress.description && (
                            <div className="mt-2 text-xs text-gray-600 line-clamp-2">
                              {latestProgress.description}
                            </div>
                          )}
                          <div className="mt-2 text-xs text-gray-500">
                            {new Date(latestProgress.progress_date).toLocaleDateString("zh-CN")}
                          </div>
                          {(latestProgress.images && latestProgress.images.length > 0) || (latestProgress.videos && latestProgress.videos.length > 0) ? (
                            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                              {latestProgress.images && latestProgress.images.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" />
                                  {latestProgress.images.length}
                                </span>
                              )}
                              {latestProgress.videos && latestProgress.videos.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Video className="w-3 h-3" />
                                  {latestProgress.videos.length}
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button variant="ghost" onClick={() => {
                            setEditing(latestProgress)
                            setSelectedProjectId(latestProgress.project_id)
                            setDrawerOpen(true)
                          }}>
                            编辑
                          </Button>
                          <Button variant="danger" onClick={() => requestDeleteProgress(latestProgress.id)}>
                            删除
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* 之前的更新 - 可展开/收起 */}
                    {hasOlder && (
                      <div>
                        <button
                          onClick={() => toggleProjectExpansion(projectId)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between"
                        >
                          <span>
                            {isExpanded ? '收起' : `展开历史更新 (${olderProgresses.length}条)`}
                          </span>
                          <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                            {olderProgresses.map((progress) => (
                              <div
                                key={progress.id}
                                className="rounded-lg border border-gray-200 bg-white p-3 space-y-2"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="text-sm font-semibold text-gray-900">
                                        {progress.title}
                                      </div>
                                      <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[11px] font-semibold">
                                        {STAGE_OPTIONS.find(s => s.value === progress.stage)?.label || progress.stage}
                                      </span>
                                    </div>
                                    {progress.description && (
                                      <div className="mt-2 text-xs text-gray-600 line-clamp-2">
                                        {progress.description}
                                      </div>
                                    )}
                                    <div className="mt-2 text-xs text-gray-500">
                                      {new Date(progress.progress_date).toLocaleDateString("zh-CN")}
                                    </div>
                                    {(progress.images && progress.images.length > 0) || (progress.videos && progress.videos.length > 0) ? (
                                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                        {progress.images && progress.images.length > 0 && (
                                          <span className="flex items-center gap-1">
                                            <ImageIcon className="w-3 h-3" />
                                            {progress.images.length}
                                          </span>
                                        )}
                                        {progress.videos && progress.videos.length > 0 && (
                                          <span className="flex items-center gap-1">
                                            <Video className="w-3 h-3" />
                                            {progress.videos.length}
                                          </span>
                                        )}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="flex gap-2 shrink-0">
                                    <Button variant="ghost"  onClick={() => {
                                      setEditing(progress)
                                      setSelectedProjectId(progress.project_id)
                                      setDrawerOpen(true)
                                    }}>
                                      编辑
                                    </Button>
                                    <Button variant="danger"  onClick={() => requestDeleteProgress(progress.id)}>
                                      删除
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-500">暂无进度记录</div>
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
                <div className="text-base font-semibold text-gray-900">
                  {editing?.id ? "编辑进度" : "新建进度"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  填写信息后点击创建/更新即可
                </div>
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
            <div>
              <label className="block text-xs text-gray-600 mb-2 font-medium">
                选择项目
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  const projectId = e.target.value
                  setSelectedProjectId(projectId)
                  
                  // 如果选择了项目，查找该项目最近一次更新的手机号
                  if (projectId) {
                    const latestProgress = progresses
                      .filter(p => p.project_id === projectId)
                      .sort((a, b) => new Date(b.progress_date).getTime() - new Date(a.progress_date).getTime())[0]
                    
                    if (latestProgress && latestProgress.customer_phone) {
                      setEditing({ 
                        ...(editing ?? {}),
                        project_id: projectId,
                        customer_phone: latestProgress.customer_phone 
                      })
                    } else {
                      setEditing({ ...(editing ?? {}), project_id: projectId })
                    }
                  } else {
                    setEditing({ ...(editing ?? {}), project_id: projectId })
                  }
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="">请选择项目</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-2 font-medium">
                客户手机号（必填）
              </label>
              <Input
                value={editing?.customer_phone || ""}
                onChange={(e) => setEditing({ ...(editing ?? {}), customer_phone: e.target.value })}
                placeholder="请输入客户手机号"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-600 mb-2 font-medium">
                  施工阶段
                </label>
                <select
                  value={editing?.stage || "design"}
                  onChange={(e) => setEditing({ ...(editing ?? {}), stage: e.target.value as any })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                >
                  {STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-2 font-medium">
                  进度日期
                </label>
                <Input
                  type="date"
                  value={editing?.progress_date || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setEditing({ ...(editing ?? {}), progress_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-2 font-medium">
                标题（必填）
              </label>
              <Input
                value={editing?.title || ""}
                onChange={(e) => setEditing({ ...(editing ?? {}), title: e.target.value })}
                placeholder="例如：水电施工完成"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-2">
                最新情况
              </label>
              <Textarea
                rows={4}
                value={editing?.description || ""}
                onChange={(e) => setEditing({ ...(editing ?? {}), description: e.target.value })}
                placeholder="描述项目的最新进展..."
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-2 font-medium">
                上传图片
              </label>
              <div className="space-y-2">
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {uploading ? "上传中..." : "点击上传图片"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, false)}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                {editing?.images && editing.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {editing.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`图片 ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeMedia(idx, false)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-2 font-medium">
                上传视频
              </label>
              <div className="space-y-2">
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {uploading ? "上传中..." : "点击上传视频"}
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                {editing?.videos && editing.videos.length > 0 && (
                  <div className="space-y-2">
                    {editing.videos.map((video, idx) => (
                      <div key={idx} className="relative group">
                        <video
                          src={video}
                          controls
                          className="w-full rounded-lg"
                        />
                        <button
                          onClick={() => removeMedia(idx, true)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={saveProgress} disabled={saving || !editing}>
                {saving ? "保存中..." : editing?.id ? "更新" : "创建"}
              </Button>
              <Button variant="ghost" onClick={closeDrawer}>
                取消
              </Button>
            </div>

            </div>
          </div>
        </aside>

        {pendingDeleteId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setPendingDeleteId(null)}
            />
            <div className="relative w-[92vw] max-w-md rounded-2xl bg-white border border-black/10 shadow-2xl">
              <div className="px-6 py-5 border-b border-gray-200">
                <div className="text-base font-semibold text-gray-900">确认删除</div>
                <div className="text-xs text-gray-600 mt-2">
                  删除后无法恢复，确定要删除这条进度记录吗？
                </div>
              </div>
              <div className="px-6 py-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(null)}
                  className="shine-hover shine-hover-dark rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
                  disabled={deleting}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteProgress}
                  className="shine-hover rounded-lg border border-black bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={deleting}
                >
                  {deleting ? "删除中..." : "确认"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

