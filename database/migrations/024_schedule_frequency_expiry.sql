ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS expiry_date DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schedules_frequency_check'
  ) THEN
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_frequency_check
      CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_schedules_active_frequency
  ON schedules(is_active, next_due_date, expiry_date);
