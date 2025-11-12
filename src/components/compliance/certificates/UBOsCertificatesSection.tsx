'use client';

import { useState, useEffect } from 'react';
import { CertificatesChecklist } from './CertificatesChecklist';

interface UBO {
  id: string;
  name: string;
  cpf: string;
  role: string;
  shareSize?: number;
  dob?: string;
  motherName?: string;
  fatherName?: string;
}

interface UBOsCertificatesSectionProps {
  companyId: string;
}

export function UBOsCertificatesSection({ companyId }: UBOsCertificatesSectionProps) {
  const [ubos, setUbos] = useState<UBO[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUbo, setExpandedUbo] = useState<string | null>(null);
  const [editingUbo, setEditingUbo] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ motherName: string; fatherName: string }>({ motherName: '', fatherName: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUBOs();
  }, [companyId]);

  const loadUBOs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/ubos`);
      const data = await response.json();

      if (data.success) {
        setUbos(data.ubos || []);
        // Expandir primeiro UBO por padrão
        if (data.ubos && data.ubos.length > 0) {
          setExpandedUbo(data.ubos[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar UBOs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUbo = (uboId: string) => {
    setExpandedUbo(expandedUbo === uboId ? null : uboId);
  };

  const startEditing = (ubo: UBO) => {
    setEditingUbo(ubo.id);
    setEditForm({
      motherName: ubo.motherName || '',
      fatherName: ubo.fatherName || '',
    });
  };

  const cancelEditing = () => {
    setEditingUbo(null);
    setEditForm({ motherName: '', fatherName: '' });
  };

  const saveParentNames = async (uboId: string) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/ubos/${uboId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mother_name: editForm.motherName.trim() || null,
          father_name: editForm.fatherName.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar dados');
      }

      // Atualizar estado local
      setUbos(ubos.map(u => 
        u.id === uboId 
          ? { ...u, motherName: editForm.motherName.trim(), fatherName: editForm.fatherName.trim() }
          : u
      ));

      setEditingUbo(null);
      alert('✅ Dados salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar dados. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Carregando UBOs...</div>
      </div>
    );
  }

  if (ubos.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          ⚠️ Nenhum UBO (Beneficiário Final) cadastrado para esta empresa.
        </p>
        <p className="text-yellow-700 text-xs mt-2">
          Adicione os UBOs na aba "UBOs" para poder emitir certidões PF.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Certidões dos UBOs (Pessoa Física)
        </h3>
        <span className="text-sm text-gray-500">
          {ubos.length} {ubos.length === 1 ? 'UBO' : 'UBOs'}
        </span>
      </div>

      <div className="space-y-3">
        {ubos.map((ubo) => (
          <div key={ubo.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header do UBO */}
            <button
              onClick={() => toggleUbo(ubo.id)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {ubo.name ? ubo.name.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900">{ubo.name}</div>
                  <div className="text-sm text-gray-500">
                    CPF: {ubo.cpf} • {ubo.role}{ubo.shareSize ? ` • ${ubo.shareSize}%` : ''}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedUbo === ubo.id ? 'transform rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {/* Certidões do UBO */}
            {expandedUbo === ubo.id && (
              <div className="p-4 bg-white space-y-4">
                {/* Dados Adicionais */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-blue-900 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Dados Adicionais (para certidões PF)
                    </h4>
                    {editingUbo !== ubo.id && (
                      <button
                        onClick={() => startEditing(ubo)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                    )}
                  </div>

                  {editingUbo === ubo.id ? (
                    /* Modo de edição */
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nome da Mãe
                        </label>
                        <input
                          type="text"
                          value={editForm.motherName}
                          onChange={(e) => setEditForm({ ...editForm, motherName: e.target.value })}
                          placeholder="Digite o nome da mãe"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nome do Pai
                        </label>
                        <input
                          type="text"
                          value={editForm.fatherName}
                          onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                          placeholder="Digite o nome do pai"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <button
                          onClick={() => saveParentNames(ubo.id)}
                          disabled={saving}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={saving}
                          className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Modo de visualização */
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start">
                        <span className="text-gray-600 w-32 flex-shrink-0">Nome da Mãe:</span>
                        <span className="text-gray-900 font-medium">
                          {ubo.motherName || <span className="text-gray-400 italic">Não informado</span>}
                        </span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-gray-600 w-32 flex-shrink-0">Nome do Pai:</span>
                        <span className="text-gray-900 font-medium">
                          {ubo.fatherName || <span className="text-gray-400 italic">Não informado</span>}
                        </span>
                      </div>
                      {ubo.dob && (
                        <div className="flex items-start">
                          <span className="text-gray-600 w-32 flex-shrink-0">Data de Nasc.:</span>
                          <span className="text-gray-900 font-medium">{ubo.dob}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <CertificatesChecklist 
                  companyId={companyId} 
                  uboId={ubo.id}
                  entityType="PF"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
