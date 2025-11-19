const express = require("express");
const router = express.Router();
const Holiday = require("../models/Holiday");
const { auth, adminAuth } = require("../middleware/auth");

// Get all holidays
router.get("/", auth, async (req, res) => {
  try {
    const holidays = await Holiday.find({ isActive: true }).sort({ date: 1 });
    res.json(holidays);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create holiday (Admin only)
router.post("/", [auth, adminAuth], async (req, res) => {
  try {
    const { name, date, type } = req.body;

    const holiday = new Holiday({
      name,
      date: new Date(date),
      type,
    });

    await holiday.save();
    res.json(holiday);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete holiday (Admin only)
router.delete("/:id", [auth, adminAuth], async (req, res) => {
  try {
    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ message: "Holiday deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Check if date is holiday
router.get("/check/:date", auth, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    // Check if weekend
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Check if holiday
    const holiday = await Holiday.findOne({
      date: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999)),
      },
      isActive: true,
    });

    res.json({
      isHoliday: !!holiday || isWeekend,
      holidayName: holiday ? holiday.name : isWeekend ? "Weekend" : null,
      isWeekend,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
