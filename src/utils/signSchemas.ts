import { SignProtocolClient, SpMode, EvmChains } from "@ethsign/sp-sdk";
import { privateKeyToAccount } from "viem/accounts";

const privateKey = "0xe229e040a5adcc3b7c701e6fb3c2fe8d9fc16a39462268aca2ac55b31d6c942b";
const client = new SignProtocolClient(SpMode.OnChain, {
  chain: EvmChains.sepolia,
  account: privateKeyToAccount(privateKey),
});

export const createSchemas = async () => {
  const rewardEligibilitySchema = {
    name: "Reward Eligibility",
    data: [
      { name: "user", type: "address" },
      { name: "eligible", type: "bool" },
      { name: "timestamp", type: "uint256" }
    ]
  } as any;
  const rewardEligibilitySchemaId = await client.createSchema(rewardEligibilitySchema);

  const dynamicRewardSchema = {
    name: "Dynamic Reward",
    data: [
      { name: "user", type: "address" },
      { name: "baseAmount", type: "uint256" },
      { name: "adjustedAmount", type: "uint256" },
      { name: "timestamp", type: "uint256" }
    ]
  } as any;
  const dynamicRewardSchemaId = await client.createSchema(dynamicRewardSchema);

  const lotteryWinnerSchema = {
    name: "Lottery Winner",
    data: [
      { name: "winner", type: "address" },
      { name: "rewardAmount", type: "uint256" },
      { name: "timestamp", type: "uint256" }
    ]
  } as any;
  const lotteryWinnerSchemaId = await client.createSchema(lotteryWinnerSchema);

  const userActivitySchema = {
    name: "User Activity",
    data: [
      { name: "user", type: "address" },
      { name: "activityType", type: "string" },
      { name: "details", type: "string" },
      { name: "timestamp", type: "uint256" }
    ]
  } as any;
  const userActivitySchemaId = await client.createSchema(userActivitySchema);

  return {
    rewardEligibilitySchemaId,
    dynamicRewardSchemaId,
    lotteryWinnerSchemaId,
    userActivitySchemaId
  };
};