"use client"

import { useState, useEffect } from "react"
import { Inter } from 'next/font/google'
import "./globals.css"
import Header from "@/components/Header"
import 'leaflet/dist/leaflet.css'
import { Toaster } from 'react-hot-toast'
import { getAvailableRewards, getUserByEmail } from '@/utils/db/actions'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const fetchTotalEarnings = async () => {
      try {
        const userEmail = localStorage.getItem('userEmail')
        if (userEmail) {
          const user = await getUserByEmail(userEmail)
          console.log('user from layout', user);

          if (user) {
            const availableRewards = await getAvailableRewards(user.id) as any
            console.log('availableRewards from layout', availableRewards);

            setTotalEarnings(availableRewards)
          }
        }
      } catch (error) {
        console.error('Error fetching total earnings:', error)
      }
    }

    fetchTotalEarnings()
  }, [])

  const toggleMenu = () => {
    setMenuOpen(prev => !prev)
  }

  return (
    <html lang="en" className="dark">
      <head>
        <title>WastiFY - Eco-Friendly Waste Management</title>
        <meta name="description" content="Join our community in making resource utilization more efficient and rewarding!" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.className} min-h-screen bg-gradient-to-b from-[#0A0F1C] to-[#121725] overflow-x-hidden`}>
        <div className="flex flex-col min-h-screen">
          <Header totalEarnings={totalEarnings} onMenuClick={toggleMenu} />
          
          <main className="flex-1 container mx-auto relative pt-6">
            {children}
          </main>
          
          <footer className="border-t border-white/10 py-6 bg-[#0A0F1C]/50 backdrop-blur-md">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center mb-4 md:mb-0">
                  <span className="text-white/70 text-sm">© 2023 WastiFY - All rights reserved</span>
                </div>
                <div className="flex gap-6">
                  <a href="#" className="text-white/60 hover:text-primary text-sm">Privacy Policy</a>
                  <a href="#" className="text-white/60 hover:text-primary text-sm">Terms of Service</a>
                  <a href="#" className="text-white/60 hover:text-primary text-sm">Contact</a>
                </div>
              </div>
            </div>
          </footer>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#0A0F1C',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
            },
          }}
        />
      </body>
    </html>
  )
}
