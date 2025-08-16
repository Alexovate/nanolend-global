// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {Test, console} from "forge-std/Test.sol";
import {CrossChainBNPL} from "../src/CrossChainBNPL.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC contract for testing
 */
contract MockUSDC is IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    uint256 private _totalSupply;
    uint8 public constant decimals = 6;
    string public constant name = "Mock USDC";
    string public constant symbol = "USDC";
    
    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }
    
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address to, uint256 amount) public override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }
    
    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }
    
    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= amount, "USDC: transfer amount exceeds allowance");
        
        _transfer(from, to, amount);
        _approve(from, msg.sender, currentAllowance - amount);
        
        return true;
    }
    
    function mint(address to, uint256 amount) external {
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "USDC: transfer from zero address");
        require(to != address(0), "USDC: transfer to zero address");
        require(_balances[from] >= amount, "USDC: transfer amount exceeds balance");
        
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }
    
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "USDC: approve from zero address");
        require(spender != address(0), "USDC: approve to zero address");
        
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}

/**
 * @title MockTokenMessenger
 * @notice Mock Circle CCTP TokenMessenger for testing
 */
contract MockTokenMessenger {
    uint64 public nonce = 1;
    
    event MessageSent(bytes message);
    
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64) {
        // Simulate burning by transferring to this contract
        IERC20(burnToken).transferFrom(msg.sender, address(this), amount);
        
        // Emit mock event
        emit MessageSent(abi.encode(amount, destinationDomain, mintRecipient));
        
        return nonce++;
    }
}

/**
 * @title CrossChainBNPLTest
 * @notice Comprehensive tests for CrossChainBNPL contract
 */
