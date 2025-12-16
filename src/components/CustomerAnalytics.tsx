"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Sector } from "recharts"
import { TrendingUp, DollarSign, Palette, MessageSquare } from "lucide-react"

type LeadRow = {
  id: string
  name: string
  phone: string
  message: string
  contact_type: string
  status: string
  created_at: string
}

type Analytics = {
  budgetDistribution: { name: string; value: number }[]
  stylePreferences: { name: string; value: number }[]
  contactTypeDistribution: { name: string; value: number }[]
  popularKeywords: { word: string; count: number }[]
  averageResponseTime: number
  conversionRate: number
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0']

// 带3D效果的饼状图组件 - 每个扇形往自己的方向放大
function ContactPieChart({ data }: { data: { name: string; value: number }[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  
  // 自定义渲染激活状态的扇形 - 每个扇形往自己的方向放大
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props
    
    // 计算扇形的中心角度
    const midAngle = (startAngle + endAngle) / 2
    const radian = (midAngle * Math.PI) / 180
    
    // 根据中心角度计算偏移方向（向外偏移）
    const offsetX = Math.cos(radian) * 15
    const offsetY = Math.sin(radian) * 15
    
    return (
      <g>
        <Sector
          cx={cx + offsetX}
          cy={cy + offsetY}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'drop-shadow(0px 0px 8px rgba(0,0,0,0.5))' }}
        />
        <text 
          x={cx + offsetX} 
          y={cy + offsetY} 
          dy={8} 
          textAnchor="middle" 
          fill={fill}
          fontSize={14}
          fontWeight="bold"
        >
          {payload.name} {(percent * 100).toFixed(0)}%
        </text>
      </g>
    )
  }
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <defs>
          {data.map((entry, index) => (
            <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
              <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.7} />
            </linearGradient>
          ))}
        </defs>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          activeIndex={activeIndex ?? undefined}
          activeShape={renderActiveShape}
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={`url(#gradient-${index})`}
              style={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function CustomerAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  async function loadAnalytics() {
    setLoading(true)
    try {
      const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })

      if (!leads) return

      // 分析预算分布
      const budgetRanges = {
        "0-10万": 0,
        "10-30万": 0,
        "30-50万": 0,
        "50-100万": 0,
        "100万以上": 0,
      }

      leads.forEach((lead: LeadRow) => {
        const message = lead.message || ""
        const budgetMatch = message.match(/(\d+)[万千]/)
        if (budgetMatch) {
          const amount = parseInt(budgetMatch[1])
          if (amount < 10) budgetRanges["0-10万"]++
          else if (amount < 30) budgetRanges["10-30万"]++
          else if (amount < 50) budgetRanges["30-50万"]++
          else if (amount < 100) budgetRanges["50-100万"]++
          else budgetRanges["100万以上"]++
        }
      })

      const budgetDistribution = Object.entries(budgetRanges)
        .filter(([_, count]) => count > 0)
        .map(([name, value]) => ({ name, value }))

      // 分析风格偏好
      const styles = ["现代", "简约", "欧式", "美式", "中式", "日式", "工业风", "北欧", "轻奢", "田园"]
      const styleCounts: Record<string, number> = {}

      leads.forEach((lead: LeadRow) => {
        const message = (lead.message || "").toLowerCase()
        styles.forEach((style) => {
          if (message.includes(style.toLowerCase())) {
            styleCounts[style] = (styleCounts[style] || 0) + 1
          }
        })
      })

      const stylePreferences = Object.entries(styleCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6)

      // 分析联系方式分布
      const contactTypeCounts: Record<string, number> = {}
      leads.forEach((lead: LeadRow) => {
        const type = lead.contact_type === "appointment" ? "预约咨询" : "立即联系"
        contactTypeCounts[type] = (contactTypeCounts[type] || 0) + 1
      })

      const contactTypeDistribution = Object.entries(contactTypeCounts).map(([name, value]) => ({
        name,
        value,
      }))

      // 提取关键词
      const wordCount: Record<string, number> = {}
      leads.forEach((lead: LeadRow) => {
        const words = (lead.message || "")
          .replace(/[，。、；：！？\s]/g, " ")
          .split(" ")
          .filter((w) => w.length > 1)
        words.forEach((word) => {
          wordCount[word] = (wordCount[word] || 0) + 1
        })
      })

      const popularKeywords = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }))

      // 计算转化率
      const total = leads.length
      const completed = leads.filter((l) => l.status === "completed").length
      const conversionRate = total > 0 ? (completed / total) * 100 : 0

      setAnalytics({
        budgetDistribution,
        stylePreferences,
        contactTypeDistribution,
        popularKeywords,
        averageResponseTime: 0, // 可以后续实现
        conversionRate,
      })
    } catch (error) {
      console.error("加载分析数据失败:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="text-center text-gray-500">加载中...</div>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-purple-600" />
        <h2 className="text-xl font-semibold text-gray-900">客户画像分析</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 预算分布 */}
        {analytics.budgetDistribution.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">预算分布</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.budgetDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.budgetDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 风格偏好 */}
        {analytics.stylePreferences.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">风格偏好</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.stylePreferences}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 联系方式分布 - 带3D效果 */}
        {analytics.contactTypeDistribution.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">联系方式分布</h3>
            </div>
            <ContactPieChart data={analytics.contactTypeDistribution} />
          </div>
        )}

        {/* 热门关键词 */}
        {analytics.popularKeywords.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">热门关键词</h3>
            <div className="flex flex-wrap gap-2">
              {analytics.popularKeywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700"
                >
                  {keyword.word} ({keyword.count})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 转化率统计 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">转化率统计</h3>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold text-purple-600">
            {analytics.conversionRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">
            客户需求转化率
          </div>
        </div>
      </div>
    </div>
  )
}


