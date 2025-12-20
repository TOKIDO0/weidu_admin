"use client"

import { useEffect } from "react"

export const MOBILE_DRAWER_EVENT = "app-mobile-drawer"

export type MobileDrawerEventDetail = {
  isOpen: boolean
}

export function useMobileDrawerStatus(isOpen: boolean) {
  useEffect(() => {
    if (typeof window === "undefined") return
    const isMobile = window.matchMedia("(max-width: 1024px)").matches
    if (!isMobile) return
    window.dispatchEvent(
      new CustomEvent<MobileDrawerEventDetail>(MOBILE_DRAWER_EVENT, {
        detail: { isOpen },
      }),
    )
    return () => {
      if (!isOpen) return
      window.dispatchEvent(
        new CustomEvent<MobileDrawerEventDetail>(MOBILE_DRAWER_EVENT, {
          detail: { isOpen: false },
        }),
      )
    }
  }, [isOpen])
}
