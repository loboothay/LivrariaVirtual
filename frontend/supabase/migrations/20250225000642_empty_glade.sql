/*
  # Add image_url column to books table

  1. Changes
    - Add `image_url` column to `books` table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'books' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE books ADD COLUMN image_url text;
  END IF;
END $$;