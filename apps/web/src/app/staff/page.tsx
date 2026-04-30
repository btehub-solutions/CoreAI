"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  PlusIcon, 
  PencilSquareIcon, 
  PowerIcon,
  KeyIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline"
import { toast } from "sonner"
import DashboardLayout from "@/components/layout/DashboardLayout"
import apiClient from "@/lib/api-client"
import { formatNGN, cn, getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { SlideOver } from "@/components/ui/SlideOver"
import { Badge } from "@/components/ui/Badge"

const ROLE_COLORS: Record<string, "purple" | "blue" | "emerald" | "gray"> = {
  owner: "purple",
  manager: "blue",
  cashier: "emerald",
  worker: "gray"
}

export default function StaffPage() {
  const queryClient = useQueryClient()
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [accountStaff, setAccountStaff] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/staff")
      return res.data
    }
  })

  const deactivateMutation = useMutation({
    mutationFn: (staffId: string) => apiClient.patch(`/api/v1/staff/${staffId}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] })
      toast.success("Staff access deactivated")
    }
  })

  const staffList = data?.data || []
  const activeStaff = staffList.filter((s: any) => s.is_active)
  const totalPayroll = activeStaff.reduce((acc: number, s: any) => acc + (s.salary_kobo || 0), 0)

  const handleDeactivate = (staff: any) => {
    if (confirm(`Deactivate ${staff.full_name}'s access? This will disable their login and mark them as inactive.`)) {
      deactivateMutation.mutate(staff.id)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Staff</h1>
            <p className="text-sm text-gray-500">{activeStaff.length} active staff members</p>
          </div>
          <Button onClick={() => { setEditingStaff(null); setIsPanelOpen(true); }} className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            Add Staff
          </Button>
        </div>

        {/* Table */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#111111] text-[10px] uppercase tracking-widest font-bold text-gray-500">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Salary</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Account Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {staffList.map((s: any) => (
                  <tr key={s.id} className={cn("text-sm hover:bg-[#1a1a1a]/30 group", !s.is_active && "opacity-60")}>
                    <td className="px-6 py-4 font-semibold text-gray-200">{s.full_name}</td>
                    <td className="px-6 py-4">
                      <Badge variant={ROLE_COLORS[s.role.toLowerCase()] || "gray"} className="capitalize">
                        {s.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{s.phone || "N/A"}</td>
                    <td className="px-6 py-4 text-gray-400">{formatNGN(s.salary_kobo || 0)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase",
                        s.is_active ? "text-emerald-500" : "text-gray-500"
                      )}>
                        <div className={cn("h-1.5 w-1.5 rounded-full", s.is_active ? "bg-emerald-500" : "bg-gray-500")} />
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {s.user_id ? (
                        <Badge variant="emerald" className="flex items-center gap-1 w-fit">
                          <ShieldCheckIcon className="h-3 w-3" />
                          Has Login
                        </Badge>
                      ) : (
                        <Badge variant="gray" className="w-fit">No Login</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!s.user_id && s.is_active && (
                          <button 
                            onClick={() => { setAccountStaff(s); setIsAccountPanelOpen(true); }}
                            className="p-2 text-gray-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Create Login"
                          >
                            <KeyIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => { setEditingStaff(s); setIsPanelOpen(true); }}
                          className="p-2 text-gray-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        {s.is_active && (
                          <button 
                            onClick={() => handleDeactivate(s)}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Deactivate"
                          >
                            <PowerIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {staffList.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-gray-500 italic">No staff found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payroll Summary */}
        <div className="bg-gradient-to-br from-[#0f0f0f] to-[#0d0d0d] border border-[#1a1a1a] p-8 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Monthly Payroll Summary</h3>
            <p className="text-sm text-gray-500">Combined commitment for all active staff</p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Commitment</p>
            <p className="text-4xl font-black text-emerald-400">
              {formatNGN(totalPayroll)}
              <span className="text-sm text-gray-500 font-normal ml-2">/ month</span>
            </p>
          </div>
        </div>
      </div>

      <StaffPanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
        staff={editingStaff}
      />

      <AccountCreationPanel
        isOpen={isAccountPanelOpen}
        onClose={() => setIsAccountPanelOpen(false)}
        staff={accountStaff}
      />
    </DashboardLayout>
  )
}

function StaffPanel({ isOpen, onClose, staff }: any) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    role: "worker",
    salary_ngn: 0
  })

  React.useEffect(() => {
    if (staff) {
      setFormData({
        full_name: staff.full_name,
        phone: staff.phone || "",
        role: staff.role.toLowerCase(),
        salary_ngn: (staff.salary_kobo || 0) / 100
      })
    } else {
      setFormData({
        full_name: "",
        phone: "",
        role: "worker",
        salary_ngn: 0
      })
    }
  }, [staff, isOpen])

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (staff) return apiClient.patch(`/api/v1/staff/${staff.id}`, data)
      return apiClient.post("/api/v1/staff", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] })
      toast.success(staff ? "Staff updated" : "Staff added")
      onClose()
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, "Failed to save staff member"))
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name) {
      toast.error("Full name is required")
      return
    }
    mutation.mutate({
      ...formData,
      salary_kobo: Math.round(formData.salary_ngn * 100)
    })
  }

  return (
    <SlideOver 
      isOpen={isOpen} 
      onClose={onClose} 
      title={staff ? "Edit Staff" : "Add Staff Member"}
      footer={
        <Button onClick={handleSubmit} className="w-full" isLoading={mutation.isPending}>
          {staff ? "Save Changes" : "Add Staff"}
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input 
          label="Full Name" 
          placeholder="e.g. John Doe" 
          value={formData.full_name} 
          onChange={(e) => setFormData({...formData, full_name: e.target.value})} 
          required
        />
        
        <Input 
          label="Phone Number" 
          placeholder="e.g. 08012345678" 
          value={formData.phone} 
          onChange={(e) => setFormData({...formData, phone: e.target.value})} 
        />

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Role</label>
          <select 
            className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none appearance-none"
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
          >
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
            <option value="worker">Worker</option>
          </select>
        </div>

        <Input 
          label="Monthly Salary (NGN)" 
          type="number" 
          value={formData.salary_ngn} 
          onChange={(e) => setFormData({...formData, salary_ngn: parseFloat(e.target.value) || 0})} 
        />
      </form>
    </SlideOver>
  )
}

