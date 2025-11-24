import { useState } from 'react';
import { Upload, X, Eye, Loader2 } from 'lucide-react';
import { uploadImageToSupabase, deleteImageFromSupabase } from '../lib/imageUtils';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  label?: string;
  disabled?: boolean;
  bucketName?: string;
  folderName?: string;
}

export function PhotoUpload({
  photos,
  onChange,
  maxPhotos = 5,
  label = 'Fotoğraflar',
  disabled = false,
  bucketName = 'field-observation-photos',
  folderName = 'reports'
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    const filesToUpload = files.slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      alert(`Maksimum ${maxPhotos} adet fotoğraf yükleyebilirsiniz.`);
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const progressKey = `${file.name}-${Date.now()}`;

      try {
        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name} çok büyük (max 10MB)`);
          continue;
        }

        if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
          alert(`${file.name} desteklenmeyen format (sadece JPG, PNG)`);
          continue;
        }

        setUploadProgress(prev => ({ ...prev, [progressKey]: 0 }));

        const url = await uploadImageToSupabase(file, bucketName, folderName);
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
      onChange([...photos, ...uploadedUrls]);
    }

    e.target.value = '';
  };

  const handleDelete = async (url: string, index: number) => {
    if (!confirm('Bu fotoğrafı silmek istediğinizden emin misiniz?')) return;

    try {
      await deleteImageFromSupabase(url, bucketName);
      const newPhotos = photos.filter((_, i) => i !== index);
      onChange(newPhotos);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Fotoğraf silinirken hata oluştu');
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        <span className="text-gray-500 ml-2 text-xs">
          (Maksimum {maxPhotos} adet - {photos.length}/{maxPhotos})
        </span>
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
        {photos.map((photo, index) => (
          <div key={index} className="relative group aspect-square">
            <img
              src={photo}
              alt={`Fotoğraf ${index + 1}`}
              className="w-full h-full object-cover rounded-lg border border-gray-300"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition rounded-lg flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition flex space-x-2">
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(photo)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100 transition"
                  title="Görüntüle"
                >
                  <Eye className="w-5 h-5 text-gray-700" />
                </button>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleDelete(photo, index)}
                    className="p-2 bg-white rounded-full hover:bg-red-50 transition"
                    title="Sil"
                  >
                    <X className="w-5 h-5 text-red-600" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {photos.length < maxPhotos && !disabled && (
          <label className="relative aspect-square border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition cursor-pointer flex flex-col items-center justify-center bg-gray-50 hover:bg-blue-50">
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              multiple
              onChange={handleFileSelect}
              disabled={uploading || disabled}
              className="hidden"
            />
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <span className="text-xs text-gray-500">Yükleniyor...</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-xs text-gray-500 text-center px-2">
                  Fotoğraf Ekle
                </span>
              </>
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
        Desteklenen formatlar: JPG, PNG • Maksimum dosya boyutu: 10MB
        <br />
        Fotoğraflar otomatik olarak 600px yüksekliğe ve 400KB'a optimize edilecektir.
      </p>

      {previewPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={previewPhoto}
              alt="Önizleme"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
