/*
  # Initial Schema Setup

  1. Tables
    - users
      - id (uuid, primary key)
      - name (text)
      - email (text, unique)
      - created_at (timestamp)
    
    - books
      - id (uuid, primary key)
      - title (text)
      - author (text)
      - isbn (text, unique)
      - category_id (uuid, foreign key)
      - description (text)
      - published_date (date)
      - created_at (timestamp)
    
    - categories
      - id (uuid, primary key)
      - name (text)
      - description (text)
      - created_at (timestamp)
    
    - reviews
      - id (uuid, primary key)
      - book_id (uuid, foreign key)
      - user_id (uuid, foreign key)
      - rating (integer)
      - comment (text)
      - created_at (timestamp)
    
    - loans
      - id (uuid, primary key)
      - book_id (uuid, foreign key)
      - user_id (uuid, foreign key)
      - expected_return_date (timestamp)
      - returned_at (timestamp)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create tables
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  isbn text UNIQUE NOT NULL,
  category_id uuid REFERENCES categories(id),
  description text,
  published_date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES books(id),
  user_id uuid REFERENCES users(id),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES books(id),
  user_id uuid REFERENCES users(id),
  expected_return_date timestamptz NOT NULL,
  returned_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read all categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read all books"
  ON books FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read all reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own loans"
  ON loans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create loans"
  ON loans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);