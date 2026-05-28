import * as expenseService from "./expense.service.js";
import {
  validateAddExpenseInput,
  validateRespondToSplitInput,
} from "./expense.validators.js";

/**
 * Controller endpoint to add a new expense.
 */
export const addExpense = async (req, res) => {
  try {
    const paidBy = req.user;
    const validation = validateAddExpenseInput(req.body);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const { totalAmount, splits = [], description, location, category, date } = req.body;

    const expense = await expenseService.createExpense({
      paidBy,
      totalAmount,
      splits,
      description,
      location,
      category,
      date,
    });

    return res.status(201).json({
      message: "Expense added successfully",
      expense,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * Controller endpoint to respond to an expense split.
 */
export const respondToSplit = async (req, res) => {
  try {
    const userId = req.user;
    const { expenseId } = req.params;
    const validation = validateRespondToSplitInput(req.body);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const { status } = req.body;

    const expense = await expenseService.respondToExpenseSplit({
      userId,
      expenseId,
      status,
    });

    return res.status(200).json({
      message: `Split ${status} successfully`,
      expense,
    });
  } catch (error) {
    console.error("Respond split error:", error);
    const status = error.status || 500;
    return res.status(status).json({
      message: status === 500 ? "Server error. Please try again." : error.message,
    });
  }
};

/**
 * Controller endpoint to edit an expense.
 */
export const editExpense = async (req, res) => {
  try {
    const userId = req.user;
    const { expenseId } = req.params;

    const validation = validateAddExpenseInput(req.body);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const { totalAmount, splits = [], description, location, category, date } = req.body;

    const expense = await expenseService.updateExpense({
      userId,
      expenseId,
      totalAmount,
      splits,
      description,
      location,
      category,
      date,
    });

    return res.status(200).json({
      message: "Expense edited successfully",
      expense,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * Controller endpoint to delete an expense.
 */
export const deleteExpense = async (req, res) => {
  try {
    const userId = req.user;
    const { expenseId } = req.params;

    await expenseService.removeExpense({
      userId,
      expenseId,
    });

    return res.status(200).json({
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    const status = error.status || 500;
    return res.status(status).json({
      message: status === 500 ? "Server error. Please try again." : error.message,
    });
  }
};

/**
 * Controller endpoint to get expense details by ID.
 */
export const getExpenseById = async (req, res) => {
  try {
    const me = req.user;
    const { expenseId } = req.params;

    const details = await expenseService.fetchExpenseDetails({
      userId: me,
      expenseId,
    });

    return res.status(200).json(details);
  } catch (error) {
    console.error("Get expense by ID error:", error);
    const status = error.status || 500;
    return res.status(status).json({
      message: status === 500 ? "Server error. Please try again." : error.message,
    });
  }
};
