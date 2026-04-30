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
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"
import { getErrorMessage } from "@/lib/utils"
const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email").trim(),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const response = await apiClient.post("/api/v1/auth/login", data)
      const { success, data: authData, detail } = response.data
      
      if (success) {
        setAuth({
          user: authData.user,
          business: authData.business,
          tokens: {
            access_token: authData.access_token,
            refresh_token: authData.refresh_token
          }
        })
        toast.success("Welcome back!")
        router.push("/dashboard")
      } else {
        toast.error(detail || "Login failed")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      toast.error(getErrorMessage(error, "Invalid email or password"))
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
              Welcome to <span className="text-white">Core</span>
              <span className="text-emerald-400">AI</span>
            </h1>
            <p className="text-sm text-gray-500">
              Sign in to your business dashboard
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            error={errors.email?.message}
            {...register("email")}
          />
          
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-8 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-emerald-500 font-semibold hover:text-emerald-400">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
