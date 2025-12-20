"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  CalendarDays, 
  BookOpen, 
  Heart, 
  MessageSquare,
  Video,
  Share2,
  UserCog,
  Building2,
  UsersRound,
  MessageCircle,
  Moon,
  Sun,
  Menu,
  X,
  CalendarClock
} from "lucide-react"

type NavItem = {
  href: string
  label: string
  icon: any
  children?: NavItem[]
}

const navSections = [
  {
    title: "内容管理",
    items: [
      { href: "/", label: "概览", icon: LayoutDashboard },
      { href: "/projects", label: "项目管理", icon: BookOpen },
      { href: "/reviews", label: "评价管理", icon: MessageSquare },
      { href: "/leads", label: "客户需求", icon: Users },
      { 
        href: "/schedule", 
        label: "日程", 
        icon: Calendar,
        children: [
          { href: "/schedule", label: "日程管理", icon: Calendar },
          { href: "/schedule/smart", label: "智能排期", icon: CalendarClock },
        ]
      } as NavItem,
      { href: "/project-progress", label: "项目跟踪", icon: CalendarDays },
    ] as NavItem[],
  },
]

export function Sidebar({ isOpen, onClose, onChatOpen }: { isOpen?: boolean; onClose?: () => void; onChatOpen?: () => void }) {
  const pathname = usePathname()
  
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`
        z-50 w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col
        fixed inset-y-0 left-0 min-h-screen
        transform transition-transform duration-300 ease-in-out
        ${isOpen !== false ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:sticky lg:top-0 lg:self-start lg:min-h-screen lg:translate-x-0 lg:shadow-none
      `}>
      {/* Logo Section */}
      <div className="p-4 sm:p-6 pb-4">
        <div className="flex items-center justify-between mb-3 lg:justify-center">
          <div className="flex items-center justify-center flex-1">
            <img 
              src="https://dl.img.timecdn.cn/2025/12/14/LOGO.png" 
              alt="LOGO" 
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
            />
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="text-center">
          <h1 className="text-base sm:text-lg font-serif text-gray-800">维度空间</h1>
          <p className="text-[10px] sm:text-xs text-purple-500 mt-1">后台管理系统</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 sm:px-3 pb-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4 sm:mb-6">
            <div className="px-2 sm:px-3 mb-2">
              <h2 className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </h2>
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isRoot = item.href === "/"
                // 修复：对于有子项的父项，只有当路径完全匹配父项或匹配某个子项时才高亮
                const hasChildren = item.children && item.children.length > 0
                let active = false
                if (isRoot) {
                  active = pathname === "/" || pathname === ""
                } else if (hasChildren) {
                  // 如果有子项，检查是否匹配父项或任何子项
                  const matchesParent = pathname === item.href
                  const matchesChild = item.children!.some(child => 
                    pathname === child.href || pathname?.startsWith(child.href + "/")
                  )
                  active = matchesParent || matchesChild
                } else {
                  active = pathname === item.href || pathname?.startsWith(item.href + "/")
                }
                
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        // 移动端点击链接后关闭侧边栏
                        if (onClose && window.innerWidth < 1024) {
                          onClose()
                        }
                      }}
                      className={`
                        flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors
                        ${
                          active
                            ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>{item.label}</span>
                    </Link>
                    {hasChildren && active && (
                      <div className="ml-4 sm:ml-6 mt-1 space-y-1 border-l-2 border-purple-200 pl-2">
                        {item.children!.map((child) => {
                          const ChildIcon = child.icon
                          // 修复：精确匹配 - 只有当路径完全等于子项href时才高亮
                          // 如果路径是 /schedule，只有"日程管理"高亮
                          // 如果路径是 /schedule/smart，只有"智能排期"高亮
                          const childActive = pathname === child.href
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => {
                                if (onClose && window.innerWidth < 1024) {
                                  onClose()
                                }
                              }}
                              className={`
                                flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors
                                ${
                                  childActive
                                    ? "bg-purple-100 text-purple-700"
                                    : "text-gray-600 hover:bg-gray-100"
                                }
                              `}
                            >
                              <ChildIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>{child.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

  
    </aside>
    </>
  )
}
