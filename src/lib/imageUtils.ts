export async function resizeImage(file: File, maxHeight: number = 600, maxSizeKB: number = 400): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        let width = img.width;
        let height = img.height;

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        const targetSize = maxSizeKB * 1024;

        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              if (blob.size <= targetSize || quality <= 0.1) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                quality -= 0.1;
                tryCompress();
              }
            },
            'image/jpeg',
            quality
          );
        };

        tryCompress();
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

// Cloudinary'ye yükleme fonksiyonu (Supabase yerine)
export async function uploadImageToSupabase(
  file: File,
  bucket: string,
  folder: string
): Promise<string> {
  // Önce resmi optimize et
  const resizedFile = await resizeImage(file);

  // Cloudinary servisini kullan
  const { uploadImageToCloudinary } = await import('./cloudinaryService');

  // Bucket adına göre Cloudinary klasörünü belirle
  let cloudinaryFolder = folder;
  if (bucket === 'field-observation-photos') {
    cloudinaryFolder = 'saha-gozlem-raporlari';
  } else if (bucket === 'field-training-photos') {
    cloudinaryFolder = 'saha-egitimleri';
  } else if (bucket === 'task-work-log-photos' || bucket === 'task-photos') {
    cloudinaryFolder = 'task-files';
  }

  const url = await uploadImageToCloudinary(resizedFile, cloudinaryFolder);

  return url;
}

// Cloudinary'den silme fonksiyonu (Supabase yerine)
export async function deleteImageFromSupabase(
  url: string,
  bucket: string
): Promise<void> {
  // Cloudinary servisini kullan
  const { deleteImageFromCloudinary } = await import('./cloudinaryService');

  await deleteImageFromCloudinary(url);
}
