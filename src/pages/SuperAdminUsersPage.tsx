import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { supabase, UserProfile } from '../lib/supabase';
import { Shield, Search, ToggleLeft, ToggleRight } from 'lucide-react';

export function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleUserRole = async (userId: string, currentRole: string) => {
    setUpdating(userId);
    const newRole = currentRole === 'admin' ? 'user' : 'admin';

    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user role:', error);
      alert('Rol güncellenirken bir hata oluştu');
    } else {
      await fetchUsers();
    }
    setUpdating(null);
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setUpdating(userId);

    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: !currentStatus })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user status:', error);
      alert('Durum güncellenirken bir hata oluştu');
    } else {
      await fetchUsers();
    }
    setUpdating(null);
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
              <p className="text-gray-600 mt-1">Tüm kullanıcıları görüntüleyin ve yönetin</p>
            </div>
            <div className="flex items-center space-x-2 bg-blue-100 px-4 py-2 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Süper Admin Paneli</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="E-posta veya isim ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Kullanıcı</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">E-posta</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Rol</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Durum</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Kayıt Tarihi</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name || 'İsimsiz'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-700">{user.email}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'super_admin'
                            ? 'bg-red-100 text-red-800'
                            : user.role === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role === 'super_admin' && 'Süper Admin'}
                          {user.role === 'admin' && 'Admin'}
                          {user.role === 'user' && 'Kullanıcı'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-600 text-sm">
                        {new Date(user.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          {user.role !== 'super_admin' && (
                            <>
                              <button
                                onClick={() => toggleUserRole(user.id, user.role)}
                                disabled={updating === user.id}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                  user.role === 'admin'
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                } disabled:opacity-50`}
                              >
                                {user.role === 'admin' ? 'Admin Kaldır' : 'Admin Yap'}
                              </button>
                              <button
                                onClick={() => toggleUserStatus(user.id, user.is_active)}
                                disabled={updating === user.id}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                                title={user.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                              >
                                {user.is_active ? (
                                  <ToggleRight className="w-6 h-6 text-green-600" />
                                ) : (
                                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                                )}
                              </button>
                            </>
                          )}
                          {user.role === 'super_admin' && (
                            <span className="text-xs text-gray-500 italic">Korumalı</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Kullanıcı bulunamadı</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Bilgilendirme</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Kullanıcıları admin yaparak proje oluşturma yetkisi verebilirsiniz</li>
              <li>• Pasif yapılan kullanıcılar sisteme giriş yapamaz</li>
              <li>• Süper admin rolü korumalıdır ve değiştirilemez</li>
            </ul>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
