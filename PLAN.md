# Student VA-Hub: MVP Spec and Vibe-Coding Plan

Version 1.0 (v1.0 due in one week, v1.1 after)

## 1. What it is

A mobile-first web app that makes a student's class schedule the source of truth, so VA work is only assigned in their free time. Core feature: the **Conflict Detector**.

## 2. Scope: v1.0 and v1.1

**v1.0 (deadline, next week):** register and login with 2 roles, invite-code linking, class schedule, availability, Conflict Detector, Assign Task with live check, Tasks and Task Detail, Time In/Out, Timesheets and invoices with approval, Client calendar, dashboards, empty/loading/error states, mobile-friendly, deployed with a real URL.

**v1.1 (after the deadline, in this order):** time corrections and disputes, notifications and password-reset email, blocked dates, reschedule requests, PWA install, first-time walkthrough, landing page polish, end-to-end tests. If time is left before the deadline, build these from the top.

**Still out (v2):** Admin/Teacher role, grades, GCash payments, multiple clients per student. Anything not listed in v1.0 or v1.1 is a change request.

## 3. Roles and accounts

| Role | Can do |
| --- | --- |
| Student VA | Set classes and available hours, view tasks, Time In/Out, view earnings |
| Client | View student's availability (read-only), assign tasks, approve hours and invoice |

Pilot size: 3 Student VAs + 1 to 3 Clients. Rule: **one Client per Student** in the MVP.

## 4. Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router) + TypeScript | React frontend and Node backend in one project, easiest for AI-assisted coding |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, mobile-first |
| Database | PostgreSQL (Supabase or Neon, free tier) | Relational data fits this system |
| ORM | Prisma | Matches your friend's document |
| Auth | Auth.js (NextAuth), email + password | Simple, role in session |
| Calendar UI | FullCalendar or a simple custom weekly grid | Shows blue class, green work, red conflict |
| Validation | Zod | Same rules on client and server |
| Date/time | date-fns, store UTC, display Asia/Manila | Avoids timezone bugs |
| Tests | Vitest | For the Conflict Detector unit tests |
| Hosting | Vercel + Supabase/Neon | Free to start |
| Design | Claude for wireframes and UI copy, then build in Antigravity | See section 9 |

Note: this is still React + Node + Prisma as in your friend's document. Next.js just combines the frontend and backend.

## 5. Data model (Prisma)

- `User` (id, name, email, passwordHash, role: STUDENT | CLIENT)
- `StudentProfile` (userId, school, course, year, maxHoursPerDay)
- `ClassSchedule` (id, studentId, subject, dayOfWeek 0-6, startTime, endTime)
- `Availability` (id, studentId, dayOfWeek, startTime, endTime)
- `ClientStudentLink` (id, clientId, studentId, hourlyRate, status)
- `Task` (id, clientId, studentId, title, description, startAt, dueAt, estHours, status: TODO | DOING | DONE)
- `TimeLog` (id, studentId, taskId, timeIn, timeOut, totalHours, status: OPEN | CLOSED | APPROVED)
- `Invoice` (id, studentId, clientId, totalHours, rate, amount, status: PENDING | APPROVED | PAID)

Added for the pages in sections 13 and 14. Create all tables on Day 1 so the schema does not change later, even for v1.1 features:

- `InviteCode` (id, studentId, code, usedByClientId, createdAt)
- `BlockedDate` (id, studentId, dateStart, dateEnd, reason)
- `Notification` (id, userId, type, message, readAt, createdAt)
- `TimeLog` extra fields: correctionNote, requestedTimeOut, correctionStatus, disputeReason, disputeResponse
- `Task` extra fields: studentResponse (ACCEPTED | RESCHEDULE\_REQUESTED), rescheduleReason

## 6. Conflict Detector rules (the core)

A task or meeting is checked against these, in order:

