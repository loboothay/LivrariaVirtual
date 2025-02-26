import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Sidebar } from './Sidebar';
import { 
  Book, 
  LogOut,
  Users,
  BookOpen,
  Star,
  Search,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Stats {
  totalBooks: number;
  totalUsers: number;
  activeLoans: number;
  totalReviews: number;
}

interface PopularBook {
  id: string;
  title: string;
  image_url: string | null;
  average_rating: number;
  total_reviews: number;
}

interface Activity {
  id: string;
  type: 'loan' | 'review';
  user_name: string;
  book_title: string;
  created_at: string;
}

const StatCard = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
      </div>
      <div className="bg-primary-50 p-3 rounded-lg">
        <Icon className="h-6 w-6 text-primary-600" />
      </div>
    </div>
  </div>
);

const ActivityItem = ({ type, user_name, book_title, created_at }: Activity) => {
  const formattedDate = new Date(created_at).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`w-2 h-2 rounded-full ${type === 'loan' ? 'bg-green-500' : 'bg-blue-500'}`} />
      <div className="flex-1">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{user_name}</span> {type === 'loan' ? 'emprestou' : 'avaliou'} <span className="font-medium">"{book_title}"</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">{formattedDate}</p>
      </div>
    </div>
  );
};

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
};

const PopularBookCard = ({ title, image_url, average_rating, total_reviews }: PopularBook) => (
  <div className="flex items-center gap-4 py-3">
    <div className="w-12 h-16 bg-gray-100 rounded overflow-hidden">
      {image_url && (
        <img 
          src={image_url} 
          alt={title}
          className="w-full h-full object-cover"
        />
      )}
    </div>
    <div>
      <h4 className="font-medium text-gray-900">{title}</h4>
      <div className="flex items-center gap-2 mt-1">
        <StarRating rating={average_rating} />
        <span className="text-sm text-gray-500">
          ({total_reviews} {total_reviews === 1 ? 'avaliação' : 'avaliações'})
        </span>
      </div>
    </div>
  </div>
);

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalBooks: 0,
    totalUsers: 0,
    activeLoans: 0,
    totalReviews: 0
  });
  const [popularBooks, setPopularBooks] = useState<PopularBook[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch all stats in parallel for better performance
      const [
        { count: totalBooks },
        { count: totalUsers },
        { count: activeLoans },
        { count: totalReviews },
        { data: popularBooksData },
        { data: recentLoans },
        { data: recentReviews }
      ] = await Promise.all([
        // Total books
        supabase
          .from('books')
          .select('*', { count: 'exact', head: true }),
        
        // Total users
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true }),
        
        // Active loans
        supabase
          .from('loans')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        
        // Total reviews
        supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true }),
        
        // Popular books (highest rated with at least 1 review)
        supabase
          .from('reviews')
          .select(`
            book_id,
            books (
              id,
              title,
              image_url
            ),
            rating
          `)
          .order('created_at', { ascending: false }),
        
        // Recent loans with user names
        supabase
          .from('loans')
          .select(`
            id,
            created_at,
            users!loans_user_id_fkey (
              name
            ),
            books (
              title
            )
          `)
          .order('created_at', { ascending: false })
          .limit(10),
        
        // Recent reviews with user names
        supabase
          .from('reviews')
          .select(`
            id,
            created_at,
            users!reviews_user_id_fkey (
              name
            ),
            books (
              title
            )
          `)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      // Process popular books - calculate average rating and total reviews
      const bookStats = popularBooksData?.reduce((acc: Record<string, {
        total_rating: number;
        total_reviews: number;
        book: any;
      }>, review) => {
        if (!review.books || !review.book_id || !review.rating) return acc;
        
        if (!acc[review.book_id]) {
          acc[review.book_id] = {
            total_rating: 0,
            total_reviews: 0,
            book: review.books
          };
        }
        acc[review.book_id].total_rating += review.rating;
        acc[review.book_id].total_reviews += 1;
        return acc;
      }, {}) || {};

      const popularBooksProcessed = Object.entries(bookStats)
        .map(([_, { total_rating, total_reviews, book }]) => ({
          id: book.id,
          title: book.title,
          image_url: book.image_url,
          average_rating: Math.round((total_rating / total_reviews) * 10) / 10,
          total_reviews
        }))
        .sort((a, b) => b.average_rating - a.average_rating)
        .slice(0, 4);

      // Combine and sort activities
      const activities: Activity[] = [
        ...(recentLoans?.map(loan => ({
          id: loan.id,
          type: 'loan' as const,
          user_name: loan.users?.name || 'Usuário',
          book_title: loan.books?.title || 'Livro',
          created_at: loan.created_at
        })) || []),
        ...(recentReviews?.map(review => ({
          id: review.id,
          type: 'review' as const,
          user_name: review.users?.name || 'Usuário',
          book_title: review.books?.title || 'Livro',
          created_at: review.created_at
        })) || [])
      ].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 5);

      // Update states
      setStats({
        totalBooks: totalBooks || 0,
        totalUsers: totalUsers || 0,
        activeLoans: activeLoans || 0,
        totalReviews: totalReviews || 0
      });
      setPopularBooks(popularBooksProcessed);
      setRecentActivities(activities);
    } catch (error: any) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="pl-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Bem-vindo à sua biblioteca virtual</p>
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
          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar livros por título, autor ou ISBN..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Carregando dados do dashboard...
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard icon={Book} label="Total de Livros" value={stats.totalBooks} />
                <StatCard icon={Users} label="Usuários Ativos" value={stats.totalUsers} />
                <StatCard icon={BookOpen} label="Empréstimos Ativos" value={stats.activeLoans} />
                <StatCard icon={Star} label="Resenhas" value={stats.totalReviews} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Popular Books */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Livros Mais Bem Avaliados</h2>
                    <button className="text-primary-600 text-sm font-medium flex items-center gap-2 hover:text-primary-700">
                      Ver todos
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {popularBooks.length === 0 ? (
                      <p className="text-center py-4 text-gray-500">
                        Nenhum livro avaliado ainda
                      </p>
                    ) : (
                      popularBooks.map((book) => (
                        <PopularBookCard key={book.id} {...book} />
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Atividades Recentes</h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {recentActivities.length === 0 ? (
                      <p className="text-center py-4 text-gray-500">
                        Nenhuma atividade recente
                      </p>
                    ) : (
                      recentActivities.map((activity) => (
                        <ActivityItem key={activity.id} {...activity} />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};