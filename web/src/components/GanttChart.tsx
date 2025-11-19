import React from "react";
import { Task } from "../types/index.ts";

interface GanttChartProps {
  tasks: Task[];
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "#EF4444"; // red-500
      case "medium":
        return "#F59E0B"; // amber-500
      case "low":
        return "#10B981"; // emerald-500
      default:
        return "#6B7280"; // gray-500
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10B981"; // emerald-500
      case "inprogress":
        return "#3B82F6"; // blue-500
      case "todo":
        return "#F59E0B"; // amber-500
      default:
        return "#6B7280"; // gray-500
    }
  };

  const getDaysFromNow = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const sortedTasks = tasks.sort((a, b) => {
    const priorityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
  });

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Task Timeline (Priority View)
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No tasks available to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Task Timeline (Priority View)
      </h3>
      
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 pb-2 mb-4 border-b border-gray-200 text-sm font-medium text-gray-500">
            <div className="col-span-3">Task</div>
            <div className="col-span-2">Assignee</div>
            <div className="col-span-4">Timeline</div>
            <div className="col-span-2">Due Date</div>
            <div className="col-span-1">Priority</div>
          </div>

          {/* Task Rows */}
          <div className="space-y-3">
            {sortedTasks.map((task, index) => {
              const daysLeft = getDaysFromNow(task.deadline);
              const isOverdue = daysLeft < 0;
              const barWidth = Math.max(60, Math.abs(daysLeft) * 8);

              return (
                <div
                  key={task._id || index}
                  className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100 hover:bg-gray-50"
                >
                  {/* Task Info */}
                  <div className="col-span-3">
                    <h4 className="font-medium text-gray-900 text-sm truncate">
                      {task.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {task.description?.substring(0, 50)}
                      {task.description && task.description.length > 50 ? "..." : ""}
                    </p>
                  </div>

                  {/* Assignee */}
                  <div className="col-span-2">
                    <span className="text-sm text-gray-600">
                      {task.assignedTo?.name || "Unassigned"}
                    </span>
                  </div>

                  {/* Timeline Bar */}
                  <div className="col-span-4 flex items-center">
                    <div className="relative flex items-center">
                      <div
                        className="h-5 rounded-full flex items-center px-2"
                        style={{
                          backgroundColor: getPriorityColor(task.priority),
                          opacity: task.status === "completed" ? 0.6 : 1,
                          width: `${barWidth}px`,
                          minWidth: "60px",
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full mr-1"
                          style={{ backgroundColor: getStatusColor(task.status) }}
                        />
                      </div>
                      <span
                        className={`ml-2 text-xs font-medium ${
                          isOverdue ? "text-red-600" : "text-gray-600"
                        }`}
                      >
                        {isOverdue
                          ? `${Math.abs(daysLeft)}d overdue`
                          : `${daysLeft}d left`}
                      </span>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="col-span-2">
                    <span className="text-sm text-gray-600">
                      {new Date(task.deadline).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Priority Badge */}
                  <div className="col-span-1">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-bold uppercase"
                      style={{
                        color: getPriorityColor(task.priority),
                        backgroundColor: `${getPriorityColor(task.priority)}20`,
                      }}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Status:</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>To Do</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Completed</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Priority:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>Low</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
