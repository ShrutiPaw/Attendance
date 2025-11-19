const mongoose = require("mongoose");

const dailyTaskReportSchema = new mongoose.Schema(
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
    tasksCompleted: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    tasksInProgress: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    challenges: {
      type: String,
      trim: true,
      default: "",
    },
    nextDayPlan: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one report per user per day
dailyTaskReportSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DailyTaskReport", dailyTaskReportSchema);
