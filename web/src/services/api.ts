import axios from "axios";
import { safeStorage } from "../utils/storage";

// Use the same backend URL as the mobile app
// Prefer environment variable (set on Vercel). If not present, fall back to same-origin '/api'
const BASE_URL =
  (import.meta as any).env.VITE_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.origin}/api`
    : "http://localhost:3000/api");

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config: any) => {
    try {
      const token = safeStorage.getItem("authToken");
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Error getting token
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    if (error.response?.status === 401) {
      safeStorage.removeItem("authToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post("/auth/login", credentials),

  getProfile: () => api.get("/auth/profile"),

  logout: () => api.post("/auth/logout"),

  createUser: (userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    department?: string;
    position?: string;
  }) => api.post("/auth/users", userData),

  getAllUsers: () => api.get("/auth/users"),

  deleteUser: (userId: string) => api.delete(`/auth/users/${userId}`),

  updatePushToken: (token: string) => api.post("/auth/push-token", { token }),
};

// Attendance API
export const attendanceAPI = {
  markAttendance: (data: any) => api.post("/attendance/mark", data),
  checkout: () => api.post("/attendance/checkout"),
  getTodayAttendance: () => api.get("/attendance/today"),
  getAllAttendance: (params?: any) => api.get("/attendance/all", { params }),
  getStats: () => api.get("/attendance/stats"),
  updateAttendance: (id: string, data: any) =>
    api.put(`/attendance/${id}`, data),
  getAttendanceHistory: (params?: any) =>
    api.get("/attendance/history", { params }),
  triggerAutoCheckout: () =>
    api.post("/attendance/admin/trigger-auto-checkout"),
  getSchedulerStatus: () => api.get("/attendance/admin/scheduler-status"),
};

// Task API
export const taskAPI = {
  getTasks: () => api.get("/tasks"),

  getTaskById: (taskId: string) => api.get(`/tasks/${taskId}`),

  getTasksForUser: (userId: string) => api.get(`/tasks/user/${userId}`),

  getAllTasks: () => api.get("/tasks"),

  createTask: (taskData: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    assignedTo: string[];
    deadline: string;
  }) => api.post("/tasks", taskData),

  updateTask: (taskId: string, updates: any) =>
    api.put(`/tasks/${taskId}`, updates),

  deleteTask: (taskId: string) => api.delete(`/tasks/${taskId}`),

  addComment: (taskId: string, comment: string) =>
    api.post(`/tasks/${taskId}/comments`, { text: comment }),

  getComments: (taskId: string) => api.get(`/tasks/${taskId}/comments`),

  deleteComment: (taskId: string, commentId: string) =>
    api.delete(`/tasks/${taskId}/comments/${commentId}`),
};

// Location API
export const locationAPI = {
  getOfficeLocation: () => api.get("/location"),

  setOfficeLocation: (location: any) => api.post("/location", location),
};

// Holiday API
export const holidayAPI = {
  getHolidays: () => api.get("/holidays"),

  createHoliday: (holidayData: {
    name: string;
    date: string;
    type: "fixed" | "recurring";
  }) => api.post("/holidays", holidayData),

  deleteHoliday: (holidayId: string) => api.delete(`/holidays/${holidayId}`),

  checkHoliday: (date: string) => api.get(`/holidays/check/${date}`),
};

// Notification API
export const notificationAPI = {
  sendNotification: (notificationData: {
    userId: string;
    title: string;
    body: string;
    data?: any;
  }) => api.post("/notifications/send", notificationData),

  getUserNotifications: () => api.get("/notifications/user"),

  markAsRead: (notificationId: string) =>
    api.put(`/notifications/${notificationId}/read`),

  clearAllUserNotifications: () => api.delete("/notifications/user"),
};

// Daily Task Report API
export const dailyTaskReportAPI = {
  createReport: (reportData: {
    tasksCompleted: string[];
    tasksInProgress: string[];
    summary: string;
    challenges: string;
    nextDayPlan: string;
  }) => api.post("/daily-reports", reportData),

  getTodayReport: () => api.get("/daily-reports/today"),

  getReports: (params?: any) => api.get("/daily-reports", { params }),

  updateReport: (reportId: string, updates: any) =>
    api.put(`/daily-reports/${reportId}`, updates),

  deleteReport: (reportId: string) => api.delete(`/daily-reports/${reportId}`),

  // Admin functions
  getAdminReports: (params?: any) =>
    api.get("/daily-reports/admin", { params }),

  exportReports: (date?: string) => {
    const params = date ? { date } : {};
    return api.get("/daily-reports/export", {
      params,
      responseType: "blob", // Important for file downloads
    });
  },
};

export default api;
