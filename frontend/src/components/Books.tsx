import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Sidebar } from './Sidebar';
import { LogOut, Star, Pencil, Trash, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Book, Category } from '../types';

interface BookFormData {
  title: string;
  author: string;
  isbn: string;
  imageUrl: string;
  quantity: number;
  category: string;
  description: string;
}

interface DeleteModalProps {
  isOpen: boolean;
  book: Book | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const DeleteModal = ({ isOpen, book, onConfirm, onCancel, isLoading }: DeleteModalProps) => {
  if (!isOpen || !book) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl transform transition-all">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        
        <div className="mt-4 text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Excluir Livro
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Tem certeza que deseja excluir o livro <span className="font-medium text-gray-900">"{book.title}"</span>? 
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

const initialFormData: BookFormData = {
  title: '',
  author: '',
  isbn: '',
  imageUrl: '',
  quantity: 1,
  category: '',
  description: ''
};

export const Books = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [formData, setFormData] = useState<BookFormData>(initialFormData);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    book: Book | null;
  }>({
    isOpen: false,
    book: null
  });

  useEffect(() => {
    fetchBooks();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      setCategories(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar categorias: ' + error.message);
    }
  };

  const fetchBooks = async () => {
    try {
      setLoading(true);
      
      // Fetch books with favorite status
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select(`
          *,
          categories (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (booksError) throw booksError;

      // Fetch user's favorites
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('book_favorites')
        .select('book_id')
        .eq('user_id', user?.id);

      if (favoritesError) throw favoritesError;

      // Create a Set of favorite book IDs for efficient lookup
      const favoriteBookIds = new Set(favoritesData?.map(f => f.book_id));

      // Combine books with favorite status
      const booksWithFavorites = booksData?.map(book => ({
        ...book,
        is_favorite: favoriteBookIds.has(book.id)
      })) || [];

      setBooks(booksWithFavorites);
    } catch (error: any) {
      toast.error('Erro ao carregar livros: ' + error.message);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 1 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // First, check if the category exists
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', formData.category)
        .single();

      if (categoryError) throw new Error('Categoria inválida');

      const bookData = {
        title: formData.title,
        author: formData.author,
        isbn: formData.isbn,
        image_url: formData.imageUrl,
        quantity: formData.quantity,
        category_id: categoryData.id,
        description: formData.description
      };

      if (editingBook) {
        // Update existing book
        const { error: updateError } = await supabase
          .from('books')
          .update(bookData)
          .eq('id', editingBook.id);

        if (updateError) throw updateError;

        toast.success('Livro atualizado com sucesso!');
        setEditingBook(null);
      } else {
        // Insert new book
        const { error: insertError } = await supabase
          .from('books')
          .insert([bookData]);

        if (insertError) throw insertError;

        toast.success('Livro cadastrado com sucesso!');
      }

      setFormData(initialFormData);
      fetchBooks();
    } catch (error: any) {
      toast.error(`Erro ao ${editingBook ? 'atualizar' : 'cadastrar'} livro: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      imageUrl: book.image_url || '',
      quantity: book.quantity,
      category: book.category_id,
      description: book.description
    });
  };

  const handleCancelEdit = () => {
    setEditingBook(null);
    setFormData(initialFormData);
  };

  const openDeleteModal = (book: Book) => {
    setDeleteModal({ isOpen: true, book });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, book: null });
  };

  const handleDelete = async () => {
    if (!deleteModal.book) return;

    try {
      setLoading(true);

      // First, delete any favorites associated with this book
      const { error: favoritesError } = await supabase
        .from('book_favorites')
        .delete()
        .eq('book_id', deleteModal.book.id);

      if (favoritesError) throw favoritesError;

      // Then delete the book
      const { error: bookError } = await supabase
        .from('books')
        .delete()
        .eq('id', deleteModal.book.id);

      if (bookError) throw bookError;

      toast.success('Livro excluído com sucesso!');
      closeDeleteModal();
      fetchBooks();
    } catch (error: any) {
      toast.error('Erro ao excluir livro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (book: Book) => {
    try {
      setFavoriteLoading(book.id);
      
      if (book.is_favorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('book_favorites')
          .delete()
          .eq('book_id', book.id)
          .eq('user_id', user?.id);

        if (error) throw error;
        
        toast.success('Livro removido dos favoritos');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('book_favorites')
          .insert([
            {
              book_id: book.id,
              user_id: user?.id
            }
          ]);

        if (error) throw error;
        
        toast.success('Livro adicionado aos favoritos');
      }

      // Update local state
      setBooks(books.map(b => 
        b.id === book.id 
          ? { ...b, is_favorite: !b.is_favorite }
          : b
      ));
    } catch (error: any) {
      toast.error('Erro ao atualizar favoritos: ' + error.message);
    } finally {
      setFavoriteLoading(null);
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
                <h1 className="text-2xl font-bold text-gray-900">Livros</h1>
                <p className="text-sm text-gray-500 mt-1">Gerencie sua coleção de livros</p>
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
          {/* Book Form */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingBook ? 'Editar Livro' : 'Cadastrar Novo Livro'}
              </h2>
              {editingBook && (
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
                  <label htmlFor="title" className="input-label">Título</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="input-primary"
                    placeholder="Digite o título do livro"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="author" className="input-label">Autor</label>
                  <input
                    type="text"
                    id="author"
                    name="author"
                    value={formData.author}
                    onChange={handleInputChange}
                    className="input-primary"
                    placeholder="Digite o nome do autor"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="isbn" className="input-label">ISBN</label>
                  <input
                    type="text"
                    id="isbn"
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleInputChange}
                    className="input-primary"
                    placeholder="Digite o ISBN"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="imageUrl" className="input-label">URL da Imagem</label>
                  <input
                    type="url"
                    id="imageUrl"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    className="input-primary"
                    placeholder="Digite a URL da imagem"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="quantity" className="input-label">Quantidade</label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    className="input-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="category" className="input-label">Categoria</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="input-primary"
                    required
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="input-label">Descrição</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="input-primary"
                  placeholder="Digite a descrição do livro"
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
                    editingBook ? 'Atualizando...' : 'Cadastrando...'
                  ) : (
                    editingBook ? 'Atualizar Livro' : 'Cadastrar Livro'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Books List */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Lista de Livros</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Título</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Autor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Categoria</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Quantidade</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        Carregando livros...
                      </td>
                    </tr>
                  ) : books.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        Nenhum livro cadastrado
                      </td>
                    </tr>
                  ) : (
                    books.map((book) => (
                      <tr key={book.id} className={editingBook?.id === book.id ? 'bg-blue-50' : ''}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={book.image_url || 'https://via.placeholder.com/40x56'} 
                              alt={book.title}
                              className="w-10 h-14 object-cover rounded"
                            />
                            <span className="font-medium text-gray-900">{book.title}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{book.author}</td>
                        <td className="py-3 px-4 text-gray-600">{book.categories?.name}</td>
                        <td className="py-3 px-4 text-gray-600">{book.quantity}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              className={`p-1 ${
                                book.is_favorite 
                                  ? 'text-yellow-500 hover:text-yellow-600' 
                                  : 'text-gray-400 hover:text-yellow-500'
                              } transition-colors`}
                              onClick={() => toggleFavorite(book)}
                              disabled={favoriteLoading === book.id}
                            >
                              <Star 
                                className={`h-5 w-5 ${book.is_favorite ? 'fill-current' : ''}`} 
                              />
                            </button>
                            <button 
                              className="p-1 text-blue-500 hover:text-blue-600"
                              onClick={() => handleEdit(book)}
                              disabled={loading}
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                            <button 
                              className="p-1 text-red-500 hover:text-red-600"
                              onClick={() => openDeleteModal(book)}
                              disabled={loading}
                            >
                              <Trash className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        book={deleteModal.book}
        onConfirm={handleDelete}
        onCancel={closeDeleteModal}
        isLoading={loading}
      />
    </div>
  );
};