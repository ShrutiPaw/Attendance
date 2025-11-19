export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  department?: string;
  position?: string;
  isActive: boolean;
  pushToken?: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  assignedTo: User;
  assignedBy: User;
  deadline: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "inprogress" | "completed";
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface Attendance {
  _id: string;
  userId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: "present" | "late" | "absent" | "half_day";
  location?: {
    latitude: number;
    longitude: number;
  };
  isLate?: boolean;
}

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  body: string;
  data?: any;
  isRead: boolean;
  type: "task_assignment" | "deadline_reminder" | "system";
  createdAt: string;
}

export interface OfficeLocation {
  _id: string;
  latitude: number;
  longitude: number;
  radius: number;
  address: string;
  isActive: boolean;
}

export interface Holiday {
  _id: string;
  name: string;
  date: string;
  type: "fixed" | "recurring";
  isActive: boolean;
}

export interface DailyTaskReport {
  _id: string;
  userId: string;
  date: string;
  tasksCompleted: string[];
  tasksInProgress: string[];
  summary: string;
  challenges: string;
  nextDayPlan: string;
  createdAt: string;
  updatedAt: string;
}
