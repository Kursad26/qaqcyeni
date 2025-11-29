import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { supabase, Project } from '../lib/supabase';
import { FolderKanban, Plus, MapPin, Calendar, Trash2, AlertCircle } from 'lucide-react';

interface ProjectWithRole extends Project {
  userRole: 'owner' | 'member';
}

export function ProjectsPage() {
  const { userProfile } = useAuth();
  const { setCurrentProject } = useProject();
  const [projects, setProjects] = useState<ProjectWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
  });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showNoAccessModal, setShowNoAccessModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const fetchProjects = async () => {
    if (!userProfile) return;

    const allProjects: ProjectWithRole[] = [];

    if (userProfile.role === 'super_admin') {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
      } else if (data) {
        allProjects.push(...data.map(p => ({ ...p, userRole: 'owner' as const })));
      }
    } else {
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('admin_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (ownedError) {
        console.error('Error fetching owned projects:', ownedError);
      } else if (ownedProjects) {
        allProjects.push(...ownedProjects.map(p => ({ ...p, userRole: 'owner' as const })));
      }

      // Get projects from project_users table
      const { data: userProjectsList, error: userError } = await supabase
        .from('project_users')
        .select('project_id, projects(*)')
        .eq('user_id', userProfile.id)
        .eq('is_active', true);

      if (userError) {
        console.error('Error fetching user projects:', userError);
      } else if (userProjectsList) {
        const userProjectsWithRole = userProjectsList
          .filter(up => up.projects)
          .map(up => ({ ...up.projects, userRole: 'member' as const }))
          .filter(p => !allProjects.some(ap => ap.id === p.id));

        allProjects.push(...userProjectsWithRole);
      }

      // Also get projects from personnel table with dashboard_access
      const { data: personnelProjects, error: personnelError } = await supabase
        .from('personnel')
        .select('project_id, projects(*)')
        .eq('user_id', userProfile.id)
        .eq('dashboard_access', true);

      if (personnelError) {
        console.error('Error fetching personnel projects:', personnelError);
      } else if (personnelProjects) {
        const personnelProjectsWithRole = personnelProjects
          .filter(pp => pp.projects)
          .map(pp => ({ ...pp.projects, userRole: 'member' as const }))
          .filter(p => !allProjects.some(ap => ap.id === p.id));

        allProjects.push(...personnelProjectsWithRole);
      }
    }

    setProjects(allProjects);
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, [userProfile]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setCreating(true);

    const { error } = await supabase.from('projects').insert({
      name: formData.name,
      description: formData.description,
      location: formData.location,
      admin_id: userProfile.id,
    });

    if (error) {
      console.error('Error creating project:', error);
      alert('Proje oluşturulurken bir hata oluştu');
    } else {
      setShowCreateModal(false);
      setFormData({ name: '', description: '', location: '' });
      await fetchProjects();
    }
    setCreating(false);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Bu projeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    setDeletingId(projectId);

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Error deleting project:', error);
      alert('Proje silinirken bir hata oluştu');
    } else {
      await fetchProjects();
    }
    setDeletingId(null);
  };

  const handleProjectClick = async (project: ProjectWithRole) => {
    if (!userProfile) return;

    // If owner, allow access without checking
    if (project.userRole === 'owner') {
      setCurrentProject(project);
      window.location.href = '/dashboard';
      return;
    }

    // Check if user has dashboard access in personnel table
    const { data: personnelData } = await supabase
      .from('personnel')
      .select('dashboard_access')
      .eq('user_id', userProfile.id)
      .eq('project_id', project.id)
      .maybeSingle();

    if (!personnelData || personnelData.dashboard_access === false) {
      setSelectedProject(project);
      setShowNoAccessModal(true);
      return;
    }

    // Has access, proceed to dashboard
    setCurrentProject(project);
    window.location.href = '/dashboard';
  };

  const canCreateProject = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

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
    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'user']}>
      <Layout>
        <div className="max-w-[2400px] mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Projeler</h1>
              <p className="text-gray-600 mt-1">Projelerinizi görüntüleyin ve yönetin</p>
            </div>
            {canCreateProject && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-5 h-5" />
                <span>Yeni Proje</span>
              </button>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz proje yok</h3>
              <p className="text-gray-600 mb-6">
                {canCreateProject
                  ? 'Yeni bir proje oluşturarak başlayın'
                  : 'Size atanmış bir proje bulunmuyor'}
              </p>
              {canCreateProject && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Yeni Proje Oluştur</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {projects.filter(p => p.userRole === 'owner').length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">Sahip Olduğum Projeler</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.filter(p => p.userRole === 'owner').map((project) => (
                      <div
                        key={project.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <FolderKanban className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDeleteProject(project.id)}
                              disabled={deletingId === project.id}
                              className="p-1.5 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-2">{project.name}</h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {project.description || 'Açıklama eklenmemiş'}
                        </p>

                        <div className="space-y-2 text-sm">
                          {project.location && (
                            <div className="flex items-center space-x-2 text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span>{project.location}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>Oluşturuldu: {new Date(project.created_at).toLocaleDateString('tr-TR')}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <a
                            href={`/admin/projects/${project.id}`}
                            className="block text-center bg-blue-50 text-blue-600 py-2 rounded-lg font-medium hover:bg-blue-100 transition"
                          >
                            Projeyi Yönet
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {projects.filter(p => p.userRole === 'member').length > 0 && (
                <div className="space-y-4 mt-8">
                  <h2 className="text-xl font-bold text-gray-900">Üye Olduğum Projeler</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.filter(p => p.userRole === 'member').map((project) => (
                      <div
                        key={project.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                            <FolderKanban className="w-6 h-6 text-white" />
                          </div>
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                            Üye
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-2">{project.name}</h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {project.description || 'Açıklama eklenmemiş'}
                        </p>

                        <div className="space-y-2 text-sm">
                          {project.location && (
                            <div className="flex items-center space-x-2 text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span>{project.location}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>Oluşturuldu: {new Date(project.created_at).toLocaleDateString('tr-TR')}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={() => handleProjectClick(project)}
                            className="w-full text-center bg-green-50 text-green-600 py-2 rounded-lg font-medium hover:bg-green-100 transition"
                          >
                            Dashboard'a Git
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {showNoAccessModal && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-amber-600" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Panellere Erişim Kapalı
              </h2>

              <p className="text-gray-600 mb-6 leading-relaxed">
                <strong>{selectedProject.name}</strong> projesinde panelleriniz yönetici tarafından kapatılmıştır.
                Lütfen proje yöneticiniz ile iletişime geçiniz.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Ne yapmalıyım?</strong><br />
                  Lütfen proje sorumlusu veya sistem yöneticiniz ile iletişime geçin ve hesabınıza bu proje için panel erişimi açılmasını talep edin.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowNoAccessModal(false);
                  setSelectedProject(null);
                }}
                className="w-full bg-gray-600 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition"
              >
                Tamam
              </button>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Yeni Proje Oluştur</h2>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proje Adı
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Proje adını girin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Proje açıklaması"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lokasyon
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Proje lokasyonu"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {creating ? 'Oluşturuluyor...' : 'Oluştur'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
