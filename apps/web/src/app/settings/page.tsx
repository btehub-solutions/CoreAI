"use client"

import React, { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { 
  BuildingOfficeIcon, 
  MapPinIcon, 
  UserIcon, 
  LockClosedIcon,
  ExclamationTriangleIcon,
  TagIcon,
  SparklesIcon
} from "@heroicons/react/24/outline"
import DashboardLayout from "@/components/layout/DashboardLayout"
import apiClient from "@/lib/api-client"
import { useAuthStore } from "@/store/auth.store"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { SectorType } from "@/types/api.types"
import { cn, getErrorMessage } from "@/lib/utils"
import { useQueryClient } from "@tanstack/react-query"

export default function SettingsPage() {
  const router = useRouter()
  const { 
    businessName, 
    city, 
    sector, 
    updateBusiness, 
    updateCity, 
    updateSector, 
    logout 
  } = useAuthStore()

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/auth/me")
      return res.data.data
    }
  })

  const queryClient = useQueryClient()
  const emailPrefMutation = useMutation({
    mutationFn: (enabled: boolean) => 
      apiClient.patch("/api/v1/ai/email-preferences", { 
        daily_brief_email_enabled: enabled 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] })
      toast.success("Email preferences saved")
    }
  })

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    business_name: "",
    owner_name: "",
    phone: "",
    city: "",
    state: ""
  })

  React.useEffect(() => {
    if (me) {
      setProfileForm({
        business_name: me.business?.name || "",
        owner_name: me.full_name || "",
        phone: me.phone || "",
        city: me.business?.city || "",
        state: me.business?.state || ""
      })
    }
  }, [me])

  const profileMutation = useMutation({
    mutationFn: (data: any) => apiClient.patch("/api/v1/businesses", data),
    onSuccess: (res) => {
      const updated = res.data.data
      updateBusiness(updated.name)
      if (updated.city) updateCity(updated.city)
      toast.success("Profile updated")
    }
  })

  // Sector Change
  const [showSectorConfirm, setShowSectorConfirm] = useState(false)
  const [newSector, setNewSector] = useState<SectorType | "">("")

  const sectorMutation = useMutation({
    mutationFn: (sector: SectorType) => apiClient.patch("/api/v1/businesses", { sector }),
    onSuccess: (res) => {
      updateSector(res.data.data.sector)
      toast.success("Sector updated")
      router.push("/dashboard")
    }
  })

  // Password Change
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_new_password: ""
  })

  const passwordMutation = useMutation({
    mutationFn: (data: any) => apiClient.post("/api/v1/auth/change-password", data),
    onSuccess: () => {
      toast.success("Password changed successfully")
      setPasswordForm({ current_password: "", new_password: "", confirm_new_password: "" })
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, "Failed to change password"))
    }
  })

  // Delete Account
  const [deleteConfirmName, setDeleteConfirmName] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete("/api/v1/users/me"),
    onSuccess: () => {
      toast.success("Account deleted")
      logout()
      router.push("/")
    }
  })

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault()
    // Only send changed fields
    const changes: any = {}
    if (profileForm.business_name !== me.business?.name) changes.name = profileForm.business_name
    if (profileForm.city !== me.business?.city) changes.city = profileForm.city
    if (profileForm.state !== me.business?.state) changes.state = profileForm.state
    
    if (Object.keys(changes).length > 0) {
      profileMutation.mutate(changes)
    } else {
      toast.info("No changes to save")
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_new_password) {
      toast.error("New passwords do not match")
      return
    }
    passwordMutation.mutate(passwordForm)
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-12 pb-24">
        <div>
          <h1 className="text-3xl font-black text-white">Settings</h1>
          <p className="text-gray-500">Manage your business profile and account preferences</p>
        </div>

        {/* Business Profile */}
        <section className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-[#1a1a1a] bg-[#111111]/50 flex items-center gap-3">
            <BuildingOfficeIcon className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold">Business Profile</h2>
          </div>
          <form onSubmit={handleProfileSave} className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Business Name" 
                value={profileForm.business_name} 
                onChange={(e) => setProfileForm({...profileForm, business_name: e.target.value})} 
              />
              <Input 
                label="Owner Name" 
                value={profileForm.owner_name} 
                disabled
                className="opacity-60 cursor-not-allowed"
              />
              <Input 
                label="Phone" 
                value={profileForm.phone} 
                disabled
                className="opacity-60 cursor-not-allowed"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="City" 
                  value={profileForm.city} 
                  onChange={(e) => setProfileForm({...profileForm, city: e.target.value})} 
                />
                <Input 
                  label="State" 
                  value={profileForm.state} 
                  onChange={(e) => setProfileForm({...profileForm, state: e.target.value})} 
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={profileMutation.isPending}>Save Profile</Button>
            </div>
          </form>
        </section>

        {/* Sector */}
        <section className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-[#1a1a1a] bg-[#111111]/50 flex items-center gap-3">
            <TagIcon className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-bold">Sector</h2>
          </div>
          <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <TagIcon className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-200">Current Operating Sector</p>
                <Badge variant="blue" className="mt-1 text-[12px] px-3 py-1">{sector?.replace("_", " ")}</Badge>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowSectorConfirm(true)}>Change Sector</Button>
          </div>
        </section>

        {/* Notifications (Locked for v1) */}
        {false && (
        <section className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-[#1a1a1a] bg-[#111111]/50 flex items-center gap-3">
            <SparklesIcon className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold">Notifications</h2>
          </div>
          <div className="p-8">
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-200">Daily Brief Email</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Receive your business summary every evening at 7pm
                </p>
                <p className="text-[10px] text-emerald-600 font-medium mt-1">
                  Delivered to: {me?.email}
                </p>
              </div>
              
              <button
                onClick={() => emailPrefMutation.mutate(!me?.daily_brief_email_enabled)}
                disabled={emailPrefMutation.isPending}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  me?.daily_brief_email_enabled ? "bg-emerald-600" : "bg-[#2a2a2a]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    me?.daily_brief_email_enabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </section>
        )}

        {/* Account */}
        <section className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-[#1a1a1a] bg-[#111111]/50 flex items-center gap-3">
            <UserIcon className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-bold">Account</h2>
          </div>
          <div className="p-8 space-y-12">
            {/* Email (Read Only) */}
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-[#1a1a1a] rounded-xl flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Email Address</p>
                <p className="text-sm text-gray-200">{me?.email}</p>
              </div>
            </div>

            {/* Password Change */}
            <div className="pt-8 border-t border-[#1a1a1a] space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <LockClosedIcon className="h-4 w-4 text-gray-400" />
                <h3 className="font-bold">Change Password</h3>
              </div>
              <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <Input 
                  label="Current Password" 
                  type="password" 
                  value={passwordForm.current_password} 
                  onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})} 
                />
                <Input 
                  label="New Password" 
                  type="password" 
                  value={passwordForm.new_password} 
                  onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})} 
                />
                <div className="space-y-4">
                  <Input 
                    label="Confirm New Password" 
                    type="password" 
                    value={passwordForm.confirm_new_password} 
                    onChange={(e) => setPasswordForm({...passwordForm, confirm_new_password: e.target.value})} 
                  />
                  <Button type="submit" className="w-full" isLoading={passwordMutation.isPending}>Update Password</Button>
                </div>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="pt-8 border-t border-[#1a1a1a]">
               <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-4">
                   <div className="h-12 w-12 bg-red-500/10 rounded-2xl flex items-center justify-center shrink-0">
                     <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                   </div>
                   <div>
                     <h4 className="font-bold text-red-500">Delete Account</h4>
                     <p className="text-xs text-gray-500 max-w-sm">This action is permanent and will delete all your data including sales, inventory, and staff records.</p>
                   </div>
                 </div>
                 <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>Delete Account</Button>
               </div>
            </div>
          </div>
        </section>
      </div>

      {/* Sector Change Modal */}
      {showSectorConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-[2.5rem] p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div className="h-16 w-16 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-4">
              <TagIcon className="h-8 w-8 text-blue-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Change Business Sector?</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Changing sector will update your dashboard configuration to better suit your new business type. 
                <span className="text-gray-300 font-medium"> All your existing data is preserved.</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-gray-500 tracking-widest">Select New Sector</label>
              <select 
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                value={newSector}
                onChange={(e) => setNewSector(e.target.value as SectorType)}
              >
                <option value="">Choose sector...</option>
                <option value="supermarket">Supermarket</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="pos">POS Business</option>
                <option value="food_vendor">Food & Restaurant</option>
                <option value="fashion">Fashion & Lifestyle</option>
                <option value="logistics">Logistics</option>
                <option value="real_estate">Real Estate</option>
                <option value="tech_repairs">Tech & Repairs</option>
                <option value="education">Education</option>
                <option value="agriculture">Agriculture</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="ghost" className="flex-1" onClick={() => setShowSectorConfirm(false)}>Cancel</Button>
              <Button 
                className="flex-1 bg-blue-500 hover:bg-blue-600 shadow-blue-500/20" 
                disabled={!newSector || newSector === sector}
                onClick={() => sectorMutation.mutate(newSector as SectorType)}
                isLoading={sectorMutation.isPending}
              >
                Confirm Change
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-[2.5rem] p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div className="h-16 w-16 bg-red-500/10 rounded-3xl flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Are you absolutely sure?</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                This action is irreversible. To confirm, please type your business name: 
                <span className="text-red-400 font-bold block mt-1">{businessName}</span>
              </p>
            </div>

            <Input 
              placeholder="Type business name here" 
              value={deleteConfirmName} 
              onChange={(e) => setDeleteConfirmName(e.target.value)} 
            />

            <div className="flex gap-3 pt-4">
              <Button variant="ghost" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button 
                variant="danger" 
                className="flex-1" 
                disabled={deleteConfirmName !== businessName}
                onClick={() => deleteMutation.mutate()}
                isLoading={deleteMutation.isPending}
              >
                Delete Everything
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
