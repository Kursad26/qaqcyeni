import { useState, useEffect } from 'react';
import { X, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';

interface TaskCommentsPanelProps {
  onClose: () => void;
  onTaskClick: (taskId: string) => void;
}

interface CommentWithTask {
  id: string;
  task_id: string;
  comment_text: string;
  created_at: string;
  user_profiles: {
    full_name: string;
  };
  task: {
    task_number: string;
    title: string;
    status: string;
  };
}

export function TaskCommentsPanel({ onClose, onTaskClick }: TaskCommentsPanelProps) {
  const { currentProject } = useProject();
  const [comments, setComments] = useState<CommentWithTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (currentProject) {
      fetchAllComments();
    }
  }, [currentProject]);

  const fetchAllComments = async () => {
    if (!currentProject) return;

    setLoading(true);

    const { data: tasksData } = await supabase
      .from('task_management_tasks')
      .select('id')
      .eq('project_id', currentProject.id);

    if (!tasksData || tasksData.length === 0) {
      setComments([]);
      setLoading(false);
      return;
    }

    const taskIds = tasksData.map(t => t.id);

    const { data, error } = await supabase
      .from('task_management_comments')
      .select(`
        id,
        task_id,
        comment_text,
        created_at,
        user_profiles(full_name),
        task:task_management_tasks!task_id(
          task_number,
          title,
          status
        )
      `)
      .in('task_id', taskIds)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setComments(data as any);
    }

    setLoading(false);
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
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition"
        >
          <MessageSquare className="w-5 h-5" />
          <span>Görev Yorumları</span>
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />
      <div className="fixed bottom-0 right-0 w-full md:w-[500px] h-[600px] bg-white shadow-2xl z-50 rounded-t-2xl overflow-hidden flex flex-col">
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">Görev Yorumları</h2>
              <p className="text-xs text-blue-100">Tüm görevlerdeki yorumlar</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 hover:bg-blue-700 rounded-lg transition"
              title="Küçült"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-700 rounded-lg transition"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Yükleniyor...</p>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Henüz yorum yok</p>
                <p className="text-gray-400 text-sm mt-2">Görevlere yorum eklendiğinde burada görünecek</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  onClick={() => {
                    onTaskClick(comment.task_id);
                    onClose();
                  }}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-blue-600 text-sm">
                          {(comment.task as any)?.task_number}
                        </span>
                        {(comment.task as any)?.status && getStatusBadge((comment.task as any).status)}
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                        {(comment.task as any)?.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-2 text-xs text-gray-600">
                    <span className="font-medium">{comment.user_profiles?.full_name}</span>
                    <span>•</span>
                    <span>{new Date(comment.created_at).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>

                  <p className="text-gray-700 text-sm line-clamp-2">
                    {comment.comment_text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
          <button
            onClick={fetchAllComments}
            className="w-full px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            Yenile
          </button>
        </div>
      </div>
    </>
  );
}
