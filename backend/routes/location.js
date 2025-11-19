const express = require("express");
const Location = require("../models/Location");
const { auth, adminAuth } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");

const router = express.Router();

// Get office location (GET /api/location)
router.get("/", auth, async (req, res) => {
  try {
    const location = await Location.findOne({ isActive: true });
    if (!location) {
      return res
        .status(404)
        .json({ message: "Office location not configured" });
    }
    res.json(location);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Set office location (POST /api/location) - Admin only
router.post(
  "/",
  [
    auth,
    adminAuth,
    body("latitude").isFloat({ min: -90, max: 90 }),
    body("longitude").isFloat({ min: -180, max: 180 }),
    body("radius").isInt({ min: 1 }),
    body("address").notEmpty().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { latitude, longitude, radius, address } = req.body;

      // Deactivate existing locations
      await Location.updateMany({}, { isActive: false });

      // Create new location
      const location = new Location({
        latitude,
        longitude,
        radius,
        address,
        isActive: true,
      });

      await location.save();
      res.status(201).json(location);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
