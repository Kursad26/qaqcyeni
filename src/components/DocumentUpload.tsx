import { useState } from 'react';
import { Upload, X, FileText, Loader2, Download } from 'lucide-react';
import { uploadDocumentToCloudinary, deleteDocumentFromCloudinary } from '../lib/cloudinaryService';

interface DocumentUploadProps {
  documents: string[];
  onChange: (documents: string[]) => void;
  maxDocuments?: number;
  label?: string;
  disabled?: boolean;
}

export function DocumentUpload({
  documents,
  onChange,
  maxDocuments = 3,
  label = 'Eğitim Dökümanları',
  disabled = false,
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Allowed document types
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxDocuments - documents.length;
    const filesToUpload = files.slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      alert(`Maksimum ${maxDocuments} adet döküman yükleyebilirsiniz.`);
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const progressKey = `${file.name}-${Date.now()}`;

      try {
        // File size check
        if (file.size > MAX_FILE_SIZE) {
          alert(`${file.name} çok büyük (max 10MB)`);
          continue;
        }

        // File type check
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(fileExtension)) {
          alert(`${file.name} desteklenmeyen format (sadece PDF, Word, PowerPoint)`);
          continue;
        }

        setUploadProgress(prev => ({ ...prev, [progressKey]: 0 }));

        const url = await uploadDocumentToCloudinary(file);
        uploadedUrls.push(url);

        setUploadProgress(prev => ({ ...prev, [progressKey]: 100 }));
      } catch (error) {
        console.error('Upload error:', error);
        alert(`${file.name} yüklenirken hata oluştu`);
      }
    }

    setUploading(false);
    setUploadProgress({});

    if (uploadedUrls.length > 0) {
      onChange([...documents, ...uploadedUrls]);
    }

    e.target.value = '';
  };

  const handleDelete = async (url: string, index: number) => {
    if (!confirm('Bu dökümanı silmek istediğinizden emin misiniz?')) return;

    try {
      await deleteDocumentFromCloudinary(url);
      const newDocuments = documents.filter((_, i) => i !== index);
      onChange(newDocuments);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Döküman silinirken hata oluştu');
    }
  };

  const getFileIcon = () => {
    return <FileText className="w-6 h-6 text-blue-600" />;
  };

  const getFileName = (url: string) => {
    const parts = url.split('/');
    const fileNameWithExt = parts[parts.length - 1];
    // URL decode the filename
    return decodeURIComponent(fileNameWithExt);
  };

  const getFileExtension = (url: string) => {
    const extension = url.split('.').pop()?.toUpperCase();
    return extension || 'FILE';
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        <span className="text-gray-500 ml-2 text-xs">
          (Opsiyonel - Maksimum {maxDocuments} adet)
        </span>
      </label>

      <div className="space-y-3 mb-4">
        {documents.map((doc, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition group"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {getFileIcon(doc)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {getFileName(doc)}
                </p>
                <p className="text-xs text-gray-500">
                  {getFileExtension(doc)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <a
                href={doc}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="İndir"
              >
                <Download className="w-5 h-5" />
              </a>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleDelete(doc, index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Sil"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {documents.length < maxDocuments && !disabled && (
          <label className="relative border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition cursor-pointer flex items-center justify-center p-6 bg-gray-50 hover:bg-blue-50">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              multiple
              onChange={handleFileSelect}
              disabled={uploading || disabled}
              className="hidden"
            />
            {uploading ? (
              <div className="flex items-center space-x-3">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                <span className="text-sm text-gray-600">Yükleniyor...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Upload className="w-6 h-6 text-gray-400" />
                <div className="text-left">
                  <span className="text-sm font-medium text-gray-700 block">
                    Döküman Ekle
                  </span>
                  <span className="text-xs text-gray-500">
                    PDF, Word, PowerPoint
                  </span>
                </div>
              </div>
            )}
          </label>
        )}
      </div>

      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2 mb-4">
          {Object.entries(uploadProgress).map(([key, progress]) => (
            <div key={key} className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">{progress}%</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Desteklenen formatlar: PDF, Word (.doc, .docx), PowerPoint (.ppt, .pptx)
        <br />
        Maksimum dosya boyutu: 10MB
      </p>
    </div>
  );
}
