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
  PlusCircleIcon as NewSaleIcon,
  Bars3Icon
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
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

  React.useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

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
    <div className="flex min-h-screen bg-transparent text-white">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col h-screen fixed lg:sticky top-0 z-50 transition-transform duration-300",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
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
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-300 rounded-xl relative group overflow-hidden",
                  isActive 
                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                    : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-50" />
                )}
                <Icon className={cn("h-5 w-5 relative z-10 transition-transform duration-300 group-hover:scale-110", isActive ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "text-gray-500")} />
                <span className="relative z-10">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-4 bg-black/20">
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
      <main className="flex-1 flex flex-col min-h-screen relative z-10 w-full lg:w-auto">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 lg:px-8 bg-[#0a0a0a]/60 backdrop-blur-2xl sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden text-gray-400 hover:text-white"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider hidden sm:block">
              {navItems.find(i => i.href === pathname)?.name || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{businessName}</span>
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-8 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
