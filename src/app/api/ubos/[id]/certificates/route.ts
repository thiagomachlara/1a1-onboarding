import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/ubos/[id]/certificates
 * 
 * Lista todos os tipos de certidões PF e as certidões já emitidas de um UBO
 * 
 * ⚡ OTIMIZAÇÃO: Busca dados do Supabase (não do Sumsub)
 * - Dados já sincronizados via webhook
 * - Tempo de resposta: <100ms
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient();
    const { id: uboId } = await params;

    console.log('[UBO_CERTIFICATES] Buscando certidões do UBO:', uboId);

    // Buscar UBO
    const { data: ubo, error: uboError } = await supabase
      .from('beneficial_owners')
      .select('id, first_name, middle_name, last_name, tin, company_id')
      .eq('id', uboId)
      .single();

    if (uboError || !ubo) {
      console.error('[UBO_CERTIFICATES] UBO não encontrado:', uboError);
      return NextResponse.json(
        { success: false, error: 'UBO não encontrado' },
        { status: 404 }
      );
    }

    // Buscar tipos de certidões PF
    const { data: certificateTypes, error: typesError } = await supabase
      .from('compliance_certificate_types')
      .select('*')
      .eq('entity_type', 'PF')
      .order('display_order');

    if (typesError) {
      console.error('[UBO_CERTIFICATES] Erro ao buscar tipos:', typesError);
      return NextResponse.json(
        { success: false, error: typesError.message },
        { status: 500 }
      );
    }

    // Buscar certidões já emitidas do UBO
    const { data: certificates, error: certsError } = await supabase
      .from('compliance_certificates')
      .select('*')
      .eq('ubo_id', uboId)
      .order('created_at', { ascending: false });

    if (certsError) {
      console.error('[UBO_CERTIFICATES] Erro ao buscar certidões:', certsError);
      return NextResponse.json(
        { success: false, error: certsError.message },
        { status: 500 }
      );
    }

    console.log(`[UBO_CERTIFICATES] Encontrados ${certificateTypes?.length || 0} tipos e ${certificates?.length || 0} certidões`);

    return NextResponse.json({
      success: true,
      ubo: {
        id: ubo.id,
        name: `${ubo.first_name} ${ubo.middle_name || ''} ${ubo.last_name}`.trim().replace(/\s+/g, ' '),
        cpf: ubo.tin,
        companyId: ubo.company_id,
      },
      certificateTypes: certificateTypes || [],
      certificates: certificates || [],
    });

  } catch (error: any) {
    console.error('[UBO_CERTIFICATES] Erro no endpoint:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
