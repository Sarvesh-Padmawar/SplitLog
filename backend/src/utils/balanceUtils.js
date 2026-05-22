/**
 * Centralized Balance Utilities
 * Provides pure, predictable functions to calculate balances, settlements, and dashboard summaries.
 * Serves as the single source of truth across all controllers.
 * Implements a standard double-entry ledger abstraction with a FIFO (First-In, First-Out)
 * chronological settlement allocation engine for partial settlement tracking.
 */

/**
 * Floating point safe rounding to 2 decimal places.
 * Crucial to prevent standard javascript floating-point drift in ledger totals.
 *
 * @param {number} val - Input currency value
 * @returns {number} - Rounded currency value
 */
export const roundCurrency = (val) => {
  if (typeof val !== "number" || isNaN(val)) return 0;
  return Number(Math.round(val + "e+2") + "e-2");
};

/**
 * Checks and asserts strict accounting invariants for a normalized ledger state.
 * Throws errors if any inconsistencies (like simultaneous owe and receive states) are found.
 *
 * @param {number} youOwe - My debt to a friend
 * @param {number} theyOwe - Friend's debt to me
 * @param {number} netBalance - Final normalized net balance
 */
export const assertLedgerInvariants = (youOwe, theyOwe, netBalance) => {
  // Invariant 1: No negative double states (cannot owe and receive from same friend simultaneously after normalization)
  if (youOwe > 0 && theyOwe > 0) {
    throw new Error(`Ledger Invariant Violation: Negative double-state! User simultaneously owes (${youOwe}) and is owed (${theyOwe}) by the same friend!`);
  }
  // Invariant 2: Balance must exactly match theyOwe - youOwe (allowance for tiny float offsets handled by rounding)
  const expectedBalance = roundCurrency(theyOwe - youOwe);
  if (Math.abs(netBalance - expectedBalance) > 0.01) {
    throw new Error(`Ledger Invariant Violation: Mathematical asymmetry! netBalance (${netBalance}) !== theyOwe - youOwe (${expectedBalance})`);
  }
};

/**
 * Filters out orphan/deleted-expense settlements to prevent leakage into active calculations.
 * In SplitLog, settlements are always linked to specific expenses.
 * If all linked expenses are deleted, the settlement is an orphan and is safely excluded.
 *
 * @param {Array} settlements - All accepted settlements between two users
 * @param {Array} expenses - All shared expenses between two users
 * @returns {Array} - Active, non-orphan settlements
 */
export const filterActiveSettlements = (settlements, expenses) => {
  return settlements.filter((s) => {
    if (!s.expenses || s.expenses.length === 0) return false;
    return s.expenses.some((eId) => {
      const idStr = eId._id ? eId._id.toString() : eId.toString();
      return expenses.some((exp) => exp._id.toString() === idStr);
    });
  });
};

/**
 * Builds a Set of expense IDs that are part of fully accepted settlements.
 * Provided for backward-compatibility with other parts of the application.
 * 
 * @param {Array} settlements - List of settlement objects
 * @returns {Set<string>} - Set of stringified expense IDs
 */
export const buildSettledExpenseIds = (settlements) => {
  const settledIds = new Set();
  settlements.forEach((s) => {
    if (s.status === "accepted") {
      (s.expenses || []).forEach((e) => {
        settledIds.add(e._id ? e._id.toString() : e.toString());
      });
    }
  });
  return settledIds;
};

/**
 * Calculates exact outstanding balance between two specific friends based on their
 * accepted expenses and accepted settlements.
 * Uses a mathematically robust, symmetric, uncapped subtraction ledger offset:
 * 
 * WHY CAPPED SUBTRACTION WAS MATHEMATICALLY INCORRECT:
 * Previously, the code capped owe-directions at 0 *before* offset:
 *   youOwe = Math.max(0, expenseYouOwe - settledByMe);
 *   theyOwe = Math.max(0, expenseTheyOwe - settledByFriend);
 * In asymmetric credit/overpayment scenarios (e.g. paying off a deleted expense settlement),
 * if a user paid a settlement but had no active debt, expenseYouOwe was 0.
 * Thus, youOwe evaluated to Math.max(0, 0 - 144.67) = 0, completely discarding their
 * settlement and losing their overpayment, causing mathematical asymmetry across friends.
 *
 * CORRECTED SYMMETRIC FORMULA:
 * We offset the gross active debts and gross active settlements in a single uncapped subtraction:
 *   Net Balance = (GrossTheyOwe - SettledByFriend) - (GrossYouOwe - SettledByMe)
 * With a zero-expense safeguard to completely prevent phantom balances when no active expenses exist.
 * 
 * @param {string} me - Current user ID string
 * @param {string} friendId - Target friend ID string
 * @param {Array} expenses - Shared expenses involving both users
 * @param {Array} settlements - Settlements between both users
 * @returns {Object} - { youOwe, theyOwe, netBalance }
 */
