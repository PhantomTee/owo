"use client"

import dynamic from "next/dynamic"

const EmployerDashboardClient = dynamic(() => import("@/components/employer-dashboard-client"), {
  ssr: false,
  loading: () => <main className="min-h-screen bg-cream p-6 text-forest">Loading employer dashboard...</main>
})

export function EmployerDashboardShell() {
  return <EmployerDashboardClient />
}
