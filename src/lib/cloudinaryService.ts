// Cloudinary ile tarayıcıda çalışan fotoğraf yükleme servisi

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}

// Cloudinary'ye fotoğraf yükle (Signed Upload - Preset gerektirmez)
export async function uploadImageToCloudinary(file: File): Promise<string> {
  try {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary credentials bulunamadı. .env dosyasını kontrol edin.');
    }

    // Timestamp oluştur
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'saha-egitimleri';

    // İmza oluştur (SHA-1)
    const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = await generateSHA1(signatureString);

    // FormData oluştur
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    // Cloudinary'ye yükle
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Cloudinary upload error:', error);
      throw new Error('Fotoğraf yükleme başarısız');
    }

    const data: CloudinaryUploadResponse = await response.json();

    // Güvenli URL'i döndür
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Fotoğraf Cloudinary\'ye yüklenirken hata oluştu');
  }
}

// Cloudinary'den fotoğraf sil
export async function deleteImageFromCloudinary(url: string): Promise<void> {
  try {
    // URL'den public_id'yi çıkar
    // Örnek URL: https://res.cloudinary.com/dwgtoslzn/image/upload/v1234567890/saha-egitimleri/photo.jpg
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');

    if (uploadIndex === -1) {
      console.error('Invalid Cloudinary URL:', url);
      return;
    }

    // public_id'yi al (klasör + dosya adı, uzantı olmadan)
    const publicIdWithExtension = urlParts.slice(uploadIndex + 2).join('/');
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, ''); // Uzantıyı kaldır

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary credentials eksik');
      return;
    }

    // Timestamp oluştur
    const timestamp = Math.round(Date.now() / 1000);

    // İmza oluştur (SHA-1)
    const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = await generateSHA1(signatureString);

    // Silme isteği gönder
    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (response.ok) {
      console.log('Fotoğraf Cloudinary\'den silindi:', publicId);
    } else {
      const error = await response.text();
      console.error('Cloudinary delete error:', error);
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    // Silme hatası kritik değil, uygulamayı durdurmayalım
  }
}

// Cloudinary'ye döküman yükle (Word, PDF, PowerPoint)
export async function uploadDocumentToCloudinary(file: File): Promise<string> {
  try {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary credentials bulunamadı. .env dosyasını kontrol edin.');
    }

    // Timestamp oluştur
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'egitim-dokumanlari';

    // İmza oluştur (SHA-1)
    const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = await generateSHA1(signatureString);

    // FormData oluştur
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    // Cloudinary'ye yükle (raw endpoint - dökümanlar için)
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Cloudinary document upload error:', error);
      throw new Error('Döküman yükleme başarısız');
    }

    const data: CloudinaryUploadResponse = await response.json();

    // Güvenli URL'i döndür
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary document upload error:', error);
    throw new Error('Döküman Cloudinary\'ye yüklenirken hata oluştu');
  }
}

// Cloudinary'den döküman sil
export async function deleteDocumentFromCloudinary(url: string): Promise<void> {
  try {
    // URL'den public_id'yi çıkar
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');

    if (uploadIndex === -1) {
      console.error('Invalid Cloudinary URL:', url);
      return;
    }

    // public_id'yi al (klasör + dosya adı, uzantı ile birlikte)
    const publicId = urlParts.slice(uploadIndex + 2).join('/');

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary credentials eksik');
      return;
    }

    // Timestamp oluştur
    const timestamp = Math.round(Date.now() / 1000);

    // İmza oluştur - raw dosyalar için resource_type ekle
    const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = await generateSHA1(signatureString);

    // Silme isteği gönder
    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/raw/destroy`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (response.ok) {
      console.log('Döküman Cloudinary\'den silindi:', publicId);
    } else {
      const error = await response.text();
      console.error('Cloudinary delete error:', error);
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    // Silme hatası kritik değil, uygulamayı durdurmayalım
  }
}

// Genel dosya yükleme fonksiyonu (resim veya döküman)
export async function uploadFileToCloudinary(file: File): Promise<string> {
  // Dosya tipine göre uygun fonksiyonu çağır
  if (file.type.startsWith('image/')) {
    return uploadImageToCloudinary(file);
  } else {
    return uploadDocumentToCloudinary(file);
  }
}

// SHA-1 hash oluştur (imza için)
async function generateSHA1(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
