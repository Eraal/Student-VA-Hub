# VAwise — Test IDs Reference

This document catalogs the `data-testid` attributes used across the application for reliable end-to-end and component testing.

---

## Schedule Page: Classes Tab Test IDs

The Schedule page (`/student/schedule`) exposes the following `data-testid` attributes on the Classes tab:

| Attribute | Elements | Purpose | Notes / Extra Attributes |
| :--- | :--- | :--- | :--- |
| `schedule-add-class` | Header button, Empty state button, Mobile floating button | Opens the Add Class dialog | Triggered from multiple prominent access points |
| `schedule-view-toggle` | Top-right view switch container | Toggles between "Week" grid and "List" view | Used to switch timetable presentation |
| `schedule-class-block` | Every scheduled class block rendered inside the Week grid | Opens class details dialog with Edit/Delete options | Includes attributes: `data-day="{dayOfWeek}"` (0-6) and `data-start="{startTime}"` (e.g. `9:00 AM`) |
| `schedule-day-column` | Day column headers in the Week grid | Identifies each weekday/weekend column | Renders 5 columns (Mon-Fri) or 7 columns when weekend is toggled |
| `schedule-class-edit` | Edit button in Class Details modal & List view class rows | Opens the Class Form dialog prefilled with class data | Tap target >= 40px with accessible label |
| `schedule-class-delete` | Delete button in Class Details modal & List view class rows | Opens the Delete Confirmation dialog | Neutral muted color, turns red on hover/focus |
| `schedule-delete-confirm` | Red confirm button inside Delete Confirmation modal | Confirms deletion and fires delete action | Styled with destructive red tokens |

---

## Schedule Page: Availability Tab Test IDs

The Availability tab exposes the following `data-testid` attributes for capacity, free windows, and blocked dates:

| Attribute | Elements | Purpose | Notes / Extra Attributes |
| :--- | :--- | :--- | :--- |
| `availability-add-window` | Header button, Empty state button, Mobile floating button | Opens the Add Free Window dialog | Primary action button on the Availability tab |
| `availability-limit-stepper` | Stepper container on Daily hour limit card | Adjusts daily hour limit (1 to 12 hours) | Contains accessible Minus and Plus buttons |
| `availability-limit-save` | Save button on Daily hour limit card | Persists updated daily hour limit | Disabled until value changes; shows loading state |
| `availability-limit-preset` | Preset buttons on Daily hour limit card | Quick presets for 2h, 3h, 4h, 5h, 6h | Includes `data-hours="{number}"` (e.g. `data-hours="4"`) |
| `availability-window-block` | Every green availability window block in Week grid | Opens free window details dialog | Includes `data-day="{dayOfWeek}"` and `data-start="{startTime}"` |
| `availability-window-edit` | Edit button in Details modal & List view window rows | Opens the Availability Dialog prefilled with window data | Tap target >= 40px |
| `availability-window-delete` | Delete button in Details modal & List view window rows | Opens the Delete Confirmation dialog | Neutral muted color, turns red on hover/focus |
| `availability-delete-confirm` | Red confirm button inside Delete Confirmation modal | Confirms deletion and fires delete action | Styled with destructive red tokens |
| `blocked-date-add` | "Add unavailable dates" button | Opens form to add an unavailable calendar range | Restyled unavailable dates section |
| `blocked-date-row` | Each blocked date range card/row | Displays unavailable date range and reason | Contains neutral delete button |

---

## App Shell & Navigation Test IDs

The shared application shell (`AppNav`, `StudentNav`, `ClientNav`) exposes the following `data-testid` attributes on desktop/tablet sidebar and mobile navigation:

