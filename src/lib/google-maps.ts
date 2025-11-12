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
export function simplifyAddress(
  address: string,
  city: string,
  state: string,
  postalCode: string
): string {
  console.log('[SIMPLIFY] Input address:', address);
  
  // Remove detalhes complexos (Conj, Andar, Cond, etc) mas preserva rua e número
  const streetMatch = address.match(/^(.+?)\s*-?\s*(?:Conj|Andar|Cond|Bloco|Torre|Sala)/i);
  console.log('[SIMPLIFY] streetMatch:', streetMatch);
  
  let street = address;
  if (streetMatch) {
    // Se encontrou padrão complexo, usa apenas a parte antes dele
    street = streetMatch[1].trim();
    console.log('[SIMPLIFY] Using streetMatch:', street);
  } else {
    // Se não tem padrão complexo, remove apenas CEP duplicado e detalhes extras
    // Exemplo: "R VISCONDE DE INHAUMA,00134, SAL 2001 A 2024, 20.091-901,CENTRO,RIO DE JANEIRO,RJ"
    // Mantém: "R VISCONDE DE INHAUMA,00134"
    const parts = address.split(',').map(p => p.trim());
    console.log('[SIMPLIFY] parts:', parts);
    
    // Pegar rua e número (primeiras 2 partes)
    if (parts.length >= 2) {
      street = `${parts[0]}, ${parts[1]}`;
      console.log('[SIMPLIFY] Using parts:', street);
    }
  }
  
  // Build simplified address: Street, City, State PostalCode
  const result = `${street}, ${city}, ${state} ${postalCode}`;
  console.log('[SIMPLIFY] Final result:', result);
  return result;
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
