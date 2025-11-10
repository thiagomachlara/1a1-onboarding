'use client';

import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
      router.push('/admin/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      setLoading(false);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo e Título */}
          <div className="flex items-center space-x-4">
            <Image
              src="/1a1-logo.png"
              alt="1A1 Cripto"
              width={120}
              height={36}
              priority
            />
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-lg font-semibold text-gray-900">
              Painel Administrativo
            </h1>
          </div>

          {/* User Info e Logout */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{userEmail}</p>
              <p className="text-xs text-gray-500">Administrador</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Menu de Navegação */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8 py-4 border-t border-gray-100">
          <Link
            href="/admin/empresas"
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              pathname?.startsWith('/admin/empresas')
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📊 Empresas
          </Link>
          <Link
            href="/admin/usuarios"
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              pathname === '/admin/usuarios'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            👥 Usuários
          </Link>
          <Link
            href="/admin/templates"
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              pathname === '/admin/templates'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📝 Templates
          </Link>
        </nav>
      </div>
    </header>
  );
}
