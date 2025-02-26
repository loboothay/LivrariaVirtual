/*
  # Add database functions for loan management

  1. New Functions
    - `decrement_book_quantity`: Safely decrements a book's quantity
    - `increment_book_quantity`: Safely increments a book's quantity

  2. Security
    - Functions are accessible to authenticated users only
*/

-- Function to safely decrement book quantity
CREATE OR REPLACE FUNCTION decrement_book_quantity(book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE books
  SET quantity = quantity - 1
  WHERE id = book_id AND quantity > 0;
END;
$$;

-- Function to safely increment book quantity
CREATE OR REPLACE FUNCTION increment_book_quantity(book_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE books
  SET quantity = quantity + 1
  WHERE id = book_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION decrement_book_quantity TO authenticated;
GRANT EXECUTE ON FUNCTION increment_book_quantity TO authenticated;