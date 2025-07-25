'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Cpu, ArrowLeft, Trash2, Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Dynamically import SensorDataPanel to handle client-side only functionality
const SensorDataPanel = dynamic(() => import('@/components/SensorDataPanel'), {
  ssr: false,
  loading: () => (
    <div className="h-40 flex items-center justify-center bg-white/5 rounded-lg border border-white/10">
      <div className="flex flex-col items-center">
        <Cpu className="h-8 w-8 text-primary animate-pulse" />
        <p className="mt-2 text-sm text-white/70">Loading IoT data...</p>
      </div>
    </div>
  )
})

export default function IoTDashboardPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        {/* Optional: Add back button if needed, or remove if header nav is sufficient */}
        {/* <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link> */}
        <Cpu className="h-8 w-8 text-primary" />
        <h1 className="text-3xl md:text-4xl font-bold text-white">IoT Bin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Live Sensor Readings Panel */}
        <div className="lg:col-span-2">
          <section className="rounded-xl overflow-hidden glass-effect p-6">
            <div className="flex items-center mb-4">
              <Activity className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-xl font-semibold text-white">Live Bin Sensor Readings</h2>
            </div>
            <p className="text-white/70 mb-6 text-sm">
              Real-time data from ThingSpeak, updated every 15 seconds. Displays the current fill level and other available sensor metrics.
            </p>
            <div className="bg-card/50 backdrop-blur-md border border-white/10 p-4 rounded-lg">
              <Suspense fallback={
                <div className="h-40 flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <Cpu className="h-8 w-8 text-primary animate-pulse" />
                    <p className="mt-2 text-sm text-white/70">Loading IoT data...</p>
                  </div>
                </div>
              }>
                <SensorDataPanel />
              </Suspense>
            </div>
          </section>
        </div>

        {/* Bin Status Guide Panel */}
        <div className="lg:col-span-1">
          <section className="rounded-xl overflow-hidden glass-effect p-6 sticky top-24">
            <div className="flex items-center mb-4">
              <Trash2 className="h-6 w-6 text-primary mr-3" />
              <h2 className="text-xl font-semibold text-white">Bin Status Guide</h2>
            </div>
            <p className="text-white/70 mb-6 text-sm">
              Understand the fill level indicator based on ultrasonic sensor distance readings.
            </p>
            <div className="space-y-4">
              {/* Low Fill Level */}
              <div className="flex items-start p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="h-3 w-3 rounded-full bg-green-500 mr-3 mt-1 flex-shrink-0"></div>
                <div>
                  <h3 className="text-sm font-medium text-white">Low (0-30%)</h3>
                  <p className="text-xs text-white/70">Bin is mostly empty. No immediate action needed.</p>
                </div>
              </div>
              {/* Medium Fill Level */}
              <div className="flex items-start p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="h-3 w-3 rounded-full bg-yellow-500 mr-3 mt-1 flex-shrink-0"></div>
                <div>
                  <h3 className="text-sm font-medium text-white">Medium (30-70%)</h3>
                  <p className="text-xs text-white/70">Bin is partially full. Plan collection soon.</p>
                </div>
              </div>
              {/* High Fill Level */}
              <div className="flex items-start p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="h-3 w-3 rounded-full bg-red-500 mr-3 mt-1 flex-shrink-0"></div>
                <div>
                  <h3 className="text-sm font-medium text-white">High (70%+)</h3>
                  <p className="text-xs text-white/70">Bin is nearly full. Schedule collection immediately.</p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <Link href="/collect">
                  <Button className="bg-primary hover:bg-primary/90 w-full">
                    View Collection Tasks
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
} 