1. **BLOCK, class overlap:** conflict if `taskStart < classEnd AND taskEnd > classStart` on the same day. The Client cannot submit. Show: "Conflict! Juan has class Monday 1PM-2PM." The subject name is never shown to the Client.
2. **WARN, outside available hours:** the task window is outside the student's availability windows. The Client can send it and the Student decides.
3. **WARN, exceeds available hours:** `estHours` is more than the remaining available hours for that day or the student's `maxHoursPerDay`. Show: "Exceeds Available Hours (5h vs 2h)." The Client can still send it.
4. **BLOCK, single open log:** a Student cannot Time In if a TimeLog is already OPEN (enforced in the backend).
5. **WARN, two-way check:** when a Student adds or edits a class that overlaps an existing task, show a warning to the Student.

Build this as a **pure function** (no database inside) with unit tests, then connect it to the UI.

```
checkConflict(task, classes, availability, existingTasks, maxHoursPerDay)
  -> { ok: boolean, conflicts: [{ type, message }] }
```

Client privacy: the Client only sees "In class" blocks, not subject names.

## 7. Screens

The full page map is in section 13 and the content of each page is in section 14. Colors: Blue = class, Green = VA work, Red = conflict.

## 8. Development cycle (7 days)

| Day | Work | Done when |
| --- | --- | --- |
| 1 | Scaffold, Prisma schema (all tables), auth and roles, layout and nav, design tokens, Assign Task as the reference screen, deploy | App is live with login and both navs |
| 2 | Profile and invite-code linking, Class Schedule, Availability | Student enters classes and availability, Client links by code |
| 3 | Conflict Detector (`lib/conflict.ts`) with unit tests | All detector tests pass |
| 4 | Assign Task wired to the detector, Tasks, Task Detail, Time In/Out, Timesheets, invoices | Core flow works end to end |
| 5 | Client Calendar, both dashboards, corrections and disputes, notifications | Dashboards show real data |
| 6 | Blocked dates, reschedule requests, PWA, landing page, empty/loading/error states, mobile pass | Every page has its 3 states and works on a phone |
| 7 | Run all tests, seed data, fixes, handover | All 12 tests pass, final deploy |

Core flow must work by the end of Day 4. If you fall behind, cut from the v1.1 list, never from the Conflict Detector. Send the friend a daily update with a screenshot. Suggested payment: 50% upfront, 50% on delivery.

## 9. Vibe-coding workflow (Antigravity + Claude)

**Roles:** Claude for design, specs, and prompts. Antigravity for writing and running the code.

**Setup:**

1. Create the repo and put this document in it as `docs/SPEC.md`.
2. Add a short rules file for the agent (project context, stack, naming, "never skip tests for the detector").
3. Work in small tasks, one feature per prompt, commit after each one that works.

**Rules file to give Antigravity:**

```
Project: Student VA-Hub. Read docs/SPEC.md (sections 5, 6, 13, 14) and docs/DESIGN.md before any task.
Stack: Next.js App Router, TypeScript, Tailwind, shadcn/ui, Prisma, PostgreSQL, Auth.js, Zod, date-fns, Vitest.
Rules:
- Store all times in UTC, display in Asia/Manila.
- Conflict logic lives in lib/conflict.ts as pure functions with Vitest tests.
- Class overlap blocks, exceeding hours only warns (section 6).
- The Client never sees class subject names, only "In class".
- Validate every API input with Zod. Check the role on every route.
- Mobile-first. Colors: blue class, green work, red conflict.
- Follow docs/DESIGN.md: shadcn/ui and Lucide icons only.
- Build one page per task. Do not add features outside v1.0 and v1.1 in SPEC.md.
```

**Prompt order (one per step):**

