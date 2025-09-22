import React from "react"
import type { Metadata } from "next"
import { Mona_Sans as FontSans } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-provider"
import { ProfileProvider } from "@/lib/profile-context"
import { FileProvider } from "@/lib/file-context"
import { AIToneProvider } from "@/lib/ai-tone-context"
import { CreditProvider } from "@/lib/credit-context"
import { SavedItemsProvider } from "@/lib/saved-items-context"
import { QueryClientProvider } from "@/lib/query-provider"
import { ShoppingModeProvider } from "@/lib/shopping-mode-context"
import { marketplaceService } from "@/lib/marketplace-service"
import CreditGuard from "@/components/CreditGuard"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import PricingModalProvider from "@/components/PricingModalProvider"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Flair.Social | Personalized AI Shopping Assistant",
  description: "Discover and Online Shop with AI and Friends",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} font-sans bg-black text-white antialiased`} suppressHydrationWarning>
        <QueryClientProvider>
          <AuthProvider>
            <CreditProvider>
              <ProfileProvider>
                <SavedItemsProvider>
                  <FileProvider>
                    <AIToneProvider>
                      <ShoppingModeProvider>
                        <ThemeProvider
                          attribute="class"
                          defaultTheme="dark"
                          enableSystem={false}
                          forcedTheme="dark"
                          disableTransitionOnChange
                        >
                        <PricingModalProvider>
                        <CreditGuard>
                        <div className="flex min-h-screen">
                          <Sidebar />
                          <div className="flex-1 md:ml-16 transition-all duration-300 pb-16 md:pb-0">
                            <Header />
                            <main className="flex-1 overflow-y-auto">{children}</main>
                          </div>
                        </div>
                      </CreditGuard>
                      </PricingModalProvider>
                      </ThemeProvider>
                      </ShoppingModeProvider>
                    </AIToneProvider>
                  </FileProvider>
                </SavedItemsProvider>
              </ProfileProvider>
            </CreditProvider>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
