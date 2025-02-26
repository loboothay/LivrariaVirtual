import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Sidebar } from './Sidebar';
import { LogOut, BookOpen, ArrowLeftRight, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Book, Loan } from '../types';

interface LoanFormData {
  bookId: string;
  expectedReturnDate: string;
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

const initialFormData: LoanFormData = {
  bookId: '',
  expectedReturnDate: ''
};

export const Loans = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [formData, setFormData] = useState<LoanFormData>(initialFormData);
  const [loans, setLoans] = useState<(Loan & { books: Book })[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [returningLoan, setReturningLoan] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks();
    fetchLoans();
  }, []);

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .gt('quantity', 0)
        .order('title');

      if (error) throw error;

      setBooks(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar livros: ' + error.message);
    }
  };

  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from('loans')
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

      setLoans(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar empréstimos:', error.message);
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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      // Check if user already has an active loan for this book
      const { data: existingLoan, error: checkError } = await supabase
        .from('loans')
        .select('id')
        .eq('book_id', formData.bookId)
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingLoan) {
        throw new Error('Você já tem um empréstimo ativo deste livro');
      }

      // Create new loan
      const { data: newLoan, error: loanError } = await supabase
        .from('loans')
        .insert([
          {
            book_id: formData.bookId,
            user_id: user?.id,
            expected_return_date: formData.expectedReturnDate,
            returned_at: null,
            status: 'active'
          }
        ])
        .select(`
          *,
          books (
            id,
            title,
            author,
            image_url
          )
        `)
        .single();

      if (loanError) throw loanError;

      // Decrement book quantity
      const { error: quantityError } = await supabase
        .rpc('decrement_book_quantity', {
          book_id: formData.bookId
        });

      if (quantityError) throw quantityError;

      // Reset form
      setFormData(initialFormData);
      
      // Reload data
      await fetchBooks();
      await fetchLoans();

      toast.success('Livro emprestado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao pegar livro emprestado: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

const handleReturn = async (loanId: string, bookId: string) => {
  try {
    setReturningLoan(loanId);
    
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    // Log detalhado antes da tentativa
    console.log('Tentativa de atualização:', { 
      loanId, 
      bookId, 
      returnDate: formattedDate 
    });

    // Tentativa de atualização com verificação explícita
    const { data, error } = await supabase
      .from('loans')
      .update({ 
        returned_at: formattedDate, 
        status: 'inactive'
      })
      .eq('id', loanId);
    
    // Log de erro se existir
    if (error) {
      console.error('Erro COMPLETO na atualização:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    // Verificação adicional após atualização
    const { data: verifyData, error: verifyError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    console.log('Dados após verificação:', verifyData);
    
    // Incrementar quantidade do livro
    const { error: incrementError } = await supabase
      .rpc('increment_book_quantity', { book_id: bookId });
    
    if (incrementError) {
      console.error('Erro ao incrementar quantidade do livro:', incrementError);
      throw incrementError;
    }
    
    // Recarregar dados
    await fetchLoans();
    await fetchBooks();
    
    toast.success('Livro devolvido com sucesso!');
  } catch (error: any) {
    console.error('Erro completo na devolução:', error);
    toast.error('Erro ao devolver livro: ' + (error.message || 'Erro desconhecido'));
  } finally {
    setReturningLoan(null);
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
                <h1 className="text-2xl font-bold text-gray-900">Empréstimos</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Gerencie seus empréstimos de livros
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
          {/* New Loan Form */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Novo Empréstimo
            </h2>
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
                  >
                    <option value="">Selecione um livro</option>
                    {books.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title} ({book.quantity} disponíveis)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="expectedReturnDate" className="input-label">
                    Data de Devolução
                  </label>
                  <input
                    type="date"
                    id="expectedReturnDate"
                    name="expectedReturnDate"
                    value={formData.expectedReturnDate}
                    onChange={handleInputChange}
                    className="input-primary"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  type="submit" 
                  className="btn-primary flex items-center gap-2"
                  disabled={loading}
                >
                  <BookOpen className="h-5 w-5" />
                  {loading ? 'Processando...' : 'Pegar Emprestado'}
                </button>
              </div>
            </form>
          </div>

          {/* Loans Table */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Meus Empréstimos
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Livro
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Data do Empréstimo
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Data de Devolução
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && loans.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        Carregando empréstimos...
                      </td>
                    </tr>
                  ) : loans.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        Nenhum empréstimo encontrado
                      </td>
                    </tr>
                  ) : (
                    loans.map((loan) => (
                      <tr key={loan.id}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-14 bg-gray-100 rounded">
                              {loan.books.image_url && (
                                <img
                                  src={loan.books.image_url}
                                  alt={loan.books.title}
                                  className="w-full h-full object-cover rounded"
                                />
                              )}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">{loan.books.title}</span>
                              <p className="text-sm text-gray-500">{loan.books.author}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(loan.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(loan.expected_return_date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              loan.status === 'inactive'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {loan.status === 'inactive' ? 'Devolvido' : 'Em andamento'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end">
                            {loan.status === 'active' ? (
                              <button
                                onClick={() => handleReturn(loan.id, loan.book_id)}
                                className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                                disabled={returningLoan === loan.id}
                              >
                                <ArrowLeftRight className="h-4 w-4" />
                                {returningLoan === loan.id ? 'Devolvendo...' : 'Devolver'}
                              </button>
                            ) : (
                              <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                                <Check className="h-4 w-4" />
                                Devolvido
                              </span>
                            )}
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
    </div>
  );
};