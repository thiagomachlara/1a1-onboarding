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
   * Emite Certidão Negativa de Débitos Federais (PGFN)
   * @param params - CNPJ para PJ ou CPF + birthdate para PF
   */
  async emitirCNDFederal(params: { cnpj?: string; cpf?: string; birthdate?: string; preferencia_emissao?: string }) {
    return this.consultar('receita-federal/pgfn', params);
  }

  /**
   * Emite CNDT (Certidão Negativa de Débitos Trabalhistas)
   * @param params - CNPJ para PJ ou CPF para PF
   */
  async emitirCNDT(params: { cnpj?: string; cpf?: string }) {
    return this.consultar('tribunal/tst/cndt', params);
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
   * @param cpf - Número do CPF
   * @param birthdate - Data de nascimento no formato DD/MM/AAAA
   */
  async consultarCPF(cpf: string, birthdate: string) {
    return this.consultar('receita-federal/cpf', { cpf, birthdate });
  }

  /**
   * Emite Certidão de Antecedentes Criminais (Polícia Federal)
   * @param params - Parâmetros obrigatórios: cpf, nome, birthdate, nome_mae, nome_pai, uf_nascimento
   */
  async emitirAntecedentesCriminais(params: {
    cpf: string;
    nome: string;
    birthdate: string;
    nome_mae: string;
    nome_pai: string;
    uf_nascimento: string;
  }) {
    return this.consultar('antecedentes-criminais/pf/emit', params);
  }

  /**
   * Consulta Mandados de Prisão (BNMP - CNJ)
   * @param cpf - Número do CPF
   * @param nome - Nome completo
   * @param nome_mae - Nome da mãe
   */
  async consultarMandadosPrisao(cpf: string, nome: string, nome_mae: string) {
    return this.consultar('cnj/mandados-prisao', { cpf, nome, nome_mae });
  }

  // ==================== HELPER METHODS ====================

  /**
   * Baixa o PDF do site_receipt
   * Retorna null se o conteúdo for HTML (não é um PDF real)
   */
  async baixarPDF(url: string): Promise<ArrayBuffer | null> {
    console.log('[BAIXAR_PDF] URL:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro ao baixar PDF: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    console.log('[BAIXAR_PDF] Content-Type:', contentType);
    
    // Se for HTML, não é um PDF real - retornar null
    if (contentType.includes('text/html') || url.endsWith('.html')) {
      console.log('[BAIXAR_PDF] É HTML (content-type ou extensão). Pulando download.');
      return null;
    }
    
    // Baixar conteúdo
    const buffer = await response.arrayBuffer();
    console.log('[BAIXAR_PDF] Tamanho do buffer:', buffer.byteLength, 'bytes');
    
    // Verificar assinatura PDF nos primeiros 4 bytes (%PDF)
    const uint8Array = new Uint8Array(buffer);
    const first4Bytes = Array.from(uint8Array.slice(0, 4));
    console.log('[BAIXAR_PDF] Primeiros 4 bytes:', first4Bytes, '(esperado: [37, 80, 68, 70] = %PDF)');
    
    const isPDF = uint8Array[0] === 0x25 && // %
                  uint8Array[1] === 0x50 && // P
                  uint8Array[2] === 0x44 && // D
                  uint8Array[3] === 0x46;   // F
    
    console.log('[BAIXAR_PDF] É PDF válido?', isPDF);
    
    if (!isPDF) {
      // Logar primeiros 100 caracteres para debug
      const textDecoder = new TextDecoder();
      const preview = textDecoder.decode(uint8Array.slice(0, 100));
      console.log('[BAIXAR_PDF] Preview do conteúdo:', preview);
      console.log('[BAIXAR_PDF] Não é um PDF válido. Pulando download.');
      return null;
    }
    
    console.log('[BAIXAR_PDF] PDF válido! Retornando buffer.');
    return buffer;
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
