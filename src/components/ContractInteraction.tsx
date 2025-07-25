import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  claimReward,
  getTokenBalance,
  connectWallet,
} from "@/utils/contractInteraction";

export default function ContractInteraction() {
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const handleConnect = async () => {
    try {
      const userAddress = await connectWallet();
      setAddress(userAddress);
      const userBalance = await getTokenBalance(userAddress);
      setBalance(userBalance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  };

  const handleClaim = async () => {
    try {
      await claimReward(amount);
      const newBalance = await getTokenBalance(address);
      setBalance(newBalance);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim reward");
    }
  };

  return (
      <div className="p-4 space-y-4">
        {!address ? (
            <Button onClick={handleConnect}>Connect Wallet</Button>
        ) : (
            <div className="space-y-4">
              <p>Connected: {address}</p>
              <p>Balance: {balance} RWT</p>
              <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount to claim"
              />
              <Button onClick={handleClaim}>Claim RWT</Button>
            </div>
        )}
        {error && <p className="text-red-500">{error}</p>}
      </div>
  );
}
