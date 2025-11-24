// Carbone.io PDF generation service

const CARBONE_API_URL = 'https://api.carbone.io';
const CARBONE_API_KEY = import.meta.env.VITE_CARBONE_API_TOKEN;

interface CarboneRenderResponse {
  success: boolean;
  data: {
    renderId: string;
  };
  error?: string;
}

/**
 * Carbone.io kullanarak PDF oluşturur ve indirir
 * @param templateId Carbone.io template ID
 * @param data Template'e gönderilecek veri
 * @param filename İndirilecek dosya adı
 */
export async function generateAndDownloadPDF(
  templateId: string,
  data: any,
  filename: string = 'report.pdf'
): Promise<void> {
  try {
    if (!CARBONE_API_KEY) {
      throw new Error('Carbone API key bulunamadı. .env dosyasını kontrol edin.');
    }

    // 1. Render isteği gönder
    const renderResponse = await fetch(`${CARBONE_API_URL}/render/${templateId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CARBONE_API_KEY}`,
        'Content-Type': 'application/json',
        'carbone-version': '5'
      },
      body: JSON.stringify({ data, convertTo: 'pdf' })
    });

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text();
      console.error('Carbone render error:', {
        status: renderResponse.status,
        statusText: renderResponse.statusText,
        errorText,
        templateId,
        apiKey: CARBONE_API_KEY ? 'Var' : 'Yok'
      });
      throw new Error(`PDF oluşturma başarısız: ${renderResponse.status} ${renderResponse.statusText}\nDetay: ${errorText}`);
    }

    const renderResult: CarboneRenderResponse = await renderResponse.json();

    if (!renderResult.success || !renderResult.data?.renderId) {
      throw new Error('PDF oluşturma başarısız');
    }

    const renderId = renderResult.data.renderId;

    // 2. PDF'i indir
    const downloadResponse = await fetch(`${CARBONE_API_URL}/render/${renderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CARBONE_API_KEY}`,
        'carbone-version': '5'
      }
    });

    if (!downloadResponse.ok) {
      throw new Error('PDF indirme başarısız');
    }

    // 3. Blob olarak al ve indir
    const blob = await downloadResponse.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('PDF başarıyla indirildi:', filename);
  } catch (error) {
    console.error('Carbone PDF generation error:', error);
    throw error;
  }
}