| Attribute | Elements | Purpose | Notes / Extra Attributes |
| :--- | :--- | :--- | :--- |
| `nav-home` | Home navigation item link | Routes to role Home dashboard (`/student` or `/client`) | Active on exact pathname match |
| `nav-schedule` | Schedule navigation item link | Routes to Student Schedule (`/student/schedule`) | Retains active state on nested routes |
| `nav-tasks` | Tasks navigation item link | Routes to Tasks list (`/student/tasks` or `/client/tasks`) | Displays to-do count badge when count > 0 |
| `nav-time` | Time navigation item link | Routes to Student Time tracking (`/student/time`) | Displays pulsing green dot when time log is open |
| `nav-earnings` | Earnings navigation item link | Routes to Student Earnings (`/student/earnings`) | Retains active state on nested routes |
| `nav-calendar` | Calendar navigation item link | Routes to Client Calendar (`/client/calendar`) | Retains active state on nested routes |
| `nav-timesheets` | Timesheets navigation item link | Routes to Client Timesheets (`/client/timesheets`) | Displays hours waiting for approval badge when > 0 |
| `nav-collapse-toggle` | Sidebar collapse / expand toggle button | Toggles desktop sidebar between 264px and 72px collapsed rail | Stored in `sidebar_collapsed` cookie |
| `nav-<item>-mobile` | Mobile bottom tab bar link items | Mobile tab bar navigation items (e.g. `nav-home-mobile`, `nav-tasks-mobile`) | 56px height, labels under icons, safe-area padding |

---

## Student Tasks Page Test IDs

The Student Tasks page (`/student/tasks`) exposes the following `data-testid` attributes on tabs, task cards, actions, and overflow menus:

| Attribute | Elements | Purpose | Notes / Extra Attributes |
| :--- | :--- | :--- | :--- |
| `task-tab` | Segmented tab trigger buttons | Filters tasks by status (All, To do, In progress, Done) | Includes attribute: `data-tab="{all\|todo\|in_progress\|done}"` |
| `task-card` | Each individual task card container | Identifies task card, supports state querying and click | Includes attributes: `data-status="{TODO\|DOING\|DONE}"` and `data-response="{ACCEPTED\|RESCHEDULE_REQUESTED\|PENDING}"` |
| `task-accept` | Primary Accept button | Allows student to accept an assigned task | Styled with work green token `#16A34A` |
| `task-reschedule` | Secondary or overflow menu button | Opens the Ask to Reschedule modal | Prompts for reschedule reason |
| `task-time-in` | Primary Time In button | Direct navigation to timer with task pre-selected (`/student/time?taskId=...`) | Styled with primary ink token `#0F172A` |
| `task-menu` | Overflow action menu trigger button ("⋯") | Opens dropdown menu for status changes and overflow options | 40px+ tap target with accessible aria-label |
| `task-status-option` | Dropdown menu items for valid status changes | Updates task status to valid target status | Includes attribute: `data-status="{TODO\|DOING\|DONE}"` |

---

## Student Time Page Test IDs

The Student Time page (`/student/time`) exposes the following `data-testid` attributes on the timer hero card, form controls, stats, filters, and history rows:

| Attribute | Elements | Purpose | Notes / Extra Attributes |
| :--- | :--- | :--- | :--- |
| `time-timer` | Clock readout display element | Shows large display-font timer (`00:00:00` idle, live count-up running) | `aria-live="off"` container to prevent continuous screen reader noise |
| `time-task-select` | shadcn Select trigger | Selects a task for time tracking | Options grouped: "In progress" first, then "To do" with client and due date |
| `time-notes` | Session notes textarea | Captures optional session notes on Time Out | Displayed in running state before stopping timer |
| `time-in` | Primary Time In button | Starts work timer on selected task | Styled with work green token `#16A34A`, 52px high on desktop |
| `time-out` | Primary Time Out button | Stops active work session and logs total hours | Styled with destructive red token `#DC2626`, identical to Student Home |
| `time-daily-meter` | Daily capacity meter container | Shows today's hours against daily max with segmented bar | Displays amber "Over your daily limit" warning when capacity exceeded |
| `time-filter` | Filter pill container | Filters time logs by status | Includes attribute: `data-filter="{all\|awaiting_approval\|approved}"` |
| `time-log-row` | Each individual time log entry row | Identifies session log entry | Includes attribute: `data-status="{OPEN\|CLOSED\|APPROVED}"` |
| `time-request-correction` | Ghost action button on log row | Opens correction request dialog for closed logs | Visible 40px+ tap target; hidden on approved logs |

---

## Student Earnings Page Test IDs

The Student Earnings page (`/student/earnings`) exposes the following `data-testid` attributes on header controls, the hero card, compact stat tiles, invoice rows, invoice inspection sheet, and task breakdown:

