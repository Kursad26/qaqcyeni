import { useState } from 'react';
import { TaskManagementTask, Company, Personnel, UserProfile } from '../lib/supabase';
import { Calendar, User, Building2, AlertCircle } from 'lucide-react';

interface TaskWithDetails extends TaskManagementTask {
  company?: Company;
  task_owner?: UserProfile;
  assignments?: Array<{
    id: string;
    personnel: Personnel & { user_profiles?: UserProfile };
    role: string;
  }>;
}

interface KanbanBoardProps {
  tasks: TaskWithDetails[];
  onTaskClick: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  isAdmin: boolean;
}

export function KanbanBoard({ tasks, onTaskClick, onStatusChange, isAdmin }: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const columns = [
    { id: 'open', title: 'Açık', color: 'bg-blue-50 border-blue-200' },
    { id: 'in_progress', title: 'Devam Ediyor', color: 'bg-yellow-50 border-yellow-200' },
    { id: 'pending_approval', title: 'Onay Bekliyor', color: 'bg-orange-50 border-orange-200' },
    { id: 'closed', title: 'Kapalı', color: 'bg-green-50 border-green-200' }
  ];

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-l-red-500';
      case 'medium':
        return 'border-l-4 border-l-yellow-500';
      case 'low':
        return 'border-l-4 border-l-green-500';
      default:
        return 'border-l-4 border-l-gray-300';
    }
  };

  const isOverdue = (targetDate: string | null) => {
    if (!targetDate) return false;
    return new Date(targetDate) < new Date();
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (newStatus: string) => {
    if (draggedTask) {
      const task = tasks.find(t => t.id === draggedTask);
      if (task && task.status !== newStatus) {
        await onStatusChange(draggedTask, newStatus);
      }
      setDraggedTask(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {columns.map(column => {
        const columnTasks = getTasksByStatus(column.id);

        return (
          <div
            key={column.id}
            className={`rounded-lg border-2 ${column.color} p-4`}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{column.title}</h3>
              <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-700">
                {columnTasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {columnTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Görev yok
                </div>
              ) : (
                columnTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    onClick={() => onTaskClick(task.id)}
                    className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition ${getPriorityColor(task.priority)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">{task.task_number}</span>
                      {task.priority === 'high' && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full font-medium">
                          Yüksek
                        </span>
                      )}
                    </div>

                    <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="space-y-2">
                      {task.company && (
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <Building2 className="w-3.5 h-3.5" />
                          <span className="truncate">{task.company.name}</span>
                        </div>
                      )}

                      {task.task_owner && (
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <User className="w-3.5 h-3.5" />
                          <span className="truncate">{task.task_owner.full_name}</span>
                        </div>
                      )}

                      {task.target_date && (
                        <div className={`flex items-center space-x-2 text-xs ${
                          isOverdue(task.target_date) ? 'text-red-600 font-medium' : 'text-gray-600'
                        }`}>
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(task.target_date).toLocaleDateString('tr-TR')}</span>
                          {isOverdue(task.target_date) && (
                            <AlertCircle className="w-3.5 h-3.5" />
                          )}
                        </div>
                      )}
                    </div>

                    {task.assignments && task.assignments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Sorumlu:</div>
                        <div className="flex flex-wrap gap-1">
                          {task.assignments.slice(0, 2).map((assignment, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {assignment.personnel?.user_profiles?.full_name ||
                               `${assignment.personnel?.first_name} ${assignment.personnel?.last_name}`}
                            </span>
                          ))}
                          {task.assignments.length > 2 && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                              +{task.assignments.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
