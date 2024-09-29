import { ethers } from 'ethers';
import Zero2HeroABI from './RecycleX.json';
import { createRewardEligibilityAttestation, createDynamicRewardAttestation } from './signAttestations';

declare global {
  interface Window {
    ethereum: any;
  }
}

const contractAddress = '0x380AfAA5051cA3bbdE9c46Ff71A3204662346057';

const getContractInstance = () => {
  if (typeof window.ethereum !== 'undefined') {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    return new ethers.Contract(contractAddress, Zero2HeroABI.abi, signer);
  }
  throw new Error('Please install MetaMask!');
};

export const claimReward = async (amount: string) => {
  try {
    const contract = getContractInstance();
    const signer = await contract.signer.getAddress();
    const isEligible = await contract.isEligibleForReward(signer);
    if (!isEligible) {
      throw new Error("User is not eligible for reward");
    }
    await createRewardEligibilityAttestation(signer, true);
    const balance = await contract.balanceOf(signer);
    const amountBN = ethers.utils.parseUnits(amount, 18);
    if (balance.lt(amountBN)) {
      throw new Error(`Insufficient balance. Required: ${ethers.utils.formatUnits(amountBN, 18)} RWT, Available: ${ethers.utils.formatUnits(balance, 18)} RWT`);
    }
    const gasEstimate = await contract.estimateGas.claimReward(amountBN);
    const gasLimit = gasEstimate.mul(120).div(100);
    const tx = await contract.claimReward(amountBN, { gasLimit });
    await tx.wait();
    const adjustedAmount = await contract.calculateDynamicReward(amountBN);
    await createDynamicRewardAttestation(signer, amount, ethers.utils.formatUnits(adjustedAmount, 18));
    return true;
  } catch (error) {
    console.error('Error claiming reward:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to claim reward: ${error.message}`);
    } else {
      throw new Error('Failed to claim reward: Unknown error');
    }
  }
};

export const getLatestETHPrice = async () => {
  try {
    const contract = getContractInstance();
    const price = await contract.getLatestETHPrice();
    return ethers.utils.formatUnits(price, 8);
  } catch (error) {
    console.error('Error getting ETH price:', error);
    return null;
  }
};

export const getStoredUSDValue = async () => {
  try {
    const contract = getContractInstance();
    const value = await contract.storedUSDValue();
    return ethers.utils.formatUnits(value, 18);
  } catch (error) {
    console.error('Error getting stored USD value:', error);
    return null;
  }
};

export const isEligibleForReward = async (address: string) => {
  try {
    const contract = getContractInstance();
    return await contract.isEligibleForReward(address);
  } catch (error) {
    console.error('Error checking reward eligibility:', error);
    return false;
  }
};

export const updatePrices = async () => {
  try {
    const contract = getContractInstance();
    const tx = await contract.updatePrices();
    await tx.wait();
    return true;
  } catch (error) {
    console.error('Error updating prices:', error);
    return false;
  }
};

export const getUnlockTime = async () => {
  try {
    const contract = getContractInstance();
    const unlockTime = await contract.getUnlockTime();
    return unlockTime.toNumber();
  } catch (error) {
    console.error('Error getting unlock time:', error);
    return null;
  }
};

export const getOwner = async () => {
  try {
    const contract = getContractInstance();
    return await contract.getOwner();
  } catch (error) {
    console.error('Error getting owner:', error);
    return null;
  }
};

export const getUpkeepContract = async () => {
  try {
    const contract = getContractInstance();
    return await contract.getUpkeepContract();
  } catch (error) {
    console.error('Error getting upkeep contract:', error);
    return null;
  }
};

export const runLottery = async () => {
  try {
    const contract = getContractInstance();
    const tx = await contract.runLottery();
    await tx.wait();
    return true;
  } catch (error) {
    console.error('Error running lottery:', error);
    return false;
  }
};

export const getLastWinner = async () => {
  try {
    const contract = getContractInstance();
    return await contract.lastWinner();
  } catch (error) {
    console.error('Error getting last winner:', error);
    return null;
  }
};

export const calculateDynamicReward = async (baseAmount: ethers.BigNumber) => {
  try {
    const contract = getContractInstance();
    const reward = await contract.calculateDynamicReward(baseAmount);
    return ethers.utils.formatUnits(reward, 18);
  } catch (error) {
    console.error('Error calculating dynamic reward:', error);
    return null;
  }
};

export const checkUpkeep = async () => {
  try {
    const contract = getContractInstance();
    const [upkeepNeeded, performData] = await contract.checkUpkeep('0x');
    return { upkeepNeeded, performData };
  } catch (error) {
    console.error('Error checking upkeep:', error);
    return null;
  }
};

export const connectWallet = async (): Promise<string> => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      return address;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw new Error('Failed to connect wallet');
    }
  } else {
    throw new Error('Please install MetaMask!');
  }
};

export const getTokenBalance = async (address: string): Promise<string> => {
  try {
    const contract = getContractInstance();
    const balance = await contract.balanceOf(address);
    return ethers.utils.formatUnits(balance, 18);
  } catch (error) {
    console.error('Error getting token balance:', error);
    throw new Error('Failed to get token balance');
  }
};

export const mintRWT = async (address: string, amount: string) => {
  try {
    const contract = getContractInstance();
    const amountBN = ethers.utils.parseUnits(amount, 18);
    const tx = await contract.claimReward(amountBN);
    await tx.wait();
    return true;
  } catch (error) {
    console.error('Error claiming RWT:', error);
    throw new Error('Failed to claim RWT tokens');
  }
};