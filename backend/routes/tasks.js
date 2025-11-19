const express = require("express");
const Task = require("../models/Task");
const User = require("../models/User");
const { auth, adminAuth } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");

const router = express.Router();

// Get all tasks for current user (GET /api/tasks)
router.get("/", auth, async (req, res) => {
  try {
    let query = {};

    // If admin, get all tasks; if employee, get only assigned tasks
    if (req.user.role !== "admin") {
      query = {
        $or: [
          { assignedTo: { $in: [req.user._id] } },
          { assignedBy: req.user._id },
        ],
      };
    }

    const tasks = await Task.find(query)
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get task by ID (GET /api/tasks/:id)
router.get("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user has access to this task
    const isAssigned =
      task.assignedTo._id.toString() === req.user._id.toString();
    const isCreator =
      task.assignedBy._id.toString() === req.user._id.toString();

    if (!isAssigned && !isCreator && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create new task (POST /api/tasks) - All authenticated users
router.post(
  "/",
  [
    auth,
    body("title").notEmpty().trim(),
    body("description").notEmpty().trim(),
    body("assignedTo").isArray(),
    body("deadline").isISO8601(),
    body("priority").isIn(["low", "medium", "high"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, assignedTo, deadline, priority } = req.body;

      // Check if all assigned users exist
      const assignedUsers = await User.find({ _id: { $in: assignedTo } });
      if (assignedUsers.length !== assignedTo.length) {
        return res
          .status(400)
          .json({ message: "One or more assigned users not found" });
      }

      const task = new Task({
        title,
        description,
        assignedTo,
        assignedBy: req.user._id,
        deadline: new Date(deadline),
        priority,
      });

      await task.save();
      await task.populate("assignedTo", "name email");
      await task.populate("assignedBy", "name email");

      // Emit real-time events for task creation
      if (global.io) {
        // Notify assigned user
        global.io.to(`user_${task.assignedTo._id}`).emit("task_assigned", {
          taskId: task._id,
          title: task.title,
          priority: task.priority,
          deadline: task.deadline,
          assignedBy: task.assignedBy.name,
          message: `New task assigned: ${task.title}`,
        });

        // Notify admins
        global.io.to("admin_room").emit("task_created", {
          taskId: task._id,
          title: task.title,
          createdBy: req.user.name,
          assignedTo: task.assignedTo.name,
          message: `New task created: ${task.title}`,
        });
      }

      res.status(201).json(task);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update task (PUT /api/tasks/:id)
router.put(
  "/:id",
  [
    auth,
    body("status").optional().isIn(["todo", "inprogress", "completed"]),
    body("priority").optional().isIn(["low", "medium", "high"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check permissions
      const isAssigned = task.assignedTo.toString() === req.user._id.toString();
      const isCreator = task.assignedBy.toString() === req.user._id.toString();
      const canUpdate = isAssigned || isCreator || req.user.role === "admin";

      if (!canUpdate) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update allowed fields
      const allowedUpdates = ["status", "priority"];
      const updates = {};

      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      const updatedTask = await Task.findByIdAndUpdate(req.params.id, updates, {
        new: true,
      })
        .populate("assignedTo", "name email")
        .populate("assignedBy", "name email");

      // Emit real-time events for task updates
      if (global.io) {
        // Notify all involved users about the update
        const notificationData = {
          taskId: updatedTask._id,
          title: updatedTask.title,
          updates: updates,
          updatedBy: req.user.name,
          message: `Task updated: ${updatedTask.title}`,
        };

        // Notify assigned user
        global.io
          .to(`user_${updatedTask.assignedTo._id}`)
          .emit("task_updated", notificationData);

        // Notify task creator if different from updater
        if (updatedTask.assignedBy._id.toString() !== req.user._id.toString()) {
          global.io
            .to(`user_${updatedTask.assignedBy._id}`)
            .emit("task_updated", notificationData);
        }

        // Notify admins
        global.io.to("admin_room").emit("task_updated", notificationData);
      }

      res.json(updatedTask);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Add comment to task (POST /api/tasks/:id/comments)
router.post(
  "/:id/comments",
  [auth, body("text").notEmpty().trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check if user has access to this task
      const isAssigned = task.assignedTo.toString() === req.user._id.toString();
      const isCreator = task.assignedBy.toString() === req.user._id.toString();
      const hasAccess = isAssigned || isCreator || req.user.role === "admin";

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const comment = {
        text: req.body.text,
        userId: req.user._id,
        userName: req.user.name,
      };

      task.comments.push(comment);
      await task.save();

      res.status(201).json(comment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all tasks (GET /api/tasks/all) - Admin only
router.get("/admin/all", [auth, adminAuth], async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate("assignedTo", "name email department")
      .populate("assignedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete task (DELETE /api/tasks/:id) - Creator or Admin only
router.delete("/:id", [auth], async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permissions - only creator or admin can delete
    const isCreator =
      task.assignedBy._id.toString() === req.user._id.toString();
    const canDelete = isCreator || req.user.role === "admin";

    if (!canDelete) {
      return res.status(403).json({
        message: "Access denied. Only task creator or admin can delete tasks.",
      });
    }

    // Emit real-time events before deletion
    if (global.io) {
      const notificationData = {
        taskId: task._id,
        title: task.title,
        deletedBy: req.user.name,
        message: `Task deleted: ${task.title}`,
      };

      // Notify assigned user
      global.io
        .to(`user_${task.assignedTo._id}`)
        .emit("task_deleted", notificationData);

      // Notify task creator if different from deleter
      if (task.assignedBy._id.toString() !== req.user._id.toString()) {
        global.io
          .to(`user_${task.assignedBy._id}`)
          .emit("task_deleted", notificationData);
      }

      // Notify admins
      global.io.to("admin_room").emit("task_deleted", notificationData);
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
