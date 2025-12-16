"use client"

import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { ScheduleRow, LeadRow } from "@/lib/types"
import { Button, Card, Input, Textarea } from "@/components/ui"
import { ChevronLeft, ChevronRight, Plus, X, Upload, Image as ImageIcon } from "lucide-react"

type CalendarDay = {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  hasAppointment: boolean
  hasSchedule: boolean
  appointments: LeadRow[]
  schedules: ScheduleRow[]
}

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string>("")

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay())
    
    const days: CalendarDay[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      
      const dateStr = date.toISOString().split('T')[0]
      const dayAppointments = leads.filter(l => {
        if (!l.appointment_time) return false
        const aptDate = new Date(l.appointment_time)
        return aptDate.toISOString().split('T')[0] === dateStr
      })
      const daySchedules = schedules.filter(s => {
        const schedDate = new Date(s.scheduled_date)
        return schedDate.toISOString().split('T')[0] === dateStr
      })

      days.push({
        date: new Date(date),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        hasAppointment: dayAppointments.length > 0,
        hasSchedule: daySchedules.length > 0,
        appointments: dayAppointments,
        schedules: daySchedules,
      })
    }
    return days
  }, [currentDate, leads, schedules])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError("")
    
    try {
      // 加载客户预约
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .eq("contact_type", "appointment")
        .not("appointment_time", "is", null)
        .order("appointment_time", { ascending: true })

      if (leadsError) throw leadsError

      // 加载日程
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("schedules")
        .select("*")
        .order("scheduled_date", { ascending: true })

      if (schedulesError) {
        // 如果表不存在，创建它
        if (schedulesError.code === "PGRST116") {
          console.log("schedules 表不存在，需要创建")
        } else {
          throw schedulesError
        }
      }

      setLeads((leadsData ?? []) as LeadRow[])
      setSchedules((schedulesData ?? []) as ScheduleRow[])
    } catch (err: any) {
      setError(err.message || "加载失败")
      console.error("加载数据失败:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDateClick(day: CalendarDay) {
    setSelectedDate(day.date)
    // 如果有日程，编辑第一个；否则创建新的
    if (day.schedules.length > 0) {
      setEditingSchedule(day.schedules[0])
    } else {
      // 使用本地日期格式化，避免时区问题
      const year = day.date.getFullYear()
      const month = String(day.date.getMonth() + 1).padStart(2, '0')
      const date = String(day.date.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${date}`
      setEditingSchedule({
        id: "",
        title: "",
        scheduled_date: dateStr,
        scheduled_time: null,
        description: null,
        images: null,
        enable_notification: false,
        notification_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as ScheduleRow)
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0 || !editingSchedule) return
    
    setUploading(true)
    try {
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `schedules/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      const currentImages = editingSchedule.images || []
      setEditingSchedule({
        ...editingSchedule,
        images: [...currentImages, data.publicUrl],
      })
    } catch (err: any) {
      alert(`上传失败: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  function removeImage(index: number) {
    if (!editingSchedule) return
    const newImages = [...(editingSchedule.images || [])]
    newImages.splice(index, 1)
    setEditingSchedule({ ...editingSchedule, images: newImages })
  }

  async function saveSchedule() {
    if (!editingSchedule) return
    
    setSaving(true)
    setError("")
    
    try {
      const payload = {
        title: editingSchedule.title.trim(),
        scheduled_date: editingSchedule.scheduled_date,
        scheduled_time: editingSchedule.scheduled_time?.trim() || null,
        description: editingSchedule.description?.trim() || null,
        images: editingSchedule.images || null,
        enable_notification: editingSchedule.enable_notification,
        notification_sent: false,
      }

      if (!payload.title) {
        setError("标题不能为空")
        setSaving(false)
        return
      }

      if (editingSchedule.id) {
        const { error } = await supabase
          .from("schedules")
          .update(payload)
          .eq("id", editingSchedule.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("schedules")
          .insert(payload)
        if (error) throw error
      }

      setEditingSchedule(null)
      setSelectedDate(null)
      await loadData()
    } catch (err: any) {
      setError(err.message || "保存失败")
    } finally {
      setSaving(false)
    }
  }

  async function deleteSchedule(id: string) {
    if (!confirm("确定要删除这个日程吗？")) return
    const { error } = await supabase.from("schedules").delete().eq("id", id)
    if (error) {
      alert(error.message)
      return
    }
    await loadData()
    setEditingSchedule(null)
    setSelectedDate(null)
  }

  function formatTime(timeStr: string | null) {
    if (!timeStr) return ""
    return timeStr
  }

  const monthNames = [
    "一月", "二月", "三月", "四月", "五月", "六月",
    "七月", "八月", "九月", "十月", "十一月", "十二月"
  ]

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">日程管理</h1>
        <p className="text-sm text-gray-600 mt-1">
          管理和查看日程安排，客户预约会自动标记。
        </p>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {/* 日历 */}
        <Card title={`${currentDate.getFullYear()}年 ${monthNames[currentDate.getMonth()]}`}>
          <div className="space-y-4">
            {/* 月份导航 */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  const newDate = new Date(currentDate)
                  newDate.setMonth(newDate.getMonth() - 1)
                  setCurrentDate(newDate)
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCurrentDate(new Date())}
                className="text-sm"
              >
                今天
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const newDate = new Date(currentDate)
                  newDate.setMonth(newDate.getMonth() + 1)
                  setCurrentDate(newDate)
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-gray-500 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 日期网格 */}
            {loading ? (
              <div className="text-sm text-gray-500 text-center py-8">
                加载中...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const isSelected = selectedDate && 
                    day.date.getTime() === selectedDate.getTime() &&
                    day.date.getDate() === selectedDate.getDate() &&
                    day.date.getMonth() === selectedDate.getMonth() &&
                    day.date.getFullYear() === selectedDate.getFullYear()
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={`
                        aspect-square p-1 text-xs rounded-lg transition-all
                        ${!day.isCurrentMonth ? "text-gray-300 opacity-30" : ""}
                        ${isSelected ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold ring-2 ring-purple-400 shadow-lg scale-105" : ""}
                        ${!isSelected && day.hasAppointment ? "bg-red-100 text-red-700 font-semibold" : ""}
                        ${!isSelected && day.hasSchedule && !day.hasAppointment ? "bg-blue-100 text-blue-700 font-semibold" : ""}
                        ${!isSelected && !day.hasAppointment && !day.hasSchedule && day.isCurrentMonth ? "hover:bg-gray-100 text-gray-900" : ""}
                        ${!isSelected && day.isCurrentMonth ? "text-gray-900" : ""}
                      `}
                    >
                      <div className="flex flex-col items-center justify-center h-full">
                        <span>{day.date.getDate()}</span>
                        {!isSelected && (day.hasAppointment || day.hasSchedule) && (
                          <span className="text-[8px] mt-0.5">
                            {day.hasAppointment ? "预约" : "日程"}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        {/* 日程详情/编辑 */}
        <Card
          title={editingSchedule ? (editingSchedule.id ? "编辑日程" : "新建日程") : "日程详情"}
          right={
            editingSchedule ? (
              <Button variant="ghost" onClick={() => {
                setEditingSchedule(null)
                setSelectedDate(null)
              }}>
                取消
              </Button>
            ) : null
          }
        >
          {!selectedDate ? (
            <div className="text-sm text-gray-500 text-center py-8">
              点击日历上的日期查看或创建日程
            </div>
          ) : editingSchedule ? (
            <div className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-600 mb-2 font-medium">
                  标题（必填）
                </label>
                <Input
                  value={editingSchedule.title}
                  onChange={(e) =>
                    setEditingSchedule({ ...editingSchedule, title: e.target.value })
                  }
                  placeholder="例如：与客户对接项目"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-2 font-medium">
                    日期
                  </label>
                  <Input
                    type="date"
                    value={editingSchedule.scheduled_date}
                    onChange={(e) =>
                      setEditingSchedule({
                        ...editingSchedule,
                        scheduled_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-2 font-medium">
                    时间（可选）
                  </label>
                  <Input
                    type="time"
                    value={editingSchedule.scheduled_time || ""}
                    onChange={(e) =>
                      setEditingSchedule({
                        ...editingSchedule,
                        scheduled_time: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-2 font-medium">
                  描述
                </label>
                <Textarea
                  rows={4}
                  value={editingSchedule.description || ""}
                  onChange={(e) =>
                    setEditingSchedule({
                      ...editingSchedule,
                      description: e.target.value,
                    })
                  }
                  placeholder="日程详细描述..."
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-2 font-medium">
                  相关图片
                </label>
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {uploading ? "上传中..." : "点击上传或拖拽图片"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  <div className="text-xs text-gray-500 mb-2">
                    或输入图片 URL：
                  </div>
                  <Input
                    placeholder="https://..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        const url = e.currentTarget.value.trim()
                        const currentImages = editingSchedule.images || []
                        setEditingSchedule({
                          ...editingSchedule,
                          images: [...currentImages, url],
                        })
                        e.currentTarget.value = ""
                      }
                    }}
                  />
                  {editingSchedule.images && editingSchedule.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {editingSchedule.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={img}
                            alt={`图片 ${idx + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.src = "https://via.placeholder.com/200?text=Image+Error"
                            }}
                          />
                          <button
                            onClick={() => removeImage(idx)}
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
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={editingSchedule.enable_notification}
                    onChange={(e) =>
                      setEditingSchedule({
                        ...editingSchedule,
                        enable_notification: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-gray-300 bg-white text-purple-600 focus:ring-purple-500"
                  />
                  到期时推送通知
                </label>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={saveSchedule} disabled={saving}>
                  {saving ? "保存中..." : "保存"}
                </Button>
                {editingSchedule.id && (
                  <Button
                    variant="danger"
                    onClick={() => deleteSchedule(editingSchedule.id)}
                  >
                    删除
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                日期：{selectedDate?.toLocaleDateString("zh-CN")}
              </div>
              {selectedDate && (() => {
                const dayData = calendarDays.find(d => d.date.getTime() === selectedDate.getTime())
                return dayData && dayData.appointments && dayData.appointments.length > 0
              })() && (
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-2">
                    客户预约：
                  </div>
                  {calendarDays
                    .find(d => d.date.getTime() === selectedDate.getTime())
                    ?.appointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="p-4 rounded-lg bg-red-50 border border-red-200 mb-3 space-y-2"
                      >
                        <div className="grid gap-2">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">客户姓名</div>
                            <div className="text-sm font-semibold text-red-900">
                              {apt.name}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">联系电话</div>
                            <div className="text-sm text-red-700">
                              {apt.phone}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">预约时间</div>
                            <div className="text-sm text-red-700">
                              {apt.appointment_time
                                ? new Date(apt.appointment_time).toLocaleString("zh-CN", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })
                                : "未设置"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">需求内容</div>
                            <div className="text-sm text-red-600 whitespace-pre-wrap bg-white p-2 rounded border border-red-200">
                              {apt.message || "无"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">状态</div>
                            <span className={`
                              inline-block px-2 py-1 rounded text-xs font-semibold
                              ${apt.status === "new" 
                                ? "bg-red-100 text-red-700 border border-red-300" 
                                : apt.status === "contacted"
                                ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                : "bg-green-100 text-green-700 border border-green-300"
                              }
                            `}>
                              {apt.status === "new" ? "待处理" : apt.status === "contacted" ? "已联系" : "已完成"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              {selectedDate && (() => {
                const dayData = calendarDays.find(d => d.date.getTime() === selectedDate.getTime())
                return dayData && dayData.schedules && dayData.schedules.length > 0
              })() && (
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-2">
                    自定义日程：
                  </div>
                  {calendarDays
                    .find(d => d.date.getTime() === selectedDate.getTime())
                    ?.schedules.map((sched) => (
                      <div
                        key={sched.id}
                        className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-2"
                      >
                        <div className="text-sm font-medium text-blue-900">
                          {sched.title}
                        </div>
                        {sched.scheduled_time && (
                          <div className="text-xs text-blue-700 mt-1">
                            时间：{sched.scheduled_time}
                          </div>
                        )}
                        {sched.description && (
                          <div className="text-xs text-blue-600 mt-1">
                            {sched.description}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
              <Button
                onClick={() => {
                  const dateStr = selectedDate.toISOString().split('T')[0]
                  setEditingSchedule({
                    id: "",
                    title: "",
                    scheduled_date: dateStr,
                    scheduled_time: null,
                    description: null,
                    images: null,
                    enable_notification: false,
                    notification_sent: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  } as ScheduleRow)
                }}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加日程
              </Button>
            </div>
          )}
        </Card>

        {/* 本月日程列表 */}
        <Card title="本月日程">
          {loading ? (
            <div className="text-sm text-gray-500">加载中...</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {[...schedules, ...leads.filter(l => l.appointment_time).map(l => ({
                id: `lead-${l.id}`,
                title: `${l.name} - 客户预约`,
                scheduled_date: l.appointment_time ? new Date(l.appointment_time).toISOString().split('T')[0] : "",
                scheduled_time: l.appointment_time ? new Date(l.appointment_time).toTimeString().slice(0, 5) : null,
                description: l.message,
                images: null,
                enable_notification: false,
                notification_sent: false,
                created_at: l.created_at,
                updated_at: l.updated_at,
              } as ScheduleRow))]
                .filter(s => {
                  const schedDate = new Date(s.scheduled_date)
                  return schedDate.getMonth() === currentDate.getMonth() &&
                         schedDate.getFullYear() === currentDate.getFullYear()
                })
                .sort((a, b) => {
                  const dateA = new Date(a.scheduled_date + (a.scheduled_time || "00:00"))
                  const dateB = new Date(b.scheduled_date + (b.scheduled_time || "00:00"))
                  return dateA.getTime() - dateB.getTime()
                })
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => {
                      if (item.id.startsWith("lead-")) {
                        // 这是客户预约，显示详情但不编辑
                        const leadId = item.id.replace("lead-", "")
                        const lead = leads.find(l => l.id === leadId)
                        if (lead) {
                          setSelectedDate(new Date(item.scheduled_date))
                          setEditingSchedule(null)
                        }
                        return
                      }
                      setEditingSchedule(item)
                      setSelectedDate(new Date(item.scheduled_date))
                    }}
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(item.scheduled_date).toLocaleDateString("zh-CN")}
                      {item.scheduled_time && ` ${item.scheduled_time}`}
                    </div>
                  </div>
                ))}
              {schedules.length === 0 && leads.filter(l => l.appointment_time).length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  本月暂无日程
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
