import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { SectorType, UserRole } from "@/types/api.types"

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  userId: string | null
  businessId: string | null
  businessName: string | null
  ownerName: string | null
  sector: SectorType | null
  city: string | null
  role: UserRole | null
  isAuthenticated: boolean
  
  setAuth: (data: {
    user: { id: string; full_name: string; role: UserRole }
    business: { id: string; name: string; sector: SectorType; city: string | null }
    tokens: { access_token: string; refresh_token: string }
  }) => void
  
  setTokens: (access_token: string, refresh_token: string) => void
  
  updateBusiness: (name: string) => void
  updateSector: (sector: SectorType) => void
  updateCity: (city: string) => void
  
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      businessId: null,
      businessName: null,
      ownerName: null,
      sector: null,
      city: null,
      role: null,
      isAuthenticated: false,

      setAuth: (data) => set({
        accessToken: data.tokens.access_token,
        refreshToken: data.tokens.refresh_token,
        userId: data.user.id,
        businessId: data.business.id,
        businessName: data.business.name,
        ownerName: data.user.full_name,
        sector: data.business.sector,
        city: data.business.city,
        role: data.user.role,
        isAuthenticated: true,
      }),

      setTokens: (access_token, refresh_token) => set({
        accessToken: access_token,
        refreshToken: refresh_token,
      }),

      updateBusiness: (name) => set({ businessName: name }),
      updateSector: (sector) => set({ sector: sector }),
      updateCity: (city) => set({ city: city }),

      logout: () => set({
        accessToken: null,
        refreshToken: null,
        userId: null,
        businessId: null,
        businessName: null,
        ownerName: null,
        sector: null,
        city: null,
        role: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: "coreai-auth",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
