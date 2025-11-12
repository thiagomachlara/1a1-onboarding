import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { enrichAddress } from '@/lib/address-enrichment';

/**
 * POST /api/companies/[id]/enrich-address
 * 
 * Enriquece o endereço de uma empresa usando ViaCEP (API dos Correios)
 * 
 * IMPORTANTE: NÃO sobrescreve o endereço completo da Sumsub!
 * Apenas complementa com dados separados (bairro, cidade, estado) via CEP.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar autenticação
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Buscar dados da empresa
    const { data: applicant, error: fetchError } = await supabase
      .from('applicants')
      .select('id, document_number, address, applicant_type, city, state, postal_code')
      .eq('id', id)
      .single();

    if (fetchError || !applicant) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se é empresa
    if (applicant.applicant_type !== 'company') {
      return NextResponse.json(
        { error: 'Enriquecimento de endereço disponível apenas para empresas' },
        { status: 400 }
      );
    }

    // Verificar se tem endereço
    if (!applicant.address) {
      return NextResponse.json(
        { error: 'Endereço não encontrado' },
        { status: 400 }
      );
    }

    let enrichedData: any = null;

    // Tentar enriquecer endereço via ViaCEP (usando CEP extraído)
    try {
      enrichedData = await enrichAddress(applicant.address);

      if (enrichedData) {
        console.log('[Enrich Address] ✓ Endereço enriquecido via ViaCEP');
      } else {
        console.log('[Enrich Address] ⚠️  CEP não encontrado no endereço');
      }
    } catch (enrichError: any) {
      console.warn('[Enrich Address] Falha ao enriquecer via ViaCEP:', enrichError.message);
    }

    // Preparar dados para atualização
    const updateData: any = {
      enriched_at: new Date().toISOString(),
    };

    // Se conseguiu enriquecer via ViaCEP, salvar APENAS dados complementares
    if (enrichedData) {
      // NÃO sobrescrever o endereço completo!
      // Apenas salvar dados separados (bairro, cidade, estado)
      updateData.enriched_neighborhood = enrichedData.neighborhood;
      updateData.enriched_city = enrichedData.city;
      updateData.enriched_state = enrichedData.state;
      updateData.enriched_postal_code = enrichedData.postal_code;
      updateData.enriched_source = enrichedData.source;
      
      // Atualizar também os campos principais se estiverem vazios
      if (!applicant.city && enrichedData.city) {
        updateData.city = enrichedData.city;
      }
      if (!applicant.state && enrichedData.state) {
        updateData.state = enrichedData.state;
      }
      if (!applicant.postal_code && enrichedData.postal_code) {
        updateData.postal_code = enrichedData.postal_code;
      }
    }

    // Atualizar no banco usando admin client para bypass RLS
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from('applicants')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      enriched_data: enrichedData,
      message: enrichedData 
        ? 'Endereço enriquecido com dados do ViaCEP' 
        : 'CEP não encontrado, endereço não foi enriquecido',
    });
  } catch (error: any) {
    console.error('Error enriching address:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao enriquecer endereço' },
      { status: 500 }
    );
  }
}
