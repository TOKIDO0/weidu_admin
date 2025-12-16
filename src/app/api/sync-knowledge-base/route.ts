import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aitxgwfqtcrxxcglwmrq.supabase.co"
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// 同步知识库的API路由，用于将项目、客户需求等信息同步到知识库
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 获取所有项目
    const { data: projects } = await supabase
      .from("projects")
      .select("*")

    // 获取所有客户需求
    const { data: leads } = await supabase
      .from("leads")
      .select("*")

    // 获取所有日程
    const { data: schedules } = await supabase
      .from("schedules")
      .select("*")

    // 获取所有评价
    const { data: reviews } = await supabase
      .from("reviews")
      .select("*")

    // 清空旧的知识库数据
    await supabase.from("knowledge_base").delete().neq("id", "00000000-0000-0000-0000-000000000000")

    // 插入项目信息
    if (projects) {
      for (const project of projects) {
        await supabase.from("knowledge_base").insert({
          content_type: "project",
          title: project.title,
          content: `项目标题：${project.title}\n分类：${project.category || "未分类"}\n地点：${project.location || "未指定"}\n面积：${project.area || "未指定"}\n工期：${project.duration || "未指定"}\n造价：${project.cost || "未指定"}\n描述：${project.description || "无描述"}\n状态：${project.published ? "已发布" : "未发布"}`,
          metadata: {
            project_id: project.id,
            category: project.category,
            location: project.location,
            published: project.published,
          },
        })
      }
    }

    // 插入客户需求信息
    if (leads) {
      for (const lead of leads) {
        await supabase.from("knowledge_base").insert({
          content_type: "lead",
          title: `${lead.name} - 客户需求`,
          content: `客户姓名：${lead.name}\n电话：${lead.phone}\n联系方式：${lead.contact_type === "appointment" ? "预约" : "立即联系"}\n预约时间：${lead.appointment_time ? new Date(lead.appointment_time).toLocaleString("zh-CN") : "无"}\n状态：${lead.status === "new" ? "待处理" : lead.status === "contacted" ? "已联系" : "已完成"}\n需求内容：${lead.message || "无"}`,
          metadata: {
            lead_id: lead.id,
            status: lead.status,
            contact_type: lead.contact_type,
          },
        })
      }
    }

    // 插入日程信息
    if (schedules) {
      for (const schedule of schedules) {
        await supabase.from("knowledge_base").insert({
          content_type: "schedule",
          title: schedule.title,
          content: `日程标题：${schedule.title}\n日期：${schedule.scheduled_date}\n时间：${schedule.scheduled_time || "未指定"}\n描述：${schedule.description || "无描述"}`,
          metadata: {
            schedule_id: schedule.id,
            scheduled_date: schedule.scheduled_date,
          },
        })
      }
    }

    // 插入评价信息
    if (reviews) {
      for (const review of reviews) {
        await supabase.from("knowledge_base").insert({
          content_type: "review",
          title: `${review.name || "匿名"} - 评价`,
          content: `评价人：${review.name || "匿名"}\n项目名：${review.project_name || "未指定"}\n评分：${review.rating ? "⭐".repeat(review.rating) : "未评分"}\n内容：${review.content || "无内容"}\n状态：${review.approved ? "已通过" : "待审核"}`,
          metadata: {
            review_id: review.id,
            rating: review.rating,
            approved: review.approved,
          },
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `已同步 ${(projects?.length || 0) + (leads?.length || 0) + (schedules?.length || 0) + (reviews?.length || 0)} 条记录到知识库` 
    })
  } catch (error: any) {
    console.error("同步知识库失败:", error)
    return NextResponse.json(
      { error: error.message || "同步失败" },
      { status: 500 }
    )
  }
}



