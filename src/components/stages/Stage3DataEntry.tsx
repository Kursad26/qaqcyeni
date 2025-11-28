import { useState } from 'react';
import { FieldObservationFormData } from '../../lib/fieldObservationTypes';

interface Stage3Props {
  formData: FieldObservationFormData;
  onChange: (data: Partial<FieldObservationFormData>) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function Stage3DataEntry({
  formData,
  onChange,
  onSubmit,
  disabled = false,
}: Stage3Props) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.root_cause?.trim()) newErrors.root_cause = 'Kök sebep zorunludur';
    if (!formData.suggested_action?.trim()) newErrors.suggested_action = 'Önerilen faaliyet zorunludur';
    if (!formData.planned_close_date) newErrors.planned_close_date = 'Planlanan kapama tarihi zorunludur';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (formData.planned_close_date && new Date(formData.planned_close_date) < today) {
      newErrors.planned_close_date = 'Planlanan kapama tarihi bugünden önce olamaz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Aşama 3: Veri Girişi</h2>
        <p className="text-gray-600">
          Lütfen kök sebep analizi ve önerilen faaliyetleri giriniz.
        </p>
      </div>

      {/* Data Entry Form */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 space-y-6">
        <div className="border-b pb-3">
          <h3 className="text-xl font-bold text-gray-900">Veri Girişi Formu</h3>
          <p className="text-sm text-gray-600 mt-1">Lütfen aşağıdaki bilgileri eksiksiz doldurunuz</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kök Sebep <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.root_cause}
            onChange={(e) => onChange({ root_cause: e.target.value })}
            placeholder="Sorunun kök sebebini detaylı olarak açıklayınız..."
            disabled={disabled}
            rows={4}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.root_cause ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50' : ''}`}
          />
          {errors.root_cause && (
            <p className="mt-1 text-sm text-red-600">{errors.root_cause}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Önerilen Faaliyet <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.suggested_action}
            onChange={(e) => onChange({ suggested_action: e.target.value })}
            placeholder="Önerilen faaliyetleri detaylı olarak yazınız..."
            disabled={disabled}
            rows={4}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.suggested_action ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50' : ''}`}
          />
          {errors.suggested_action && (
            <p className="mt-1 text-sm text-red-600">{errors.suggested_action}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Düzeltici Faaliyet Gerekli Mi?
          </label>
          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                checked={formData.corrective_action_required === true}
                onChange={() => onChange({ corrective_action_required: true })}
                disabled={disabled}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700">Evet</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                checked={formData.corrective_action_required === false}
                onChange={() => onChange({ corrective_action_required: false })}
                disabled={disabled}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700">Hayır</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Planlanan Kapama Tarihi <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.planned_close_date}
            onChange={(e) => onChange({ planned_close_date: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            disabled={disabled}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.planned_close_date ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50' : ''}`}
          />
          {errors.planned_close_date && (
            <p className="mt-1 text-sm text-red-600">{errors.planned_close_date}</p>
          )}
        </div>

        {!disabled && (
          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={handleSubmit}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md hover:shadow-lg"
            >
              Kaydet ve Listeye Dön
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
