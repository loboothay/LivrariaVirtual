/*
  # Add quantity column to books table

  1. Changes
    - Add `quantity` column to `books` table with a default value of 1
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'books' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE books ADD COLUMN quantity integer NOT NULL DEFAULT 1;
  END IF;
END $$;