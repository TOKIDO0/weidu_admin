import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aitxgwfqtcrxxcglwmrq.supabase.co"
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const NTFY_TOKEN = process.env.NTFY_TOKEN || "tk_7266bxclhxy1pmwfh1rmh0tqeaf4p"
const NTFY_TOPIC = "weidu-studio-alerts"

// 这个 API 应该通过 cron job 定期调用（例如每天凌晨检查）
export async function GET(request: NextRequest) {
  try {
    // 使用服务端密钥创建 Supabase 客户端
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // 查找今天需要推送的日程
    const { data: schedules, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("scheduled_date", todayStr)
      .eq("enable_notification", true)
      .eq("notification_sent", false)

    if (error) {
      console.error("查询日程失败:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ message: "今天没有需要推送的日程", count: 0 })
    }

    // 发送推送通知
    const results = []
    for (const schedule of schedules) {
      try {
        const timeText = schedule.scheduled_time ? ` ${schedule.scheduled_time}` : ""
        const message = `日程提醒：${schedule.title}${timeText}\n\n${schedule.description || ""}`

        const response = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NTFY_TOKEN}`,
            Title: "日程提醒",
            Priority: "default",
            Tags: "calendar,clock",
            "Content-Type": "text/plain",
          },
          body: message,
        })

        if (response.ok) {
          // 标记为已发送
          await supabase
            .from("schedules")
            .update({ notification_sent: true })
            .eq("id", schedule.id)

          results.push({ id: schedule.id, title: schedule.title, sent: true })
        } else {
          results.push({ id: schedule.id, title: schedule.title, sent: false, error: await response.text() })
        }
      } catch (err: any) {
        results.push({ id: schedule.id, title: schedule.title, sent: false, error: err.message })
      }
    }

    return NextResponse.json({
      message: `处理了 ${schedules.length} 个日程`,
      results,
    })
  } catch (error: any) {
    console.error("推送通知错误:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}



