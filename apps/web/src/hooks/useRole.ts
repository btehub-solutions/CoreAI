import { useAuthStore } from "@/store/auth.store"

export function useRole() {
  const role = useAuthStore((s) => s.role)
  const isOwner = role === "owner"
  const isCashier = role === "cashier"
  return { role, isOwner, isCashier }
}
