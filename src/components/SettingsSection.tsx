import { Plus } from 'lucide-react';
import { ReactNode } from 'react';
import { SettingsListItem } from './SettingsListItem';

interface Item {
  id: string;
  name: string;
  is_active: boolean;
}

interface SettingsSectionProps<T extends Item> {
  title: string;
  icon: ReactNode;
  items: T[];
  showAdd: boolean;
  newItemName: string;
  editingId: string | null;
  editingValue: string;
  onShowAdd: () => void;
  onHideAdd: () => void;
  onNewItemNameChange: (value: string) => void;
  onAddItem: () => void;
  onStartEdit: (id: string, name: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
  placeholder?: string;
  emptyMessage?: string;
}

export function SettingsSection<T extends Item>({
  title,
  icon,
  items,
  showAdd,
  newItemName,
  editingId,
  editingValue,
  onShowAdd,
  onHideAdd,
  onNewItemNameChange,
  onAddItem,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onToggleStatus,
  onDelete,
  placeholder = 'Yeni öğe adı',
  emptyMessage = 'Henüz öğe eklenmedi',
}: SettingsSectionProps<T>) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {icon}
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>
        <button
          onClick={onShowAdd}
          className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showAdd && (
        <div className="mb-3 p-3 bg-gray-50 rounded-md">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => onNewItemNameChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md mb-2"
            onKeyPress={(e) => e.key === 'Enter' && onAddItem()}
          />
          <div className="flex space-x-2">
            <button
              onClick={onAddItem}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Kaydet
            </button>
            <button
              onClick={() => {
                onHideAdd();
                onNewItemNameChange('');
              }}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1 max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-gray-500 text-center text-sm py-4">{emptyMessage}</p>
        ) : (
          items.map((item) => (
            <SettingsListItem
              key={item.id}
              id={item.id}
              name={item.name}
              isActive={item.is_active}
              isEditing={editingId === item.id}
              editValue={editingValue}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onEditValueChange={onEditValueChange}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
