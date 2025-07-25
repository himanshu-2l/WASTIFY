'use client'
import { useState, useEffect } from 'react'
import { getAllRewards, getUserByEmail, getUserBalance } from '@/utils/db/actions'
import { Loader, Award, User, Trophy, Crown, Coins, Sparkles } from 'lucide-react'
import { toast } from 'react-hot-toast'

type Reward = {
  id: number
  userId: number
  points: number
  level: number
  createdAt: Date
  userName: string | null
}

export default function LeaderboardPage() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)
  const [userPoints, setUserPoints] = useState(0)
  const [userRank, setUserRank] = useState(0)

  useEffect(() => {
    const fetchRewardsAndUser = async () => {
      setLoading(true)
      try {
        const fetchedRewards = await getAllRewards()
        console.log('Fetched rewards in leaderboard:', fetchedRewards)
        setRewards(fetchedRewards)

        const userEmail = localStorage.getItem('userEmail')
        console.log('Current user email:', userEmail)
        
        if (userEmail) {
          const fetchedUser = await getUserByEmail(userEmail)
          console.log('Fetched user:', fetchedUser)
          
          if (fetchedUser) {
            setUser(fetchedUser)
            
            // Find user's points and rank
            const userReward = fetchedRewards.find(r => r.userId === fetchedUser.id)
            console.log('User reward:', userReward)
            
            if (userReward) {
              setUserPoints(userReward.points)
              const rank = fetchedRewards.findIndex(r => r.userId === fetchedUser.id) + 1
              console.log('User rank:', rank)
              setUserRank(rank)
            } else {
              // If user doesn't have a reward entry yet, get their balance directly
              const balance = await getUserBalance(fetchedUser.id)
              console.log('User balance:', balance)
              setUserPoints(balance)
              
              // Calculate rank based on points
              if (balance > 0) {
                const rank = fetchedRewards.findIndex(r => r.points < balance) + 1
                console.log('Calculated user rank:', rank)
                setUserRank(rank > 0 ? rank : fetchedRewards.length + 1)
              } else {
                setUserRank(0)
              }
            }
          } else {
            toast.error('User not found. Please log in again.')
          }
        } else {
          toast.error('User not logged in. Please log in.')
        }
      } catch (error) {
        console.error('Error fetching rewards and user:', error)
        toast.error('Failed to load leaderboard. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchRewardsAndUser()
  }, [])

  const getLeaderRank = (index: number) => {
    if (index === 0) return '🥇 Champion';
    if (index === 1) return '🥈 Silver';
    if (index === 2) return '🥉 Bronze';
    return `#${index + 1}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          <Trophy className="inline-block mr-3 h-8 w-8 text-[#F7C948]" />
          Leaderboard
        </h1>
        
        <div className="flex items-center rounded-full px-4 py-2 bg-white/5 border border-white/10">
          <Sparkles className="h-5 w-5 text-[#F7C948] mr-2" />
          <span className="text-white/80">Top contributors</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <Loader className="animate-spin h-10 w-10 text-primary mb-3" />
            <p className="text-white/60">Loading leaderboard data...</p>
          </div>
        </div>
      ) : (
        <>
          {user && (
            <div className="mb-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-multi-gradient opacity-10 rounded-2xl"></div>
              <div className="glass-effect rounded-2xl p-6 relative">
                <div className="flex flex-col md:flex-row items-center md:justify-between gap-6">
                  <div className="flex items-center">
                    <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center mr-4 relative">
                      <User className="h-8 w-8 text-white" />
                      {userRank <= 3 && (
                        <div className="absolute -top-1 -right-1 bg-[#F7C948] h-6 w-6 rounded-full flex items-center justify-center border-2 border-[#0A0F1C]">
                          <Crown className="h-3 w-3 text-[#0A0F1C]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-white">{user.name}</h2>
                      <p className="text-white/60">Your current standing</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <div className="text-white/60 text-sm mb-1">Rank</div>
                      <div className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center">
                        {userRank > 0 ? (
                          <span className="flex items-center">
                            {userRank <= 3 && (
                              <Crown className="h-5 w-5 mr-1 text-[#F7C948]" />
                            )}
                            #{userRank}
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </div>
                    </div>
                    
                    <div className="text-center relative">
                      <div className="text-white/60 text-sm mb-1">Your Points</div>
                      <div className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center">
                        <Coins className="h-5 w-5 mr-2 text-primary" />
                        {userPoints.toLocaleString()}
                      </div>
                      <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/4 animate-pulse">
                        <Sparkles className="h-4 w-4 text-primary/60" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden border border-white/10">
            <div className="eco-gradient p-5 flex justify-between items-center">
              <div className="text-lg md:text-xl font-bold text-white">Top Performers</div>
              <Award className="h-6 w-6 text-white" />
            </div>
            
            <div className="glass-effect backdrop-blur-md">
              <div className="flex flex-col divide-y divide-white/5">
                {rewards.length === 0 && user ? (
                  // If there are no other users but we have current user data, show them
                  <div className="p-5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-full flex items-center justify-center mr-4 bg-[#F7C948]/20">
                        <Crown className="h-6 w-6 text-[#F7C948]" />
                      </div>
                      <div>
                        <div className="flex items-center">
                          <h3 className="font-semibold text-white text-lg">{user.name}</h3>
                          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-[#F7C948]/20 text-[#F7C948]">
                            🥇 Champion
                          </span>
                        </div>
                        <div className="text-white/60 text-sm mt-1">Level 1</div>
                      </div>
                    </div>
                    <div className="flex items-center bg-white/10 rounded-full px-3 py-1.5">
                      <Coins className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-semibold text-white">{userPoints.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  // Otherwise show all users in order
                  rewards.slice(0, 3).map((reward, index) => (
                    <div 
                      key={reward.id} 
                      className={`p-5 flex items-center justify-between ${user && user.id === reward.userId ? 'bg-white/5' : ''}`}
                    >
                      <div className="flex items-center">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center mr-4 ${
                          index === 0 ? 'bg-[#F7C948]/20' : index === 1 ? 'bg-[#C0C0C0]/20' : 'bg-[#CD7F32]/20'
                        }`}>
                          <Crown className={`h-6 w-6 ${
                            index === 0 ? 'text-[#F7C948]' : index === 1 ? 'text-[#C0C0C0]' : 'text-[#CD7F32]'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center">
                            <h3 className="font-semibold text-white text-lg">{reward.userName}</h3>
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                              index === 0 ? 'bg-[#F7C948]/20 text-[#F7C948]' : 
                              index === 1 ? 'bg-[#C0C0C0]/20 text-[#C0C0C0]' : 
                              'bg-[#CD7F32]/20 text-[#CD7F32]'
                            }`}>
                              {getLeaderRank(index)}
                            </span>
                          </div>
                          <div className="text-white/60 text-sm mt-1">Level {reward.level}</div>
                        </div>
                      </div>
                      <div className="flex items-center bg-white/10 rounded-full px-3 py-1.5">
                        <Coins className="h-4 w-4 mr-2 text-primary" />
                        <span className="font-semibold text-white">{reward.points.toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {rewards.length > 3 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Level</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-white/60 uppercase tracking-wider">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rewards.slice(3).map((reward, idx) => {
                        const actualIndex = idx + 3;
                        return (
                          <tr 
                            key={reward.id} 
                            className={`hover:bg-white/5 transition-colors ${
                              user && user.id === reward.userId ? 'bg-white/5' : ''
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">{actualIndex + 1}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center mr-3">
                                  <User className="h-4 w-4 text-white/70" />
                                </div>
                                <div className="text-sm font-medium text-white">{reward.userName}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-white">
                                Level {reward.level}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-semibold text-white flex items-center justify-end">
                                <Coins className="h-4 w-4 mr-1 text-primary" />
                                {reward.points.toLocaleString()}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}