export const calculateFriendBalance = (me, friendId, expenses, settlements) => {
  let expenseTheyOwe = 0;
  let expenseYouOwe = 0;

  // 1️⃣ Sum accepted splits from expenses
  expenses.forEach((expense) => {
    const payerId = expense.paidBy._id ? expense.paidBy._id.toString() : expense.paidBy.toString();
    const paidByMe = payerId === me;
    const paidByFriend = payerId === friendId;

    if (!paidByMe && !paidByFriend) return; // Ignore if neither paid

    expense.splits.forEach((split) => {
      if (split.status !== "accepted") return;
      
      const splitUserId = split.user._id ? split.user._id.toString() : split.user.toString();

      if (paidByFriend && splitUserId === me) {
        expenseYouOwe += split.amount; // Friend paid, I split -> I owe friend
      } else if (paidByMe && splitUserId === friendId) {
        expenseTheyOwe += split.amount; // I paid, friend splits -> friend owes me
      }
    });
  });

  // Filter out orphan/deleted-expense settlements to prevent leakage
  const activeSettlements = filterActiveSettlements(settlements, expenses);

  // 2️⃣ Sum accepted active settlements
  let settledByMe = 0;
  let settledByFriend = 0;

  activeSettlements.forEach((settlement) => {
    if (settlement.status !== "accepted") return;

    const fromId = settlement.from._id ? settlement.from._id.toString() : settlement.from.toString();
    const toId = settlement.to._id ? settlement.to._id.toString() : settlement.to.toString();

    if (fromId === me && toId === friendId) {
      settledByMe += settlement.amount; // I paid friend to settle debt
    } else if (fromId === friendId && toId === me) {
      settledByFriend += settlement.amount; // Friend paid me to settle debt
    }
  });

  // Optional debug audit mode (LEDGER_DEBUG=true)
  if (process.env.LEDGER_DEBUG === "true") {
    console.log(`[LEDGER_DEBUG] [calculateFriendBalance] me=${me} friend=${friendId}`);
    console.log(`  - Gross expenseTheyOwe: ${expenseTheyOwe}`);
    console.log(`  - Gross expenseYouOwe: ${expenseYouOwe}`);
    console.log(`  - Filtered activeSettlements count: ${activeSettlements.length} (out of ${settlements.length})`);
    console.log(`  - settledByMe (my active payments): ${settledByMe}`);
    console.log(`  - settledByFriend (friend active payments): ${settledByFriend}`);
  }

  // 3️⃣ Symmetric Uncapped Ledger Offset with zero-expense safeguard:
  // If no active expenses exist, both sides owe exactly 0. This prevents phantom balances on orphan settlements.
  if (expenseTheyOwe === 0 && expenseYouOwe === 0) {
    if (process.env.LEDGER_DEBUG === "true") {
      console.log(`  - No active expenses: returning zero balances.`);
    }
    return {
      youOwe: 0,
      theyOwe: 0,
      netBalance: 0,
    };
  }

  // Compute uncapped net friend balance (positive means they owe me, negative means I owe them)
  const netFriendBalance = roundCurrency(
    (expenseTheyOwe - settledByFriend) - (expenseYouOwe - settledByMe)
  );

  let youOwe = 0;
  let theyOwe = 0;

  if (netFriendBalance > 0) {
    theyOwe = netFriendBalance;
  } else if (netFriendBalance < 0) {
    youOwe = Math.abs(netFriendBalance);
  }

  youOwe = roundCurrency(youOwe);
  theyOwe = roundCurrency(theyOwe);
  const roundedNet = roundCurrency(netFriendBalance);

  if (process.env.LEDGER_DEBUG === "true") {
    console.log(`  - Final normalized outstandings: youOwe=${youOwe}, theyOwe=${theyOwe}, netBalance=${roundedNet}`);
  }

  // Assert accounting invariants
  assertLedgerInvariants(youOwe, theyOwe, roundedNet);

  return {
    youOwe,
    theyOwe,
    netBalance: roundedNet,
  };
};

