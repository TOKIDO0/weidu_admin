import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardWrapper from '@/components/DashboardWrapper'

// 根路径页面 - 根据域名决定显示内容
export default async function HomePage() {
  const headersList = await headers()
  const hostname = headersList.get('host') || ''
  
  // 如果是前台域名，重定向到静态文件路由
  const isFrontend = hostname.includes('www.105911.xyz') || 
                     hostname === '105911.xyz' ||
                     (hostname.startsWith('105911.xyz') && !hostname.startsWith('admin.'))
  
  if (isFrontend) {
    redirect('/static')
  }
  
  // 后台域名显示 dashboard
  return <DashboardWrapper />
}

