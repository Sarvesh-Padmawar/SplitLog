import {
  roundCurrency,
  assertLedgerInvariants,
  filterActiveSettlements,
  calculateFriendBalance,
  calculateDashboardSummary,
  allocateSettlementsFIFO,
} from "../utils/balanceUtils.js";

// Utility to assert absolute correctness in tests
function assertEquals(actual, expected, message) {
  if (Math.abs(actual - expected) > 0.001) {
    throw new Error(`Assertion Failed: ${message}. Expected ${expected}, got ${actual}`);
  }
}

function assertDeepEquals(actual, expected, message) {
  const aStr = JSON.stringify(actual);
  const eStr = JSON.stringify(expected);
  if (aStr !== eStr) {
    throw new Error(`Assertion Failed: ${message}. Expected ${eStr}, got ${aStr}`);
  }
}

console.log("======================================================================");
console.log("🧪 RUNNING LEDGER MATH VERIFICATION TESTS (SANDBOXED)");
console.log("======================================================================");

try {
  // ==========================================================================
  // Test Case 1: Equal Split (₹300 split among 3 users equally)
  // ==========================================================================
  console.log("\n🔹 Test Case 1: Equal Split (₹300 among A, B, C)");
  
  const meA = "user_A";
  const meB = "user_B";
  const meC = "user_C";

  const expensesT1 = [
    {
      _id: "exp_1",
      description: "Dinner",
      totalAmount: 300,
      paidBy: meA,
      date: new Date(),
      splits: [
        { user: meA, amount: 100, status: "accepted" },
        { user: meB, amount: 100, status: "accepted" },
        { user: meC, amount: 100, status: "accepted" },
      ],
    },
  ];

  const settlementsT1 = []; // No settlements yet

  // Perspective A (Payer)
  // B's split
  const A_vs_B_Expenses = expensesT1;
  const A_vs_B_Settlements = settlementsT1;
  const balA_B = calculateFriendBalance(meA, meB, A_vs_B_Expenses, A_vs_B_Settlements);
  
  console.log("  A vs B Balance:", balA_B);
  assertEquals(balA_B.youOwe, 0, "A should owe B nothing");
  assertEquals(balA_B.theyOwe, 100, "B should owe A ₹100");
  assertEquals(balA_B.netBalance, 100, "Net balance should be +₹100");

  // Perspective B (Participant)
  const balB_A = calculateFriendBalance(meB, meA, A_vs_B_Expenses, A_vs_B_Settlements);
  console.log("  B vs A Balance:", balB_A);
  assertEquals(balB_A.youOwe, 100, "B should owe A ₹100");
  assertEquals(balB_A.theyOwe, 0, "A should owe B nothing");
  assertEquals(balB_A.netBalance, -100, "Net balance should be -₹100");

  // Symmetry assertions
  assertEquals(balA_B.theyOwe, balB_A.youOwe, "Symmetry: B's debt to A must equal B's own owe amount");
  assertEquals(balA_B.netBalance, -balB_A.netBalance, "Symmetry: A's net balance must be inverse of B's net balance");

  // Dashboard calculations
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const dashA = calculateDashboardSummary(meA, expensesT1, settlementsT1, monthStart);
  console.log("  A's Dashboard:", dashA);
  assertEquals(dashA.youGet, 200, "A should be owed ₹200 total (from B and C)");
  assertEquals(dashA.youOwe, 0, "A should owe ₹0 globally");
  assertEquals(dashA.netBalance, 200, "A's net balance should be +₹200");
  assertEquals(dashA.thisMonth, 100, "Payer's 'This Month' should count their own share (₹100)");

  const dashB = calculateDashboardSummary(meB, expensesT1, settlementsT1, monthStart);
  console.log("  B's Dashboard:", dashB);
  assertEquals(dashB.youGet, 0, "B should get ₹0");
  assertEquals(dashB.youOwe, 100, "B should owe ₹100 total");
  assertEquals(dashB.netBalance, -100, "B's net balance should be -₹100");
  assertEquals(dashB.thisMonth, 100, "Participant B's 'This Month' should count B's share (₹100)");

  // Global Ledger Consistency Check (Test 1)
  const totalReceivables = dashA.youGet + dashB.youGet + calculateDashboardSummary(meC, expensesT1, settlementsT1, monthStart).youGet;
  const totalPayables = dashA.youOwe + dashB.youOwe + calculateDashboardSummary(meC, expensesT1, settlementsT1, monthStart).youOwe;
  assertEquals(totalReceivables, totalPayables, "Global consistency: Sum(youGet) === Sum(youOwe)");
  console.log(`  ✅ Global Consistency Verified: totalGet (${totalReceivables}) === totalOwe (${totalPayables})`);


  // ==========================================================================
  // Test Case 2: Unequal Splits (₹100 split 70/30)
  // ==========================================================================
  console.log("\n🔹 Test Case 2: Unequal Split (₹100 split 70/30 between A and B)");

  const expensesT2 = [
    {
      _id: "exp_2",
      description: "Cab ride",
      totalAmount: 100,
      paidBy: meA,
      date: new Date(),
      splits: [
        { user: meA, amount: 70, status: "accepted" },
        { user: meB, amount: 30, status: "accepted" },
      ],
    },
  ];

  const balA_B_T2 = calculateFriendBalance(meA, meB, expensesT2, []);
  console.log("  A vs B (T2):", balA_B_T2);
  assertEquals(balA_B_T2.youOwe, 0, "A owes 0");
  assertEquals(balA_B_T2.theyOwe, 30, "B owes A 30");

  const balB_A_T2 = calculateFriendBalance(meB, meA, expensesT2, []);
  console.log("  B vs A (T2):", balB_A_T2);
  assertEquals(balB_A_T2.youOwe, 30, "B owes A 30");
  assertEquals(balB_A_T2.theyOwe, 0, "A owes B 0");


  // ==========================================================================
  // Test Case 3: Partial Settlement
  // ==========================================================================
  console.log("\n🔹 Test Case 3: Partial Settlement (B settles ₹30 of their ₹100 debt)");

  const settlementsT3 = [
    {
      _id: "set_1",
      from: meB,
      to: meA,
      amount: 30,
      status: "accepted",
      expenses: ["exp_1"],
    },
  ];

  const balA_B_T3 = calculateFriendBalance(meA, meB, expensesT1, settlementsT3);
  console.log("  A vs B after partial settlement:", balA_B_T3);
  assertEquals(balA_B_T3.youOwe, 0, "A owes 0");
  assertEquals(balA_B_T3.theyOwe, 70, "B should now owe A ₹70 (100 - 30)");
  assertEquals(balA_B_T3.netBalance, 70, "Net balance should be 70");

  // Check FIFO allocation mapping
  const fifoT3 = allocateSettlementsFIFO(meA, meB, expensesT1, settlementsT3);
  console.log("  FIFO allocation map:", fifoT3);
  assertEquals(fifoT3["exp_1"].paidAmount, 30, "FIFO: exp_1 paid amount should be 30");
  assertEquals(fifoT3["exp_1"].remainingAmount, 70, "FIFO: exp_1 remaining amount should be 70");
  assertEquals(fifoT3["exp_1"].status, "partially_settled", "FIFO status should be partially_settled");


  // ==========================================================================
  // Test Case 4: Deleted Expense Safety & Orphan Settlements
  // ==========================================================================
  console.log("\n🔹 Test Case 4: Deleted Expense Safety & Orphan Settlements");

  // Scenario: Dinner (exp_1) is deleted, leaving an orphan settlement of ₹30.
  // We mock this by filtering exp_1 out of the active expenses, but the settlement still has expenses: ["exp_1"].
  const activeExpensesT4 = []; // Dinner deleted!
  const settlementsT4 = [...settlementsT3]; // Contains settlement for deleted exp_1

  // Active settlement filter check
  const activeSettlements = filterActiveSettlements(settlementsT4, activeExpensesT4);
  console.log("  Active settlements filter count:", activeSettlements.length);
  assertEquals(activeSettlements.length, 0, "Active settlements filter should completely exclude orphan settlement");

  // Friend balance calculation check
  const balA_B_T4 = calculateFriendBalance(meA, meB, activeExpensesT4, settlementsT4);
  console.log("  A vs B (Dinner deleted, orphan settlement remaining):", balA_B_T4);
  assertEquals(balA_B_T4.youOwe, 0, "youOwe should be 0");
  assertEquals(balA_B_T4.theyOwe, 0, "theyOwe should be 0");
  assertEquals(balA_B_T4.netBalance, 0, "netBalance should be 0 (no phantom balance!)");


  // ==========================================================================
  // Test Case 5: Overpayments & Credit Notes (Uncapped Offset Logic)
  // ==========================================================================
  console.log("\n🔹 Test Case 5: Overpayment (B pays A ₹120 instead of ₹100)");

  const settlementsT5 = [
    {
      _id: "set_2",
      from: meB,
      to: meA,
      amount: 120, // ₹20 overpayment
      status: "accepted",
      expenses: ["exp_1"],
    },
  ];

  const balA_B_T5 = calculateFriendBalance(meA, meB, expensesT1, settlementsT5);
  console.log("  A vs B after overpayment (A's perspective):", balA_B_T5);
  // Net balance = (grossTheyOwe - settledByFriend) - (grossYouOwe - settledByMe)
  // = (100 - 120) - (0 - 0) = -20
  // meaning A owes B ₹20 (overpayment / credit note)
  assertEquals(balA_B_T5.youOwe, 20, "A should owe B ₹20 due to overpayment");
  assertEquals(balA_B_T5.theyOwe, 0, "B owes A 0");
  assertEquals(balA_B_T5.netBalance, -20, "A's net balance should be -20");

  const balB_A_T5 = calculateFriendBalance(meB, meA, expensesT1, settlementsT5);
  console.log("  B vs A after overpayment (B's perspective):", balB_A_T5);
  assertEquals(balB_A_T5.youOwe, 0, "B owes A 0");
  assertEquals(balB_A_T5.theyOwe, 20, "A should owe B ₹20");
  assertEquals(balB_A_T5.netBalance, 20, "B's net balance should be +20");

  // Invariants & symmetry verified!
  assertEquals(balA_B_T5.youOwe, balB_A_T5.theyOwe, "Overpayment symmetry check");
  assertEquals(balA_B_T5.netBalance, -balB_A_T5.netBalance, "Overpayment net balance symmetry check");

  console.log("\n======================================================================");
  console.log("🎉 ALL LEDGER VERIFICATION TESTS COMPLETED SUCCESSFULLY!");
  console.log("======================================================================");
} catch (error) {
  console.error("\n❌ TEST FAILURE DETECTED:");
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
