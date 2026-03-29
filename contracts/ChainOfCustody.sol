// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ChainOfCustody {

    struct Evidence {
        string id;
        string hash;
        string description;
        address currentHolder;
        uint256 timestamp;
        bool escrowEnabled;
        uint256 escrowAmount;
        bool exists;
    }

    mapping(string => Evidence) private evidences;
    mapping(string => string[]) private logs;

    address public admin;

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin allowed");
        _;
    }

    modifier evidenceExists(string memory _id) {
        require(evidences[_id].exists, "Evidence not found");
        _;
    }

    // 🔹 Add Evidence (WITH optional escrow)
    function addEvidence(
        string memory _id,
        string memory _hash,
        string memory _description,
        bool _escrowEnabled
    ) public payable {

        require(!evidences[_id].exists, "Already exists");

        if (_escrowEnabled) {
            require(msg.value > 0, "Escrow required");
        }

        evidences[_id] = Evidence({
            id: _id,
            hash: _hash,
            description: _description,
            currentHolder: msg.sender,
            timestamp: block.timestamp,
            escrowEnabled: _escrowEnabled,
            escrowAmount: msg.value,
            exists: true
        });

        logs[_id].push("Evidence Created");

        emit EvidenceAdded(_id, msg.sender, block.timestamp);
    }

    // 🔹 Transfer Evidence
    function transferEvidence(
        string memory _id,
        address _newHolder
    ) public evidenceExists(_id) {

        Evidence storage e = evidences[_id];

        require(msg.sender == e.currentHolder, "Not owner");

        address previousHolder = e.currentHolder;
        e.currentHolder = _newHolder;
        e.timestamp = block.timestamp;

        logs[_id].push("Transferred");

        emit EvidenceTransferred(_id, previousHolder, _newHolder, block.timestamp);
    }

    // 🔹 Get Evidence
    function getEvidence(string memory _id)
        public
        view
        evidenceExists(_id)
        returns (
            string memory,
            string memory,
            address,
            uint256,
            bool,
            uint256
        )
    {
        Evidence memory e = evidences[_id];
        return (
            e.id,
            e.description,
            e.currentHolder,
            e.timestamp,
            e.escrowEnabled,
            e.escrowAmount
        );
    }

    // 🔹 Get Logs
    function getEvidenceLog(string memory _id)
        public
        view
        returns (string[] memory)
    {
        return logs[_id];
    }

    // 🔹 Refund Escrow (Admin controlled for demo)
    function releaseEscrow(string memory _id) public onlyAdmin {
        Evidence storage e = evidences[_id];

        require(e.escrowEnabled, "No escrow");
        require(e.escrowAmount > 0, "Already released");

        uint256 amount = e.escrowAmount;
        e.escrowAmount = 0;

        payable(e.currentHolder).transfer(amount);

        logs[_id].push("Escrow Released");
    }

    // 🔹 Events
    event EvidenceAdded(
        string evidenceId,
        address addedBy,
        uint256 timestamp
    );

    event EvidenceTransferred(
        string evidenceId,
        address from,
        address to,
        uint256 timestamp
    );
}