| Attribute | Elements | Purpose | Notes / Extra Attributes |
| :--- | :--- | :--- | :--- |
| `earnings-period-toggle` | Segmented period toggle container & buttons | Toggles active earnings aggregation period | Includes attribute: `data-period="{this-week\|this-month\|all-time}"` |
| `earnings-total` | Big display-font amount element | Displays total value of hours logged in selected period | Formatted with `formatPeso` |
| `earnings-breakdown` | Stacked segmented bar & status legend | Displays visual split and legend across Paid, Approved awaiting payment, and Waiting for approval | Includes amounts and hours |
| `earnings-tile` | Three compact KPI summary cards | Displays Paid, Awaiting payment, and Waiting for approval summaries | Includes attribute: `data-kind="{paid\|awaiting-payment\|waiting-approval}"` |
| `invoice-row` | Each individual invoice row in desktop table & mobile cards | Identifies invoice record; clicking opens Sheet | Includes attribute: `data-status="{pending\|approved\|paid}"` |
| `invoice-view` | "View" ghost button on invoice row/card | Opens invoice detail sheet | 40px tap target with accessible icon |
| `invoice-sheet` | Sheet dialog content container | Displays invoice details, 3-step status indicator, and summary | Closes with Escape and returns focus |
| `earnings-task-row` | Each individual task row in desktop table & mobile cards | Displays task title, sessions count, hours, and value | Truncated task title, sessions in AA contrast ink |

---

## Notifications Page & Bell Test IDs

The Notifications page (`/student/notifications` and `/client/notifications`) and the top bar bell expose the following `data-testid` attributes:

| Attribute | Elements | Purpose | Notes / Extra Attributes |
| :--- | :--- | :--- | :--- |
| `bell-badge` | Ink unread count badge on the Topbar Bell link | Displays the number of unread notifications | Shows "9+" above 9; hidden when unread is 0 |
| `notifications-mark-all` | "Mark all as read" button in page header | Marks all notifications as read for current user | Disabled when unread count is 0 |
| `notifications-filter` | Segmented filter tab buttons ("All" and "Unread") | Filters notification list | Includes attribute: `data-filter="{all\|unread}"` |
| `notification-row` | Each notification item row | Interactive row; clicking marks as read and navigates to route | Includes attributes: `data-type="{NotificationType}"` and `data-read="{true\|false}"` |
| `notification-mark-read` | "Mark as read" ghost button on unread notification rows | Marks single notification as read without navigating | Stops row click propagation; hidden on read rows |
| `notifications-load-more` | "Load more" button at bottom of list | Loads additional notifications into the view | Rendered when additional notifications are available |

---

## Profile and Settings Page Test IDs

The Profile and Settings pages (`/student/profile` and `/client/profile`) expose the following `data-testid` attributes across both roles:

| Attribute | Elements | Purpose | Notes / Extra Attributes |
| :--- | :--- | :--- | :--- |
| `profile-header` | Compact (~96px) Identity Header card | Displays avatar, user name in display font, role `StatusBadge`, and muted email line | Both roles |
| `profile-logout-header` | Desktop/tablet neutral ink-outline "Log out" button | Triggers role sign-out via `logoutAction` | Styled with neutral ink-outline tokens and LogOut icon |
| `profile-form` | Personal details form container | Form for contact and academic information | Student: Name, Email, School, Course, Year level (Select); Client: Name, Email |
| `profile-save` | Save changes button on personal details card | Persists updated personal details | Disabled until dirty (`!isDirty`); shows loading state |
| `profile-dirty-hint` | Inline "Unsaved changes" badge | Appears when personal details have unsaved changes | Styled with amber warning tokens |
| `daily-limit-readonly` | Read-only daily hour limit row | Displays current daily hour limit with link to `/student/schedule#availability` | Student only; prevents divergent capacity sources of truth |
| `linked-card` | Linked counterpart card container | Displays linked client/student details, avatar, rate pill (display font, tabular-nums), and link date | Student: client details & rate pill; Client: student details, rate pill, and edit rate button (no academic info) |
| `invite-code-value` | Large monospace invite code container | Renders 8-character student invite code in two 4-char groups (e.g. "QDFC YKAP") | Student only; select-all enabled |
| `invite-code-copy` | "Copy code" button | Copies raw invite code to clipboard and shows toast | Student only; primary button |
| `invite-code-share` | "Share" button | Triggers Web Share API (`navigator.share`) on supporting devices | Student only; secondary button |
| `invite-code-generate` | "Generate invite code" button | Generates fresh invite code when student has no active unused code | Student only; primary button with loading state |
| `link-student-code` | Invite code input field | Accepts 8-character invite code, auto-uppercases, and strips spaces/dashes | Client only; monospace uppercase font |
| `link-student-rate` | Hourly rate input field | Accepts agreed hourly rate with visual `₱` prefix | Client only; numeric input with display font |
| `link-student-submit` | "Link student" button | Submits code and hourly rate to establish link | Client only; primary button with loading state |
| `edit-rate-open` | "Edit rate" button on linked student card | Opens shadcn Dialog to adjust agreed hourly rate | Client only; opens small modal dialog with live preview and helper text |
| `password-form` | Password card form container | Dedicated form to update account password, collapsed by default | Contains Current, New, and Confirm password fields with show/hide toggles |
| `password-submit` | "Update password" button | Submits password change request | Shows loading state, clears fields, collapses card, and shows toast on success |
| `logout-button` | Mobile full-width ghost "Log out" button | Triggers role sign-out via `logoutAction` | Mobile bottom placement, styled with ghost tokens |

