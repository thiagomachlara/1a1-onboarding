'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, FileText, Loader2, RefreshCw } from 'lucide-react';

interface CertificateType {
  id: string;
  name: string;
  description: string;
  source: string;
  infosimples_service: string | null;
  manual_url: string | null;
  is_required: boolean;
}

interface Certificate {
  id: string;
  certificate_type: string;
  status: string;
  issue_date: string | null;
  expiry_date: string | null;
  pdf_storage_path: string | null;
  fetched_at: string;
}

interface CertificatesChecklistProps {
  companyId: string;
}

export function CertificatesChecklist({ companyId }: CertificatesChecklistProps) {
  const [certificateTypes, setCertificateTypes] = useState<CertificateType[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [emitting, setEmitting] = useState<string | null>(null);

  useEffect(() => {
    loadCertificates();
  }, [companyId]);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/certificates`);
      const data = await response.json();

      if (data.success) {
        setCertificateTypes(data.certificateTypes || []);
        setCertificates(data.certificates || []);
      }
    } catch (error) {
      console.error('Erro ao carregar certidões:', error);
    } finally {
      setLoading(false);
    }
  };

  const emitCertificate = async (certificateTypeId: string) => {
    try {
      setEmitting(certificateTypeId);
      const response = await fetch(`/api/companies/${companyId}/certificates/emit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificate_type: certificateTypeId }),
      });

      const data = await response.json();

      if (data.success) {
        // Recarregar lista de certidões
        await loadCertificates();
        alert(`Certidão emitida com sucesso! Custo: R$ ${data.infosimples.price.toFixed(2)}`);
      } else {
        alert(`Erro ao emitir certidão: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Erro ao emitir certidão:', error);
      alert(`Erro ao emitir certidão: ${error.message}`);
    } finally {
      setEmitting(null);
    }
  };

  const getCertificate = (typeId: string): Certificate | undefined => {
    return certificates.find((cert) => cert.certificate_type === typeId);
  };

  const getStatusBadge = (certificate: Certificate | undefined) => {
    if (!certificate) {
      return <Badge variant="secondary">Pendente</Badge>;
    }

    switch (certificate.status) {
      case 'regular':
        return <Badge variant="default" className="bg-green-500">✅ Regular</Badge>;
      case 'irregular':
        return <Badge variant="destructive">❌ Irregular</Badge>;
      case 'obtida':
        return <Badge variant="default">✅ Obtida</Badge>;
      case 'error':
        return <Badge variant="destructive">❌ Erro</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const obtainedCount = certificateTypes.filter((type) => getCertificate(type.id)).length;
  const totalCount = certificateTypes.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com contador */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Certidões de Compliance</h3>
          <p className="text-sm text-gray-500">
            {obtainedCount} de {totalCount} certidões obtidas
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadCertificates}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Tabela de certidões */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Fonte</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certificateTypes.map((type) => {
              const certificate = getCertificate(type.id);
              const isEmitting = emitting === type.id;

              return (
                <TableRow key={type.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{type.name}</div>
                      <div className="text-sm text-gray-500">{type.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>{type.source}</TableCell>
                  <TableCell>{getStatusBadge(certificate)}</TableCell>
                  <TableCell>
                    {certificate?.expiry_date
                      ? formatDate(certificate.expiry_date)
                      : certificate?.issue_date
                      ? formatDate(certificate.issue_date)
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Botão Emitir via API */}
                      {type.infosimples_service && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => emitCertificate(type.id)}
                          disabled={isEmitting}
                        >
                          {isEmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Emitindo...
                            </>
                          ) : (
                            <>
                              🤖 Emitir via API
                            </>
                          )}
                        </Button>
                      )}

                      {/* Botão Emitir Manual */}
                      {type.manual_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(type.manual_url!, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Emitir Manual
                        </Button>
                      )}

                      {/* Botão Ver PDF */}
                      {certificate?.pdf_storage_path && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            // TODO: Implementar visualização do PDF
                            alert('Visualização de PDF em desenvolvimento');
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Ver PDF
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Legenda */}
      <div className="text-sm text-gray-500">
        <p>
          <strong>🤖 Emitir via API:</strong> Emite automaticamente via InfoSimples
        </p>
        <p>
          <strong>🌐 Emitir Manual:</strong> Abre o site oficial para emissão manual
        </p>
      </div>
    </div>
  );
}
