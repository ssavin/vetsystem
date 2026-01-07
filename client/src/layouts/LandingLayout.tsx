import { ReactNode } from "react"
import LandingHeader from "@/components/landing/LandingHeader"
import LandingFooter from "@/components/landing/LandingFooter"

interface LandingLayoutProps {
  children: ReactNode
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  )
}
