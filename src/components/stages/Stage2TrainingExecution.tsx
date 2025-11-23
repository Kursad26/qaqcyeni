import { useEffect, useRef } from 'react';
import { FieldTrainingFormData } from '../../lib/fieldTrainingTypes';
import { PhotoUpload } from '../PhotoUpload';
import { DocumentUpload } from '../DocumentUpload';

interface Stage2TrainingExecutionProps {
  formData: FieldTrainingFormData;
  onChange: (data: Partial<FieldTrainingFormData>) => void;
  onSubmit: () => void;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  disabled: boolean;
  isApprovalStage?: boolean;
}

export function Stage2TrainingExecution({
  formData,
  onChange,
  onSubmit,
  onApprove,
  onReject,
  disabled,
  isApprovalStage = false
}: Stage2TrainingExecutionProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Set initial content
  useEffect(() => {
    if (editorRef.current && formData.training_content) {
      if (editorRef.current.innerHTML !== formData.training_content) {
        editorRef.current.innerHTML = formData.training_content;
      }
    }
  }, [formData.training_content]);

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Enter key to insert line break properly
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  };

  const handlePhotosChange = (photos: string[]) => {
    onChange({ photos });
  };

  const handleDocumentsChange = (documents: string[]) => {
    onChange({ documents });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.delivery_date) {
      alert('Lütfen eğitim veriliş tarihini seçin');
      return;
    }

    if (!formData.participant_count || formData.participant_count < 1) {
      alert('Lütfen katılımcı sayısını girin (en az 1)');
      return;
    }

    if (!formData.training_duration || formData.training_duration < 1) {
      alert('Lütfen eğitim süresini girin (dakika cinsinden, en az 1)');
      return;
    }

    // Check if training content has actual text (remove HTML tags for validation)
    const textContent = formData.training_content?.replace(/<[^>]*>/g, '').trim() || '';
    if (!textContent) {
      alert('Lütfen eğitim içeriğini girin');
      return;
    }

    if (!formData.photos || formData.photos.length < 2) {
      alert('Lütfen en az 2 adet fotoğraf yükleyin');
      return;
    }

    if (formData.photos.length > 5) {
      alert('En fazla 5 adet fotoğraf yükleyebilirsiniz');
      return;
    }

    onSubmit();
  };

  const handleRejectClick = () => {
    const reason = prompt('Lütfen red sebebini girin:');
    if (!reason || reason.trim() === '') return;
    if (onReject) onReject(reason);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formData.rejection_reason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800 mb-1">Red Sebebi:</p>
          <p className="text-sm text-red-700">{formData.rejection_reason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Eğitim Veriliş Tarihi <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            value={formData.delivery_date || ''}
            onChange={(e) => onChange({ delivery_date: e.target.value })}
            disabled={disabled || isApprovalStage}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Katılımcı Sayısı <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={formData.participant_count || ''}
            onChange={(e) => onChange({ participant_count: parseInt(e.target.value) || 0 })}
            disabled={disabled || isApprovalStage}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            placeholder="Örn: 15"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Eğitim Süresi (Dakika) <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={formData.training_duration || ''}
            onChange={(e) => onChange({ training_duration: parseInt(e.target.value) || 0 })}
            disabled={disabled || isApprovalStage}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            placeholder="Örn: 120"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Eğitim İçeriği <span className="text-red-600">*</span>
        </label>
        <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
          <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 flex items-center space-x-2 flex-wrap">
            <button
              type="button"
              onClick={() => document.execCommand('bold')}
              disabled={disabled || isApprovalStage}
              className="px-3 py-1 text-sm font-bold border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Kalın (Ctrl+B)"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => document.execCommand('italic')}
              disabled={disabled || isApprovalStage}
              className="px-3 py-1 text-sm italic border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              title="İtalik (Ctrl+I)"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => document.execCommand('underline')}
              disabled={disabled || isApprovalStage}
              className="px-3 py-1 text-sm underline border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Altı çizili (Ctrl+U)"
            >
              U
            </button>
            <div className="w-px h-6 bg-gray-300"></div>
            <button
              type="button"
              onClick={() => document.execCommand('insertUnorderedList')}
              disabled={disabled || isApprovalStage}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Madde işaretli liste"
            >
              • Liste
            </button>
            <button
              type="button"
              onClick={() => document.execCommand('insertOrderedList')}
              disabled={disabled || isApprovalStage}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Numaralı liste"
            >
              1. Liste
            </button>
            <div className="w-px h-6 bg-gray-300"></div>
            <button
              type="button"
              onClick={() => document.execCommand('justifyLeft')}
              disabled={disabled || isApprovalStage}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Sola hizala"
            >
              ⬅
            </button>
            <button
              type="button"
              onClick={() => document.execCommand('justifyCenter')}
              disabled={disabled || isApprovalStage}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Ortala"
            >
              ↔
            </button>
            <button
              type="button"
              onClick={() => document.execCommand('justifyRight')}
              disabled={disabled || isApprovalStage}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Sağa hizala"
            >
              ➡
            </button>
            <div className="w-px h-6 bg-gray-300"></div>
            <button
              type="button"
              onClick={() => document.execCommand('indent')}
              disabled={disabled || isApprovalStage}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Girintiyi artır"
            >
              →|
            </button>
            <button
              type="button"
              onClick={() => document.execCommand('outdent')}
              disabled={disabled || isApprovalStage}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Girintiyi azalt"
            >
              |←
            </button>
            <div className="w-px h-6 bg-gray-300"></div>
            <select
              onChange={(e) => {
                document.execCommand('fontSize', false, e.target.value);
                e.target.value = '3';
              }}
              disabled={disabled || isApprovalStage}
              className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Yazı boyutu"
            >
              <option value="3">Normal</option>
              <option value="1">Çok küçük</option>
              <option value="2">Küçük</option>
              <option value="4">Büyük</option>
              <option value="5">Çok büyük</option>
              <option value="6">En büyük</option>
            </select>
          </div>
          <div
            ref={editorRef}
            contentEditable={!disabled && !isApprovalStage}
            onInput={(e) => {
              const content = e.currentTarget.innerHTML;
              onChange({ training_content: content });
            }}
            onKeyDown={handleEditorKeyDown}
            className="w-full min-h-[300px] max-h-[600px] overflow-y-auto px-4 py-3 focus:outline-none disabled:bg-gray-100 text-gray-900"
            dir="ltr"
            style={{
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              lineHeight: '1.6',
              direction: 'ltr',
              unicodeBidi: 'plaintext'
            }}
            data-placeholder="Eğitim içeriğini detaylı şekilde yazın... (Başlıklar, maddeler, açıklamalar)"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Not: Bu alan word sayfası gibi kullanılabilir. Başlıklar, maddeler ve açıklamalarınızı yazabilirsiniz.
          Metin biçimlendirme araçlarını kullanabilirsiniz.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Eğitim Fotoğrafları <span className="text-red-600">*</span>
        </label>
        <p className="text-sm text-amber-600 mb-3">
          ⚠️ Lütfen en az 1 adet eğitim görseli ve imza tutanağının görselini yüklemeyi unutmayınız
        </p>
        <p className="text-sm text-gray-600 mb-3">
          En az 2, en fazla 5 fotoğraf yükleyebilirsiniz
        </p>

        <PhotoUpload
          photos={formData.photos || []}
          onChange={handlePhotosChange}
          disabled={disabled || isApprovalStage}
          maxPhotos={5}
          bucketName="field-training-photos"
          folderName={formData.project_id || 'default'}
        />
      </div>

      <div>
        <DocumentUpload
          documents={formData.documents || []}
          onChange={handleDocumentsChange}
          disabled={disabled || isApprovalStage}
          maxDocuments={3}
          label="Eğitim Dökümanları"
        />
        <p className="text-xs text-amber-600 mt-2">
          💡 İsteğe bağlı: Eğitim sunumu, ders notları veya diğer eğitim materyallerini yükleyebilirsiniz.
        </p>
      </div>

      {isApprovalStage && onApprove && onReject && (
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleRejectClick}
            disabled={disabled}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
          >
            Reddet
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={disabled}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
          >
            Onayla
          </button>
        </div>
      )}

      {!isApprovalStage && !disabled && (
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
          >
            Onaya Gönder
          </button>
        </div>
      )}
    </form>
  );
}
