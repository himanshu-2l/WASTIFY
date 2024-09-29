// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract RecycleX is FunctionsClient, ConfirmedOwner, ERC20, VRFConsumerBaseV2, AutomationCompatibleInterface {
    uint private immutable unlockTime;
    address private upkeepContract;
    bytes private request;
    uint64 public subscriptionId;
    uint32 public gasLimit;
    bytes32 public donID;
    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    uint public storedUSDValue;
    AggregatorV3Interface internal immutable ethUsdPriceFeed;

    uint256 public constant REWARD_AMOUNT = 100 * 10**18; // 100 tokens
    uint256 public constant REWARD_INTERVAL = 1 days;
    mapping(address => uint256) public lastRewardTime;

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    uint256 public lastLotteryTime;
    uint256 public constant LOTTERY_INTERVAL = 7 days;
    address public lastWinner;

    string public latestNewsHeadline;

    event Withdrawal(uint amount, uint when);
    event Response(bytes32 indexed requestId, bytes response, bytes err);
    event Reward(address indexed user, uint256 amount);
    event PriceUpdated(int ethPrice, uint256 usdValue);
    event LotteryWinner(address winner, uint256 amount);

    error NotAllowedCaller(address caller, address owner, address automationRegistry);
    error UnexpectedRequestID(bytes32 requestId);

    constructor(
        uint _unlockTime, 
        address router, 
        address _priceFeed,
        address vrfCoordinatorV2,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit
    ) 
        payable 
        FunctionsClient(router) 
        ConfirmedOwner(msg.sender)
        ERC20("RewardToken", "RWT")
        VRFConsumerBaseV2(vrfCoordinatorV2)
    {
        require(block.timestamp < _unlockTime, "Unlock time should be in the future");
        unlockTime = _unlockTime;
        ethUsdPriceFeed = AggregatorV3Interface(_priceFeed);
        _mint(address(this), 1000000 * 10**18); // Mint 1 million tokens to the contract
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        lastLotteryTime = block.timestamp;
    }

    modifier onlyAllowed() {
        if (msg.sender != owner() && msg.sender != upkeepContract)
            revert NotAllowedCaller(msg.sender, owner(), upkeepContract);
        _;
    }

    function setAutomationCronContract(address _upkeepContract) external onlyOwner {
        upkeepContract = _upkeepContract;
    }

    function updateRequest(
        bytes memory _request,
        uint64 _subscriptionId,
        uint32 _gasLimit,
        bytes32 _donID
    ) external onlyOwner {
        request = _request;
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
        donID = _donID;
    }

    function sendRequestCBOR() external onlyAllowed returns (bytes32 requestId) {
        s_lastRequestId = _sendRequest(
            request,
            subscriptionId,
            gasLimit,
            donID
        );
        return s_lastRequestId;
    }

    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (s_lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }
        s_lastResponse = response;
        s_lastError = err;
        
        // Assuming the response is a uint256 representing the USD value
        if (response.length > 0) {
            storedUSDValue = abi.decode(response, (uint256));
        }
        
        emit Response(requestId, s_lastResponse, s_lastError);
    }

    function getLatestETHPrice() public view returns (int) {
        (
            /* uint80 roundID */,
            int price,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = ethUsdPriceFeed.latestRoundData();
        return price;
    }

    function claimReward(uint256 amount) external {
        require(isEligibleForReward(msg.sender), "Reward not yet available");
        require(balanceOf(address(this)) >= amount, "Not enough tokens in contract");

        lastRewardTime[msg.sender] = block.timestamp;
        uint256 actualReward = calculateDynamicReward(amount);
        _transfer(address(this), msg.sender, actualReward);

        emit Reward(msg.sender, actualReward);
    }

    function isEligibleForReward(address user) public view returns (bool) {
        if (lastRewardTime[user] == 0) {
            return true; // User has never claimed a reward, so they are eligible
        }
        return block.timestamp >= lastRewardTime[user] + REWARD_INTERVAL;
    }

    function updatePrices() external {
        int ethPrice = getLatestETHPrice();
        emit PriceUpdated(ethPrice, storedUSDValue);
    }

    function withdraw() public onlyOwner {
        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        uint amount = address(this).balance;
        (bool success,) = payable(owner()).call{value: amount}("");
        require(success, "Transfer failed.");
        emit Withdrawal(amount, block.timestamp);
    }

    // Add public getter functions if needed
    function getUnlockTime() public view returns (uint) {
        return unlockTime;
    }

    function getOwner() public view returns (address) {
        return owner(); // Use the owner() function from ConfirmedOwner
    }

    function getUpkeepContract() public view returns (address) {
        return upkeepContract;
    }

    function getRequest() public view returns (bytes memory) {
        return request;
    }

    function runLottery() public {
        require(block.timestamp >= lastLotteryTime + LOTTERY_INTERVAL, "Lottery not ready");
        lastLotteryTime = block.timestamp;
        i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
    }

    function fulfillRandomWords(uint256, uint256[] memory randomWords) internal override {
        uint256 winnerIndex = randomWords[0] % totalSupply();
        address winner = _selectWinner(winnerIndex);
        uint256 reward = REWARD_AMOUNT * 10; // 10x normal reward for lottery winner
        _transfer(address(this), winner, reward);
        lastWinner = winner;
        emit LotteryWinner(winner, reward);
    }

    function _selectWinner(uint256 winnerIndex) internal view returns (address) {
        uint256 totalSupply = totalSupply();
        uint256 accumulatedTokens = 0;
        address[] memory holders = new address[](totalSupply);
        uint256 holderCount = 0;

        for (uint i = 0; i < totalSupply; i++) {
            address account = _msgSender(); // This is a placeholder, as ERC20 doesn't track individual token owners
            uint256 balance = balanceOf(account);
            if (balance > 0) {
                holders[holderCount] = account;
                holderCount++;
                accumulatedTokens += balance;
                if (accumulatedTokens > winnerIndex) {
                    return account;
                }
            }
        }
        require(holderCount > 0, "No token holders found");
        return holders[winnerIndex % holderCount];
    }

    function calculateDynamicReward(uint256 baseAmount) public view returns (uint256) {
        int ethPrice = getLatestETHPrice();
        // Adjust reward based on ETH price. Higher ETH price = lower reward
        uint256 adjustedReward = baseAmount * 1e8 / uint256(ethPrice);
        return adjustedReward;
    }

    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory) {
        upkeepNeeded = (block.timestamp - lastLotteryTime >= LOTTERY_INTERVAL);
        return (upkeepNeeded, "");
    }

    function performUpkeep(bytes calldata) external override {
        if (block.timestamp - lastLotteryTime >= LOTTERY_INTERVAL) {
            runLottery();
        }
    }
}
