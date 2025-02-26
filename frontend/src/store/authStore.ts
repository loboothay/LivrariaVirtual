import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  signIn: async (email, password) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError) {
        if (authError.message.includes('connect error')) {
          throw new Error('Erro de conexão com o servidor. Por favor, tente novamente em alguns instantes.');
        }
        if (authError.message === 'Invalid login credentials') {
          throw new Error('Invalid login credentials');
        }
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error('Usuário não encontrado');
      }

      // Get user profile data
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .upsert([
            {
              id: authData.user.id,
              name: authData.user.user_metadata.name || email.split('@')[0],
              email: authData.user.email
            }
          ])
          .select()
          .single();

        if (createError) throw createError;
        
        set({ 
          user: {
            id: authData.user.id,
            email: authData.user.email!,
            name: newProfile.name,
            created_at: newProfile.created_at
          }
        });
      } else {
        set({ 
          user: {
            id: authData.user.id,
            email: authData.user.email!,
            name: profile.name,
            created_at: profile.created_at
          }
        });
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    }
  },
  signUp: async (name, email, password) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      
      if (authError) {
        if (authError.message.includes('connect error')) {
          throw new Error('Erro de conexão com o servidor. Por favor, tente novamente em alguns instantes.');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Erro ao criar usuário. Por favor, tente novamente.');
      }

      // Create user profile using upsert to handle potential race conditions
      const { error: profileError } = await supabase
        .from('users')
        .upsert([
          {
            id: authData.user.id,
            name,
            email
          }
        ]);

      if (profileError) {
        // If there's an error creating the profile, delete the auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error('Erro ao criar perfil do usuário. Por favor, tente novamente.');
      }

      // Clear the user state after successful registration
      set({ user: null });
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      throw error;
    }
  },
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  },
}));