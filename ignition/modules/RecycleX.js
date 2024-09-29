const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("Zero2HeroModule", (m) => {
  const unlockTime = m.getParameter("unlockTime", Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60); // 1 year from now
  const routerAddress = m.getParameter("routerAddress", "0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C"); // Chainlink Functions Router address for Sepolia
  const priceFeedAddress = m.getParameter("priceFeedAddress", "0x694AA1769357215DE4FAC081bf1f309aDC325306"); // ETH/USD price feed address for Sepolia
  const vrfCoordinatorAddress = m.getParameter("vrfCoordinatorAddress", "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625"); // VRF Coordinator address for Sepolia
  const gasLane = m.getParameter("gasLane", "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"); // gas lane (keyHash) for Sepolia
  const subscriptionId = m.getParameter("subscriptionId", 0); // Replace with your actual subscription ID
  const callbackGasLimit = m.getParameter("callbackGasLimit", 200000); // callback gas limit

  const zero2Hero = m.contract("RecycleX.sol", [
    unlockTime,
    routerAddress,
    priceFeedAddress,
    vrfCoordinatorAddress,
    gasLane,
    subscriptionId,
    callbackGasLimit
  ]);

  return { zero2Hero };
});