import { AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function NoProjectPage() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-blue-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Henüz Bir Projeye Dahil Değilsiniz
        </h2>

        <p className="text-gray-600 mb-8">
          Hesabınız başarıyla oluşturuldu ancak henüz bir projeye atanmadınız.
          Sistemde çalışabilmek için proje sorumlusu veya yöneticinizin sizi bir projeye eklemesi gerekmektedir.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Ne yapmalıyım?</strong><br />
            Lütfen proje sorumlusu veya sistem yöneticiniz ile iletişime geçin ve hesabınızı bir projeye eklenmesini talep edin.
          </p>
        </div>

        <button
          onClick={() => signOut()}
          className="w-full bg-gray-600 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition"
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}
