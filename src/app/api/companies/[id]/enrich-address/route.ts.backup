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
      .select('id, document_number, address, applicant_type')
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

    // Enriquecer endereço
    const enrichedAddress = await enrichAddress(
      applicant.document_number,
      applicant.address || undefined
    );

    // Montar endereço completo para geocoding
    const fullAddress = [
      enrichedAddress.street,
      enrichedAddress.number,
      enrichedAddress.neighborhood,
      enrichedAddress.city,
      enrichedAddress.state,
      enrichedAddress.postal_code
    ].filter(Boolean).join(', ');

    // Buscar coordenadas via Google Geocoding API
    const coordinates = await geocodeAddress(fullAddress);
    
    if (coordinates) {
      enrichedAddress.lat = coordinates.lat;
      enrichedAddress.lng = coordinates.lng;
    }

    // Atualizar no banco usando admin client para bypass RLS
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from('applicants')
      .update({
        enriched_street: enrichedAddress.street,
        enriched_number: enrichedAddress.number,
        enriched_complement: enrichedAddress.complement,
        enriched_neighborhood: enrichedAddress.neighborhood,
        enriched_city: enrichedAddress.city,
        enriched_state: enrichedAddress.state,
        enriched_postal_code: enrichedAddress.postal_code,
        enriched_lat: enrichedAddress.lat?.toString() || null,
        enriched_lng: enrichedAddress.lng?.toString() || null,
        enriched_source: enrichedAddress.source,
        enriched_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      enriched_address: enrichedAddress,
    });
  } catch (error: any) {
    console.error('Error enriching address:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao enriquecer endereço' },
      { status: 500 }
    );
  }
}
