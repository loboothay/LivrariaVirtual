import React from 'react';
import { NavLink } from 'react-router-dom';
import { Book, LayoutDashboard, Library, ListFilter, Star, BookOpen } from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Book, label: 'Livros', path: '/livros' },
  { icon: ListFilter, label: 'Categorias', path: '/categorias' },
  { icon: Star, label: 'Resenhas', path: '/resenhas' },
  { icon: BookOpen, label: 'Empréstimos', path: '/emprestimos' },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <Library className="h-8 w-8 text-primary-600" />
          <h1 className="text-xl font-semibold text-gray-900">Biblioteca</h1>
        </div>
        
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};