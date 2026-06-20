import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import * as groupService from "./group.service.js";
import {
  validateCreateGroup,
  validateUpdateGroup,
  validateAddMember,
  validateCreateGroupExpense,
  validateGroupId,
  validateGroupSettleUp,
} from "./group.validators.js";


export const createGroup = asyncHandler(async (req, res) => {

  const validation = validateCreateGroup(req.body);
  if (validation.error) {
    throw new ApiError(400, validation.error);
  }

  const group = await groupService.createGroup(req.user, req.body);

  res.status(201).json({
    success: true,
    message: "Group created successfully",
    data: group,
  });
});


export const getMyGroups = asyncHandler(async (req, res) => {
  const groups = await groupService.getMyGroups(req.user);

  res.status(200).json({
    success: true,
    message: "Groups retrieved successfully",
    data: groups,
  });
});


export const getGroupDetails = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await groupService.getGroupDetails(req.user, groupId);

  res.status(200).json({
    success: true,
    message: "Group details retrieved successfully",
    data: group,
  });
});


export const updateGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const validation = validateUpdateGroup(req.body);
  if (validation.error) {
    throw new ApiError(400, validation.error);
  }

  const updatedGroup = await groupService.updateGroup(req.user, groupId, req.body);

  res.status(200).json({
    success: true,
    message: "Group updated successfully",
    data: updatedGroup,
  });
});

export const deleteGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  await groupService.deleteGroup(req.user, groupId);

  res.status(200).json({
    success: true,
    message: "Group deleted successfully",
  });
});


export const addMember = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const validation = validateAddMember(req.body);
  if (validation.error) {
    throw new ApiError(400, validation.error);
  }

  const updatedGroup = await groupService.addMember(req.user, groupId, req.body.userId);

  res.status(200).json({
    success: true,
    message: "Member added successfully",
    data: updatedGroup,
  });
});


export const removeMember = asyncHandler(async (req, res) => {
  const { groupId, userId } = req.params;

  const updatedGroup = await groupService.removeMember(req.user, groupId, userId);

  res.status(200).json({
    success: true,
    message: "Member removed successfully",
    data: updatedGroup,
  });
});

export const createGroupExpense = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const validation = validateCreateGroupExpense(req.body);
  if (validation.error) {
    throw new ApiError(400, validation.error);
  }

  const expense = await groupService.createGroupExpense(req.user, groupId, req.body);

  res.status(201).json({
    success: true,
    message: "Group expense created successfully",
    data: expense,
  });
});

export const getGroupExpenses = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const expenses = await groupService.getGroupExpenses(req.user, groupId);

  res.status(200).json({
    success: true,
    message: "Group expenses retrieved successfully",
    data: expenses,
  });
});

export const getGroupBalances = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const balancesSummary = await groupService.calculateGroupBalances(req.user, groupId);

  res.status(200).json({
    success: true,
    message: "Group balances calculated successfully",
    data: balancesSummary,
  });
});

export const leaveGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const validation = validateGroupId({ groupId });
  if (validation.error) {
    throw new ApiError(400, validation.error);
  }

  await groupService.leaveGroup(req.user, groupId);

  res.status(200).json({
    success: true,
    message: "Left the group successfully",
  });
});

export const settleUpGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const paramValidation = validateGroupId({ groupId });
  if (paramValidation.error) {
    throw new ApiError(400, paramValidation.error);
  }

  const bodyValidation = validateGroupSettleUp(req.body);
  if (bodyValidation.error) {
    throw new ApiError(400, bodyValidation.error);
  }

  const settlement = await groupService.settleUpGroup(req.user, groupId, req.body);

  res.status(200).json({
    success: true,
    message: "Group settlement recorded successfully",
    data: settlement,
  });
});