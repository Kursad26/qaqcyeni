import { useState, useEffect } from 'react';
import {
  X, Edit2, MessageSquare, Send, FileText, CheckCircle2,
  ListTodo, StickyNote, ListChecks, Plus, Trash2, GripVertical,
  Check, Circle, ChevronRight, ChevronDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { FileUpload } from './FileUpload';

interface TaskViewSidePanelProps {
  taskId: string;
  onClose: () => void;
  onEdit: (taskId: string) => void;
  onUpdate: () => void;
}

interface Todo {
  id: string;
  content: string;
  is_completed: boolean;
  created_by_name: string;
  completed_by_name: string | null;
  display_order: number;
}

interface Note {
  id: string;
  content: string;
  note_type: 'text' | 'bullet' | 'heading';
  created_by_name: string;
  display_order: number;
}

interface Subtask {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'completed';
  assigned_to: string | null;
  display_order: number;
  personnel?: {
    user_profiles?: { full_name: string };
    first_name: string;
    last_name: string;
  };
}

export function TaskViewSidePanel({ taskId, onClose, onEdit, onUpdate }: TaskViewSidePanelProps) {
  const { userProfile } = useAuth();
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [taskPhotos, setTaskPhotos] = useState<string[]>([]);
  const [newComment, setNewComment] = useState('');
  const [workLogDescription, setWorkLogDescription] = useState('');
  const [workLogFiles, setWorkLogFiles] = useState<Array<{ url: string; name: string; size: number }>>([]);
  const [currentPersonnel, setCurrentPersonnel] = useState<any>(null);
  const [isResponsiblePerson, setIsResponsiblePerson] = useState(false);
  const [isTaskOwnerOrAdmin, setIsTaskOwnerOrAdmin] = useState(false);

  // TODO, Notes, Subtasks states
  const [todos, setTodos] = useState<Todo[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newNoteType, setNewNoteType] = useState<'text' | 'bullet' | 'heading'>('text');
  const [newSubtask, setNewSubtask] = useState({ title: '', description: '' });
  const [showNewSubtaskForm, setShowNewSubtaskForm] = useState(false);

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    todos: true,
    notes: true,
    subtasks: true,
    workLog: true
  });

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
      fetchTodos();
      fetchNotes();
      fetchSubtasks();
    }
  }, [taskId]);

  useEffect(() => {
    if (task && userProfile && currentProject) {
      checkUserRole();
    }
  }, [task, userProfile, currentProject]);

  const fetchTaskDetails = async () => {
    setLoading(true);

    const { data: taskData } = await supabase
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
      .eq('id', taskId)
      .single();

    if (taskData) setTask(taskData);

    const { data: commentsData } = await supabase
      .from('task_management_comments')
      .select('*, user_profiles(full_name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (commentsData) setComments(commentsData);

    const { data: workLogsData } = await supabase
      .from('task_management_work_logs')
      .select(`
        *,
        personnel:personnel(
          id,
          first_name,
          last_name,
          user_profiles(full_name)
        ),
        photos:task_management_work_log_photos(*),
        files:task_management_work_log_files(*)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (workLogsData) setWorkLogs(workLogsData);

    const { data: photosData } = await supabase
      .from('task_management_task_photos')
      .select('photo_url')
      .eq('task_id', taskId)
      .order('uploaded_at');

    if (photosData) setTaskPhotos(photosData.map(p => p.photo_url));

    setLoading(false);
  };

  const fetchTodos = async () => {
    const { data } = await supabase
      .from('task_management_todos')
      .select('*')
      .eq('task_id', taskId)
      .order('display_order');

    if (data) setTodos(data);
  };

  const fetchNotes = async () => {
    const { data } = await supabase
      .from('task_management_notes')
      .select('*')
      .eq('task_id', taskId)
      .order('display_order');

    if (data) setNotes(data);
  };

  const fetchSubtasks = async () => {
    const { data } = await supabase
      .from('task_management_subtasks')
      .select(`
        *,
        personnel:personnel(
          id,
          first_name,
          last_name,
          user_profiles(full_name)
        )
      `)
      .eq('parent_task_id', taskId)
      .order('display_order');

    if (data) setSubtasks(data);
  };

  // PDF indirme fonksiyonu (CORS sorununu aşmak için)
  const handleDownloadFile = async (fileUrl: string, fileName: string, fileType: string) => {
    // Eğer PDF değilse, normal link davranışı
    if (fileType !== 'application/pdf') {
      window.open(fileUrl, '_blank');
      return;
    }

    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: yeni tab'da aç
      window.open(fileUrl, '_blank');
    }
  };

  const checkUserRole = async () => {
    if (!taskId || !userProfile || !currentProject) return;

    const isSystemAdmin = userProfile.role === 'admin' || userProfile.role === 'super_admin';

    if (isSystemAdmin) {
      setIsTaskOwnerOrAdmin(true);
      setIsResponsiblePerson(true);
      return;
    }

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

      const isOwner = task?.task_owner_id === userProfile.id || task?.created_by === userProfile.id;
      const isAdmin = personnelData.task_management_admin;
      setIsTaskOwnerOrAdmin(isOwner || isAdmin);
    } else {
      setIsTaskOwnerOrAdmin(false);
      setIsResponsiblePerson(false);
    }
  };

  // TODO Functions
  const handleAddTodo = async () => {
    if (!newTodo.trim() || !userProfile) return;

    const maxOrder = todos.length > 0 ? Math.max(...todos.map(t => t.display_order)) : 0;

    const { error } = await supabase
      .from('task_management_todos')
      .insert({
        task_id: taskId,
        content: newTodo.trim(),
        created_by: userProfile.id,
        created_by_name: userProfile.full_name,
        display_order: maxOrder + 1
      });

    if (error) {
      console.error('TODO ekleme hatası:', error);
      alert('TODO eklenirken hata oluştu: ' + error.message);
      return;
    }

    setNewTodo('');
    fetchTodos();
  };

  const handleToggleTodo = async (todo: Todo) => {
    if (!userProfile) return;

    const { error } = await supabase
      .from('task_management_todos')
      .update({
        is_completed: !todo.is_completed,
        completed_by: !todo.is_completed ? userProfile.id : null,
        completed_by_name: !todo.is_completed ? userProfile.full_name : null,
        completed_at: !todo.is_completed ? new Date().toISOString() : null
      })
      .eq('id', todo.id);

    if (!error) fetchTodos();
  };

  const handleDeleteTodo = async (id: string) => {
    const { error } = await supabase
      .from('task_management_todos')
      .delete()
      .eq('id', id);

    if (!error) fetchTodos();
  };

  // Notes Functions
  const handleAddNote = async () => {
    if (!newNote.trim() || !userProfile) return;

    const maxOrder = notes.length > 0 ? Math.max(...notes.map(n => n.display_order)) : 0;

    const { error } = await supabase
      .from('task_management_notes')
      .insert({
        task_id: taskId,
        content: newNote.trim(),
        note_type: newNoteType,
        created_by: userProfile.id,
        created_by_name: userProfile.full_name,
        display_order: maxOrder + 1
      });

    if (error) {
      console.error('Not ekleme hatası:', error);
      alert('Not eklenirken hata oluştu: ' + error.message);
      return;
    }

    setNewNote('');
    setNewNoteType('text');
    fetchNotes();
  };

  const handleDeleteNote = async (id: string) => {
    const { error } = await supabase
      .from('task_management_notes')
      .delete()
      .eq('id', id);

    if (!error) fetchNotes();
  };

  // Subtasks Functions
  const handleAddSubtask = async () => {
    if (!newSubtask.title.trim() || !userProfile) return;

    const maxOrder = subtasks.length > 0 ? Math.max(...subtasks.map(s => s.display_order)) : 0;

    const { error } = await supabase
      .from('task_management_subtasks')
      .insert({
        parent_task_id: taskId,
        title: newSubtask.title.trim(),
        description: newSubtask.description.trim() || null,
        created_by: userProfile.id,
        display_order: maxOrder + 1
      });

    if (!error) {
      setNewSubtask({ title: '', description: '' });
      setShowNewSubtaskForm(false);
      fetchSubtasks();
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    const { error } = await supabase
      .from('task_management_subtasks')
      .update({
        status: subtask.status === 'open' ? 'completed' : 'open',
        completed_at: subtask.status === 'open' ? new Date().toISOString() : null
      })
      .eq('id', subtask.id);

    if (!error) fetchSubtasks();
  };

  const handleDeleteSubtask = async (id: string) => {
    const { error } = await supabase
      .from('task_management_subtasks')
      .delete()
      .eq('id', id);

    if (!error) fetchSubtasks();
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !userProfile) return;

    const { error } = await supabase
      .from('task_management_comments')
      .insert({
        task_id: taskId,
        user_id: userProfile.id,
        comment_text: newComment.trim()
      });

    if (!error) {
      setNewComment('');
      fetchTaskDetails();
    }
  };

  const handleAddWorkLog = async () => {
    if (!workLogDescription.trim()) {
      alert('Lütfen çalışma açıklaması girin');
      return;
    }

    // Önce currentPersonnel'i kontrol et, yoksa veritabanından ara
    let effectivePersonnelId = currentPersonnel?.id;

    if (!effectivePersonnelId) {
      // Debug: Mevcut değerleri logla
      console.log('Personnel arama parametreleri:', {
        project_id: currentProject?.id,
        project_name: currentProject?.name,
        user_id: userProfile?.id,
        user_email: userProfile?.email
      });

      // Kullanıcının personnel kaydını ara (admin veya normal user fark etmeksizin)
      const { data: projectPersonnel, error: personnelError } = await supabase
        .from('personnel')
        .select('*')
        .eq('project_id', currentProject?.id)
        .eq('user_id', userProfile?.id)
        .maybeSingle();

      console.log('Personnel sorgu sonucu:', { data: projectPersonnel, error: personnelError });

      if (personnelError) {
        console.error('Personnel sorgu hatası:', personnelError);
        alert('Personnel kaydı kontrol edilirken hata oluştu: ' + personnelError.message);
        return;
      }

      if (projectPersonnel) {
        effectivePersonnelId = projectPersonnel.id;
        console.log('Personnel bulundu:', effectivePersonnelId);
      } else {
        // Personnel kaydı yok, otomatik oluştur
        console.log('Personnel kaydı bulunamadı, otomatik oluşturuluyor...');

        // Kullanıcının adını böl (first_name, last_name için)
        const nameParts = (userProfile?.full_name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const { data: newPersonnel, error: createError } = await supabase
          .from('personnel')
          .insert({
            project_id: currentProject?.id,
            user_id: userProfile?.id,
            first_name: firstName,
            last_name: lastName,
            email: userProfile?.email,
            task_management_access: true,
            dashboard_access: true
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Personnel oluşturma hatası:', createError);
          alert('Personnel kaydı oluşturulamadı: ' + createError.message);
          return;
        }

        if (newPersonnel) {
          effectivePersonnelId = newPersonnel.id;
          console.log('Yeni personnel kaydı oluşturuldu:', effectivePersonnelId);
        } else {
          alert('Personnel kaydı oluşturulamadı. Lütfen proje yöneticisine başvurun.');
          return;
        }
      }
    }

    try {
      const { data: workLog, error: workLogError } = await supabase
        .from('task_management_work_logs')
        .insert({
          task_id: taskId,
          personnel_id: effectivePersonnelId,
          log_description: workLogDescription.trim()
        })
        .select()
        .single();

      if (workLogError) throw workLogError;

      // Dosyaları kaydet
      if (workLogFiles.length > 0 && workLog) {
        const fileRecords = workLogFiles.map(file => ({
          work_log_id: workLog.id,
          file_url: file.url,
          file_name: file.name,
          file_size: file.size,
          file_type: file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          uploaded_by: userProfile.id
        }));
        const { error: filesError } = await supabase.from('task_management_work_log_files').insert(fileRecords);

        if (filesError) {
          console.error('Dosya kayıt hatası:', filesError);
          alert('Dosyalar kaydedilirken hata oluştu: ' + filesError.message);
          return;
        }
      }

      // Statüyü onay beklemeye al
      const { error: statusError } = await supabase
        .from('task_management_tasks')
        .update({ status: 'pending_approval' })
        .eq('id', taskId);

      if (statusError) {
        console.error('Status güncelleme hatası:', statusError);
        alert('Görev durumu güncellenirken hata oluştu: ' + statusError.message);
        return;
      }

      setWorkLogDescription('');
      setWorkLogFiles([]);
      fetchTaskDetails();
      onUpdate();
      alert('Çalışma kaydı eklendi ve görev onay beklemeye alındı');
    } catch (error) {
      console.error('Error adding work log:', error);
      alert('Çalışma kaydı eklenirken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
    }
  };

  const handleApprove = async () => {
    if (!confirm('Bu görevi onaylayıp tamamlamak istediğinizden emin misiniz?')) return;

    const { error } = await supabase
      .from('task_management_tasks')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) {
      console.error('Görev onaylama hatası:', error);
      alert('Görev tamamlanırken hata oluştu: ' + error.message);
      return;
    }

    fetchTaskDetails();
    onUpdate();
    alert('Görev başarıyla tamamlandı');
  };

  const handleReject = async () => {
    const reason = prompt('Reddetme sebebini girin:');
    if (!reason || !reason.trim()) return;

    const { error } = await supabase
      .from('task_management_tasks')
      .update({ status: 'open' })
      .eq('id', taskId);

    if (!error) {
      await supabase
        .from('task_management_comments')
        .insert({
          task_id: taskId,
          user_id: userProfile!.id,
          comment_text: `⚠️ KAPANMA REDDEDİLDİ: ${reason.trim()}`
        });

      fetchTaskDetails();
      onUpdate();
      alert('Görev reddedildi ve "Açık" durumuna alındı');
    } else {
      alert('Görev reddedilirken hata oluştu');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { label: string; color: string } } = {
      open: { label: 'Açık', color: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'Devam Ediyor', color: 'bg-purple-100 text-purple-800' },
      pending_approval: { label: 'Onay Bekliyor', color: 'bg-orange-100 text-orange-800' },
      closed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'İptal Edildi', color: 'bg-red-100 text-red-800' }
    };

    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
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
      <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <div className="fixed right-0 top-0 h-full w-[800px] bg-white shadow-2xl z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-[800px] bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-gray-900">{task.task_number}</h2>
            {getStatusBadge(task.status)}
            {getPriorityBadge(task.priority)}
          </div>
          <div className="flex items-center space-x-2">
            {(isTaskOwnerOrAdmin || task.created_by === userProfile?.id) && (
              <button
                onClick={() => onEdit(taskId)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Düzenle"
              >
                <Edit2 className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Task Info */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{task.title}</h3>
            {task.description && (
              <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-600">Firma</span>
              <p className="text-gray-900">{task.company?.name || '-'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Görev Sahibi</span>
              <p className="text-gray-900">{task.task_owner?.full_name || '-'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Kategori</span>
              <p className="text-gray-900">{task.task_category || '-'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Hedef Tarih</span>
              <p className="text-gray-900">
                {task.target_date ? new Date(task.target_date).toLocaleDateString('tr-TR') : '-'}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-sm font-medium text-gray-600">Sorumlu Personel</span>
              <div className="mt-1 space-y-1">
                {task.assignments && task.assignments.length > 0 ? (
                  task.assignments.map((a: any, idx: number) => (
                    <div key={idx} className="text-gray-900">
                      {a.personnel?.user_profiles?.full_name ||
                       `${a.personnel?.first_name} ${a.personnel?.last_name}`}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-900">-</p>
                )}
              </div>
            </div>
          </div>

          {taskPhotos.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Görev Fotoğrafları</h4>
              <div className="grid grid-cols-3 gap-3">
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

          {/* NOTION-STYLE WORKSPACE */}
          <div className="border-2 border-gray-300 rounded-lg bg-gray-50 min-h-[400px]">
            <div className="p-4 bg-white border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                <StickyNote className="w-5 h-5 text-purple-600" />
                <span>Çalışma Alanı</span>
                <span className="text-xs text-gray-500 ml-2">
                  (TODO: {todos.filter(t => !t.is_completed).length} | Notlar: {notes.length} | Alt Görevler: {subtasks.filter(s => s.status === 'open').length})
                </span>
              </h4>
            </div>

            <div className="p-5 space-y-4">
              {/* Add New Item Toolbar */}
              <div className="bg-white border-2 border-gray-300 rounded-lg p-4 space-y-3 shadow-sm">
                {/* TODO Input */}
                <div className="flex items-center space-x-2">
                  <ListTodo className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <input
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTodo();
                      }
                    }}
                    placeholder="TODO ekle (Enter ile kaydet)..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddTodo();
                    }}
                    disabled={!newTodo.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>TODO</span>
                  </button>
                </div>

                {/* Note Input */}
                <div className="flex items-start space-x-2">
                  <StickyNote className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-2" />
                  <select
                    value={newNoteType}
                    onChange={(e) => setNewNoteType(e.target.value as any)}
                    className="px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-xs"
                  >
                    <option value="text">Metin</option>
                    <option value="bullet">Madde</option>
                    <option value="heading">Başlık</option>
                  </select>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Not ekle (Notion tarzı)..."
                    rows={2}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 text-sm resize-none"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddNote();
                    }}
                    disabled={!newNote.trim()}
                    className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50 text-sm flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Not</span>
                  </button>
                </div>

                {/* Subtask Input */}
                {!showNewSubtaskForm ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowNewSubtaskForm(true);
                    }}
                    className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-sm text-gray-600 hover:text-purple-700 flex items-center justify-center space-x-2"
                  >
                    <ListChecks className="w-4 h-4" />
                    <span>+ Alt Görev Ekle</span>
                  </button>
                ) : (
                  <div className="border-2 border-purple-300 rounded-lg p-3 bg-purple-50 space-y-2">
                    <input
                      type="text"
                      value={newSubtask.title}
                      onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                      placeholder="Alt görev başlığı"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                    <textarea
                      value={newSubtask.description}
                      onChange={(e) => setNewSubtask({ ...newSubtask, description: e.target.value })}
                      placeholder="Açıklama (opsiyonel)"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddSubtask();
                        }}
                        disabled={!newSubtask.title.trim()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 text-sm"
                      >
                        Ekle
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowNewSubtaskForm(false);
                          setNewSubtask({ title: '', description: '' });
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Workspace Content - All items in one unified list */}
              <div className="space-y-2">
                {/* Show all TODOs */}
                {todos.map(todo => (
                  <div
                    key={`todo-${todo.id}`}
                    className="bg-white border border-blue-200 rounded-lg p-3 hover:shadow-sm transition group"
                  >
                    <div className="flex items-start space-x-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleTodo(todo);
                        }}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {todo.is_completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-blue-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <ListTodo className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-700">TODO</span>
                        </div>
                        <p className={`text-sm mt-1 ${todo.is_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {todo.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {todo.is_completed && todo.completed_by_name ? (
                            <>✓ {todo.completed_by_name}</>
                          ) : (
                            <>{todo.created_by_name}</>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteTodo(todo.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Show all Notes */}
                {notes.map(note => (
                  <div
                    key={`note-${note.id}`}
                    className="bg-white border border-yellow-200 rounded-lg p-3 hover:shadow-sm transition group"
                  >
                    <div className="flex items-start space-x-3">
                      <StickyNote className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        {note.note_type === 'heading' && (
                          <h5 className="text-base font-bold text-gray-900">{note.content}</h5>
                        )}
                        {note.note_type === 'bullet' && (
                          <p className="text-sm text-gray-900 flex items-start">
                            <span className="mr-2 font-bold">•</span>
                            <span className="flex-1">{note.content}</span>
                          </p>
                        )}
                        {note.note_type === 'text' && (
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{note.created_by_name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Show all Subtasks */}
                {subtasks.map(subtask => (
                  <div
                    key={`subtask-${subtask.id}`}
                    className="bg-white border border-purple-200 rounded-lg p-3 hover:shadow-sm transition group"
                  >
                    <div className="flex items-start space-x-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleSubtask(subtask);
                        }}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {subtask.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-purple-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <ListChecks className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-700">ALT GÖREV</span>
                        </div>
                        <p className={`font-medium text-sm mt-1 ${subtask.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {subtask.title}
                        </p>
                        {subtask.description && (
                          <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{subtask.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteSubtask(subtask.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Empty State */}
                {todos.length === 0 && notes.length === 0 && subtasks.length === 0 && (
                  <div className="text-center py-12">
                    <StickyNote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Çalışma alanı boş</p>
                    <p className="text-gray-400 text-xs mt-1">TODO, not veya alt görev ekleyerek başlayın</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* WORK LOG - Always Visible for Open Tasks */}
          {task.status === 'open' && (
            <div className="border border-blue-200 rounded-lg bg-blue-50">
              <div
                className="p-4 cursor-pointer flex items-center justify-between hover:bg-blue-100 transition"
                onClick={() => toggleSection('workLog')}
              >
                <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Çalışmayı Tamamla ve Onaya Gönder</span>
                </h4>
                {expandedSections.workLog ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>

              {expandedSections.workLog && (
                <div className="p-4 pt-0 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Çalışma Açıklaması *
                    </label>
                    <textarea
                      value={workLogDescription}
                      onChange={(e) => setWorkLogDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Yapılan işlemi detaylı olarak açıklayın..."
                    />
                  </div>

                  <FileUpload
                    files={workLogFiles}
                    onChange={setWorkLogFiles}
                    maxFiles={5}
                    maxSizeMB={10}
                    label="Dosyalar (PDF, Resim)"
                  />

                  <button
                    onClick={handleAddWorkLog}
                    disabled={!workLogDescription.trim()}
                    className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Kaydet ve Onaya Gönder</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* WORK LOGS */}
          {workLogs.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Çalışma Kayıtları</span>
              </h4>
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
                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">{log.log_description}</p>
                    {log.photos && log.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
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
                    {log.files && log.files.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Dosyalar:</p>
                        {log.files.map((file: any, idx: number) => (
                          <div
                            key={idx}
                            onClick={() => handleDownloadFile(file.file_url, file.file_name, file.file_type)}
                            className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                          >
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-600 hover:underline">{file.file_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* APPROVAL SECTION */}
          {isTaskOwnerOrAdmin && task.status === 'pending_approval' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Onay Bekleyen Görev</h4>
                <p className="text-sm text-gray-700 mb-4">Çalışma kayıtlarını kontrol edip görevi onaylayabilir veya reddedebilirsiniz</p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleApprove}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Onayla ve Tamamla</span>
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    <X className="w-5 h-5" />
                    <span>Reddet</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* COMMENTS */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>Yorumlar</span>
            </h4>

            <div className="space-y-3 mb-4">
              {comments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Henüz yorum yok</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 text-sm">
                        {(comment as any).user_profiles?.full_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{comment.comment_text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex space-x-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Yorum ekle..."
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {task.closed_at && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600">
                Kapatılma Tarihi: {new Date(task.closed_at).toLocaleString('tr-TR')}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
