import React, { useEffect, useState } from "react";
import { X, CheckCircle, Info, AlertTriangle, XCircle } from "lucide-react";
import { useSocket } from "../contexts/SocketContext";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
  timestamp: Date;
}

const RealTimeNotifications: React.FC = () => {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!socket) return;

    // Listen for real-time events and convert them to notifications
    const handleAttendanceUpdate = (data: any) => {
      addNotification({
        title: "Attendance Update",
        message: data.message,
        type: "info",
      });
    };

    const handleAttendanceConfirmed = (data: any) => {
      addNotification({
        title: "Attendance",
        message: data.message,
        type: "success",
      });
    };

    const handleTaskAssigned = (data: any) => {
      addNotification({
        title: "New Task Assigned",
        message: data.message,
        type: "info",
      });
    };

    const handleTaskUpdated = (data: any) => {
      addNotification({
        title: "Task Updated",
        message: data.message,
        type: "info",
      });
    };

    const handleTaskDeleted = (data: any) => {
      addNotification({
        title: "Task Deleted",
        message: data.message,
        type: "warning",
      });
    };

    const handleTaskCreated = (data: any) => {
      addNotification({
        title: "New Task Created",
        message: data.message,
        type: "info",
      });
    };

    // Register event listeners
    socket.on("attendance_update", handleAttendanceUpdate);
    socket.on("attendance_confirmed", handleAttendanceConfirmed);
    socket.on("task_assigned", handleTaskAssigned);
    socket.on("task_updated", handleTaskUpdated);
    socket.on("task_deleted", handleTaskDeleted);
    socket.on("task_created", handleTaskCreated);

    // Cleanup
    return () => {
      socket.off("attendance_update", handleAttendanceUpdate);
      socket.off("attendance_confirmed", handleAttendanceConfirmed);
      socket.off("task_assigned", handleTaskAssigned);
      socket.off("task_updated", handleTaskUpdated);
      socket.off("task_deleted", handleTaskDeleted);
      socket.off("task_created", handleTaskCreated);
    };
  }, [socket]);

  const addNotification = (notification: Omit<Notification, "id" | "timestamp">) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    setNotifications((prev) => [newNotification, ...prev.slice(0, 4)]); // Keep only 5 notifications

    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "error":
        return "bg-red-50 border-red-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`max-w-sm w-full shadow-lg rounded-lg border ${getBackgroundColor(
            notification.type
          )} transform transition-all duration-300 ease-in-out`}
        >
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {getIcon(notification.type)}
              </div>
              <div className="ml-3 w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {notification.title}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {notification.message}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {notification.timestamp.toLocaleTimeString()}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RealTimeNotifications;
