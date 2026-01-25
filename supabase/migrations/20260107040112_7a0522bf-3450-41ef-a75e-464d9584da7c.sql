-- Add is_public column to pools table
ALTER TABLE pools ADD COLUMN is_public boolean NOT NULL DEFAULT true;