/**
 * Calculates outstanding balances across all friends for the ledger view.
 * 
 * @param {string} me - Current user ID string
 * @param {Array} friendships - List of friendship objects
 * @param {Array} expenses - All expenses involving the user
 * @param {Array} settlements - All accepted settlements for the user
 * @returns {Array} - Formatted ledger entries per friend
 */
export const calculateNetBalances = (me, friendships, expenses, settlements) => {
  return friendships.map((f) => {
    const friend = f.user1._id.toString() === me ? f.user2 : f.user1;
    const friendId = friend._id.toString();

    // 1️⃣ Filter expenses and settlements for this specific friend
    const friendExpenses = expenses.filter((e) => {
      const payerId = e.paidBy._id ? e.paidBy._id.toString() : e.paidBy.toString();
      const hasMe = e.splits.some((s) => (s.user._id ? s.user._id.toString() : s.user.toString()) === me);
      const hasFriend = e.splits.some((s) => (s.user._id ? s.user._id.toString() : s.user.toString()) === friendId);
      return (payerId === me && hasFriend) || (payerId === friendId && hasMe);
    });

    const friendSettlements = settlements.filter((s) => {
      const fromId = s.from._id ? s.from._id.toString() : s.from.toString();
      const toId = s.to._id ? s.to._id.toString() : s.to.toString();
      return (fromId === me && toId === friendId) || (fromId === friendId && toId === me);
    });

    // 2️⃣ Calculate balance
    const { youOwe, theyOwe, netBalance } = calculateFriendBalance(me, friendId, friendExpenses, friendSettlements);

    // 3️⃣ Count pending expenses between me and this friend
    let pendingExpenses = 0;
    friendExpenses.forEach((e) => {
      const payerId = e.paidBy._id ? e.paidBy._id.toString() : e.paidBy.toString();
      const paidByMe = payerId === me;

      e.splits.forEach((split) => {
        const splitUserId = split.user._id ? split.user._id.toString() : split.user.toString();
        if (split.status === "pending") {
          if (paidByMe && splitUserId === friendId) {
            pendingExpenses += 1;
          } else if (!paidByMe && splitUserId === me) {
            pendingExpenses += 1;
          }
        }
      });
    });

    return {
      friend,
      youOwe,
      theyOwe,
      netBalance,
      pendingExpenses,
    };
  });
};

/**
 * Calculates global summaries (youOwe, youGet, thisMonth spent) for the dashboard
 * by aggregating simplified friend-by-friend net outstanding balances.
 * 
 * @param {string} me - Current user ID string
 * @param {Array} expenses - All expenses involving the user
 * @param {Array} settlements - All accepted settlements for the user
 * @param {Date} monthStart - Javascript Date object representing start of current month
 * @returns {Object} - Dashboard summary totals
 */
