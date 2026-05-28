import Friendship from "../../models/Friendship.model.js";

export const buildSplits = async ({
  paidBy,
  totalAmount,
  splits,
}) => {
  let finalSplits = [];
  let sum = 0;
  const seenUsers = new Set();

  if (splits.length === 0) {
    return [
      {
        user: paidBy,
        amount: totalAmount,
        status: "accepted",
      },
    ];
  }

  for (const split of splits) {
    const { user, amount } = split;

    if (!user || !amount || amount <= 0) {
      throw new Error("Invalid split data");
    }

    if (user.toString() === paidBy.toString()) {
      throw new Error("Do not include payer in splits");
    }

    if (seenUsers.has(user.toString())) {
      throw new Error("Duplicate user in splits");
    }
    seenUsers.add(user.toString());

    const isFriend = await Friendship.findOne({
      $or: [
        { user1: paidBy, user2: user },
        { user1: user, user2: paidBy },
      ],
    });

    if (!isFriend) {
      throw new Error("Split includes non-friend user");
    }

    sum += amount;

    finalSplits.push({
      user,
      amount,
      status: "pending",
    });
  }

  const myShare = Number((totalAmount - sum).toFixed(2));

  if (myShare < 0) {
    throw new Error("Split amount exceeds total amount");
  }

  if (myShare > 0) {
    finalSplits.push({
      user: paidBy,
      amount: myShare,
      status: "accepted",
    });
  }

  return finalSplits;
};
