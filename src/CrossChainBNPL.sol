// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "openzeppelin-contracts/contracts/utils/Pausable.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/**
 * @title ITokenMessenger
 * @notice Circle CCTP V2 interface for cross-chain USDC transfers
 */
interface ITokenMessenger {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce);
}

/**
 * @title CrossChainBNPL
 * @notice Hackathon demo: Cross-chain BNPL with Circle CCTP V2 integration
 * @dev Streamlined version for ETH Global NYC 2025 - World Chain + Base/Arbitrum settlement
 */
contract CrossChainBNPL is Ownable, ReentrancyGuard, Pausable {
    
    /// @notice USDC token contract (World Chain)
    IERC20 public immutable usdc;
    
    /// @notice Circle CCTP TokenMessenger contract
    ITokenMessenger public immutable tokenMessenger;
    
    /// @dev Loan counter for unique IDs
    uint256 public nextLoanId = 1;
    
    /// @notice CCTP domain mappings
    uint32 public constant WORLD_CHAIN_DOMAIN = 0; // Direct transfer, no CCTP
    uint32 public constant BASE_DOMAIN = 2;
    uint32 public constant ARBITRUM_DOMAIN = 3;
    
    /// @notice Loan structure - simplified for demo
    struct Loan {
        uint256 amount;                 // Loan amount in USDC (6 decimals)
        uint256 createdTimestamp;       // When loan was created
        address borrower;               // Borrower address
        address merchant;               // Merchant address
        uint32 settlementDomain;        // Where merchant received payment
        address settlementAddress;     // Merchant's settlement address
        bool isActive;                  // True if loan is active
        string worldIdNullifier;        // World ID for sybil resistance
    }
    
    /// @notice Credit tracking - simplified for demo
    struct CreditScore {
        uint256 creditLimit;            // Current credit limit in USDC
        uint256 totalRepaid;            // Lifetime repaid amount
    }
    
    /// @notice Merchant registration - simplified for demo
    struct Merchant {
        bool isActive;                  // Whether merchant is active
        string name;                    // Business name
        uint256 registeredAt;           // Registration timestamp
    }
    
    /// @dev Core mappings
    mapping(uint256 => Loan) public loans;
    mapping(address => CreditScore) public creditScores;
    mapping(address => Merchant) public merchants;
    mapping(address => uint256[]) public userLoans;
    
    /// @dev Demo configuration (simplified)
    uint256 public initialCreditLimit = 5000000;          // $5 starting credit (5M USDC)
    uint256 public minLoanAmount = 1000000;               // $1 minimum loan (1M USDC)
    uint256 public maxLoanAmount = 5000000;               // $5 maximum loan (5M USDC)
    
    /// @notice Events
    event LoanCreated(
        uint256 indexed loanId, 
        address indexed borrower, 
        address indexed merchant, 
        uint256 amount,
        uint32 settlementDomain,
        address settlementAddress
    );
    
    event CCTPTransferInitiated(
        uint256 indexed loanId,
        uint32 destinationDomain, 
        address settlementAddress,
        uint256 amount,
        uint64 nonce
    );
    
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event MerchantRegistered(address indexed merchant, string name);
    
    /// @notice Custom errors
    error InvalidMerchant();
    error InvalidLoanAmount();
    error InsufficientCreditLimit();
    error LoanNotFound();
    error LoanNotActive();
    error UnauthorizedAccess();
    error InsufficientContractFunds();
    error InvalidDomain();
    error InvalidSettlementAddress();
    
    /**
     * @notice Contract constructor
     * @param _owner Contract owner address
     * @param _usdc USDC token contract address (World Chain)
     * @param _tokenMessenger Circle CCTP TokenMessenger address (World Chain)
     */
    constructor(
        address _owner, 
        address _usdc, 
        address _tokenMessenger
    ) Ownable(_owner) {
        usdc = IERC20(_usdc);
        tokenMessenger = ITokenMessenger(_tokenMessenger);
    }
    
    /**
     * @notice Request a loan with dynamic chain selection for merchant settlement
     * @param merchant Merchant address (for verification)
     * @param amount Loan amount in USDC (6 decimals)
     * @param worldIdNullifier World ID nullifier for sybil resistance
     * @param settlementDomain Where merchant wants USDC (0=World Chain, 2=Base, 3=Arbitrum)
     * @param settlementAddress Merchant's address on settlement chain
     * @dev This is the core innovation - merchant chooses chain per transaction
     */
    function requestLoan(
        address merchant,
        uint256 amount,
        string calldata worldIdNullifier,
        uint32 settlementDomain,
        address settlementAddress
    ) external whenNotPaused nonReentrant {
        // Validate inputs
        if (!merchants[merchant].isActive) revert InvalidMerchant();
        if (amount < minLoanAmount || amount > maxLoanAmount) revert InvalidLoanAmount();
        if (settlementDomain != WORLD_CHAIN_DOMAIN && 
            settlementDomain != BASE_DOMAIN && 
            settlementDomain != ARBITRUM_DOMAIN) revert InvalidDomain();
        if (settlementAddress == address(0)) revert InvalidSettlementAddress();
        
        // Check borrower's credit limit
        CreditScore storage credit = creditScores[msg.sender];
        if (credit.creditLimit == 0) {
            credit.creditLimit = initialCreditLimit; // First-time user
        }
        
        // Calculate total outstanding amount from active loans
        uint256 totalOutstanding = 0;
        uint256[] memory userLoanIds = userLoans[msg.sender];
        for (uint256 i = 0; i < userLoanIds.length; i++) {
            Loan storage loan = loans[userLoanIds[i]];
            if (loan.isActive) {
                totalOutstanding += loan.amount; // Simplified: just use principal
            }
        }
        
        uint256 availableCredit = credit.creditLimit > totalOutstanding ? credit.creditLimit - totalOutstanding : 0;
        if (amount > availableCredit) revert InsufficientCreditLimit();
        
        // Check contract has sufficient USDC
        if (usdc.balanceOf(address(this)) < amount) revert InsufficientContractFunds();
        
        // Create loan record
        uint256 loanId = nextLoanId++;
        loans[loanId] = Loan({
            amount: amount,
            createdTimestamp: block.timestamp,
            borrower: msg.sender,
            merchant: merchant,
            settlementDomain: settlementDomain,
            settlementAddress: settlementAddress,
            isActive: true,
            worldIdNullifier: worldIdNullifier
        });
        
        // Route payment based on merchant's choice
        if (settlementDomain == WORLD_CHAIN_DOMAIN) {
            // Direct transfer on World Chain
            usdc.transfer(settlementAddress, amount);
        } else {
            // Cross-chain transfer via CCTP
            _processCCTPTransfer(loanId, amount, settlementDomain, settlementAddress);
        }
        
        // Track loan for user
        userLoans[msg.sender].push(loanId);
        
        emit LoanCreated(loanId, msg.sender, merchant, amount, settlementDomain, settlementAddress);
    }
    
    /**
     * @notice Process cross-chain USDC transfer via Circle CCTP
     * @param loanId Loan ID for tracking
     * @param amount Amount to transfer
     * @param destinationDomain CCTP domain (2=Base, 3=Arbitrum)
     * @param merchantAddress Where merchant wants USDC on destination chain
     */
    function _processCCTPTransfer(
        uint256 loanId,
        uint256 amount,
        uint32 destinationDomain,
        address merchantAddress
    ) internal {
        // Approve USDC for CCTP TokenMessenger
        usdc.approve(address(tokenMessenger), amount);
        
        // Convert address to bytes32 (CCTP requirement)
        bytes32 mintRecipient = bytes32(uint256(uint160(merchantAddress)));
        
        // Burn USDC on World Chain and initiate cross-chain transfer
        uint64 nonce = tokenMessenger.depositForBurn(
            amount,
            destinationDomain,
            mintRecipient,
            address(usdc)
        );
        
        emit CCTPTransferInitiated(loanId, destinationDomain, merchantAddress, amount, nonce);
    }
    
    /**
     * @notice Simplified loan repayment for demo
     * @param loanId Loan ID to repay
     * @param repaymentAmount Amount to repay
     */
    function repayLoan(uint256 loanId, uint256 repaymentAmount) external nonReentrant {
        Loan storage loan = loans[loanId];
        
        if (loan.amount == 0) revert LoanNotFound();
        if (loan.borrower != msg.sender) revert UnauthorizedAccess();
        if (!loan.isActive) revert LoanNotActive();
        
        // Simple repayment: transfer USDC from user to contract
        require(usdc.transferFrom(msg.sender, address(this), repaymentAmount), "USDC transfer failed");
        
        // For demo: mark as paid if full amount
        if (repaymentAmount >= loan.amount) {
            loan.isActive = false;
            
            // Update credit score
            CreditScore storage credit = creditScores[msg.sender];
            credit.totalRepaid += loan.amount;
        }
        
        emit LoanRepaid(loanId, msg.sender, repaymentAmount);
    }
    
    /**
     * @notice Register a merchant (Admin only)
     * @param merchantAddress Merchant's address
     * @param name Business name
     */
    function registerMerchant(
        address merchantAddress,
        string calldata name
    ) external onlyOwner {
        merchants[merchantAddress] = Merchant({
            isActive: true,
            name: name,
            registeredAt: block.timestamp
        });
        
        emit MerchantRegistered(merchantAddress, name);
    }
    
    /**
     * @notice Get loan details
     * @param loanId Loan ID
     * @return Loan details
     */
    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }
    
    /**
     * @notice Get user's loans
     * @param user User address
     * @return Array of loan IDs
     */
    function getUserLoans(address user) external view returns (uint256[] memory) {
        return userLoans[user];
    }
    
    /**
     * @notice Get user's credit info
     * @param user User address
     * @return creditLimit Current credit limit
     * @return totalRepaid Lifetime total repaid
     */
    function getUserCredit(address user) external view returns (uint256 creditLimit, uint256 totalRepaid) {
        CreditScore memory credit = creditScores[user];
        return (credit.creditLimit, credit.totalRepaid);
    }
    
    /**
     * @notice Fund contract with USDC (Owner only)
     * @param amount Amount to fund
     */
    function fundContract(uint256 amount) external onlyOwner {
        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");
    }
    
    /**
     * @notice Emergency pause
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Emergency unpause
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency withdraw USDC
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdc.balanceOf(address(this));
        usdc.transfer(owner(), balance);
    }
}
