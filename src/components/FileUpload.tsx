import { useState } from 'react';
import { Upload, X, File as FileIcon, Loader2 } from 'lucide-react';
import { uploadFileToCloudinary } from '../lib/cloudinaryService';

interface FileUploadProps {
  files: Array<{ url: string; name: string; size: number }>;
  onChange: (files: Array<{ url: string; name: string; size: number }>) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  label?: string;
}

export function FileUpload({
  files,
  onChange,
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  label = 'Dosya Yükle'
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Resmi yeniden boyutlandır ve sıkıştır
  const resizeAndCompressImage = (file: File): Promise<{ blob: Blob; size: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context oluşturulamadı'));
          return;
        }

        // Max 600px yükseklik
        const maxHeight = 600;
        let width = img.width;
        let height = img.height;

        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        // JPEG olarak compress (quality: 0.7)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, size: blob.size });
            } else {
              reject(new Error('Blob oluşturulamadı'));
            }
          },
          'image/jpeg',
          0.7
        );
      };

      img.onerror = () => reject(new Error('Resim yüklenemedi'));
      reader.onerror = () => reject(new Error('Dosya okunamadı'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (files.length + selectedFiles.length > maxFiles) {
      alert(`En fazla ${maxFiles} dosya yükleyebilirsiniz`);
      return;
    }

    // Toplam dosya boyutu kontrolü
    const currentTotalSize = files.reduce((sum, f) => sum + f.size, 0);
    const newFilesSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
    const maxTotalSizeBytes = maxSizeMB * 1024 * 1024;

    if (currentTotalSize + newFilesSize > maxTotalSizeBytes) {
      alert(`Toplam dosya boyutu ${maxSizeMB}MB'ı geçemez. Mevcut: ${Math.round(currentTotalSize / 1024 / 1024 * 100) / 100}MB, Seçilen: ${Math.round(newFilesSize / 1024 / 1024 * 100) / 100}MB`);
      return;
    }

    for (const file of selectedFiles) {
      // Dosya tipi kontrolü
      if (!acceptedTypes.includes(file.type)) {
        alert(`${file.name}: Desteklenmeyen dosya tipi. Sadece PDF ve resim dosyaları yükleyebilirsiniz.`);
        continue;
      }

      try {
        setUploading(true);
        setUploadProgress(0);

        let fileToUpload: File | Blob = file;
        let finalSize = file.size;
        let finalName = file.name;

        // Eğer resim ise, optimize et
        if (file.type.startsWith('image/')) {
          setUploadProgress(20);
          const { blob, size } = await resizeAndCompressImage(file);
          // Blob'u File'a dönüştür (Cloudinary için file.name gerekli)
          fileToUpload = new File([blob], file.name, { type: 'image/jpeg' });
          finalSize = size;
          setUploadProgress(50);
          console.log(`Resim optimize edildi: ${Math.round(file.size / 1024)}KB -> ${Math.round(size / 1024)}KB`);
        } else {
          setUploadProgress(30);
        }

        // Cloudinary signed upload kullan
        const url = await uploadFileToCloudinary(fileToUpload as File);

        // Simüle edilmiş progress
        setUploadProgress(100);

        onChange([...files, {
          url,
          name: finalName,
          size: finalSize
        }]);

      } catch (error) {
        console.error('Dosya yükleme hatası:', error);
        alert('Dosya yüklenirken bir hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }

    // Input'u temizle
    e.target.value = '';
  };

  const handleRemove = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onChange(newFiles);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <FileIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="ml-3 p-1 hover:bg-gray-200 rounded transition flex-shrink-0"
                title="Kaldır"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length < maxFiles && (
        <div className="relative">
          <input
            type="file"
            onChange={handleFileSelect}
            accept={acceptedTypes.join(',')}
            disabled={uploading}
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg transition ${
              uploading
                ? 'border-blue-300 bg-blue-50 cursor-wait'
                : 'border-gray-300 hover:border-blue-500 bg-gray-50 hover:bg-blue-50 cursor-pointer'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-blue-600 mb-2 animate-spin" />
                <p className="text-sm text-blue-600 font-medium">
                  Yükleniyor... {uploadProgress}%
                </p>
                <div className="w-full max-w-xs mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-blue-600">Dosya seçin</span> veya sürükleyin
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, JPG, PNG (Toplam Max {maxSizeMB}MB)
                </p>
              </>
            )}
          </label>
        </div>
      )}

      {files.length >= maxFiles && (
        <p className="text-sm text-orange-600">
          Maksimum {maxFiles} dosya yükleyebilirsiniz
        </p>
      )}
    </div>
  );
}