export const calculateDashboardSummary = (me, expenses, settlements, monthStart) => {
  let youOwe = 0;
  let youGet = 0;
  let thisMonth = 0;
  let youPaid = 0;

  // 1️⃣ Find all unique friend IDs involved in any transactions
  const friendIds = new Set();
  expenses.forEach((e) => {
    const payerId = e.paidBy._id ? e.paidBy._id.toString() : e.paidBy.toString();
    if (payerId !== me) friendIds.add(payerId);
    e.splits.forEach((s) => {
      const uid = s.user._id ? s.user._id.toString() : s.user.toString();
      if (uid !== me) friendIds.add(uid);
    });
  });

  settlements.forEach((s) => {
    const fromId = s.from._id ? s.from._id.toString() : s.from.toString();
    const toId = s.to._id ? s.to._id.toString() : s.to.toString();
    if (fromId !== me) friendIds.add(fromId);
    if (toId !== me) friendIds.add(toId);
  });

  // 2️⃣ Sum up net friend-by-friend relations
  friendIds.forEach((friendId) => {
    // Filter relevant records
    const friendExpenses = expenses.filter((e) => {
      const payerId = e.paidBy._id ? e.paidBy._id.toString() : e.paidBy.toString();
      const hasMe = e.splits.some((s) => (s.user._id ? s.user._id.toString() : s.user.toString()) === me);
      const hasFriend = e.splits.some((s) => (s.user._id ? s.user._id.toString() : s.user.toString()) === friendId);
      return (payerId === me && hasFriend) || (payerId === friendId && hasMe);
    });

    const friendSettlements = settlements.filter((s) => {
      const fromId = s.from._id ? s.from._id.toString() : s.from.toString();
      const toId = s.to._id ? s.to._id.toString() : s.to.toString();
      return (fromId === me && toId === friendId) || (fromId === friendId && toId === me);
    });

    const { netBalance } = calculateFriendBalance(me, friendId, friendExpenses, friendSettlements);
    if (netBalance > 0) {
      youGet += netBalance;
    } else if (netBalance < 0) {
      youOwe += Math.abs(netBalance);
    }
  });

  // 3️⃣ Monthly personal spending and payment totals (independent of settlements)
  expenses.forEach((expense) => {
    const payerId = expense.paidBy._id ? expense.paidBy._id.toString() : expense.paidBy.toString();
    const paidByMe = payerId === me;
    const createdAt = new Date(expense.date || expense.createdAt);
    const isThisMonth = createdAt >= monthStart;

    const isSelfExpense = expense.splits.length === 1 && 
      (expense.splits[0].user._id ? expense.splits[0].user._id.toString() : expense.splits[0].user.toString()) === me;

    const mySplit = expense.splits.find((s) => {
      const uid = s.user._id ? s.user._id.toString() : s.user.toString();
      return uid === me;
    });

    const allFriendSplitsRejectedOrPending = !isSelfExpense && paidByMe && expense.splits
      .filter((s) => {
        const uid = s.user._id ? s.user._id.toString() : s.user.toString();
        return uid !== me;
      })
      .every((s) => s.status === "rejected" || s.status === "pending");

    if (isThisMonth) {
      if (isSelfExpense) {
        thisMonth += expense.totalAmount;
      } else if (paidByMe) {
        thisMonth += mySplit ? mySplit.amount : 0; // Personal spending share
      } else if (!paidByMe && mySplit && mySplit.status === "accepted") {
        thisMonth += mySplit.amount; // Personal spending share
      }

      if (paidByMe && (isSelfExpense || !allFriendSplitsRejectedOrPending)) {
        youPaid += expense.totalAmount;
      }
    }
  });

  return {
    netBalance: Number((youGet - youOwe).toFixed(2)),
    youOwe: Number(youOwe.toFixed(2)),
    youGet: Number(youGet.toFixed(2)),
    thisMonth: Number(thisMonth.toFixed(2)),
    youPaid: Number(youPaid.toFixed(2)),
  };
};

/**
 * Implements Chronological First-In, First-Out (FIFO) allocation of accepted settlements
 * to individual accepted expense splits.
 * 
 * @param {string} me - Current user ID string
 * @param {string} friendId - Target friend ID string
 * @param {Array} expenses - All expenses between me and this friend
 * @param {Array} settlements - All accepted settlements between me and this friend
 * @returns {Object} - Mapping of { expenseId: { paidAmount, remainingAmount, status } }
 */
