/*
  # Fix loan status handling

  1. Changes
    - Drop existing trigger and functions to clean up
    - Recreate loan status handling with proper error handling
    - Add validation to ensure proper status transitions

  2. Security
    - Maintain RLS policies
    - Add validation to prevent invalid status changes
*/

-- First drop dependent objects
DROP TRIGGER IF EXISTS set_loan_status ON loans;
DROP FUNCTION IF EXISTS update_loan_status();
DROP FUNCTION IF EXISTS get_loan_status(timestamptz);

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
  -- Set initial status for new loans
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'active'::loan_status;
  -- Handle updates
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only allow status change if returned_at is being set
    IF NEW.returned_at IS NOT NULL AND OLD.returned_at IS NULL THEN
      NEW.status := 'inactive'::loan_status;
    ELSIF NEW.returned_at IS NULL AND OLD.returned_at IS NOT NULL THEN
      NEW.status := 'active'::loan_status;
    ELSE
      NEW.status := OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER set_loan_status
  BEFORE INSERT OR UPDATE ON loans
  FOR EACH ROW
  EXECUTE FUNCTION update_loan_status();

-- Update existing loans to ensure consistency
UPDATE loans 
SET status = CASE 
  WHEN returned_at IS NOT NULL THEN 'inactive'::loan_status
  ELSE 'active'::loan_status
END;