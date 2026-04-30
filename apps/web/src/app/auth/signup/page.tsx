"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { LogoMark } from "@/components/ui/Logo"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { useAuthStore } from "@/store/auth.store"
import apiClient from "@/lib/api-client"

const signupSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string()
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
})

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true)
    try {
      const { confirm_password, ...signupData } = data
      const payload = {
        ...signupData,
        business_name: "My New Business",
        sector: "other",
      }
      
      const response = await apiClient.post("/api/v1/auth/signup", payload)
      const { success, data: authData } = response.data
      
      if (success) {
        setAuth({
          user: authData.user,
          business: authData.business,
          tokens: {
            access_token: authData.access_token,
            refresh_token: authData.refresh_token
          }
        })
        toast.success("Account created!")
        router.push("/onboarding")
      }
    } catch (error: any) {
      console.error("Signup error:", error)
      const detail = error.response?.data?.detail
      const msg = typeof detail === "string" 
        ? detail 
        : Array.isArray(detail) 
          ? detail[0]?.msg 
          : "Signup failed. Email might already be taken."
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <LogoMark />
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Create Account
            </h1>
            <p className="text-sm text-gray-500">
              Start managing your business smarter
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="John Doe"
            error={errors.full_name?.message}
            {...register("full_name")}
          />
          <Input
            label="Email Address"
            placeholder="john@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            error={errors.confirm_password?.message}
            {...register("confirm_password")}
          />

          <div className="pt-2">
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Create Account
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-emerald-500 font-semibold hover:text-emerald-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