contract CrossChainBNPLTest is Test {
    CrossChainBNPL public bnpl;
    MockUSDC public usdc;
    MockTokenMessenger public tokenMessenger;
    
    address public owner = address(1);
    address public borrower = address(2);
    address public merchant = address(3);
    address public merchantBaseAddress = address(4);
    address public merchantArbAddress = address(5);
    
    uint256 public constant INITIAL_USDC_SUPPLY = 1000000000000; // 1M USDC (6 decimals)
    uint256 public constant LOAN_AMOUNT = 5000000; // $5 USDC
    uint256 public constant SMALL_LOAN = 1000000; // $1 USDC
    
    function setUp() public {
        // Deploy mock contracts
        usdc = new MockUSDC();
        tokenMessenger = new MockTokenMessenger();
        
        // Deploy main contract
        vm.prank(owner);
        bnpl = new CrossChainBNPL(owner, address(usdc), address(tokenMessenger));
        
        // Setup initial state
        usdc.mint(address(bnpl), INITIAL_USDC_SUPPLY); // Fund contract
        usdc.mint(borrower, INITIAL_USDC_SUPPLY); // Fund borrower for repayments
        
        // Register merchant with GCash number
        vm.prank(owner);
        bnpl.registerMerchant(merchant, "Test Merchant", "+639171234567");
        
        // Approve USDC for borrower repayments
        vm.prank(borrower);
        usdc.approve(address(bnpl), type(uint256).max);
    }
    
    // ==================== BASIC FUNCTIONALITY TESTS ====================
    
    function testConstructor() public {
        assertEq(address(bnpl.usdc()), address(usdc));
        assertEq(address(bnpl.tokenMessenger()), address(tokenMessenger));
        assertEq(bnpl.owner(), owner);
        assertEq(bnpl.nextLoanId(), 1);
    }
    
    function testRegisterMerchant() public {
        address newMerchant = address(6);
        
        vm.prank(owner);
        bnpl.registerMerchant(newMerchant, "New Merchant", "+639171234567");
        
        CrossChainBNPL.Merchant memory merchantData = bnpl.getMerchantProfile(newMerchant);
        assertEq(merchantData.isActive, true);
        assertEq(merchantData.name, "New Merchant");
        assertEq(merchantData.gcashNumber, "+639171234567");
        assertEq(merchantData.totalBridged, 0);
        assertEq(merchantData.bridgeCount, 0);
        assertGt(merchantData.registeredAt, 0);
    }
    
    function testFundContract() public {
        uint256 fundAmount = 1000000; // $1 USDC
        uint256 initialBalance = usdc.balanceOf(address(bnpl));
        
        // Mint USDC to owner and approve
        usdc.mint(owner, fundAmount);
        vm.prank(owner);
        usdc.approve(address(bnpl), fundAmount);
        
        // Fund contract
        vm.prank(owner);
        bnpl.fundContract(fundAmount);
        
        assertEq(usdc.balanceOf(address(bnpl)), initialBalance + fundAmount);
    }
    
    // ==================== LOAN REQUEST TESTS ====================
    
    function testRequestLoanWorldChain() public {
        uint256 initialMerchantBalance = usdc.balanceOf(merchant);
        
        vm.startPrank(borrower);
        bnpl.requestLoan(
            merchant,
            LOAN_AMOUNT,
            "test-nullifier",
            bnpl.WORLD_CHAIN_DOMAIN(), // Direct transfer
            merchant // Settlement address
        );
        vm.stopPrank();
        
        // Check loan was created
        assertEq(bnpl.nextLoanId(), 2);
        
        // Check loan details
        CrossChainBNPL.Loan memory loan = bnpl.getLoan(1);
        assertEq(loan.amount, LOAN_AMOUNT);
        assertEq(loan.borrower, borrower);
        assertEq(loan.merchant, merchant);
        assertEq(loan.settlementDomain, bnpl.WORLD_CHAIN_DOMAIN());
        assertEq(loan.settlementAddress, merchant);
        assertEq(loan.isActive, true);
        
        // Check merchant received USDC directly
        assertEq(usdc.balanceOf(merchant), initialMerchantBalance + LOAN_AMOUNT);
        
        // Check borrower's loans array
        uint256[] memory userLoans = bnpl.getUserLoans(borrower);
        assertEq(userLoans.length, 1);
        assertEq(userLoans[0], 1);
    }
    
    function testRequestLoanCCTPBase() public {
        uint256 initialContractBalance = usdc.balanceOf(address(bnpl));
        uint256 initialTokenMessengerBalance = usdc.balanceOf(address(tokenMessenger));
        
        vm.startPrank(borrower);
        bnpl.requestLoan(
            merchant,
            LOAN_AMOUNT,
            "test-nullifier",
            bnpl.BASE_DOMAIN(), // CCTP to Base
            merchantBaseAddress
        );
        vm.stopPrank();
        
        // Check loan was created
        CrossChainBNPL.Loan memory loan = bnpl.getLoan(1);
        assertEq(loan.settlementDomain, bnpl.BASE_DOMAIN());
        assertEq(loan.settlementAddress, merchantBaseAddress);
        
        // Check USDC was transferred to TokenMessenger (simulating burn)
        assertEq(usdc.balanceOf(address(bnpl)), initialContractBalance - LOAN_AMOUNT);
        assertEq(usdc.balanceOf(address(tokenMessenger)), initialTokenMessengerBalance + LOAN_AMOUNT);
    }
    
    function testRequestLoanCCTPArbitrum() public {
        vm.startPrank(borrower);
        bnpl.requestLoan(
            merchant,
            LOAN_AMOUNT,
            "test-nullifier",
            bnpl.ARBITRUM_DOMAIN(), // CCTP to Arbitrum
            merchantArbAddress
        );
        vm.stopPrank();
        
        CrossChainBNPL.Loan memory loan = bnpl.getLoan(1);
        assertEq(loan.settlementDomain, bnpl.ARBITRUM_DOMAIN());
        assertEq(loan.settlementAddress, merchantArbAddress);
    }
    
    // ==================== CREDIT LIMIT TESTS ====================
    
    function testFirstTimeBorrowerGetsInitialCredit() public {
        // Check borrower has no credit initially
        (uint256 creditLimit, uint256 totalRepaid) = bnpl.getUserCredit(borrower);
        assertEq(creditLimit, 0);
        assertEq(totalRepaid, 0);
        
        // Request loan
        vm.startPrank(borrower);
        bnpl.requestLoan(merchant, SMALL_LOAN, "test", bnpl.WORLD_CHAIN_DOMAIN(), merchant);
        vm.stopPrank();
        
        // Check credit limit was set
        (creditLimit, totalRepaid) = bnpl.getUserCredit(borrower);
        assertEq(creditLimit, bnpl.initialCreditLimit());
    }
    
    function testCannotExceedCreditLimit() public {
        // First, request a loan to use up most of the credit limit
        vm.startPrank(borrower);
        bnpl.requestLoan(merchant, 4000000, "test", 0, merchant); // Use 4 USDC of 5 USDC limit
        
        // Now try to request another loan that would exceed remaining credit (1 USDC left, but asking for 2 USDC)
        vm.expectRevert(CrossChainBNPL.InsufficientCreditLimit.selector);
        bnpl.requestLoan(merchant, 2000000, "test", 0, merchant); // Try to borrow 2 USDC (would exceed limit)
        vm.stopPrank();
    }
    
    // ==================== LOAN REPAYMENT TESTS ====================
    
    function testRepayLoan() public {
        // Create loan
        vm.startPrank(borrower);
        bnpl.requestLoan(merchant, LOAN_AMOUNT, "test", bnpl.WORLD_CHAIN_DOMAIN(), merchant);
        vm.stopPrank();
        
        uint256 initialBorrowerBalance = usdc.balanceOf(borrower);
        uint256 initialContractBalance = usdc.balanceOf(address(bnpl));
        
        // Repay loan
        vm.startPrank(borrower);
        bnpl.repayLoan(1, LOAN_AMOUNT);
        vm.stopPrank();
        
        // Check loan is marked as inactive
        CrossChainBNPL.Loan memory loan = bnpl.getLoan(1);
        assertEq(loan.isActive, false);
        
        // Check USDC was transferred
        assertEq(usdc.balanceOf(borrower), initialBorrowerBalance - LOAN_AMOUNT);
        assertEq(usdc.balanceOf(address(bnpl)), initialContractBalance + LOAN_AMOUNT);
        
        // Check credit score updated
        (, uint256 totalRepaid) = bnpl.getUserCredit(borrower);
        assertEq(totalRepaid, LOAN_AMOUNT);
    }
    
    // ==================== ERROR HANDLING TESTS ====================
    
    function testCannotRequestLoanFromInactiveMerchant() public {
        address inactiveMerchant = address(7);
        
        vm.startPrank(borrower);
        vm.expectRevert(CrossChainBNPL.InvalidMerchant.selector);
        bnpl.requestLoan(inactiveMerchant, LOAN_AMOUNT, "test", 0, inactiveMerchant); // Use 0 directly instead of calling function
        vm.stopPrank();
    }
    
    function testCannotRequestLoanWithInvalidAmount() public {
        vm.startPrank(borrower);
        vm.expectRevert(CrossChainBNPL.InvalidLoanAmount.selector);
        bnpl.requestLoan(merchant, 100, "test", 0, merchant); // Below minimum
        vm.stopPrank();
        
        vm.startPrank(borrower);
        vm.expectRevert(CrossChainBNPL.InvalidLoanAmount.selector);
        bnpl.requestLoan(merchant, 10000000, "test", 0, merchant); // Above maximum
        vm.stopPrank();
    }
    
    function testCannotRequestLoanWithInvalidDomain() public {
        vm.startPrank(borrower);
        vm.expectRevert(CrossChainBNPL.InvalidDomain.selector);
        bnpl.requestLoan(merchant, LOAN_AMOUNT, "test", 99, merchant); // Invalid domain
        vm.stopPrank();
    }
    
    function testCannotRequestLoanWithZeroSettlementAddress() public {
        vm.startPrank(borrower);
        vm.expectRevert(CrossChainBNPL.InvalidSettlementAddress.selector);
        bnpl.requestLoan(merchant, LOAN_AMOUNT, "test", 0, address(0));
        vm.stopPrank();
    }
    
    function testCannotRepayNonexistentLoan() public {
        vm.startPrank(borrower);
        vm.expectRevert(CrossChainBNPL.LoanNotFound.selector);
        bnpl.repayLoan(999, LOAN_AMOUNT);
        vm.stopPrank();
    }
    
    function testCannotRepayOthersLoan() public {
        // Create loan as borrower
        vm.startPrank(borrower);
        bnpl.requestLoan(merchant, LOAN_AMOUNT, "test", bnpl.WORLD_CHAIN_DOMAIN(), merchant);
        vm.stopPrank();
        
        // Try to repay as different user
        vm.startPrank(merchant);
        vm.expectRevert(CrossChainBNPL.UnauthorizedAccess.selector);
        bnpl.repayLoan(1, LOAN_AMOUNT);
        vm.stopPrank();
    }
    
    // ==================== ADMIN FUNCTIONS TESTS ====================
    
    function testOnlyOwnerCanRegisterMerchant() public {
        vm.startPrank(borrower);
        vm.expectRevert();
        bnpl.registerMerchant(address(8), "Unauthorized Merchant", "+639171234567");
        vm.stopPrank();
    }
    
    function testOnlyOwnerCanFundContract() public {
        vm.startPrank(borrower);
        vm.expectRevert();
        bnpl.fundContract(1000000);
        vm.stopPrank();
    }
    
    function testEmergencyFunctions() public {
        // Test pause
        vm.prank(owner);
        bnpl.emergencyPause();
        assertTrue(bnpl.paused());
        
        // Test cannot request loan when paused
        vm.startPrank(borrower);
        vm.expectRevert();
        bnpl.requestLoan(merchant, LOAN_AMOUNT, "test", 0, merchant);
        vm.stopPrank();
        
        // Test unpause
        vm.prank(owner);
        bnpl.emergencyUnpause();
        assertFalse(bnpl.paused());
        
        // Test emergency withdraw
        uint256 contractBalance = usdc.balanceOf(address(bnpl));
        uint256 ownerInitialBalance = usdc.balanceOf(owner);
        
        vm.prank(owner);
        bnpl.emergencyWithdraw();
        
        assertEq(usdc.balanceOf(address(bnpl)), 0);
        assertEq(usdc.balanceOf(owner), ownerInitialBalance + contractBalance);
    }
    
    // ==================== BRIDGE OFFRAMP TESTS ====================
    
    function testBridgeToEthereum() public {
        // Give merchant some USDC and approve contract
        uint256 bridgeAmount = 10000000; // $10 USDC
        usdc.mint(merchant, bridgeAmount);
        
        vm.startPrank(merchant);
        usdc.approve(address(bnpl), bridgeAmount);
        
        // Bridge to Ethereum
        address ethereumRecipient = address(0x1234567890123456789012345678901234567890);
        bnpl.bridgeToEthereum(bridgeAmount, ethereumRecipient);
        vm.stopPrank();
        
        // Check bridge transaction was recorded
        CrossChainBNPL.BridgeTransaction memory bridgeTx = bnpl.getBridgeTransaction(1);
        assertEq(bridgeTx.merchant, merchant);
        assertEq(bridgeTx.ethereumRecipient, ethereumRecipient);
        assertEq(bridgeTx.amount, bridgeAmount);
        assertEq(bridgeTx.cctpNonce, 1);
        assertEq(uint256(bridgeTx.status), uint256(CrossChainBNPL.BridgeStatus.INITIATED));
        
        // Check merchant statistics updated
        CrossChainBNPL.Merchant memory merchantData = bnpl.getMerchantProfile(merchant);
        assertEq(merchantData.totalBridged, bridgeAmount);
        assertEq(merchantData.bridgeCount, 1);
        
        // Check USDC was transferred to TokenMessenger (simulating burn)
        assertEq(usdc.balanceOf(address(tokenMessenger)), bridgeAmount);
        assertEq(usdc.balanceOf(merchant), 0);
    }
    
    function testBridgeToEthereumInvalidMerchant() public {
        address unregisteredMerchant = address(0x999);
        uint256 bridgeAmount = 1000000; // $1 USDC
        
        // Give unregistered merchant USDC
        usdc.mint(unregisteredMerchant, bridgeAmount);
        
        vm.startPrank(unregisteredMerchant);
        usdc.approve(address(bnpl), bridgeAmount);
        
        vm.expectRevert(CrossChainBNPL.InvalidMerchant.selector);
        bnpl.bridgeToEthereum(bridgeAmount, address(0x1234));
        vm.stopPrank();
    }
    
    function testBridgeToEthereumZeroAmount() public {
        vm.startPrank(merchant);
        vm.expectRevert(CrossChainBNPL.InvalidBridgeAmount.selector);
        bnpl.bridgeToEthereum(0, address(0x1234));
        vm.stopPrank();
    }
    
    function testBridgeToEthereumZeroAddress() public {
        uint256 bridgeAmount = 1000000; // $1 USDC
        usdc.mint(merchant, bridgeAmount);
        
        vm.startPrank(merchant);
        usdc.approve(address(bnpl), bridgeAmount);
        
        vm.expectRevert(CrossChainBNPL.InvalidEthereumAddress.selector);
        bnpl.bridgeToEthereum(bridgeAmount, address(0));
        vm.stopPrank();
    }
    
    function testBridgeToEthereumInsufficientBalance() public {
        uint256 bridgeAmount = 1000000; // $1 USDC
        // Don't mint USDC to merchant, so they have 0 balance
        
        vm.startPrank(merchant);
        vm.expectRevert(CrossChainBNPL.InsufficientMerchantBalance.selector);
        bnpl.bridgeToEthereum(bridgeAmount, address(0x1234));
        vm.stopPrank();
    }
    
    function testConfirmBridge() public {
        // Setup bridge transaction
        uint256 bridgeAmount = 5000000; // $5 USDC
        usdc.mint(merchant, bridgeAmount);
        
        vm.startPrank(merchant);
        usdc.approve(address(bnpl), bridgeAmount);
        bnpl.bridgeToEthereum(bridgeAmount, address(0x1234));
        vm.stopPrank();
        
        // Confirm bridge as owner
        vm.prank(owner);
        bnpl.confirmBridge(1);
        
        // Check status updated
        CrossChainBNPL.BridgeTransaction memory bridgeTx = bnpl.getBridgeTransaction(1);
        assertEq(uint256(bridgeTx.status), uint256(CrossChainBNPL.BridgeStatus.CONFIRMED));
    }
    
    function testMarkBridgeFailed() public {
        // Setup bridge transaction
        uint256 bridgeAmount = 5000000; // $5 USDC
        usdc.mint(merchant, bridgeAmount);
        
        vm.startPrank(merchant);
        usdc.approve(address(bnpl), bridgeAmount);
        bnpl.bridgeToEthereum(bridgeAmount, address(0x1234));
        vm.stopPrank();
        
        // Mark bridge as failed
        vm.prank(owner);
        bnpl.markBridgeFailed(1, "Network congestion");
        
        // Check status updated
        CrossChainBNPL.BridgeTransaction memory bridgeTx = bnpl.getBridgeTransaction(1);
        assertEq(uint256(bridgeTx.status), uint256(CrossChainBNPL.BridgeStatus.FAILED));
    }
    
    function testMultipleBridgeTransactions() public {
        // Give merchant USDC for multiple bridges
        uint256 bridgeAmount = 2000000; // $2 USDC per bridge
        usdc.mint(merchant, bridgeAmount * 3);
        
        vm.startPrank(merchant);
        usdc.approve(address(bnpl), type(uint256).max);
        
        // Execute 3 bridge transactions
        bnpl.bridgeToEthereum(bridgeAmount, address(0x1111));
        bnpl.bridgeToEthereum(bridgeAmount, address(0x2222));
        bnpl.bridgeToEthereum(bridgeAmount, address(0x3333));
        vm.stopPrank();
        
        // Check merchant statistics
        CrossChainBNPL.Merchant memory merchantData = bnpl.getMerchantProfile(merchant);
        assertEq(merchantData.totalBridged, bridgeAmount * 3);
        assertEq(merchantData.bridgeCount, 3);
        
        // Check individual transactions
        assertEq(bnpl.getBridgeTransaction(1).ethereumRecipient, address(0x1111));
        assertEq(bnpl.getBridgeTransaction(2).ethereumRecipient, address(0x2222));
        assertEq(bnpl.getBridgeTransaction(3).ethereumRecipient, address(0x3333));
    }

    // ==================== INTEGRATION TESTS ====================
    
    function testCompleteUserJourney() public {
        // 1. Request loan with CCTP settlement
        vm.startPrank(borrower);
        bnpl.requestLoan(
            merchant,
            LOAN_AMOUNT,
            "world-id-nullifier",
            bnpl.BASE_DOMAIN(),
            merchantBaseAddress
        );
        vm.stopPrank();
        
        // 2. Verify loan created
        CrossChainBNPL.Loan memory loan = bnpl.getLoan(1);
        assertEq(loan.borrower, borrower);
        assertEq(loan.amount, LOAN_AMOUNT);
        assertEq(loan.settlementDomain, bnpl.BASE_DOMAIN());
        
        // 3. Repay loan
        vm.startPrank(borrower);
        bnpl.repayLoan(1, LOAN_AMOUNT);
        vm.stopPrank();
        
        // 4. Verify loan repaid and credit updated
        loan = bnpl.getLoan(1);
        assertEq(loan.isActive, false);
        
        (, uint256 totalRepaid) = bnpl.getUserCredit(borrower);
        assertEq(totalRepaid, LOAN_AMOUNT);
    }
    
    function testMultipleLoansWithDifferentChains() public {
        // Loan 1: World Chain settlement
        vm.startPrank(borrower);
        bnpl.requestLoan(merchant, SMALL_LOAN, "nullifier-1", bnpl.WORLD_CHAIN_DOMAIN(), merchant);
        
        // Loan 2: Base settlement
        bnpl.requestLoan(merchant, SMALL_LOAN, "nullifier-2", bnpl.BASE_DOMAIN(), merchantBaseAddress);
        
        // Loan 3: Arbitrum settlement
        bnpl.requestLoan(merchant, SMALL_LOAN, "nullifier-3", bnpl.ARBITRUM_DOMAIN(), merchantArbAddress);
        vm.stopPrank();
        
        // Verify all loans created
        uint256[] memory userLoans = bnpl.getUserLoans(borrower);
        assertEq(userLoans.length, 3);
        
        // Verify different settlement domains
        assertEq(bnpl.getLoan(1).settlementDomain, bnpl.WORLD_CHAIN_DOMAIN());
        assertEq(bnpl.getLoan(2).settlementDomain, bnpl.BASE_DOMAIN());
        assertEq(bnpl.getLoan(3).settlementDomain, bnpl.ARBITRUM_DOMAIN());
    }
    
    function testCompleteOfframpJourney() public {
        // 1. Merchant receives USDC from loan repayment (simulate loan activity)
        uint256 loanAmount = 3000000; // $3 USDC
        usdc.mint(merchant, loanAmount * 2); // Give merchant 2x loan amount
        
        // 2. Merchant bridges accumulated USDC to Ethereum for GCash cash-out
        address ethereumWallet = address(0x1234567890123456789012345678901234567890);
        
        vm.startPrank(merchant);
        usdc.approve(address(bnpl), loanAmount);
        bnpl.bridgeToEthereum(loanAmount, ethereumWallet);
        vm.stopPrank();
        
        // 3. Verify bridge transaction created
        CrossChainBNPL.BridgeTransaction memory bridgeTx = bnpl.getBridgeTransaction(1);
        assertEq(bridgeTx.merchant, merchant);
        assertEq(bridgeTx.ethereumRecipient, ethereumWallet);
        assertEq(bridgeTx.amount, loanAmount);
        assertEq(uint256(bridgeTx.status), uint256(CrossChainBNPL.BridgeStatus.INITIATED));
        
        // 4. Admin confirms successful CCTP bridge
        vm.prank(owner);
        bnpl.confirmBridge(1);
        
        // 5. Verify final state
        bridgeTx = bnpl.getBridgeTransaction(1);
        assertEq(uint256(bridgeTx.status), uint256(CrossChainBNPL.BridgeStatus.CONFIRMED));
        
        CrossChainBNPL.Merchant memory merchantData = bnpl.getMerchantProfile(merchant);
        assertEq(merchantData.totalBridged, loanAmount);
        assertEq(merchantData.bridgeCount, 1);
        assertEq(merchantData.gcashNumber, "+639171234567");
        
        // USDC was burned via CCTP (transferred to mock TokenMessenger)
        assertEq(usdc.balanceOf(address(tokenMessenger)), loanAmount);
    }
}