export const allocateSettlementsFIFO = (me, friendId, expenses, settlements) => {
  // Filter out orphan/deleted-expense settlements to align FIFO with symmetric ledger balances
  const activeSettlements = filterActiveSettlements(settlements, expenses);

  // 1️⃣ Separate accepted active settlements by direction
  let settledToMePool = 0; // Settlements friend paid me (covers their debt)
  let settledToFriendPool = 0; // Settlements I paid friend (covers my debt)

  activeSettlements.forEach((s) => {
    if (s.status !== "accepted") return;
    const fromId = s.from._id ? s.from._id.toString() : s.from.toString();
    const toId = s.to._id ? s.to._id.toString() : s.to.toString();

    if (fromId === friendId && toId === me) {
      settledToMePool += s.amount;
    } else if (fromId === me && toId === friendId) {
      settledToFriendPool += s.amount;
    }
  });

  // 2️⃣ Sort expenses chronologically (oldest first)
  const sortedExpenses = [...expenses].sort((a, b) => {
    const timeA = new Date(a.date || a.createdAt).getTime();
    const timeB = new Date(b.date || b.createdAt).getTime();
    return timeA - timeB;
  });

  const allocationMap = {}; // { expenseId: { paidAmount, remainingAmount, status } }

  // 3️⃣ Allocate payments chronologically
  sortedExpenses.forEach((expense) => {
    const expenseId = expense._id.toString();
    const payerId = expense.paidBy._id ? expense.paidBy._id.toString() : expense.paidBy.toString();
    const paidByMe = payerId === me;

    // Find the participant's split
    const targetUserId = paidByMe ? friendId : me;
    const split = expense.splits.find((s) => {
      const uid = s.user._id ? s.user._id.toString() : s.user.toString();
      return uid === targetUserId;
    });

    if (!split) {
      allocationMap[expenseId] = { paidAmount: 0, remainingAmount: 0, status: "none" };
      return;
    }

    if (split.status === "rejected") {
      allocationMap[expenseId] = { paidAmount: 0, remainingAmount: split.amount, status: "rejected" };
      return;
    }

    if (split.status === "pending") {
      allocationMap[expenseId] = { paidAmount: 0, remainingAmount: split.amount, status: "pending" };
      return;
    }

    // Status is accepted — allocate settlement funds
    const originalDebt = split.amount;
    let paidAmount = 0;

    if (paidByMe) {
      // Friend owes me. Allocate settledToMePool
      if (settledToMePool > 0) {
        paidAmount = Math.min(originalDebt, settledToMePool);
        settledToMePool -= paidAmount;
      }
    } else {
      // I owe friend. Allocate settledToFriendPool
      if (settledToFriendPool > 0) {
        paidAmount = Math.min(originalDebt, settledToFriendPool);
        settledToFriendPool -= paidAmount;
      }
    }

    // Keep high-precision rounding
    paidAmount = Number(paidAmount.toFixed(2));
    const remainingAmount = Number((originalDebt - paidAmount).toFixed(2));

    let status = "open";
    if (remainingAmount === 0) {
      status = "settled";
    } else if (paidAmount > 0) {
      status = "partially_settled";
    }

    allocationMap[expenseId] = {
      paidAmount,
      remainingAmount,
      status,
    };
  });

  return allocationMap;
};

/**
 * Derives the comprehensive status for an expense based on the user's perspective,
 * split approvals, and settlement states.
 * 
 * @param {string} me - Current user ID string
 * @param {Object} expense - The expense object (populated splits.user and paidBy)
 * @param {Set<string>} settledFriendIds - Set of friend IDs who have accepted settlements with me for this expense
 * @returns {Object} - { status, acceptedCount, totalFriends, settledFriends }
 */
export const deriveExpenseStatus = (me, expense, settledFriendIds = new Set()) => {
  const payerId = expense.paidBy._id ? expense.paidBy._id.toString() : expense.paidBy.toString();
  const paidByMe = payerId === me;

  // Resolve user helper
  const getUid = (s) => {
    if (!s || !s.user) return null;
    return s.user._id ? s.user._id.toString() : s.user.toString();
  };

  // Find all splits excluding the payer
  const friendSplits = expense.splits.filter((s) => getUid(s) !== payerId);
  const totalFriends = friendSplits.length;

  // Is this a self-expense?
  const isSelfExpense = expense.splits.length === 1 && getUid(expense.splits[0]) === payerId;

  if (isSelfExpense) {
    return {
      status: "settled",
      acceptedCount: 0,
      totalFriends: 0,
      settledFriends: 0,
    };
  }

  // Check split approval states
  const hasPending = friendSplits.some((s) => s.status === "pending");
  const hasRejected = friendSplits.some((s) => s.status === "rejected");
  const acceptedCount = friendSplits.filter((s) => s.status === "accepted").length;

  if (hasPending) {
    return {
      status: "pending",
      acceptedCount,
      totalFriends,
      settledFriends: 0,
    };
  }

  if (hasRejected) {
    return {
      status: "rejected",
      acceptedCount,
      totalFriends,
      settledFriends: 0,
    };
  }

  // All splits are accepted! Now check settlement state.
  // Count how many friends have settled their splits with the payer.
  let settledFriends = 0;
  friendSplits.forEach((s) => {
    const fid = getUid(s);
    if (paidByMe) {
      if (settledFriendIds.has(fid)) {
        settledFriends++;
      }
    } else {
      if (settledFriendIds.has(payerId)) {
        settledFriends++;
      }
    }
  });

  let status;
  if (paidByMe) {
    if (settledFriends === 0) {
      status = "open";
    } else if (settledFriends < totalFriends) {
      status = "partially_settled";
    } else {
      status = "settled";
    }
  } else {
    // Non-payer perspective: either I settled my share with the payer, or it's still open
    const mySettled = settledFriendIds.has(payerId);
    if (mySettled) {
      status = "settled";
    } else {
      status = "open";
    }
  }

  return {
    status,
    acceptedCount,
    totalFriends,
    settledFriends,
  };
};

