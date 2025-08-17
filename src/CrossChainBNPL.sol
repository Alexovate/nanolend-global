// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "openzeppelin-contracts/contracts/utils/Pausable.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/**
 * @title ISignatureTransfer
 * @notice Interface for Uniswap Permit2 signature transfer functionality
 * @dev Used for gasless token transfers via World App
 */
interface ISignatureTransfer {
    /// @notice Token permissions for permit2 transfers
    struct TokenPermissions {
        address token;
        uint256 amount;
    }

    /// @notice Permit structure for transfers
    struct PermitTransferFrom {
        TokenPermissions permitted;
        uint256 nonce;
        uint256 deadline;
    }

    /// @notice Transfer details for signature transfer
    struct SignatureTransferDetails {
        address to;
        uint256 requestedAmount;
    }

    /// @notice Standard permit2 function for signature transfers
    function permitTransferFrom(
        PermitTransferFrom memory permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external;
}

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
 * @notice ETH Global NYC 2025: BNPL system + CCTP Offramp for Philippines merchants
 * @dev Dual-purpose: Loan management + USDC bridge to Ethereum for GCash cash-out
 */
contract CrossChainBNPL is Ownable, ReentrancyGuard, Pausable {
    
    /// @notice USDC token contract (World Chain)
    IERC20 public immutable usdc;
    
    /// @notice Circle CCTP TokenMessenger contract
    ITokenMessenger public immutable tokenMessenger;
    
    /// @notice Uniswap Permit2 contract (Universal address across chains)
    ISignatureTransfer public constant PERMIT2 = ISignatureTransfer(0x000000000022D473030F116dDEE9F6B43aC78BA3);
    
    /// @dev Loan counter for unique IDs
    uint256 public nextLoanId = 1;
    
    /// @notice CCTP domain mappings
    uint32 public constant WORLD_CHAIN_DOMAIN = 0; // Direct transfer, no CCTP
    uint32 public constant BASE_DOMAIN = 2;
    uint32 public constant ARBITRUM_DOMAIN = 3;
    
    /// @notice Enhanced loan structure for comprehensive tracking
    struct Loan {
        uint256 originalPrincipal;      // Original loan amount in USDC (6 decimals)
        uint256 createdTimestamp;       // When loan was created
        address borrower;               // Borrower address
        address merchant;               // Merchant address
        uint32 settlementDomain;        // Where merchant received payment
        address settlementAddress;     // Merchant's settlement address
        bool isActive;                  // True if loan is active
        string worldIdNullifier;        // World ID for sybil resistance
        string borrowerUsername;        // World App username for merchant dashboard
    }
    
    /// @notice Enhanced credit tracking with progression
    struct CreditScore {
        uint256 creditLimit;            // Current credit limit in USDC (6 decimals)
        uint256 totalRepaid;            // Total amount repaid by user (lifetime, in USDC)
        uint256 lastCreditUpgrade;      // Credit limit at last upgrade (for tracking)
    }
    
    /// @notice Loan summary for dashboard display - optimized data structure
    struct LoanSummary {
        uint256 loanId;                 // Loan ID
        uint256 originalPrincipal;      // Original principal amount
        uint256 currentPrincipal;       // Current remaining principal 
        uint256 interestAccrued;        // Current accrued interest
        uint256 totalOwed;              // Total amount owed (principal + interest)
        uint256 createdTimestamp;       // When loan was created
        address merchant;               // Merchant address
        string merchantName;            // Merchant name for display
        string merchantLocation;        // Merchant location for display
        string borrowerUsername;        // Borrower username from World App
    }
    
    /// @notice Merchant summary for dashboard display
    struct MerchantSummary {
        address merchantAddress;        // Merchant wallet address
        bool isActive;                  // Whether merchant is active
        uint256 outstandingLoans;       // Current outstanding loans
        uint256 totalProcessed;         // Total lifetime loans processed
        string name;                    // Business name
        string location;                // Business location
    }
    
    /// @notice User type enumeration
    enum UserType { CUSTOMER, MERCHANT, BOTH }
    
    /// @notice Complete dashboard data structure - everything in one call
    struct UserDashboard {
        // User credit information
        uint256 creditLimit;            // Current credit limit
        uint256 totalRepaid;            // Lifetime total repaid
        uint256 availableCredit;        // Available credit right now
        
        // Active loans (all of them - no arbitrary limit)
        LoanSummary[] activeLoans;      // All active loans with full details
        
        // User type and merchant data (if applicable)
        UserType userType;              // CUSTOMER, MERCHANT, or BOTH
        MerchantSummary merchantData;   // Merchant info (empty if not merchant)
    }
    
    /// @notice Merchant registration - enhanced for offramp
    struct Merchant {
        bool isActive;                  // Whether merchant is active
        string name;                    // Business name
        string location;                // Business location
        string gcashNumber;             // GCash number for cash-out support
        uint256 registeredAt;           // Registration timestamp
        uint256 outstandingLoans;       // Current total owed by customers (in USDC)
        uint256 totalRepaid;            // Lifetime customer repayments (in USDC)
        uint256 totalBridged;           // Total USDC bridged to Ethereum
        uint256 bridgeCount;            // Number of bridge transactions
    }
    
    /// @notice Bridge transaction tracking
    struct BridgeTransaction {
        address merchant;               // Merchant who initiated bridge
        address ethereumRecipient;      // Destination address on Ethereum
        uint256 amount;                 // Amount bridged
        uint64 cctpNonce;              // Circle CCTP nonce
        uint256 timestamp;              // Bridge timestamp
        BridgeStatus status;            // Current status
    }
    
    /// @notice Bridge transaction status
    enum BridgeStatus {
        INITIATED,                      // Bridge transaction started
        CONFIRMED,                      // CCTP completed successfully
        FAILED                          // Bridge failed
    }
    
    /// @dev Core mappings
    mapping(uint256 => Loan) public loans;
    mapping(address => CreditScore) public creditScores;
    mapping(address => Merchant) public merchants;
    mapping(address => uint256[]) public userLoans;
    mapping(uint64 => BridgeTransaction) public bridgeTransactions;
    
    /// @dev Enhanced BNPL Configuration (All amounts in USDC with 6 decimals)
    uint256 public interestRatePerSecond = 15854895991;   // 50% annual rate
    uint256 public initialCreditLimit = 2000000;          // $2 starting credit (2M USDC)
    uint256 public creditLimitIncrease = 1000000;         // $1 increase per upgrade (1M USDC)
    uint256 public maxCreditLimit = 5000000;              // $5 maximum credit limit (5M USDC)
    uint256 public minLoanAmount = 250000;                // $0.25 minimum loan (250K USDC)
    uint256 public maxLoanAmount = 5000000;               // $5 maximum loan (5M USDC)
    uint256 public merchantLimit = 50000000;              // $50 limit for all merchants (50M USDC)
    
    /// @dev Emergency Controls
    bool public newLoansEnabled = true;                // Can disable new loans only
    bool public repaymentsEnabled = true;              // Can disable repayments only
    
    /// @dev Offramp configuration
    uint32 public constant ETHEREUM_DOMAIN = 0;           // Circle CCTP Ethereum domain
    uint256 public serviceFeeUSDC = 0;                    // Zero fees for hackathon demo
    
    /// @notice Enhanced events for comprehensive tracking
    event LoanCreated(uint256 indexed loanId, address indexed borrower, address indexed merchant, uint256 amount);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount, bool isFullRepayment);
    event CreditLimitChanged(address indexed borrower, uint256 newLimit);
    event MerchantRegistered(address indexed merchant, string name, string location);
    event MerchantUpdated(address indexed merchant, string name, string location);
    
