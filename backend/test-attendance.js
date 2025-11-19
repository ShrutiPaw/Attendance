const mongoose = require("mongoose");
const User = require("./models/User");
const Attendance = require("./models/Attendance");
const DailyTaskReport = require("./models/DailyTaskReport");

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/employee-attendance")
  .then(async () => {
    console.log("Connected to MongoDB");

    try {
      // Test 1: Check if we can find users
      console.log("\n=== Test 1: Finding Users ===");
      const users = await User.find({}, "name email role");
      console.log("Users found:", users.length);
      users.forEach((user) =>
        console.log(`- ${user.name} (${user.email}) - ${user.role}`)
      );

      // Test 2: Check today's attendance records
      console.log("\n=== Test 2: Today's Attendance Records ===");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfDay = new Date(today);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const attendances = await Attendance.find({
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      }).populate("userId", "name email");

      console.log("Attendance records for today:", attendances.length);
      attendances.forEach((att) => {
        console.log(
          `- ${att.userId?.name}: ${att.status} (Check-in: ${
            att.checkIn ? "Yes" : "No"
          }, Check-out: ${att.checkOut ? "Yes" : "No"})`
        );
      });

      // Test 3: Check today's daily reports
      console.log("\n=== Test 3: Today's Daily Reports ===");
      const reports = await DailyTaskReport.find({
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      }).populate("userId", "name email");

      console.log("Daily reports for today:", reports.length);
      reports.forEach((report) => {
        console.log(
          `- ${report.userId?.name}: ${
            report.summary ? "Has summary" : "No summary"
          }`
        );
      });

      // Test 4: Test the date range query logic
      console.log("\n=== Test 4: Date Range Query Test ===");
      console.log("Start of day:", startOfDay);
      console.log("End of day:", endOfDay);

      // Test 5: Check if we can create a test attendance record
      if (users.length > 0) {
        console.log("\n=== Test 5: Creating Test Attendance Record ===");
        const testUser = users[0];

        // Check if attendance already exists for this user today
        const existingAttendance = await Attendance.findOne({
          userId: testUser._id,
          date: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        });

        if (existingAttendance) {
          console.log(`Attendance already exists for ${testUser.name} today`);
        } else {
          console.log(
            `No attendance found for ${testUser.name} today - this is normal`
          );
        }
      }
    } catch (error) {
      console.error("Test error:", error);
    } finally {
      mongoose.connection.close();
      console.log("\n=== Test Complete ===");
    }
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
