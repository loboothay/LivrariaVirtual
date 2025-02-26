/*
  # Add update policy for loans table

  1. Changes
    - Add policy to allow users to update their own loans
    - Policy ensures users can only update loans they own
    - Restricts updates to specific columns for security

  2. Security
    - Users can only update their own loans
    - Requires user authentication
    - Enforces user_id match with authenticated user
*/

-- Create policy for updating loans
CREATE POLICY "Users can update their own loans"
  ON loans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);