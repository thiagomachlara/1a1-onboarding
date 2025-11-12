import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStaticMapUrl, getStreetViewUrl, getGoogleMapsLink, isGoogleMapsConfigured, simplifyAddress } from '@/lib/google-maps';

/**
 * GET /api/companies/[id]/maps
 * 
 * Returns Google Maps URLs for a company's address
 * Uses address directly without geocoding
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if Google Maps is configured
    if (!isGoogleMapsConfigured()) {
      return NextResponse.json(
        { error: 'Google Maps API not configured' },
        { status: 503 }
      );
    }

    // Get company data
    const { data: company, error } = await supabase
      .from('applicants')
      .select('enriched_street, enriched_city, enriched_state, enriched_postal_code, address, city, state, postal_code')
      .eq('id', id)
      .single();

    if (error || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Always use original address for street to preserve street numbers
    // enriched_street may have been processed incorrectly and lost the number
    const addressStreet = company.address || '';
    
    // Use enriched data for city, state, and postal code if available
    const addressCity = company.enriched_city || company.city || '';
    const addressState = company.enriched_state || company.state || '';
    const addressPostalCode = company.enriched_postal_code || company.postal_code || '';

    // Use simplifyAddress to properly format the full address for display
    // This ensures street numbers are preserved while removing complex details
    const fullAddress = simplifyAddress(addressStreet, addressCity, addressState, addressPostalCode);

    // Validate we have minimum required address data
    if (!addressStreet || !addressCity) {
      return NextResponse.json(
        { error: 'Company address not available' },
        { status: 400 }
      );
    }

    // Generate URLs using address directly (no geocoding needed!)
    const mapUrl = getStaticMapUrl(addressStreet, addressCity, addressState, addressPostalCode);
    const streetViewUrl = getStreetViewUrl(addressStreet, addressCity, addressState, addressPostalCode);
    const mapsLink = getGoogleMapsLink(addressStreet, addressCity, addressState, addressPostalCode);

    return NextResponse.json({
      address: fullAddress,
      mapUrl,
      streetViewUrl,
      mapsLink,
    });
  } catch (error) {
    console.error('Error fetching maps data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies/[id]/maps/save-facade
 * 
 * Saves the Street View facade image to Supabase Storage
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get Street View URL from request body
    const body = await request.json();
    const { streetViewUrl } = body;

    if (!streetViewUrl) {
      return NextResponse.json(
        { error: 'Street View URL is required' },
        { status: 400 }
      );
    }

    // Fetch the image from Google
    const imageResponse = await fetch(streetViewUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch Street View image' },
        { status: 500 }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

    // Upload to Supabase Storage
    const fileName = `facade_${id}_${Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('compliance-docs')
      .upload(fileName, imageBlob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Facade API] Error uploading facade image:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload image to Supabase: ${uploadError.message}` },
        { status: 500 }
      );
    }
    
    console.log('[Facade API] ✓ Image uploaded successfully:', fileName);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('compliance-docs')
      .getPublicUrl(fileName);

    // Update company record with facade URL
    const { error: updateError } = await supabase
      .from('applicants')
      .update({ facade_image_url: urlData.publicUrl })
      .eq('id', id);

    if (updateError) {
      console.error('[Facade API] Error updating company with facade URL:', updateError);
      // Não retornar erro aqui, pois a imagem já foi salva com sucesso
    } else {
      console.log('[Facade API] ✓ Company record updated with facade URL');
    }

    return NextResponse.json({
      success: true,
      facadeUrl: urlData.publicUrl,
    });
  } catch (error) {
    console.error('[Facade API] Error saving facade image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
