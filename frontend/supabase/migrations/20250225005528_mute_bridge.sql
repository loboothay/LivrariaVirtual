/*
  # Update loans table status handling

  1. Changes
    - Drop existing loan_status type and recreate it with correct values
    - Add status column with new type
    - Add trigger for automatic status updates
*/

-- First drop dependent objects
DROP TRIGGER IF EXISTS set_loan_status ON loans;
DROP FUNCTION IF EXISTS update_loan_status();
DROP FUNCTION IF EXISTS get_loan_status(timestamptz);

-- Remove the status column if it exists
ALTER TABLE loans DROP COLUMN IF EXISTS status;

-- Drop the type if it exists (with CASCADE to handle dependencies)
DROP TYPE IF EXISTS loan_status CASCADE;

-- Create loan status type
CREATE TYPE loan_status AS ENUM ('active', 'inactive');

-- Add status column
ALTER TABLE loans ADD COLUMN status loan_status NOT NULL DEFAULT 'active';

-- Create function to determine loan status
CREATE OR REPLACE FUNCTION get_loan_status(returned_at timestamptz)
RETURNS loan_status
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CASE 
    WHEN returned_at IS NOT NULL THEN 'inactive'::loan_status
    ELSE 'active'::loan_status
  END;
END;
$$;

-- Create trigger function to update status
CREATE OR REPLACE FUNCTION update_loan_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.status := get_loan_status(NEW.returned_at);
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER set_loan_status
  BEFORE INSERT OR UPDATE ON loans
  FOR EACH ROW
  EXECUTE FUNCTION update_loan_status();

-- Update existing loans
UPDATE loans SET status = get_loan_status(returned_at);

-- Add index on status column
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans (status);