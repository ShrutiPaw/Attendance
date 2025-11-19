import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { taskAPI } from "../services/api.ts";
import { Task } from "../types/index.ts";
import { useAuth } from "./AuthContext.tsx";

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  createTask: (taskData: any) => Promise<void>;
  updateTask: (taskId: string, updates: any) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addComment: (taskId: string, comment: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  getTaskById: (taskId: string) => Task | undefined;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function useTask() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error("useTask must be used within a TaskProvider");
  }
  return context;
}

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Only fetch tasks if user is authenticated
    if (user) {
      refreshTasks();
    }
  }, [user]);

  const refreshTasks = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getTasks();
      setTasks(response.data);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData: any) => {
    try {
      console.log("=== CREATING TASK ===");
      console.log("Task data being sent:", taskData);

      const response = await taskAPI.createTask(taskData);
      const newTask = response.data;

      console.log("Task created successfully:", newTask);
      console.log("Task assignedTo:", newTask.assignedTo);
      console.log("Task assignedBy:", newTask.assignedBy);

      setTasks((prev) => [newTask, ...prev]);
      console.log("=== TASK CREATION COMPLETE ===");
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  };

  const updateTask = async (taskId: string, updates: any) => {
    try {
      const response = await taskAPI.updateTask(taskId, updates);
      const updatedTask = response.data;

      setTasks((prev) =>
        prev.map((task) => (task._id === taskId ? updatedTask : task))
      );
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await taskAPI.deleteTask(taskId);
      setTasks((prev) => prev.filter((task) => task._id !== taskId));
    } catch (error) {
      console.error("Failed to delete task:", error);
      throw error;
    }
  };

  const addComment = async (taskId: string, comment: string) => {
    try {
      await taskAPI.addComment(taskId, comment);
      // Refresh the specific task to get updated comments
      await refreshTasks();
    } catch (error) {
      console.error("Failed to add comment:", error);
      throw error;
    }
  };

  const getTaskById = (taskId: string): Task | undefined => {
    return tasks.find((task) => task._id === taskId);
  };

  const value: TaskContextType = {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    refreshTasks,
    getTaskById,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
