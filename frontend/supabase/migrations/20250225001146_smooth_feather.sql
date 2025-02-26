/*
  # Add favorites table and functionality

  1. New Tables
    - `book_favorites`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `book_id` (uuid, references books)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on book_favorites table
    - Add policies for users to manage their favorites
*/

-- Create favorites table
CREATE TABLE IF NOT EXISTS book_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  book_id uuid REFERENCES books(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- Enable RLS
ALTER TABLE book_favorites ENABLE ROW LEVEL SECURITY;

-- Policies for book_favorites
CREATE POLICY "Users can view their own favorites"
  ON book_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON book_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
  ON book_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);