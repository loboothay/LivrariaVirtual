export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category_id: string;
  description: string;
  image_url: string;
  quantity: number;
  published_date?: string;
  created_at: string;
  categories?: {
    name: string;
  };
  is_favorite?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Review {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Loan {
  id: string;
  book_id: string;
  user_id: string;
  expected_return_date: string;
  returned_at: string | null;
  created_at: string;
  status: 'active' | 'inactive';
}

export interface BookFavorite {
  id: string;
  user_id: string;
  book_id: string;
  created_at: string;
}