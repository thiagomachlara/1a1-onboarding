import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; certificateId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id, certificateId } = await params;

    console.log('[UBO_PDF] Buscando certidão:', { uboId: id, certificateId });

    // Buscar certidão no banco
    const { data: certificate, error: certError } = await supabase
      .from('compliance_certificates')
      .select('pdf_storage_path, html_url')
      .eq('id', certificateId)
      .eq('ubo_id', id)
      .single();

    console.log('[UBO_PDF] Resultado da busca:', { certificate, certError });

    if (certError || !certificate) {
      return NextResponse.json(
        { success: false, error: 'Certidão não encontrada' },
        { status: 404 }
      );
    }

    // Se tiver PDF, gerar URL assinada
    if (certificate.pdf_storage_path) {
      const { data: urlData, error: urlError } = await supabase.storage
        .from('compliance-certificates')
        .createSignedUrl(certificate.pdf_storage_path, 3600); // 1 hora

      if (urlError || !urlData) {
        console.error('[UBO_PDF] Erro ao gerar URL do PDF:', urlError);
        return NextResponse.json(
          { success: false, error: 'Erro ao gerar URL do PDF' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        type: 'pdf',
        url: urlData.signedUrl,
      });
    }

    // Se tiver HTML, retornar URL do HTML
    if (certificate.html_url) {
      return NextResponse.json({
        success: true,
        type: 'html',
        url: certificate.html_url,
      });
    }

    // Nenhum arquivo disponível
    return NextResponse.json(
      { success: false, error: 'Nenhum arquivo disponível' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('[UBO_PDF] Erro ao buscar PDF:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
