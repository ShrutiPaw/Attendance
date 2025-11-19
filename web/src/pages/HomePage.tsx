import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  AlertCircle,
  Target,
  TrendingUp,
  Clock,
  X,
  FileText,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.tsx";
// import { useLocation } from "../contexts/LocationContext.tsx";
import { useTask } from "../contexts/TaskContext.tsx";
import { attendanceAPI, dailyTaskReportAPI } from "../services/api.ts";
import DailyTaskReportModal from "../components/DailyTaskReportModal.tsx";

const HomePage: React.FC = () => {
  const { user } = useAuth();
  // Location features are disabled on web
  const { tasks } = useTask();
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [alert, setAlert] = useState<{
    show: boolean;
    type: "success" | "error" | "info";
    message: string;
  }>({ show: false, type: "info", message: "" });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [lateReminderSent, setLateReminderSent] = useState(false);
  const [checkoutReminderSent, setCheckoutReminderSent] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  useEffect(() => {
    fetchTodayAttendance();
    fetchAttendanceStats();
    fetchTodayReport();
    requestNotificationPermission();

    // Set up time checking interval
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      checkTimeReminders();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Check reminders when attendance data changes
  useEffect(() => {
    checkTimeReminders();
  }, [todayAttendance, lateReminderSent, checkoutReminderSent]);

  const fetchTodayAttendance = async () => {
    try {
      const response = await attendanceAPI.getTodayAttendance();
      setTodayAttendance(response.data);
    } catch (error: any) {
      console.error("Error fetching today's attendance:", error);
      // Handle 404 (no attendance found) as normal case
      if (error.response?.status === 404) {
        setTodayAttendance(null);
      } else {
        setTodayAttendance(null);
      }
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      const response = await attendanceAPI.getStats();
      setAttendanceStats(response.data);
    } catch (error) {
      console.error("Failed to fetch attendance stats:", error);
    }
  };

  const fetchTodayReport = async () => {
    try {
      const response = await dailyTaskReportAPI.getTodayReport();
      setReportSubmitted(!!response.data);
    } catch (error) {
      // No report for today
      setReportSubmitted(false);
    }
  };

  const showAlert = (type: "success" | "error" | "info", message: string) => {
    setAlert({ show: true, type, message });
    setTimeout(
      () => setAlert({ show: false, type: "info", message: "" }),
      4000
    );
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");
    }
  };

  const sendNotification = (title: string, body: string, icon?: string) => {
    if (notificationsEnabled && "Notification" in window) {
      new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        badge: "/favicon.ico",
      });
    }
  };

  const getCurrentTimeString = () => {
    return currentTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getNextReminderInfo = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    // If not checked in and before 9:50 AM
    if (!todayAttendance?.checkIn && currentTime < 9 * 60 + 50) {
      return "Next: Late warning at 9:50 AM";
    }

    // If checked in but not checked out and before 4:50 PM
    if (
      todayAttendance?.checkIn &&
      !todayAttendance?.checkOut &&
      currentTime < 16 * 60 + 50
    ) {
      return "Next: Checkout reminder at 4:50 PM";
    }

    return "No upcoming reminders today";
  };

  const checkTimeReminders = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    // 9:50 AM - 10 minutes before late mark (10:00 AM)
    const lateReminderTime = 9 * 60 + 50; // 9:50 AM
    const lateTime = 10 * 60; // 10:00 AM

    // 4:50 PM - 10 minutes before checkout time (5:00 PM)
    const checkoutReminderTime = 16 * 60 + 50; // 4:50 PM
    const checkoutTime = 17 * 60; // 5:00 PM

    // Send late reminder at 9:50 AM if not checked in yet
    if (
      currentTime >= lateReminderTime &&
      currentTime < lateTime &&
      !lateReminderSent &&
      !todayAttendance?.checkIn
    ) {
      setLateReminderSent(true);
      sendNotification(
        "⏰ Attendance Reminder",
        "You have 10 minutes left to mark attendance before being marked late!"
      );
      showAlert(
        "info",
        "Reminder: Mark attendance in 10 minutes to avoid being late!"
      );
    }

    // Send checkout reminder at 4:50 PM if checked in but not checked out
    if (
      currentTime >= checkoutReminderTime &&
      currentTime < checkoutTime &&
      !checkoutReminderSent &&
      todayAttendance?.checkIn &&
      !todayAttendance?.checkOut
    ) {
      setCheckoutReminderSent(true);
      sendNotification(
        "🏃‍♂️ Checkout Reminder",
        "Don't forget to check out! Auto-checkout in 10 minutes at 5:00 PM."
      );
      showAlert("info", "Reminder: Don't forget to check out before 5:00 PM!");
    }

    // Reset reminders at midnight
    if (currentTime === 0) {
      setLateReminderSent(false);
      setCheckoutReminderSent(false);
    }
  };

  const getDateStatus = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        type: "weekend",
        label: "Weekend",
        color: "bg-blue-100 text-blue-800",
      };
    }

    // You can add holiday checking logic here
    // For now, just check if it's a common holiday date
    const month = today.getMonth() + 1;
    const date = today.getDate();

    // Example: New Year's Day
    if (month === 1 && date === 1) {
      return {
        type: "holiday",
        label: "Holiday",
        color: "bg-purple-100 text-purple-800",
      };
    }

    // Check attendance status; report no longer changes attendance status.
    if (todayAttendance?.checkIn && todayAttendance?.checkOut) {
      if (todayAttendance.status === "half_day") {
        return {
          type: "workday",
          label: "Half Day (No Report)",
          color: "bg-orange-100 text-orange-800",
        };
      } else {
        return {
          type: "workday",
          label: "Full Day",
          color: "bg-green-100 text-green-800",
        };
      }
    }

    if (todayAttendance?.checkIn) {
      return {
        type: "workday",
        label: "Half Day",
        color: "bg-yellow-100 text-yellow-800",
      };
    }

    return {
      type: "workday",
      label: "Not Marked",
      color: "bg-gray-100 text-gray-800",
    };
  };

  const handleMarkAttendance = async () => {
    const dateStatus = getDateStatus();

    try {
      setMarkingAttendance(true);
      // Mark attendance without location for web version
      await attendanceAPI.markAttendance({
        latitude: 0, // Default coordinates for web
        longitude: 0,
        source: "web",
      });

      await fetchTodayAttendance();

      if (dateStatus.type === "weekend") {
        showAlert("success", "Weekend attendance marked successfully!");
      } else if (dateStatus.type === "holiday") {
        showAlert("success", "Holiday attendance marked successfully!");
      } else {
        showAlert("success", "Attendance marked successfully!");
      }
    } catch (error: any) {
      showAlert(
        "error",
        error.response?.data?.message || "Failed to mark attendance"
      );
    } finally {
      setMarkingAttendance(false);
    }
  };

  const myTasks = tasks.filter((task) => task.assignedTo?._id === user?._id);

  const pendingTasks = myTasks.filter((task) => task.status !== "completed");
  const completedTasks = myTasks.filter((task) => task.status === "completed");

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">My Tasks</p>
              <p className="text-2xl font-semibold text-gray-900">
                {myTasks.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {completedTasks.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {pendingTasks.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Attendance Rate
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {attendanceStats?.attendanceRate || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Today's Attendance
          </h2>

          {todayAttendance ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Check In</span>
                <span className="font-medium">
                  {todayAttendance.checkIn
                    ? formatTime(todayAttendance.checkIn)
                    : "Not checked in"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Check Out</span>
                <span className="font-medium">
                  {todayAttendance.checkOut
                    ? formatTime(todayAttendance.checkOut)
                    : "Not checked out"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    todayAttendance.status === "present"
                      ? "bg-green-100 text-green-800"
                      : todayAttendance.status === "late"
                      ? "bg-yellow-100 text-yellow-800"
                      : todayAttendance.status === "half_day"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {todayAttendance.status === "half_day"
                    ? "Half Day"
                    : todayAttendance.status}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No attendance record for today</p>
          )}

          {/* Mark Attendance Button */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div>
                  <p className="text-sm text-gray-600">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-gray-500">Web attendance</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    getDateStatus().color
                  }`}
                >
                  {getDateStatus().label}
                </span>
              </div>
              <button
                onClick={handleMarkAttendance}
                disabled={
                  markingAttendance ||
                  (todayAttendance?.checkIn && todayAttendance?.checkOut)
                }
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {markingAttendance ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {todayAttendance?.checkIn && !todayAttendance?.checkOut
                      ? "Checking out..."
                      : "Marking..."}
                  </div>
                ) : todayAttendance?.checkIn && todayAttendance?.checkOut ? (
                  "Attendance Complete"
                ) : todayAttendance?.checkIn ? (
                  "Check Out"
                ) : (
                  "Mark Attendance"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Daily Task Report Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Daily Task Report
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {reportSubmitted ? "Report Submitted" : "Report Required"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {reportSubmitted
                      ? "You've submitted your daily task report"
                      : "You can submit your daily task report (optional)"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    reportSubmitted
                      ? "bg-green-100 text-green-800"
                      : "bg-orange-100 text-orange-800"
                  }`}
                >
                  {reportSubmitted ? "Submitted" : "Required"}
                </span>
                <button
                  onClick={() => setShowDailyReportModal(true)}
                  className="btn-primary text-sm"
                >
                  {reportSubmitted ? "Update Report" : "Submit Report"}
                </button>
              </div>
            </div>

            {/* Daily report is optional and no longer affects attendance status */}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Notification Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Browser Notifications
                </h3>
                <p className="text-xs text-gray-500">
                  Get reminders for attendance and checkout times
                </p>
              </div>
              <button
                onClick={requestNotificationPermission}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  notificationsEnabled
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {notificationsEnabled ? "Enabled" : "Enable"}
              </button>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Reminder Schedule
              </h4>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center justify-between">
                  <span>⏰ Late Warning</span>
                  <span>9:50 AM (10 min before late)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🏃‍♂️ Checkout Reminder</span>
                  <span>4:50 PM (10 min before auto-checkout)</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span>🕐 Current Time</span>
                    <span className="font-medium">
                      {getCurrentTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span>📅 Next Reminder</span>
                    <span className="font-medium text-blue-600">
                      {getNextReminderInfo()}
                    </span>
                  </div>
                </div>
              </div>

              {notificationsEnabled && (
                <div className="mt-3">
                  <button
                    onClick={() =>
                      sendNotification(
                        "🧪 Test Notification",
                        "Notifications are working correctly!"
                      )
                    }
                    className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
                  >
                    Test Notification
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-3 sm:space-y-0">
            <button
              onClick={() => window.location.assign("/tasks")}
              className="btn-primary"
            >
              Create Task
            </button>
            <button
              onClick={() => window.location.assign("/attendance")}
              className="btn-secondary"
            >
              Attendance
            </button>
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Tasks
        </h2>

        {pendingTasks.length > 0 ? (
          <div className="space-y-3">
            {pendingTasks.slice(0, 5).map((task) => (
              <div
                key={task._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{task.title}</h3>
                  <p className="text-sm text-gray-500">
                    Due: {new Date(task.deadline).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.priority === "high"
                      ? "bg-red-100 text-red-800"
                      : task.priority === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No pending tasks</p>
        )}
      </div>

      {/* Alert Popup */}
      {alert.show && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
          <div
            className={`rounded-lg shadow-lg p-4 ${
              alert.type === "success"
                ? "bg-green-50 border border-green-200"
                : alert.type === "error"
                ? "bg-red-50 border border-red-200"
                : "bg-blue-50 border border-blue-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {alert.type === "success" ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : alert.type === "error" ? (
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                ) : (
                  <Clock className="h-5 w-5 text-blue-600 mr-2" />
                )}
                <p
                  className={`text-sm font-medium ${
                    alert.type === "success"
                      ? "text-green-800"
                      : alert.type === "error"
                      ? "text-red-800"
                      : "text-blue-800"
                  }`}
                >
                  {alert.message}
                </p>
              </div>
              <button
                onClick={() =>
                  setAlert({ show: false, type: "info", message: "" })
                }
                className={`ml-2 ${
                  alert.type === "success"
                    ? "text-green-400 hover:text-green-600"
                    : alert.type === "error"
                    ? "text-red-400 hover:text-red-600"
                    : "text-blue-400 hover:text-blue-600"
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Task Report Modal */}
      <DailyTaskReportModal
        isOpen={showDailyReportModal}
        onClose={() => setShowDailyReportModal(false)}
        onReportSubmitted={() => {
          fetchTodayReport();
          setShowDailyReportModal(false);
        }}
      />
    </div>
  );
};

export default HomePage;
