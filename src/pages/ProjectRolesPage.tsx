import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { supabase } from '../lib/supabase';
import { UserCog, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

interface Role {
  id: string;
  project_id: string;
  name: string;
  is_active: boolean;
}

interface ProjectRolesPageProps {
  projectId: string;
}

export function ProjectRolesPage({ projectId }: ProjectRolesPageProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    const { data } = await supabase
      .from('project_roles')
      .select('*')
      .eq('project_id', projectId)
      .order('name');

    if (data) setRoles(data);
    setLoading(false);
  };

  const addRole = async () => {
    if (!newRoleName.trim()) return;

    const { error } = await supabase
      .from('project_roles')
      .insert({ project_id: projectId, name: newRoleName.trim() });

    if (error) {
      alert('Rol eklenirken hata oluştu');
    } else {
      setNewRoleName('');
      setShowAdd(false);
      fetchData();
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('project_roles')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) fetchData();
  };

  const deleteRole = async (id: string) => {
    if (!confirm('Bu rolü silmek istediğinizden emin misiniz?')) return;

    const { error } = await supabase
      .from('project_roles')
      .delete()
      .eq('id', id);

    if (!error) fetchData();
  };

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
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <UserCog className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Roller</h1>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Rol Ekle</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {showAdd && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol Adı
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Örn: Kalite Kontrol, Şantiye Şefi, Saha"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
                  onKeyPress={(e) => e.key === 'Enter' && addRole()}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={addRole}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => {
                      setShowAdd(false);
                      setNewRoleName('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {roles.length === 0 ? (
                <div className="text-center py-12">
                  <UserCog className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Henüz rol eklenmedi</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Personel yönetimi için roller ekleyin (Kalite Kontrol, Şantiye Şefi, Saha vb.)
                  </p>
                </div>
              ) : (
                roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <UserCog className="w-5 h-5 text-gray-500" />
                      <span className="font-medium text-gray-900">{role.name}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          role.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {role.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                      <button
                        onClick={() => toggleStatus(role.id, role.is_active)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                      >
                        {role.is_active ? (
                          <ToggleRight className="w-6 h-6 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteRole(role.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
