import { useState } from 'react';
import { Search, X } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface SearchableFilterGroupProps {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  maxHeight?: string;
}

export function SearchableFilterGroup({
  label,
  options,
  selectedValues,
  onChange,
  maxHeight = '200px'
}: SearchableFilterGroupProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const toggleAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(o => o.value));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium text-gray-700">{label}</label>
        {selectedValues.length > 0 && (
          <span className="text-xs text-blue-600 font-medium">
            {selectedValues.length} seçili
          </span>
        )}
      </div>

      <div className="border border-gray-200 rounded-lg bg-white">
        {/* Search box */}
        {options.length > 5 && (
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ara..."
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Select all option */}
        {options.length > 1 && (
          <div className="px-2 py-1 border-b border-gray-100">
            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={selectedValues.length === options.length}
                onChange={toggleAll}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Tümünü Seç</span>
            </label>
          </div>
        )}

        {/* Options list */}
        <div className="p-2 space-y-1 overflow-y-auto" style={{ maxHeight }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <label
                key={option.value}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={() => toggleOption(option.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-2">
              {searchTerm ? 'Sonuç bulunamadı' : 'Seçenek yok'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