---

## Client Home Page Test IDs

The Client Home page (`/client`) exposes the following `data-testid` attributes across greeting, actions, student status card, attention strip, summary tiles, active tasks, and recent activity:

| Attribute | Elements | Purpose | Notes / Extra Attributes |
| :--- | :--- | :--- | :--- |
| `client-home-greeting` | Page headline | Time-aware greeting in Asia/Manila (e.g. "Good morning, Maria") | No exclamation mark, date line below |
| `client-home-assign` | Top-right & empty state "Assign task" button | Opens the Assign Task dialog | Styled in ink primary style (not green) |
| `client-student-status` | Student live status chip on Student card | Displays student live availability status | Includes `data-status="{AVAILABLE\|IN_CLASS\|OFF}"` |
| `client-next-free` | Next free slot text indicator | Reserved for computed next free availability window | Computed only if reusable multi-day scheduling logic exists |
| `client-attention` | Actionable attention chip in "Needs your attention" strip | Links directly to relevant resolution page | Includes `data-kind="{reschedule-requests\|correction-requests\|disputed-hours}"` |
| `client-tile` | Compact summary KPI cards | Displays metrics for In progress, Waiting for approval, Completed tasks | Includes `data-kind="{in-progress\|waiting-approval\|completed-tasks}"` |
| `client-task-row` | Each individual active task row in Active Tasks card | Links to `/client/tasks` | Includes `data-status="{TODO\|DOING\|DONE}"` and `data-response="{ACCEPTED\|RESCHEDULE_REQUESTED\|NEEDS_RESPONSE}"` |
| `client-activity-row` | Each notification item row in Recent Activity card | Interactive row linking via `getNotificationRoute` | Includes `data-type="{NotificationType}"` |

---

## Client Calendar Page Test IDs

The Client Calendar page (`/client/calendar`) exposes the following `data-testid` attributes across header navigation, status strip, week grid, list view, and calendar blocks:

| Attribute | Elements | Purpose | Notes / Extra Attributes |
| :--- | :--- | :--- | :--- |
| `calendar-prev` | Previous week navigator button ("<") | Navigates calendar view to previous week | Shifts week anchor by 7 days backwards |
| `calendar-next` | Next week navigator button (">") | Navigates calendar view to next week | Shifts week anchor by 7 days forward |
| `calendar-today` | "Today" button | Resets calendar view to the current week | Styled with neutral subtle button |
| `calendar-assign` | Primary "Assign task" button in header & floating mobile button | Opens the Assign Task dialog prefilled | Styled with primary ink token `#0F172A` |
| `calendar-view-toggle` | Top-right view switch container | Toggles between "Week" grid and "List" view | Used to switch timetable presentation |
| `calendar-week-grid` | Desktop 7-day timetable grid container | Renders Monday to Sunday 7 AM – 10 PM hour grid | Contains day columns, hour rows, and time-positioned blocks |
| `calendar-blocked-day` | Whole-day hatched background in grid & list placeholder | Indicates student is completely unavailable on date | Displays "Not available" (never exposes reason) |
| `calendar-class-block` | Blue "In class" time block in grid and list row | Indicates scheduled class time | Tooltip "In class. Tasks can't be assigned during class." (never exposes subject name) |
| `calendar-open-slot` | Dashed green free window button in grid & list card | Clickable real free time window opening Assign Task dialog | Includes `data-day="{dayOfWeek}"` and `data-start="{startTimeFormatted}"` |
| `calendar-task-block` | Solid green task block in grid and list row | Displays assigned task title and status badge; links to `/client/tasks` | Includes status indicator |

