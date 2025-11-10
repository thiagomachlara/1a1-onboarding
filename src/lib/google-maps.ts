/**
 * Google Maps Integration Library
 * 
 * Provides functions to generate Google Maps URLs for:
 * - Static maps
 * - Street View images
 * - Interactive Google Maps links
 */

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

/**
 * Generates a URL for a static Google Map image
 * 
 * @param address - Full address string
 * @param lat - Latitude
 * @param lng - Longitude
 * @param width - Image width in pixels (default: 1200)
 * @param height - Image height in pixels (default: 400)
 * @param zoom - Zoom level (default: 14)
 * @returns URL string for the static map image
 */
export function getStaticMapUrl(
  address: string,
  lat: number,
  lng: number,
  width: number = 1200,
  height: number = 400,
  zoom: number = 14
): string {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API Key not configured');
    return '';
  }

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: zoom.toString(),
    size: `${width}x${height}`,
    markers: `color:red|${lat},${lng}`,
    key: GOOGLE_MAPS_API_KEY,
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/**
 * Generates a URL for a Google Street View static image
 * 
 * @param address - Full address string
 * @param lat - Latitude
 * @param lng - Longitude
 * @param width - Image width in pixels (default: 1200)
 * @param height - Image height in pixels (default: 600)
 * @param fov - Field of view (default: 90)
 * @returns URL string for the Street View image
 */
export function getStreetViewUrl(
  address: string,
  lat: number,
  lng: number,
  width: number = 1200,
  height: number = 600,
  fov: number = 90
): string {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API Key not configured');
    return '';
  }

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    size: `${width}x${height}`,
    fov: '90',
    pitch: '0',
    source: 'outdoor',
    key: GOOGLE_MAPS_API_KEY,
  });

  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}

/**
 * Generates a URL to open Google Maps in a new tab
 * 
 * @param address - Full address string
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns URL string for Google Maps web interface
 */
export function getGoogleMapsLink(
  address: string,
  lat: number,
  lng: number
): string {
  // Use coordinates for reliable location, as complex addresses may not geocode correctly
  const query = `${lat},${lng}`;
  const params = new URLSearchParams({
    query: query,
  });

  return `https://www.google.com/maps/search/?api=1&${params.toString()}`;
}

/**
 * Checks if Google Maps API is configured
 * 
 * @returns true if API key is set, false otherwise
 */
export function isGoogleMapsConfigured(): boolean {
  return !!GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.length > 0;
}

/**
 * Geocodes an address to get latitude and longitude
 * 
 * @param address - Full address string
 * @returns Object with lat and lng, or null if geocoding fails
 */
export async function geocodeAddress(
  address: string,
  apiKey?: string
): Promise<{ lat: number; lng: number } | null> {
  const key = apiKey || GOOGLE_MAPS_API_KEY;
  
  if (!key) {
    console.warn('Google Maps API Key not configured');
    return null;
  }

  try {
    const params = new URLSearchParams({
      address: address,
      key: key,
    });

    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    }

    console.warn('Geocoding failed:', data.status);
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}
