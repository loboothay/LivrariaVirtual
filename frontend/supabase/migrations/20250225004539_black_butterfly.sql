/*
  # Add index for loan status

  1. Changes
    - Add index on returned_at column for better query performance
    - Add index on user_id and book_id columns for faster lookups
    - Add index on created_at for sorting optimization

  2. Notes
    - Indexes will improve performance of loan status queries
    - Compound index on (user_id, book_id) will optimize loan checks
*/

-- Add index for loan status queries
CREATE INDEX IF NOT EXISTS idx_loans_returned_at ON loans (returned_at);

-- Add compound index for user and book lookups
CREATE INDEX IF NOT EXISTS idx_loans_user_book ON loans (user_id, book_id);

-- Add index for sorting by created_at
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans (created_at DESC);