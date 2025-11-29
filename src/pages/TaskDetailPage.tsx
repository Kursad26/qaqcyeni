import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { supabase, TaskManagementTask, Company, Personnel } from '../lib/supabase';
import { PhotoUpload } from '../components/PhotoUpload';
import {
  ArrowLeft, Save, X, MessageSquare, Send, FileText, CheckCircle2, PlayCircle, Plus
} from 'lucide-react';

interface TaskDetailPageProps {
  taskId?: string;
}

export function TaskDetailPage({ taskId }: TaskDetailPageProps) {
  const { userProfile } = useAuth();
  const { currentProject } = useProject();
  const isNewTask = !taskId;

  const [loading, setLoading] = useState(!isNewTask);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [taskPhotos, setTaskPhotos] = useState<string[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showWorkLogForm, setShowWorkLogForm] = useState(false);
  const [workLogDescription, setWorkLogDescription] = useState('');
  const [workLogPhotos, setWorkLogPhotos] = useState<string[]>([]);
  const [currentPersonnel, setCurrentPersonnel] = useState<any>(null);
  const [isResponsiblePerson, setIsResponsiblePerson] = useState(false);
  const [isTaskOwnerOrAdmin, setIsTaskOwnerOrAdmin] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company_id: '',
    task_owner_id: userProfile?.id || '',
    status: 'open' as const,
    priority: 'medium' as const,
    task_category: '',
    target_date: '',
    assigned_personnel: [] as string[],
    closing_notes: ''
  });

  useEffect(() => {
    if (currentProject) {
      fetchCompanies();
      fetchPersonnel();
      if (taskId) {
        fetchTask();
        fetchComments();
        fetchWorkLogs();
        fetchTaskPhotos();
        checkUserRole();
      }
    }
  }, [taskId, currentProject, userProfile]);

  const fetchTask = async () => {
    if (!taskId) return;

    const { data, error } = await supabase
      .from('task_management_tasks')
      .select(`
        *,
        assignments:task_management_assignments(personnel_id)
      `)
      .eq('id', taskId)
      .single();

    if (data && !error) {
      setFormData({
        title: data.title,
        description: data.description || '',
        company_id: data.company_id || '',
        task_owner_id: data.task_owner_id,
        status: data.status,
        priority: data.priority,
        task_category: data.task_category || '',
        target_date: data.target_date || '',
        assigned_personnel: data.assignments?.map((a: any) => a.personnel_id) || [],
        closing_notes: data.closing_notes || ''
      });
    }

    setLoading(false);
  };

  const fetchCompanies = async () => {
    if (!currentProject) return;

    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('project_id', currentProject.id)
      .eq('is_active', true)
      .order('name');

    if (data) setCompanies(data);
  };

  const fetchPersonnel = async () => {
    if (!currentProject) return;

    const { data } = await supabase
      .from('personnel')
      .select('*, user_profiles(full_name)')
      .eq('project_id', currentProject.id)
      .order('first_name');

    if (data) setPersonnel(data as any);
  };

  const fetchComments = async () => {
    if (!taskId) return;

    const { data } = await supabase
      .from('task_management_comments')
      .select('*, user_profiles(full_name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (data) setComments(data);
  };

  const fetchWorkLogs = async () => {
    if (!taskId) return;

    const { data } = await supabase
      .from('task_management_work_logs')
      .select(`
        *,
        personnel:personnel(
          id,
          first_name,
          last_name,
          user_profiles(full_name)
        ),
        photos:task_management_work_log_photos(*)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (data) setWorkLogs(data);
  };

  const fetchTaskPhotos = async () => {
    if (!taskId) return;

    const { data } = await supabase
      .from('task_management_task_photos')
      .select('photo_url')
      .eq('task_id', taskId)
      .order('uploaded_at');

    if (data) setTaskPhotos(data.map(p => p.photo_url));
  };

  const checkUserRole = async () => {
    if (!taskId || !userProfile || !currentProject) return;

    const { data: personnelData } = await supabase
      .from('personnel')
      .select('*, task_management_admin')
      .eq('user_id', userProfile.id)
      .eq('project_id', currentProject.id)
      .maybeSingle();

    if (personnelData) {
      setCurrentPersonnel(personnelData);

      const { data: assignments } = await supabase
        .from('task_management_assignments')
        .select('*')
        .eq('task_id', taskId)
        .eq('personnel_id', personnelData.id);

      setIsResponsiblePerson(assignments && assignments.length > 0);

      const isOwner = formData.task_owner_id === userProfile.id || formData.created_by === userProfile.id;
      const isAdmin = personnelData.task_management_admin || userProfile.role === 'admin' || userProfile.role === 'super_admin';
      setIsTaskOwnerOrAdmin(isOwner || isAdmin);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !userProfile) return;

    setSaving(true);

    try {
      if (isNewTask) {
        const { data: settings } = await supabase
          .from('task_management_settings')
          .select('*')
          .eq('project_id', currentProject.id)
          .maybeSingle();

        let taskNumber;
        if (settings) {
          const nextNumber = settings.current_number + 1;
          taskNumber = `${settings.number_prefix}-${String(nextNumber).padStart(3, '0')}`;

          await supabase
            .from('task_management_settings')
            .update({ current_number: nextNumber })
            .eq('id', settings.id);
        } else {
          const { data: newSettings } = await supabase
            .from('task_management_settings')
            .insert({
              project_id: currentProject.id,
              number_prefix: 'NO',
              current_number: 1
            })
            .select()
            .single();

          taskNumber = `${newSettings.number_prefix}-001`;
        }

        const { data: newTask, error: taskError } = await supabase
          .from('task_management_tasks')
          .insert({
            project_id: currentProject.id,
            task_number: taskNumber,
            title: formData.title,
            description: formData.description,
            company_id: formData.company_id || null,
            task_owner_id: formData.task_owner_id,
            status: formData.status,
            priority: formData.priority,
            task_category: formData.task_category || null,
            target_date: formData.target_date || null,
            created_by: userProfile.id
          })
          .select()
          .single();

        if (taskError) throw taskError;

        const validPersonnel = formData.assigned_personnel.filter(p => p && p.trim());
        if (validPersonnel.length > 0 && newTask) {
          const assignments = validPersonnel.map(personnelId => ({
            task_id: newTask.id,
            personnel_id: personnelId,
            role: 'responsible' as const,
            assigned_by: userProfile.id
          }));

          await supabase.from('task_management_assignments').insert(assignments);
        }

        alert('Görev başarıyla oluşturuldu!');
        window.location.href = '/task-management';
      } else {
        const { error: updateError } = await supabase
          .from('task_management_tasks')
          .update({
            title: formData.title,
            description: formData.description,
            company_id: formData.company_id || null,
            status: formData.status,
            priority: formData.priority,
            task_category: formData.task_category || null,
            target_date: formData.target_date || null,
            closing_notes: formData.closing_notes || null,
            closed_at: formData.status === 'closed' ? new Date().toISOString() : null
          })
          .eq('id', taskId);

        if (updateError) throw updateError;

        await supabase
          .from('task_management_assignments')
          .delete()
          .eq('task_id', taskId);

        const validPersonnel = formData.assigned_personnel.filter(p => p && p.trim());
        if (validPersonnel.length > 0) {
          const assignments = validPersonnel.map(personnelId => ({
            task_id: taskId,
            personnel_id: personnelId,
            role: 'responsible' as const,
            assigned_by: userProfile.id
          }));

          await supabase.from('task_management_assignments').insert(assignments);
        }

        alert('Görev başarıyla güncellendi!');
        fetchTask();
      }
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Görev kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !taskId || !userProfile) return;

    const { error } = await supabase
      .from('task_management_comments')
      .insert({
        task_id: taskId,
        user_id: userProfile.id,
        comment_text: newComment.trim()
      });

    if (!error) {
      setNewComment('');
      fetchComments();
    }
  };

  const handleAddWorkLog = async () => {
    if (!workLogDescription.trim() || !taskId || !currentPersonnel) {
      alert('Lütfen çalışma açıklaması girin');
      return;
    }

    try {
      const { data: workLog, error: workLogError } = await supabase
        .from('task_management_work_logs')
        .insert({
          task_id: taskId,
          personnel_id: currentPersonnel.id,
          log_description: workLogDescription.trim()
        })
        .select()
        .single();

      if (workLogError) throw workLogError;

      if (workLogPhotos.length > 0 && workLog) {
        const photoRecords = workLogPhotos.map(photoUrl => ({
          work_log_id: workLog.id,
          photo_url: photoUrl
        }));
        await supabase.from('task_management_work_log_photos').insert(photoRecords);
      }

      await supabase
        .from('task_management_tasks')
        .update({ status: 'pending_approval' })
        .eq('id', taskId);

      setWorkLogDescription('');
      setWorkLogPhotos([]);
      setShowWorkLogForm(false);
      fetchWorkLogs();
      fetchTask();
      alert('Çalışma kaydı eklendi ve görev onay beklemeye alındı');
    } catch (error) {
      console.error('Error adding work log:', error);
      alert('Çalışma kaydı eklenirken hata oluştu');
    }
  };

  const handleStartWork = async () => {
    if (!confirm('Bu görevi "Devam Ediyor" durumuna almak istiyor musunuz?')) return;

    const { error } = await supabase
      .from('task_management_tasks')
      .update({ status: 'in_progress' })
      .eq('id', taskId);

    if (!error) {
      fetchTask();
      alert('Görev "Devam Ediyor" durumuna alındı');
    } else {
      alert('Durum güncellenirken hata oluştu');
    }
  };

  const handleApproveAndClose = async () => {
    if (!confirm('Bu görevi onaylayıp kapatmak istediğinizden emin misiniz?')) return;

    const { error } = await supabase
      .from('task_management_tasks')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (!error) {
      fetchTask();
      alert('Görev başarıyla kapatıldı');
    } else {
      alert('Görev kapatılırken hata oluştu');
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      open: 'Açık',
      in_progress: 'Devam Ediyor',
      pending_approval: 'Onay Bekliyor',
      closed: 'Kapalı'
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { label: string; color: string } } = {
      open: { label: 'Açık', color: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'Devam Ediyor', color: 'bg-yellow-100 text-yellow-800' },
      pending_approval: { label: 'Onay Bekliyor', color: 'bg-orange-100 text-orange-800' },
      closed: { label: 'Kapalı', color: 'bg-green-100 text-green-800' }
    };

    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
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
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => window.location.href = '/task-management'}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {isNewTask ? 'Yeni Görev' : 'Görev Detayı'}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Görev Başlığı *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Görev başlığını girin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Görev açıklamasını girin"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Firma
                  </label>
                  <select
                    value={formData.company_id}
                    onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seçiniz</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durum
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="open">Açık</option>
                    <option value="in_progress">Devam Ediyor</option>
                    <option value="pending_approval">Onay Bekliyor</option>
                    <option value="closed">Kapalı</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Öncelik
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hedef Tarih
                  </label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori
                </label>
                <input
                  type="text"
                  value={formData.task_category}
                  onChange={(e) => setFormData({ ...formData, task_category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Örn: Kalite, Güvenlik, İmalat vb."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sorumlu Personel
                </label>
                <div className="space-y-2">
                  {formData.assigned_personnel.map((personnelId, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <select
                        value={personnelId}
                        onChange={(e) => {
                          const newPersonnel = [...formData.assigned_personnel];
                          newPersonnel[index] = e.target.value;
                          setFormData({ ...formData, assigned_personnel: newPersonnel });
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Personel seçin</option>
                        {personnel.map(p => (
                          <option key={p.id} value={p.id}>
                            {(p as any).user_profiles?.full_name || `${p.first_name} ${p.last_name}`}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const newPersonnel = formData.assigned_personnel.filter((_, i) => i !== index);
                          setFormData({ ...formData, assigned_personnel: newPersonnel });
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, assigned_personnel: [...formData.assigned_personnel, ''] })}
                    className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Sorumlu Ekle</span>
                  </button>
                </div>
              </div>

              {formData.status === 'closed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kapama Notları
                  </label>
                  <textarea
                    value={formData.closing_notes}
                    onChange={(e) => setFormData({ ...formData, closing_notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Görev kapatma notlarını girin"
                  />
                </div>
              )}

              <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.location.href = '/task-management'}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  İptal
                </button>
              </div>
            </div>
          </form>

          {!isNewTask && taskPhotos.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Görev Fotoğrafları</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {taskPhotos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Görev fotoğrafı ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border border-gray-300"
                  />
                ))}
              </div>
            </div>
          )}

          {!isNewTask && formData.status === 'open' && isResponsiblePerson && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Görevi Başlat</h3>
                  <p className="text-gray-700">Bu görevi üzerine alıp çalışmaya başlayabilirsiniz</p>
                </div>
                <button
                  onClick={handleStartWork}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <PlayCircle className="w-5 h-5" />
                  <span>İşe Başla</span>
                </button>
              </div>
            </div>
          )}

          {!isNewTask && isResponsiblePerson && formData.status === 'in_progress' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <FileText className="w-6 h-6" />
                  <span>Çalışma Kaydı Ekle</span>
                </h2>
                {!showWorkLogForm && (
                  <button
                    onClick={() => setShowWorkLogForm(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Yeni Kayıt</span>
                  </button>
                )}
              </div>

              {showWorkLogForm && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Çalışma Açıklaması *
                    </label>
                    <textarea
                      value={workLogDescription}
                      onChange={(e) => setWorkLogDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Yapılan işlemi açıklayın..."
                    />
                  </div>

                  <PhotoUpload
                    photos={workLogPhotos}
                    onChange={setWorkLogPhotos}
                    maxPhotos={5}
                    label="Çalışma Fotoğrafları"
                    bucketName="task-work-log-photos"
                    folderName="work-logs"
                  />

                  <div className="flex space-x-3">
                    <button
                      onClick={handleAddWorkLog}
                      className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Save className="w-5 h-5" />
                      <span>Kaydet ve Onaya Gönder</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowWorkLogForm(false);
                        setWorkLogDescription('');
                        setWorkLogPhotos([]);
                      }}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isNewTask && workLogs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <FileText className="w-6 h-6" />
                <span>Çalışma Kayıtları</span>
              </h2>
              <div className="space-y-4">
                {workLogs.map((log: any) => (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {log.personnel?.user_profiles?.full_name || `${log.personnel?.first_name} ${log.personnel?.last_name}`}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{log.log_description}</p>
                    {log.photos && log.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {log.photos.map((photo: any, idx: number) => (
                          <img
                            key={idx}
                            src={photo.photo_url}
                            alt={`Çalışma fotoğrafı ${idx + 1}`}
                            className="w-full aspect-square object-cover rounded-lg border border-gray-300"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isNewTask && isTaskOwnerOrAdmin && formData.status === 'pending_approval' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Onay Bekleyen Görev</h3>
                  <p className="text-gray-700">Bu görev onay bekliyor. Çalışma kayıtlarını kontrol edip görevi kapatabilirsiniz.</p>
                </div>
                <button
                  onClick={handleApproveAndClose}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Onayla ve Kapat</span>
                </button>
              </div>
            </div>
          )}

          {!isNewTask && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <MessageSquare className="w-6 h-6" />
                <span>Yorumlar</span>
              </h2>

              <div className="space-y-4 mb-6">
                {comments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Henüz yorum yok</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {(comment as any).user_profiles?.full_name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(comment.created_at).toLocaleString('tr-TR')}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.comment_text}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex space-x-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Yorum ekle..."
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center space-x-2"
                >
                  <Send className="w-5 h-5" />
                  <span>Gönder</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
