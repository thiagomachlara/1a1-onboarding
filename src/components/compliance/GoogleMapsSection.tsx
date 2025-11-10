'use client';

import { useState, useEffect } from 'react';

interface GoogleMapsSectionProps {
  companyId: string;
}

interface MapsData {
  address: string;
  lat: number;
  lng: number;
  mapUrl: string;
  streetViewUrl: string;
  mapsLink: string;
}

export default function GoogleMapsSection({ companyId }: GoogleMapsSectionProps) {
  const [mapsData, setMapsData] = useState<MapsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingFacade, setSavingFacade] = useState(false);
  const [facadeSaved, setFacadeSaved] = useState(false);

  useEffect(() => {
    fetchMapsData();
  }, [companyId]);

  async function fetchMapsData() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/companies/${companyId}/maps`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load maps data');
      }

      const data = await response.json();
      setMapsData(data);
    } catch (err) {
      console.error('Error fetching maps data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load maps data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveFacade() {
    if (!mapsData) return;

    try {
      setSavingFacade(true);

      const response = await fetch(`/api/companies/${companyId}/maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streetViewUrl: mapsData.streetViewUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to save facade image');
      }

      setFacadeSaved(true);
      setTimeout(() => setFacadeSaved(false), 3000);
    } catch (err) {
      console.error('Error saving facade:', err);
      alert('Erro ao salvar foto da fachada');
    } finally {
      setSavingFacade(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">🗺️ Verificação Geográfica</h3>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">🗺️ Verificação Geográfica</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">⚠️ {error}</p>
          {error.includes('not configured') && (
            <p className="text-sm text-yellow-600 mt-2">
              Configure a API Key do Google Maps nas variáveis de ambiente.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!mapsData) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">🗺️ Verificação Geográfica</h3>
      
      <div className="space-y-4">
        {/* Address */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Endereço:</p>
          <p className="text-gray-900">{mapsData.address}</p>
        </div>

        {/* Map */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Mapa:</p>
          <div className="relative rounded-lg overflow-hidden border border-gray-200">
            {mapsData.mapUrl ? (
              <img
                src={mapsData.mapUrl}
                alt="Mapa do endereço"
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
                <p className="text-gray-500">Mapa não disponível</p>
              </div>
            )}
          </div>
        </div>

        {/* Street View */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Fachada (Street View):</p>
          <div className="relative rounded-lg overflow-hidden border border-gray-200">
            {mapsData.streetViewUrl ? (
              <img
                src={mapsData.streetViewUrl}
                alt="Fachada do endereço"
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
                <p className="text-gray-500">Street View não disponível</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <a
            href={mapsData.mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span>📍</span>
            <span>Abrir no Google Maps</span>
          </a>

          <button
            onClick={handleSaveFacade}
            disabled={savingFacade || facadeSaved}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              facadeSaved
                ? 'bg-green-600 text-white'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            <span>{facadeSaved ? '✅' : '📸'}</span>
            <span>
              {savingFacade
                ? 'Salvando...'
                : facadeSaved
                ? 'Salvo!'
                : 'Salvar Fachada'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
