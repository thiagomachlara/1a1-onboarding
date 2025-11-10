import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getStaticMapUrl, getStreetViewUrl, getGoogleMapsLink, isGoogleMapsConfigured, geocodeAddress } from '@/lib/google-maps';

/**
 * GET /api/companies/[id]/maps
 * 
 * Returns Google Maps URLs for a company's address
 * If coordinates are not available, attempts to geocode the address automatically
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

    // Get company data (including both enriched and original address fields)
    const { data: company, error } = await supabase
      .from('applicants')
      .select('enriched_street, enriched_number, enriched_complement, enriched_neighborhood, enriched_city, enriched_state, enriched_postal_code, enriched_lat, enriched_lng, address, city, state, postal_code')
      .eq('id', id)
      .single();

    if (error || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    let lat: number | null = null;
    let lng: number | null = null;
    let fullAddress = '';

    // Check if we have enriched address data
    const hasEnrichedAddress = company.enriched_street || company.enriched_city;
    
    if (hasEnrichedAddress) {
      // Build full address from enriched data
      const addressParts = [
        company.enriched_street,
        company.enriched_number,
        company.enriched_complement,
        company.enriched_neighborhood,
        company.enriched_city,
        company.enriched_state,
        company.enriched_postal_code,
      ].filter(Boolean);
      fullAddress = addressParts.join(', ');
    } else {
      // Fallback to original address
      const addressParts = [
        company.address,
        company.city,
        company.state,
        company.postal_code,
        'Brasil'
      ].filter(Boolean);
      fullAddress = addressParts.join(', ');
    }

    // Check if we have coordinates
    if (company.enriched_lat && company.enriched_lng) {
      lat = parseFloat(company.enriched_lat);
      lng = parseFloat(company.enriched_lng);
    } else {
      // No coordinates available - try to geocode
      console.log('[Maps API] No coordinates found, attempting to geocode:', fullAddress);
      
      if (!fullAddress) {
        return NextResponse.json(
          { error: 'Company address not available' },
          { status: 400 }
        );
      }

      try {
        // Use server-side API key for geocoding
        const serverApiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
        const coordinates = await geocodeAddress(fullAddress, serverApiKey);
        
        if (coordinates) {
          lat = coordinates.lat;
          lng = coordinates.lng;
          
          // Save coordinates to database for future use
          const adminClient = createAdminClient();
          await adminClient
            .from('applicants')
            .update({
              enriched_lat: lat.toString(),
              enriched_lng: lng.toString(),
              enriched_at: new Date().toISOString(),
            })
            .eq('id', id);
          
          console.log('[Maps API] Successfully geocoded and saved coordinates:', { lat, lng });
        } else {
          console.warn('[Maps API] Geocoding returned no results for:', fullAddress);
          return NextResponse.json(
            { error: 'Could not geocode company address' },
            { status: 400 }
          );
        }
      } catch (geocodeError: any) {
        console.error('[Maps API] Geocoding failed:', geocodeError.message);
        return NextResponse.json(
          { error: 'Failed to geocode company address' },
          { status: 500 }
        );
      }
    }

    // At this point we should have coordinates
    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Company address coordinates not available' },
        { status: 400 }
      );
    }

    // Generate URLs
    const mapUrl = getStaticMapUrl(fullAddress, lat, lng);
    const streetViewUrl = getStreetViewUrl(fullAddress, lat, lng);
    const mapsLink = getGoogleMapsLink(fullAddress, lat, lng);

    return NextResponse.json({
      address: fullAddress,
      lat,
      lng,
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
      console.error('Error uploading facade image:', uploadError);
      return NextResponse.json(
        { error: 'Failed to save facade image' },
        { status: 500 }
      );
    }

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
      console.error('Error updating company with facade URL:', updateError);
    }

    return NextResponse.json({
      success: true,
      facadeUrl: urlData.publicUrl,
    });
  } catch (error) {
    console.error('Error saving facade image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
