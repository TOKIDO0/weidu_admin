import { NextRequest, NextResponse } from "next/server"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

// 使用Node.js runtime（不是Edge Runtime）
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  // 在 Next.js 16 中，params 是 Promise，需要先 await
  const resolvedParams = await params
  
  // #region agent log
  const logData = { location: 'static/[[...path]]/route.ts:10', message: 'Static route called', data: { path: resolvedParams.path, pathname: request.nextUrl.pathname }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }
  fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData) }).catch(() => {})
  // #endregion
  
  // 构建文件路径
  let fileName: string
  if (!resolvedParams.path || resolvedParams.path.length === 0) {
    fileName = 'index.html'
  } else {
    fileName = resolvedParams.path.join('/')
    // 确保有.html扩展名
    if (!fileName.endsWith('.html')) {
      fileName += '.html'
    }
    // 移除路径中的/static前缀（如果有）
    fileName = fileName.replace(/^static\//, '')
  }
  
  const filePath = join(process.cwd(), 'public', fileName)
  // #region agent log
  const logData2 = { location: 'static/[[...path]]/route.ts:25', message: 'Checking file', data: { fileName, filePath, exists: existsSync(filePath) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }
  fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData2) }).catch(() => {})
  // #endregion
  
  if (existsSync(filePath)) {
    try {
      const fileContent = readFileSync(filePath, 'utf-8')
      // #region agent log
      const logData3 = { location: 'static/[[...path]]/route.ts:31', message: 'File read successfully', data: { fileName, contentLength: fileContent.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }
      fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData3) }).catch(() => {})
      // #endregion
      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    } catch (error) {
      // #region agent log
      const logData4 = { location: 'static/[[...path]]/route.ts:40', message: 'Error reading file', data: { error: String(error), fileName }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }
      fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData4) }).catch(() => {})
      // #endregion
      console.error('Error reading file:', error)
      return new NextResponse(null, { status: 500 })
    }
  }
  
  // #region agent log
  const logData5 = { location: 'static/[[...path]]/route.ts:48', message: 'File not found', data: { fileName, filePath }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }
  fetch('http://127.0.0.1:7242/ingest/884a451f-c414-4281-8ea5-65c9af9f4af5', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData5) }).catch(() => {})
  // #endregion
  return new NextResponse(null, { status: 404 })
}

