import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { PhotoUpload } from '../PhotoUpload';
import { FieldObservationFormData } from '../../lib/fieldObservationTypes';

interface Stage4Props {
  formData: FieldObservationFormData;
  onChange: (data: Partial<FieldObservationFormData>) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function Stage4ClosingProcess({ formData, onChange, onSubmit, disabled = false }: Stage4Props) {
  const [showPreviousStages, setShowPreviousStages] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.closing_action?.trim()) {
      newErrors.closing_action = 'Alınan aksiyon zorunludur';
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Aşama 4: Kapama İşlemi</h2>
        <p className="text-gray-600">
          Lütfen alınan aksiyonları ve kapama fotoğraflarını giriniz.
        </p>
      </div>

      {formData.rejection_reason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Red Sebebi</h3>
            <p className="text-red-800 text-sm">{formData.rejection_reason}</p>
          </div>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg">
        <button
          onClick={() => setShowPreviousStages(!showPreviousStages)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition rounded-lg"
        >
          <span className="font-medium text-gray-700">Önceki Aşamaların Bilgileri</span>
          {showPreviousStages ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showPreviousStages && (
          <div className="px-4 pb-4 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">Form Numarası:</span>
                <p className="text-gray-900">{formData.report_number || '-'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Lokasyon:</span>
                <p className="text-gray-900">{formData.location_description || '-'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Seviye:</span>
                <p className="text-gray-900">{formData.severity === 'major' ? 'Majör' : 'Minör'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Planlanan Kapama:</span>
                <p className="text-gray-900">
                  {formData.planned_close_date
                    ? new Date(formData.planned_close_date).toLocaleDateString('tr-TR')
                    : '-'}
                </p>
              </div>
            </div>

            <div>
              <span className="font-medium text-gray-700">Kök Sebep:</span>
              <p className="text-gray-900 mt-1">{formData.root_cause || '-'}</p>
            </div>

            <div>
              <span className="font-medium text-gray-700">Önerilen Faaliyet:</span>
              <p className="text-gray-900 mt-1">{formData.suggested_action || '-'}</p>
            </div>

            {formData.photos.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Açılış Fotoğrafları:</span>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {formData.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Açılış ${index + 1}`}
                      className="w-full h-20 object-cover rounded border border-gray-300"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Alınan Aksiyon <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.closing_action}
          onChange={(e) => onChange({ closing_action: e.target.value })}
          placeholder="Alınan aksiyonları detaylı olarak açıklayınız"
          disabled={disabled}
          rows={5}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.closing_action ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-50' : ''}`}
        />
        {errors.closing_action && (
          <p className="mt-1 text-sm text-red-600">{errors.closing_action}</p>
        )}
      </div>

      <PhotoUpload
        photos={formData.closing_photos}
        onChange={(photos) => onChange({ closing_photos: photos })}
        disabled={disabled}
        label="Kapama Fotoğrafları"
      />

      {!disabled && (
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Kapatma İşlemini Tamamla
          </button>
        </div>
      )}
    </div>
  );
}
