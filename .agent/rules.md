# Student VA-Hub — Agent Rules
#
# Read docs/SPEC.md (sections 5, 6, 13, 14) and docs/DESIGN.md before any task.
# This file applies to every Antigravity session on this project.

## Project
Project: Student VA-Hub
Stack: Next.js App Router, TypeScript, Tailwind v4, shadcn/ui, Prisma 8, PostgreSQL, Auth.js (NextAuth v5 beta), Zod, date-fns, Vitest.
One client per student in v1.0 (enforced by @@unique([studentId]) on ClientStudentLink).

## Time and timezone rules
- Store ALL times as UTC in the database (Task.startAt, Task.dueAt, TimeLog.timeIn, TimeLog.timeOut, BlockedDate.dateStart/dateEnd, Notification.createdAt).
- ClassSchedule and Availability use dayOfWeek (0-6) + startMinutes + endMinutes (Int, minutes from midnight, Asia/Manila local time). Do NOT use DateTime on these tables.
- Display all times to users in Asia/Manila (UTC+8). Use date-fns-tz or manual offset for conversion.

## Conflict Detector
- Conflict logic lives in src/lib/conflict.ts as pure functions only — no Prisma, no fetch inside.
- Signature: checkConflict(task, classes, availability, existingTasks, maxHoursPerDay) -> { ok, conflicts: [{ type, message }] }
- Class overlap = BLOCK (client cannot submit). Exceeds available hours = WARN only (client can still send).
- The Client NEVER sees class subject names, only "In class".
- Write Vitest unit tests for every rule in SPEC.md section 6 before wiring to the UI.
- Never skip or weaken conflict tests.

## API and security rules
- Validate every API route input with Zod.
- Check the user's role (STUDENT | CLIENT) on every API route and server action.
- Never expose class subject names to CLIENT role.
- Role checks must live in the backend (server actions / route handlers), not only in UI buttons.

## UI and design rules
- Follow docs/DESIGN.md. Use only shadcn/ui components and Lucide icons.
- Mobile-first. Test at 375px width before desktop.
- Meaning colors: blue = class ONLY, green = VA work ONLY, red = conflict ONLY.
- No gradients, no glassmorphism, no glow, no emoji icons, no oversized border radius.
- Every screen needs empty, loading, and error states before it is considered done.
- Build one page per prompt. Do not add features outside v1.0 and v1.1 in SPEC.md.

## Scope guard
- Do not add features outside v1.0 and v1.1 listed in SPEC.md section 2.
- v2 items (Admin/Teacher role, grades, GCash payments, multiple clients per student) are out of scope and must be treated as change requests.

## Git and secrets
- Never commit .env to git. Use .env.example with placeholder values.
- Commit after each feature that works and passes its tests.
- prisma migrate dev (not db push) for schema changes.

