"use client"

import DashboardHome from '@/app/(dashboard)/page'
import DashboardLayout from '@/app/(dashboard)/layout'

export default function DashboardWrapper() {
  return (
    <DashboardLayout>
      <DashboardHome />
    </DashboardLayout>
  )
}

