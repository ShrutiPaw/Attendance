import React, { useState } from "react";
import { Calendar, User, MessageCircle, Trash2 } from "lucide-react";
import { Task } from "../types/index.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { useTask } from "../contexts/TaskContext.tsx";
import ConfirmDialog from "./ConfirmDialog.tsx";

interface TaskCardProps {
  task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const { user } = useAuth();
  const { updateTask, deleteTask } = useTask();
  const [updating, setUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAssignedToMe = task.assignedTo?._id === user?._id;
  const isCreatedByMe = task.assignedBy._id === user?._id;

  const handleStatusChange = async (
    newStatus: "todo" | "inprogress" | "completed"
  ) => {
    try {
      setUpdating(true);
      await updateTask(task._id, { status: newStatus });
    } catch (error) {
      console.error("Failed to update task status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleting(true);
      console.log("Attempting to delete task:", task._id);
      await deleteTask(task._id);
      console.log("Task deleted successfully");
      setShowDeleteDialog(false);
      // Show success message or handle success
    } catch (error: any) {
      console.error("Failed to delete task:", error);
      // Show error message to user
      alert(
        `Failed to delete task: ${
          error.response?.data?.message || error.message || "Unknown error"
        }`
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isOverdue =
    new Date(task.deadline) < new Date() && task.status !== "completed";

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "inprogress":
        return "bg-blue-100 text-blue-800";
      case "todo":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
        isOverdue
          ? "border-red-500"
          : task.priority === "high"
          ? "border-red-400"
          : task.priority === "medium"
          ? "border-yellow-400"
          : "border-green-400"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
          {task.title}
        </h3>
        {/* Delete button - only visible to task creator */}
        {isCreatedByMe && (
          <button
            onClick={handleDeleteClick}
            disabled={deleting}
            className="p-2 rounded-full hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
            title="Delete Task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
        {task.description}
      </p>

      {/* Tags */}
      <div className="flex items-center space-x-2 mb-4">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
            task.priority
          )}`}
        >
          {task.priority}
        </span>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
            task.status
          )}`}
        >
          {task.status.replace("inprogress", "in progress")}
        </span>
        {isOverdue && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Overdue
          </span>
        )}
      </div>

      {/* Meta Information */}
      <div className="space-y-2 text-sm text-gray-500">
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          <span>Due: {formatDate(task.deadline)}</span>
        </div>

        <div className="flex items-center">
          <User className="h-4 w-4 mr-2" />
          <span>By: {task.assignedBy.name}</span>
        </div>

        {task.assignedTo && (
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            <span>Assigned to: {task.assignedTo.name}</span>
          </div>
        )}

        {task.comments && task.comments.length > 0 && (
          <div className="flex items-center">
            <MessageCircle className="h-4 w-4 mr-2" />
            <span>
              {task.comments.length} comment
              {task.comments.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Status Update Buttons (only for assigned users) */}
      {isAssignedToMe && task.status !== "completed" && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex space-x-2">
            {task.status === "todo" && (
              <button
                onClick={() => handleStatusChange("inprogress")}
                disabled={updating}
                className="flex-1 bg-blue-600 text-white text-sm py-2 px-3 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Start Task
              </button>
            )}

            {task.status === "inprogress" && (
              <button
                onClick={() => handleStatusChange("completed")}
                disabled={updating}
                className="flex-1 bg-green-600 text-white text-sm py-2 px-3 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Complete Task
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
      />
    </div>
  );
};

export default TaskCard;
