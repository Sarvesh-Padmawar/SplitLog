import Notification from "../models/Notification.model.js";
import Settlement from "../models/Settlement.model.js";

/* ================= GET NOTIFICATIONS ================= */
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user })
      .populate("sender", "name username")
      .populate("expense", "totalAmount description category")
      .populate("settlement", "amount status from to")
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user,
      read: false,
    });

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= MARK ONE AS READ ================= */
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Marked as read", notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= MARK ALL AS READ ================= */
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user, read: false },
      { read: true }
    );

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= RESPOND TO SETTLEMENT ================= */
export const respondToSettlement = async (req, res) => {
  try {
    const userId = req.user.toString();
    const { id } = req.params;
    const { status } = req.body; // "accepted" | "rejected"

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be either accepted or rejected",
      });
    }

    // Find the notification
    const notification = await Notification.findOne({
      _id: id,
      recipient: userId,
      type: "settlement_request",
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.read) {
      return res.status(400).json({ message: "Already responded" });
    }

    // Find and update the settlement
    const settlement = await Settlement.findById(notification.settlement);

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    if (settlement.status !== "pending") {
      return res.status(400).json({
        message: `Settlement already ${settlement.status}`,
      });
    }

    // Update settlement status
    settlement.status = status;
    await settlement.save();

    // Mark notification as read
    notification.read = true;
    await notification.save();

    res.status(200).json({
      message: `Settlement ${status} successfully`,
      settlement,
    });
  } catch (error) {
    console.error("Respond settlement error:", error);
    res.status(500).json({ message: error.message });
  }
};
