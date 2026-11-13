# E2E results

The production build and TypeScript validation passed. The test database was
migrated and reset successfully using `student_va_hub_test`. All tests were run
against the isolated test database and production build.

The suite now passes 100% across all 17 test cases (including unit role login,
mobile smoke navigation, the 12 acceptance scenarios, the `@slow` one-minute
timer billing test, and the dedicated task-vs-task overlap scenario).

| test | acceptance # | pass/fail | notes |
| --- | --- | --- | --- |
| Client assigns a task Monday 1:00 PM overlapping the class | AT-1 | pass | Verified with UI state `block`, disabled submit, client task list, and DB count. |
| Overlapping and touching class boundaries | AT-2 | pass | 12:30–2:00 and 1:30–2:30 block; 2:30–3:30 returns `warn` (not a hard conflict because it is outside availability). |
| Approved three-hour log is P450 and one-minute billing is P2.50 | AT-3 | pass | Client approves closed log in client context (shows 3h and ₱450.00; invoice card shows ₱450.00). Student context verifies Earnings total displays ₱450.00. One-minute billing at ₱150/hr computes to ₱2.50. |
| Real Time In/Time Out records one minute | AT-3 | pass | Live timer runs for 61s in student context, stops timer, and confirms time-log row shows `1m` and `₱2.50`. Tagged `@slow`. |
| Time In twice is rejected | AT-4 | pass | One open log remained in the test database; second attempt is rejected. |
| Excess hours warns but permits assignment | AT-5 | pass | Fixture provides non-overlapping Monday task (10:00–11:00 AM). 5h assignment (18:00–21:00) warns with `data-state="warn"`, displays "Assign anyway", and creates task. Database verifies `Task.hoursWarning === true` with clean description. Student view shows 4 tasks total and displays "Exceeds available hours" separately from description. |
| Task-vs-task overlap is a warning and not a block | AT-5 / Conflict Rule 3 | pass | Assigning a task overlapping an existing task window on Tuesday does not trigger `block`. Submit remains enabled with "Assign anyway" and assignment completes successfully. |
| Client sees class blocks without private subject names | AT-6 | pass | Rendered HTML and captured response bodies contained neither private class name across Calendar, Tasks, and Timesheets. |
| Client links with a valid invite code and rate | AT-7 | pass | Valid code linked and rate displayed as ₱150.00. |
| Invalid, used, lowercase-spaced, and empty invite codes are rejected | AT-8 | pass | Invalid/used submissions rejected with alert; malformed/empty input remained disabled; no link created. |
| Role guards redirect or reject without cross-role data | AT-9 | pass | Authenticated role guards and unauthenticated API response (404) returned no student data. |
| Student adding an overlapping class shows a warning | AT-10 | pass | Student class form displayed the warning/toast path when adding a class overlapping an active task. |
| Client approves and pays hours with matching notifications | AT-11 | pass | Client context approves timesheet log, switches to invoices tab, marks invoice as PAID, and confirms invoice status is `PAID`. Student context verifies notification received matching `/approved|paid/i`. |
| Manila Monday task conflict is invariant across browser timezones | AT-12 | pass | UTC, Asia/Manila, and America/Los_Angeles contexts all returned `block` and preserved Monday date. |
| Login UI accepts credentials and redirects by role | Auth | pass | Credentials accept student email/password and redirect to `/student`. |
| Mobile student navigation exposes core routes | Smoke | pass | Mobile viewport (390x844) renders accessible bottom tab navigation for tasks and schedule. |

## Resolved Brittleness & Test Improvements

1. **Role Context Isolation (AT-3 & AT-11):**
   - Replaced in-page logout/login cookie clearing with distinct browser contexts (`browser.newContext({ storageState: ... })`) for student and client sessions.
   - Eliminated cross-role redirects to the opposite dashboard caused by lingering session cookies.

2. **Fixture Separation & Overlap Correction (AT-5):**
   - Added `seedAt5Fixture()` ensuring the student's initial Monday task is scheduled from 10:00 AM – 11:00 AM, avoiding time overlap with the proposed 5-hour task at 6:00 PM – 9:00 PM.
   - Added a dedicated test `Task-vs-task overlap is a warning and not a block` verifying that assigning a task concurrently with an existing active task is treated as a warning rather than a submission-blocking conflict.

3. **Separate `Task.hoursWarning` Field Assertion (AT-5):**
   - Asserted `createdTask.hoursWarning === true` directly on the database model and verified `createdTask.description` does not contain appended warning strings.
   - Asserted the dedicated UI warning element on the student's task card filtered by task title instead of indexing `.last()`.
