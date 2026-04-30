import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "@/store/auth.store"

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request Interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      const { refreshToken, setTokens, logout } = useAuthStore.getState()
      
      if (!refreshToken) {
        logout()
        if (typeof window !== "undefined") window.location.href = "/auth/login"
        return Promise.reject(error)
      }
      
      try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
          refresh_token: refreshToken
        })
        
        if (response.data.success) {
          const { access_token, refresh_token } = response.data.data
          setTokens(access_token, refresh_token)
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`
          }
          
          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        logout()
        if (typeof window !== "undefined") window.location.href = "/auth/login"
        return Promise.reject(refreshError)
      }
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
