import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { FloatingNav } from './FloatingNav';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { userProfile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <FloatingNav />

      <div className="flex-1 ml-64">
        <nav className="bg-white shadow-sm border-b border-gray-200 print:hidden">
          <div className="px-4">
            <div className="flex justify-between items-center h-14">
              <div className="flex items-center">
                <h1 className="text-lg font-bold text-gray-900">SiteFlow 360 - Kalite Yönetim Sistemi</h1>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{userProfile?.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {userProfile?.role === 'super_admin' && 'Süper Admin'}
                    {userProfile?.role === 'admin' && 'Admin'}
                    {userProfile?.role === 'user' && 'Kullanıcı'}
                  </p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  title="Çıkış Yap"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="px-4 py-4">
          {children}
        </main>
      </div>
    </div>
  );
}
