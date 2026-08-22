// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CaseAnchor
/// @notice The minimum on-chain footprint Clawback needs (build prompt §23:
///         "minimum blockchain footprint necessary for maximum credibility").
///
/// This contract stores NOTHING but opaque 32-byte commitments and a hash
/// link to the previous commitment in a case's receipt chain. It never
/// receives, and structurally cannot receive, any raw financial data —
/// see packages/receipts/src/builder.ts for what a commitment actually
/// commits to. Anyone can call `verify` to confirm a commitment was
/// anchored, and by whom, without trusting Clawback's own database.
///
/// NOT DEPLOYED by this repository. Deploying requires a funded key the
/// operator controls; see packages/chain/scripts/deploy.ts and
/// LIMITATIONS.md. Shipping the source without a live deployment is a
/// deliberate choice, not an oversight — this codebase does not fabricate
/// a deployment address.
contract CaseAnchor {
    struct Anchor {
        bytes32 receiptCommitment;
        bytes32 previousCommitment;
        address anchoredBy;
        uint64 anchoredAt;
    }

    /// caseId (as bytes32, e.g. keccak256 of the string case ID) => Anchor
    mapping(bytes32 => Anchor) private anchors;

    event ReceiptAnchored(
        bytes32 indexed caseId,
        bytes32 indexed receiptCommitment,
        bytes32 previousCommitment,
        address indexed anchoredBy,
        uint64 anchoredAt
    );

    error AlreadyAnchored(bytes32 caseId);
    error EmptyCommitment();

    /// @notice Anchors a case's final receipt commitment. Reverts if this
    ///         caseId has already been anchored — a case's history is
    ///         written once, not overwritten, which is the entire point.
    function anchor(bytes32 caseId, bytes32 receiptCommitment, bytes32 previousCommitment) external {
        if (receiptCommitment == bytes32(0)) revert EmptyCommitment();
        if (anchors[caseId].anchoredAt != 0) revert AlreadyAnchored(caseId);

        anchors[caseId] = Anchor({
            receiptCommitment: receiptCommitment,
            previousCommitment: previousCommitment,
            anchoredBy: msg.sender,
            anchoredAt: uint64(block.timestamp)
        });

        emit ReceiptAnchored(caseId, receiptCommitment, previousCommitment, msg.sender, uint64(block.timestamp));
    }

    /// @notice Independently checkable by anyone — this is the function a
    ///         skeptical third party (a journalist, a rival platform, an
    ///         auditor) calls without trusting Clawback's own frontend.
    function verify(bytes32 caseId, bytes32 expectedReceiptCommitment) external view returns (bool) {
        return anchors[caseId].receiptCommitment == expectedReceiptCommitment;
    }

    function getAnchor(bytes32 caseId) external view returns (Anchor memory) {
        return anchors[caseId];
    }
}