---

## Assign Task Dialog Test IDs

The Assign Task dialog (`AssignTaskDialog`, opened from Client Calendar, Client Tasks, and Client Home) exposes the following `data-testid` attributes across form fields, live availability preview, conflict findings, suggestions, and actions:

| Attribute | Elements | Purpose | Notes / Extra Attributes |
| :--- | :--- | :--- | :--- |
| `assign-dialog` | Modal dialog container | Identifies the full dialog / sheet element | `role="dialog"`, `aria-modal="true"` |
| `assign-title` | Task title input | Captures task title | Required field |
| `assign-description` | Task description textarea | Captures optional task instructions and links | Max length 1000 characters |
| `assign-date` | Date picker Popover trigger button | Opens shadcn Calendar popover to pick task date | Displays formatted date e.g. "Thu, Nov 12, 2026"; past dates disabled |
| `assign-start` | Start time native input | Sets task start time on selected date | 15-minute step |
| `assign-end` | Due / end time native input | Sets task due/end time on selected date | 15-minute step |
| `assign-hours` | Estimated hours stepper input | Adjusts task estimated hours | 0.5h stepper buttons (minus and plus); typed input allowed |
| `assign-day-preview` | Horizontal 7 AM – 10 PM time bar | Displays visual schedule for the selected date | Shows classes (blue), free windows (dashed green), blocked days (hatched), and proposed task (ink outline) |
| `assign-check` | Live availability check result card | Displays live conflict findings from `checkConflict` | Includes `data-state="{ok\|warn\|block\|checking\|error}"`, `role="status"`, `aria-live="polite"` |
| `assign-conflict-item` | Conflict finding list item | Individual conflict or warning bullet in result card | Includes `data-type="{CLASS_OVERLAP\|OUTSIDE_AVAILABILITY\|EXCEEDS_AVAILABLE_HOURS\|BLOCKED_DATE}"` |
| `assign-suggestion` | Open slot suggestion chip | Recommends up to 4 open slots from `suggestSlots` | Includes `data-start="{startTimeFormatted}"`; clicking pre-fills date and time |
| `assign-submit` | Primary dialog submit button | Submits task assignment | "Assign task" (OK), "Assign anyway" (Warning), disabled on Block |
| `assign-cancel` | Cancel button & close icon | Discards form and closes dialog | Secondary / ghost button |

---

## Client Tasks Page Test IDs

The Client Tasks page (`/client/tasks`) exposes the following `data-testid` attributes across tabs, task cards, overflow menus, and the task detail sheet:

| Attribute | Elements | Purpose | Notes / Extra Attributes |
| :--- | :--- | :--- | :--- |
| `client-tasks-tab` | Segmented tab trigger buttons | Filters tasks by status (All, To do, In progress, Done) | Includes attribute: `data-tab="{all\|todo\|in_progress\|done}"` |
| `client-task-card` | Each individual task card button container | Clickable card that opens the task detail sheet | Includes attributes: `data-status="{TODO\|DOING\|DONE}"` and `data-response="{ACCEPTED\|RESCHEDULE_REQUESTED\|PENDING}"` |
| `client-task-menu` | Overflow action menu trigger button ("⋯") | Opens dropdown menu to transition task status | 40px+ tap target with accessible aria-label |
| `client-task-status-option` | Dropdown menu items for valid status changes | Transitions task to valid target status | Includes attribute: `data-status="{TODO\|DOING\|DONE}"` |
| `client-task-sheet` | Task detail sheet container | Displays full description, schedule window, deadline, progress, reschedule callout, and time logs | Closes with Escape or X, restores focus to triggering card |
| `client-task-reschedule-reason` | Amber reschedule callout container in detail sheet | Displays student's reschedule request callout and reason | Rendered only when student requested a reschedule |
| `client-task-log-row` | Each individual time log entry row in detail sheet | Identifies logged work session row | Includes attribute: `data-status="{OPEN\|CLOSED\|APPROVED}"` |

