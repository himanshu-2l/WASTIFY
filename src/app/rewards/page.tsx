




'use client'
import { useState, useEffect } from 'react'
import { Coins, ArrowUpRight, ArrowDownRight, Gift, AlertCircle, Loader, Wallet, Trophy, DollarSign, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getUserByEmail, getRewardTransactions, getAvailableRewards, redeemReward, createTransaction } from '@/utils/db/actions'
import { toast } from 'react-hot-toast'
import { 
  connectWallet, 
  getTokenBalance, 
  getLatestETHPrice, 
  getStoredUSDValue,
  isEligibleForReward,
  calculateDynamicReward,
  getLastWinner,
  mintRWT
} from '@/utils/contractInteraction';
import { createUserActivityAttestation } from '@/utils/signAttestations';
import { ethers } from 'ethers';

type Transaction = {
  id: number
  type: 'earned_report' | 'earned_collect' | 'redeemed'
  amount: number
  description: string
  date: string
}

type Reward = {
  id: number
  name: string
  cost: number
  description: string | null
  collectionInfo: string
}

export default function RewardsPage() {
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [tokenBalance, setTokenBalance] = useState<string | null>(null)
  const [ethPrice, setEthPrice] = useState<string | null>(null);
  const [usdValue, setUsdValue] = useState<string | null>(null);
  const [rwtAmount, setRwtAmount] = useState<string>('');
  const [usdEquivalent, setUsdEquivalent] = useState<string | null>(null);
  const [rwtConversionRate, setRwtConversionRate] = useState<number>(0.01); // Example: 1 RWT = 0.1 USD
  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [dynamicReward, setDynamicReward] = useState<string | null>(null);
  const [lastWinner, setLastWinner] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserDataAndRewards = async () => {
      setLoading(true)
      try {
        const userEmail = localStorage.getItem('userEmail')
        if (userEmail) {
          const fetchedUser = await getUserByEmail(userEmail)
          if (fetchedUser) {
            setUser(fetchedUser)
            const fetchedTransactions = await getRewardTransactions(fetchedUser.id)
            setTransactions(fetchedTransactions as Transaction[])
            const fetchedRewards = await getAvailableRewards(fetchedUser.id)
            setRewards(fetchedRewards.filter(r => r.cost > 0)) // Filter out rewards with 0 points
            const calculatedBalance = fetchedTransactions.reduce((acc, transaction) => {
              return transaction.type.startsWith('earned') ? acc + transaction.amount : acc - transaction.amount
            }, 0)
            setBalance(Math.max(calculatedBalance, 0)) // Ensure balance is never negative
          } else {
            toast.error('User not found. Please log in again.')
          }
        } else {
          toast.error('User not logged in. Please log in.')
        }
      } catch (error) {
        console.error('Error fetching user data and rewards:', error)
        toast.error('Failed to load rewards data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    const fetchPrices = async () => {
      try {
        const ethPriceValue = await getLatestETHPrice();
        setEthPrice(ethPriceValue);

        const usdStoredValue = await getStoredUSDValue();
        setUsdValue(usdStoredValue);
      } catch (error) {
        console.error('Error fetching prices:', error);
        toast.error('Failed to fetch price information.');
      }
    };

    fetchUserDataAndRewards()
    fetchPrices()

    // If wallet is already connected, fetch additional data
    if (walletAddress) {
      fetchAdditionalData(walletAddress);
    }
  }, [walletAddress])

  useEffect(() => {
    const fetchTokenBalance = async () => {
      if (walletAddress) {
        const balance = await getTokenBalance(walletAddress);
        setTokenBalance(balance);
      }
    }

    fetchTokenBalance();
  }, [walletAddress]);

  const handleConnectWallet = async () => {
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      toast.success('Wallet connected successfully!');
      
      // Fetch token balance after connecting wallet
      const balance = await getTokenBalance(address);
      setTokenBalance(balance);

      // Fetch additional data
      fetchAdditionalData(address);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet. Please try again.');
    }
  };

  const fetchAdditionalData = async (address: string) => {
    try {
      const eligible = await isEligibleForReward(address);
      setIsEligible(eligible);

      const dynamicRewardAmount = await calculateDynamicReward(ethers.utils.parseUnits('100', 18)); // Example: 100 tokens
      setDynamicReward(dynamicRewardAmount);

      const winner = await getLastWinner();
      setLastWinner(winner);
    } catch (error) {
      console.error('Error fetching additional data:', error);
      toast.error('Failed to fetch some reward information.');
    }
  };

  const handleRedeemReward = async (rewardId: number) => {
    if (!user) {
      toast.error('Please log in to redeem rewards.')
      return
    }

    if (!walletAddress) {
      toast.error('Please connect your wallet first.')
      return
    }

    const reward = rewards.find(r => r.id === rewardId)
    if (reward && balance >= reward.cost) {
      try {
        // Ensure balance is sufficient before proceeding
        if (balance < reward.cost) {
          toast.error('Insufficient balance to redeem this reward')
          return
        }

        // Convert points to RWT tokens
        await mintRWT(walletAddress, reward.cost.toString());

        // Update database
        await redeemReward(user.id, rewardId);
        
        // Create a new transaction record
        await createTransaction(user.id, 'redeemed', reward.cost, `Redeemed ${reward.name}`);

        // Create attestation for user activity
        const attestationResult = await createUserActivityAttestation(walletAddress, 'Redeem Reward', `Redeemed ${reward.name}`);
        if (attestationResult === null) {
          console.log('Attestation creation failed, but reward redemption continues.');
        }

        // Refresh user data and rewards after redemption
        await refreshUserData();

        toast.success(`You have successfully redeemed: ${reward.name}`)
      } catch (error) {
        console.error('Error redeeming reward:', error)
        toast.error('Failed to redeem reward. Please try again.')
      }
    } else {
      toast.error('Insufficient balance to redeem this reward')
    }
  }

  const handleRedeemAllPoints = async () => {
    if (!user) {
      toast.error('Please log in to redeem points.');
      return;
    }

    if (!walletAddress) {
      toast.error('Please connect your wallet first.');
      return;
    }

    try {
      // Convert all points to RWT tokens
      await mintRWT(walletAddress, balance.toString());

      // Update database
      await redeemReward(user.id, 0);
      
      // Create a new transaction record
      await createTransaction(user.id, 'redeemed', balance, 'Redeemed all points');

      // Create attestation for user activity
      await createUserActivityAttestation(walletAddress, 'Redeem All Points', 'Redeemed all points');

      // Refresh user data and rewards after redemption
      await refreshUserData();

      toast.success(`You have successfully redeemed all your points!`);
    } catch (error) {
      console.error('Error redeeming all points:', error);
      toast.error('Failed to redeem all points. Please try again.');
    }
  }

  const refreshUserData = async () => {
    if (user) {
      const fetchedUser = await getUserByEmail(user.email);
      if (fetchedUser) {
        const fetchedTransactions = await getRewardTransactions(fetchedUser.id);
        setTransactions(fetchedTransactions as Transaction[]);
        const fetchedRewards = await getAvailableRewards(fetchedUser.id);
        setRewards(fetchedRewards.filter(r => r.cost > 0)); // Filter out rewards with 0 points
        
        // Recalculate balance
        const calculatedBalance = fetchedTransactions.reduce((acc, transaction) => {
          return transaction.type.startsWith('earned') ? acc + transaction.amount : acc - transaction.amount
        }, 0)
        setBalance(Math.max(calculatedBalance, 0)) // Ensure balance is never negative

        // Update token balance
        if (walletAddress) {
          const newTokenBalance = await getTokenBalance(walletAddress);
          setTokenBalance(newTokenBalance);
        }
      }
    }
  }

  const convertRWTtoUSD = (rwtAmount: number): string | null => {
    return (rwtAmount * rwtConversionRate).toFixed(2);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">
    <Loader className="animate-spin h-8 w-8 text-gray-600" />
  </div>
  }

  const balanceInUSD = convertRWTtoUSD(balance);
  const tokenBalanceInUSD = tokenBalance ? convertRWTtoUSD(parseFloat(tokenBalance)) : null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6 text-gray-200">Rewards</h1>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col justify-between h-full border-l-4 border-blue-500">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Wallet</h2>
            {!walletAddress ? (
              <Button onClick={handleConnectWallet} className="bg-blue-500 text-white hover:bg-blue-600 transition duration-300 w-full">
                Connect Wallet
              </Button>
            ) : (
              <>
                <div className="flex items-center mb-3 bg-gray-100 p-2 rounded">
                  <Wallet className="w-5 h-5 mr-2 text-blue-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-600 truncate">{walletAddress}</span>
                </div>
                {tokenBalance !== null && (
                  <div className="mt-4">
                    <p className="text-3xl font-bold mb-1 text-blue-500">{parseFloat(tokenBalance).toFixed(2)} RWT</p>
                    <p className="text-sm text-gray-500">Reward Token Balance</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col justify-between h-full border-l-4 border-green-500">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Reward Balance</h2>
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center">
              <Coins className="w-10 h-10 mr-3 text-green-500" />
              <div>
                <span className="text-4xl font-bold text-green-500">{balance}</span>
                <p className="text-sm text-gray-500">Available Points</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Reward Information</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg flex items-start">
            <Trophy className="w-6 h-6 text-yellow-500 mr-3 mt-1" />
            <div>
              <p className="font-medium text-gray-600 mb-2">Eligible for Reward:</p>
              <p className={`text-lg font-semibold ${isEligible ? 'text-green-500' : 'text-red-500'}`}>
                {isEligible ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg flex items-start">
            <Gift className="w-6 h-6 text-blue-500 mr-3 mt-1" />
            <div>
              <p className="font-medium text-gray-600 mb-2">Dynamic Reward (100 tokens):</p>
              <p className="text-lg font-semibold text-blue-500">{dynamicReward || 'N/A'} RWT</p>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg flex items-start">
            <DollarSign className="w-6 h-6 text-green-500 mr-3 mt-1" />
            <div>
              <p className="font-medium text-gray-600 mb-2">Latest ETH Price:</p>
              <p className="text-lg font-semibold text-purple-500">${ethPrice || 'N/A'}</p>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg flex items-start">
            <User className="w-6 h-6 text-orange-500 mr-3 mt-1" />
            <div>
              <p className="font-medium text-gray-600 mb-2">Last Lottery Winner:</p>
              <p className="text-lg font-semibold text-orange-500 truncate">
                {lastWinner && lastWinner !== '0x0000000000000000000000000000000000000000'
                  ? lastWinner
                  : 'No winner yet'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-gray-200">Recent Transactions</h2>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {transactions.length > 0 ? (
              transactions.map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center">
                    {transaction.type === 'earned_report' ? (
                      <ArrowUpRight className="w-5 h-5 text-green-500 mr-3" />
                    ) : transaction.type === 'earned_collect' ? (
                      <ArrowUpRight className="w-5 h-5 text-blue-500 mr-3" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-500 mr-3" />
                    )}
                    <div>
                      <p className="font-medium text-gray-800">{transaction.description}</p>
                      <p className="text-sm text-gray-500">{transaction.date}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${transaction.type.startsWith('earned') ? 'text-green-500' : 'text-red-500'}`}>
                    {transaction.type.startsWith('earned') ? '+' : '-'}{transaction.amount}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">No transactions yet</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4 text-gray-200">Available Rewards</h2>
          <div className="space-y-4">
            {rewards.length > 0 ? (
              rewards.map(reward => (
                <div key={reward.id} className="bg-white p-4 rounded-xl shadow-md">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{reward.name}</h3>
                    <span className="text-green-500 font-semibold">{reward.cost} points</span>
                  </div>
                  <p className="text-gray-600 mb-2">{reward.description}</p>
                  <p className="text-sm text-gray-500 mb-4">{reward.collectionInfo}</p>
                  {reward.id === 0 ? (
                    <div className="space-y-2">
                      <Button 
                        onClick={handleRedeemAllPoints}
                        className="w-full bg-green-500 hover:bg-green-600 text-white"
                        disabled={balance === 0}
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        Redeem All Points
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => handleRedeemReward(reward.id)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white"
                      disabled={balance < reward.cost}
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      Redeem Reward
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                <div className="flex items-center">
                  <AlertCircle className="h-6 w-6 text-yellow-400 mr-3" />
                  <p className="text-yellow-700">No rewards available at the moment.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}