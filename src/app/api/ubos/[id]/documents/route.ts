import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/ubos/[id]/documents
 * 
 * Lista documentos de um UBO
 * 
 * ⚡ OTIMIZAÇÃO: Busca dados do Supabase (não do Sumsub)
 * - Documentos já foram baixados e armazenados via webhook
 * - Tempo de resposta: <100ms
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient();
    const { id } = await params;

    console.log('[UBO_DOCUMENTS] Buscando documentos do UBO:', id);

    // Buscar UBO
    const { data: ubo, error: uboError } = await supabase
      .from('beneficial_owners')
      .select('id, first_name, last_name, applicant_id, company_id')
      .eq('applicant_id', id)
      .single();

    if (uboError || !ubo) {
      console.error('[UBO_DOCUMENTS] UBO não encontrado:', uboError);
      return NextResponse.json(
        { success: false, error: 'UBO não encontrado' },
        { status: 404 }
      );
    }

    // Buscar documentos do UBO
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('applicant_id', id)
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error('[UBO_DOCUMENTS] Erro ao buscar documentos:', docsError);
      return NextResponse.json(
        { success: false, error: docsError.message },
        { status: 500 }
      );
    }

    console.log(`[UBO_DOCUMENTS] Encontrados ${documents?.length || 0} documentos`);

    return NextResponse.json({
      success: true,
      ubo: {
        id: ubo.id,
        name: `${ubo.first_name} ${ubo.last_name}`.trim(),
        applicantId: ubo.applicant_id,
        companyId: ubo.company_id,
      },
      documents: documents || [],
    });

  } catch (error: any) {
    console.error('[UBO_DOCUMENTS] Erro no endpoint:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
