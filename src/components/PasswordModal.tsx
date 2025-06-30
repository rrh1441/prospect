"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const ACCESS_PHRASE = "IWantStatsNow26"
const STORAGE_KEY = "threat-dashboard-access"

interface PasswordModalProps {
  children: React.ReactNode
}

export function PasswordModal({ children }: PasswordModalProps) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)

  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "granted") {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  React.useEffect(() => {
    if (!isAuthenticated && !isLoading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAuthenticated, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password === ACCESS_PHRASE) {
      localStorage.setItem(STORAGE_KEY, "granted")
      setIsAuthenticated(true)
      setError("")
    } else {
      setError("Access denied. Please enter the correct phrase.")
      setPassword("")
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  if (isLoading) {
    return null
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" />
      <Dialog open={true}>
        <DialogContent 
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Access Required</DialogTitle>
            <DialogDescription>
              Please enter the access phrase to continue.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                placeholder="Enter access phrase"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError("")
                }}
                className="pr-10"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={togglePasswordVisibility}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {showPassword ? "Hide phrase" : "Show phrase"}
                </span>
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full">
              Access Dashboard
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}