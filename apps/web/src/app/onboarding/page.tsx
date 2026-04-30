"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LogoMark } from "@/components/ui/Logo"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useAuthStore } from "@/store/auth.store"
import apiClient from "@/lib/api-client"
import { SectorType } from "@/types/api.types"
import { cn } from "@/lib/utils"
import { 
  BuildingStorefrontIcon, 
  BeakerIcon, 
  CreditCardIcon, 
  CakeIcon, 
  WrenchIcon, 
  TruckIcon, 
  HomeIcon, 
  CommandLineIcon, 
  AcademicCapIcon, 
  VariableIcon, 
  EllipsisHorizontalIcon 
} from "@heroicons/react/24/outline"

const SECTORS: { id: SectorType; label: string; icon: any }[] = [
  { id: "supermarket", label: "Supermarket", icon: BuildingStorefrontIcon },
  { id: "pharmacy", label: "Pharmacy", icon: BeakerIcon },
  { id: "pos", label: "POS Point", icon: CreditCardIcon },
  { id: "food_vendor", label: "Food Vendor", icon: CakeIcon },
  { id: "fashion", label: "Fashion/Boutique", icon: WrenchIcon }, // Using Wrench as placeholder for Fashion if no better
  { id: "tech_repairs", label: "Tech Repairs", icon: CommandLineIcon },
  { id: "logistics", label: "Logistics", icon: TruckIcon },
  { id: "real_estate", label: "Real Estate", icon: HomeIcon },
  { id: "education", label: "Education", icon: AcademicCapIcon },
  { id: "agriculture", label: "Agriculture", icon: VariableIcon },
  { id: "other", label: "Other Business", icon: EllipsisHorizontalIcon },
]

const NIGERIAN_CITIES = [
  "Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", 
  "Enugu", "Benin City", "Kaduna", "Jos", "Abeokuta", "Other"
]

export default function OnboardingPage() {
  const router = useRouter()
  const { businessId, ownerName, setAuth } = useAuthStore()
  const [step, setStep] = useState(1)
  const [selectedSector, setSelectedSector] = useState<SectorType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    business_name: "",
    your_name: ownerName || "",
    phone: "",
    city: ""
  })

  const handleComplete = async () => {
    if (!selectedSector || !formData.business_name) return
    
    setIsLoading(true)
    try {
      // In a real app, this would be a PATCH to update the business created during signup
      // or a POST to /businesses
      // For now, we'll simulate the update
      await apiClient.post("/api/v1/auth/me", { // Using this as placeholder for update
        business_name: formData.business_name,
        sector: selectedSector,
        phone: formData.phone,
        city: formData.city
      })
      
      toast.success("Onboarding complete!")
      setStep(3)
    } catch (error) {
      setStep(3)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col p-6">
      <div className="max-w-2xl mx-auto w-full space-y-12 py-12">
        <div className="flex flex-col items-center space-y-4">
          <LogoMark className="w-12 h-12 rounded-xl" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {step === 1 ? "Choose your sector" : "Business details"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {step === 1 
                ? "Select the industry that best describes your business" 
                : "Tell us a bit more about your business"}
            </p>
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SECTORS.map((sector) => {
                const Icon = sector.icon
                const isSelected = selectedSector === sector.id
                return (
                  <button
                    key={sector.id}
                    onClick={() => setSelectedSector(sector.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all space-y-3 group",
                      isSelected 
                        ? "bg-[#0d1f17] border-emerald-500/50 text-emerald-400" 
                        : "bg-[#111111] border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a] hover:text-gray-200"
                    )}
                  >
                    <Icon className={cn("h-6 w-6", isSelected ? "text-emerald-500" : "text-gray-500 group-hover:text-gray-300")} />
                    <span className="text-xs font-semibold text-center">{sector.label}</span>
                  </button>
                )
              })}
            </div>
            
            <div className="flex justify-center">
              <Button 
                disabled={!selectedSector} 
                onClick={() => setStep(2)}
                className="w-full max-w-xs"
              >
                Continue
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-sm mx-auto space-y-6">
            {/* Sector confirmation card */}
            <div className="bg-[#0d1f17] border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                {selectedSector && React.createElement(SECTORS.find(s => s.id === selectedSector)?.icon, { className: "h-5 w-5 text-emerald-500" })}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-500/70">Selected Sector</p>
                <p className="text-sm font-semibold">{SECTORS.find(s => s.id === selectedSector)?.label}</p>
              </div>
              <button onClick={() => setStep(1)} className="ml-auto text-xs text-emerald-500 hover:underline">Change</button>
            </div>

            <div className="space-y-4">
              <Input 
                label="Business Name" 
                placeholder="e.g. Greens Supermarket" 
                value={formData.business_name}
                onChange={(e) => setFormData({...formData, business_name: e.target.value})}
              />
              <Input 
                label="Owner Name" 
                placeholder="Your full name"
                value={formData.your_name}
                onChange={(e) => setFormData({...formData, your_name: e.target.value})}
              />
              <Input 
                label="Phone Number" 
                placeholder="080 1234 5678"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400 ml-1">City</label>
                <select 
                  className="flex h-10 w-full bg-[#111111] border border-[#2a2a2a] rounded-xl px-4 text-sm text-gray-100 transition-colors focus:border-emerald-600 focus:outline-none"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                >
                  <option value="">Select city</option>
                  {NIGERIAN_CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button 
              className="w-full" 
              isLoading={isLoading} 
              disabled={!formData.business_name || !formData.city}
              onClick={handleComplete}
            >
              Finish Setup
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex flex-col items-center space-y-2 mb-8">
              <LogoMark className="w-12 h-12 rounded-xl" />
              <h2 className="text-2xl font-bold text-white">Stay informed</h2>
              <p className="text-sm text-gray-400 max-w-xs text-center">
                Get your daily business brief delivered to your inbox.
              </p>
            </div>

            {/* Email Preview Card */}
            <div className="w-full max-w-sm bg-[#111111] border border-[#2a2a2a] rounded-xl p-4 mb-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center text-[10px] font-bold">cAI</div>
                <span className="text-xs font-bold text-gray-200">CoreAI Daily Brief</span>
              </div>
              <div className="space-y-2 mb-6">
                <div className="h-2 bg-[#1a1a1a] rounded w-full" />
                <div className="h-2 bg-[#1a1a1a] rounded w-5/6" />
                <div className="h-2 bg-[#1a1a1a] rounded w-4/6" />
              </div>
              <div className="h-8 bg-emerald-600/20 border border-emerald-600/30 rounded-lg flex items-center justify-center">
                <span className="text-[10px] font-bold text-emerald-500 uppercase">See Tomorrow's Plan</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-8">Sent every evening at 7pm</p>

            <div className="w-full max-w-sm space-y-3">
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-11"
                isLoading={isLoading}
                onClick={async () => {
                  setIsLoading(true)
                  try {
                    await apiClient.patch("/api/v1/ai/email-preferences", { 
                      daily_brief_email_enabled: true 
                    })
                  } catch (e) {}
                  router.push("/dashboard")
                }}
              >
                Yes, send me daily briefs
              </Button>
              <button 
                onClick={() => router.push("/dashboard")}
                className="w-full h-11 border border-[#2a2a2a] rounded-xl text-sm text-gray-400 hover:bg-[#1a1a1a] transition-colors"
              >
                No thanks, I'll check the app
              </button>
            </div>

            <p className="text-xs text-gray-600 mt-6">
              You can change this anytime in Settings
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
