import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { enrichAddress } from '@/lib/address-enrichment';
import { geocodeAddress } from '@/lib/google-maps';

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
    let addressForGeocoding = '';

    // Tentar enriquecer endereço (BrasilAPI/ViaCEP)
    try {
      enrichedAddress = await enrichAddress(
        applicant.document_number,
        applicant.address || undefined
      );

      // Montar endereço completo para geocoding
      addressForGeocoding = [
        enrichedAddress.street,
        enrichedAddress.number,
        enrichedAddress.neighborhood,
        enrichedAddress.city,
        enrichedAddress.state,
        enrichedAddress.postal_code
      ].filter(Boolean).join(', ');

      console.log('[Enrich Address] Successfully enriched address from API');
    } catch (enrichError: any) {
      console.warn('[Enrich Address] Failed to enrich from API, using original address:', enrichError.message);
      
      // Fallback: usar endereço original do Sumsub
      addressForGeocoding = [
        applicant.address,
        applicant.city,
        applicant.state,
        applicant.postal_code,
        'Brasil'
      ].filter(Boolean).join(', ');

      console.log('[Enrich Address] Using original address for geocoding:', addressForGeocoding);
    }

    // Buscar coordenadas via Google Geocoding API
    let coordinates = null;
    if (addressForGeocoding) {
      try {
        coordinates = await geocodeAddress(addressForGeocoding);
        if (coordinates) {
          console.log('[Enrich Address] Successfully geocoded:', coordinates);
        } else {
          console.warn('[Enrich Address] Geocoding returned no results');
        }
      } catch (geoError: any) {
        console.error('[Enrich Address] Geocoding failed:', geoError.message);
      }
    }

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

    // Se conseguiu coordenadas, salvar
    if (coordinates) {
      updateData.enriched_lat = coordinates.lat?.toString() || null;
      updateData.enriched_lng = coordinates.lng?.toString() || null;
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
      coordinates: coordinates,
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
