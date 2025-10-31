/**
 * Geração de PDF do Screening Chainalysis
 * 
 * Gera relatório em PDF com resultado completo do screening de wallet,
 * incluindo dados do cliente, exposições detalhadas e decisão final.
 * 
 * NOTA: Usa pdf-lib ao invés de PDFKit para compatibilidade com serverless
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { WalletScreeningResult } from './chainalysis';
import type { Applicant } from './supabase-db';

/**
 * Formata valor monetário para exibição
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata data/hora para exibição
 */
function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'long',
    timeStyle: 'long',
  });
}

/**
 * Gera hash SHA-256 de uma string
 */
async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Traduz categorias de exposição
 */
const categoryTranslations: Record<string, string> = {
  'exchange': 'Exchange',
  'institutional platform': 'Plataforma Institucional',
  'unnamed service': 'Serviço Não Identificado',
  'no kyc exchange': 'Exchange sem KYC',
  'other': 'Outros',
  'merchant services': 'Serviços de Pagamento',
  'bridge': 'Bridge',
  'decentralized exchange': 'Exchange Descentralizada',
  'hosted wallet': 'Carteira Hospedada',
  'gambling': 'Jogos de Azar',
  'instant exchange': 'Exchange Instantânea',
  'smart contract': 'Contrato Inteligente',
  'lending': 'Empréstimos',
  'p2p exchange': 'Exchange P2P',
  'atm': 'Caixa Eletrônico',
  'fee': 'Taxas',
  'mining pool': 'Pool de Mineração',
  'infrastructure as a service': 'Infraestrutura como Serviço',
  'protocol privacy': 'Protocolo de Privacidade',
  'unspent': 'Não Gasto',
  'sanctioned entity': '[ALERTA] Entidade Sancionada',
  'sanctioned jurisdiction': '[ALERTA] Jurisdicao Sancionada',
  'illicit actor-org': '[ALERTA] Ator Ilicito',
  'stolen funds': '[ALERTA] Fundos Roubados',
  'terrorist financing': '[ALERTA] Financiamento Terrorista',
  'scam': '[ALERTA] Fraude',
  'special measures': '[ALERTA] Medidas Especiais',
  'escort service': '[ALERTA] Servico de Acompanhantes',
};

/**
 * Gera PDF do screening Chainalysis usando pdf-lib
 */
