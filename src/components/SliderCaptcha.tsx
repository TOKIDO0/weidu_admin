"use client"

import { useState, useRef, useEffect } from "react"
import { Check } from "lucide-react"

export function SliderCaptcha({ onVerify }: { onVerify: (verified: boolean) => void }) {
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState(0)
  const [verified, setVerified] = useState(false)
  const [puzzleX, setPuzzleX] = useState(0)
  const [targetX, setTargetX] = useState(0)
  const sliderRef = useRef<HTMLDivElement>(null)
  const puzzleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 随机生成拼图位置（在滑块的20%-80%之间）
    const minX = 20
    const maxX = 80
    const randomX = Math.floor(Math.random() * (maxX - minX) + minX)
    setTargetX(randomX)
    setPuzzleX(randomX)
  }, [])

  useEffect(() => {
    onVerify(verified)
  }, [verified, onVerify])

  function handleMouseDown(e: React.MouseEvent) {
    if (verified) return
    setIsDragging(true)
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging || verified) return
    if (!sliderRef.current) return

    const rect = sliderRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setPosition(percentage)

    // 检查是否接近目标位置（允许5%的误差）
    if (Math.abs(percentage - targetX) < 5) {
      setVerified(true)
      setPosition(targetX)
    }
  }

  function handleMouseUp() {
    if (verified) return
    setIsDragging(false)
    if (Math.abs(position - targetX) >= 5) {
      // 验证失败，重置
      setPosition(0)
    }
  }

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!sliderRef.current) return
        const rect = sliderRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
        setPosition(percentage)

        if (Math.abs(percentage - targetX) < 5) {
          setVerified(true)
          setPosition(targetX)
        }
      }

      const handleGlobalMouseUp = () => {
        setIsDragging(false)
        if (!verified && Math.abs(position - targetX) >= 5) {
          setPosition(0)
        }
      }

      window.addEventListener("mousemove", handleGlobalMouseMove)
      window.addEventListener("mouseup", handleGlobalMouseUp)

      return () => {
        window.removeEventListener("mousemove", handleGlobalMouseMove)
        window.removeEventListener("mouseup", handleGlobalMouseUp)
      }
    }
  }, [isDragging, position, targetX, verified])

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        请拖动滑块完成人机验证
      </div>
      <div
        ref={sliderRef}
        className="relative h-10 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* 背景轨道 */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-20" />
        
        {/* 拼图缺口位置（显示在目标位置） */}
        <div
          className="absolute top-0 bottom-0 w-12 border-2 border-dashed border-purple-500 dark:border-purple-400 opacity-30"
          style={{ left: `${targetX}%`, transform: "translateX(-50%)" }}
        />

        {/* 滑块 */}
        <div
          className={`absolute top-0 bottom-0 w-12 bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center transition-all duration-200 ${
            verified ? "opacity-100" : "opacity-90"
          }`}
          style={{ left: `${position}%`, transform: "translateX(-50%)" }}
        >
          {verified ? (
            <Check className="w-5 h-5 text-white" />
          ) : (
            <div className="w-6 h-6 bg-white rounded-full shadow-lg" />
          )}
        </div>

        {/* 提示文字 */}
        {!verified && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 pointer-events-none">
            {position === 0 ? "拖动滑块" : "继续拖动"}
          </div>
        )}
      </div>
      {verified && (
        <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <Check className="w-3 h-3" />
          验证成功
        </div>
      )}
    </div>
  )
}

