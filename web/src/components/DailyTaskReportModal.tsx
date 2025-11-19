import React, { useState, useEffect } from "react";
import { X, FileText, Clock } from "lucide-react";
import { dailyTaskReportAPI } from "../services/api.ts";
import { DailyTaskReport } from "../types/index.ts";

interface DailyTaskReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted: () => void;
}

const DailyTaskReportModal: React.FC<DailyTaskReportModalProps> = ({
  isOpen,
  onClose,
  onReportSubmitted,
}) => {
  const [loading, setLoading] = useState(false);
  const [existingReport, setExistingReport] = useState<DailyTaskReport | null>(
    null
  );
  const [formData, setFormData] = useState({
    summary: "",
    nextDayPlan: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchTodayReport();
    }
  }, [isOpen]);

  const fetchTodayReport = async () => {
    try {
      const response = await dailyTaskReportAPI.getTodayReport();
      if (response.data) {
        setExistingReport(response.data);
        setFormData({
          summary: response.data.summary || "",
          nextDayPlan: response.data.nextDayPlan || "",
        });
      }
    } catch (error) {
      // No existing report for today
      setExistingReport(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.summary.trim()) {
      alert("Please provide a summary of your work today.");
      return;
    }

    try {
      setLoading(true);

      const reportData = {
        tasksCompleted: [],
        tasksInProgress: [],
        summary: formData.summary,
        challenges: "",
        nextDayPlan: formData.nextDayPlan,
      };

      if (existingReport) {
        await dailyTaskReportAPI.updateReport(existingReport._id, reportData);
      } else {
        await dailyTaskReportAPI.createReport(reportData);
      }

      onReportSubmitted();
      onClose();
    } catch (error: any) {
      console.error("Failed to submit daily report:", error);
      alert(error.response?.data?.message || "Failed to submit daily report");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Daily Task Report
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Today's Work */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4 inline mr-2" />
              Today's Work *
            </label>
            <textarea
              value={formData.summary}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, summary: e.target.value }))
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what you accomplished today..."
              required
            />
          </div>

          {/* Pending Work */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-2" />
              Pending Work
            </label>
            <textarea
              value={formData.nextDayPlan}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  nextDayPlan: e.target.value,
                }))
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what work is pending or needs to be done..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? "Submitting..."
                : existingReport
                ? "Update Report"
                : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DailyTaskReportModal;