export async function generateScreeningPDF(
  screeningResult: WalletScreeningResult,
  applicant: Applicant
): Promise<Buffer> {
  try {
    // Criar documento PDF
    const pdfDoc = await PDFDocument.create();
    
    // Carregar fontes padrão
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    
    // Adicionar página A4
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    
    let y = height - 50;
    const margin = 50;
    const lineHeight = 15;
    
    // ========================================================================
    // CABEÇALHO
    // ========================================================================
    
    page.drawText('RELATÓRIO DE SCREENING', {
      x: margin,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0, 0.2, 0.4),
    });
    y -= 25;
    
    page.drawText('Chainalysis Address Screening', {
      x: margin,
      y,
      size: 14,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 25;
    
    // Linha separadora
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 20;
    
    // ========================================================================
    // DADOS DO CLIENTE
    // ========================================================================
    
    page.drawText('DADOS DO CLIENTE', {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0, 0.2, 0.4),
    });
    y -= lineHeight + 5;
    
    const tipoCliente = applicant.applicant_type === 'individual' ? 'Pessoa Física (PF)' : 'Pessoa Jurídica (PJ)';
    page.drawText(`Tipo: ${tipoCliente}`, {
      x: margin,
      y,
      size: 10,
      font: fontRegular,
    });
    y -= lineHeight;
    
    const nome = applicant.company_name || applicant.full_name || 'N/A';
    page.drawText(`Nome: ${nome}`, {
      x: margin,
      y,
      size: 10,
      font: fontRegular,
    });
    y -= lineHeight;
    
    if (applicant.document_number) {
      const docLabel = applicant.applicant_type === 'individual' ? 'CPF' : 'CNPJ';
      page.drawText(`${docLabel}: ${applicant.document_number}`, {
        x: margin,
        y,
        size: 10,
        font: fontRegular,
      });
      y -= lineHeight;
    }
    
    if (applicant.email) {
      page.drawText(`Email: ${applicant.email}`, {
        x: margin,
        y,
        size: 10,
        font: fontRegular,
      });
      y -= lineHeight;
    }
    
    page.drawText(`ID do Aplicante: ${applicant.external_user_id}`, {
      x: margin,
      y,
      size: 10,
      font: fontRegular,
    });
    y -= 25;
    
    // ========================================================================
    // DADOS DO SCREENING
    // ========================================================================
    
    page.drawText('RESULTADO DO SCREENING', {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0, 0.2, 0.4),
    });
    y -= lineHeight + 5;
    
    page.drawText(`Wallet: ${screeningResult.address}`, {
      x: margin,
      y,
      size: 10,
      font: fontRegular,
    });
    y -= lineHeight;
    
    page.drawText(`Data/Hora: ${formatDateTime(screeningResult.timestamp)}`, {
      x: margin,
      y,
      size: 10,
      font: fontRegular,
    });
    y -= lineHeight;
    
    if (screeningResult.addressType) {
      const tipoEndereco = screeningResult.addressType === 'PRIVATE_WALLET' ? 'Carteira Privada' : 'Pool de Liquidez';
      page.drawText(`Tipo de Endereço: ${tipoEndereco}`, {
        x: margin,
        y,
        size: 10,
        font: fontRegular,
      });
      y -= lineHeight;
    }
    
    page.drawText(`Sancionada: ${screeningResult.isSanctioned ? 'SIM' : 'NÃO'}`, {
      x: margin,
      y,
      size: 10,
      font: fontRegular,
    });
    y -= lineHeight;
    
    if (screeningResult.riskLevel) {
      let riskText = '';
      let riskColor = rgb(0, 0, 0);
      
      switch (screeningResult.riskLevel) {
        case 'Low':
          riskText = 'BAIXO';
          riskColor = rgb(0, 0.6, 0);
          break;
        case 'Medium':
          riskText = 'MÉDIO';
          riskColor = rgb(0.8, 0.6, 0);
          break;
        case 'High':
          riskText = 'ALTO';
          riskColor = rgb(0.8, 0, 0);
          break;
        case 'Severe':
          riskText = 'SEVERO';
          riskColor = rgb(0.8, 0, 0);
          break;
      }
      
      page.drawText(`Nível de Risco: ${riskText}`, {
        x: margin,
        y,
        size: 10,
        font: fontBold,
        color: riskColor,
      });
      y -= lineHeight;
    }
    
    if (screeningResult.riskReason) {
      page.drawText(`Razão: ${screeningResult.riskReason}`, {
        x: margin,
        y,
        size: 10,
        font: fontRegular,
      });
      y -= lineHeight;
    }
    
    y -= 10;
    
    // ========================================================================
    // DECISÃO FINAL
    // ========================================================================
    
    page.drawText('DECISÃO FINAL', {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0, 0.2, 0.4),
    });
    y -= lineHeight + 5;
    
    let decisionText = '';
    let decisionColor = rgb(0, 0, 0);
    
    switch (screeningResult.decision) {
      case 'APPROVED':
        decisionText = 'APROVADA';
        decisionColor = rgb(0, 0.6, 0);
        break;
      case 'REJECTED':
        decisionText = 'REJEITADA';
        decisionColor = rgb(0.8, 0, 0);
        break;
      case 'MANUAL_REVIEW':
        decisionText = 'REVISAO MANUAL';
        decisionColor = rgb(0.8, 0.6, 0);
        break;
    }
    
    page.drawText(`Decisão: ${decisionText}`, {
      x: margin,
      y,
      size: 11,
      font: fontBold,
      color: decisionColor,
    });
    y -= lineHeight + 5;
    
    page.drawText(`Justificativa: ${screeningResult.decisionReason}`, {
      x: margin,
      y,
      size: 10,
      font: fontRegular,
    });
    y -= 25;
    
    // ========================================================================
    // EXPOSIÇÕES DETALHADAS
    // ========================================================================
    
    if (screeningResult.exposures && screeningResult.exposures.length > 0) {
      page.drawText('EXPOSIÇÕES DETALHADAS', {
        x: margin,
        y,
        size: 14,
        font: fontBold,
        color: rgb(0, 0.2, 0.4),
      });
      y -= lineHeight + 5;
      
      // Ordenar exposições por valor (maior primeiro)
      const sortedExposures = [...screeningResult.exposures].sort((a, b) => b.value - a.value);
      
      // Cabeçalho da tabela
      page.drawText('Categoria', {
        x: margin,
        y,
        size: 9,
        font: fontBold,
      });
      
      page.drawText('Valor (USD)', {
        x: width - margin - 100,
        y,
        size: 9,
        font: fontBold,
      });
      y -= 12;
      
      // Linha separadora
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= 10;
      
      // Listar exposições (máximo 30 por página)
      const maxExposures = Math.min(sortedExposures.length, 30);
      for (let i = 0; i < maxExposures; i++) {
        const exposure = sortedExposures[i];
        
        // Verificar se precisa de nova página
        if (y < 100) {
          const newPage = pdfDoc.addPage([595, 842]);
          y = height - 50;
        }
        
        const categoryName = categoryTranslations[exposure.category.toLowerCase()] || exposure.category;
        
        // Destacar categorias de risco
        const textColor = categoryName.startsWith('[ALERTA]') ? rgb(0.8, 0, 0) : rgb(0, 0, 0);
        
        page.drawText(categoryName, {
          x: margin,
          y,
          size: 9,
          font: fontRegular,
          color: textColor,
        });
        
        page.drawText(formatCurrency(exposure.value), {
          x: width - margin - 100,
          y,
          size: 9,
          font: fontRegular,
        });
        
        y -= 12;
      }
      
      if (sortedExposures.length > 30) {
        y -= 5;
        page.drawText(`... e mais ${sortedExposures.length - 30} exposições`, {
          x: margin,
          y,
          size: 9,
          font: fontItalic,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
    }
    
    // ========================================================================
    // RODAPÉ
    // ========================================================================
    
    // Ir para o final da página
    y = 80;
    
    // Linha separadora
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 15;
    
    page.drawText('Este relatório foi gerado automaticamente pelo sistema de onboarding da 1A1Cripto.', {
      x: margin,
      y,
      size: 8,
      font: fontItalic,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 10;
    
    page.drawText('Os dados foram obtidos através da API Chainalysis Address Screening.', {
      x: margin,
      y,
      size: 8,
      font: fontItalic,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 10;
    
    page.drawText('Para mais informações, visite: https://www.chainalysis.com', {
      x: margin,
      y,
      size: 8,
      font: fontItalic,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 15;
    
    // Hash do documento (para verificação de integridade)
    const documentContent = JSON.stringify({
      screening: screeningResult,
      applicant: {
        id: applicant.external_user_id,
        type: applicant.applicant_type,
        name: nome,
        document: applicant.document_number,
      },
    });
    
    const documentHash = await generateHash(documentContent);
    
    page.drawText(`Hash SHA-256: ${documentHash}`, {
      x: margin,
      y,
      size: 7,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 10;
    
    page.drawText(`Gerado em: ${formatDateTime(new Date().toISOString())}`, {
      x: margin,
      y,
      size: 7,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    // Gerar PDF como Buffer
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('[PDF Generation] Erro ao gerar PDF:', error);
    throw new Error(`Falha ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Gera nome do arquivo PDF
 */
export function generateScreeningPDFFilename(
  applicantId: string,
  walletAddress: string
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const walletShort = walletAddress.slice(0, 8);
  return `screening_${applicantId}_${walletShort}_${timestamp}.pdf`;
}