1. Scaffold the app, Prisma schema (all tables from section 5), seed data, and deploy.
2. Auth: register and login with two roles, protected routes, role checks.
3. Layout and nav for both roles, plus Assign Task as a static reference screen with a mocked red alert.
4. Profile and Settings: invite code for the Student, Link Student with rate for the Client.
5. Schedule: Classes and Availability.
6. `lib/conflict.ts` plus Vitest tests for the rules in section 6.
7. Assign Task wired to the detector, Tasks list, Task Detail.
8. Time page: Time In/Out with the single-open-log rule.
9. Timesheets and Earnings: approval and invoices.
10. Client Calendar and both dashboards.
11. Empty, loading and error states, mobile pass, final deploy.
12. v1.1 items, in the order in section 2.

**Watch-outs when vibe coding:**

- Read and understand the conflict code. It is the part you will be asked about, and the part AI most often gets wrong (overlaps, midnight, timezones).
- Enforce rules in the backend, not only in buttons.
- Never commit `.env`. Use environment variables on Vercel.
- Test with real class schedules before the pilot.

## 10. Acceptance tests

| # | Scenario | Expected |
| --- | --- | --- |
| 1 | Task at 1PM, student has class 1PM | CONFLICT, Client cannot submit |
| 2 | Task 12:30PM-2PM, class 1PM-2PM | CONFLICT (overlap, not exact match) |
| 3 | Time In 6PM, Time Out 9PM at P150/hr | 3 hours, P450 |
| 4 | Time In twice | Second one rejected |
| 5 | 5-hour task, 2 available hours | "Exceeds Available Hours" warning, Client can still send |
| 6 | Client opens student calendar | Sees "In class" blocks only, no subject names |
| 7 | Client enters a valid invite code | Linked, rate saved |
| 8 | Client enters an invalid or used code | Error message, no link |
| 9 | Client opens a Student-only URL | Redirected, no data returned |
| 10 | Student adds a class that overlaps an existing task | Warning shown to the Student |
| 11 | Client approves logged hours | Invoice becomes Approved, then Paid when marked |
| 12 | Task in 2 different timezones set (UTC vs Manila) | Same conflict result |

## 11. Definition of done for the MVP

v1.0 is done when both roles can register and log in, link by invite code, the Student enters classes and availability, the Client assigns tasks (class overlaps blocked, hour excesses warned), the Student can Time In/Out, the Client approves hours and the invoice is computed, all 12 tests pass, every page has empty, loading and error states, it works on a phone, and it is deployed with a real URL.

## 12. Design and UI guidelines (so it doesn't look vibe-coded)

**Direction:** clean productivity-app look (Linear, Notion, Cal.com style), not flashy landing-page style.

**Design skill for Antigravity**

- Add **one** design skill to `.agent/skills/frontend-design/` in the repo. Options: Anthropic's `frontend-design` skill (`anthropics/skills` on GitHub), or `frontend-design` from `vudovn/antigravity-kit`.
- Read the SKILL.md before installing any third-party skill. Do not install several design skills at once, since conflicting instructions give inconsistent results.
- Create `docs/DESIGN.md` (tokens and rules below) and keep it in the repo.

**Design rules**

| Item | Rule |
| --- | --- |
| Components | shadcn/ui only (buttons, forms, dialogs, tables) |
| Icons | Lucide icons only, no emoji icons |
| Font | One font: Inter or Geist |
| Colors | Neutral base (white/gray) plus one accent color |
| Meaning colors | Blue = class, Green = VA work, Red = conflict, used only for those |
| Spacing | Tailwind 4/8px scale, consistent across screens |
| Style | Small border radius, subtle borders, light shadows |
| States | Every screen has empty, loading, and error states |
| Layout | Mobile-first, tested at phone width |

**Avoid**

- Purple/blue gradients, glassmorphism, glow effects
- Cards inside cards, everything centered, oversized rounded corners
- Generic placeholder copy like "Welcome to your dashboard!"

**Add to the agent rules file**

```
Follow docs/DESIGN.md. Use only shadcn/ui components and Lucide icons.
No gradients, no emoji icons. Every screen needs empty, loading, and error states.
```

