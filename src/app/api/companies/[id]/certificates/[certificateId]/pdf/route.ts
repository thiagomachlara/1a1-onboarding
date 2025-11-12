import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; certificateId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id, certificateId } = await params;

    console.log('[PDF] Buscando certidão:', { id, certificateId });

    // Buscar certidão no banco
    const { data: certificate, error: certError } = await supabase
      .from('compliance_certificates')
      .select('pdf_storage_path')
      .eq('id', certificateId)
      .eq('company_id', id)
      .single();

    console.log('[PDF] Resultado da busca:', { certificate, certError });

    if (certError || !certificate) {
      return NextResponse.json(
        { success: false, error: 'Certidão não encontrada' },
        { status: 404 }
      );
    }

    if (!certificate.pdf_storage_path) {
      return NextResponse.json(
        { success: false, error: 'PDF não disponível' },
        { status: 404 }
      );
    }

    // Gerar URL pública do PDF (válida por 1 hora)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('compliance-certificates')
      .createSignedUrl(certificate.pdf_storage_path, 3600); // 1 hora

    if (urlError || !urlData) {
      console.error('Erro ao gerar URL do PDF:', urlError);
      return NextResponse.json(
        { success: false, error: 'Erro ao gerar URL do PDF' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: urlData.signedUrl,
    });
  } catch (error: any) {
    console.error('Erro ao buscar PDF:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
