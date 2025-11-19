// Scheduler removed — provide a no-op interface so any remaining imports don't break.
module.exports = {
  triggerAutoCheckOut: async () => {
    // No-op: scheduler disabled
    return;
  },
  getStatus: () => ({
    autoCheckOutScheduled: false,
    reminderScheduled: false,
    timezone: "Asia/Kolkata",
    autoCheckOutTime: "17:00",
    reminderTime: "16:45",
  }),
};
