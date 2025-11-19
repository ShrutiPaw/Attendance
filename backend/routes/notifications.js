const express = require("express");
const router = express.Router();
const { auth, adminAuth } = require("../middleware/auth");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { Expo } = require("expo-server-sdk");

const expo = new Expo();

// Send notification to user OLD
// router.post("/send", auth, async (req, res) => {
//   try {
//     const { userId, title, body, data } = req.body;

//     // Validate required fields
//     if (!userId || !title || !body) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     // Check if user exists
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Store notification in database
//     const notification = new Notification({
//       userId,
//       title,
//       body,
//       data,
//       type: data?.type || "system",
//     });

//     await notification.save();

//     // Here you would integrate with a push notification service
//     // like Firebase Cloud Messaging (FCM) or Apple Push Notification Service (APNs)

//     res.json({
//       message: "Notification sent successfully",
//       notification: {
//         id: notification._id,
//         userId,
//         title,
//         body,
//         data,
//         timestamp: notification.createdAt,
//       },
//     });
//   } catch (error) {
//     console.error("Notification error:", error);
//     res.status(500).json({ message: "Failed to send notification" });
//   }
// });

// Send notification to user New
router.post("/send", auth, async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    console.log("=== BACKEND NOTIFICATION DEBUG ===");
    console.log("Request from user:", req.user._id, req.user.name);
    console.log("Notification target userId:", userId);
    console.log("Notification title:", title);
    console.log("Notification body:", body);
    console.log("Notification data:", data);
    console.log("================================");

    // Validate required fields
    if (!userId || !title || !body) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.error("User not found for ID:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Target user found:", user.name, user.email);
    console.log(
      "Target user push token:",
      user.pushToken ? "Present" : "Missing"
    );

    // Check if the requesting user and target user have the same push token
    if (
      req.user.pushToken &&
      user.pushToken &&
      req.user.pushToken === user.pushToken
    ) {
      console.log(
        "WARNING: Requesting user and target user have the same push token!"
      );
      console.log("This means they're using the same device/app instance");
    }

    console.log(
      "Requesting user push token:",
      req.user.pushToken ? "Present" : "Missing"
    );

    // Store notification in database
    const notification = new Notification({
      userId,
      title,
      body,
      data,
      type: data?.type || "system",
    });

    await notification.save();

    // Send push notification via Expo
    if (user.pushToken && Expo.isExpoPushToken(user.pushToken)) {
      try {
        console.log("Sending push notification to:", user.pushToken);
        const pushResult = await expo.sendPushNotificationsAsync([
          {
            to: user.pushToken,
            sound: "default",
            title: title,
            body: body,
            data: data || {},
            channelId: "default",
            priority: "high",
            badge: 1,
          },
        ]);
        console.log("Push notification result:", pushResult);
      } catch (pushError) {
        console.error("Expo push error:", pushError);
        // Optional: you may want to log this in DB or notify admin
      }
    } else {
      console.log("No valid push token for user:", user.name);
    }

    res.json({
      message: "Notification sent successfully",
      notification: {
        id: notification._id,
        userId,
        title,
        body,
        data,
        timestamp: notification.createdAt,
      },
    });
  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({ message: "Failed to send notification" });
  }
});

// Get notifications for current user
router.get("/user", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// Mark notification as read
router.put("/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// Delete all notifications for current user
router.delete("/user", auth, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.json({ message: "All notifications deleted" });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    res.status(500).json({ message: "Failed to delete notifications" });
  }
});

module.exports = router;
