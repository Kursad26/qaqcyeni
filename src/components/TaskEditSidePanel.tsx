import { useState, useEffect } from 'react';
import { X, Save, Plus } from 'lucide-react';
import { supabase, TaskManagementTask, Company, Personnel, TaskManagementCategory } from '../lib/supabase';
import { PhotoUpload } from './PhotoUpload';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { SearchableSelect } from './SearchableSelect';

interface TaskEditSidePanelProps {
  taskId?: string | null;
  onClose: () => void;
  onSave: () => void;
}

export function TaskEditSidePanel({ taskId, onClose, onSave }: TaskEditSidePanelProps) {
  const { userProfile } = useAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [categories, setCategories] = useState<TaskManagementCategory[]>([]);
  const [task, setTask] = useState<TaskManagementTask | null>(null);
  const isNewTask = !taskId;
  const [photos, setPhotos] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company_id: '',
    status: 'open' as const,
    priority: 'medium' as const,
    task_category: '',
    target_date: '',
    assigned_personnel: [] as string[],
    closing_notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [taskId]);

  const fetchData = async () => {
    if (!currentProject) return;

    let projectId = currentProject.id;

    if (taskId) {
      const { data: taskData } = await supabase
        .from('task_management_tasks')
        .select(`
          *,
          assignments:task_management_assignments(personnel_id)
        `)
        .eq('id', taskId)
        .single();

      if (taskData) {
        setTask(taskData as any);
        projectId = taskData.project_id;
        setFormData({
          title: taskData.title,
          description: taskData.description || '',
          company_id: taskData.company_id || '',
          status: taskData.status,
          priority: taskData.priority,
          task_category: taskData.task_category || '',
          target_date: taskData.target_date || '',
          assigned_personnel: (taskData as any).assignments?.map((a: any) => a.personnel_id) || [],
          closing_notes: taskData.closing_notes || ''
        });
      }
    }

    const { data: companiesData } = await supabase
      .from('companies')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('name');

    if (companiesData) setCompanies(companiesData);

    const { data: personnelData } = await supabase
      .from('personnel')
      .select('*, user_profiles(full_name)')
      .eq('project_id', projectId)
      .order('first_name');

    if (personnelData) setPersonnel(personnelData as any);

    const { data: categoriesData } = await supabase
      .from('task_management_categories')
      .select('*')
      .eq('project_id', projectId)
      .order('category_name');

    if (categoriesData) setCategories(categoriesData);

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !currentProject) return;

    if (!isNewTask && formData.status !== task?.status) {
      if (formData.status === 'closed' && !formData.closing_notes?.trim()) {
        alert('Kapatma notları gereklidir');
        return;
      }
    }

    setSaving(true);

    try {
      let finalTaskId = taskId;

      if (isNewTask) {
        const { data: settings } = await supabase
          .from('task_management_settings')
          .select('last_task_number')
          .eq('project_id', currentProject.id)
          .single();

        const nextNumber = (settings?.last_task_number || 0) + 1;
        const taskNumber = `TASK-${nextNumber.toString().padStart(4, '0')}`;

        const { data: newTask, error: createError } = await supabase
          .from('task_management_tasks')
          .insert({
            project_id: currentProject.id,
            task_number: taskNumber,
            title: formData.title,
            description: formData.description || null,
            company_id: formData.company_id || null,
            task_owner_id: userProfile.id,
            status: 'open',
            priority: formData.priority,
            task_category: formData.task_category || null,
            target_date: formData.target_date || null,
            created_by: userProfile.id
          })
          .select()
          .single();

        if (createError) throw createError;
        finalTaskId = newTask.id;

        await supabase
          .from('task_management_settings')
          .update({ last_task_number: nextNumber })
          .eq('project_id', currentProject.id);
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
      }

      const validPersonnel = formData.assigned_personnel.filter(p => p && p.trim());
      if (validPersonnel.length > 0) {
        const assignments = validPersonnel.map(personnelId => ({
          task_id: finalTaskId,
          personnel_id: personnelId,
          role: 'responsible' as const,
          assigned_by: userProfile.id
        }));

        await supabase.from('task_management_assignments').insert(assignments);
      }

      if (photos.length > 0 && finalTaskId) {
        const photoRecords = photos.map(photoUrl => ({
          task_id: finalTaskId,
          photo_url: photoUrl,
          uploaded_by: userProfile.id
        }));
        await supabase.from('task_management_task_photos').insert(photoRecords);
      }

      onSave();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Görev kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl z-50 overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              {isNewTask ? 'Yeni Görev' : 'Görev Düzenle'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Görev Başlığı *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Firma
              </label>
              <SearchableSelect
                options={companies.map(c => ({ value: c.id, label: c.name }))}
                value={formData.company_id}
                onChange={(value) => setFormData({ ...formData, company_id: value })}
                placeholder="Firma seçin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Öncelik
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori
            </label>
            <SearchableSelect
              options={categories.map(c => ({ value: c.category_name, label: c.category_name }))}
              value={formData.task_category}
              onChange={(value) => setFormData({ ...formData, task_category: value })}
              placeholder="Kategori seçin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sorumlu Personel
            </label>
            <div className="space-y-2">
              {formData.assigned_personnel.map((personnelId, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="flex-1">
                    <SearchableSelect
                      options={personnel.map(p => ({
                        value: p.id,
                        label: (p as any).user_profiles?.full_name || `${p.first_name} ${p.last_name}`
                      }))}
                      value={personnelId}
                      onChange={(value) => {
                        const newPersonnel = [...formData.assigned_personnel];
                        newPersonnel[index] = value;
                        setFormData({ ...formData, assigned_personnel: newPersonnel });
                      }}
                      placeholder="Personel seçin"
                    />
                  </div>
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
                <Plus className="w-4 h-4" />
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {isNewTask && (
            <PhotoUpload
              photos={photos}
              onChange={setPhotos}
              maxPhotos={5}
              label="Görev Fotoğrafları"
              bucketName="task-photos"
              folderName="tasks"
            />
          )}

          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
