import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { safeStorage } from "../utils/storage";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: [],
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      // Get token from safe storage
      const token = safeStorage.getItem("authToken");

      if (token) {
        // Prefer explicit environment URL; fall back to same-origin if available.
        const envUrl = (import.meta as any).env?.VITE_API_URL_2 as
          | string
          | undefined;
        const sameOrigin =
          typeof window !== "undefined" ? window.location.origin : undefined;
        const socketEndpoint = envUrl || sameOrigin;

        // Connection options
        const opts = {
          auth: {
            token: token,
            userId: user._id,
          },
          transports: ["websocket", "polling"],
        };

        // Initialize socket connection (use same-origin if no env var)
        const newSocket = socketEndpoint
          ? io(socketEndpoint, opts)
          : io(opts as any);

        // Connection event handlers
        newSocket.on("connect", () => {
          console.log("Connected to server:", newSocket.id);
          setIsConnected(true);

          // Join user's personal room
          newSocket.emit("join", user._id);

          // Join admin room if user is admin
          if (user.role === "admin") {
            newSocket.emit("join_admin");
          }
        });

        newSocket.on("disconnect", () => {
          console.log("Disconnected from server");
          setIsConnected(false);
        });

        newSocket.on("connect_error", (error: unknown) => {
          console.error("Connection error:", error);
          setIsConnected(false);
        });

        // Real-time event listeners
        newSocket.on("attendance_update", (data: any) => {
          console.log("Attendance update received:", data);
          // Show notification or update UI
          showNotification("Attendance Update", data.message);
        });

        newSocket.on("attendance_confirmed", (data: any) => {
          console.log("Attendance confirmed:", data);
          showNotification("Attendance", data.message);
        });

        newSocket.on("task_assigned", (data: any) => {
          console.log("Task assigned:", data);
          showNotification("New Task", data.message);
        });

        newSocket.on("task_updated", (data: any) => {
          console.log("Task updated:", data);
          showNotification("Task Update", data.message);
        });

        newSocket.on("task_deleted", (data: any) => {
          console.log("Task deleted:", data);
          showNotification("Task Deleted", data.message);
        });

        newSocket.on("task_created", (data: any) => {
          console.log("Task created:", data);
          showNotification("New Task Created", data.message);
        });

        newSocket.on("online_users", (users: string[]) => {
          setOnlineUsers(users);
        });

        setSocket(newSocket);

        // Cleanup on unmount
        return () => {
          newSocket.close();
          setSocket(null);
          setIsConnected(false);
        };
      }
    }
  }, [user]);

  // Simple notification function (you can replace with a proper toast library)
  const showNotification = (title: string, message: string) => {
    // Simple browser notification (if permission granted)
    if (Notification.permission === "granted") {
      new Notification(title, {
        body: message,
        icon: "/favicon.ico",
      });
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineUsers,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
