// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import { ArrowRight, Globe, Recycle, Users, Coins, MapPin, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Poppins } from 'next/font/google'
import Link from 'next/link'
import { getRecentReports, getAllRewards, getWasteCollectionTasks } from '@/utils/db/actions'

const poppins = Poppins({
  weight: ['300', '400', '600'],
  subsets: ['latin'],
  display: 'swap',
})

function AnimatedGlobe() {
  return (
    <div className="relative w-32 h-32 mx-auto mb-8">
      <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20 animate-pulse"></div>
      <div className="absolute inset-2 rounded-full bg-blue-300 opacity-20 animate-spin-slow"></div>
      <div className="absolute inset-4 rounded-full bg-blue-300 opacity-50 animate-ping"></div>
      {/*<div className="absolute inset-6 rounded-full bg-blue-200 opacity-80 animate-bounce"></div>*/}
      <Recycle className="absolute inset-0 m-auto h-20 w-20 text-gray-200 animate-spin-slow" /> {/* Changed animation to bounce */}
    </div>
  );
}


export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [impactData, setImpactData] = useState({
    wasteCollected: 0,
    reportsSubmitted: 0,
    tokensEarned: 0,
    co2Offset: 0
  });

  useEffect(() => {
    async function fetchImpactData() {
      try {
        const reports = await getRecentReports(100);  // Fetch last 100 reports
        const rewards = await getAllRewards();
        const tasks = await getWasteCollectionTasks(100);  // Fetch last 100 tasks

        const wasteCollected = tasks.reduce((total, task) => {
          const match = task.amount.match(/(\d+(\.\d+)?)/);
          const amount = match ? parseFloat(match[0]) : 0;
          return total + amount;
        }, 0);

        const reportsSubmitted = reports.length;
        const tokensEarned = rewards.reduce((total, reward) => total + (reward.points || 0), 0);
        const co2Offset = wasteCollected * 0.5;  // Assuming 0.5 kg CO2 offset per kg of waste

        setImpactData({
          wasteCollected: Math.round(wasteCollected * 10) / 10, // Round to 1 decimal place
          reportsSubmitted,
          tokensEarned,
          co2Offset: Math.round(co2Offset * 10) / 10 // Round to 1 decimal place
        });
      } catch (error) {
        console.error("Error fetching impact data:", error);
        setImpactData({
          wasteCollected: 0,
          reportsSubmitted: 0,
          tokensEarned: 0,
          co2Offset: 0
        });
      }
    }

    fetchImpactData();
  }, []);

  const login = () => {
    setLoggedIn(true);
  };

  return (
    <div className={`container mx-auto px-4 py-16 ${poppins.className}`}>
      <section className="text-center mb-20">
        <AnimatedGlobe />
        <h1 className="text-6xl font-bold mb-6 text-gray-200 tracking-tight">
          WastiFY - Waste Management
        </h1>
        <p className="text-xl text-white max-w-2xl mx-auto leading-relaxed mb-8">
          Join our community in making resource utilization more efficient and rewarding!
        </p>
        {!loggedIn ? (
          <Button onClick={login} className="bg-blue-600 hover:bg-blue-700 text-white text-lg py-6 px-10 rounded-full font-medium transition-all duration-300 ease-in-out transform hover:scale-105">
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        ) : (
          <Link href="/report">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white text-lg py-6 px-10 rounded-full font-medium transition-all duration-300 ease-in-out transform hover:scale-105">
              Report Waste
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        )}
      </section>

      <section className="grid md:grid-cols-3 gap-10 mb-20">
        <FeatureCard
          icon={Globe}
          title="Eco-Friendly"
          description="Contribute to a cleaner environment by reporting and collecting waste."
        />
        <FeatureCard
          icon={Coins}
          title="Earn Rewards"
          description="Get tokens for your contributions to waste management efforts."
        />
        <FeatureCard
          icon={Users}
          title="Community-Driven"
          description="Be part of a growing community committed to sustainable practices."
        />
      </section>

      <section className="bg-black p-10 rounded-3xl shadow-lg mb-20">
        <h2 className="text-4xl font-bold mb-12 text-center text-gray-200">Our Impact</h2>
        <div className="grid md:grid-cols-3 gap-6"> {/* Changed from md:grid-cols-4 to md:grid-cols-3 */}
          <ImpactCard title="Waste Collected" value={`${impactData.wasteCollected} kg`} icon={Recycle} />
          <ImpactCard title="Reports Submitted" value={impactData.reportsSubmitted.toString()} icon={MapPin} />
          <ImpactCard title="Tokens Earned" value={impactData.tokensEarned.toString()} icon={Coins} />
        </div>
      </section>
    </div>
  )
}


function ImpactCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
  const formattedValue = typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 1 }) : value;

  return (
    <div className="p-6 rounded-xl bg-gray-900 transition-all duration-300 ease-in-out hover:shadow-md">
      <Icon className="h-10 w-10 text-gray-200 mb-4" />
      <p className="text-3xl font-bold mb-2 text-gray-200">{formattedValue}</p>
      <p className="text-sm text-gray-200">{title}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="bg-gray-900 p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ease-in-out flex flex-col items-center text-center">
      <div className="bg-gray-200 p-4 rounded-full mb-6">
        <Icon className="h-8 w-8 text-blue-600" />
      </div>
      <h3 className="text-xl font-semibold mb-4 text-gray-200">{title}</h3>
      <p className="text-gray-200 leading-relaxed">{description}</p>
    </div>
  );
}
