/*
  # Update Categories RLS Policies

  1. Changes
    - Add policies to allow authenticated users to manage categories
    - Enable full CRUD operations for authenticated users

  2. Security
    - Enable RLS on categories table
    - Add policies for SELECT, INSERT, UPDATE, and DELETE operations
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read all categories" ON categories;

-- Create new policies for categories
CREATE POLICY "Enable read access for all authenticated users"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for all authenticated users"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for all authenticated users"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete access for all authenticated users"
  ON categories FOR DELETE
  TO authenticated
  USING (true);