// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


/**
 * @title QuestEscrow
 * @dev Implement all functions so `test/QuestEscrow.assessment.test.ts` passes.
 * 
 * @notice This contract serves as an escrow for quests, allowing posters to create quests, candidates to accept and submit work, and a mechanism for approval, payment, and dispute resolution.
 * - Added Quest struct with all required fields for assessment scenarios A-I
 * - Added quests mapping to store quest data by ID
 * - Added nextQuestId counter for unique quest identification
 * - QuestStatus enum already defined (Open, Accepted, Submitted, Completed, Cancelled, Refunded)
 */
contract QuestEscrow is ReentrancyGuard, Ownable {
    
    enum QuestStatus {
        Open,        
        Accepted,    
        Submitted,   
        Completed,   
        Cancelled,   
        Refunded     
    }

    uint256 public constant FEE_BPS = 300;           
    uint256 public constant BPS_DENOMINATOR = 10_000; 
    uint256 public constant MIN_DEADLINE_SECONDS = 3600;

    /**
     * @dev Quest structure storing all information for a bounty
     * 
     * - All fields are required for the 9 assessment scenarios (A-I)
     * - deliverable stores IPFS hash or URL string (max 64 chars per test expectation)
     * - token = address(0) indicates ETH payment; otherwise ERC20 token address
     * - reward is stored as uint256 (in wei for ETH, or token decimals for ERC20)
     */
    struct Quest {
        address poster;         
        address worker;         
        address token;          
        uint256 reward;         
        uint256 deadline;       
        QuestStatus status;     
        string deliverable;     
        uint256 acceptedAt;     
        uint256 submittedAt;    
    }


     /**
     * @dev Storage mappings and counters
     * 
     * - quests[questId] stores full Quest struct for each created bounty
     * - nextQuestId auto-increments to ensure unique quest identifiers
     * - availableFees tracks accumulated protocol fees per address (owner withdraws)
     */
    mapping(uint256 => Quest) public quests;     
    mapping(address => uint256) public availableFees;

    uint256 public nextQuestId;

    // ==================== EVENTS ====================
    event QuestCreated(
        uint256 indexed questId,
        address indexed poster,
        address token,
        uint256 reward,
        uint256 deadline,
        string title,
        string description
    );

    event QuestAccepted(
        uint256 indexed questId,
        address indexed worker,
        uint256 acceptedAt
    );

    constructor() Ownable(msg.sender) {
        nextQuestId = 1;
    }


    /**
     * @dev Creates a new quest/bounty
     * @param title Title of the quest (not stored on-chain, for event indexing)
     * @param description Description of the quest (not stored on-chain, for event indexing)
     * @param reward Amount to pay (in wei for ETH, or token decimals for ERC20)
     * @param durationSeconds Duration of quest in seconds (deadline = block.timestamp + duration)
     * @param deadlineTimestamp Alternative: absolute deadline timestamp (use 0 to use durationSeconds)
     * @param tokenAddress address(0) for ETH, or ERC20 contract address
     * @return questId The ID of the newly created quest
     * 
     * - Uses nextQuestId and increments after storing
     * - For ETH: uses msg.value to receive payment
     * - For ERC20: calls transferFrom to pull tokens from poster
     * - Validates reward > 0 and deadline > block.timestamp
     * - Minimum deadline enforced: cannot be less than 1 hour from now
     */
    function createQuest(
        string calldata title,
        string calldata description,
        uint256 reward,
        uint256 durationSeconds,
        uint256 deadlineTimestamp,
        address tokenAddress
    ) external payable nonReentrant returns (uint256) {
        
        require(reward > 0, "invalid reward");
        
        uint256 deadline;
        if (deadlineTimestamp > 0) {
            deadline = deadlineTimestamp;
        } else {
            require(durationSeconds >= MIN_DEADLINE_SECONDS, "deadline too short");
            deadline = block.timestamp + durationSeconds;
        }
        require(deadline > block.timestamp, "deadline must be in future");
        
        if (tokenAddress == address(0)) {
            require(msg.value == reward, "ETH amount mismatch");
        } else {
            IERC20 token = IERC20(tokenAddress);
            require(token.transferFrom(msg.sender, address(this), reward), "ERC20 transfer failed");
        }
        
        uint256 questId = nextQuestId;
        nextQuestId++;
        
        quests[questId] = Quest({
            poster: msg.sender,
            worker: address(0),
            token: tokenAddress,
            reward: reward,
            deadline: deadline,
            status: QuestStatus.Open,
            deliverable: "",
            acceptedAt: 0,
            submittedAt: 0
        });
        
        emit QuestCreated(questId, msg.sender, tokenAddress, reward, deadline, title, description);
        
        return questId;
    }

        /**
     * @dev Allows a worker to accept an open quest
     * @param questId The ID of the quest to accept
     * 
     * @notice NOTES:
     * - Validates quest exists (implicitly via questId mapping)
     * - Validates quest status is Open (not Accepted/Submitted/Completed)
     * - Validates deadline has not passed
     * - Assigns msg.sender as the worker
     * - Records acceptedAt timestamp for timeout calculations
     * - Updates status from Open to Accepted
     * - Emits QuestAccepted event
     */
    function acceptQuest(uint256 questId) external nonReentrant {
        Quest storage quest = quests[questId];
        
        require(quest.poster != address(0), "quest does not exist");
        require(quest.status == QuestStatus.Open, "quest not open");
        require(block.timestamp <= quest.deadline, "deadline passed");
        require(quest.worker == address(0), "worker already assigned");
        
        quest.worker = msg.sender;
        quest.acceptedAt = block.timestamp;
        quest.status = QuestStatus.Accepted;
        
        emit QuestAccepted(questId, msg.sender, block.timestamp);
    }


    function _candidateStub() internal pure {
        revert("QuestEscrow: candidate implementation required");
    }

    function submitWork(uint256, string calldata) external {
        _candidateStub();
    }

    function approveAndPay(uint256) external {
        _candidateStub();
    }

    function claimTimeoutPayout(uint256) external {
        _candidateStub();
    }

    function cancelQuest(uint256) external {
        _candidateStub();
    }

    function refundPoster(uint256) external {
        _candidateStub();
    }

    function withdrawFees(address) external onlyOwner {
        _candidateStub();
    }

    function getAvailableFees(address) external view returns (uint256) {
        _candidateStub();
    }

    function getQuest(uint256)
        external
        view
        returns (
            address,
            address,
            string memory,
            string memory,
            uint256,
            address,
            uint256,
            uint256,
            uint256,
            uint8,
            string memory
        )
    {
        _candidateStub();
    }
}
