export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: {
    page: number
    per_page: number
    total: number
  }
}

export type SectorType = 
  | "supermarket" 
  | "pharmacy" 
  | "pos" 
  | "food_vendor" 
  | "fashion" 
  | "logistics" 
  | "real_estate" 
  | "tech_repairs" 
  | "education" 
  | "agriculture" 
  | "other"

export type UserRole = "owner" | "cashier"
