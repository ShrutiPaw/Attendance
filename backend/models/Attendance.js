const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    checkIn: {
      type: Date,
    },
    checkOut: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["present", "late", "absent", "half_day"],
      default: "absent",
    },
    location: {
      latitude: Number,
      longitude: Number,
    },
    workingHours: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      enum: ["mobile", "web"],
      default: "mobile",
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one attendance record per user per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

// Calculate working hours before saving
attendanceSchema.pre("save", function (next) {
  if (this.checkIn && this.checkOut) {
    const diffMs = this.checkOut - this.checkIn;
    this.workingHours = diffMs / (1000 * 60 * 60); // Convert to hours
  }
  next();
});

module.exports = mongoose.model("Attendance", attendanceSchema);
