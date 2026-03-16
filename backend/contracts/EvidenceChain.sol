// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract EvidenceChain {

    struct Evidence {
        uint id;
        string description;
        address owner;
    }

    mapping(uint => Evidence) public evidences;

    event EvidenceAdded(uint id, string description, address owner);

    function addEvidence(uint _id, string memory _desc) public {
        evidences[_id] = Evidence(_id, _desc, msg.sender);
        emit EvidenceAdded(_id, _desc, msg.sender);
    }
}