-- Additive only: nullable timezone (IANA) on User for TZ-aware reminders.

ALTER TABLE "User" ADD COLUMN "timezone" TEXT;
