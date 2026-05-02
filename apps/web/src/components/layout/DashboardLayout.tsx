"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/ui/Logo"
import { useAuthStore } from "@/store/auth.store"
import { useRole } from "@/hooks/useRole"
import { 
  Squares2X2Icon as DashboardIcon, 
  ShoppingBagIcon as ProductsIcon, 
  ShoppingCartIcon as SalesIcon, 
  ReceiptPercentIcon as ExpensesIcon, 
  ArrowPathIcon as RefundsIcon, 
  UsersIcon as StaffIcon, 
  Cog6ToothIcon as SettingsIcon,
  ArrowLeftOnRectangleIcon as LogoutIcon,
  ClipboardDocumentListIcon as AuditIcon,
  SparklesIcon as AIIcon,
  SunIcon as TomorrowIcon,
  PlusCircleIcon as NewSaleIcon
} from "@heroicons/react/24/outline"
import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/api-client"
import { 
  Squares2X2Icon as DashboardIconSolid, 
  ShoppingBagIcon as ProductsIconSolid, 
  ShoppingCartIcon as SalesIconSolid, 
  ReceiptPercentIcon as ExpensesIconSolid, 
  ArrowPathIcon as RefundsIconSolid, 
  UsersIcon as StaffIconSolid, 
  Cog6ToothIcon as SettingsIconSolid,
  ClipboardDocumentListIcon as AuditIconSolid,
  SparklesIcon as AIIconSolid,
  SunIcon as TomorrowIconSolid,
  PlusCircleIcon as NewSaleIconSolid
} from "@heroicons/react/24/solid"

const OWNER_NAV = [
  { name: "Dashboard", href: "/dashboard", icon: DashboardIcon, activeIcon: DashboardIconSolid },
  { name: "Products", href: "/products", icon: ProductsIcon, activeIcon: ProductsIconSolid },
  { name: "Sales", href: "/sales", icon: SalesIcon, activeIcon: SalesIconSolid },
  { name: "Expenses", href: "/expenses", icon: ExpensesIcon, activeIcon: ExpensesIconSolid },
  { name: "Refunds", href: "/refunds", icon: RefundsIcon, activeIcon: RefundsIconSolid },
  { name: "Staff", href: "/staff", icon: StaffIcon, activeIcon: StaffIconSolid },
  { name: "Activity Log", href: "/audit-logs", icon: AuditIcon, activeIcon: AuditIconSolid },
  // { name: "Insights", href: "/insights", icon: AIIcon, activeIcon: AIIconSolid }, // Locked for v2
  // { name: "Tomorrow", href: "/tomorrow", icon: TomorrowIcon, activeIcon: TomorrowIconSolid }, // Locked for v2
  { name: "Settings", href: "/settings", icon: SettingsIcon, activeIcon: SettingsIconSolid },
]

const CASHIER_NAV = [
  { name: "New Sale", href: "/sales/new", icon: NewSaleIcon, activeIcon: NewSaleIconSolid },
  { name: "My Sales", href: "/sales", icon: SalesIcon, activeIcon: SalesIconSolid },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)
  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const { ownerName, businessName, logout, isAuthenticated, role, setAuth } = useAuthStore()
  const { isOwner, isCashier } = useRole()

  // Re-fetch profile if role is missing but authenticated
  const { data: profileData, isLoading: isFetchingProfile, isError: fetchProfileError } = useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/auth/me")
      return res.data
    },
    enabled: isAuthenticated && !role,
    retry: false
  })

  React.useEffect(() => {
    if (profileData && !role) {
      setAuth({
        user: { id: profileData.id, full_name: profileData.full_name, role: profileData.role },
        business: { 
          id: profileData.business_id, 
          name: profileData.business_name, 
          sector: profileData.business_sector,
          city: profileData.business_city 
        },
        tokens: { 
          access_token: useAuthStore.getState().accessToken!, 
          refresh_token: useAuthStore.getState().refreshToken! 
        }
      })
    }
  }, [profileData, role, setAuth])

  React.useEffect(() => {
    if (fetchProfileError) {
      logout()
      router.push("/auth/login")
    }
  }, [fetchProfileError, logout, router])

  const navItems = isOwner ? OWNER_NAV : CASHIER_NAV
  const CASHIER_ALLOWED = ["/sales", "/sales/new"]

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login")
      return
    }

    if (isCashier && !CASHIER_ALLOWED.some(p => pathname.startsWith(p))) {
      router.replace("/sales/new")
    }
  }, [isAuthenticated, isCashier, pathname, router])

  const handleLogout = () => {
    logout()
    router.push("/auth/login")
  }

  if (!isAuthenticated || (isAuthenticated && !role && isFetchingProfile)) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center space-y-4">
        <Logo />
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <div className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Synchronizing Security...
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f0f0f] border-r border-[#1a1a1a] flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <Logo />
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = isActive ? item.activeIcon : item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-xl",
                  isActive 
                    ? "bg-[#0d1f17] text-emerald-400" 
                    : "text-gray-500 hover:text-gray-200 hover:bg-[#1a1a1a]"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-emerald-400" : "text-gray-500")} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[#1a1a1a] space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs">
              {ownerName?.split(" ").map(n => n[0]).join("") || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{ownerName || "User"}</p>
              <p className="text-[10px] text-gray-500 truncate">
                {!role ? "Loading..." : isOwner ? "Owner" : "Cashier"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all"
          >
            <LogoutIcon className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-[#1a1a1a] flex items-center justify-between px-8 bg-[#0a0a0a]/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {navItems.find(i => i.href === pathname)?.name || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{businessName}</span>
            </div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
