import { Edit2, Save, X, ToggleRight, ToggleLeft, Trash2 } from 'lucide-react';

interface SettingsListItemProps {
  id: string;
  name: string;
  isActive: boolean;
  isEditing: boolean;
  editValue: string;
  onStartEdit: (id: string, name: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
}

export function SettingsListItem({
  id,
  name,
  isActive,
  isEditing,
  editValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onToggleStatus,
  onDelete,
}: SettingsListItemProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50">
      {isEditing ? (
        <div className="flex-1 flex space-x-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
          />
          <button onClick={() => onSaveEdit(id)} className="text-green-600 hover:text-green-700">
            <Save className="w-4 h-4" />
          </button>
          <button onClick={onCancelEdit} className="text-red-600 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <span className="text-sm font-medium text-gray-900">{name}</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onStartEdit(id, name)}
              className="p-1 text-gray-600 hover:text-blue-600 rounded transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onToggleStatus(id, isActive)}
              className="p-1 rounded transition"
            >
              {isActive ? (
                <ToggleRight className="w-5 h-5 text-green-600" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-gray-400" />
              )}
            </button>
            <button
              onClick={() => onDelete(id)}
              className="p-1 text-red-600 hover:text-red-700 rounded transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
