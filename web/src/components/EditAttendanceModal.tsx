import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { attendanceAPI } from "../services/api.ts";

interface EditAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: any;
  onUpdate: () => void;
}

const EditAttendanceModal: React.FC<EditAttendanceModalProps> = ({
  isOpen,
  onClose,
  attendance,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    checkIn: attendance?.checkIn
      ? new Date(attendance.checkIn).toTimeString().slice(0, 5)
      : "",
    checkOut: attendance?.checkOut
      ? new Date(attendance.checkOut).toTimeString().slice(0, 5)
      : "",
    status: attendance?.status || "present",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!attendance) return;

    try {
      setLoading(true);

      const updateData: any = {};

      if (formData.checkIn) {
        // Create a new date with the selected time on the attendance date
        const attendanceDate = new Date(attendance.date);
        const [hours, minutes] = formData.checkIn.split(":").map(Number);
        attendanceDate.setHours(hours, minutes, 0, 0);
        updateData.checkIn = attendanceDate.toISOString();
      }

      if (formData.checkOut) {
        // Create a new date with the selected time on the attendance date
        const attendanceDate = new Date(attendance.date);
        const [hours, minutes] = formData.checkOut.split(":").map(Number);
        attendanceDate.setHours(hours, minutes, 0, 0);
        updateData.checkOut = attendanceDate.toISOString();
      }

      if (formData.status) {
        updateData.status = formData.status;
      }

      await attendanceAPI.updateAttendance(attendance._id, updateData);

      alert("Attendance record updated successfully!");
      onUpdate();
      onClose();
    } catch (error: any) {
      alert(
        error.response?.data?.message || "Failed to update attendance record"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isOpen || !attendance) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-lg text-left overflow-hidden shadow-xl">
        <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Edit Attendance Record
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Employee:{" "}
              <span className="font-medium">
                {attendance.userId?.name || "Unknown"}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Date:{" "}
              <span className="font-medium">
                {new Date(attendance.date).toLocaleDateString()}
              </span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-in Time (9:00 AM - 5:00 PM)
              </label>
              <input
                type="time"
                name="checkIn"
                value={formData.checkIn}
                onChange={handleChange}
                min="09:00"
                max="17:00"
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only times between 9:00 AM and 5:00 PM are allowed
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-out Time (9:00 AM - 5:00 PM)
              </label>
              <input
                type="time"
                name="checkOut"
                value={formData.checkOut}
                onChange={handleChange}
                min="09:00"
                max="17:00"
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only times between 9:00 AM and 5:00 PM are allowed
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Updating..." : "Update"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditAttendanceModal;
