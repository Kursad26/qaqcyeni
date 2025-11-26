import { Stage1FormCreation } from './Stage1FormCreation';
import { FieldObservationFormData } from '../../lib/fieldObservationTypes';

interface Stage2Props {
  formData: FieldObservationFormData;
  onChange: (data: Partial<FieldObservationFormData>) => void;
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
}

export function Stage2PreApproval({ formData, onChange, onApprove, onReject, disabled = false }: Stage2Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Aşama 2: Ön Onay</h2>
        <p className="text-gray-600">
          Formu inceleyin. Gerekirse düzenleyin ve onaylayın veya iptal edin.
        </p>
      </div>

      

      {!disabled && (
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={onReject}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
          >
            İptal Et
          </button>
          <button
            onClick={onApprove}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
          >
            Onayla ve İlerlet
          </button>
        </div>
      )}
    </div>
  );
}
