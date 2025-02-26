import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Sidebar } from './Sidebar';
import { LogOut, Star, Pencil, Trash, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Book } from '../types';

interface ReviewFormData {
  bookId: string;
  rating: number;
  comment: string;
}

interface Review {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  books: Book;
}

interface DeleteModalProps {
  isOpen: boolean;
  review: Review | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const DeleteModal = ({ isOpen, review, onConfirm, onCancel, isLoading }: DeleteModalProps) => {
  if (!isOpen || !review) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl transform transition-all">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        
        <div className="mt-4 text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Excluir Resenha
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Tem certeza que deseja excluir sua resenha do livro <span className="font-medium text-gray-900">"{review.books.title}"</span>? 
            Esta ação não pode ser desfeita.
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="flex-1 px-4 py-2 bg-red-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Excluindo...' : 'Sim, excluir'}
          </button>
        </div>
      </div>
    </div>
  );
};

const initialFormData: ReviewFormData = {
  bookId: '',
  rating: 5,
  comment: ''
};

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-5 w-5 ${
            star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
};

export const Reviews = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [formData, setFormData] = useState<ReviewFormData>(initialFormData);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    review: Review | null;
  }>({
    isOpen: false,
    review: null
  });

  useEffect(() => {
    fetchBooks();
    fetchReviews();
  }, []);

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('title');

      if (error) throw error;

      setBooks(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar livros: ' + error.message);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          books (
            id,
            title,
            author,
            image_url
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar resenhas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      if (editingReview) {
        // Update existing review
        const { error: updateError } = await supabase
          .from('reviews')
          .update({
            rating: formData.rating,
            comment: formData.comment
          })
          .eq('id', editingReview.id)
          .eq('user_id', user?.id);

        if (updateError) throw updateError;

        // Update local state
        setReviews(reviews.map(review => 
          review.id === editingReview.id
            ? {
                ...review,
                rating: formData.rating,
                comment: formData.comment
              }
            : review
        ));

        toast.success('Resenha atualizada com sucesso!');
        setEditingReview(null);
      } else {
        // Check if user has already reviewed this book
        const { data: existingReview, error: checkError } = await supabase
          .from('reviews')
          .select('id')
          .eq('book_id', formData.bookId)
          .eq('user_id', user?.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingReview) {
          throw new Error('Você já fez uma resenha para este livro');
        }

        // Create new review
        const { error: createError } = await supabase
          .from('reviews')
          .insert([
            {
              book_id: formData.bookId,
              user_id: user?.id,
              rating: formData.rating,
              comment: formData.comment
            }
          ]);

        if (createError) throw createError;

        toast.success('Resenha adicionada com sucesso!');
        fetchReviews(); // Fetch all reviews for new entries
      }

      setFormData(initialFormData);
    } catch (error: any) {
      toast.error(`Erro ao ${editingReview ? 'atualizar' : 'adicionar'} resenha: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setFormData({
      bookId: review.book_id,
      rating: review.rating,
      comment: review.comment
    });
  };

  const handleCancelEdit = () => {
    setEditingReview(null);
    setFormData(initialFormData);
  };

  const openDeleteModal = (review: Review) => {
    setDeleteModal({ isOpen: true, review });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, review: null });
  };

  const handleDelete = async () => {
    if (!deleteModal.review) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', deleteModal.review.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      setReviews(reviews.filter(review => review.id !== deleteModal.review?.id));
      toast.success('Resenha excluída com sucesso!');
      closeDeleteModal();
    } catch (error: any) {
      toast.error('Erro ao excluir resenha: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="pl-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Resenhas</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Gerencie as resenhas dos livros
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Olá, {user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-8">
          {/* Review Form */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingReview ? 'Editar Resenha' : 'Nova Resenha'}
              </h2>
              {editingReview && (
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                  Cancelar edição
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="bookId" className="input-label">
                    Livro
                  </label>
                  <select
                    id="bookId"
                    name="bookId"
                    value={formData.bookId}
                    onChange={handleInputChange}
                    className="input-primary"
                    required
                    disabled={editingReview !== null}
                  >
                    <option value="">Selecione um livro</option>
                    {books.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="rating" className="input-label">
                    Classificação
                  </label>
                  <select
                    id="rating"
                    name="rating"
                    value={formData.rating}
                    onChange={handleInputChange}
                    className="input-primary"
                    required
                  >
                    <option value="5">5 Estrelas</option>
                    <option value="4">4 Estrelas</option>
                    <option value="3">3 Estrelas</option>
                    <option value="2">2 Estrelas</option>
                    <option value="1">1 Estrela</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="comment" className="input-label">
                  Comentário
                </label>
                <textarea
                  id="comment"
                  name="comment"
                  value={formData.comment}
                  onChange={handleInputChange}
                  rows={4}
                  className="input-primary"
                  placeholder="Digite seu comentário sobre o livro"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button 
                  type="submit" 
                  className="btn-primary flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    editingReview ? 'Atualizando...' : 'Adicionando...'
                  ) : (
                    editingReview ? 'Atualizar Resenha' : 'Adicionar Resenha'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Reviews Grid */}
          <div className="grid grid-cols-2 gap-6">
            {loading && reviews.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-500">
                Carregando resenhas...
              </div>
            ) : reviews.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-500">
                Você ainda não tem nenhuma resenha
              </div>
            ) : (
              reviews.map((review) => (
                <div 
                  key={review.id} 
                  className={`bg-white rounded-xl border border-gray-100 p-6 ${
                    editingReview?.id === review.id ? 'ring-2 ring-primary-500' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="w-16 h-24 bg-gray-100 rounded flex-shrink-0">
                      {review.books.image_url && (
                        <img
                          src={review.books.image_url}
                          alt={review.books.title}
                          className="w-full h-full object-cover rounded"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{review.books.title}</h3>
                      <p className="text-sm text-gray-500">{review.books.author}</p>
                      <StarRating rating={review.rating} />
                      <p className="text-gray-600 mt-3">{review.comment}</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button 
                      className="p-1 text-blue-500 hover:text-blue-600"
                      onClick={() => handleEdit(review)}
                      disabled={loading}
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button 
                      className="p-1 text-red-500 hover:text-red-600"
                      onClick={() => openDeleteModal(review)}
                      disabled={loading}
                    >
                      <Trash className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        review={deleteModal.review}
        onConfirm={handleDelete}
        onCancel={closeDeleteModal}
        isLoading={loading}
      />
    </div>
  );
};