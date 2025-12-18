import { NextRequest, NextResponse } from "next/server"

const ZHIPU_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"

// 允许跨域请求（用于前台HTML页面访问）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:18',message:'API POST request started',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const { message, contextData } = await request.json()
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:21',message:'Request parsed',data:{hasMessage:!!message,hasContextData:!!contextData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // 从环境变量获取 API Key（只使用服务器端变量，确保安全）
    const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || ""

    if (!ZHIPU_API_KEY) {
      return NextResponse.json(
        { error: "API Key 未配置，请在服务器端环境变量中设置 ZHIPU_API_KEY" },
        { status: 500 }
      )
    }

    // 构建系统提示
    const systemPrompt = `你是一个公司网站的智能助手，目标是让用户快速获得“针对当前问题”的有用回答。

回答风格与规则（非常重要，必须遵守）：
- 先直接回答用户问题，不要每次都用固定的“您好/关于...价格”等模板开场。
- 不要每次都重复输出公司简介、服务清单、联系方式、地址。
- 只有在用户明确询问“你们有哪些服务/怎么联系/在哪里/能不能加微信/怎么预约”等问题时，才给出对应信息。
- 对“收费/价格/预算”类问题：
  - 先解释影响因素（面积/风格/复杂度/是否含软装/是否施工配合/交付深度等）。
  - 给出可操作的估算方式（例如按面积/按阶段/按套餐），并用“区间 + 说明”的方式给出大致范围（不要承诺固定价）。
  - 最后追问 1-2 个关键信息来收敛报价（例如面积、城市、户型、风格、是否全案）。
- 对“能不能做某类项目/流程怎样/周期多久”类问题：给出步骤化、接地气的回答，尽量结合用户场景。
- 回复尽量简洁清晰，可用 Markdown 列表；不要出现*号；不要包含违法违规内容。

你可以回答关于维度空间设计工作室的公司信息、服务内容、设计理念、装修流程等问题，也可以回答其他任何问题。

公司信息：
- 维度空间室内设计工作室，专注于高品质私宅定制与商业空间策划
- 服务范围：私宅全案设计、商业空间策划、软装陈列定制
- 联系方式：电话 177-7229-7239，邮箱 1810266895@qq.com
- 地址：新和县迎宾花园小区

${contextData ? `
已发布项目：
${contextData.projects?.map((p: any) => 
  `  - ${p.title}（${p.category || '未分类'}，${p.location || '未指定地点'}）`
).join('\n') || '暂无'}

客户评价：
${contextData.reviews?.map((r: any) => 
  `  - ${r.name || '匿名'}：${r.content?.substring(0, 50) || ''}`
).join('\n') || '暂无'}
` : ''}

重要限制：
- 不得透露后台管理相关的数据，如项目总数、待处理需求数量、预约数量等
- 不得透露客户的具体联系信息
- 只能使用公开的项目信息和评价信息

请用中文回答，回答要准确、有帮助性。回答格式要尽量干净，可以使用markdown格式让内容更清晰。不得使用*号出现在回复中，同时不能包含任何违法违规的内容。`

    // 构建消息数组（智谱API格式）
    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: message
      }
    ]

    // 调用智谱API（GLM-4.5-Flash，流式响应）
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:72',message:'Calling Zhipu API',data:{hasApiKey:!!ZHIPU_API_KEY,messagesCount:messages.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const response = await fetch(
      ZHIPU_API_URL,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ZHIPU_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "glm-4.5-flash",
          messages: messages,
          stream: true,
          temperature: 0.85,
          top_p: 0.9,
          max_tokens: 8192,
        }),
      }
    )
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:89',message:'Zhipu API response received',data:{status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (!response.ok) {
      let errorText = ""
      let errorMessage = "AI 服务暂时不可用"
      
      try {
        errorText = await response.text()
        if (errorText) {
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.error?.message) {
              errorMessage = errorData.error.message
            } else if (errorData.error) {
              errorMessage = typeof errorData.error === 'string' ? errorData.error : "AI 服务暂时不可用"
            }
          } catch (e) {
            // 如果无法解析为JSON，使用原始文本
            errorMessage = errorText || "AI 服务暂时不可用"
          }
        }
      } catch (e) {
        console.error("读取错误响应失败:", e)
      }
      
      console.error("智谱API 错误:", response.status, errorText)
      return NextResponse.json(
        { error: errorMessage },
        { 
          status: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      )
    }

    // 处理流式响应
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullText = ""

    if (!reader) {
      return NextResponse.json(
        { error: "无法读取响应流" },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      )
    }

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:147',message:'Stream started',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:151',message:'Stream done',data:{fullTextLength:fullText.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                if (data === '[DONE]' || data === '') {
                  if (data === '[DONE]') {
                    controller.close()
                    return
                  }
                  continue
                }

                try {
                  const json = JSON.parse(data)
                  // 智谱API流式响应格式：choices[0].delta.content
                  const content = json.choices?.[0]?.delta?.content || ""
                  if (content) {
                    fullText += content
                    // 发送SSE格式数据
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`))
                  }
                  // 检查是否完成
                  if (json.choices?.[0]?.finish_reason) {
                    // 发送完成标记
                    controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`))
                    controller.close()
                    return
                  }
                } catch (e) {
                  // 忽略解析错误，继续处理下一行
                  console.warn('解析流式数据失败:', e, data.substring(0, 100))
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:178',message:'JSON parse error',data:{error:String(e),dataPreview:data.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                  // #endregion
                }
              }
            }
          }
          controller.close()
        } catch (error) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:186',message:'Stream error',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          controller.error(error)
        }
      }
    })

    // 返回流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error: any) {
    console.error("API 路由错误:", error)
    const errorMessage = error.message || "服务器错误，请检查网络连接或稍后重试"
    return NextResponse.json(
      { error: errorMessage },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    )
  }
}

