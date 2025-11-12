/**
 * InfoSimples API Client
 * Biblioteca para integração com a API da InfoSimples
 */

interface InfoSimplesConfig {
  token?: string;
  timeout?: number;
  ignore_site_receipt?: boolean;
}

interface InfoSimplesResponse {
  code: number;
  code_message: string;
  data: any[];
  data_count: number;
  errors: string[];
  site_receipts: string[];
  header: {
    api_version: string;
    product: string;
    service: string;
    parameters: Record<string, any>;
    client_name: string;
    token_name: string;
    billable: boolean;
    price: number;
    requested_at: string;
    elapsed_time_in_milliseconds: number;
    remote_ip: string;
    signature: string;
  };
}

export class InfoSimplesClient {
  private baseUrl = process.env.INFOSIMPLES_API_URL || 'https://api.infosimples.com/api/v2/consultas';
  private token = process.env.INFOSIMPLES_API_TOKEN!;

  /**
   * Realiza uma consulta genérica na API da InfoSimples
   */
  async consultar(
    service: string,
    params: Record<string, any>,
    config?: InfoSimplesConfig
  ): Promise<InfoSimplesResponse> {
    const response = await fetch(`${this.baseUrl}/${service}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: config?.token || this.token,
        timeout: config?.timeout || 600,
        ignore_site_receipt: config?.ignore_site_receipt ? 1 : 0,
        ...params,
      }),
    });

    if (!response.ok) {
      throw new Error(`InfoSimples API error: ${response.statusText}`);
    }

    return await response.json();
  }

  // ==================== PESSOA JURÍDICA (PJ) ====================

  /**
   * Consulta CNPJ na Receita Federal (inclui QSA)
   */
  async consultarCNPJ(cnpj: string) {
    return this.consultar('receita-federal/cnpj', { cnpj });
  }

  /**
   * Emite CND Federal (Certidão Negativa de Débitos Federais)
   */
  async emitirCNDFederal(cnpj: string) {
    return this.consultar('receita-federal/pgfn', { cnpj });
  }

  /**
   * Emite CNDT (Certidão Negativa de Débitos Trabalhistas)
   */
  async emitirCNDT(cnpj: string) {
    return this.consultar('tribunal/tst/cndt', { cnpj });
  }

  /**
   * Emite Certidão Unificada da Justiça Federal (TRF)
   */
  async emitirCertidaoTRF(params: { cpf?: string; cnpj?: string; nome: string }) {
    return this.consultar('tribunal/trf/cert-unificada', params);
  }

  /**
   * Emite Certidão de Infrações Trabalhistas (MTE)
   */
  async emitirCertidaoMTE(cnpj: string) {
    return this.consultar('mte/certidao-debitos', { cnpj });
  }

  /**
   * Emite CRF - Certificado de Regularidade do FGTS
   */
  async emitirCRFFGTS(cnpj: string) {
    return this.consultar('caixa/regularidade', { cnpj });
  }

  /**
   * Consulta Processos Administrativos Sancionadores da CVM
   */
  async consultarProcessosCVM(params: { cpf?: string; cnpj?: string }) {
    return this.consultar('cvm/processo-administrativo', params);
  }

  /**
   * Consulta Protestos (CENPROT SP)
   */
  async consultarProtestos(params: { cpf?: string; cnpj?: string }) {
    return this.consultar('cenprot-sp/protestos', params);
  }

  /**
   * Consulta Cheques sem Fundos (Banco Central)
   */
  async consultarChequesSemFundo(params: { cpf?: string; cnpj?: string }) {
    return this.consultar('bcb/cheques-sem-fundo', params);
  }

  /**
   * Consulta Improbidade Administrativa (CNJ)
   */
  async consultarImprobidade(params: { cpf?: string; cnpj?: string; nome: string }) {
    return this.consultar('cnj/improbidade', params);
  }

  // ==================== PESSOA FÍSICA (PF) ====================

  /**
   * Consulta Situação Cadastral do CPF
   */
  async consultarCPF(cpf: string) {
    return this.consultar('receita-federal/cpf', { cpf });
  }

  /**
   * Emite Certidão de Antecedentes Criminais (Polícia Federal)
   */
  async emitirAntecedentesCriminais(cpf: string, nome: string) {
    return this.consultar('antecedentes-criminais/pf/emit', { cpf, nome });
  }

  /**
   * Consulta Mandados de Prisão (BNMP - CNJ)
   */
  async consultarMandadosPrisao(cpf: string, nome: string) {
    return this.consultar('cnj/mandados-prisao', { cpf, nome });
  }

  // ==================== HELPER METHODS ====================

  /**
   * Baixa um PDF do site_receipt e retorna o buffer
   * Retorna null se o conteúdo for HTML (não é um PDF real)
   */
  async baixarPDF(url: string): Promise<ArrayBuffer | null> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro ao baixar PDF: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Se for HTML, não é um PDF real - retornar null
    if (contentType.includes('text/html') || url.endsWith('.html')) {
      console.log('[INFO] site_receipt é HTML, não PDF. Pulando download.');
      return null;
    }
    
    // Se for PDF, retornar diretamente
    return await response.arrayBuffer();
  }

  /**
   * Verifica se a resposta da API foi bem-sucedida
   */
  isSuccess(response: InfoSimplesResponse): boolean {
    return response.code === 200;
  }

  /**
   * Extrai mensagem de erro da resposta
   */
  getErrorMessage(response: InfoSimplesResponse): string {
    if (response.errors && response.errors.length > 0) {
      return response.errors.join(', ');
    }
    return response.code_message;
  }
}

// Exportar instância singleton
export const infosimples = new InfoSimplesClient();
