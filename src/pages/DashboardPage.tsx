import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { supabase, UserTask, Task } from '../lib/supabase';
import { CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import NoAccessPage from './NoAccessPage';

interface TaskWithDetails extends UserTask {
  task: Task;
}

export function DashboardPage() {
  const { userProfile } = useAuth();
  const { currentProject, isProjectOwner, isProjectMember } = useProject();
  const [userTasks, setUserTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccessAndFetchTasks = async () => {
      if (!userProfile || !currentProject) {
        setLoading(false);
        return;
      }

      if (isProjectOwner) {
        setHasAccess(true);
      } else {
        const { data: personnelData, error: personnelError } = await supabase
          .from('personnel')
          .select('dashboard_access')
          .eq('user_id', userProfile.id)
          .eq('project_id', currentProject.id)
          .maybeSingle();

        if (personnelError) {
          console.error('Error checking personnel access:', personnelError);
          setHasAccess(false);
        } else if (!personnelData) {
          setHasAccess(false);
        } else {
          setHasAccess(personnelData.dashboard_access === true);
        }
      }

      const { data, error } = await supabase
        .from('user_tasks')
        .select(`
          *,
          task:tasks!inner(*)
        `)
        .eq('user_id', userProfile.id)
        .eq('task.project_id', currentProject.id)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
      } else {
        setUserTasks(data as TaskWithDetails[] || []);
      }

      setLoading(false);
    };

    checkAccessAndFetchTasks();
  }, [userProfile, currentProject, isProjectOwner]);

  const getProgressPercentage = (completed: number, target: number) => {
    return Math.min((completed / target) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTaskStatus = (task: TaskWithDetails) => {
    const endDate = new Date(task.task.end_date);
    const today = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (task.status === 'completed') return { label: 'Tamamlandı', color: 'text-green-600', icon: CheckCircle };
    if (task.status === 'expired') return { label: 'Süresi Doldu', color: 'text-red-600', icon: AlertCircle };
    if (daysLeft <= 3) return { label: `${daysLeft} gün kaldı`, color: 'text-orange-600', icon: Clock };
    return { label: `${daysLeft} gün kaldı`, color: 'text-blue-600', icon: Clock };
  };

  const activeTasks = userTasks.filter(t => t.status === 'active');
  const completedTasks = userTasks.filter(t => t.status === 'completed');
  const expiredTasks = userTasks.filter(t => t.status === 'expired');

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

  if (hasAccess === false) {
    return <NoAccessPage />;
  }

  if (!currentProject) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-600">Lütfen bir proje seçin</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Hoş geldiniz, {userProfile?.full_name}</p>
            <p className="text-sm text-gray-500 mt-1">Proje: {currentProject.name}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Aktif Görevler</span>
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{activeTasks.length}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Tamamlanan</span>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{completedTasks.length}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Süresi Dolan</span>
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{expiredTasks.length}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Toplam Görev</span>
                <TrendingUp className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{userTasks.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Görevlerim</h2>

            {userTasks.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Henüz size atanmış görev bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userTasks.map((userTask) => {
                  const progress = getProgressPercentage(userTask.completed_count, userTask.task.target_count);
                  const status = getTaskStatus(userTask);
                  const StatusIcon = status.icon;

                  return (
                    <div
                      key={userTask.id}
                      className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {userTask.task.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">{userTask.task.description}</p>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-gray-500">
                              Tür: <span className="font-medium text-gray-700">{userTask.task.task_type}</span>
                            </span>
                            <span className="text-gray-500">
                              Başlangıç: <span className="font-medium text-gray-700">
                                {new Date(userTask.task.start_date).toLocaleDateString('tr-TR')}
                              </span>
                            </span>
                            <span className="text-gray-500">
                              Bitiş: <span className="font-medium text-gray-700">
                                {new Date(userTask.task.end_date).toLocaleDateString('tr-TR')}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className={`flex items-center space-x-2 ${status.color}`}>
                          <StatusIcon className="w-5 h-5" />
                          <span className="text-sm font-medium">{status.label}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">
                            İlerleme: {userTask.completed_count} / {userTask.task.target_count}
                          </span>
                          <span className="font-semibold text-gray-900">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(progress)} transition-all duration-300`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {userTask.success_rate !== null && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <span className="text-sm text-gray-600">
                            Başarı Oranı: <span className="font-semibold text-gray-900">
                              {userTask.success_rate.toFixed(0)}%
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
