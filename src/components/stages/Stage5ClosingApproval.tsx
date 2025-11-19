import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import { FieldObservationFormData } from '../../lib/fieldObservationTypes';

interface Stage5Props {
  formData: FieldObservationFormData;
  onApprove: () => void;
  onReject: (reason: string) => void;
  disabled?: boolean;
}

export function Stage5ClosingApproval({ formData, onApprove, onReject, disabled = false }: Stage5Props) {
  const [showAllInfo, setShowAllInfo] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      setRejectionError('Red sebebi zorunludur');
      return;
    }
    onReject(rejectionReason);
    setShowRejectModal(false);
  };

  const isLate = formData.planned_close_date && formData.closing_date
    ? new Date(formData.closing_date) > new Date(formData.planned_close_date)
    : false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Aşama 5: Kapama Onayı</h2>
        <p className="text-gray-600">
          Tüm bilgileri inceleyin ve kapamayı onaylayın veya reddedin.
        </p>
      </div>

      {disabled && (
        <div className={`border-2 rounded-lg p-4 flex items-center space-x-3 ${
          formData.status === 'closed_on_time'
            ? 'bg-green-50 border-green-500'
            : 'bg-red-50 border-red-500'
        }`}>
          {formData.status === 'closed_on_time' ? (
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          ) : (
            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          )}
          <div>
            <h3 className={`font-semibold ${
              formData.status === 'closed_on_time' ? 'text-green-900' : 'text-red-900'
            }`}>
              {formData.status === 'closed_on_time' ? 'Kapalı - Zamanında' : 'Kapalı - Geç'}
            </h3>
            <p className={`text-sm ${
              formData.status === 'closed_on_time' ? 'text-green-800' : 'text-red-800'
            }`}>
              Form {formData.approved_date
                ? new Date(formData.approved_date).toLocaleDateString('tr-TR')
                : ''} tarihinde kapatılmıştır.
            </p>
          </div>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg">
        <button
          onClick={() => setShowAllInfo(!showAllInfo)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition rounded-lg"
        >
          <span className="font-medium text-gray-700">Tüm Form Bilgileri</span>
          {showAllInfo ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showAllInfo && (
          <div className="px-4 pb-4 space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Genel Bilgiler</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
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
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    formData.severity === 'major'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {formData.severity === 'major' ? 'Majör' : 'Minör'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Düzeltici Faaliyet:</span>
                  <p className="text-gray-900">
                    {formData.corrective_action_required ? 'Evet' : 'Hayır'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Tarihler</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Planlanan Kapama:</span>
                  <p className="text-gray-900">
                    {formData.planned_close_date
                      ? new Date(formData.planned_close_date).toLocaleDateString('tr-TR')
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Gerçekleşen Kapama:</span>
                  <p className={isLate ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                    {formData.closing_date
                      ? new Date(formData.closing_date).toLocaleDateString('tr-TR')
                      : '-'}
                    {isLate && ' (GEÇ)'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Kök Sebep</h3>
              <p className="text-gray-900 text-sm bg-white p-3 rounded border border-gray-200">
                {formData.root_cause || '-'}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Önerilen Faaliyet</h3>
              <p className="text-gray-900 text-sm bg-white p-3 rounded border border-gray-200">
                {formData.suggested_action || '-'}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Alınan Aksiyon</h3>
              <p className="text-gray-900 text-sm bg-white p-3 rounded border border-gray-200">
                {formData.closing_action || '-'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {formData.photos.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Açılış Fotoğrafları</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {formData.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Açılış ${index + 1}`}
                        className="w-full h-32 object-cover rounded border border-gray-300 cursor-pointer hover:opacity-90 transition"
                        onClick={() => window.open(photo, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {formData.closing_photos.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Kapama Fotoğrafları</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {formData.closing_photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Kapama ${index + 1}`}
                        className="w-full h-32 object-cover rounded border border-gray-300 cursor-pointer hover:opacity-90 transition"
                        onClick={() => window.open(photo, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!disabled && (
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowRejectModal(true)}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
          >
            Reddet
          </button>
          <button
            onClick={onApprove}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
          >
            Kapamayı Onayla
          </button>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Kapamayı Reddet</h3>
            <p className="text-gray-600 mb-4">
              Lütfen red sebebini açıklayınız. Form sorumlu personele geri dönecektir.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                setRejectionError('');
              }}
              placeholder="Red sebebini yazınız..."
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2 ${
                rejectionError ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {rejectionError && (
              <p className="text-sm text-red-600 mb-4">{rejectionError}</p>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setRejectionError('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Reddet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
