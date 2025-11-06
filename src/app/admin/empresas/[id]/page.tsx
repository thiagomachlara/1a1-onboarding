'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  FileText, 
  AlertTriangle, 
  Wallet, 
  MessageSquare, 
  History,
  ArrowLeft,
  RefreshCw,
  Download
} from 'lucide-react';

interface CompanyDossier {
  company: {
    id: string;
    applicant_id: string;
    company_name: string;
    document_number: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    current_status: string;
    applicant_type: string;
    created_at: string;
    updated_at: string;
    last_sync_date: string;
  };
  ubos: any[];
  documents: any[];
  risk_assessment: {
    risk_score: number;
    risk_level: 'low' | 'medium' | 'high';
    risk_factors: any[];
    manual_risk_override: boolean;
    officer_notes: string;
  };
  blockchain: {
    wallet_address: string;
    whitelist_status: string;
    whitelist_pdf_url: string;
  };
  notes: any[];
  audit_logs: any[];
  sumsub_data: any;
}

export default function CompanyDossierPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [dossier, setDossier] = useState<CompanyDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (id) {
      loadDossier();
    }
  }, [id]);

  const loadDossier = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/companies/${id}/dossier`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao carregar dossiê');
      }

      setDossier(data.dossier);
    } catch (err: any) {
      console.error('Erro ao carregar dossiê:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/admin/update-companies', {
        method: 'POST',
      });
      
      if (response.ok) {
        await loadDossier();
      }
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
    } finally {
      setSyncing(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskLevelText = (level: string) => {
    switch (level) {
      case 'low': return 'Baixo';
      case 'medium': return 'Médio';
      case 'high': return 'Alto';
      default: return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-gray-600">Carregando dossiê...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro ao carregar dossiê</h2>
            <p className="text-gray-600 mb-4">{error || 'Empresa não encontrada'}</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para lista
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {dossier.company.company_name}
              </h1>
              <div className="flex items-center gap-3">
                <Badge variant="outline">
                  CNPJ: {dossier.company.document_number}
                </Badge>
                <Badge className={getRiskLevelColor(dossier.risk_assessment.risk_level)}>
                  Risco: {getRiskLevelText(dossier.risk_assessment.risk_level)}
                </Badge>
                <Badge variant="secondary">
                  {dossier.company.current_status}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSync} 
                disabled={syncing}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sincronizar
              </Button>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Gerar PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="cadastro" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="cadastro">
              <Building2 className="h-4 w-4 mr-2" />
              Cadastro
            </TabsTrigger>
            <TabsTrigger value="ubos">
              <Users className="h-4 w-4 mr-2" />
              UBOs
            </TabsTrigger>
            <TabsTrigger value="documentos">
              <FileText className="h-4 w-4 mr-2" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="risco">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Risco
            </TabsTrigger>
            <TabsTrigger value="blockchain">
              <Wallet className="h-4 w-4 mr-2" />
              Blockchain
            </TabsTrigger>
            <TabsTrigger value="notas">
              <MessageSquare className="h-4 w-4 mr-2" />
              Notas
            </TabsTrigger>
            <TabsTrigger value="auditoria">
              <History className="h-4 w-4 mr-2" />
              Auditoria
            </TabsTrigger>
          </TabsList>

          {/* Aba Cadastro */}
          <TabsContent value="cadastro">
            <Card>
              <CardHeader>
                <CardTitle>Dados Cadastrais</CardTitle>
                <CardDescription>
                  Informações da empresa sincronizadas do Sumsub
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Nome da Empresa</h3>
                    <p className="text-base text-gray-900">{dossier.company.company_name || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">CNPJ</h3>
                    <p className="text-base text-gray-900">{dossier.company.document_number || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                    <p className="text-base text-gray-900">{dossier.company.email || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Telefone</h3>
                    <p className="text-base text-gray-900">{dossier.company.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Endereço</h3>
                    <p className="text-base text-gray-900">{dossier.company.address || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Cidade/Estado</h3>
                    <p className="text-base text-gray-900">
                      {dossier.company.city && dossier.company.state 
                        ? `${dossier.company.city}, ${dossier.company.state}`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">CEP</h3>
                    <p className="text-base text-gray-900">{dossier.company.postal_code || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">País</h3>
                    <p className="text-base text-gray-900">{dossier.company.country || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                    <Badge>{dossier.company.current_status}</Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Última Sincronização</h3>
                    <p className="text-base text-gray-900">
                      {dossier.company.last_sync_date 
                        ? new Date(dossier.company.last_sync_date).toLocaleString('pt-BR')
                        : 'Nunca'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Applicant ID (Sumsub)</h3>
                    <p className="text-sm font-mono text-gray-600">{dossier.company.applicant_id || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Data de Cadastro</h3>
                    <p className="text-base text-gray-900">
                      {new Date(dossier.company.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outras abas serão implementadas nas próximas fases */}
          <TabsContent value="ubos">
            <Card>
              <CardHeader>
                <CardTitle>UBOs (Sócios)</CardTitle>
                <CardDescription>
                  {dossier.ubos.length} sócio(s) encontrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dossier.ubos.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhum UBO encontrado</p>
                ) : (
                  <div className="space-y-4">
                    {dossier.ubos.map((ubo, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <p className="font-medium">{ubo.first_name} {ubo.last_name}</p>
                        <p className="text-sm text-gray-600">Participação: {ubo.share_size}%</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentos">
            <Card>
              <CardHeader>
                <CardTitle>Documentos</CardTitle>
                <CardDescription>
                  {dossier.documents.length} documento(s) encontrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">Em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risco">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Risco</CardTitle>
                <CardDescription>
                  Score: {dossier.risk_assessment.risk_score}/100
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">Em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blockchain">
            <Card>
              <CardHeader>
                <CardTitle>Blockchain & Wallet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Endereço da Wallet</h3>
                    <p className="text-base font-mono text-gray-900">
                      {dossier.blockchain.wallet_address || 'Não cadastrado'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Status Whitelist</h3>
                    <Badge>{dossier.blockchain.whitelist_status || 'pending'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notas">
            <Card>
              <CardHeader>
                <CardTitle>Notas & Compliance</CardTitle>
                <CardDescription>
                  {dossier.notes.length} nota(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">Em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auditoria">
            <Card>
              <CardHeader>
                <CardTitle>Log de Auditoria</CardTitle>
                <CardDescription>
                  {dossier.audit_logs.length} evento(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">Em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
