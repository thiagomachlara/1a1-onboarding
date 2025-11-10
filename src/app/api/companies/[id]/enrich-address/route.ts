import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { enrichAddress } from '@/lib/address-enrichment';


/**
 * POST /api/companies/[id]/enrich-address
 * 
 * Re-enriquece o endereço de uma empresa usando BrasilAPI
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

    // Verificar se tem CNPJ
    if (!applicant.document_number) {
      return NextResponse.json(
        { error: 'CNPJ não encontrado' },
        { status: 400 }
      );
    }

    let enrichedAddress: any = null;

    // Tentar enriquecer endereço (BrasilAPI/ViaCEP)
    try {
      enrichedAddress = await enrichAddress(
        applicant.document_number,
        applicant.address || undefined
      );

      console.log('[Enrich Address] Successfully enriched address from API');
    } catch (enrichError: any) {
      console.warn('[Enrich Address] Failed to enrich from API:', enrichError.message);
    }

    // Note: Geocoding is no longer performed here.
    // Maps API now uses address directly without coordinates.

    // Preparar dados para atualização
    const updateData: any = {
      enriched_at: new Date().toISOString(),
    };

    // Se conseguiu enriquecer via API, salvar os dados enriquecidos
    if (enrichedAddress) {
      updateData.enriched_street = enrichedAddress.street;
      updateData.enriched_number = enrichedAddress.number;
      updateData.enriched_complement = enrichedAddress.complement;
      updateData.enriched_neighborhood = enrichedAddress.neighborhood;
      updateData.enriched_city = enrichedAddress.city;
      updateData.enriched_state = enrichedAddress.state;
      updateData.enriched_postal_code = enrichedAddress.postal_code;
      updateData.enriched_source = enrichedAddress.source;
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
      enriched_address: enrichedAddress,
      used_original_address: !enrichedAddress,
    });
  } catch (error: any) {
    console.error('Error enriching address:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao enriquecer endereço' },
      { status: 500 }
    );
  }
}
