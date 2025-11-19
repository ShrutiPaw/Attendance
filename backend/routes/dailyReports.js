const express = require("express");
const DailyTaskReport = require("../models/DailyTaskReport");
const Task = require("../models/Task");
const { auth } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
} = require("docx");

const router = express.Router();

// Create daily task report (POST /api/daily-reports)
router.post(
  "/",
  [
    auth,
    body("summary").notEmpty().trim().withMessage("Summary is required"),
    body("tasksCompleted")
      .isArray()
      .withMessage("Tasks completed must be an array"),
    body("tasksInProgress")
      .isArray()
      .withMessage("Tasks in progress must be an array"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        tasksCompleted,
        tasksInProgress,
        summary,
        challenges,
        nextDayPlan,
      } = req.body;
      const userId = req.user._id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if report already exists for today
      const existingReport = await DailyTaskReport.findOne({
        userId,
        date: today,
      });

      if (existingReport) {
        return res.status(400).json({
          message: "Daily report already exists for today. Use PUT to update.",
        });
      }

      // Validate that all task IDs exist and belong to the user
      const allTaskIds = [...tasksCompleted, ...tasksInProgress];
      if (allTaskIds.length > 0) {
        const tasks = await Task.find({
          _id: { $in: allTaskIds },
          $or: [{ assignedTo: userId }, { assignedBy: userId }],
        });

        if (tasks.length !== allTaskIds.length) {
          return res.status(400).json({
            message: "One or more tasks not found or not accessible",
          });
        }
      }

      const report = new DailyTaskReport({
        userId,
        date: today,
        tasksCompleted,
        tasksInProgress,
        summary,
        challenges: challenges || "",
        nextDayPlan: nextDayPlan || "",
      });

      await report.save();
      await report.populate("tasksCompleted", "title status");
      await report.populate("tasksInProgress", "title status");

      res.status(201).json(report);
    } catch (error) {
      console.error("Daily report creation error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get today's report (GET /api/daily-reports/today)
router.get("/today", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create date range for the entire day
    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const report = await DailyTaskReport.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .populate("tasksCompleted", "title status")
      .populate("tasksInProgress", "title status");

    if (!report) {
      return res.status(404).json({ message: "No report found for today" });
    }

    res.json(report);
  } catch (error) {
    console.error("Get today's report error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all reports for admin (GET /api/daily-reports/admin)
router.get("/admin", auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { date, userId } = req.query;
    let query = {};

    // Filter by specific date if provided
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const startOfDay = new Date(targetDate);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      query.date = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    // Filter by specific user if provided
    if (userId) {
      query.userId = userId;
    }

    const reports = await DailyTaskReport.find(query)
      .populate("userId", "name email department position")
      .populate("tasksCompleted", "title status")
      .populate("tasksInProgress", "title status")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    console.error("Get admin reports error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all reports for user (GET /api/daily-reports)
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, limit = 30 } = req.query;

    let query = { userId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const reports = await DailyTaskReport.find(query)
      .populate("tasksCompleted", "title status")
      .populate("tasksInProgress", "title status")
      .sort({ date: -1 })
      .limit(parseInt(limit));

    res.json(reports);
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update today's report (PUT /api/daily-reports/:id)
router.put(
  "/:id",
  [
    auth,
    body("summary").notEmpty().trim().withMessage("Summary is required"),
    body("tasksCompleted")
      .isArray()
      .withMessage("Tasks completed must be an array"),
    body("tasksInProgress")
      .isArray()
      .withMessage("Tasks in progress must be an array"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        tasksCompleted,
        tasksInProgress,
        summary,
        challenges,
        nextDayPlan,
      } = req.body;
      const userId = req.user._id;
      const reportId = req.params.id;

      const report = await DailyTaskReport.findOne({
        _id: reportId,
        userId,
      });

      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Validate that all task IDs exist and belong to the user
      const allTaskIds = [...tasksCompleted, ...tasksInProgress];
      if (allTaskIds.length > 0) {
        const tasks = await Task.find({
          _id: { $in: allTaskIds },
          $or: [{ assignedTo: userId }, { assignedBy: userId }],
        });

        if (tasks.length !== allTaskIds.length) {
          return res.status(400).json({
            message: "One or more tasks not found or not accessible",
          });
        }
      }

      report.tasksCompleted = tasksCompleted;
      report.tasksInProgress = tasksInProgress;
      report.summary = summary;
      report.challenges = challenges || "";
      report.nextDayPlan = nextDayPlan || "";

      await report.save();
      await report.populate("tasksCompleted", "title status");
      await report.populate("tasksInProgress", "title status");

      res.json(report);
    } catch (error) {
      console.error("Update report error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete report (DELETE /api/daily-reports/:id)
router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const reportId = req.params.id;

    const report = await DailyTaskReport.findOneAndDelete({
      _id: reportId,
      userId,
    });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Delete report error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Generate DOCX report (GET /api/daily-reports/export)
router.get("/export", auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const { date } = req.query;
    let query = {};

    // Filter by specific date if provided, otherwise get today's reports
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const startOfDay = new Date(targetDate);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      query.date = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfDay = new Date(today);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      query.date = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    const reports = await DailyTaskReport.find(query)
      .populate("userId", "name email department position")
      .populate("tasksCompleted", "title status")
      .populate("tasksInProgress", "title status")
      .sort({ createdAt: -1 });

    // Generate DOCX document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "Daily Task Reports",
              heading: HeadingLevel.TITLE,
              alignment: "center",
            }),
            new Paragraph({
              text: `Generated on: ${new Date().toLocaleDateString()}`,
              alignment: "center",
            }),
            new Paragraph({
              text: `Report Date: ${
                date
                  ? new Date(date).toLocaleDateString()
                  : new Date().toLocaleDateString()
              }`,
              alignment: "center",
            }),
            new Paragraph({ text: "" }), // Empty line

            // Summary table
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph("Employee")],
                      width: { size: 25, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph("Department")],
                      width: { size: 20, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph("Tasks Completed")],
                      width: { size: 15, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph("Tasks In Progress")],
                      width: { size: 15, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph("Report Status")],
                      width: { size: 25, type: WidthType.PERCENTAGE },
                    }),
                  ],
                }),
                ...reports.map(
                  (report) =>
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [
                            new Paragraph(report.userId?.name || "Unknown"),
                          ],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph(report.userId?.department || "N/A"),
                          ],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph(
                              report.tasksCompleted?.length?.toString() || "0"
                            ),
                          ],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph(
                              report.tasksInProgress?.length?.toString() || "0"
                            ),
                          ],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph(
                              report.summary ? "Submitted" : "Not Submitted"
                            ),
                          ],
                        }),
                      ],
                    })
                ),
              ],
            }),

            new Paragraph({ text: "" }), // Empty line

            // Detailed reports
            ...reports
              .map((report) => [
                new Paragraph({
                  text: `Report by: ${report.userId?.name || "Unknown"} (${
                    report.userId?.email || "N/A"
                  })`,
                  heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                  text: `Department: ${
                    report.userId?.department || "N/A"
                  } | Position: ${report.userId?.position || "N/A"}`,
                }),
                new Paragraph({
                  text: `Date: ${new Date(report.date).toLocaleDateString()}`,
                }),
                new Paragraph({ text: "" }),

                new Paragraph({
                  text: "Summary:",
                  heading: HeadingLevel.HEADING_3,
                }),
                new Paragraph({
                  text: report.summary || "No summary provided",
                }),
                new Paragraph({ text: "" }),

                new Paragraph({
                  text: "Pending Work:",
                  heading: HeadingLevel.HEADING_3,
                }),
                new Paragraph({
                  text: report.nextDayPlan || "No pending work mentioned",
                }),
                new Paragraph({ text: "" }),

                new Paragraph({
                  text: "Tasks Completed:",
                  heading: HeadingLevel.HEADING_3,
                }),
                ...(report.tasksCompleted?.length > 0
                  ? report.tasksCompleted.map(
                      (task) =>
                        new Paragraph({
                          text: `• ${task.title || "Unknown Task"}`,
                          indent: { left: 720 },
                        })
                    )
                  : [
                      new Paragraph({
                        text: "No tasks completed",
                        indent: { left: 720 },
                      }),
                    ]),
                new Paragraph({ text: "" }),

                new Paragraph({
                  text: "Tasks In Progress:",
                  heading: HeadingLevel.HEADING_3,
                }),
                ...(report.tasksInProgress?.length > 0
                  ? report.tasksInProgress.map(
                      (task) =>
                        new Paragraph({
                          text: `• ${task.title || "Unknown Task"}`,
                          indent: { left: 720 },
                        })
                    )
                  : [
                      new Paragraph({
                        text: "No tasks in progress",
                        indent: { left: 720 },
                      }),
                    ]),
                new Paragraph({ text: "" }),
                new Paragraph({
                  text: "─".repeat(50),
                  alignment: "center",
                }),
                new Paragraph({ text: "" }),
              ])
              .flat(),
          ],
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Set response headers
    const filename = `daily-reports-${
      date
        ? new Date(date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    }.docx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);

    res.send(buffer);
  } catch (error) {
    console.error("Export reports error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
