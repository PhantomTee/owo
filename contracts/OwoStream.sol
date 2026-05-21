// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IUSYCTeller {
    function deposit(uint256 usdcAmount, address receiver) external returns (uint256 usycOut);
    function redeem(uint256 usycAmount, address receiver) external returns (uint256 usdcOut);
}

contract OwoStream is Ownable {
    using SafeERC20 for IERC20;

    struct Stream {
        uint256 id;
        address employer;
        address worker;
        uint256 ratePerSecond;
        uint256 startTime;
        uint256 lastWithdrawnAt;
        uint256 depositedAmount;
        uint256 withdrawnAmount;
        bool active;
        string workerName;
        string jobTitle;
    }

    mapping(uint256 => Stream) public streams;
    mapping(address => uint256[]) private employerStreams;
    mapping(address => uint256[]) private workerStreams;
    mapping(uint256 => uint256) public usycBalance;

    uint256 public streamCount;
    address public immutable usdcToken;
    address public immutable usycToken;
    address public usycTeller;
    uint256 public yieldThreshold = 100 * 1e6;

    event StreamCreated(uint256 indexed id, address indexed employer, address indexed worker, uint256 ratePerSecond, uint256 deposit);
    event Deposited(uint256 indexed streamId, uint256 amount);
    event Withdrawn(uint256 indexed streamId, address indexed worker, uint256 amount);
    event StreamPaused(uint256 indexed streamId);
    event StreamResumed(uint256 indexed streamId);
    event StreamTerminated(uint256 indexed streamId, uint256 workerPayout, uint256 refund);
    event IdleInvested(uint256 indexed streamId, uint256 usdcAmount, uint256 usycOut);
    event USYCRedeemed(uint256 indexed streamId, uint256 usycAmount, uint256 usdcOut);

    modifier onlyEmployer(uint256 streamId) {
        require(streams[streamId].employer == msg.sender, "not employer");
        _;
    }

    constructor(address _usdcToken, address _usycToken, address _usycTeller) Ownable(msg.sender) {
        require(_usdcToken != address(0), "usdc required");
        require(_usycToken != address(0), "usyc required");
        usdcToken = _usdcToken;
        usycToken = _usycToken;
        usycTeller = _usycTeller;
    }

    function createStream(
        address worker,
        uint256 ratePerSecond,
        uint256 initialDeposit,
        string calldata workerName,
        string calldata jobTitle
    ) external returns (uint256 streamId) {
        require(worker != address(0), "worker required");
        require(ratePerSecond > 0, "rate required");
        require(initialDeposit > 0, "deposit required");

        IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), initialDeposit);

        streamId = ++streamCount;
        streams[streamId] = Stream({
            id: streamId,
            employer: msg.sender,
            worker: worker,
            ratePerSecond: ratePerSecond,
            startTime: block.timestamp,
            lastWithdrawnAt: block.timestamp,
            depositedAmount: initialDeposit,
            withdrawnAmount: 0,
            active: true,
            workerName: workerName,
            jobTitle: jobTitle
        });

        employerStreams[msg.sender].push(streamId);
        workerStreams[worker].push(streamId);
        emit StreamCreated(streamId, msg.sender, worker, ratePerSecond, initialDeposit);
    }

    function depositMore(uint256 streamId, uint256 amount) external onlyEmployer(streamId) {
        require(amount > 0, "amount required");
        IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), amount);
        streams[streamId].depositedAmount += amount;
        emit Deposited(streamId, amount);
    }

    function withdrawEarned(uint256 streamId) external returns (uint256 amount) {
        Stream storage s = streams[streamId];
        require(s.worker == msg.sender, "not worker");
        require(s.active, "stream inactive");

        amount = earnedSoFar(streamId);
        require(amount > 0, "nothing earned");

        _payWorker(s, streamId, amount);
    }

    function pauseStream(uint256 streamId) external onlyEmployer(streamId) {
        Stream storage s = streams[streamId];
        require(s.active, "already paused");
        uint256 accrued = earnedSoFar(streamId);
        s.lastWithdrawnAt = block.timestamp;
        s.active = false;
        if (accrued > 0) {
            _payWorker(s, streamId, accrued);
        }
        emit StreamPaused(streamId);
    }

    function resumeStream(uint256 streamId) external onlyEmployer(streamId) {
        Stream storage s = streams[streamId];
        require(!s.active, "already active");
        s.lastWithdrawnAt = block.timestamp;
        s.active = true;
        emit StreamResumed(streamId);
    }

    function terminateStream(uint256 streamId) external onlyEmployer(streamId) {
        Stream storage s = streams[streamId];
        require(s.employer != address(0), "missing stream");
        uint256 claimable = earnedSoFar(streamId);
        uint256 refund = s.depositedAmount - s.withdrawnAmount - claimable;
        s.lastWithdrawnAt = block.timestamp;
        s.active = false;
        if (claimable > 0) {
            _payWorker(s, streamId, claimable);
        }
        if (refund > 0) {
            s.depositedAmount -= refund;
            IERC20(usdcToken).safeTransfer(s.employer, refund);
        }
        emit StreamTerminated(streamId, claimable, refund);
    }

    function earnedSoFar(uint256 streamId) public view returns (uint256) {
        Stream memory s = streams[streamId];
        if (!s.active || s.employer == address(0)) return 0;
        uint256 elapsed = block.timestamp - s.lastWithdrawnAt;
        uint256 earned = elapsed * s.ratePerSecond;
        uint256 remaining = s.depositedAmount - s.withdrawnAmount;
        return earned > remaining ? remaining : earned;
    }

    function getStream(uint256 streamId) external view returns (Stream memory) {
        return streams[streamId];
    }

    function getEmployerStreams(address employer) external view returns (uint256[] memory) {
        return employerStreams[employer];
    }

    function getWorkerStreams(address worker) external view returns (uint256[] memory) {
        return workerStreams[worker];
    }

    function investIdleInUSYC(uint256 streamId) external onlyOwner {
        Stream storage s = streams[streamId];
        uint256 idle = s.depositedAmount - s.withdrawnAmount - earnedSoFar(streamId);
        require(idle > yieldThreshold, "below threshold");
        require(usycTeller != address(0), "teller missing");

        uint256 investable = idle - yieldThreshold;
        IERC20(usdcToken).forceApprove(usycTeller, investable);
        uint256 beforeBalance = IERC20(usycToken).balanceOf(address(this));
        IUSYCTeller(usycTeller).deposit(investable, address(this));
        uint256 received = IERC20(usycToken).balanceOf(address(this)) - beforeBalance;
        usycBalance[streamId] += received;
        emit IdleInvested(streamId, investable, received);
    }

    function redeemUSYCForPayment(uint256 streamId, uint256 usdcNeeded) external onlyOwner {
        require(usycTeller != address(0), "teller missing");
        uint256 liquid = IERC20(usdcToken).balanceOf(address(this));
        if (liquid >= usdcNeeded) return;
        uint256 shortfall = usdcNeeded - liquid;
        uint256 redeemAmount = usycBalance[streamId] < shortfall ? usycBalance[streamId] : shortfall;
        require(redeemAmount > 0, "no usyc");

        IERC20(usycToken).forceApprove(usycTeller, redeemAmount);
        uint256 beforeBalance = IERC20(usdcToken).balanceOf(address(this));
        IUSYCTeller(usycTeller).redeem(redeemAmount, address(this));
        uint256 received = IERC20(usdcToken).balanceOf(address(this)) - beforeBalance;
        usycBalance[streamId] -= redeemAmount;
        emit USYCRedeemed(streamId, redeemAmount, received);
    }

    function setYieldThreshold(uint256 threshold) external onlyOwner {
        yieldThreshold = threshold;
    }

    function setUSYCTeller(address teller) external onlyOwner {
        usycTeller = teller;
    }

    function _payWorker(Stream storage s, uint256 streamId, uint256 amount) private {
        uint256 liquid = IERC20(usdcToken).balanceOf(address(this));
        require(liquid >= amount, "insufficient liquid usdc");

        s.withdrawnAmount += amount;
        s.lastWithdrawnAt = block.timestamp;
        IERC20(usdcToken).safeTransfer(s.worker, amount);
        emit Withdrawn(streamId, s.worker, amount);
    }
}
