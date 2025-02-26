/*
  # Enable global activity view

  1. Changes
    - Update RLS policies to allow authenticated users to view all loans and reviews
    - Remove user-specific restrictions for SELECT operations
    
  2. Security
    - Maintains write restrictions (users can only modify their own data)
    - Only allows read access to non-sensitive data
*/

-- Drop existing select policies if they exist
DROP POLICY IF EXISTS "Users can read their own loans" ON loans;
DROP POLICY IF EXISTS "Users can read all reviews" ON reviews;

-- Create new policies for global view
CREATE POLICY "Users can view all loans"
  ON loans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view all reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);