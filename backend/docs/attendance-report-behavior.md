# Attendance & Daily Report Behavior — Change Log

Date: 2025-10-28

## Summary

This document describes a change to how attendance and daily task reports interact.

## Goal

- Remove the dependency where attendance status (half_day/full day) was automatically
  determined by whether a daily task report was submitted.
- When a user checks in, mark attendance and set the check-out time to 5:00 PM IST
  immediately so we don't rely on background cron jobs to auto-checkout.

## Files changed

- `routes/attendance.js` — adjusted logic in `/mark` and `/checkout` endpoints.

## BEFORE (previous behavior)

- User clicks "Check-in": the system recorded a `checkIn` timestamp and `status`
  ("present" or "late"). The system did not set an automatic `checkOut`.
- If the user later checked out (either via the UI or via a scheduled auto-checkout),
  the server checked for a `DailyTaskReport` for that user for the day. If no report
  existed, attendance `status` was set to `half_day`. After the user submitted the
  daily report, some parts of the system treated the day as full.
- A scheduled cron job (`services/attendanceScheduler.js`) ran at 17:00 IST to auto
  check-out users who had not checked out manually. That cron job remained responsible
  for finalizing check-out times and working hours.

LIMITATIONS / PROBLEMS:

- Reliance on daily report for attendance status caused UX issues where users
  who legitimately worked and forgot to submit a report were marked `half_day`.
- The system required scheduled jobs to finalize attendance which added complexity.

## AFTER (new behavior)

- User clicks "Check-in":
  - The server records `checkIn` and `status` ("present" or "late") as before.
  - The server now sets `checkOut` to 17:00 IST on the same day immediately at check-in.
    This ensures the attendance record shows the intended end-of-day time without
    needing a cron job to fill it in.
- When a user checks out manually (or if the UI uses the `/mark` route to toggle),
  the server will record the actual `checkOut` timestamp but will NOT change the
  attendance `status` based on the presence or absence of a `DailyTaskReport`.
  The report feature is left intact (reports are still recorded), but they no longer
  influence automatic `half_day` status.
- The scheduled auto-checkout (`attendanceScheduler`) has been removed/disabled.
  The codebase provides a no-op compatibility interface so any remaining imports
  won't break, but no cron jobs are started by the server.

## IMPLEMENTATION NOTES

- `routes/attendance.js`:
  - Removed checks that set `existingAttendance.status = 'half_day'` when no `DailyTaskReport` was present during check-out.
  - When creating/updating attendance on check-in, set `attendance.checkOut` to 17:00 IST using the user's timezone if available (fallback to server local 17:00).

## BACKWARD COMPATIBILITY

- The `DailyTaskReport` model and endpoints are unchanged. Users can still
  create/update/delete reports. Reports will not be used to toggle attendance
  status automatically after this change.

## HOW TO TEST

1. Start the backend server.
2. From the frontend or via API, call POST `/api/attendance/mark` between 9:00-17:00 IST.
   - Verify the returned attendance object contains `checkIn` (now) and `checkOut` set to 17:00 IST.
   - Verify `status` is `present` or `late` depending on check-in time.
3. Call POST `/api/attendance/checkout` (if UI triggers it): verify that the server
   records the `checkOut` timestamp and DOES NOT change `status` to `half_day` if no report exists.
4. Create a `DailyTaskReport` for the user; verify that report creation still works and does not alter attendance.

## REVERSING THE CHANGE

To restore previous behavior, reintroduce logic in `routes/attendance.js` to set
`status = 'half_day'` on check-out when a `DailyTaskReport` is missing, and/or
use the scheduler to modify records at 17:00.

## Contact

If anything here is unclear or you want the scheduler removed as well, tell me and
I can update the code and tests accordingly.
