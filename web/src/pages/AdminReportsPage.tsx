import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Calendar,
  Users,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { dailyTaskReportAPI } from "../services/api.ts";

interface DailyReport {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    department?: string;
    position?: string;
  };
  date: string;
  summary: string;
  nextDayPlan: string;
  tasksCompleted: any[];
  tasksInProgress: any[];
  createdAt: string;
  updatedAt: string;
}

const AdminReportsPage: React.FC = () => {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedUser, setSelectedUser] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchReports();
  }, [selectedDate, selectedUser]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedDate) params.date = selectedDate;
      if (selectedUser) params.userId = selectedUser;

      const response = await dailyTaskReportAPI.getAdminReports(params);
      setReports(response.data);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      alert("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const response = await dailyTaskReportAPI.exportReports(selectedDate);

      // Create blob and download
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `daily-reports-${selectedDate}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export reports:", error);
      alert("Failed to export reports");
    } finally {
      setExportLoading(false);
    }
  };

  const filteredReports = reports.filter(
    (report) =>
      report.userId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.userId.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.userId.department &&
        report.userId.department
          .toLowerCase()
          .includes(searchTerm.toLowerCase()))
  );

  const getReportStatus = (report: DailyReport) => {
    if (report.summary && report.summary.trim()) {
      return { status: "submitted", color: "green", icon: CheckCircle };
    }
    return { status: "not-submitted", color: "red", icon: XCircle };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Reports</h1>
          <p className="text-gray-600">
            View and manage daily task reports from all employees
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="btn-secondary flex items-center"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exportLoading || reports.length === 0}
            className="btn-primary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportLoading ? "Exporting..." : "Export DOCX"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="h-4 w-4 inline mr-2" />
              User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Users</option>
              {Array.from(new Set(reports.map((r) => r.userId._id))).map(
                (userId) => {
                  const user = reports.find(
                    (r) => r.userId._id === userId
                  )?.userId;
                  return (
                    <option key={userId} value={userId}>
                      {user?.name} ({user?.email})
                    </option>
                  );
                }
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="h-4 w-4 inline mr-2" />
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name, email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Reports</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reports.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Submitted</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reports.filter((r) => r.summary && r.summary.trim()).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Not Submitted</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reports.filter((r) => !r.summary || !r.summary.trim()).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Unique Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(reports.map((r) => r.userId._id)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Daily Reports</h3>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">
              No reports found for the selected criteria
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredReports.map((report) => {
              const reportStatus = getReportStatus(report);
              const StatusIcon = reportStatus.icon;

              return (
                <div key={report._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            {report.userId.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {report.userId.email}
                          </p>
                          {report.userId.department && (
                            <p className="text-xs text-gray-400">
                              {report.userId.department} •{" "}
                              {report.userId.position}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <StatusIcon
                            className={`h-5 w-5 text-${reportStatus.color}-500`}
                          />
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium bg-${reportStatus.color}-100 text-${reportStatus.color}-800`}
                          >
                            {reportStatus.status === "submitted"
                              ? "Submitted"
                              : "Not Submitted"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Date
                          </p>
                          <p className="text-sm text-gray-900">
                            {formatDate(report.date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Tasks Completed
                          </p>
                          <p className="text-sm text-gray-900">
                            {report.tasksCompleted.length}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            Tasks In Progress
                          </p>
                          <p className="text-sm text-gray-900">
                            {report.tasksInProgress.length}
                          </p>
                        </div>
                      </div>

                      {report.summary && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-500 mb-1">
                            Summary
                          </p>
                          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                            {report.summary}
                          </p>
                        </div>
                      )}

                      {report.nextDayPlan && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-500 mb-1">
                            Pending Work
                          </p>
                          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                            {report.nextDayPlan}
                          </p>
                        </div>
                      )}

                      <div className="mt-3 flex items-center text-xs text-gray-400">
                        <Clock className="h-3 w-3 mr-1" />
                        Created: {formatTime(report.createdAt)}
                        {report.updatedAt !== report.createdAt && (
                          <span className="ml-4">
                            Updated: {formatTime(report.updatedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReportsPage;
