import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { supabase, TaskManagementTask, Company, Personnel, UserProfile } from '../lib/supabase';
import { ResizableTable } from '../components/ResizableTable';
import { TaskEditSidePanel } from '../components/TaskEditSidePanel';
import { TaskViewSidePanel } from '../components/TaskViewSidePanel';
import { TaskCommentsPanel } from '../components/TaskCommentsPanel';
import {
  ClipboardList, Plus, Download, Search, Edit2, Trash2, FileText,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Filter, MessageSquare
} from 'lucide-react';
import NoAccessPage from './NoAccessPage';
import { useTaskManagementAccess } from '../hooks/useTaskManagementAccess';

interface TaskWithDetails extends TaskManagementTask {
  company?: Company;
  task_owner?: UserProfile;
  created_by_user?: UserProfile;
  assignments?: Array<{
    id: string;
    personnel: Personnel & { user_profiles?: UserProfile };
    role: string;
  }>;
}

export function TaskManagementPage() {
  const { userProfile } = useAuth();
  const { currentProject } = useProject();
  const { hasAccess, isAdmin, loading: accessLoading } = useTaskManagementAccess();

  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showNewTaskPanel, setShowNewTaskPanel] = useState(false);
  const ITEMS_PER_PAGE = 10;

  const [filters, setFilters] = useState({
    status: [] as string[],
    priority: [] as string[],
    company: [] as string[],
    assignedTo: [] as string[],
    myTasks: false,
    assignedToMe: false,
    startDate: '',
    endDate: ''
  });

  const [groupBy, setGroupBy] = useState<'none' | 'company' | 'assignee'>('none');
  const [groupToggles, setGroupToggles] = useState<{[key: string]: boolean}>({});

  const [toggleStates, setToggleStates] = useState(() => {
    const saved = localStorage.getItem('task-management-toggles');
    return saved ? JSON.parse(saved) : {
      allTasks: true
    };
  });

  const toggleSection = (section: keyof typeof toggleStates) => {
    setToggleStates(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    localStorage.setItem('task-management-toggles', JSON.stringify(toggleStates));
  }, [toggleStates]);

  const [categories, setCategories] = useState<any[]>([]);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);

  useEffect(() => {
    if (hasAccess && currentProject) {
      fetchTasks();
      fetchCategories();
    } else {
      setLoading(false);
    }
  }, [hasAccess, currentProject]);

  const fetchTasks = async () => {
    if (!currentProject) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('task_management_tasks')
      .select(`
        *,
        company:companies(id, name),
        task_owner:user_profiles!task_owner_id(id, full_name),
        created_by_user:user_profiles!created_by(id, full_name),
        assignments:task_management_assignments(
          id,
          role,
          personnel:personnel(
            id,
            first_name,
            last_name,
            user_id,
            user_profiles(id, full_name)
          )
        )
      `)
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks(data as any || []);
    }

    setLoading(false);
  };

  const fetchCategories = async () => {
    if (!currentProject) return;

    const { data } = await supabase
      .from('task_management_categories')
      .select('*')
      .eq('project_id', currentProject.id)
      .order('category_name');

    if (data) setCategories(data);
  };

  const addCategory = async () => {
    if (!newCategoryName.trim() || !userProfile || !currentProject) {
      alert('Lütfen kategori adı girin');
      return;
    }

    const { error } = await supabase
      .from('task_management_categories')
      .insert({
        project_id: currentProject.id,
        category_name: newCategoryName.trim(),
        created_by: userProfile.id
      });

    if (error) {
      console.error('Kategori ekleme hatası:', error);
      if (error.code === '23505') {
        alert('Bu kategori adı zaten mevcut');
      } else if (error.message.includes('permission')) {
        alert('Kategori eklemek için yetkiniz yok');
      } else {
        alert(`Kategori eklenirken hata oluştu: ${error.message}`);
      }
    } else {
      setNewCategoryName('');
      fetchCategories();
      alert('Kategori başarıyla eklendi');
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return;

    const { error } = await supabase
      .from('task_management_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Kategori silme hatası:', error);
      if (error.message.includes('permission')) {
        alert('Kategori silmek için yetkiniz yok');
      } else {
        alert(`Kategori silinirken hata oluştu: ${error.message}`);
      }
    } else {
      fetchCategories();
      alert('Kategori başarıyla silindi');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Bu görevi silmek istediğinizden emin misiniz?')) return;

    const { error } = await supabase
      .from('task_management_tasks')
      .delete()
      .eq('id', taskId);

    if (!error) {
      await fetchTasks();
      alert('Görev başarıyla silindi');
    } else {
      alert('Görev silinirken hata oluştu');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { label: string; color: string } } = {
      open: { label: 'Açık', color: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'Devam Ediyor', color: 'bg-yellow-100 text-yellow-800' },
      pending_approval: { label: 'Onay Bekliyor', color: 'bg-orange-100 text-orange-800' },
      closed: { label: 'Kapalı', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' }
    };

    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const badges: { [key: string]: { label: string; color: string } } = {
      high: { label: 'Yüksek', color: 'bg-red-100 text-red-800' },
      medium: { label: 'Orta', color: 'bg-yellow-100 text-yellow-800' },
      low: { label: 'Düşük', color: 'bg-green-100 text-green-800' }
    };

    const badge = badges[priority] || { label: priority, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const exportToExcel = () => {
    const data = filteredTasks.map(task => ({
      'Görev No': task.task_number,
      'Başlık': task.title,
      'Durum': getStatusText(task.status),
      'Öncelik': getPriorityText(task.priority),
      'Firma': task.company?.name || '-',
      'Görev Sahibi': task.task_owner?.full_name || '-',
      'Sorumlu Personel': task.assignments?.map(a =>
        a.personnel?.user_profiles?.full_name ||
        `${a.personnel?.first_name} ${a.personnel?.last_name}`
      ).join(', ') || '-',
      'Kategori': task.task_category || '-',
      'Hedef Tarih': task.target_date ? new Date(task.target_date).toLocaleDateString('tr-TR') : '-',
      'Oluşturan': task.created_by_user?.full_name || '-',
      'Oluşturulma Tarihi': new Date(task.created_at).toLocaleDateString('tr-TR')
    }));

    const separator = ';';
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(separator),
      ...data.map(row => headers.map(h => {
        const value = (row as any)[h] || '';
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      }).join(separator))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gorev-takip-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusText = (status: string) => {
    const statusTexts: { [key: string]: string } = {
      open: 'Açık',
      in_progress: 'Devam Ediyor',
      pending_approval: 'Onay Bekliyor',
      closed: 'Kapalı',
      completed: 'Tamamlandı'
    };
    return statusTexts[status] || status;
  };

  const getPriorityText = (priority: string) => {
    const priorityTexts: { [key: string]: string } = {
      high: 'Yüksek',
      medium: 'Orta',
      low: 'Düşük'
    };
    return priorityTexts[priority] || priority;
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const filteredTasks = tasks.filter(task => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      task.task_number.toLowerCase().includes(searchLower) ||
      task.title.toLowerCase().includes(searchLower) ||
      task.description?.toLowerCase().includes(searchLower) ||
      task.company?.name?.toLowerCase().includes(searchLower) ||
      task.task_owner?.full_name?.toLowerCase().includes(searchLower) ||
      task.task_category?.toLowerCase().includes(searchLower) ||
      task.assignments?.some(a =>
        a.personnel?.user_profiles?.full_name?.toLowerCase().includes(searchLower) ||
        a.personnel?.first_name?.toLowerCase().includes(searchLower) ||
        a.personnel?.last_name?.toLowerCase().includes(searchLower)
      )
    );

    const matchesStatus = filters.status.length === 0 || filters.status.includes(task.status);
    const matchesPriority = filters.priority.length === 0 || filters.priority.includes(task.priority);
    const matchesCompany = filters.company.length === 0 || filters.company.includes(task.company_id || '');
    const matchesAssignee = filters.assignedTo.length === 0 ||
      task.assignments?.some(a => filters.assignedTo.includes(a.personnel?.id || ''));

    const matchesMyTasks = !filters.myTasks || (
      task.task_owner_id === userProfile?.id ||
      task.created_by === userProfile?.id
    );

    const matchesAssignedToMe = !filters.assignedToMe || (
      task.assignments?.some(a => a.personnel?.user_id === userProfile?.id)
    );

    // Date range filter
    const taskDate = new Date(task.due_date || task.created_at);
    const matchesStartDate = !filters.startDate || taskDate >= new Date(filters.startDate);
    const matchesEndDate = !filters.endDate || taskDate <= new Date(filters.endDate);

    return matchesSearch && matchesStatus && matchesPriority && matchesCompany && matchesAssignee && matchesMyTasks && matchesAssignedToMe && matchesStartDate && matchesEndDate;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let aValue: any = a[sortColumn as keyof TaskManagementTask];
    let bValue: any = b[sortColumn as keyof TaskManagementTask];

    if (sortColumn === 'company') {
      aValue = a.company?.name || '';
      bValue = b.company?.name || '';
    } else if (sortColumn === 'task_owner') {
      aValue = a.task_owner?.full_name || '';
      bValue = b.task_owner?.full_name || '';
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Gruplama mantığı
  const getGroupedTasks = () => {
    if (groupBy === 'none') {
      return null;
    }

    const groups: { [key: string]: TaskWithDetails[] } = {};

    sortedTasks.forEach(task => {
      if (groupBy === 'company') {
        const groupKey = task.company?.name || 'Firma Atanmamış';
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(task);
      } else if (groupBy === 'assignee') {
        // Bir görev birden fazla sorumluya atanabilir, her sorumlu için ayrı gruba ekle
        if (task.assignments && task.assignments.length > 0) {
          task.assignments.forEach(assignment => {
            const personName = assignment.personnel?.user_profiles?.full_name ||
              `${assignment.personnel?.first_name} ${assignment.personnel?.last_name}`;
            const groupKey = personName || 'Sorumlu Atanmamış';
            if (!groups[groupKey]) {
              groups[groupKey] = [];
            }
            // Aynı görevi bir gruba birden fazla kez eklememek için kontrol et
            if (!groups[groupKey].find(t => t.id === task.id)) {
              groups[groupKey].push(task);
            }
          });
        } else {
          const groupKey = 'Sorumlu Atanmamış';
          if (!groups[groupKey]) {
            groups[groupKey] = [];
          }
          groups[groupKey].push(task);
        }
      }
    });

    return groups;
  };

  const groupedTasks = getGroupedTasks();

  const totalPages = Math.ceil(sortedTasks.length / ITEMS_PER_PAGE);
  const paginatedTasks = sortedTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCount = tasks.filter(t => t.status === 'open').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const pendingApprovalCount = tasks.filter(t => t.status === 'pending_approval').length;
  const closedCount = tasks.filter(t => t.status === 'completed' || t.status === 'closed').length;

  if (accessLoading || loading) {
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

  if (hasAccess === false) {
    return <NoAccessPage />;
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ClipboardList className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Görev Takibi</h1>
                <p className="text-gray-600 mt-1">Proje: {currentProject?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCommentsPanel(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Yorumlar</span>
              </button>
              <button
                onClick={() => setShowNewTaskPanel(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-5 h-5" />
                <span>Yeni Görev</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Açık</span>
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{openCount}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Devam Ediyor</span>
                <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{inProgressCount}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Onay Bekliyor</span>
                <div className="w-3 h-3 rounded-full bg-orange-600"></div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{pendingApprovalCount}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Kapalı</span>
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{closedCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div
              className="p-6 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition border-b border-gray-200"
              onClick={() => toggleSection('allTasks')}
            >
              <h2 className="text-xl font-bold text-gray-900">
                Tüm Görevler
                <span className="ml-2 text-sm font-normal text-gray-600">({tasks.length} adet)</span>
              </h2>
              {toggleStates.allTasks ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </div>
            {toggleStates.allTasks && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div></div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setFilters({ ...filters, myTasks: !filters.myTasks, assignedToMe: false })}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                      filters.myTasks
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>Benim Görevlerim</span>
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, assignedToMe: !filters.assignedToMe, myTasks: false })}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                      filters.assignedToMe
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>Bana Atanan Görevler</span>
                  </button>
                  <div className="h-6 w-px bg-gray-300"></div>
                  <button
                    onClick={() => setGroupBy(groupBy === 'company' ? 'none' : 'company')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                      groupBy === 'company'
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>Firma Bazlı</span>
                  </button>
                  <button
                    onClick={() => setGroupBy(groupBy === 'assignee' ? 'none' : 'assignee')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                      groupBy === 'assignee'
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>Sorumlu Bazlı</span>
                  </button>
                  <div className="h-6 w-px bg-gray-300"></div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    <Filter className="w-5 h-5" />
                    <span>Filtreler</span>
                  </button>
                  <button
                    onClick={exportToExcel}
                    disabled={tasks.length === 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    <Download className="w-5 h-5" />
                    <span>Excel İndir</span>
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Filtreler</h3>
                    <button
                      onClick={() => {
                        setFilters({
                          status: [],
                          priority: [],
                          company: [],
                          assignedTo: [],
                          myTasks: false,
                          assignedToMe: false,
                          startDate: '',
                          endDate: ''
                        });
                        setGroupBy('none');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Filtreleri Temizle
                    </button>
                  </div>
                  {/* Date Range Filter */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Durum</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                        {[
                          { value: 'open', label: 'Açık' },
                          { value: 'in_progress', label: 'Devam Ediyor' },
                          { value: 'pending_approval', label: 'Onay Bekliyor' },
                          { value: 'completed', label: 'Tamamlandı' }
                        ].map(option => (
                          <label key={option.value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={filters.status.includes(option.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFilters({ ...filters, status: [...filters.status, option.value] });
                                } else {
                                  setFilters({ ...filters, status: filters.status.filter(s => s !== option.value) });
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Öncelik</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                        {[
                          { value: 'high', label: 'Yüksek' },
                          { value: 'medium', label: 'Orta' },
                          { value: 'low', label: 'Düşük' }
                        ].map(option => (
                          <label key={option.value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={filters.priority.includes(option.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFilters({ ...filters, priority: [...filters.priority, option.value] });
                                } else {
                                  setFilters({ ...filters, priority: filters.priority.filter(p => p !== option.value) });
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Firma</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                        {Array.from(new Set(tasks.filter(t => t.company).map(t => t.company!.id)))
                          .map(companyId => {
                            const company = tasks.find(t => t.company?.id === companyId)?.company;
                            return company ? (
                              <label key={company.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={filters.company.includes(company.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFilters({ ...filters, company: [...filters.company, company.id] });
                                    } else {
                                      setFilters({ ...filters, company: filters.company.filter(c => c !== company.id) });
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{company.name}</span>
                              </label>
                            ) : null;
                          })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Sorumlu Kişi</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                        {Array.from(new Set(
                          tasks.flatMap(t => t.assignments?.map(a => a.personnel?.id) || []).filter(Boolean)
                        )).map(personnelId => {
                          const assignment = tasks
                            .flatMap(t => t.assignments || [])
                            .find(a => a.personnel?.id === personnelId);
                          const personnel = assignment?.personnel;
                          return personnel ? (
                            <label key={personnel.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={filters.assignedTo.includes(personnel.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFilters({ ...filters, assignedTo: [...filters.assignedTo, personnel.id] });
                                  } else {
                                    setFilters({ ...filters, assignedTo: filters.assignedTo.filter(a => a !== personnel.id) });
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">
                                {(personnel as any).user_profiles?.full_name || `${personnel.first_name} ${personnel.last_name}`}
                              </span>
                            </label>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Görev ara (görev no, başlık, firma, sorumlu vb.)..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Henüz görev oluşturulmamış</p>
                </div>
              ) : groupedTasks ? (
                // Gruplandırılmış görünüm
                <div className="space-y-6">
                  {Object.entries(groupedTasks).sort(([a], [b]) => a.localeCompare(b, 'tr')).map(([groupName, groupTasks]) => (
                    <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className={`px-4 py-3 cursor-pointer flex items-center justify-between ${
                          groupBy === 'company' ? 'bg-purple-50 border-b border-purple-200' : 'bg-indigo-50 border-b border-indigo-200'
                        }`}
                        onClick={() => setGroupToggles(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                      >
                        <h3 className={`text-lg font-semibold ${
                          groupBy === 'company' ? 'text-purple-900' : 'text-indigo-900'
                        }`}>
                          {groupName} <span className="text-sm font-normal opacity-75">({groupTasks.length} görev)</span>
                        </h3>
                        {groupToggles[groupName] === false ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronUp className="w-5 h-5" />
                        )}
                      </div>
                      {groupToggles[groupName] !== false && (
                      <ResizableTable
                        columns={[
                          {
                            key: 'task_number',
                            header: 'Görev No',
                            width: 120,
                            minWidth: 100,
                            sortable: true,
                            render: (task) => (
                              <span className="font-medium text-gray-900">{task.task_number}</span>
                            )
                          },
                          {
                            key: 'title',
                            header: 'Başlık',
                            width: 250,
                            minWidth: 150,
                            sortable: true,
                            render: (task) => (
                              <span className="text-gray-700">{task.title}</span>
                            )
                          },
                          {
                            key: 'status',
                            header: 'Durum',
                            width: 150,
                            minWidth: 120,
                            sortable: true,
                            render: (task) => getStatusBadge(task.status)
                          },
                          {
                            key: 'priority',
                            header: 'Öncelik',
                            width: 100,
                            minWidth: 80,
                            sortable: true,
                            render: (task) => getPriorityBadge(task.priority)
                          },
                          {
                            key: 'company',
                            header: 'Firma',
                            width: 180,
                            minWidth: 120,
                            sortable: true,
                            render: (task) => (
                              <span className="text-gray-700">{task.company?.name || '-'}</span>
                            )
                          },
                          {
                            key: 'task_owner',
                            header: 'Görev Sahibi',
                            width: 180,
                            minWidth: 120,
                            sortable: true,
                            render: (task) => (
                              <span className="text-gray-700">{task.task_owner?.full_name || '-'}</span>
                            )
                          },
                          {
                            key: 'assignments',
                            header: 'Sorumlu Personel',
                            width: 200,
                            minWidth: 150,
                            render: (task) => (
                              <div className="text-sm text-gray-700">
                                {task.assignments && task.assignments.length > 0 ? (
                                  <div className="space-y-1">
                                    {task.assignments.map((a, idx) => (
                                      <div key={idx}>
                                        {a.personnel?.user_profiles?.full_name ||
                                         `${a.personnel?.first_name} ${a.personnel?.last_name}`}
                                      </div>
                                    ))}
                                  </div>
                                ) : '-'}
                              </div>
                            )
                          },
                          {
                            key: 'target_date',
                            header: 'Hedef Tarih',
                            width: 120,
                            minWidth: 100,
                            sortable: true,
                            render: (task) => (
                              <span className="text-gray-700">
                                {task.target_date ? new Date(task.target_date).toLocaleDateString('tr-TR') : '-'}
                              </span>
                            )
                          },
                          {
                            key: 'created_at',
                            header: 'Oluşturulma',
                            width: 120,
                            minWidth: 100,
                            sortable: true,
                            render: (task) => (
                              <span className="text-gray-700">{new Date(task.created_at).toLocaleDateString('tr-TR')}</span>
                            )
                          },
                          {
                            key: 'actions',
                            header: 'İşlemler',
                            width: 120,
                            minWidth: 100,
                            render: (task) => (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => setViewingTaskId(task.id)}
                                  className="text-blue-600 hover:text-blue-700 p-1.5"
                                  title="Görüntüle"
                                >
                                  <FileText className="w-5 h-5" />
                                </button>
                                {(isAdmin || task.created_by === userProfile?.id) && (
                                  <>
                                    <button
                                      onClick={() => setEditingTaskId(task.id)}
                                      className="text-gray-600 hover:text-blue-600 p-1.5"
                                      title="Düzenle"
                                    >
                                      <Edit2 className="w-5 h-5" />
                                    </button>
                                    {isAdmin && (
                                      <button
                                        onClick={() => deleteTask(task.id)}
                                        className="text-red-600 hover:text-red-700 p-1.5"
                                        title="Sil"
                                      >
                                        <Trash2 className="w-5 h-5" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )
                          }
                        ]}
                        data={groupTasks}
                        storageKey={`task-management-columns-${currentProject?.id}-${groupName}`}
                        onSort={handleSort}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                      />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // Normal görünüm
                <ResizableTable
                  columns={[
                    {
                      key: 'task_number',
                      header: 'Görev No',
                      width: 120,
                      minWidth: 100,
                      sortable: true,
                      render: (task) => (
                        <span className="font-medium text-gray-900">{task.task_number}</span>
                      )
                    },
                    {
                      key: 'title',
                      header: 'Başlık',
                      width: 250,
                      minWidth: 150,
                      sortable: true,
                      render: (task) => (
                        <span className="text-gray-700">{task.title}</span>
                      )
                    },
                    {
                      key: 'status',
                      header: 'Durum',
                      width: 150,
                      minWidth: 120,
                      sortable: true,
                      render: (task) => getStatusBadge(task.status)
                    },
                    {
                      key: 'priority',
                      header: 'Öncelik',
                      width: 100,
                      minWidth: 80,
                      sortable: true,
                      render: (task) => getPriorityBadge(task.priority)
                    },
                    {
                      key: 'company',
                      header: 'Firma',
                      width: 180,
                      minWidth: 120,
                      sortable: true,
                      render: (task) => (
                        <span className="text-gray-700">{task.company?.name || '-'}</span>
                      )
                    },
                    {
                      key: 'task_owner',
                      header: 'Görev Sahibi',
                      width: 180,
                      minWidth: 120,
                      sortable: true,
                      render: (task) => (
                        <span className="text-gray-700">{task.task_owner?.full_name || '-'}</span>
                      )
                    },
                    {
                      key: 'assignments',
                      header: 'Sorumlu Personel',
                      width: 200,
                      minWidth: 150,
                      render: (task) => (
                        <div className="text-sm text-gray-700">
                          {task.assignments && task.assignments.length > 0 ? (
                            <div className="space-y-1">
                              {task.assignments.map((a, idx) => (
                                <div key={idx}>
                                  {a.personnel?.user_profiles?.full_name ||
                                   `${a.personnel?.first_name} ${a.personnel?.last_name}`}
                                </div>
                              ))}
                            </div>
                          ) : '-'}
                        </div>
                      )
                    },
                    {
                      key: 'target_date',
                      header: 'Hedef Tarih',
                      width: 120,
                      minWidth: 100,
                      sortable: true,
                      render: (task) => (
                        <span className="text-gray-700">
                          {task.target_date ? new Date(task.target_date).toLocaleDateString('tr-TR') : '-'}
                        </span>
                      )
                    },
                    {
                      key: 'created_at',
                      header: 'Oluşturulma',
                      width: 120,
                      minWidth: 100,
                      sortable: true,
                      render: (task) => (
                        <span className="text-gray-700">{new Date(task.created_at).toLocaleDateString('tr-TR')}</span>
                      )
                    },
                    {
                      key: 'actions',
                      header: 'İşlemler',
                      width: 120,
                      minWidth: 100,
                      render: (task) => (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setViewingTaskId(task.id)}
                            className="text-blue-600 hover:text-blue-700 p-1.5"
                            title="Görüntüle"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                          {(isAdmin || task.created_by === userProfile?.id) && (
                            <>
                              <button
                                onClick={() => setEditingTaskId(task.id)}
                                className="text-gray-600 hover:text-blue-600 p-1.5"
                                title="Düzenle"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="text-red-600 hover:text-red-700 p-1.5"
                                  title="Sil"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )
                    }
                  ]}
                  data={paginatedTasks}
                  storageKey={`task-management-columns-${currentProject?.id}`}
                  onSort={handleSort}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                />
              )}

              {!groupedTasks && sortedTasks.length > ITEMS_PER_PAGE && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Toplam {sortedTasks.length} kayıt - Sayfa {currentPage} / {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Önceki</span>
                    </button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-2 border rounded-lg ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <span>Sonraki</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>

          {isAdmin && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <ClipboardList className="w-6 h-6" />
                  <span>Kategori Yönetimi</span>
                </h2>
                <button
                  onClick={() => setShowCategoryManagement(!showCategoryManagement)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showCategoryManagement ? 'Gizle' : 'Göster'}
                </button>
              </div>

              {showCategoryManagement && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Yeni kategori adı"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                    />
                    <button
                      onClick={addCategory}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Ekle</span>
                    </button>
                  </div>

                  {categories.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Henüz kategori eklenmemiş</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                        >
                          <span className="font-medium text-gray-900">{category.category_name}</span>
                          <button
                            onClick={() => deleteCategory(category.id)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(editingTaskId || showNewTaskPanel) && (
            <TaskEditSidePanel
              taskId={showNewTaskPanel ? null : editingTaskId}
              onClose={() => {
                setEditingTaskId(null);
                setShowNewTaskPanel(false);
              }}
              onSave={() => {
                fetchTasks();
                setEditingTaskId(null);
                setShowNewTaskPanel(false);
              }}
            />
          )}

          {viewingTaskId && (
            <TaskViewSidePanel
              taskId={viewingTaskId}
              onClose={() => setViewingTaskId(null)}
              onEdit={(taskId) => {
                setViewingTaskId(null);
                setEditingTaskId(taskId);
              }}
              onUpdate={() => fetchTasks()}
            />
          )}

          {showCommentsPanel && (
            <TaskCommentsPanel
              onClose={() => setShowCommentsPanel(false)}
              onTaskClick={(taskId) => {
                setShowCommentsPanel(false);
                setViewingTaskId(taskId);
              }}
            />
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
