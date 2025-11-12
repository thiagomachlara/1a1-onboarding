'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface InteractiveMapProps {
  address: string;
  className?: string;
}

export default function InteractiveMap({ address, className = '' }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    const initMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('Google Maps API key not configured');
        }

        // Load Google Maps API
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places', 'marker'],
        });

        await loader.load();

        if (!mapRef.current) return;

        // Geocode address to get coordinates
        const geocoder = new google.maps.Geocoder();
        const geocodeResult = await geocoder.geocode({ address });

        if (!geocodeResult.results || geocodeResult.results.length === 0) {
          throw new Error('Endereço não encontrado');
        }

        const location = geocodeResult.results[0].geometry.location;

        // Create map
        const map = new google.maps.Map(mapRef.current, {
          center: location,
          zoom: 17,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
            position: google.maps.ControlPosition.TOP_RIGHT,
          },
          streetViewControlOptions: {
            position: google.maps.ControlPosition.RIGHT_TOP,
          },
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER,
          },
        });

        // Add marker
        new google.maps.Marker({
          position: location,
          map,
          title: address,
          animation: google.maps.Animation.DROP,
        });

        mapInstanceRef.current = map;
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading map:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar mapa');
        setIsLoading(false);
      }
    };

    initMap();
  }, [address]);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando mapa...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-lg">
          <div className="text-center p-4">
            <p className="text-red-600 font-medium mb-2">Erro ao carregar mapa</p>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div
        ref={mapRef}
        className="w-full h-full rounded-lg"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}
