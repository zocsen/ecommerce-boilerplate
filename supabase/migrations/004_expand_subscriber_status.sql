/* ------------------------------------------------------------------ */
/*  Migration 004: Expand subscriber_status enum + engagement tracking */
/*                                                                     */
/*  Adds 'bounced' and 'complained' values to the subscriber_status    */
/*  enum so webhook handlers can record the actual reason a            */
/*  subscriber was disabled, rather than mapping everything to         */
/*  'unsubscribed'.                                                    */
/*                                                                     */
/*  Also adds engagement tracking columns used by Resend webhook       */
/*  events (opened, clicked) for subscriber segmentation.              */
/* ------------------------------------------------------------------ */

-- 1. Expand the subscriber_status enum
ALTER TYPE subscriber_status ADD VALUE IF NOT EXISTS 'bounced';
ALTER TYPE subscriber_status ADD VALUE IF NOT EXISTS 'complained';

-- 2. Add engagement tracking columns to subscribers
ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS last_opened_at  timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_clicked_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS open_count      int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bounce_count    int NOT NULL DEFAULT 0;

-- 3. Index on status for efficient filtering
-- (Already exists from 001 as idx_subscribers_status, but verify)
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers (status);

-- 4. Partial index for active subscribers with engagement (useful for segmentation)
CREATE INDEX IF NOT EXISTS idx_subscribers_engaged
  ON subscribers (last_opened_at DESC NULLS LAST)
  WHERE status = 'subscribed';
