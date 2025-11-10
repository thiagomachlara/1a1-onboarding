'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

interface ComplianceDocument {
  id: string;
  document_name: string;
  document_type: string;
  document_category: string;
  description?: string;
  file_url: string;
  file_size: number;
  file_type: string;
  issue_date?: string;
  expiry_date?: string;
  document_number?: string;
  tags?: string[];
  version: number;
  uploaded_at: string;
}

interface DocumentsUploadSectionProps {
  companyId: string;
}

const DOCUMENT_TYPES = [
  { value: 'CND_FEDERAL', label: 'CND Federal' },
  { value: 'CNDT', label: 'CNDT' },
  { value: 'CND_ESTADUAL', label: 'CND Estadual' },
  { value: 'CND_MUNICIPAL', label: 'CND Municipal' },
  { value: 'CONTRATO_SOCIAL', label: 'Contrato Social' },
  { value: 'BALANCO', label: 'Balanço Patrimonial' },
  { value: 'DRE', label: 'DRE' },
  { value: 'PROCURACAO', label: 'Procuração' },
  { value: 'ATA', label: 'Ata' },
  { value: 'OUTROS', label: 'Outros' },
];

const DOCUMENT_CATEGORIES = [
  { value: 'certificado', label: 'Certificado' },
  { value: 'documento_pessoal', label: 'Documento Pessoal' },
  { value: 'documento_empresa', label: 'Documento Empresa' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'outros', label: 'Outros' },
];

export default function DocumentsUploadSection({ companyId }: DocumentsUploadSectionProps) {
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentCategory, setDocumentCategory] = useState('');
  const [description, setDescription] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [companyId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/compliance-documents`);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      toast.error('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Selecione um arquivo');
      return;
    }

    if (!documentType || !documentCategory) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const toastId = toast.loading('📤 Fazendo upload...');

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', documentType);
      formData.append('documentCategory', documentCategory);
      if (description) formData.append('description', description);
      if (issueDate) formData.append('issueDate', issueDate);
      if (expiryDate) formData.append('expiryDate', expiryDate);
      if (documentNumber) formData.append('documentNumber', documentNumber);
      if (tags) formData.append('tags', tags);

      const response = await fetch(`/api/companies/${companyId}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success('✅ Documento enviado com sucesso!', { id: toastId });
        resetForm();
        setShowUploadForm(false);
        await loadDocuments();
      } else {
        toast.error(`❌ ${data.error}`, { id: toastId });
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('❌ Erro ao fazer upload', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Tem certeza que deseja deletar este documento?')) {
      return;
    }

    const toastId = toast.loading('🗑️ Deletando documento...');

    try {
      const response = await fetch(`/api/companies/${companyId}/compliance-documents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('✅ Documento deletado!', { id: toastId });
        await loadDocuments();
      } else {
        toast.error(`❌ ${data.error}`, { id: toastId });
      }
    } catch (error) {
      console.error('Erro ao deletar documento:', error);
      toast.error('❌ Erro ao deletar documento', { id: toastId });
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setDocumentType('');
    setDocumentCategory('');
    setDescription('');
    setIssueDate('');
    setExpiryDate('');
    setDocumentNumber('');
    setTags('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCategoryBadgeColor = (category: string): string => {
    const colors: Record<string, string> = {
      certificate: 'bg-green-100 text-green-800 border-green-300',
      financial: 'bg-blue-100 text-blue-800 border-blue-300',
      legal: 'bg-purple-100 text-purple-800 border-purple-300',
      other: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[category] || colors.other;
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      certificate: 'Certificado',
      financial: 'Financeiro',
      legal: 'Jurídico',
      other: 'Outro',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent mb-4"></div>
        <p className="text-gray-600">Carregando documentos...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Documentos de Compliance</h2>
          <p className="text-gray-600">
            {documents.length} documento(s) carregado(s)
          </p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showUploadForm ? '✕ Cancelar' : '📤 Upload Documento'}
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo Documento</h3>
          
          <form onSubmit={handleUpload} className="space-y-4">
            {/* Drag & Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                id="file-upload"
              />
              
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="text-4xl">📄</div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remover arquivo
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl text-gray-400">📁</div>
                  <p className="text-gray-600">Arraste um arquivo aqui ou</p>
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    Selecionar Arquivo
                  </label>
                  <p className="text-xs text-gray-500">PDF ou Imagem (máx. 10MB)</p>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Documento *
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria *
                </label>
                <select
                  value={documentCategory}
                  onChange={(e) => setDocumentCategory(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Emissão
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Validade
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do Documento
                </label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Ex: 123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Ex: urgente, revisar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Informações adicionais sobre o documento..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowUploadForm(false);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? '📤 Enviando...' : '✓ Enviar Documento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-gray-400 text-5xl mb-4">📄</div>
          <p className="text-gray-500 mb-2">Nenhum documento carregado ainda</p>
          <p className="text-sm text-gray-400">Clique em "Upload Documento" para adicionar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate mb-1">
                    {doc.document_name}
                  </h3>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getCategoryBadgeColor(doc.document_category)}`}>
                    {getCategoryLabel(doc.document_category)}
                  </span>
                </div>
              </div>

              {doc.description && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{doc.description}</p>
              )}

              <div className="space-y-1 text-xs text-gray-500 mb-3">
                <p>📏 {formatFileSize(doc.file_size)}</p>
                {doc.issue_date && (
                  <p>📅 Emissão: {new Date(doc.issue_date).toLocaleDateString('pt-BR')}</p>
                )}
                {doc.expiry_date && (
                  <p>⏰ Validade: {new Date(doc.expiry_date).toLocaleDateString('pt-BR')}</p>
                )}
                {doc.document_number && (
                  <p>🔢 Nº {doc.document_number}</p>
                )}
              </div>

              {doc.tags && doc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {doc.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors text-center"
                >
                  📥 Download
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="px-3 py-2 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
