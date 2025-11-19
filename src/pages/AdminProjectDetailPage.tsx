import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Project, UserProfile, Company, Personnel } from '../lib/supabase';
import { Users, Building2, UserCog, Plus, ToggleLeft, ToggleRight, Settings, UserCircle, Edit2, Save, X, Trash2, Download, Search, ClipboardList, FileText, ExternalLink } from 'lucide-react';
import { ProjectSettingsTab } from '../components/ProjectSettingsTab';
import { ProjectRolesTab } from '../components/ProjectRolesTab';
import { TaskViewSidePanel } from '../components/TaskViewSidePanel';

interface ProjectDetailPageProps {
  projectId: string;
}

export function AdminProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const {} = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [projectUsers, setProjectUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'companies' | 'personnel' | 'tasks' | 'settings' | 'roles'>('users');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyCategory, setNewCompanyCategory] = useState<'employer' | 'contractor' | 'subcontractor'>('contractor');
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editingCompanyName, setEditingCompanyName] = useState('');
  const [draggedCompany, setDraggedCompany] = useState<Company | null>(null);
  const [showAddPersonnelModal, setShowAddPersonnelModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [newPersonnelUserId, setNewPersonnelUserId] = useState('');
  const [newPersonnelPosition, setNewPersonnelPosition] = useState('');
  const [newPersonnelPhone, setNewPersonnelPhone] = useState('');
  const [newPersonnelCompanyId, setNewPersonnelCompanyId] = useState('');
  const [newPersonnelRoleId, setNewPersonnelRoleId] = useState('');
  const [roles, setRoles] = useState<any[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserEmail, setEditingUserEmail] = useState('');
  const [editingPersonnelId, setEditingPersonnelId] = useState<string | null>(null);
  const [editingPersonnelPosition, setEditingPersonnelPosition] = useState('');
  const [editingPersonnelPhone, setEditingPersonnelPhone] = useState('');
  const [editingPersonnelCompanyId, setEditingPersonnelCompanyId] = useState('');
  const [editingPersonnelRoleId, setEditingPersonnelRoleId] = useState('');
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState('');
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [showActiveUsersOnly, setShowActiveUsersOnly] = useState(true);
  const [personnelUserSearchTerm, setPersonnelUserSearchTerm] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'pending_approval' | 'completed'>('all');
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectData) {
      setProject(projectData);
    }

    const { data: usersData } = await supabase
      .from('project_users')
      .select('user_id, user_profiles(*)')
      .eq('project_id', projectId);

    if (usersData) {
      setProjectUsers(usersData.map((pu: any) => pu.user_profiles));
    }

    const { data: allUsersData } = await supabase
      .from('user_profiles')
      .select('*')
      .in('role', ['user', 'admin'])
      .eq('is_active', true);

    if (allUsersData) {
      setAllUsers(allUsersData);
    }

    const { data: rolesData } = await supabase
      .from('project_roles')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (rolesData) {
      setRoles(rolesData);
    }

    const { data: companiesData } = await supabase
      .from('companies')
      .select('*')
      .eq('project_id', projectId);

    if (companiesData) {
      setCompanies(companiesData);
    }

    const { data: personnelData } = await supabase
      .from('personnel')
      .select('*, companies(name, company_category), project_roles(name), user_profiles(id, full_name, email)')
      .eq('project_id', projectId);

    if (personnelData) {
      setPersonnel(personnelData as any);
    }

    const { data: tasksData } = await supabase
      .from('task_management_tasks')
      .select(`
        *,
        company:companies(id, name),
        task_owner:user_profiles!task_owner_id(id, full_name),
        assignments:task_management_assignments(
          id,
          personnel:personnel(
            id,
            first_name,
            last_name,
            user_profiles(full_name)
          )
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (tasksData) {
      setTasks(tasksData);
    }

    setLoading(false);
  };

  const addUserToProject = async (userId: string) => {
    const { error } = await supabase
      .from('project_users')
      .insert({ project_id: projectId, user_id: userId });

    if (error) {
      alert('Kullanıcı eklenirken hata oluştu');
    } else {
      setShowAddUserModal(false);
      await fetchProjectData();
    }
  };

  const addCompany = async () => {
    if (!newCompanyName.trim()) {
      alert('Lütfen firma adı girin');
      return;
    }

    const { error } = await supabase
      .from('companies')
      .insert({
        project_id: projectId,
        name: newCompanyName.trim(),
        company_category: newCompanyCategory
      });

    if (error) {
      alert('Firma eklenirken hata oluştu');
    } else {
      setNewCompanyName('');
      setNewCompanyCategory('contractor');
      setShowAddCompanyModal(false);
      await fetchProjectData();
    }
  };

  const toggleCompanyStatus = async (companyId: string, currentStatus: boolean) => {
    await supabase
      .from('companies')
      .update({ is_active: !currentStatus })
      .eq('id', companyId);
    fetchProjectData();
  };

  const deleteCompany = async (companyId: string) => {
    if (!confirm('Bu firmayı silmek istediğinizden emin misiniz?')) return;
    await supabase.from('companies').delete().eq('id', companyId);
    fetchProjectData();
  };

  const startEditCompany = (company: Company) => {
    setEditingCompanyId(company.id);
    setEditingCompanyName(company.name);
  };

  const saveCompanyEdit = async (companyId: string) => {
    if (!editingCompanyName.trim()) return;
    await supabase
      .from('companies')
      .update({ name: editingCompanyName.trim() })
      .eq('id', companyId);
    setEditingCompanyId(null);
    setEditingCompanyName('');
    fetchProjectData();
  };

  const handleDragStart = (company: Company) => {
    setDraggedCompany(company);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newCategory: 'employer' | 'contractor' | 'subcontractor') => {
    e.preventDefault();
    if (!draggedCompany) return;

    await supabase
      .from('companies')
      .update({ company_category: newCategory })
      .eq('id', draggedCompany.id);

    setDraggedCompany(null);
    fetchProjectData();
  };

  const addPersonnel = async () => {
    if (!newPersonnelUserId) {
      alert('Lütfen kullanıcı seçin');
      return;
    }

    const selectedUser = allUsers.find(u => u.id === newPersonnelUserId);
    if (!selectedUser) return;

    const { error } = await supabase
      .from('personnel')
      .insert({
        project_id: projectId,
        user_id: newPersonnelUserId,
        first_name: selectedUser.full_name?.split(' ')[0] || '',
        last_name: selectedUser.full_name?.split(' ').slice(1).join(' ') || '',
        position: newPersonnelPosition.trim() || null,
        phone: newPersonnelPhone.trim() || null,
        company_id: newPersonnelCompanyId || null,
        role_id: newPersonnelRoleId || null
      });

    if (error) {
      alert('Personel eklenirken hata oluştu');
    } else {
      setNewPersonnelUserId('');
      setNewPersonnelPosition('');
      setNewPersonnelPhone('');
      setNewPersonnelCompanyId('');
      setNewPersonnelRoleId('');
      setPersonnelUserSearchTerm('');
      setShowAddPersonnelModal(false);
      fetchProjectData();
    }
  };

  const startEditUser = (user: UserProfile) => {
    setEditingUserId(user.id);
    setEditingUserName(user.full_name || '');
    setEditingUserEmail(user.email);
  };

  const saveUserEdit = async (userId: string) => {
    if (!editingUserName.trim() || !editingUserEmail.trim()) return;

    await supabase
      .from('user_profiles')
      .update({
        full_name: editingUserName.trim(),
        email: editingUserEmail.trim()
      })
      .eq('id', userId);

    setEditingUserId(null);
    setEditingUserName('');
    setEditingUserEmail('');
    fetchProjectData();
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    await supabase.from('user_profiles').delete().eq('id', userId);
    fetchProjectData();
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: !currentStatus })
      .eq('id', userId);

    if (error) {
      alert('Durum güncellenirken hata oluştu');
    } else {
      await fetchProjectData();
    }
  };

  const togglePersonnelDashboard = async (personnelId: string, currentAccess: boolean) => {
    const { error } = await supabase
      .from('personnel')
      .update({ dashboard_access: !currentAccess })
      .eq('id', personnelId);

    if (error) {
      alert('Dashboard erişimi güncellenirken hata oluştu');
    } else {
      await fetchProjectData();
    }
  };

  const togglePersonnelFieldObservation = async (personnelId: string, currentAccess: boolean) => {
    const { error } = await supabase
      .from('personnel')
      .update({ field_observation_access: !currentAccess })
      .eq('id', personnelId);

    if (error) {
      alert('Saha Gözlem erişimi güncellenirken hata oluştu');
    } else {
      await fetchProjectData();
    }
  };

  const togglePersonnelFieldObservationCreator = async (personnelId: string, currentAccess: boolean) => {
    const { error } = await supabase
      .from('personnel')
      .update({ field_observation_creator: !currentAccess })
      .eq('id', personnelId);

    if (error) {
      alert('Rapor oluşturma yetkisi güncellenirken hata oluştu');
    } else {
      await fetchProjectData();
    }
  };

  const togglePersonnelFieldObservationApprover = async (personnelId: string, currentAccess: boolean) => {
    const { error } = await supabase
      .from('personnel')
      .update({ field_observation_approver: !currentAccess })
      .eq('id', personnelId);

    if (error) {
      alert('Rapor onaycı yetkisi güncellenirken hata oluştu');
    } else {
      await fetchProjectData();
    }
  };

  const togglePersonnelNoi = async (personnelId: string, currentAccess: boolean) => {
    const { error } = await supabase
      .from('personnel')
      .update({ noi_access: !currentAccess })
      .eq('id', personnelId);

    if (error) {
      alert('NOI erişimi güncellenirken hata oluştu');
    } else {
      await fetchProjectData();
    }
  };

  const togglePersonnelNoiApprover = async (personnelId: string, currentAccess: boolean) => {
    const { error } = await supabase
      .from('personnel')
      .update({ noi_approver: !currentAccess })
      .eq('id', personnelId);

    if (error) {
      alert('NOI onaycı yetkisi güncellenirken hata oluştu');
    } else {
      await fetchProjectData();
    }
  };

  const togglePersonnelFieldTraining = async (personnelId: string, currentAccess: boolean) => {
    const { error } = await supabase
      .from('personnel')
      .update({ field_training_access: !currentAccess })
      .eq('id', personnelId);

    if (error) {
      alert('Saha Eğitim erişimi güncellenirken hata oluştu');
    } else {
      await fetchProjectData();
    }
  };

  const togglePersonnelFieldTrainingPlanner = async (personnelId: string, currentAccess: boolean) => {
    const { error } = await supabase
      .from('personnel')
      .update({ field_training_planner: !currentAccess })
      .eq('id', personnelId);

    if (error) {
      alert('Eğitim planlayıcı yetkisi güncellenirken hata oluştu');
    } else {
      await fetchProjectData();
    }
  };

  const togglePersonnelTaskManagement = async (personnelId: string, currentAccess: boolean) => {
    const { error } = await supabase
      .from('personnel')
      .update({ task_management_access: !currentAccess })
      .eq('id', personnelId);

    if (error) {
      alert('Görev Takibi erişimi güncellenirken hata oluştu');
    } else {
      await fetchProjectData();
    }
  };

  const startEditPersonnel = (person: any) => {
    setEditingPersonnelId(person.id);
    setEditingPersonnelPosition(person.position || '');
    setEditingPersonnelPhone(person.phone || '');
    setEditingPersonnelCompanyId(person.company_id || '');
    setEditingPersonnelRoleId(person.role_id || '');
  };

  const savePersonnelEdit = async (personnelId: string) => {
    const { error } = await supabase
      .from('personnel')
      .update({
        position: editingPersonnelPosition.trim() || null,
        phone: editingPersonnelPhone.trim() || null,
        company_id: editingPersonnelCompanyId || null,
        role_id: editingPersonnelRoleId || null
      })
      .eq('id', personnelId);

    if (error) {
      alert('Personel güncellenirken hata oluştu');
    } else {
      setEditingPersonnelId(null);
      setEditingPersonnelPosition('');
      setEditingPersonnelPhone('');
      setEditingPersonnelCompanyId('');
      setEditingPersonnelRoleId('');
      fetchProjectData();
    }
  };

  const deletePersonnel = async (personnelId: string) => {
    if (!confirm('Bu personeli silmek istediğinizden emin misiniz?')) return;

    const { error } = await supabase
      .from('personnel')
      .delete()
      .eq('id', personnelId);

    if (error) {
      alert('Personel silinirken hata oluştu');
    } else {
      fetchProjectData();
    }
  };

  const availableUsers = allUsers.filter(
    u => !projectUsers.find(pu => pu.id === u.id)
  );

  const availableUsersForPersonnel = projectUsers.filter(
    u => !personnel.find((p: any) => p.user_id === u.id)
  );

  const filteredProjectUsers = projectUsers.filter(user => {
    const searchLower = userSearchTerm.toLowerCase();
    const matchesSearch = (user.full_name || '').toLowerCase().includes(searchLower) ||
                         user.email.toLowerCase().includes(searchLower);
    const matchesStatus = showActiveUsersOnly ? user.is_active : !user.is_active;
    return matchesSearch && matchesStatus;
  });

  const filteredPersonnel = personnel.filter((person: any) => {
    const searchLower = personnelSearchTerm.toLowerCase();
    const userName = person.user_profiles?.full_name || `${person.first_name} ${person.last_name}`;
    const userEmail = person.user_profiles?.email || '';
    const position = person.position || '';
    const phone = person.phone || '';
    const companyName = person.companies?.name || '';
    const roleName = person.project_roles?.name || '';

    return userName.toLowerCase().includes(searchLower) ||
           userEmail.toLowerCase().includes(searchLower) ||
           position.toLowerCase().includes(searchLower) ||
           phone.toLowerCase().includes(searchLower) ||
           companyName.toLowerCase().includes(searchLower) ||
           roleName.toLowerCase().includes(searchLower);
  });

  const filteredCompaniesTable = companies.filter((company: Company) => {
    const searchLower = companySearchTerm.toLowerCase();
    const categoryText = company.company_category === 'employer' ? 'işveren' :
                        company.company_category === 'contractor' ? 'müteahit' : 'yüklenici';

    return company.name.toLowerCase().includes(searchLower) ||
           categoryText.includes(searchLower);
  });

  const filteredAvailableUsers = availableUsers.filter(user =>
    (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToExcel = (data: any[], filename: string, headers: string[]) => {
    const separator = ';';
    const csvContent = [
      headers.join(separator),
      ...data.map(row => headers.map(h => {
        const value = row[h] || '';
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      }).join(separator))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPersonnelToExcel = () => {
    const data = filteredPersonnel.map((person: any) => ({
      'Kullanıcı': person.user_profiles?.full_name || `${person.first_name} ${person.last_name}`,
      'E-posta': person.user_profiles?.email || '',
      'Pozisyon': person.position || '-',
      'Telefon': person.phone || '-',
      'Firma': person.companies?.name || '-',
      'Hiyerarşi': person.companies?.company_category === 'employer' ? 'İşveren' :
                   person.companies?.company_category === 'contractor' ? 'Müteahit' : 'Yüklenici',
      'Rol': person.project_roles?.name || '-',
      'Dashboard Erişimi': person.dashboard_access ? 'Aktif' : 'Pasif',
      'Saha Gözlem Erişimi': person.field_observation_access ? 'Aktif' : 'Pasif',
      'Rapor Oluşturma': person.field_observation_creator ? 'Aktif' : 'Pasif',
      'Rapor Onaycı': person.field_observation_approver ? 'Aktif' : 'Pasif',
      'Saha Eğitim Erişimi': person.field_training_access ? 'Aktif' : 'Pasif',
      'Eğitim Planlayıcı': person.field_training_planner ? 'Aktif' : 'Pasif',
      'NOI Erişimi': person.noi_access ? 'Aktif' : 'Pasif',
      'NOI Onaycı': person.noi_approver ? 'Aktif' : 'Pasif',
      'Görev Takibi Erişimi': person.task_management_access ? 'Aktif' : 'Pasif'
    }));
    exportToExcel(data, 'personel', Object.keys(data[0] || {}));
  };

  const exportCompaniesToExcel = () => {
    const data = filteredCompaniesTable.map((company: Company) => ({
      'Firma Adı': company.name,
      'Hiyerarşi': company.company_category === 'employer' ? 'İşveren' :
                   company.company_category === 'contractor' ? 'Müteahit' : 'Yüklenici',
      'Durum': company.is_active ? 'Aktif' : 'Pasif'
    }));
    exportToExcel(data, 'firmalar', Object.keys(data[0] || {}));
  };

  const exportUsersToExcel = () => {
    const filteredUsers = projectUsers.filter(user => {
      const searchLower = userSearchTerm.toLowerCase();
      return user.full_name.toLowerCase().includes(searchLower) ||
             user.email.toLowerCase().includes(searchLower);
    });
    const data = filteredUsers.map((user: UserProfile) => ({
      'İsim': user.full_name,
      'E-posta': user.email,
      'Rol': user.role === 'super_admin' ? 'Süper Admin' : user.role === 'admin' ? 'Admin' : 'Kullanıcı',
      'Durum': user.is_active ? 'Aktif' : 'Pasif'
    }));
    exportToExcel(data, 'kullanicilar', Object.keys(data[0] || {}));
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project?.name}</h1>
              <p className="text-gray-600 mt-1">{project?.description}</p>
            </div>
            <a
              href="/projects"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Projelere Dön
            </a>
          </div>

          <div className="flex space-x-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Kullanıcılar ({projectUsers.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('companies')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'companies'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Firmalar ({companies.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('personnel')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'personnel'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <UserCog className="w-5 h-5" />
                <span>Personel ({personnel.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'tasks'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ClipboardList className="w-5 h-5" />
                <span>Görevler ({tasks.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'settings'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Proje Ayarları</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'roles'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <UserCircle className="w-5 h-5" />
                <span>Roller</span>
              </div>
            </button>
          </div>

          {activeTab === 'users' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Proje Kullanıcıları</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={exportUsersToExcel}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    disabled={projectUsers.length === 0}
                  >
                    <Download className="w-5 h-5" />
                    <span>Excel İndir</span>
                  </button>
                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Kullanıcı Ekle</span>
                  </button>
                </div>
              </div>

              {projectUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Henüz kullanıcı eklenmemiş</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 space-y-3">
                    <input
                      type="text"
                      placeholder="İsim veya e-posta ile ara..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowActiveUsersOnly(true)}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          showActiveUsersOnly
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Aktif Kullanıcılar
                      </button>
                      <button
                        onClick={() => setShowActiveUsersOnly(false)}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          !showActiveUsersOnly
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Pasif Kullanıcılar
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {filteredProjectUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                      {editingUserId === user.id ? (
                        <div className="flex-1 flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {(user.full_name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={editingUserName}
                              onChange={(e) => setEditingUserName(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="İsim"
                            />
                            <input
                              type="email"
                              value={editingUserEmail}
                              onChange={(e) => setEditingUserEmail(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="E-posta"
                            />
                          </div>
                          <button onClick={() => saveUserEdit(user.id)} className="text-green-600 p-2"><Save className="w-5 h-5" /></button>
                          <button onClick={() => setEditingUserId(null)} className="text-red-600 p-2"><X className="w-5 h-5" /></button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {(user.full_name || user.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.full_name || 'İsimsiz'}</p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? 'Aktif' : 'Pasif'}
                            </span>
                            <button onClick={() => startEditUser(user)} className="text-gray-600 hover:text-blue-600 p-1.5" title="Düzenle">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleUserStatus(user.id, user.is_active)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg"
                              title={user.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                            >
                              {user.is_active ? <ToggleRight className="w-6 h-6 text-green-600" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                            </button>
                            <button onClick={() => deleteUser(user.id)} className="text-red-600 hover:text-red-700 p-1.5" title="Sil">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'companies' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Firmalar</h2>
                <button
                  onClick={() => setShowAddCompanyModal(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Firma Ekle</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'employer')}
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                    İşveren
                  </h3>
                  <div className="space-y-2 min-h-[100px]">
                    {companies.filter(c => c.company_category === 'employer').length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-8">Buraya firma sürükleyin</p>
                    ) : (
                      companies.filter(c => c.company_category === 'employer').map(company => (
                        <div
                          key={company.id}
                          draggable
                          onDragStart={() => handleDragStart(company)}
                          className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition cursor-move"
                        >
                          {editingCompanyId === company.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editingCompanyName}
                                onChange={(e) => setEditingCompanyName(e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button onClick={() => saveCompanyEdit(company.id)} className="text-green-600"><Save className="w-4 h-4" /></button>
                              <button onClick={() => setEditingCompanyId(null)} className="text-red-600"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-gray-900">{company.name}</h4>
                              <div className="flex items-center space-x-1">
                                <button onClick={() => startEditCompany(company)} className="text-gray-600 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => toggleCompanyStatus(company.id, company.is_active)} className="p-1">
                                  {company.is_active ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                                </button>
                                <button onClick={() => deleteCompany(company.id)} className="text-red-600 hover:text-red-700 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'contractor')}
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-green-600" />
                    Müteahit
                  </h3>
                  <div className="space-y-2 min-h-[100px]">
                    {companies.filter(c => c.company_category === 'contractor').length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-8">Buraya firma sürükleyin</p>
                    ) : (
                      companies.filter(c => c.company_category === 'contractor').map(company => (
                        <div
                          key={company.id}
                          draggable
                          onDragStart={() => handleDragStart(company)}
                          className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition cursor-move"
                        >
                          {editingCompanyId === company.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editingCompanyName}
                                onChange={(e) => setEditingCompanyName(e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button onClick={() => saveCompanyEdit(company.id)} className="text-green-600"><Save className="w-4 h-4" /></button>
                              <button onClick={() => setEditingCompanyId(null)} className="text-red-600"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-gray-900">{company.name}</h4>
                              <div className="flex items-center space-x-1">
                                <button onClick={() => startEditCompany(company)} className="text-gray-600 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => toggleCompanyStatus(company.id, company.is_active)} className="p-1">
                                  {company.is_active ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                                </button>
                                <button onClick={() => deleteCompany(company.id)} className="text-red-600 hover:text-red-700 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'subcontractor')}
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-orange-600" />
                    Yüklenici
                  </h3>
                  <div className="space-y-2 min-h-[100px]">
                    {companies.filter(c => c.company_category === 'subcontractor').length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-8">Buraya firma sürükleyin</p>
                    ) : (
                      companies.filter(c => c.company_category === 'subcontractor').map(company => (
                        <div
                          key={company.id}
                          draggable
                          onDragStart={() => handleDragStart(company)}
                          className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition cursor-move"
                        >
                          {editingCompanyId === company.id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editingCompanyName}
                                onChange={(e) => setEditingCompanyName(e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button onClick={() => saveCompanyEdit(company.id)} className="text-green-600"><Save className="w-4 h-4" /></button>
                              <button onClick={() => setEditingCompanyId(null)} className="text-red-600"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-gray-900">{company.name}</h4>
                              <div className="flex items-center space-x-1">
                                <button onClick={() => startEditCompany(company)} className="text-gray-600 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => toggleCompanyStatus(company.id, company.is_active)} className="p-1">
                                  {company.is_active ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                                </button>
                                <button onClick={() => deleteCompany(company.id)} className="text-red-600 hover:text-red-700 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Tüm Firmalar</h3>
                  <button
                    onClick={exportCompaniesToExcel}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    disabled={companies.length === 0}
                  >
                    <Download className="w-5 h-5" />
                    <span>Excel İndir</span>
                  </button>
                </div>

                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Firma adı veya hiyerarşiye göre ara..."
                      value={companySearchTerm}
                      onChange={(e) => setCompanySearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Firma Adı</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Hiyerarşi</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Durum</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompaniesTable.map(company => (
                        <tr key={company.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="py-4 px-4">
                            {editingCompanyId === company.id ? (
                              <input
                                type="text"
                                value={editingCompanyName}
                                onChange={(e) => setEditingCompanyName(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded text-sm w-full"
                              />
                            ) : (
                              <span className="font-medium text-gray-900">{company.name}</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              company.company_category === 'employer'
                                ? 'bg-blue-100 text-blue-800'
                                : company.company_category === 'contractor'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {company.company_category === 'employer' ? 'İşveren' :
                               company.company_category === 'contractor' ? 'Müteahit' : 'Yüklenici'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              company.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {company.is_active ? 'Aktif' : 'Pasif'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end space-x-2">
                              {editingCompanyId === company.id ? (
                                <>
                                  <button onClick={() => saveCompanyEdit(company.id)} className="text-green-600 p-1.5">
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEditingCompanyId(null)} className="text-red-600 p-1.5">
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEditCompany(company)} className="text-gray-600 hover:text-blue-600 p-1.5">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => toggleCompanyStatus(company.id, company.is_active)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                                    {company.is_active ? <ToggleRight className="w-6 h-6 text-green-600" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                                  </button>
                                  <button onClick={() => deleteCompany(company.id)} className="text-red-600 hover:text-red-700 p-1.5">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {companies.length === 0 && (
                    <div className="text-center py-12">
                      <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Henüz firma eklenmemiş</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'personnel' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Personel</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={exportPersonnelToExcel}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    disabled={personnel.length === 0}
                  >
                    <Download className="w-5 h-5" />
                    <span>Excel İndir</span>
                  </button>
                  <button
                    onClick={() => setShowAddPersonnelModal(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    disabled={companies.length === 0}
                  >
                    <Plus className="w-5 h-5" />
                    <span>Personel Ekle</span>
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="İsim, e-posta, pozisyon, telefon, firma veya role göre ara..."
                    value={personnelSearchTerm}
                    onChange={(e) => setPersonnelSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {personnel.length === 0 ? (
                <div className="text-center py-12">
                  <UserCog className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {companies.length === 0 ? 'Önce firma eklemeniz gerekiyor' : 'Henüz personel eklenmemiş'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Kullanıcı</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Pozisyon</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Telefon</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Firma</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Hiyerarşi</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Rol</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Dashboard</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Saha Gözlem</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Rapor Oluştur</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Rapor Onaycı</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Saha Eğitim</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Eğitim Planlayıcı</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">NOI</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">NOI Onaycı</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Görev Takibi</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPersonnel.map((person: any) => (
                        <tr key={person.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {person.user_profiles?.full_name?.charAt(0).toUpperCase() || 'P'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {person.user_profiles?.full_name || `${person.first_name} ${person.last_name}`}
                                </p>
                                {person.user_profiles?.email && (
                                  <p className="text-xs text-gray-500">{person.user_profiles.email}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {editingPersonnelId === person.id ? (
                              <input
                                type="text"
                                value={editingPersonnelPosition}
                                onChange={(e) => setEditingPersonnelPosition(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded text-sm w-full"
                                placeholder="Pozisyon"
                              />
                            ) : (
                              <span className="text-gray-700">{person.position || '-'}</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {editingPersonnelId === person.id ? (
                              <input
                                type="text"
                                value={editingPersonnelPhone}
                                onChange={(e) => setEditingPersonnelPhone(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded text-sm w-full"
                                placeholder="Telefon"
                              />
                            ) : (
                              <span className="text-gray-700">{person.phone || '-'}</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {editingPersonnelId === person.id ? (
                              <select
                                value={editingPersonnelCompanyId}
                                onChange={(e) => setEditingPersonnelCompanyId(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded text-sm w-full"
                              >
                                <option value="">Seçiniz...</option>
                                {companies.filter(c => c.is_active).map(company => (
                                  <option key={company.id} value={company.id}>
                                    {company.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-gray-900 font-medium">{person.companies?.name || '-'}</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {person.companies?.company_category && (
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                person.companies.company_category === 'employer'
                                  ? 'bg-blue-100 text-blue-800'
                                  : person.companies.company_category === 'contractor'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {person.companies.company_category === 'employer' ? 'İşveren' :
                                 person.companies.company_category === 'contractor' ? 'Müteahit' : 'Yüklenici'}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {editingPersonnelId === person.id ? (
                              <select
                                value={editingPersonnelRoleId}
                                onChange={(e) => setEditingPersonnelRoleId(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded text-sm w-full"
                              >
                                <option value="">Seçiniz...</option>
                                {roles.filter(r => r.is_active).map(role => (
                                  <option key={role.id} value={role.id}>
                                    {role.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              person.project_roles?.name ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {person.project_roles.name}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => togglePersonnelDashboard(person.id, person.dashboard_access || false)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                              title={person.dashboard_access ? 'Dashboard Erişimini Kapat' : 'Dashboard Erişimini Aç'}
                            >
                              {person.dashboard_access ? (
                                <ToggleRight className="w-6 h-6 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => togglePersonnelFieldObservation(person.id, person.field_observation_access || false)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                              title={person.field_observation_access ? 'Saha Gözlem Erişimini Kapat' : 'Saha Gözlem Erişimini Aç'}
                            >
                              {person.field_observation_access ? (
                                <ToggleRight className="w-6 h-6 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => togglePersonnelFieldObservationCreator(person.id, person.field_observation_creator || false)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                              title={person.field_observation_creator ? 'Rapor Oluşturma Yetkisini Kapat' : 'Rapor Oluşturma Yetkisini Aç'}
                            >
                              {person.field_observation_creator ? (
                                <ToggleRight className="w-6 h-6 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => togglePersonnelFieldObservationApprover(person.id, person.field_observation_approver || false)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                              title={person.field_observation_approver ? 'Rapor Onaycı Yetkisini Kapat' : 'Rapor Onaycı Yetkisini Aç'}
                            >
                              {person.field_observation_approver ? (
                                <ToggleRight className="w-6 h-6 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => togglePersonnelFieldTraining(person.id, person.field_training_access || false)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                              title={person.field_training_access ? 'Saha Eğitim Erişimini Kapat' : 'Saha Eğitim Erişimini Aç'}
                            >
                              {person.field_training_access ? (
                                <ToggleRight className="w-6 h-6 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => togglePersonnelFieldTrainingPlanner(person.id, person.field_training_planner || false)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                              title={person.field_training_planner ? 'Eğitim Planlayıcı Yetkisini Kapat' : 'Eğitim Planlayıcı Yetkisini Aç'}
                            >
                              {person.field_training_planner ? (
                                <ToggleRight className="w-6 h-6 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => togglePersonnelNoi(person.id, person.noi_access || false)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                              title={person.noi_access ? 'NOI Erişimini Kapat' : 'NOI Erişimini Aç'}
                            >
                              {person.noi_access ? (
                                <ToggleRight className="w-6 h-6 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => togglePersonnelNoiApprover(person.id, person.noi_approver || false)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                              title={person.noi_approver ? 'NOI Onaycı Yetkisini Kapat' : 'NOI Onaycı Yetkisini Aç'}
                            >
                              {person.noi_approver ? (
                                <ToggleRight className="w-6 h-6 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => togglePersonnelTaskManagement(person.id, person.task_management_access || false)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                              title={person.task_management_access ? 'Görev Takibi Erişimini Kapat' : 'Görev Takibi Erişimini Aç'}
                            >
                              {person.task_management_access ? (
                                <ToggleRight className="w-6 h-6 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end space-x-2">
                              {editingPersonnelId === person.id ? (
                                <>
                                  <button onClick={() => savePersonnelEdit(person.id)} className="text-green-600 p-1.5" title="Kaydet">
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEditingPersonnelId(null)} className="text-red-600 p-1.5" title="İptal">
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEditPersonnel(person)} className="text-gray-600 hover:text-blue-600 p-1.5" title="Düzenle">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => deletePersonnel(person.id)} className="text-red-600 hover:text-red-700 p-1.5" title="Sil">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Açık</span>
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{tasks.filter(t => t.status === 'open').length}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Devam Ediyor</span>
                    <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{tasks.filter(t => t.status === 'in_progress').length}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Onay Bekliyor</span>
                    <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{tasks.filter(t => t.status === 'pending_approval').length}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Tamamlandı</span>
                    <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{tasks.filter(t => t.status === 'completed' || t.status === 'closed').length}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Görevler</h2>
                  <a
                    href="/task-management"
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <ExternalLink className="w-5 h-5" />
                    <span>Görev Takibi Sayfasına Git</span>
                  </a>
                </div>

                <div className="mb-4 flex items-center space-x-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Görev ara (görev no, başlık, firma...)..."
                      value={taskSearchTerm}
                      onChange={(e) => setTaskSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={taskStatusFilter}
                    onChange={(e) => setTaskStatusFilter(e.target.value as any)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tüm Durumlar</option>
                    <option value="open">Açık</option>
                    <option value="in_progress">Devam Ediyor</option>
                    <option value="pending_approval">Onay Bekliyor</option>
                    <option value="completed">Tamamlandı</option>
                  </select>
                </div>

                {tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Henüz görev oluşturulmamış</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Görev No</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Başlık</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Durum</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Öncelik</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Firma</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Görev Sahibi</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Sorumlu</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Hedef Tarih</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks
                          .filter(task => {
                            const searchLower = taskSearchTerm.toLowerCase();
                            const matchesSearch = (
                              task.task_number.toLowerCase().includes(searchLower) ||
                              task.title.toLowerCase().includes(searchLower) ||
                              task.company?.name?.toLowerCase().includes(searchLower) ||
                              task.task_owner?.full_name?.toLowerCase().includes(searchLower)
                            );
                            const matchesStatus = taskStatusFilter === 'all' || task.status === taskStatusFilter;
                            return matchesSearch && matchesStatus;
                          })
                          .map(task => (
                            <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                              <td className="py-4 px-4">
                                <span className="font-medium text-gray-900">{task.task_number}</span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-gray-700">{task.title}</span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  task.status === 'open' ? 'bg-blue-100 text-blue-800' :
                                  task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                  task.status === 'pending_approval' ? 'bg-orange-100 text-orange-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {task.status === 'open' ? 'Açık' :
                                   task.status === 'in_progress' ? 'Devam Ediyor' :
                                   task.status === 'pending_approval' ? 'Onay Bekliyor' :
                                   'Tamamlandı'}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {task.priority === 'high' ? 'Yüksek' :
                                   task.priority === 'medium' ? 'Orta' : 'Düşük'}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-gray-700">{task.company?.name || '-'}</span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-gray-700">{task.task_owner?.full_name || '-'}</span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-sm text-gray-700">
                                  {task.assignments && task.assignments.length > 0 ? (
                                    <div>
                                      {task.assignments.slice(0, 2).map((a: any, idx: number) => (
                                        <div key={idx}>
                                          {a.personnel?.user_profiles?.full_name ||
                                           `${a.personnel?.first_name} ${a.personnel?.last_name}`}
                                        </div>
                                      ))}
                                      {task.assignments.length > 2 && (
                                        <span className="text-xs text-gray-500">+{task.assignments.length - 2} diğer</span>
                                      )}
                                    </div>
                                  ) : '-'}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-gray-700">
                                  {task.target_date ? new Date(task.target_date).toLocaleDateString('tr-TR') : '-'}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => setViewingTaskId(task.id)}
                                    className="text-blue-600 hover:text-blue-700 p-1.5"
                                    title="Görüntüle"
                                  >
                                    <FileText className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && <ProjectSettingsTab projectId={projectId} />}

          {activeTab === 'roles' && <ProjectRolesTab projectId={projectId} />}
        </div>

        {showAddUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Kullanıcı Ekle</h2>
              {availableUsers.length === 0 ? (
                <p className="text-gray-600 mb-6">Eklenebilecek kullanıcı yok</p>
              ) : (
                <>
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="İsim veya e-posta ile ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
                    {filteredAvailableUsers.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Kullanıcı bulunamadı</p>
                    ) : (
                      filteredAvailableUsers.map(user => (
                        <button
                          key={user.id}
                          onClick={() => addUserToProject(user.id)}
                          className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition"
                        >
                          <p className="font-medium text-gray-900">{user.full_name || 'İsimsiz'}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
              <button
                onClick={() => {
                  setShowAddUserModal(false);
                  setSearchTerm('');
                }}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Kapat
              </button>
            </div>
          </div>
        )}

        {showAddCompanyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Firma Ekle</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Firma Adı
                  </label>
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Firma adını girin"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && addCompany()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setNewCompanyCategory('employer')}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition ${
                        newCompanyCategory === 'employer'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      İşveren
                    </button>
                    <button
                      onClick={() => setNewCompanyCategory('contractor')}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition ${
                        newCompanyCategory === 'contractor'
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Müteahit
                    </button>
                    <button
                      onClick={() => setNewCompanyCategory('subcontractor')}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition ${
                        newCompanyCategory === 'subcontractor'
                          ? 'border-orange-600 bg-orange-50 text-orange-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Yüklenici
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={addCompany}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Ekle
                </button>
                <button
                  onClick={() => {
                    setShowAddCompanyModal(false);
                    setNewCompanyName('');
                    setNewCompanyCategory('contractor');
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddPersonnelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Personel Ekle</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kullanıcı *</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Kullanıcı ara..."
                      value={personnelUserSearchTerm}
                      onChange={(e) => setPersonnelUserSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <select
                    value={newPersonnelUserId}
                    onChange={(e) => setNewPersonnelUserId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    size={5}
                  >
                    <option value="">Kullanıcı seçiniz...</option>
                    {availableUsersForPersonnel
                      .filter(user => {
                        const searchLower = personnelUserSearchTerm.toLowerCase();
                        return (user.full_name || '').toLowerCase().includes(searchLower) ||
                               user.email.toLowerCase().includes(searchLower);
                      })
                      .map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name || user.email} ({user.email})
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pozisyon</label>
                  <input
                    type="text"
                    value={newPersonnelPosition}
                    onChange={(e) => setNewPersonnelPosition(e.target.value)}
                    placeholder="Pozisyon"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <input
                    type="text"
                    value={newPersonnelPhone}
                    onChange={(e) => setNewPersonnelPhone(e.target.value)}
                    placeholder="Telefon"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Firma</label>
                  <select
                    value={newPersonnelCompanyId}
                    onChange={(e) => setNewPersonnelCompanyId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  >
                    <option value="">Seçiniz...</option>
                    {companies.filter(c => c.is_active).map(company => {
                      const hierarchy = company.company_category === 'employer' ? 'İşveren' :
                                       company.company_category === 'contractor' ? 'Müteahit' : 'Yüklenici';
                      return (
                        <option key={company.id} value={company.id}>
                          {company.name} - {hierarchy}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                  <select
                    value={newPersonnelRoleId}
                    onChange={(e) => setNewPersonnelRoleId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  >
                    <option value="">Seçiniz...</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={addPersonnel}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Ekle
                </button>
                <button
                  onClick={() => {
                    setShowAddPersonnelModal(false);
                    setNewPersonnelUserId('');
                    setNewPersonnelPosition('');
                    setNewPersonnelPhone('');
                    setNewPersonnelCompanyId('');
                    setNewPersonnelRoleId('');
                    setPersonnelUserSearchTerm('');
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {viewingTaskId && (
          <TaskViewSidePanel
            taskId={viewingTaskId}
            onClose={() => setViewingTaskId(null)}
            onEdit={() => {}}
            onUpdate={() => fetchProjectData()}
          />
        )}
      </Layout>
    </ProtectedRoute>
  );
}
