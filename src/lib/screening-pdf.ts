/**
 * Geração de PDF do Screening Chainalysis
 * 
 * Gera relatório em PDF com resultado completo do screening de wallet,
 * incluindo dados do cliente, exposições detalhadas e decisão final.
 */

import PDFDocument from 'pdfkit';
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
  'sanctioned entity': '⚠ Entidade Sancionada',
  'sanctioned jurisdiction': '⚠ Jurisdição Sancionada',
  'illicit actor-org': '⚠ Ator Ilícito',
  'stolen funds': '⚠ Fundos Roubados',
  'terrorist financing': '⚠ Financiamento Terrorista',
  'scam': '⚠ Fraude',
  'special measures': '⚠ Medidas Especiais',
  'escort service': '⚠ Serviço de Acompanhantes',
};

/**
 * Gera PDF do screening Chainalysis
 */
export async function generateScreeningPDF(
  screeningResult: WalletScreeningResult,
  applicant: Applicant
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // ========================================================================
      // CABEÇALHO
      // ========================================================================

      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('RELATÓRIO DE SCREENING', { align: 'center' });

      doc
        .fontSize(14)
        .font('Helvetica')
        .text('Chainalysis Address Screening', { align: 'center' });

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // ========================================================================
      // DADOS DO CLIENTE
      // ========================================================================

      doc.fontSize(14).font('Helvetica-Bold').text('DADOS DO CLIENTE');
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');

      const tipoCliente = applicant.applicant_type === 'individual' ? 'Pessoa Física (PF)' : 'Pessoa Jurídica (PJ)';
      doc.text(`Tipo: ${tipoCliente}`);

      const nome = applicant.company_name || applicant.full_name || 'N/A';
      doc.text(`Nome: ${nome}`);

      if (applicant.document_number) {
        const docLabel = applicant.applicant_type === 'individual' ? 'CPF' : 'CNPJ';
        doc.text(`${docLabel}: ${applicant.document_number}`);
      }

      if (applicant.email) {
        doc.text(`Email: ${applicant.email}`);
      }

      doc.text(`ID do Aplicante: ${applicant.external_user_id}`);
      doc.moveDown(1);

      // ========================================================================
      // DADOS DO SCREENING
      // ========================================================================

      doc.fontSize(14).font('Helvetica-Bold').text('RESULTADO DO SCREENING');
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');

      doc.text(`Wallet: ${screeningResult.address}`);
      doc.text(`Data/Hora: ${formatDateTime(screeningResult.timestamp)}`);

      if (screeningResult.addressType) {
        const tipoEndereco = screeningResult.addressType === 'PRIVATE_WALLET' ? 'Carteira Privada' : 'Pool de Liquidez';
        doc.text(`Tipo de Endereço: ${tipoEndereco}`);
      }

      doc.text(`Sancionada: ${screeningResult.isSanctioned ? 'SIM' : 'NÃO'}`);

      if (screeningResult.riskLevel) {
        let riskText = '';
        let riskColor = 'black';

        switch (screeningResult.riskLevel) {
          case 'Low':
            riskText = 'BAIXO';
            riskColor = 'green';
            break;
          case 'Medium':
            riskText = 'MÉDIO';
            riskColor = 'orange';
            break;
          case 'High':
            riskText = 'ALTO';
            riskColor = 'red';
            break;
          case 'Severe':
            riskText = 'SEVERO';
            riskColor = 'red';
            break;
        }

        doc.font('Helvetica-Bold').fillColor(riskColor).text(`Nível de Risco: ${riskText}`);
        doc.fillColor('black').font('Helvetica');
      }

      if (screeningResult.riskReason) {
        doc.text(`Razão: ${screeningResult.riskReason}`);
      }

      doc.moveDown(1);

      // ========================================================================
      // DECISÃO FINAL
      // ========================================================================

      doc.fontSize(14).font('Helvetica-Bold').text('DECISÃO FINAL');
      doc.moveDown(0.5);

      doc.fontSize(11);

      let decisionText = '';
      let decisionColor = 'black';

      switch (screeningResult.decision) {
        case 'APPROVED':
          decisionText = '✓ APROVADA';
          decisionColor = 'green';
          break;
        case 'REJECTED':
          decisionText = '✗ REJEITADA';
          decisionColor = 'red';
          break;
        case 'MANUAL_REVIEW':
          decisionText = '⚠ REVISÃO MANUAL';
          decisionColor = 'orange';
          break;
      }

      doc.fillColor(decisionColor).text(`Decisão: ${decisionText}`);
      doc.fillColor('black');

      doc.fontSize(10).font('Helvetica');
      doc.text(`Justificativa: ${screeningResult.decisionReason}`);
      doc.moveDown(1);

      // ========================================================================
      // EXPOSIÇÕES DETALHADAS
      // ========================================================================

      if (screeningResult.exposures && screeningResult.exposures.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('EXPOSIÇÕES DETALHADAS');
        doc.moveDown(0.5);

        doc.fontSize(9).font('Helvetica');

        // Ordenar exposições por valor (maior primeiro)
        const sortedExposures = [...screeningResult.exposures].sort((a, b) => b.value - a.value);

        // Cabeçalho da tabela
        doc.font('Helvetica-Bold');
        doc.text('Categoria', 50, doc.y, { continued: true, width: 300 });
        doc.text('Valor (USD)', 350, doc.y);
        doc.moveDown(0.3);

        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.3);

        doc.font('Helvetica');

        // Listar exposições
        for (const exposure of sortedExposures) {
          const categoryName = categoryTranslations[exposure.category.toLowerCase()] || exposure.category;

          // Destacar categorias de risco
          if (categoryName.startsWith('⚠')) {
            doc.fillColor('red');
          }

          const yPos = doc.y;
          doc.text(categoryName, 50, yPos, { width: 300 });
          doc.text(formatCurrency(exposure.value), 350, yPos);

          doc.fillColor('black');
          doc.moveDown(0.3);

          // Nova página se necessário
          if (doc.y > 700) {
            doc.addPage();
          }
        }
      }

      // ========================================================================
      // RODAPÉ
      // ========================================================================

      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(8).font('Helvetica-Oblique');
      doc.text('Este relatório foi gerado automaticamente pelo sistema de onboarding da 1A1Cripto.');
      doc.text('Os dados foram obtidos através da API Chainalysis Address Screening.');
      doc.text('Para mais informações, visite: https://www.chainalysis.com');
      doc.moveDown(0.5);

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

      doc.fontSize(7).font('Helvetica');
      doc.text(`Hash SHA-256: ${documentHash}`);
      doc.text(`Gerado em: ${formatDateTime(new Date().toISOString())}`);

      // Finalizar PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
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