**Design workflow (add before Dev 1 in Week 2-3)**

1. Use Claude to produce the design tokens and the look of the 3 main components, then save them as `docs/DESIGN.md`.
2. Build one reference screen first: the Client's Assign Task screen with the red conflict alert. Get it looking right.
3. Tell the agent to copy that style for every other screen.
4. Review in the browser and give specific fixes (for example, "tighten header spacing, make table text smaller").
5. Final check: mobile view, all three states on each screen, and colors used only for their meaning.

## 13. Pages and navigation map (full product)

This replaces the short screen list in section 7. Rule: only daily-use pages go in the main nav (5 items or fewer on mobile). Everything else lives under the bell icon, the profile menu, or inside another page.

### Student VA (8 pages)

Main nav (bottom tab bar on mobile, sidebar on desktop):

| Nav item | What's inside |
| --- | --- |
| Home | Dashboard: today's timeline (class blue, VA work green), pending tasks, hours worked vs. daily max, Time In button |
| Schedule | Two tabs: Classes (weekly grid, add/edit/delete) and Availability (windows, max hours per day, blocked dates) |
| Tasks | Task list with status filters (To Do, Doing, Done). Tapping a task opens Task Detail |
| Time | Time In/Out, running timer, task picker, notes, log history, request correction |
| Earnings | Hours x rate, invoices (Pending, Approved, Paid), weekly total |

Not in the nav:

- Notifications (bell icon, top bar)
- Profile and Settings, Invite Code, Logout (profile menu, top right)
- Task Detail (opened from Tasks: accept, ask to reschedule, change status)

### Client (8 pages)

Main nav:

| Nav item | What's inside |
| --- | --- |
| Home | Dashboard: student's status today (available, in class, off), tasks in progress, hours waiting for approval |
| Calendar | Read-only view of the student's availability and "In class" blocks (proof of class, no subject names) |
| Tasks | Task list with status and progress, plus a prominent + Assign Task button |
| Timesheets | Logged hours with student notes, Approve or Dispute, invoices, mark as Paid |

Not in the nav:

- Assign Task (opened from Tasks; shows the red conflict alert with the reason, for example "Class 1PM-2PM" or "Exceeds available hours")
- Notifications (bell icon)
- Profile and Settings, Link Student (enter invite code and set hourly rate), Logout (profile menu)

### Public pages (5)

Landing, Login, Register, Forgot Password, 404.

### Totals

| User | Nav items | Total pages |
| --- | --- | --- |
| Student VA | 5 | 8 |
| Client | 4 | 8 |
| Public | none | 5 |
| Total |  | about 21 screens |

### Flows to build with these pages

- **Linking:** Student generates an invite code, Client enters it and sets the hourly rate.
- **Two-way conflict check:** editing the class schedule is also checked against existing tasks.
- **Task response:** Student accepts, or requests a reschedule with a reason.
- **Time correction:** Student requests a correction for a forgotten Time Out, Client approves.
- **Dispute:** Client disputes hours with a reason, Student responds.
- **Blocked dates:** a simple "I'm unavailable" range (exams, org events).
- **Notifications:** in-app for task assigned, conflict, hours approved; email for password reset.

### Quality checklist

Empty, loading and error states on every page. PWA install on mobile. Role checks on every API route. Conflict Detector unit tests plus end-to-end tests (Playwright) of the main flow. Seed demo data and a short first-time walkthrough.

### Still out of scope (version 2)

Admin/Teacher role, grades, GCash payments, multiple clients per student.

## 14. Page-by-page content (what each user sees and does)

Use this as the build reference for each page. Build one page per prompt.

### Student VA pages

