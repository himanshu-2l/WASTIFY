// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import {
  ArrowRight,
  Globe,
  Recycle,
  Users,
  Coins,
  MapPin,
  ChevronRight,
  Leaf,
  Sparkles,
  PenLine, // For Report
  HandCoins, // For Reward
  // Truck, // Alternative for Collect
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Poppins } from 'next/font/google'
import Link from 'next/link'
import { getRecentReports, getAllRewards, getWasteCollectionTasks } from '@/utils/db/actions'
import { tv } from 'tailwind-variants'
import { motion } from 'framer-motion'

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
})

// Enhanced AnimatedEcoIcon with more subtle animations and floating effect
function AnimatedEcoIcon() {
  return (
    <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center animate-float">
      {/* Outer pulse */}
      <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-slow delay-500"></div>
      {/* Inner pulse */}
      <div className="absolute inset-2 rounded-full bg-secondary/10 animate-pulse-slow"></div>
      {/* Icon container */}
      <div className="relative z-10 bg-white/5 rounded-full p-6 border border-white/10 backdrop-blur-sm">
        <Recycle className="h-16 w-16 text-primary" />
      </div>
      {/* Sparkle */}
      <div className="absolute -bottom-1 -right-1 z-20 p-1 bg-[#0A0F1C] rounded-full">
        <Sparkles className="h-5 w-5 text-secondary animate-pulse-fast" />
      </div>
    </div>
  );
}

