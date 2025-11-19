const express = require("express");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Location = require("../models/Location");
const { auth, adminAuth } = require("../middleware/auth");

const router = express.Router();

// Helper function to calculate distance
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Mark attendance (POST /api/attendance/mark)
router.post("/mark", auth, async (req, res) => {
  try {
    let { latitude, longitude, accuracy } = req.body;
    const userId = req.user._id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if today is holiday or weekend
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const Holiday = require("../models/Holiday");
    const holiday = await Holiday.findOne({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
      isActive: true,
    });

    if (isWeekend || holiday) {
      return res.status(400).json({
        message: holiday
          ? `Today is a holiday: ${holiday.name}`
          : "Today is weekend",
        isHoliday: true,
      });
    }

    // Get user's timezone from request or use server default
    const userTimezone = req.body.timezone || "Asia/Kolkata";

    // Create date in user's timezone
    const userTime = new Date(
      now.toLocaleString("en-US", { timeZone: userTimezone })
    );

    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const workStartTime = 9 * 60;
    const workEndTime = 17 * 60;
    if (currentTime < workStartTime || currentTime > workEndTime) {
      return res.status(400).json({
        message:
          "Attendance can only be marked between 9:00 AM and 5:00 PM IST",
        workingHours: "9:00 AM - 5:00 PM IST",
        currentTimeIST: `${currentHour
          .toString()
          .padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`,
        serverTime: now.toISOString(),
        debug: {
          currentHour,
          currentMinute,
          currentTime,
          workStartTime,
          workEndTime,
        },
      });
    }

    // Validate location data - only required for mobile
    const source = req.body.source || "mobile"; // Default to mobile for backward compatibility

    if (source === "mobile" && (!latitude || !longitude)) {
      return res.status(400).json({
        message: "Location coordinates are required for mobile attendance",
      });
    }

    // For web version, use default coordinates if not provided
    if (source === "web") {
      latitude = latitude || 0;
      longitude = longitude || 0;
    }

    // Check if attendance already marked today
    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAttendance = await Attendance.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (existingAttendance && existingAttendance.checkIn) {
      // Mark check-out
      if (!existingAttendance.checkOut) {
        const checkOutTime = new Date();
        existingAttendance.checkOut = checkOutTime;

        // NOTE: Previously the status was changed to "half_day" here when no daily
        // report was present. That logic has been removed so that attendance
        // status is not dependent on the daily report. The report feature
        // remains unchanged elsewhere.

        await existingAttendance.save();

        // Emit real-time event for check-out
        if (global.io) {
          // Notify admins about check-out
          global.io.to("admin_room").emit("attendance_update", {
            type: "check_out",
            userId: userId,
            userName: req.user.name,
            timestamp: checkOutTime,
            workingHours: existingAttendance.workingHours,
            message: `${req.user.name} checked out`,
          });

          // Notify the user
          global.io.to(`user_${userId}`).emit("attendance_confirmed", {
            type: "check_out",
            timestamp: checkOutTime,
            workingHours: existingAttendance.workingHours,
            message: "Check-out successful",
          });
        }

        return res.json(existingAttendance);
      } else {
        return res
          .status(400)
          .json({ message: "Attendance already completed for today" });
      }
    }

    // Only check location for mobile attendance
    if (source === "mobile") {
      // Get office location
      const officeLocation = await Location.findOne({ isActive: true });
      if (!officeLocation) {
        return res
          .status(400)
          .json({ message: "Office location not configured" });
      }

      // Check if user is within office radius using dynamic radius
      const distance = calculateDistance(
        latitude,
        longitude,
        officeLocation.latitude,
        officeLocation.longitude
      );

      // Dynamic radius: base radius + accuracy buffer for indoor stability
      const baseRadius = officeLocation.radius;
      const accuracyBuffer = accuracy
        ? Math.min(Math.max(accuracy, 20), 100)
        : 30;
      const dynamicRadius = baseRadius + accuracyBuffer;

      if (distance > dynamicRadius) {
        return res.status(400).json({
          message: "You are outside the office area",
          distance: Math.round(distance),
          allowedRadius: Math.round(dynamicRadius),
          baseRadius: baseRadius,
          accuracyBuffer: Math.round(accuracyBuffer),
        });
      }
    }

    // Determine status based on time - Updated logic for 10 AM cutoff
    // let workStartTime = new Date(today);
    // workStartTime.setHours(9, 0, 0, 0); // 9:00 AM - work starts
    const lateThreshold = new Date(today);
    lateThreshold.setHours(10, 0, 0, 0); // 10:00 AM - late threshold

    let status = "present";
    if (now > lateThreshold) {
      status = "late";
    }

    // Create or update attendance
    const attendance =
      existingAttendance ||
      new Attendance({
        userId,
        date: today,
      });

    attendance.checkIn = now;
    attendance.status = status;
    attendance.source = source;
    attendance.location = {
      latitude: latitude,
      longitude: longitude,
    };

    // Set default/check-out time to 5:00 PM IST on the same day so we don't
    // need a cron job to mark the user as present for the full day.
    try {
      const checkoutTime = new Date(
        userTime.toLocaleString("en-US", { timeZone: userTimezone })
      );
      checkoutTime.setHours(17, 0, 0, 0); // 5:00 PM IST
      attendance.checkOut = checkoutTime;
    } catch (e) {
      // Fallback: set checkOut to server's 5:00 PM local time for the day
      const fallbackCheckout = new Date(today);
      fallbackCheckout.setHours(17, 0, 0, 0);
      attendance.checkOut = fallbackCheckout;
    }

    await attendance.save();

    // Emit real-time event for attendance update
    if (global.io) {
      // Notify admins about new attendance
      global.io.to("admin_room").emit("attendance_update", {
        type: "check_in",
        userId: userId,
        userName: req.user.name,
        status: status,
        source: source,
        timestamp: now,
        message: `${req.user.name} checked in (${status}) via ${source}`,
      });

      // Notify the user
      global.io.to(`user_${userId}`).emit("attendance_confirmed", {
        type: "check_in",
        status: status,
        timestamp: now,
        message:
          status === "late"
            ? "Marked as late (after 10:00 AM)"
            : "Attendance marked successfully",
      });
    }

    // Return success with status info
    res.json({
      ...attendance.toObject(),
      message:
        status === "late"
          ? "Marked as late (after 10:00 AM)"
          : "Attendance marked successfully",
      isLate: status === "late",
    });
  } catch (error) {
    console.error("Attendance marking error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get today's attendance (GET /api/attendance/today)
router.get("/today", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create date range for the entire day
    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await Attendance.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (!attendance) {
      return res.status(404).json({ message: "No attendance found for today" });
    }

    res.json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get attendance history (GET /api/attendance/history)
router.get("/history", auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    const userId = req.user._id;

    const query = { userId };
    if (start && end) {
      query.date = {
        $gte: new Date(start),
        $lte: new Date(end),
      };
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(50);

    res.json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all attendance (GET /api/attendance/all) - Admin only
router.get("/all", [auth, adminAuth], async (req, res) => {
  try {
    const { date, start, end, userId } = req.query;
    const User = require("../models/User");

    let query = {};
    let dateRange = {};

    // Date filtering
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      dateRange = {
        $gte: targetDate,
        $lt: nextDay,
      };
      query.date = dateRange;
    } else if (start && end) {
      const startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);

      dateRange = {
        $gte: startDate,
        $lte: endDate,
      };
      query.date = dateRange;
    } else {
      // Default to today if no date specified
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      dateRange = {
        $gte: today,
        $lt: tomorrow,
      };
      query.date = dateRange;
    }

    // User filtering
    if (userId && userId !== "all") {
      query.userId = userId;
    }

    // Get attendance records
    const attendance = await Attendance.find(query)
      .populate("userId", "name email department")
      .sort({ date: -1, createdAt: -1 });

    // Get all active users
    let userQuery = { isActive: true };
    if (userId && userId !== "all") {
      userQuery._id = userId;
    }
    const allUsers = await User.find(userQuery);

    // Generate complete attendance records with absent users
    const completeAttendance = [];
    const Holiday = require("../models/Holiday");

    // Create date array for the range
    const dates = [];
    if (date) {
      dates.push(new Date(date));
    } else if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        dates.push(new Date(d));
      }
    } else {
      dates.push(new Date());
    }

    for (const currentDate of dates) {
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Check if it's a holiday
      const holiday = await Holiday.findOne({
        date: {
          $gte: new Date(currentDate.setHours(0, 0, 0, 0)),
          $lt: new Date(currentDate.setHours(23, 59, 59, 999)),
        },
        isActive: true,
      });

      const isHoliday = !!holiday;

      // Create a map of existing attendance for this date
      const attendanceMap = new Map();
      attendance
        .filter((record) => {
          const recordDate = new Date(record.date);
          return recordDate.toDateString() === currentDate.toDateString();
        })
        .forEach((record) => {
          attendanceMap.set(record.userId._id.toString(), record);
        });

      // Process each user
      for (const user of allUsers) {
        const existingRecord = attendanceMap.get(user._id.toString());

        if (existingRecord) {
          completeAttendance.push(existingRecord);
        } else if (!isWeekend && !isHoliday) {
          // Create absent record for working days
          completeAttendance.push({
            _id: `absent-${user._id}-${
              currentDate.toISOString().split("T")[0]
            }`,
            userId: {
              _id: user._id,
              name: user.name,
              email: user.email,
              department: user.department,
            },
            date: currentDate.toISOString().split("T")[0],
            status: "absent",
            checkIn: null,
            checkOut: null,
            location: null,
            workingHours: 0,
            createdAt: currentDate.toISOString(),
            updatedAt: currentDate.toISOString(),
          });
        }
      }
    }

    res.json(completeAttendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get attendance statistics (GET /api/attendance/stats) - Admin only
router.get("/stats", [auth, adminAuth], async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalUsers = await User.countDocuments({ isActive: true });

    // Check if today is weekend or holiday
    const dayOfWeek = today.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const Holiday = require("../models/Holiday");
    const holiday = await Holiday.findOne({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
      isActive: true,
    });

    const isHoliday = !!holiday;

    if (isWeekend || isHoliday) {
      return res.json({
        totalUsers,
        presentToday: 0,
        lateToday: 0,
        absentToday: 0,
        isHoliday: isHoliday,
        isWeekend: isWeekend,
        holidayName: holiday?.name,
        message: isHoliday
          ? `Today is a holiday: ${holiday.name}`
          : "Today is weekend",
      });
    }

    const todayStats = await Attendance.aggregate([
      {
        $match: {
          date: today,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      totalUsers,
      presentToday: 0,
      lateToday: 0,
      absentToday: 0,
    };

    todayStats.forEach((stat) => {
      if (stat._id === "present") stats.presentToday = stat.count;
      if (stat._id === "late") stats.lateToday = stat.count;
    });

    // Calculate absent count (users who didn't mark attendance)
    stats.absentToday = totalUsers - stats.presentToday - stats.lateToday;

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// NOTE: Scheduler endpoints removed — scheduler has been disabled/removed.

// Update attendance record (Admin only) - PUT /api/attendance/:id
router.put("/:id", [auth, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, status } = req.body;

    // Check if the ID is a valid MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message:
          "Cannot edit auto-generated absent records. Only actual attendance records can be edited.",
      });
    }

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Update fields if provided
    if (checkIn !== undefined) {
      const checkInTime = new Date(checkIn);
      const checkInHour = checkInTime.getHours();
      const checkInMinute = checkInTime.getMinutes();
      const checkInMinutes = checkInHour * 60 + checkInMinute;

      // Validate check-in time is between 9 AM and 5 PM
      if (checkInMinutes < 9 * 60 || checkInMinutes > 17 * 60) {
        return res.status(400).json({
          message: "Check-in time must be between 9:00 AM and 5:00 PM",
        });
      }

      attendance.checkIn = checkInTime;
    }

    if (checkOut !== undefined) {
      const checkOutTime = new Date(checkOut);
      const checkOutHour = checkOutTime.getHours();
      const checkOutMinute = checkOutTime.getMinutes();
      const checkOutMinutes = checkOutHour * 60 + checkOutMinute;

      // Validate check-out time is between 9 AM and 5 PM
      if (checkOutMinutes < 9 * 60 || checkOutMinutes > 17 * 60) {
        return res.status(400).json({
          message: "Check-out time must be between 9:00 AM and 5:00 PM",
        });
      }

      attendance.checkOut = checkOutTime;
    }

    if (status !== undefined) {
      attendance.status = status;
    }

    // Recalculate working hours if both check-in and check-out are present
    if (attendance.checkIn && attendance.checkOut) {
      const checkInTime = new Date(attendance.checkIn);
      const checkOutTime = new Date(attendance.checkOut);
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      attendance.workingHours = diffMs / (1000 * 60 * 60); // Convert to hours
    }

    await attendance.save();

    // Emit real-time event for attendance update
    if (global.io) {
      global.io.to("admin_room").emit("attendance_updated", {
        type: "admin_edit",
        attendanceId: id,
        updatedBy: req.user.name,
        message: `Attendance record updated by ${req.user.name}`,
      });
    }

    res.json({
      message: "Attendance record updated successfully",
      attendance: attendance,
    });
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Manual check-out endpoint (POST /api/attendance/checkout)
router.post("/checkout", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if attendance already marked today
    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAttendance = await Attendance.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (!existingAttendance || !existingAttendance.checkIn) {
      return res.status(400).json({
        message: "You must check in before checking out",
      });
    }

    if (existingAttendance.checkOut) {
      return res.status(400).json({
        message: "You have already checked out today",
      });
    }

    // Mark check-out. Note: we do NOT change status based on daily report.
    // The daily report feature remains but it no longer affects attendance
    // status (half_day/full_day) automatically.
    existingAttendance.checkOut = now;

    await existingAttendance.save();

    // Emit real-time event for check-out
    if (global.io) {
      // Notify admins about check-out
      global.io.to("admin_room").emit("attendance_update", {
        type: "check_out",
        userId: userId,
        userName: req.user.name,
        timestamp: now,
        workingHours: existingAttendance.workingHours,
        message: `${req.user.name} checked out`,
      });

      // Notify the user
      global.io.to(`user_${userId}`).emit("attendance_confirmed", {
        type: "check_out",
        timestamp: now,
        workingHours: existingAttendance.workingHours,
        message: "Check-out successful",
      });
    }

    res.json({
      message: "Check-out successful",
      attendance: existingAttendance,
    });
  } catch (error) {
    console.error("Check-out error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
