import { SignProtocolClient, SpMode, EvmChains } from "@ethsign/sp-sdk";
import { privateKeyToAccount } from "viem/accounts";

const privateKey = "0xe229e040a5adcc3b7c701e6fb3c2fe8d9fc16a39462268aca2ac55b31d6c942b";
const client = new SignProtocolClient(SpMode.OnChain, {
  chain: EvmChains.baseSepolia,
  account: privateKeyToAccount(privateKey),
});

export const createRewardEligibilityAttestation = async (user: string, eligible: boolean) => {
  const rewardEligibilitySchemaId = "0x9a";
  const attestation = {
    schemaId: rewardEligibilitySchemaId,
    data: {
      user,
      eligible,
      timestamp: Date.now()
    },
    indexingValue: user
  };
  return await client.createAttestation(attestation);
};

export const createDynamicRewardAttestation = async (user: string, baseAmount: string, adjustedAmount: string) => {
  const dynamicRewardSchemaId = "0x9b";
  const attestation = {
    schemaId: dynamicRewardSchemaId,
    data: {
      user,
      baseAmount,
      adjustedAmount,
      timestamp: Date.now()
    },
    indexingValue: user
  };
  return await client.createAttestation(attestation);
};

export const createLotteryWinnerAttestation = async (winner: string, rewardAmount: string) => {
  const lotteryWinnerSchemaId = "0x9c";
  const attestation = {
    schemaId: lotteryWinnerSchemaId,
    data: {
      winner,
      rewardAmount,
      timestamp: Date.now()
    },
    indexingValue: winner
  };
  return await client.createAttestation(attestation);
};

export const createUserActivityAttestation = async (user: string, activityType: string, details: string) => {
  const userActivitySchemaId = "0x9d";
  const attestation = {
    schemaId: userActivitySchemaId,
    data: {
      user,
      activityType,
      details,
      timestamp: Date.now()
    },
    indexingValue: user
  };
  try {
    const result = await client.createAttestation(attestation);
    console.log("User activity attestation created:", result);
    return result;
  } catch (error) {
    console.error("Error creating user activity attestation:", error);
    return null;
  }
};