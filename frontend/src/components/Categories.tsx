import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Sidebar } from './Sidebar';
import { LogOut, Pencil, Trash, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Category } from '../types';

interface CategoryFormData {
  name: string;
  description: string;
}

interface DeleteModalProps {
  isOpen: boolean;
  category: Category | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const DeleteModal = ({ isOpen, category, onConfirm, onCancel, isLoading }: DeleteModalProps) => {
  if (!isOpen || !category) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl transform transition-all">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        
        <div className="mt-4 text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Excluir Categoria
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Tem certeza que deseja excluir a categoria <span className="font-medium text-gray-900">"{category.name}"</span>? 
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

const initialFormData: CategoryFormData = {
  name: '',
  description: ''
};

export const Categories = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    category: Category | null;
  }>({
    isOpen: false,
    category: null
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCategories(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar categorias: ' + error.message);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name: formData.name,
            description: formData.description
          })
          .eq('id', editingCategory.id);

        if (error) throw error;

        toast.success('Categoria atualizada com sucesso!');
        setEditingCategory(null);
      } else {
        // Insert new category
        const { error } = await supabase
          .from('categories')
          .insert([{
            name: formData.name,
            description: formData.description
          }]);

        if (error) throw error;

        toast.success('Categoria cadastrada com sucesso!');
      }

      setFormData(initialFormData);
      fetchCategories();
    } catch (error: any) {
      toast.error(`Erro ao ${editingCategory ? 'atualizar' : 'cadastrar'} categoria: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description
    });
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setFormData(initialFormData);
  };

  const openDeleteModal = (category: Category) => {
    setDeleteModal({ isOpen: true, category });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, category: null });
  };

  const handleDelete = async () => {
    if (!deleteModal.category) return;

    try {
      setLoading(true);

      // Check if there are any books using this category
      const { data: books, error: booksError } = await supabase
        .from('books')
        .select('id')
        .eq('category_id', deleteModal.category.id);

      if (booksError) throw booksError;

      if (books && books.length > 0) {
        throw new Error('Não é possível excluir uma categoria que possui livros cadastrados');
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', deleteModal.category.id);

      if (error) throw error;

      toast.success('Categoria excluída com sucesso!');
      closeDeleteModal();
      fetchCategories();
    } catch (error: any) {
      toast.error('Erro ao excluir categoria: ' + error.message);
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
                <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
                <p className="text-sm text-gray-500 mt-1">Gerencie as categorias de livros</p>
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
          {/* Category Form */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCategory ? 'Editar Categoria' : 'Cadastrar Nova Categoria'}
              </h2>
              {editingCategory && (
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
              <div>
                <label htmlFor="name" className="input-label">Nome</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input-primary"
                  placeholder="Digite o nome da categoria"
                  required
                />
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
                  placeholder="Digite a descrição da categoria"
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
                    editingCategory ? 'Atualizando...' : 'Cadastrando...'
                  ) : (
                    editingCategory ? 'Atualizar Categoria' : 'Cadastrar Categoria'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Categories List */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Lista de Categorias</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Nome</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Descrição</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && categories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-500">
                        Carregando categorias...
                      </td>
                    </tr>
                  ) : categories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-500">
                        Nenhuma categoria cadastrada
                      </td>
                    </tr>
                  ) : (
                    categories.map((category) => (
                      <tr key={category.id}>
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900">{category.name}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{category.description}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              className="p-1 text-blue-500 hover:text-blue-600"
                              onClick={() => handleEdit(category)}
                              disabled={loading}
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                            <button 
                              className="p-1 text-red-500 hover:text-red-600"
                              onClick={() => openDeleteModal(category)}
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
        category={deleteModal.category}
        onConfirm={handleDelete}
        onCancel={closeDeleteModal}
        isLoading={loading}
      />
    </div>
  );
};