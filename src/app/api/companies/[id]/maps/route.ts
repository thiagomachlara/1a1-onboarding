import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStaticMapUrl, getStreetViewUrl, getGoogleMapsLink, isGoogleMapsConfigured } from '@/lib/google-maps';

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

    let addressStreet = '';
    let addressCity = '';
    let addressState = '';
    let addressPostalCode = '';
    let fullAddress = '';

    // Check if we have enriched address data
    const hasEnrichedAddress = company.enriched_street || company.enriched_city;
    
    if (hasEnrichedAddress) {
      // Use enriched data
      addressStreet = company.enriched_street || '';
      addressCity = company.enriched_city || '';
      addressState = company.enriched_state || '';
      addressPostalCode = company.enriched_postal_code || '';
      
      fullAddress = [
        addressStreet,
        addressCity,
        addressState,
        addressPostalCode,
      ].filter(Boolean).join(', ');
    } else {
      // Fallback to original address
      addressStreet = company.address || '';
      addressCity = company.city || '';
      addressState = company.state || '';
      addressPostalCode = company.postal_code || '';
      
      fullAddress = [
        addressStreet,
        addressCity,
        addressState,
        addressPostalCode,
        'Brasil'
      ].filter(Boolean).join(', ');
    }

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
