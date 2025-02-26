/*
  # Add RLS policies for books table

  1. Security
    - Add policies to allow authenticated users to:
      - Insert new books
      - Update existing books
      - Delete books
*/

-- Policy to allow authenticated users to insert books
CREATE POLICY "Enable insert access for all authenticated users"
  ON books FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy to allow authenticated users to update books
CREATE POLICY "Enable update access for all authenticated users"
  ON books FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy to allow authenticated users to delete books
CREATE POLICY "Enable delete access for all authenticated users"
  ON books FOR DELETE
  TO authenticated
  USING (true);