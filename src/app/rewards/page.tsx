"use client";
import { useState, useEffect } from "react";
import {
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  AlertCircle,
  Loader,
  Wallet,
  Trophy,
  DollarSign,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getUserByEmail,
  getRewardTransactions,
  getAvailableRewards,
  redeemReward,
  createTransaction,
} from "@/utils/db/actions";
import { toast } from "react-hot-toast";
import {
  connectWallet,
  getTokenBalance,
  mintRWT,
} from "@/utils/contractInteraction";
import { createUserActivityAttestation } from "@/utils/signAttestations";
import { ethers } from "ethers";

type Transaction = {
  id: number;
  type: "earned_report" | "earned_collect" | "redeemed";
  amount: number;
  description: string;
  date: string;
};

type Reward = {
  id: number;
  name: string;
  cost: number;
  description: string | null;
  collectionInfo: string;
};

const formatCryptoBalance = (balance: string | null): string => {
  if (!balance) return "0.000000";
  // Parse the balance and show 6 decimal places
  return parseFloat(balance).toFixed(6);
};

export default function RewardsPage() {
  const [user, setUser] = useState<{
    id: number;
    email: string;
    name: string;
  } | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [ethPrice, setEthPrice] = useState<string | null>(null);
  const [usdValue, setUsdValue] = useState<string | null>(null);
  const [rwtAmount, setRwtAmount] = useState<string>("");
  const [usdEquivalent, setUsdEquivalent] = useState<string | null>(null);
  const [rwtConversionRate, setRwtConversionRate] = useState<number>(0.01); // Example: 1 RWT = 0.01 USD
  const [rwtToInrRate, setRwtToInrRate] = useState<number>(0.83); // Example: 1 RWT = 0.83 INR (placeholder)
  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [dynamicReward, setDynamicReward] = useState<string | null>(null);
  const [lastWinner, setLastWinner] = useState<string | null>(null);

  // State for wallet connection steps
  const [walletConnectionSteps, setWalletConnectionSteps] = useState<{
    metamaskInstalled: boolean;
    showInstructions: boolean;
  }>({
    metamaskInstalled: false,
    showInstructions: false
  });

  // Check if MetaMask is installed
  useEffect(() => {
    const checkMetaMask = () => {
      const isMetaMaskInstalled = typeof window !== 'undefined' && 
        typeof window.ethereum !== 'undefined' && 
        window.ethereum.isMetaMask;
      
      setWalletConnectionSteps(prev => ({
        ...prev,
        metamaskInstalled: isMetaMaskInstalled
      }));
    };

    checkMetaMask();
  }, []);

  useEffect(() => {
    const fetchUserDataAndRewards = async () => {
      setLoading(true);
      try {
        const userEmail = localStorage.getItem("userEmail");
        if (userEmail) {
          const fetchedUser = await getUserByEmail(userEmail);
          if (fetchedUser) {
            setUser(fetchedUser);
            const fetchedTransactions = await getRewardTransactions(
                fetchedUser.id
            );
            setTransactions(fetchedTransactions as Transaction[]);
            const fetchedRewards = await getAvailableRewards(fetchedUser.id);
            setRewards(fetchedRewards.filter((r) => r.cost > 0)); // Filter out rewards with 0 points
            const calculatedBalance = fetchedTransactions.reduce(
                (acc, transaction) => {
                  return transaction.type.startsWith("earned")
                      ? acc + transaction.amount
                      : acc - transaction.amount;
                },
                0
            );
            setBalance(Math.max(calculatedBalance, 0)); // Ensure balance is never negative
          } else {
            toast.error("User not found. Please log in again.");
          }
        } else {
          toast.error("User not logged in. Please log in.");
        }
      } catch (error) {
        console.error("Error fetching user data and rewards:", error);
        toast.error("Failed to load rewards data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndRewards();
  }, [walletAddress]);

  useEffect(() => {
    const fetchTokenBalance = async () => {
      if (walletAddress) {
        try {
          const balance = await getTokenBalance(walletAddress);
          setTokenBalance(balance);
        } catch (error) {
          console.error("Error fetching token balance:", error);
          setTokenBalance("0");
        }
      }
    };

    fetchTokenBalance();
  }, [walletAddress]);

  const handleConnectWallet = async () => {
    try {
      // Check for MetaMask before attempting connection
      if (typeof window === 'undefined' || typeof window.ethereum === 'undefined' || !window.ethereum.isMetaMask) {
        toast.error("MetaMask extension not found. Please install it first.");
        return;
      }
      
      const address = await connectWallet();
      setWalletAddress(address);
      toast.success("Wallet connected successfully!");

      // Fetch token balance after connecting wallet
      try {
        const balance = await getTokenBalance(address);
        setTokenBalance(balance);
      } catch (error) {
        console.error("Error fetching initial token balance:", error);
        setTokenBalance("0");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast.error("Failed to connect wallet. Please try again.");
    }
  };

  const toggleInstructionDetails = () => {
    setWalletConnectionSteps(prev => ({
      ...prev,
      showInstructions: !prev.showInstructions
    }));
  };

  const handleRedeemReward = async (rewardId: number) => {
    if (!user) {
      toast.error("Please log in to redeem rewards.");
      return;
    }

    if (!walletAddress) {
      toast.error("Please connect your wallet first.");
      return;
    }

    const reward = rewards.find((r) => r.id === rewardId);
    if (reward && balance >= reward.cost) {
      try {
        // Ensure balance is sufficient before proceeding
        if (balance < reward.cost) {
          toast.error("Insufficient balance to redeem this reward");
          return;
        }

        // Convert points to RWT tokens
        await mintRWT(walletAddress, reward.cost.toString());

        // Update database
        await redeemReward(user.id, rewardId);

        // Create a new transaction record
        await createTransaction(
            user.id,
            "redeemed",
            reward.cost,
            `Redeemed ${reward.name}`
        );

        // Create attestation for user activity
        const attestationResult = await createUserActivityAttestation(
            walletAddress,
            "Redeem Reward",
            `Redeemed ${reward.name}`
        );
        if (attestationResult === null) {
          console.log(
              "Attestation creation failed, but reward redemption continues."
          );
        }

        // Refresh user data and rewards after redemption
        await refreshUserData();

        toast.success(`You have successfully redeemed: ${reward.name}`);
      } catch (error) {
        console.error("Error redeeming reward:", error);
        toast.error("Failed to redeem reward. Please try again.");
      }
    } else {
      toast.error("Insufficient balance to redeem this reward");
    }
  };

  const handleRedeemAllPoints = async () => {
    if (!user) {
      toast.error("Please log in to redeem points.");
      return;
    }

    if (!walletAddress) {
      toast.error("Please connect your wallet first.");
      return;
    }

    try {
      // Convert all points to RWT tokens
      await mintRWT(walletAddress, balance.toString());

      // Update database
      await redeemReward(user.id, 0);

      // Create a new transaction record
      await createTransaction(
          user.id,
          "redeemed",
          balance,
          "Redeemed all points"
      );

      // Create attestation for user activity
      await createUserActivityAttestation(
          walletAddress,
          "Redeem All Points",
          "Redeemed all points"
      );

      // Refresh user data and rewards after redemption
      await refreshUserData();

      toast.success(`You have successfully redeemed all your points!`);
    } catch (error) {
      console.error("Error redeeming all points:", error);
      toast.error("Failed to redeem all points. Please try again.");
    }
  };

  const refreshUserData = async () => {
    if (user) {
      const fetchedUser = await getUserByEmail(user.email);
      if (fetchedUser) {
        const fetchedTransactions = await getRewardTransactions(fetchedUser.id);
        setTransactions(fetchedTransactions as Transaction[]);
        const fetchedRewards = await getAvailableRewards(fetchedUser.id);
        setRewards(fetchedRewards.filter((r) => r.cost > 0)); // Filter out rewards with 0 points

        // Recalculate balance
        const calculatedBalance = fetchedTransactions.reduce(
            (acc, transaction) => {
              return transaction.type.startsWith("earned")
                  ? acc + transaction.amount
                  : acc - transaction.amount;
            },
            0
        );
        setBalance(Math.max(calculatedBalance, 0)); // Ensure balance is never negative

        // Update token balance
        if (walletAddress) {
          const newTokenBalance = await getTokenBalance(walletAddress);
          setTokenBalance(newTokenBalance);
        }
      }
    }
  };

  // Function to convert RWT to INR
  const convertRWTtoINR = (rwtAmount: number): string | null => {
    return (rwtAmount * rwtToInrRate).toFixed(2);
  };

  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
          <Loader className="animate-spin h-8 w-8 text-gray-600" />
        </div>
    );
  }

  // Calculate INR value
  const tokenBalanceInINR = tokenBalance
      ? convertRWTtoINR(parseFloat(tokenBalance))
      : null;

  // JSX component for MetaMask installation instructions
  const WalletInstructions = () => (
    <div className="mb-6 p-5 glass-effect rounded-2xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <Wallet className="h-5 w-5 text-primary mr-2" />
          Instructions To Connect Your Crypto Wallet
        </h3>
        <Button 
          onClick={toggleInstructionDetails} 
          variant="ghost" 
          size="sm"
          className="text-primary hover:bg-primary/10 hover:text-primary px-2"
        >
          {walletConnectionSteps.showInstructions ? "Hide Instructions" : "Show Instructions"}
        </Button>
      </div>
      
      {/* Conditionally render the details based on state */}
      {walletConnectionSteps.showInstructions && (
        <div className="space-y-3 transition-all duration-300 ease-in-out">
          {/* Step 1 */}
          <div className="rounded-lg bg-white/5 p-4 border border-white/10">
            <h4 className="font-medium text-white mb-2 flex items-center">
              <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2 text-primary text-xs">1</span> 
              Install MetaMask Extension
            </h4>
            <p className="text-white/70 text-sm mb-3">MetaMask is a secure wallet for managing your crypto assets. Install the browser extension.</p>
            <a 
              href="https://metamask.io/download/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 rounded-full bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors"
            >
              Download MetaMask
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </a>
          </div>
          
          {/* Step 2 */}
          <div className="rounded-lg bg-white/5 p-4 border border-white/10">
            <h4 className="font-medium text-white mb-2 flex items-center">
              <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2 text-primary text-xs">2</span> 
              Set Up Your Wallet
            </h4>
            <p className="text-white/70 text-sm">After installing, open the extension and follow the instructions to create a new wallet or import an existing one.</p>
          </div>
          
          {/* Step 3 */}
          <div className="rounded-lg bg-white/5 p-4 border border-white/10">
            <h4 className="font-medium text-white mb-2 flex items-center">
              <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-2 text-primary text-xs">3</span> 
              Connect to Sepolia Testnet
            </h4>
            <p className="text-white/70 text-sm mb-3">WastiFY uses the Sepolia Testnet for rewards. Make sure your MetaMask wallet is set to the Sepolia network.</p>
            <p className="text-white/70 text-sm">If you need test ETH for transaction fees, use a <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Sepolia Faucet</a>.</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center mb-8">
        <Coins className="h-8 w-8 text-primary mr-3" />
        <h1 className="text-3xl md:text-4xl font-bold text-white">Rewards Center</h1>
      </div>
      <p className="text-xl text-white/70 mb-10">Earn tokens for your environmental contributions</p>
      
      {/* Always render the WalletInstructions component */}
      <WalletInstructions />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Wallet Card */}
        <div className="glass-effect rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-bl-full -z-0"></div>
          <div className="p-6 relative z-10">
            <h2 className="flex items-center text-lg font-semibold text-white mb-4">
              <Wallet className="h-5 w-5 text-blue-400 mr-2" />
              Wallet
            </h2>
            
            <Button
              onClick={handleConnectWallet}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-6 rounded-xl"
              disabled={loading}
            >
              {walletAddress ? "Wallet Connected" : "Connect Wallet"}
            </Button>
            
            {walletAddress && (
              <div className="mt-3 text-xs text-white/60 truncate">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>
            )}
          </div>
        </div>

        {/* Balance Card */}
        <div className="glass-effect rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-bl-full -z-0"></div>
          <div className="p-6 relative z-10">
            <h2 className="flex items-center text-lg font-semibold text-white mb-4">
              <Coins className="h-5 w-5 text-primary mr-2" />
              Balance
            </h2>
            <div className="text-4xl font-bold text-white">{balance}</div>
            <div className="text-white/60">points</div>
            <div className="mt-2 text-white/60 text-sm">Available to redeem</div>
          </div>
        </div>

        {/* RWT Tokens Card */}
        <div className="glass-effect rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-bl-full -z-0"></div>
          <div className="p-6 relative z-10">
            <h2 className="flex items-center text-lg font-semibold text-white mb-4">
              <Trophy className="h-5 w-5 text-purple-400 mr-2" />
              RWT Tokens
            </h2>
            <div className="text-4xl font-bold text-white">{formatCryptoBalance(tokenBalance)}</div>
            <div className="text-white/60">RWT</div>
            <div className="mt-2 text-white/60 text-sm">In your wallet</div>
          </div>
        </div>

        {/* Value Card - Updated for INR */}
        <div className="glass-effect rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/20 rounded-bl-full -z-0"></div>
          <div className="p-6 relative z-10">
            <h2 className="flex items-center text-lg font-semibold text-white mb-4">
              {/* Use text symbol since icon not available */}
              <span className="h-5 w-5 flex items-center justify-center text-yellow-400 mr-2 font-bold">₹</span>
              Value
            </h2>
            <div className="text-4xl font-bold text-white">₹{tokenBalanceInINR || "0.00"}</div>
            <div className="text-white/60">INR</div>
            <div className="mt-2 text-white/60 text-sm">Estimated</div>
          </div>
        </div>
      </div>

      {/* Recent Transactions and Available Rewards sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Recent Transactions */}
        <div className="md:col-span-1 glass-effect rounded-2xl overflow-hidden">
          <div className="eco-gradient p-5 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
          </div>
          <div className="p-5">
            {transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${
                      transaction.type.startsWith('earned') ? 'bg-primary/20' : 'bg-accent/20'
                    }`}>
                      {transaction.type.startsWith('earned') ? (
                        <ArrowUpRight className="h-5 w-5 text-primary" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5 text-accent" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-white">
                        {transaction.type === 'earned_report'
                          ? 'Report Reward'
                          : transaction.type === 'earned_collect'
                          ? 'Collection Reward'
                          : 'Redeemed Points'}
                      </div>
                      <div className="text-xs text-white/60">{transaction.date}</div>
                    </div>
                    <div className={`font-semibold ${
                      transaction.type.startsWith('earned') ? 'text-primary' : 'text-accent'
                    }`}>
                      {transaction.type.startsWith('earned') ? '+' : '-'}{transaction.amount}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-white/60">No transactions yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Available Rewards */}
        <div className="md:col-span-2 glass-effect rounded-2xl overflow-hidden">
          <div className="eco-gradient p-5 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Available Rewards</h2>
            <Gift className="h-6 w-6 text-white" />
          </div>

          <div className="p-5">
            <div className="mb-6 p-6 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 border border-white/10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="mb-4 md:mb-0">
                  <h3 className="text-xl font-bold text-white mb-2">Redeem All Points</h3>
                  <p className="text-white/70">Convert your points into RWT tokens</p>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="text-center">
                    <div className="text-sm text-white/60 mb-1">Your Points</div>
                    <div className="text-2xl font-bold text-white">{balance}</div>
                  </div>
                  <Button
                    onClick={handleRedeemAllPoints}
                    className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white"
                    disabled={!walletAddress || balance <= 0}
                  >
                    Redeem All
                  </Button>
                </div>
              </div>
            </div>

            {/* Other Rewards */}
            {rewards.filter(r => r.id !== 0).map((reward) => (
              <div key={reward.id} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex-1 mb-4 md:mb-0">
                    <h3 className="text-lg font-bold text-white mb-1">{reward.name}</h3>
                    <p className="text-white/70">{reward.description || reward.collectionInfo}</p>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-4">
                      <div className="text-sm text-white/60 mb-1">Cost</div>
                      <div className="text-lg font-bold text-white">{reward.cost} points</div>
                    </div>
                    <Button 
                      onClick={() => handleRedeemReward(reward.id)}
                      disabled={balance < reward.cost || !walletAddress}
                      className={`${balance >= reward.cost ? 'bg-secondary hover:bg-secondary/90' : 'bg-gray-600'} text-white rounded-full px-4 py-2 font-medium`}
                    >
                      Redeem
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