// Enhanced Feature Card with gradient border on hover
const featureCardStyles = tv({
  base: "glass-effect rounded-2xl p-6 card-hover h-full flex flex-col border-2 border-transparent transition-all duration-300 relative overflow-hidden group",
  slots: {
    borderGradient: "absolute inset-[-2px] opacity-0 group-hover:opacity-60 transition-opacity duration-300 rounded-xl",
    contentWrapper: "relative z-10"
  }
});
function FeatureCard({ icon: Icon, title, description, delay = 0 }) {
  const styles = featureCardStyles();
  return (
    <div className={styles.base()}>
      <div className={`${styles.borderGradient()} bg-gradient-to-br from-primary/30 via-transparent to-secondary/30 p-[2px]`}></div>
      <div className={styles.contentWrapper()}>
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-5 flex-shrink-0 border border-white/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
        <p className="text-white/70 text-sm flex-grow leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// Enhanced Impact Card with background shift on hover
const impactCardStyles = tv({
  slots: {
    base: "glass-effect rounded-2xl p-6 card-hover h-full flex flex-col justify-between border-2 border-white/10 transition-all duration-300 hover:border-white/20 hover:shadow-lg overflow-hidden group",
    iconWrapper: "h-10 w-10 rounded-lg flex items-center justify-center transition-colors duration-300 z-10",
    valueText: "text-4xl font-bold text-white mt-auto transition-colors duration-300 z-10",
    backgroundGlow: "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-md scale-150 z-0"
  },
  variants: {
    color: {
      green: { iconWrapper: "bg-green-500/10 text-green-400", backgroundGlow: "bg-green-500" },
      blue: { iconWrapper: "bg-blue-500/10 text-blue-400", backgroundGlow: "bg-blue-500" },
      purple: { iconWrapper: "bg-purple-500/10 text-purple-400", backgroundGlow: "bg-purple-500" },
      yellow: { iconWrapper: "bg-yellow-500/10 text-yellow-400", backgroundGlow: "bg-yellow-500" },
    },
  }
});
function ImpactCard({ title, value, icon: Icon, color = 'green' }) {
  const styles = impactCardStyles({ color: color });
  return (
    <div className={styles.base()}>
      <div className={styles.backgroundGlow()} />
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-white/80">{title}</h3>
        <div className={styles.iconWrapper()}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className={styles.valueText()}>{value}</p>
    </div>
  );
}

// Enhanced How It Works Step - refine hover
function HowItWorksStep({ icon: Icon, title, description, step }) {
  return (
    <motion.div 
      className="relative flex flex-col items-center text-center px-4 group"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: step * 0.1 }}
      viewport={{ once: true, amount: 0.3 }}
    >
      {/* Icon */}
      <div className="relative z-10 h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-5 border-2 border-white/10 group-hover:border-primary/50 group-hover:bg-primary/10 transition-all duration-300 backdrop-blur-sm transform group-hover:scale-105">
        <Icon className="h-8 w-8 text-primary transition-all duration-300" />
      </div>
      {/* Text */}
      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-primary transition-colors duration-300">{title}</h3>
      <p className="text-white/70 text-sm max-w-xs mx-auto leading-relaxed transition-colors duration-300 group-hover:text-white/80">{description}</p>
      {/* Lines */}
      <div className="absolute top-8 left-1/2 w-[calc(100%-5rem)] h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[calc(50%-2.5rem)] hidden md:block group-hover:via-primary/50 transition-all duration-300 scale-x-0 group-hover:scale-x-100 origin-center"></div>
      <div className="absolute top-16 left-1/2 w-[2px] h-[calc(100%-4rem)] bg-gradient-to-b from-white/10 via-white/10 to-transparent -translate-x-1/2 md:hidden group-hover:from-primary/50 group-hover:via-primary/30 transition-all duration-300 scale-y-0 group-hover:scale-y-100 origin-top"></div>
      {/* Step Number Badge */}
      <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-white shadow-md border-2 border-[#0A0F1C]">
        {step}
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(true);
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

  const login = () => setLoggedIn(true);

  return (
    <div className={`${poppins.className} space-y-20 md:space-y-24`}>
      {/* Hero Section - Refined */}
      <section className="relative pt-12 pb-24 overflow-hidden">
        {/* Background decorations with animation */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-60 animate-pulse-slow-alt"></div>
        <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-secondary/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 opacity-60 animate-pulse-slow"></div>
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl opacity-50 animate-pulse-slow delay-300"></div>
        {/* Add a subtle grid pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Cg fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l1.41-1.41-2.83-2.83-1.41 1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10 px-4">
          <AnimatedEcoIcon />
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-white leading-tight">
            <span className="bg-clip-text text-transparent bg-eco-gradient">WastiFY:</span> Turn Waste into Rewards
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-12">
            Join our community, report waste, contribute to a cleaner planet, and earn crypto rewards for your eco-friendly actions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/report">
              <Button 
                size="lg"
                className="w-full sm:w-auto bg-eco-gradient hover:brightness-110 text-white px-8 py-3 rounded-full font-semibold shadow-eco transition-all duration-300 transform hover:scale-105 text-base tracking-wide"
              >
                Report Waste Now
                <MapPin className="ml-2.5 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/collect">
              <Button 
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-full font-semibold border-2 border-white/10 hover:border-primary/50 transition-all duration-300 transform hover:scale-105 text-base tracking-wide"
              >
                Find Collection Tasks
                <Recycle className="ml-2.5 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section - Refined with Animation */}
      <motion.section 
        className="py-20 relative"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-20">
          Simple Steps, Big Impact
        </h2>
        <div className="max-w-5xl mx-auto px-4 relative">
          {/* Connecting lines refinement */}
          <div className="grid md:grid-cols-3 gap-y-20 md:gap-x-12 relative z-10">
            <HowItWorksStep 
              icon={PenLine} 
              title="1. Report Waste"
              description="Spot waste? Pin it on the map, add details, and submit the report easily."
              step={1}
            />
            <HowItWorksStep 
              icon={Recycle} 
              title="2. Collect & Verify"
              description="Find tasks, collect reported waste, and verify collection with a photo."
              step={2}
            />
            <HowItWorksStep 
              icon={HandCoins} 
              title="3. Earn RWT Tokens"
              description="Get rewarded instantly with RWT tokens sent directly to your connected wallet."
              step={3}
            />
          </div>
        </div>
      </motion.section>

      {/* Features Section - Refined with Animation */}
      <motion.section 
        className="py-24 relative bg-gradient-to-b from-white/[.03] to-transparent rounded-3xl mx-4 md:mx-auto md:max-w-6xl overflow-hidden"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
        <div className="max-w-5xl mx-auto text-center px-4 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why Choose <span className="text-primary">WastiFY</span>?</h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-16">
            WastiFY stands out because we focus on environmental impact, web3 rewards, and community-powered solutions.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature Cards using updated component */}
            <FeatureCard
              icon={Leaf}
              title="Environmental Focus"
              description="Directly contribute to cleaner communities and effective waste management through your actions."
            />
            <FeatureCard
              icon={Coins}
              title="Web3 Rewards"
              description="Earn real RWT crypto tokens on the blockchain for every verified contribution you make."
            />
            <FeatureCard
              icon={Users}
              title="Community Powered"
              description="Be part of a collaborative network tackling waste issues together, powered by collective action."
            />
          </div>
        </div>
      </motion.section>

      {/* Impact Section - Refined with Animation */}
      <motion.section 
        className="py-20 relative"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">Our Collective Impact</h2>
          <p className="text-center text-white/70 mb-16 max-w-2xl mx-auto text-lg">Every report and collection adds up. See the difference our community is making!</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
            {/* Impact Cards using updated component */}
            <ImpactCard title="Waste Collected" value={`${impactData.wasteCollected} kg`} icon={Recycle} color="green" />
            <ImpactCard title="Reports Submitted" value={impactData.reportsSubmitted.toString()} icon={MapPin} color="blue" />
            <ImpactCard title="Points Awarded" value={impactData.tokensEarned.toLocaleString()} icon={Coins} color="purple" />
            <ImpactCard title="CO₂ Offset" value={`${impactData.co2Offset} kg`} icon={Globe} color="yellow" />
          </div>
        </div>
      </motion.section>

      {/* CTA Section - Refined with Animation */}
      <motion.section 
        className="pt-20 pb-28 relative"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="max-w-5xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl group shadow-2xl shadow-black/20">
            {/* Increased gradient visibility */}
            <div className="absolute inset-0 animated-gradient-bg opacity-20 group-hover:opacity-30 transition-opacity duration-700 scale-110 group-hover:scale-100"></div>
            <div className="glass-effect p-8 sm:p-12 md:p-16 relative text-center border-2 border-white/10 group-hover:border-primary/30 transition-colors duration-500">
              <div className="mb-8">
                 <Leaf className="h-16 w-16 mx-auto text-primary opacity-80 group-hover:opacity-100 transition-opacity duration-500 transform group-hover:rotate-[-5deg]"/>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Ready to Turn Trash into Treasure?
              </h2>
              <p className="text-white/70 text-base sm:text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
                Join the WastiFY movement. Start reporting, collecting, and earning rewards while helping create a cleaner future, one piece of waste at a time.
              </p>
              <Link href={loggedIn ? "/report" : "#"}>
                <Button 
                  size="lg"
                  onClick={!loggedIn ? login : undefined}
                  className="bg-white text-[#0A0F1C] hover:bg-white/90 px-8 py-3 sm:px-10 sm:py-4 rounded-full font-semibold shadow-lg shadow-white/10 hover:shadow-primary/20 transition-all duration-300 transform hover:scale-[1.03] text-sm sm:text-base tracking-wide group"
                >
                  {loggedIn ? "Start Reporting Waste" : "Join the Movement Today"}
                  <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  )
}
