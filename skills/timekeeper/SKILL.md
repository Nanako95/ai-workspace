---
name: timekeeper
description: Check exact local time and schedule non-blocking reminders or delayed Codex callbacks. Use when the user asks what time/date it is, references relative time such as "in 5 minutes", "tomorrow morning", or "after lunch", asks Codex to wait, set a timer, remind them later, or run a task at a future time.
---

# Timekeeper

Use this skill to ground time-sensitive requests in the machine's local clock and hand future work to Windows Task Scheduler without blocking the current chat.

## Workflow

1. Get exact current time before interpreting time-sensitive wording:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\timekeeper\scripts\now.ps1" -Json
   ```

2. Convert relative times to an absolute timestamp in the local timezone and state it back to the user when it affects behavior.

3. For "remind me" or timer requests, register a local Windows reminder and return immediately:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\timekeeper\scripts\schedule-reminder.ps1" -DelayMinutes 5 -Message "Drink water."
   ```

4. Use an in-turn wait only when the user explicitly says the current chat should wait and then answer. Do not use long `Start-Sleep` for ordinary reminders.

5. If the task requires Codex reasoning, file edits, messages, or tools at a future time, register a scheduled Codex callback and return immediately:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\timekeeper\scripts\schedule-codex-task.ps1" -DelayMinutes 5 -Prompt "Do the requested task." -WorkDir "C:\Users\shenqing01"
   ```

6. For calendar-like times, prefer `-At` with an ISO-like local timestamp:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\timekeeper\scripts\schedule-codex-task.ps1" -At "2026-07-17 15:30" -Prompt "Send the status summary." -WorkDir "C:\Users\shenqing01"
   ```

## Scheduling Notes

- Reminder tasks show a Windows message and do not run Codex.
- Scheduled callbacks use `codex exec` in a new session. They do not resume the current conversation.
- Scheduled tasks run only when the current Windows user is logged on.
- Reminder files and logs are under `%USERPROFILE%\.codex\timekeeper\reminders`; Codex callback files and logs are under `%USERPROFILE%\.codex\timekeeper\tasks`.
- Unattended Codex callbacks use `--ask-for-approval never` and `--sandbox workspace-write`. Tasks that require interactive approval, extra filesystem access, or network access may fail; check the generated log path.
- Never occupy the current chat for normal reminder/timer requests when a background scheduled task can do the job.
