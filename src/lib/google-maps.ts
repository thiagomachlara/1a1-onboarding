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
 * @param width - Image width in pixels (default: 600)
 * @param height - Image height in pixels (default: 400)
 * @param zoom - Zoom level (default: 16)
 * @returns URL string for the static map image
 */
export function getStaticMapUrl(
  address: string,
  lat: number,
  lng: number,
  width: number = 600,
  height: number = 400,
  zoom: number = 16
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
 * @param width - Image width in pixels (default: 600)
 * @param height - Image height in pixels (default: 400)
 * @param fov - Field of view (default: 90)
 * @returns URL string for the Street View image
 */
export function getStreetViewUrl(
  address: string,
  lat: number,
  lng: number,
  width: number = 600,
  height: number = 400,
  fov: number = 90
): string {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API Key not configured');
    return '';
  }

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    size: `${width}x${height}`,
    fov: fov.toString(),
    pitch: '0',
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
  const params = new URLSearchParams({
    q: `${lat},${lng}`,
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
