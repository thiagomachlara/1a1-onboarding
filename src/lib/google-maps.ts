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
 * Simplifies an address for better geocoding results
 * Removes complex details like apartment numbers, building names, etc.
 * 
 * @param address - Full address string
 * @param city - City name
 * @param state - State code
 * @param postalCode - Postal code
 * @returns Simplified address string
 */
function simplifyAddress(
  address: string,
  city: string,
  state: string,
  postalCode: string
): string {
  // Extract street name and number (remove details like Conj, Andar, Cond, etc.)
  const streetMatch = address.match(/^([^,]+?)(?:,|\s+-)?\s*(?:Conj|Andar|Cond|Bloco|Torre|Sala)/i);
  const street = streetMatch ? streetMatch[1].trim() : address.split(',')[0].trim();
  
  // Build simplified address: Street, City, State PostalCode
  return `${street}, ${city}, ${state} ${postalCode}`;
}

/**
 * Generates a URL for a static Google Map image
 * 
 * @param address - Full address string
 * @param city - City name
 * @param state - State code
 * @param postalCode - Postal code
 * @param width - Image width in pixels (default: 1200)
 * @param height - Image height in pixels (default: 400)
 * @param zoom - Zoom level (default: 14)
 * @returns URL string for the static map image
 */
export function getStaticMapUrl(
  address: string,
  city: string,
  state: string,
  postalCode: string,
  width: number = 1200,
  height: number = 400,
  zoom: number = 14
): string {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API Key not configured');
    return '';
  }

  const simplifiedAddress = simplifyAddress(address, city, state, postalCode);

  const params = new URLSearchParams({
    center: simplifiedAddress,
    zoom: zoom.toString(),
    size: `${width}x${height}`,
    scale: '2',  // Double resolution for better quality
    markers: `color:red|${simplifiedAddress}`,
    key: GOOGLE_MAPS_API_KEY,
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/**
 * Generates a URL for a Google Street View static image
 * 
 * @param address - Full address string
 * @param city - City name
 * @param state - State code
 * @param postalCode - Postal code
 * @param width - Image width in pixels (default: 1200)
 * @param height - Image height in pixels (default: 600)
 * @param fov - Field of view (default: 90)
 * @returns URL string for the Street View image
 */
export function getStreetViewUrl(
  address: string,
  city: string,
  state: string,
  postalCode: string,
  width: number = 1200,
  height: number = 600,
  fov: number = 90
): string {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API Key not configured');
    return '';
  }

  const simplifiedAddress = simplifyAddress(address, city, state, postalCode);

  const params = new URLSearchParams({
    location: simplifiedAddress,
    size: `${width}x${height}`,
    fov: fov.toString(),
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
 * @param city - City name
 * @param state - State code
 * @param postalCode - Postal code
 * @returns URL string for Google Maps web interface
 */
export function getGoogleMapsLink(
  address: string,
  city: string,
  state: string,
  postalCode: string
): string {
  const simplifiedAddress = simplifyAddress(address, city, state, postalCode);
  const params = new URLSearchParams({
    query: simplifiedAddress,
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
