import * as settlementService from "./settlement.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  validateCreateSettlementInput,
  validateRejectSettlementInput,
} from "./settlement.validators.js";

/**
 * Controller endpoint to create/initiate a new settlement.
 */
export const createSettlement = asyncHandler(async (req, res) => {
  const from = req.user.toString();
  const validation = validateCreateSettlementInput(req.body);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const { friendId, amount } = req.body;

  const settlement = await settlementService.initiateSettlement({
    from,
    friendId,
    amount: Number(amount),
  });

  return res.status(201).json({
    message: "Settlement request sent",
    settlement,
  });
});

/**
 * Controller endpoint to accept a pending settlement.
 */
export const acceptSettlement = asyncHandler(async (req, res) => {
  const userId = req.user.toString();
  const { settlementId } = req.body;

  if (!settlementId) {
    return res.status(400).json({ message: "Settlement ID is required" });
  }

  const settlement = await settlementService.approveSettlement({
    userId,
    settlementId,
  });

  return res.status(200).json({
    message: "Settlement accepted successfully",
    settlement,
  });
});

/**
 * Controller endpoint to reject a pending settlement.
 */
export const rejectSettlement = asyncHandler(async (req, res) => {
  const userId = req.user.toString();
  const { settlementId, reason } = req.body;

  const validation = validateRejectSettlementInput(req.body);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const settlement = await settlementService.declineSettlement({
    userId,
    settlementId,
    reason,
  });

  return res.status(200).json({
    message: "Settlement rejected successfully",
    settlement,
  });
});
