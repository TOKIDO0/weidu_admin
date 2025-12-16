import { NextRequest, NextResponse } from "next/server"

const NTFY_TOKEN = process.env.NTFY_TOKEN || "tk_7266bxclhxy1pmwfh1rmh0tqeaf4p"
const NTFY_TOPIC = "weidu-studio-alerts"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, message, priority = "default" } = body

    if (!message) {
      return NextResponse.json({ error: "消息内容不能为空" }, { status: 400 })
    }

    // 使用 ntfy.sh API 发送推送
    // 根据文档：https://docs.ntfy.sh/publish/
    // 主题名作为URL路径，消息体作为POST body
    const response = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: "POST",
      headers: {
        "Title": title || "通知",
        "Priority": priority,
        "Tags": "bell,information_source",
        "Content-Type": "text/plain",
        // 如果使用认证，使用 Authorization header
        ...(NTFY_TOKEN ? { "Authorization": `Bearer ${NTFY_TOKEN}` } : {}),
      },
      body: message,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("推送失败:", response.status, errorText)
      return NextResponse.json(
        { error: `推送失败: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const responseText = await response.text()
    return NextResponse.json({ success: true, message: "推送成功", response: responseText })
  } catch (error: any) {
    console.error("推送通知错误:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

