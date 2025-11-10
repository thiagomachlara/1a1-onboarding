import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStaticMapUrl, getStreetViewUrl, getGoogleMapsLink, isGoogleMapsConfigured } from '@/lib/google-maps';

/**
 * GET /api/companies/[id]/maps
 * 
 * Returns Google Maps URLs for a company's address
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
      .select('enriched_street, enriched_number, enriched_complement, enriched_neighborhood, enriched_city, enriched_state, enriched_postal_code, enriched_lat, enriched_lng')
      .eq('id', id)
      .single();

    if (error || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Build full address
    const addressParts = [
      company.enriched_street,
      company.enriched_number,
      company.enriched_complement,
      company.enriched_neighborhood,
      company.enriched_city,
      company.enriched_state,
      company.enriched_postal_code,
    ].filter(Boolean);

    const fullAddress = addressParts.join(', ');

    // Check if we have coordinates
    if (!company.enriched_lat || !company.enriched_lng) {
      return NextResponse.json(
        { error: 'Company address coordinates not available' },
        { status: 400 }
      );
    }

    const lat = parseFloat(company.enriched_lat);
    const lng = parseFloat(company.enriched_lng);

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
