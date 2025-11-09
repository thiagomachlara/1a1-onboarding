'use client';

import { useState, useEffect } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';

interface Template {
  id: string;
  template_type: string;
  version: number;
  title: string;
  content: string;
  variables: any;
  is_active: boolean;
  created_at: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const res = await fetch('/api/admin/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(templateId: string) {
    if (!confirm('Deseja ativar este template? O template ativo anterior será desativado.')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/templates/${templateId}/activate`, {
        method: 'POST',
      });
      
      if (res.ok) {
        alert('Template ativado com sucesso!');
        loadTemplates();
      } else {
        const data = await res.json();
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao ativar template:', error);
    }
  }

  async function handleSaveNewVersion() {
    if (!selectedTemplate) return;
    
    if (!confirm('Deseja criar uma nova versão deste template?')) {
      return;
    }
    
    try {
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_type: selectedTemplate.template_type,
          title: selectedTemplate.title,
          content: editedContent,
          variables: selectedTemplate.variables,
        }),
      });
      
      if (res.ok) {
        alert('Nova versão criada com sucesso!');
        setEditMode(false);
        loadTemplates();
      } else {
        const data = await res.json();
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao salvar template:', error);
    }
  }

  function handleEdit(template: Template) {
    setSelectedTemplate(template);
    setEditedContent(template.content);
    setEditMode(true);
  }

  const typeLabels: Record<string, string> = {
    contract: 'Contrato de Serviços',
    wallet_term: 'Termo de Wallet',
  };

  if (loading) {
    return (
      <>
        <AdminHeader />
        <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando templates...</p>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader />
      <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Templates de Contratos</h1>
        <p className="text-gray-600 mt-2">Gerencie templates de contratos e termos</p>
      </div>

      {!editMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(
            templates.reduce((acc, t) => {
              if (!acc[t.template_type]) acc[t.template_type] = [];
              acc[t.template_type].push(t);
              return acc;
            }, {} as Record<string, Template[]>)
          ).map(([type, typeTemplates]) => (
            <div key={type} className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">{typeLabels[type] || type}</h2>
              
              <div className="space-y-3">
                {typeTemplates
                  .sort((a, b) => b.version - a.version)
                  .map((template) => (
                    <div
                      key={template.id}
                      className={`p-4 rounded-lg border-2 ${
                        template.is_active
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">Versão {template.version}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(template.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        {template.is_active && (
                          <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                            Ativo
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleEdit(template)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          Editar
                        </button>
                        {!template.is_active && (
                          <button
                            onClick={() => handleActivate(template.id)}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          >
                            Ativar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">{selectedTemplate?.title}</h2>
                <p className="text-sm text-gray-600">
                  Editando versão {selectedTemplate?.version} - Nova versão será criada ao salvar
                </p>
              </div>
              <button
                onClick={() => {
                  setEditMode(false);
                  setSelectedTemplate(null);
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                ✕ Fechar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 p-6">
            {/* Editor */}
            <div>
              <h3 className="font-medium mb-3">Editor</h3>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full h-[600px] p-4 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite o conteúdo do template..."
              />
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Variáveis disponíveis:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate &&
                    Object.keys(selectedTemplate.variables).map((varName) => (
                      <span
                        key={varName}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-mono cursor-pointer hover:bg-gray-200"
                        onClick={() => {
                          setEditedContent(editedContent + `{{${varName}}}`);
                        }}
                      >
                        {`{{${varName}}}`}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <h3 className="font-medium mb-3">Preview</h3>
              <div className="h-[600px] p-4 bg-gray-50 border rounded-lg overflow-auto">
                <div className="whitespace-pre-wrap text-sm font-mono">
                  {editedContent || 'Nenhum conteúdo para visualizar'}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
            <button
              onClick={() => {
                setEditMode(false);
                setSelectedTemplate(null);
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveNewVersion}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Salvar Nova Versão
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
