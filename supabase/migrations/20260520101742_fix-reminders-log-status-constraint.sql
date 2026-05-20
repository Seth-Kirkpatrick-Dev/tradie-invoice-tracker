-- Add 'queued' to reminders_log status constraint.
-- 'queued' is used when Resend is not yet configured; 'failed' when a send attempt errors.
alter table public.reminders_log
  drop constraint if exists reminders_log_status_check;

alter table public.reminders_log
  add constraint reminders_log_status_check
  check (status in ('sent', 'failed', 'queued'));