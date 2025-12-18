"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Heart, 
  Clock, 
  TrendingUp,
  BookOpen,
  MessageSquare,
  ArrowUpRight,
  Search
} from "lucide-react"
import Link from "next/link"
import { CustomerAnalytics } from "@/components/CustomerAnalytics"

export default function DashboardHome() {
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalLeads: 0,
    totalReviews: 0,
    activeLeads: 0,
    newProjectsThisMonth: 0,
    newLeadsThisWeek: 0,
  })
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<{
    projects: { id: string; title: string | null }[]
    leads: { id: string; name: string | null; phone: string | null }[]
    progress: { id: string; title: string | null; customer_phone: string | null; project_id: string | null }[]
    reviews: { id: string; name: string | null; project_name: string | null }[]
  }>({
    projects: [],
    leads: [],
    progress: [],
    reviews: [],
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchOpen(false)
      setSearching(false)
      setSearchResults({ projects: [], leads: [], progress: [], reviews: [] })
      return
    }

    setSearchOpen(true)
    const timer = setTimeout(async () => {
      setSearching(true)
      const like = `%${q}%`

      try {
        const [projectsRes, leadsRes, progressRes, reviewsRes] = await Promise.all([
          supabase
            .from("projects")
            .select("id,title")
            .ilike("title", like)
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("leads")
            .select("id,name,phone")
            .or(`name.ilike.${like},phone.ilike.${like}`)
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("project_progress")
            .select("id,title,customer_phone,project_id")
            .or(`customer_phone.ilike.${like},title.ilike.${like}`)
            .order("progress_date", { ascending: false })
            .limit(8),
          supabase
            .from("reviews")
            .select("id,name,project_name")
            .or(`name.ilike.${like},project_name.ilike.${like}`)
            .order("created_at", { ascending: false })
            .limit(8),
        ])

        setSearchResults({
          projects: (projectsRes.data ?? []) as any,
          leads: (leadsRes.data ?? []) as any,
          progress: (progressRes.data ?? []) as any,
          reviews: (reviewsRes.data ?? []) as any,
        })
      } catch (err) {
        console.error("全局搜索失败:", err)
        setSearchResults({ projects: [], leads: [], progress: [], reviews: [] })
      } finally {
        setSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  async function loadData() {
    setLoading(true)
    
    try {
      // 获取当前时间范围
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisWeekStart = new Date(now)
      thisWeekStart.setDate(now.getDate() - 7)

      // Load projects
      const { data: projects } = await supabase
        .from("projects")
        .select("id, title, created_at, published")
        .order("created_at", { ascending: false })
        .limit(5)

      // Load leads
      const { data: leads } = await supabase
        .from("leads")
        .select("id, name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      // Load reviews
      const { data: reviews } = await supabase
        .from("reviews")
        .select("id, name, created_at, approved")
        .order("created_at", { ascending: false })
        .limit(5)

      // Calculate stats
      const { count: projectsCount } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })

      const { count: leadsCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })

      const { count: reviewsCount } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })

      const { count: activeLeadsCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "new")

      // 本月新增项目
      const { count: newProjectsThisMonth } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thisMonthStart.toISOString())

      // 本周新增需求
      const { count: newLeadsThisWeek } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thisWeekStart.toISOString())

      setStats({
        totalProjects: projectsCount || 0,
        totalLeads: leadsCount || 0,
        totalReviews: reviewsCount || 0,
        activeLeads: activeLeadsCount || 0,
        newProjectsThisMonth: newProjectsThisMonth || 0,
        newLeadsThisWeek: newLeadsThisWeek || 0,
      })

      // Combine activities
      const activities: any[] = []
      
      projects?.forEach((p) => {
        activities.push({
          type: "project",
          label: "新项目",
          text: `${p.title} ${p.published ? "已发布" : "已创建"}`,
          time: p.created_at,
          color: "green",
        })
      })

      leads?.forEach((l) => {
        activities.push({
          type: "lead",
          label: "客户需求",
          text: `${l.name} 提交了新需求`,
          time: l.created_at,
          color: "blue",
        })
      })

      reviews?.forEach((r) => {
        activities.push({
          type: "review",
          label: "评价",
          text: `${r.name || "匿名"} 提交了评价`,
          time: r.created_at,
          color: "orange",
        })
      })

      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setRecentActivities(activities.slice(0, 4))

      // 加载即将到来的事件（客户预约和日程）
      const currentTime = new Date()
      const futureDate = new Date(currentTime)
      futureDate.setDate(now.getDate() + 30) // 未来30天

      // 加载未来预约
      const { data: upcomingLeads } = await supabase
        .from("leads")
        .select("id, name, appointment_time, message")
        .eq("contact_type", "appointment")
        .not("appointment_time", "is", null)
        .gte("appointment_time", currentTime.toISOString())
        .lte("appointment_time", futureDate.toISOString())
        .order("appointment_time", { ascending: true })
        .limit(4)

      // 加载未来日程
      const { data: upcomingSchedules } = await supabase
        .from("schedules")
        .select("id, title, scheduled_date, scheduled_time")
        .gte("scheduled_date", currentTime.toISOString().split('T')[0])
        .lte("scheduled_date", futureDate.toISOString().split('T')[0])
        .order("scheduled_date", { ascending: true })
        .limit(4)

      const events: any[] = []
      
      upcomingLeads?.forEach((lead) => {
        if (lead.appointment_time) {
          events.push({
            id: lead.id,
            title: `${lead.name} - 客户预约`,
            time: new Date(lead.appointment_time),
            type: "appointment",
            color: "purple",
          })
        }
      })

      upcomingSchedules?.forEach((schedule) => {
        const eventDate = new Date(schedule.scheduled_date)
        if (schedule.scheduled_time) {
          const [hours, minutes] = schedule.scheduled_time.split(':')
          eventDate.setHours(parseInt(hours), parseInt(minutes))
        }
        events.push({
          id: schedule.id,
          title: schedule.title,
          time: eventDate,
          type: "schedule",
          color: "green",
        })
      })

      events.sort((a, b) => a.time.getTime() - b.time.getTime())
      setUpcomingEvents(events.slice(0, 4))
    } catch (error) {
      console.error("加载数据失败:", error)
    } finally {
      setLoading(false)
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    const currentTime = new Date()
    const diff = currentTime.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} 天前`
    if (hours > 0) return `${hours} 小时前`
    const minutes = Math.floor(diff / (1000 * 60))
    if (minutes > 0) return `${minutes} 分钟前`
    return "刚刚"
  }

  const goalProgress = stats.totalProjects > 0 
    ? Math.min(100, (stats.totalProjects / (stats.totalProjects + 5)) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">仪表盘概览</h1>
        <p className="text-sm text-gray-600 mt-1">
          欢迎回来！这是维度空间后台的概览信息。
        </p>

        <div className="mt-4 relative">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="全局搜索：项目名 / 客户手机号 / 进度标题 / 评价昵称..."
              className="w-full max-w-2xl pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          <div
            className={[
              "fixed inset-0 z-40",
              searchOpen ? "" : "pointer-events-none",
            ].join(" ")}
            onClick={() => setSearchOpen(false)}
          />

          {searchOpen && (
            <div className="absolute z-50 mt-2 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-600">
                  {searching ? "搜索中..." : "搜索结果"}
                </div>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="shine-hover shine-hover-dark rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  关闭
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                {(() => {
                  const total =
                    searchResults.projects.length +
                    searchResults.leads.length +
                    searchResults.progress.length +
                    searchResults.reviews.length

                  if (!searching && total === 0) {
                    return <div className="px-4 py-6 text-sm text-gray-500">无匹配结果</div>
                  }

                  return (
                    <div className="divide-y divide-gray-100">
                      <div className="p-4">
                        <div className="text-xs font-semibold text-gray-700 mb-2">项目（{searchResults.projects.length}）</div>
                        <div className="space-y-2">
                          {searchResults.projects.map((p) => (
                            <Link
                              key={p.id}
                              href={`/projects?id=${encodeURIComponent(p.id)}`}
                              className="block rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors"
                              onClick={() => setSearchOpen(false)}
                            >
                              <div className="text-sm font-semibold text-gray-900 truncate">{p.title || "未命名项目"}</div>
                              <div className="text-xs text-gray-500">ID：{p.id}</div>
                            </Link>
                          ))}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="text-xs font-semibold text-gray-700 mb-2">客户需求（{searchResults.leads.length}）</div>
                        <div className="space-y-2">
                          {searchResults.leads.map((l) => (
                            <Link
                              key={l.id}
                              href={`/leads?id=${encodeURIComponent(l.id)}`}
                              className="block rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors"
                              onClick={() => setSearchOpen(false)}
                            >
                              <div className="text-sm font-semibold text-gray-900 truncate">{l.name || "未命名"}</div>
                              <div className="text-xs text-gray-500">{l.phone || "-"}</div>
                            </Link>
                          ))}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="text-xs font-semibold text-gray-700 mb-2">项目跟踪（{searchResults.progress.length}）</div>
                        <div className="space-y-2">
                          {searchResults.progress.map((pr) => (
                            <Link
                              key={pr.id}
                              href={`/project-progress?id=${encodeURIComponent(pr.id)}`}
                              className="block rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors"
                              onClick={() => setSearchOpen(false)}
                            >
                              <div className="text-sm font-semibold text-gray-900 truncate">{pr.title || "未命名进度"}</div>
                              <div className="text-xs text-gray-500">{pr.customer_phone || "-"}</div>
                            </Link>
                          ))}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="text-xs font-semibold text-gray-700 mb-2">评价（{searchResults.reviews.length}）</div>
                        <div className="space-y-2">
                          {searchResults.reviews.map((r) => (
                            <Link
                              key={r.id}
                              href={`/reviews?id=${encodeURIComponent(r.id)}`}
                              className="block rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors"
                              onClick={() => setSearchOpen(false)}
                            >
                              <div className="text-sm font-semibold text-gray-900 truncate">{r.name || "匿名"}</div>
                              <div className="text-xs text-gray-500">{r.project_name || "-"}</div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards - 参考图二设计，使用响应式网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {/* Total Projects - 紫色渐变 */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 border border-purple-300 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {loading ? "..." : stats.totalProjects}
          </div>
          <div className="text-sm text-white/90 font-semibold mb-2">总项目数</div>
          <div className="text-xs text-white/80 font-medium bg-white/20 rounded-full px-3 py-1 inline-block">
            +{stats.newProjectsThisMonth} 本月新增
          </div>
        </div>

        {/* Total Leads - 蓝色渐变 */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 border border-blue-300 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {loading ? "..." : stats.totalLeads}
          </div>
          <div className="text-sm text-white/90 font-semibold mb-2">客户需求总数</div>
          <div className="text-xs text-white/80 font-medium bg-white/20 rounded-full px-3 py-1 inline-block">
            +{stats.newLeadsThisWeek} 本周新增
          </div>
        </div>

        {/* Total Reviews - 绿色渐变 */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 border border-green-300 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {loading ? "..." : stats.totalReviews}
          </div>
          <div className="text-sm text-white/90 font-semibold mb-2">评价总数</div>
          <div className="text-xs text-white/80 font-medium bg-white/20 rounded-full px-3 py-1 inline-block">
            较上月增长
          </div>
        </div>

        {/* Active Leads - 橙色渐变 */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 border border-orange-300 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Heart className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {loading ? "..." : stats.activeLeads}
          </div>
          <div className="text-sm text-white/90 font-semibold mb-2">待处理需求</div>
          <div className="text-xs text-white/80 font-medium bg-white/20 rounded-full px-3 py-1 inline-block">
            本周已处理
          </div>
        </div>
      </div>

      {/* Recent Activities and Quick Actions - 使用响应式网格 */}
      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        {/* Recent Activities */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">最近活动</h2>
            </div>
            <Link 
              href="/projects" 
              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium flex items-center gap-1"
            >
              查看全部
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-4">
            {loading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">加载中...</div>
            ) : recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                    activity.color === "blue" ? "bg-blue-500" :
                    activity.color === "green" ? "bg-green-500" :
                    "bg-orange-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">
                        {activity.text}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        activity.color === "blue" ? "bg-blue-100 text-blue-700" :
                        activity.color === "green" ? "bg-green-100 text-green-700" :
                        "bg-orange-100 text-orange-700"
                      }`}>
                        {activity.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(activity.time)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 py-4">暂无活动</div>
            )}
          </div>
        </div>

        {/* Upcoming Events - 参考图二设计 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">即将到来的事件</h2>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-sm text-gray-500">加载中...</div>
            ) : upcomingEvents.length > 0 ? (
              upcomingEvents.map((event, index) => {
                const eventDate = new Date(event.time)
                const timeStr = eventDate.toLocaleTimeString("zh-CN", { 
                  hour: "2-digit", 
                  minute: "2-digit",
                  hour12: false 
                })
                const dateStr = eventDate.toLocaleDateString("zh-CN", {
                  month: "short",
                  day: "numeric"
                })
                return (
                  <div key={event.id || index} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {event.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium ${
                          event.color === "purple" 
                            ? "text-purple-600" 
                            : "text-green-600"
                        }`}>
                          {timeStr}
                        </span>
                        <span className="text-xs text-gray-500">
                          {dateStr}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-sm text-gray-500 py-4">暂无即将到来的事件</div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Goal Progress */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">月度目标进度</h2>
          </div>
          <span className="text-sm text-gray-500">目标: {stats.totalProjects + 5} 个项目</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {loading ? "..." : stats.totalProjects}
            </span>
            <span className="text-sm text-gray-600">
              已完成
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-end">
            <span className="text-sm text-green-600 font-medium">
              {loading ? "..." : `${Math.round(goalProgress)}% 完成`}
            </span>
          </div>
        </div>
      </div>

      {/* 客户画像分析 */}
      <CustomerAnalytics />
    </div>
  )
}
