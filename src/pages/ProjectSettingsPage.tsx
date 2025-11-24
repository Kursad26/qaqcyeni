import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { supabase, TaskManagementCategory } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Building, Plus, ToggleLeft, ToggleRight, Trash2, Tag } from 'lucide-react';

interface Building {
  id: string;
  project_id: string;
  name: string;
  is_active: boolean;
}

interface Block {
  id: string;
  project_id: string;
  building_id: string | null;
  name: string;
  is_active: boolean;
}

interface ProjectSettingsPageProps {
  projectId: string;
}

export function ProjectSettingsPage({ projectId }: ProjectSettingsPageProps) {
  const { userProfile } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [categories, setCategories] = useState<TaskManagementCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBlockName, setNewBlockName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    const { data: buildingsData } = await supabase
      .from('project_buildings')
      .select('*')
      .eq('project_id', projectId)
      .order('name');

    const { data: blocksData } = await supabase
      .from('project_blocks')
      .select('*')
      .eq('project_id', projectId)
      .order('name');

    const { data: categoriesData } = await supabase
      .from('task_management_categories')
      .select('*')
      .eq('project_id', projectId)
      .order('category_name');

    if (buildingsData) setBuildings(buildingsData);
    if (blocksData) setBlocks(blocksData);
    if (categoriesData) setCategories(categoriesData);
    setLoading(false);
  };

  const addBuilding = async () => {
    if (!newBuildingName.trim()) return;

    const { error } = await supabase
      .from('project_buildings')
      .insert({ project_id: projectId, name: newBuildingName.trim() });

    if (error) {
      alert('Bina eklenirken hata oluştu');
    } else {
      setNewBuildingName('');
      setShowAddBuilding(false);
      fetchData();
    }
  };

  const addBlock = async () => {
    if (!newBlockName.trim()) return;

    const { error } = await supabase
      .from('project_blocks')
      .insert({ project_id: projectId, name: newBlockName.trim() });

    if (error) {
      alert('Blok eklenirken hata oluştu');
    } else {
      setNewBlockName('');
      setShowAddBlock(false);
      fetchData();
    }
  };

  const toggleBuildingStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('project_buildings')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) fetchData();
  };

  const toggleBlockStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('project_blocks')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) fetchData();
  };

  const deleteBuilding = async (id: string) => {
    if (!confirm('Bu binayı silmek istediğinizden emin misiniz?')) return;

    const { error } = await supabase
      .from('project_buildings')
      .delete()
      .eq('id', id);

    if (!error) fetchData();
  };

  const deleteBlock = async (id: string) => {
    if (!confirm('Bu bloku silmek istediğinizden emin misiniz?')) return;

    const { error } = await supabase
      .from('project_blocks')
      .delete()
      .eq('id', id);

    if (!error) fetchData();
  };

  const addCategory = async () => {
    if (!newCategoryName.trim() || !userProfile) return;

    const { error } = await supabase
      .from('task_management_categories')
      .insert({
        project_id: projectId,
        category_name: newCategoryName.trim(),
        created_by: userProfile.id
      });

    if (error) {
      alert('Kategori eklenirken hata oluştu');
    } else {
      setNewCategoryName('');
      setShowAddCategory(false);
      fetchData();
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return;

    const { error } = await supabase
      .from('task_management_categories')
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
            <h1 className="text-3xl font-bold text-gray-900">Proje Ayarları</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Building className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Binalar</h2>
                </div>
                <button
                  onClick={() => setShowAddBuilding(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ekle</span>
                </button>
              </div>

              {showAddBuilding && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={newBuildingName}
                    onChange={(e) => setNewBuildingName(e.target.value)}
                    placeholder="Bina adı"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
                    onKeyPress={(e) => e.key === 'Enter' && addBuilding()}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={addBuilding}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Kaydet
                    </button>
                    <button
                      onClick={() => {
                        setShowAddBuilding(false);
                        setNewBuildingName('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {buildings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Henüz bina eklenmedi</p>
                ) : (
                  buildings.map((building) => (
                    <div
                      key={building.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <span className="font-medium text-gray-900">{building.name}</span>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            building.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {building.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                        <button
                          onClick={() => toggleBuildingStatus(building.id, building.is_active)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                        >
                          {building.is_active ? (
                            <ToggleRight className="w-6 h-6 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteBuilding(building.id)}
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Building className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Bloklar</h2>
                </div>
                <button
                  onClick={() => setShowAddBlock(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ekle</span>
                </button>
              </div>

              {showAddBlock && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={newBlockName}
                    onChange={(e) => setNewBlockName(e.target.value)}
                    placeholder="Blok adı (örn: A Blok)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
                    onKeyPress={(e) => e.key === 'Enter' && addBlock()}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={addBlock}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Kaydet
                    </button>
                    <button
                      onClick={() => {
                        setShowAddBlock(false);
                        setNewBlockName('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {blocks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Henüz blok eklenmedi</p>
                ) : (
                  blocks.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <span className="font-medium text-gray-900">{block.name}</span>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            block.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {block.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                        <button
                          onClick={() => toggleBlockStatus(block.id, block.is_active)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                        >
                          {block.is_active ? (
                            <ToggleRight className="w-6 h-6 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteBlock(block.id)}
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Tag className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Görev Kategorileri</h2>
                </div>
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ekle</span>
                </button>
              </div>

              {showAddCategory && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Kategori adı (örn: Kalite, Güvenlik)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
                    onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={addCategory}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Kaydet
                    </button>
                    <button
                      onClick={() => {
                        setShowAddCategory(false);
                        setNewCategoryName('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {categories.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Henüz kategori eklenmedi</p>
                ) : (
                  categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <span className="font-medium text-gray-900">{category.category_name}</span>
                      <button
                        onClick={() => deleteCategory(category.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