| Page | What they see | What they can do |
| --- | --- | --- |
| Home | Greeting. Today's timeline (blue class blocks, green VA work). "Hours today: 2 / 4 max". Pending tasks count. This week's earnings. Next class and next task. Conflict warnings, if any | Time In, open a task, go to Schedule |
| Schedule > Classes | Weekly grid of classes (subject, time) | Add, edit, delete a class. A warning shows if it overlaps an existing task |
| Schedule > Availability | Windows per day (e.g. Mon 6PM-9PM), daily max hours, blocked dates (exams, events) | Add or edit windows, set the max, block a date range |
| Tasks | List: title, client, deadline, est. hours, status badge. Filter tabs: To Do / Doing / Done | Open a task |
| Task Detail | Title, description, deadline, est. hours, status, time logged so far, conflict flag if any | Accept, request reschedule with a reason, change status, start timer |
| Time | Big Time In / Time Out button. Running timer. Task picker and notes. Log history (date, task, hours, status) | Time In/Out (blocked if one is already open), request correction |
| Earnings | Total this week/month. Invoice list: period, hours, rate, amount, status (Pending / Approved / Paid) | View invoice, see breakdown by task |
| Notifications (bell) | Task assigned, conflict, hours approved or disputed, correction approved | Mark as read, tap to open |
| Profile and Settings | Name, school, course, year, password. Invite code to share with a client. Linked client | Edit, copy code, log out |

### Client pages

| Page | What they see | What they can do |
| --- | --- | --- |
| Home | Student's status today (available / in class / off). Tasks in progress. Hours waiting for approval. Recent activity | Go to Assign Task or Timesheets |
| Calendar | Read-only week view of the student: green = available, gray/red = "In class" (no subject names) | Change week, click an open slot to start a task there |
| Tasks | List with status, deadline, hours. + Assign Task button | Open a task, filter |
| Assign Task | Form: title, description, date and time, est. hours. Live check below the form: green "No conflict" or red alert with the reason ("Class 1PM-2PM", "Outside available hours", "Exceeds available hours (5h vs 2h)"). Student's open slots shown as suggestions | Submit (blocked on hard conflicts), pick a suggested slot |
| Timesheets | Logged hours per task with the student's notes. Correction requests. Invoice totals | Approve, dispute with a reason, mark invoice Paid |
| Notifications (bell) | Task accepted, reschedule request, hours submitted, correction request | Mark as read, tap to open |
| Profile and Settings | Name, password. Link Student: enter invite code and set hourly rate. Linked student | Link, edit rate, log out |

### Public pages

| Page | What they see |
| --- | --- |
| Landing | One-line pitch, 3 benefits (no more clashes, burnout protection, proof of class), simple screenshot, Login and Register buttons |
| Login | Email, password, forgot link, clear error messages |
| Register | Role choice first. Student: name, email, password, school, course, year. Client: name, email, password |
| Forgot Password | Email field, then a confirmation message |
| 404 | "Page not found" and a button back home |

### Rules to confirm with the client (friend)

1. **Class overlap = hard block.** The Client cannot submit a task that overlaps a class.
2. **Exceeds available hours = warning.** The Client can still send it, and the Student decides (accept or request reschedule).
3. **When the student is off or in class,** the Client sees only "Not available" or "In class", with no reason and no subject names.

## 15. How to start (Day 1)

1. Create the repo. Add this document as `docs/SPEC.md` and the design rules as `docs/DESIGN.md`.
2. Add one design skill to `.agent/skills/frontend-design/` and the rules file from section 9.
3. Paste this first prompt into Antigravity:

```
Read docs/SPEC.md and docs/DESIGN.md. Scaffold the Student VA-Hub app: Next.js (App Router, TypeScript), Tailwind, shadcn/ui, Prisma with PostgreSQL, Auth.js. Create the Prisma schema from section 5 (all tables), a seed script with 1 student, 1 client and a sample class schedule, and a basic layout. Do not build any other pages yet. Stop and show me what you did.
```

4. After each prompt, run the app, check it in the browser, and commit if it works.
5. Follow the prompt order in section 9 and the day plan in section 8, one page per prompt.
6. At the end of each day, send the friend a short update with a screenshot.