---

## Client Timesheets Page Test IDs

The Client Timesheets page (`/client/timesheets`) and dispute modal expose the following `data-testid` attributes across tabs, task groups, session rows, callouts, actions, and invoices:

| Attribute | Elements | Purpose | Notes / Extra Attributes |
| :--- | :--- | :--- | :--- |
| `timesheets-tab` | Segmented tab trigger buttons | Toggles between "To review", "Approved", and "Invoices" tabs | Includes attribute: `data-tab="{to-review\|approved\|invoices}"` |
| `timesheet-group` | Task group container card | Groups timesheet rows by task with estimate and logged progress | Includes attribute: `data-task="{taskTitle}"` |
| `timesheet-row` | Session log row inside task group | Individual work session row | Includes attribute: `data-status="{CLOSED\|APPROVED}"` |
| `timesheet-note` | Student session note container | Clamped expandable student note from clock-out | Rendered only when student left session notes |
| `timesheet-approve` | Primary green Approve button on session row | Approves session log and adds to open invoice | 40px+ tap target with accessible aria-label |
| `timesheet-dispute` | Ghost Dispute button on session row | Opens dispute dialog for the session log | Hidden if session is already disputed |
| `timesheet-correction-approve` | Accept correction button in adjustment callout | Approves student's time adjustment request | Updates session total hours to requested time |
| `timesheet-correction-decline` | Decline correction button in adjustment callout | Rejects student's time adjustment request | Leaves original session hours unchanged |
| `dispute-dialog` | Dispute dialog modal container | Dialog for recording reason when disputing hours | `role="dialog"`, `aria-modal="true"`, closes on Escape |
| `dispute-reason` | Reason textarea inside dispute dialog | Captures dispute rationale (minimum 5 characters) | Required, max 300 characters with live counter |
| `dispute-submit` | "Send dispute" primary ink button | Submits dispute reason and notifies student | Disabled until reason length >= 5 |
| `invoice-card` | Invoice card or row container | Renders open invoice card or paid invoice row | Includes attribute: `data-status="{APPROVED\|PAID}"` |
| `invoice-mark-paid` | Primary "Mark as paid" button on open invoice card | Opens confirmation dialog to mark invoice paid | Rendered on open (APPROVED) invoice |
| `invoice-confirm-paid` | Confirm button in payment dialog | Marks the approved invoice as PAID | Fired inside confirmation modal |
| `invoice-sheet` | Invoice details inspection sheet | Displays totals, hourly rate, parties, and billing details | Opens on "View" click |

---

## Authentication & Registration Test IDs

The Authentication and Registration pages (`/register`, `/login`, `/forgot-password`) expose the following `data-testid` attributes:

| Attribute | Elements | Purpose | Notes / Extra Attributes |
| :--- | :--- | :--- | :--- |
| `auth-role-student` | Student radio option card | Selects the Student VA role in the radiogroup | `role="radio"`, `aria-checked="{true\|false}"` |
| `auth-role-client` | Client radio option card | Selects the Client role in the radiogroup | `role="radio"`, `aria-checked="{true\|false}"` |
| `auth-name` | Full name text input | Captures registrant's full name | `autoComplete="name"`, 44px height |
| `auth-email` | Email address input | Captures registrant's email address | `autoComplete="email"`, 44px height |
| `auth-password` | Password input | Captures account password | `autoComplete="new-password"`, 44px height |
| `auth-password-toggle` | Password visibility toggle button | Shows / hides password text | `type="button"`, accessible `aria-label` |
| `auth-school` | School or university input | Captures student's educational institution | Student only, `autoComplete="organization"`, 44px height |
| `auth-course` | Course or degree input | Captures student's degree/program | Student only, 44px height |
| `auth-year` | Year level Select trigger | Opens dropdown to select college year level (1-6) | Student only, shadcn Select component, 44px height |
| `auth-submit` | Registration submit button | Submits the registration form | Full width, shows loading state and disabled while pending |
| `auth-error` | Form-level server error alert box | Displays server error message | `role="alert"`, `aria-live="assertive"` |

