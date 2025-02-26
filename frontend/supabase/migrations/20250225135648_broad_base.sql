/*
  # Update user policies for better visibility

  1. Changes
    - Drop existing user select policy
    - Create new policy to allow all authenticated users to view user names
    - This ensures user names are visible across the application
*/

-- Drop existing select policy if it exists
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;

-- Create new policy to allow viewing of user names
CREATE POLICY "Users can view all user names"
  ON users FOR SELECT
  TO authenticated
  USING (true);