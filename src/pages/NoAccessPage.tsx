import { AlertCircle, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function NoAccessPage() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-4">
            Erişim Kapalı
          </h1>

          <p className="text-slate-600 mb-6 leading-relaxed">
            Panelleriniz yönetici tarafından kapatılmıştır.
            Lütfen proje yöneticiniz ile iletişime geçiniz.
          </p>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-slate-700">
              <Mail className="w-5 h-5" />
              <span className="text-sm font-medium">
                Yardım için yöneticinize ulaşın
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
          >
            Giriş Sayfasına Dön
          </button>
        </div>
      </div>
    </div>
  );
}
