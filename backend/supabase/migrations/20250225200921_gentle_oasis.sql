/*
  # Virtual Bookstore Database Schema

  1. New Tables
    - `books`
      - `id` (uuid, primary key)
      - `title` (text)
      - `author` (text)
      - `isbn` (text)
      - `category_id` (uuid, foreign key)
      - `description` (text)
      - `published_date` (date)
      - `image_url` (text)
      - `quantity` (integer)
      - `created_at` (timestamp)

    - `categories`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `created_at` (timestamp)

    - `users`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `created_at` (timestamp)

    - `reviews`
      - `id` (uuid, primary key)
      - `book_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `rating` (integer)
      - `comment` (text)
      - `created_at` (timestamp)

    - `loans`
      - `id` (uuid, primary key)
      - `book_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `expected_return_date` (date)
      - `returned_at` (date)
      - `status` (text)
      - `created_at` (timestamp)

    - `book_favorites`
      - `id` (uuid, primary key)
      - `book_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create tables
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
  isbn text,
  category_id uuid REFERENCES categories(id),
  description text,
  published_date date,
  image_url text,
  quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
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
  expected_return_date date NOT NULL,
  returned_at date,
  status text CHECK (status IN ('active', 'returned', 'overdue')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS book_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES books(id),
  user_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(book_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public categories access" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public books access" ON books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public users access" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read own reviews" ON reviews FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can read own loans" ON loans FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can read own favorites" ON book_favorites FOR SELECT TO authenticated USING (user_id = auth.uid());