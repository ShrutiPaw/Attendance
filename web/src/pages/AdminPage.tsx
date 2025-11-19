import React, { useState, useEffect } from "react";
import {
  Users,
  MapPin,
  Calendar,
  Settings,
  Plus,
  Trash2,
  BarChart3,
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.tsx";
import { useTask } from "../contexts/TaskContext.tsx";
import {
  authAPI,
  locationAPI,
  holidayAPI,
  attendanceAPI,
} from "../services/api.ts";
import { User, OfficeLocation, Holiday } from "../types/index.ts";
import GanttChart from "../components/GanttChart.tsx";
import EditAttendanceModal from "../components/EditAttendanceModal.tsx";
import AddUserModal from "../components/AddUserModal.tsx";
import AddHolidayModal from "../components/AddHolidayModal.tsx";
import LocationModal from "../components/LocationModal.tsx";

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const { tasks } = useTask();
  const [activeTab, setActiveTab] = useState<
    "users" | "tasks" | "attendance" | "location" | "holidays" | "reports"
  >("users");
  const [users, setUsers] = useState<User[]>([]);
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation | null>(
    null
  );
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    attendance: any;
  }>({ isOpen: false, attendance: null });
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "attendance" && user?.role === "admin") {
      fetchAttendanceReports();
    }
  }, [dateRange, selectedUser, activeTab, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        usersResponse,
        locationResponse,
        holidaysResponse,
        todayAttendanceResponse,
      ] = await Promise.all([
        authAPI.getAllUsers(),
        locationAPI.getOfficeLocation(),
        holidayAPI.getHolidays(),
        fetchTodayAttendanceForAllUsers(),
      ]);

      setUsers(usersResponse.data);
      setOfficeLocation(locationResponse.data);
      setHolidays(holidaysResponse.data);
      setTodayAttendance(todayAttendanceResponse);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendanceForAllUsers = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await attendanceAPI.getAllAttendance({
        date: today,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch today's attendance:", error);
      return [];
    }
  };

  const fetchAttendanceReports = async () => {
    try {
      const params: any = {
        start: dateRange.startDate,
        end: dateRange.endDate,
      };

      if (selectedUser) {
        params.userId = selectedUser;
      }

      const response = await attendanceAPI.getAllAttendance(params);
      const attendanceRecords = response.data;

      setAttendanceData(attendanceRecords);
      calculateAttendanceStats(attendanceRecords);
    } catch (error) {
      console.error("Failed to fetch attendance reports:", error);
    }
  };

  const calculateAttendanceStats = (data: any[]) => {
    const totalWorkingHours = data.reduce((total, item) => {
      if (item.checkIn && item.checkOut) {
        const inTime = new Date(item.checkIn);
        const outTime = new Date(item.checkOut);
        const diffMs = outTime.getTime() - inTime.getTime();
        if (diffMs > 0) {
          return total + diffMs / (1000 * 60 * 60); // Convert to hours
        }
      }
      return total;
    }, 0);

    const stats = {
      totalPresent: data.filter((item) => item.status === "present").length,
      totalLate: data.filter((item) => item.status === "late").length,
      totalAbsent: data.filter((item) => item.status === "absent").length,
      totalDays: data.length,
      totalWorkingHours: totalWorkingHours,
    };
    setAttendanceStats(stats);
  };

  const handleTriggerAutoCheckout = async () => {
    try {
      await attendanceAPI.triggerAutoCheckout();
      alert(
        "Auto check-out triggered successfully! Check the attendance records."
      );
      // Refresh attendance data
      fetchAttendanceReports();
    } catch (error) {
      console.error("Failed to trigger auto check-out:", error);
      alert("Failed to trigger auto check-out. Please try again.");
    }
  };

  const getUserAttendanceStatus = (userId: string) => {
    const userAttendance = todayAttendance.find(
      (attendance) =>
        attendance.userId._id === userId || attendance.userId === userId
    );

    if (!userAttendance) {
      return { status: "absent", checkIn: null, checkOut: null };
    }

    return {
      status: userAttendance.status,
      checkIn: userAttendance.checkIn,
      checkOut: userAttendance.checkOut,
    };
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await authAPI.deleteUser(userId);
        setUsers(users.filter((u) => u._id !== userId));
      } catch (error) {
        console.error("Failed to delete user:", error);
      }
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    if (window.confirm("Are you sure you want to delete this holiday?")) {
      try {
        await holidayAPI.deleteHoliday(holidayId);
        setHolidays(holidays.filter((h) => h._id !== holidayId));
      } catch (error) {
        console.error("Failed to delete holiday:", error);
      }
    }
  };

  const handleAddUser = async (userData: any) => {
    try {
      const response = await authAPI.createUser(userData);
      setUsers([...users, response.data]);
      setShowAddUserModal(false);
    } catch (error: any) {
      console.error("Failed to create user:", error);
      alert(error.response?.data?.message || "Failed to create user");
    }
  };

  const handleAddHoliday = async (holidayData: any) => {
    try {
      const response = await holidayAPI.createHoliday(holidayData);
      setHolidays([...holidays, response.data]);
      setShowAddHolidayModal(false);
    } catch (error: any) {
      console.error("Failed to create holiday:", error);
      alert(error.response?.data?.message || "Failed to create holiday");
    }
  };

  const handleUpdateLocation = async (locationData: any) => {
    try {
      await locationAPI.setOfficeLocation(locationData);
      setOfficeLocation(locationData);
      setShowLocationModal(false);
      alert("Office location updated successfully!");
    } catch (error: any) {
      console.error("Failed to update location:", error);
      alert(error.response?.data?.message || "Failed to update location");
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-12">
        <Settings className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Access Denied
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Manage users, settings, and system configuration
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("users")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "users"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Users
          </button>

          <button
            onClick={() => setActiveTab("tasks")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "tasks"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Task Timeline
          </button>

          <button
            onClick={() => {
              setActiveTab("attendance");
              fetchAttendanceReports();
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "attendance"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ClipboardList className="h-4 w-4 inline mr-2" />
            Attendance Reports
          </button>

          <button
            onClick={() => setActiveTab("location")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "location"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <MapPin className="h-4 w-4 inline mr-2" />
            Office Location
          </button>

          <button
            onClick={() => setActiveTab("holidays")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "holidays"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            Holidays
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "reports"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Daily Reports
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Users Management
            </h2>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Today's Attendance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const attendanceStatus = getUserAttendanceStatus(
                          user._id
                        );
                        return (
                          <div className="flex flex-col">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium inline-block w-fit ${
                                attendanceStatus.status === "present"
                                  ? "bg-green-100 text-green-800"
                                  : attendanceStatus.status === "late"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : attendanceStatus.status === "half_day"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {attendanceStatus.status === "present"
                                ? "Present"
                                : attendanceStatus.status === "late"
                                ? "Late"
                                : attendanceStatus.status === "half_day"
                                ? "Half Day"
                                : "Absent"}
                            </span>
                            {attendanceStatus.checkIn && (
                              <span className="text-xs text-gray-500 mt-1">
                                In:{" "}
                                {new Date(
                                  attendanceStatus.checkIn
                                ).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <div className="space-y-6">
          <GanttChart tasks={tasks} />

          {/* Task Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Total Tasks
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {tasks.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {tasks.filter((t) => t.status === "completed").length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    In Progress
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {tasks.filter((t) => t.status === "inprogress").length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Overdue</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {
                      tasks.filter((t) => {
                        const daysLeft = Math.ceil(
                          (new Date(t.deadline).getTime() -
                            new Date().getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                        return daysLeft < 0 && t.status !== "completed";
                      }).length
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Reports Tab */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Attendance Reports
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employee
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Employees</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, endDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex space-x-3">
              <button onClick={fetchAttendanceReports} className="btn-primary">
                Generate Report
              </button>
              <button
                onClick={handleTriggerAutoCheckout}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Trigger Auto Check-out
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          {attendanceStats && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Present</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {attendanceStats.totalPresent}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Late</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {attendanceStats.totalLate}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Absent</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {attendanceStats.totalAbsent}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">
                      Total Days
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {attendanceStats.totalDays}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">
                      Work Hours
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {attendanceStats.totalWorkingHours.toFixed(1)}h
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Records Table */}
          {attendanceData.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Attendance Records
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check Out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Working Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceData.map((record, index) => (
                      <tr
                        key={record._id || index}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {record.userId?.name?.charAt(0).toUpperCase() ||
                                  "?"}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {record.userId?.name || "Unknown"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {record.userId?.email || ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.checkIn
                            ? new Date(record.checkIn).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.checkOut
                            ? new Date(record.checkOut).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.workingHours
                            ? `${record.workingHours.toFixed(1)}h`
                            : "0h"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.status === "present"
                                ? "bg-green-100 text-green-800"
                                : record.status === "late"
                                ? "bg-yellow-100 text-yellow-800"
                                : record.status === "half_day"
                                ? "bg-orange-100 text-orange-800"
                                : record.status === "absent"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {record.status === "half_day"
                              ? "Half Day"
                              : record.status?.charAt(0).toUpperCase() +
                                  record.status?.slice(1) || "Unknown"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.source === "web"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {record.source === "web" ? "Web" : "Mobile"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {record._id &&
                          record._id.match(/^[0-9a-fA-F]{24}$/) ? (
                            <button
                              onClick={() =>
                                setEditModal({
                                  isOpen: true,
                                  attendance: record,
                                })
                              }
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              Auto-generated
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Location Tab */}
      {activeTab === "location" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Office Location Settings
          </h2>

          {officeLocation ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Latitude
                </label>
                <p className="text-gray-900">{officeLocation.latitude}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Longitude
                </label>
                <p className="text-gray-900">{officeLocation.longitude}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Radius (meters)
                </label>
                <p className="text-gray-900">{officeLocation.radius}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <p className="text-gray-900">
                  {officeLocation.address || "Not specified"}
                </p>
              </div>

              <button
                onClick={() => setShowLocationModal(true)}
                className="btn-primary"
              >
                Update Location
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No office location set
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Configure the office location for attendance tracking.
              </p>
              <button
                onClick={() => setShowLocationModal(true)}
                className="mt-4 btn-primary"
              >
                Set Location
              </button>
            </div>
          )}
        </div>
      )}

      {/* Holidays Tab */}
      {activeTab === "holidays" && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Holidays Management
            </h2>
            <button
              onClick={() => setShowAddHolidayModal(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Holiday
            </button>
          </div>

          {holidays.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {holidays.map((holiday) => (
                    <tr key={holiday._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {holiday.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(holiday.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            holiday.type === "fixed"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {holiday.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDeleteHoliday(holiday._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No holidays configured
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Add holidays to help manage attendance tracking.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Daily Reports Management
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              View and manage daily task reports from all employees
            </p>
          </div>
          <div className="p-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Daily Reports
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Use the dedicated reports page for better functionality
              </p>
              <div className="mt-6">
                <a
                  href="/admin/reports"
                  className="btn-primary inline-flex items-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Go to Reports Page
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attendance Modal */}
      <EditAttendanceModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, attendance: null })}
        attendance={editModal.attendance}
        onUpdate={fetchAttendanceReports}
      />

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onSubmit={handleAddUser}
      />

      {/* Add Holiday Modal */}
      <AddHolidayModal
        isOpen={showAddHolidayModal}
        onClose={() => setShowAddHolidayModal(false)}
        onSubmit={handleAddHoliday}
      />

      {/* Location Modal */}
      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSubmit={handleUpdateLocation}
        currentLocation={officeLocation}
      />
    </div>
  );
};

export default AdminPage;