function AccountCreationPanel({ isOpen, onClose, staff }: any) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role: "cashier"
  })

  React.useEffect(() => {
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      role: "cashier"
    })
  }, [staff, isOpen])

  const mutation = useMutation({
    mutationFn: (data: any) => apiClient.post("/api/v1/staff/create-account", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] })
      toast.success(`Login created for ${staff?.full_name}`)
      onClose()
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, "Failed to create account"))
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email || !formData.password) {
      toast.error("Email and password are required")
      return
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    mutation.mutate({
      staff_id: staff.id,
      email: formData.email,
      password: formData.password,
      role: formData.role
    })
  }

  return (
    <SlideOver 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Create Login for ${staff?.full_name}`}
      footer={
        <Button onClick={handleSubmit} className="w-full" isLoading={mutation.isPending}>
          Create Account
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <p className="text-sm text-gray-400">
          Set up login credentials for this staff member. They will be able to log in with these details immediately.
        </p>

        <Input 
          label="Email Address" 
          type="email"
          placeholder="staff@example.com" 
          value={formData.email} 
          onChange={(e) => setFormData({...formData, email: e.target.value})} 
          required
        />
        
        <Input 
          label="Password" 
          type="password"
          placeholder="Min 8 characters" 
          value={formData.password} 
          onChange={(e) => setFormData({...formData, password: e.target.value})} 
          required
        />

        <Input 
          label="Confirm Password" 
          type="password"
          placeholder="Repeat password" 
          value={formData.confirmPassword} 
          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
          required
        />

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Login Role</label>
          <select 
            className="w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none appearance-none"
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
          >
            <option value="cashier">Cashier (Sales Only)</option>
            <option value="owner">Owner (Full Access)</option>
          </select>
        </div>
      </form>
    </SlideOver>
  )
}