> [!NOTE]
> **Role Choice Testing Guideline (for Test Agents):**  
> The role choice on `/register` is implemented as an accessible `role="radiogroup"` containing two selectable cards with `role="radio"`. Do NOT use plain button selectors to select the role. Instead, query by role: `page.getByRole("radio", { name: /student/i })` and `page.getByRole("radio", { name: /client/i })`, or via `[data-testid="auth-role-student"]` / `[data-testid="auth-role-client"]`. The radios support standard arrow-key navigation (Left/Right/Up/Down) and Space/Enter selection.

### Login Page Test IDs

The Login page (`/login`) exposes the following `data-testid` attributes:

| Attribute | Elements | Purpose | Notes / Extra Attributes |
| :--- | :--- | :--- | :--- |
| `login-email` | Email input | Captures login email address | `autoComplete="username"`, 44px height |
| `login-password` | Password input | Captures account password | `autoComplete="current-password"`, 44px height |
| `login-password-toggle` | Password visibility toggle button | Shows / hides password text | `type="button"`, accessible `aria-label` |
| `login-forgot-link` | "Forgot password?" link | Navigates to `/forgot-password` | Right-aligned, 14px text |
| `login-submit` | Login submit button | Submits the login form | Full width, disabled while pending |
| `login-error` | Form-level error alert box | Displays unified error message | `role="alert"`, unified "Email or password is incorrect." |

> [!NOTE]
> **Dev Demo Credentials Chips:**  
> The developer demo credentials box is dynamically loaded ONLY when `process.env.NODE_ENV === "development"` AND `NEXT_PUBLIC_SHOW_DEMO_LOGINS === "true"`. It is completely stripped from production client JavaScript bundles by dead-code elimination. In development, clicking a chip prefills ONLY the email address; passwords must always be entered manually.

---

## Testing Guidelines

1. **Week Grid vs List View:**
   - On desktop viewport (`>= 768px`), Week Grid is rendered by default. Toggle `schedule-view-toggle` to switch to List View.
   - On mobile viewport (`< 768px`), Mobile Agenda layout with Day Chips is rendered by default.

2. **Mode-Aware Timetable Grid:**
   - In `classes` mode, class blocks are blue and interactive (`[data-testid="schedule-class-block"]`).
   - In `availability` mode, free windows are green and interactive (`[data-testid="availability-window-block"]`), while classes appear as faint read-only reference blocks.

3. **Task Acceptance Before Time In (E2E Notes for Copilot):**
   - A student must accept a task (`task.studentResponse === 'ACCEPTED'`) before starting the timer.
   - Tasks with `studentResponse: null` or `RESCHEDULE_REQUESTED`, as well as `DONE` tasks, cannot be timed. Attempting `timeIn` on the server throws `"Accept this task before you start the timer."`
   - The Student Time page (`/student/time`) task picker lists only accepted, not-done tasks. When none qualify, it displays the helper line `"Accept a task first to start the timer"` with a link to Tasks (`/student/tasks`).
   - The Student Tasks page (`/student/tasks`) only shows the "Time In" button (`[data-testid="task-time-in"]`) for tasks where `studentResponse === 'ACCEPTED'` and status is not `DONE`. Tasks awaiting response display "Accept" and "Ask to reschedule" buttons instead.
   - In E2E tests: any flow that triggers Time In must ensure the task is accepted first (e.g. click `[data-testid="task-accept"]` or ensure `studentResponse: 'ACCEPTED'`).

---

## Database Isolation & Environment Configuration

Dev, test and production use separate databases:
- **Development**: Uses `DATABASE_URL` pointing to the local dev PostgreSQL instance (`localhost` / `127.0.0.1`).
- **Test / E2E**: The E2E suite runs only against `TEST_DATABASE_URL` (or isolated `E2E_DATABASE_URL`), ensuring test fixtures, deletions, and seed operations never alter development or production records.
- **Production**: Dedicated production database. All seed scripts and setup utilities (`prisma/seed.ts`, `scripts/seed-many-notifications.ts`, `e2e/global-setup.ts`) enforce strict Seed Safety Guards that refuse execution in production or against non-local hosts unless deliberately overridden with `ALLOW_SEED=1`.
