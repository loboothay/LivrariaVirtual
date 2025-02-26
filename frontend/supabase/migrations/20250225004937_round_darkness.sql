/*
  # Add loan status handling

  1. Changes
    - Add function to check loan status
    - Add status column to loans table
    - Add trigger to automatically update status
    - Add index on status column for better performance

  2. Notes
    - Status will be automatically maintained by the trigger
    - Values: 'active' or 'returned'
*/

-- Create an enum type for loan status
CREATE TYPE loan_status AS ENUM ('active', 'returned');

-- Add status column
ALTER TABLE loans ADD COLUMN IF NOT EXISTS status loan_status;

-- Create function to determine loan status
CREATE OR REPLACE FUNCTION get_loan_status(returned_at timestamptz)
RETURNS loan_status
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CASE 
    WHEN returned_at IS NOT NULL THEN 'returned'::loan_status
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

-- Add NOT NULL constraint after setting all values
ALTER TABLE loans ALTER COLUMN status SET NOT NULL;