    /// @notice CCTP and Bridge events
    event CCTPTransferInitiated(
        uint256 indexed loanId,
        uint32 destinationDomain, 
        address settlementAddress,
        uint256 amount,
        uint64 nonce
    );
    
    /// @notice Offramp bridge events
    event BridgeInitiated(
        address indexed merchant,
        address indexed ethereumRecipient,
        uint256 amount,
        uint64 cctpNonce,
        uint256 timestamp
    );
    
    event BridgeConfirmed(uint64 indexed cctpNonce, address indexed merchant);
    event BridgeFailed(uint64 indexed cctpNonce, address indexed merchant, string reason);
    
    /// @notice Enhanced custom errors
    error InvalidMerchant();
    error InvalidLoanAmount();
    error InsufficientCreditLimit();
    error MerchantOutstandingLimitExceeded();
    error LoanNotFound();
    error LoanNotActive();
    error MerchantNotActive();
    error UnauthorizedAccess();
    error InvalidRepaymentAmount();
    error NewLoansDisabled();
    error RepaymentsDisabled();
    error InsufficientContractFunds();
    error InvalidToken();
    error InvalidRecipient();
    error PermitExpired();
    error ZeroAmount();
    error ExcessiveRepayment();
    error InvalidDomain();
    error InvalidSettlementAddress();
    error InvalidBridgeAmount();
    error InvalidEthereumAddress();
    error InsufficientMerchantBalance();
    
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
     * @notice Request a loan with enhanced tracking and World ID integration
     * @param merchant Merchant address (for verification)
     * @param amount Loan amount in USDC (6 decimals)
     * @param borrowerUsername World App username for merchant dashboard
     * @param worldIdNullifier World ID nullifier for sybil resistance
     * @param settlementDomain Where merchant wants USDC (0=World Chain, 2=Base, 3=Arbitrum)
     * @param settlementAddress Merchant's address on settlement chain
     */
    function requestLoan(
        address merchant,
        uint256 amount,
        string calldata borrowerUsername,
        string calldata worldIdNullifier,
        uint32 settlementDomain,
        address settlementAddress
    ) external whenNotPaused nonReentrant {
        // System controls
        if (!newLoansEnabled) revert NewLoansDisabled();
        if (!merchants[merchant].isActive) revert MerchantNotActive();
        if (amount < minLoanAmount || amount > maxLoanAmount) revert InvalidLoanAmount();
        if (settlementDomain != WORLD_CHAIN_DOMAIN && 
            settlementDomain != BASE_DOMAIN && 
            settlementDomain != ARBITRUM_DOMAIN) revert InvalidDomain();
        if (settlementAddress == address(0)) revert InvalidSettlementAddress();
        
        // Initialize credit for new users (automatic World ID verification)
        CreditScore storage credit = creditScores[msg.sender];
        if (credit.creditLimit == 0) {
            credit.creditLimit = initialCreditLimit;
            credit.lastCreditUpgrade = 0;
        }
        
        // Calculate available credit (enhanced calculation)
        uint256 totalOutstanding = 0;
        uint256[] memory userLoanIds = userLoans[msg.sender];
        for (uint256 i = 0; i < userLoanIds.length; i++) {
            Loan storage loan = loans[userLoanIds[i]];
            if (loan.isActive) {
                (,, uint256 totalOwed) = getCurrentBalance(userLoanIds[i]);
                totalOutstanding += totalOwed;
            }
        }
        
        uint256 availableCredit = credit.creditLimit > totalOutstanding ? credit.creditLimit - totalOutstanding : 0;
        if (amount > availableCredit) revert InsufficientCreditLimit();
        
        // Check merchant capacity
        if (merchants[merchant].outstandingLoans + amount > merchantLimit) revert MerchantOutstandingLimitExceeded();
        
        // Check contract has sufficient USDC
        if (usdc.balanceOf(address(this)) < amount) revert InsufficientContractFunds();
        
        // Create enhanced loan record
        uint256 loanId = nextLoanId++;
        loans[loanId] = Loan({
            originalPrincipal: amount,
            createdTimestamp: block.timestamp,
            borrower: msg.sender,
            merchant: merchant,
            settlementDomain: settlementDomain,
            settlementAddress: settlementAddress,
            isActive: true,
            worldIdNullifier: worldIdNullifier,
            borrowerUsername: borrowerUsername
        });
        
        // Update merchant outstanding loans
        merchants[merchant].outstandingLoans += amount;
        
        // Route payment based on merchant's choice
        if (settlementDomain == WORLD_CHAIN_DOMAIN) {
            // Direct transfer on World Chain
            require(usdc.transfer(settlementAddress, amount), "USDC transfer failed");
        } else {
            // Cross-chain transfer via CCTP
            _processCCTPTransfer(loanId, amount, settlementDomain, settlementAddress);
        }
        
        // Track loan for user
        userLoans[msg.sender].push(loanId);
        
        emit LoanCreated(loanId, msg.sender, merchant, amount);
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
     * @notice Calculate interest on principal for given time period
     * @param principal Principal amount in USDC (6 decimals)
     * @param secondsBorrowed Time period in seconds
     * @return interest Interest amount in USDC (6 decimals)
     */
    function calculateInterest(uint256 principal, uint256 secondsBorrowed) public view returns (uint256) {
        uint256 interest = (principal * interestRatePerSecond * secondsBorrowed) / 1e18;
        uint256 cappedInterest = (principal * 50) / 100; // 50% cap per loan
        return interest > cappedInterest ? cappedInterest : interest;
    }
    
    /**
     * @notice Get current balance of a loan (principal + interest)
     * @param loanId Loan ID to check
     * @return principal Current principal remaining
     * @return interest Current interest accrued
     * @return totalOwed Total amount owed (principal + interest)
     */
    function getCurrentBalance(uint256 loanId) public view returns (uint256 principal, uint256 interest, uint256 totalOwed) {
        Loan storage loan = loans[loanId];
        if (loan.originalPrincipal == 0) revert LoanNotFound();
        
        if (!loan.isActive) {
            return (0, 0, 0); // Loan already repaid
        }
        
        // For demo: simplified - assume principal is always the original amount until repaid
        principal = loan.originalPrincipal;
        
        // Calculate interest based on time elapsed
        uint256 timeElapsed = block.timestamp - loan.createdTimestamp;
        interest = calculateInterest(principal, timeElapsed);
        
        totalOwed = principal + interest;
    }
    
    /**
     * @notice Repay a loan using permit2 signature transfer
     * @param loanId Loan ID to repay
     * @param permitTransferFrom Permit2 transfer data structure
     * @param transferDetails Transfer details for permit2
     * @param signature User's permit2 signature
     * @dev Single-transaction repayment using World App's permit2 integration
     */
    function repayLoan(
        uint256 loanId,
        ISignatureTransfer.PermitTransferFrom memory permitTransferFrom,
        ISignatureTransfer.SignatureTransferDetails memory transferDetails,
        bytes memory signature
    ) external nonReentrant {
        // System controls & validation
        if (!repaymentsEnabled) revert RepaymentsDisabled();
        if (permitTransferFrom.permitted.token != address(usdc)) revert InvalidToken();
        if (transferDetails.to != address(this)) revert InvalidRecipient();
        if (permitTransferFrom.deadline < block.timestamp) revert PermitExpired();

        Loan storage loan = loans[loanId];
        if (loan.originalPrincipal == 0) revert LoanNotFound();
        if (loan.borrower != msg.sender) revert UnauthorizedAccess();
        if (!loan.isActive) revert LoanNotActive();
        
        uint256 repaymentAmount = transferDetails.requestedAmount;
        if (repaymentAmount == 0) revert ZeroAmount();

        // Get current loan balance
        (uint256 principal, , uint256 totalOwed) = getCurrentBalance(loanId);
        
        // Prevent overpayment (user protection)
        if (repaymentAmount > totalOwed) revert ExcessiveRepayment();

        // Call the actual permit2 contract to execute the transfer
        // This transfers USDC from msg.sender to this contract
        PERMIT2.permitTransferFrom(
            permitTransferFrom,
            transferDetails,
            msg.sender, // The user who signed the permit
            signature
        );

        address borrower = loan.borrower;
        address merchant = loan.merchant;
        CreditScore storage credit = creditScores[borrower];
        
        // Determine if this is a full repayment
        bool isFullRepayment = repaymentAmount >= totalOwed;
        
        if (isFullRepayment) {
            // Full repayment
            loan.isActive = false;
            merchants[merchant].outstandingLoans -= loan.originalPrincipal;
            
            // Credit building: full repayment counts entire principal
            credit.totalRepaid += principal; // Only count principal for credit
            
            // Check for credit upgrade
            if (credit.totalRepaid >= credit.lastCreditUpgrade + credit.creditLimit && 
                credit.creditLimit < maxCreditLimit) {
                credit.creditLimit += creditLimitIncrease;
                credit.lastCreditUpgrade = credit.totalRepaid;
                
                emit CreditLimitChanged(borrower, credit.creditLimit);
            }
            
            // Track merchant repayment
            merchants[merchant].totalRepaid += repaymentAmount;
        } else {
            // Partial repayment logic can be added here for future enhancement
            // For now, demo supports full repayment only
            revert InvalidRepaymentAmount();
        }

        emit LoanRepaid(loanId, borrower, repaymentAmount, isFullRepayment);
    }
    
    /**
     * @notice Register a merchant with enhanced tracking
     * @param merchantAddress Merchant's address
     * @param name Business name
     * @param location Business location
     * @param gcashNumber GCash number for Philippines cash-out support
     */
    function registerMerchant(
        address merchantAddress,
        string calldata name,
        string calldata location,
        string calldata gcashNumber
    ) external onlyOwner {
        merchants[merchantAddress] = Merchant({
            isActive: true,
            name: name,
            location: location,
            gcashNumber: gcashNumber,
            registeredAt: block.timestamp,
            outstandingLoans: 0,
            totalRepaid: 0,
            totalBridged: 0,
            bridgeCount: 0
        });
        
        emit MerchantRegistered(merchantAddress, name, location);
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
    
    // ==================== OFFRAMP BRIDGE FUNCTIONS ====================
    
    /**
     * @notice Bridge USDC from World Chain to Ethereum for GCash cash-out
     * @param amount Amount of USDC to bridge (6 decimals)
     * @param ethereumRecipient Destination address on Ethereum
     * @dev Merchants use this to bridge accumulated USDC for fiat cash-out
     */
    function bridgeToEthereum(
        uint256 amount,
        address ethereumRecipient
    ) external whenNotPaused nonReentrant {
        // Validate inputs
        if (!merchants[msg.sender].isActive) revert InvalidMerchant();
        if (amount == 0) revert InvalidBridgeAmount();
        if (ethereumRecipient == address(0)) revert InvalidEthereumAddress();
        
        // Check merchant has sufficient USDC balance
        uint256 merchantBalance = usdc.balanceOf(msg.sender);
        if (merchantBalance < amount) revert InsufficientMerchantBalance();
        
        // Transfer USDC from merchant to contract
        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");
        
        // Approve CCTP TokenMessenger
        usdc.approve(address(tokenMessenger), amount);
        
        // Convert Ethereum address to bytes32 (CCTP requirement)
        bytes32 mintRecipient = bytes32(uint256(uint160(ethereumRecipient)));
        
        // Initiate CCTP bridge to Ethereum
        uint64 nonce = tokenMessenger.depositForBurn(
            amount,
            ETHEREUM_DOMAIN,
            mintRecipient,
            address(usdc)
        );
        
        // Record bridge transaction
        bridgeTransactions[nonce] = BridgeTransaction({
            merchant: msg.sender,
            ethereumRecipient: ethereumRecipient,
            amount: amount,
            cctpNonce: nonce,
            timestamp: block.timestamp,
            status: BridgeStatus.INITIATED
        });
        
        // Update merchant bridge statistics
        Merchant storage merchant = merchants[msg.sender];
        merchant.totalBridged += amount;
        merchant.bridgeCount++;
        
        emit BridgeInitiated(msg.sender, ethereumRecipient, amount, nonce, block.timestamp);
    }
    
    /**
     * @notice Get merchant profile with bridge statistics
     * @param merchantAddress Merchant address
     * @return Merchant profile data
     */
    function getMerchantProfile(address merchantAddress) external view returns (Merchant memory) {
        return merchants[merchantAddress];
    }
    
    /**
     * @notice Get bridge transaction details
     * @param cctpNonce Circle CCTP nonce
     * @return Bridge transaction data
     */
    function getBridgeTransaction(uint64 cctpNonce) external view returns (BridgeTransaction memory) {
        return bridgeTransactions[cctpNonce];
    }
    
    /**
     * @notice Confirm successful bridge (Admin only)
     * @param cctpNonce Circle CCTP nonce
     */
    function confirmBridge(uint64 cctpNonce) external onlyOwner {
        BridgeTransaction storage txn = bridgeTransactions[cctpNonce];
        require(txn.status == BridgeStatus.INITIATED, "Invalid transaction status");
        
        txn.status = BridgeStatus.CONFIRMED;
        emit BridgeConfirmed(cctpNonce, txn.merchant);
    }
    
    /**
     * @notice Mark bridge as failed (Admin only)
     * @param cctpNonce Circle CCTP nonce
     * @param reason Failure reason
     */
    function markBridgeFailed(uint64 cctpNonce, string calldata reason) external onlyOwner {
        BridgeTransaction storage txn = bridgeTransactions[cctpNonce];
        require(txn.status == BridgeStatus.INITIATED, "Invalid transaction status");
        
        txn.status = BridgeStatus.FAILED;
        emit BridgeFailed(cctpNonce, txn.merchant, reason);
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
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
    
    // ==================== DASHBOARD FUNCTIONS ====================
    
    /**
     * @notice Get comprehensive user dashboard data in single call
     * @param user User address to get data for
     * @return dashboard Complete dashboard with credit info, loans, and user type
     * @dev This replaces multiple separate calls with one optimized function
     */
    function getUserDashboardData(address user) external view returns (UserDashboard memory dashboard) {
        CreditScore storage credit = creditScores[user];
        
        // 1. Basic user credit information
        dashboard.creditLimit = credit.creditLimit > 0 ? credit.creditLimit : initialCreditLimit;
        dashboard.totalRepaid = credit.totalRepaid;
        
        // 2. Calculate available credit (replaces getAvailableCredit call)
        uint256 totalOutstanding = 0;
        uint256[] memory loanIds = userLoans[user];
        
        // Calculate total outstanding from all active loans
        for (uint256 i = 0; i < loanIds.length; i++) {
            Loan storage loan = loans[loanIds[i]];
            if (loan.isActive) {
                (,, uint256 totalOwed) = getCurrentBalance(loanIds[i]);
                totalOutstanding += totalOwed;
            }
        }
        
        dashboard.availableCredit = dashboard.creditLimit > totalOutstanding ? 
            dashboard.creditLimit - totalOutstanding : 0;
        
        // 3. Build active loans array with ALL details (no arbitrary limit!)
        uint256[] memory userLoanIds = userLoans[user];
        uint256 activeLoanCount = 0;
        
        // First pass: count active loans
        for (uint256 i = 0; i < userLoanIds.length; i++) {
            if (loans[userLoanIds[i]].isActive) {
                activeLoanCount++;
            }
        }
        
        // Initialize array with exact size needed
        dashboard.activeLoans = new LoanSummary[](activeLoanCount);
        uint256 activeIndex = 0;
        
        // Second pass: populate loan summaries
        for (uint256 i = 0; i < userLoanIds.length; i++) {
            Loan storage loan = loans[userLoanIds[i]];
            if (loan.isActive) {
                (uint256 principal, uint256 interest, uint256 totalOwed) = getCurrentBalance(userLoanIds[i]);
                
                dashboard.activeLoans[activeIndex] = LoanSummary({
                    loanId: userLoanIds[i],
                    originalPrincipal: loan.originalPrincipal,
                    currentPrincipal: principal,
                    interestAccrued: interest,
                    totalOwed: totalOwed,
                    createdTimestamp: loan.createdTimestamp,
                    merchant: loan.merchant,
                    merchantName: merchants[loan.merchant].name,
                    merchantLocation: merchants[loan.merchant].location,
                    borrowerUsername: loan.borrowerUsername
                });
                activeIndex++;
            }
        }
        
        // 4. Determine user type and merchant data
        bool hasCredit = credit.creditLimit > 0;
        bool isMerchant = merchants[user].isActive || merchants[user].registeredAt > 0;
        
        if (hasCredit && isMerchant) {
            dashboard.userType = UserType.BOTH;
        } else if (isMerchant) {
            dashboard.userType = UserType.MERCHANT;
        } else {
            dashboard.userType = UserType.CUSTOMER;
        }
        
        // 5. Populate merchant data if applicable
        if (isMerchant) {
            Merchant storage merchantData = merchants[user];
            dashboard.merchantData = MerchantSummary({
                merchantAddress: user,
                isActive: merchantData.isActive,
                outstandingLoans: merchantData.outstandingLoans,
                totalProcessed: merchantData.totalRepaid,
                name: merchantData.name,
                location: merchantData.location
            });
        }
        // If not a merchant, merchantData remains empty (default struct values)
        
        return dashboard;
    }
}
