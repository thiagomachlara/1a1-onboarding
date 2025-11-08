import { jsPDF } from 'jspdf';
import type { Applicant } from './supabase-db';

interface WalletTermData {
  applicant: Applicant;
  walletAddress: string;
  signedAt: string;
  ip: string;
  userAgent: string;
}

/**
 * Gera PDF do termo de aceite de wallet
 */
export function generateWalletTermPDF(data: WalletTermData): Uint8Array {
  const { applicant, walletAddress, signedAt, ip, userAgent } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  
  let y = margin;
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMO DE CADASTRO DE WALLET', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  doc.setFontSize(14);
  doc.text('USDT - Rede TRC-20 (TRON)', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Dados do cliente
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE:', margin, y);
  y += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const tipoCliente = applicant.applicant_type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica';
  const docLabel = applicant.applicant_type === 'individual' ? 'CPF' : 'CNPJ';
  const nomeRazao = applicant.company_name || applicant.full_name || 'Não informado';
  
  doc.text(`Tipo: ${tipoCliente}`, margin, y);
  y += 6;
  doc.text(`${docLabel}: ${applicant.document_number || 'Não informado'}`, margin, y);
  y += 6;
  doc.text(`Nome/Razão Social: ${nomeRazao}`, margin, y);
  y += 6;
  doc.text(`Email: ${applicant.email || 'Não informado'}`, margin, y);
  y += 12;
  
  // Dados da wallet
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('WALLET CADASTRADA:', margin, y);
  y += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Endereço TRC-20: ${walletAddress}`, margin, y);
  y += 6;
  doc.text(`Rede: TRON (TRC-20)`, margin, y);
  y += 6;
  doc.text(`Ativo: USDT`, margin, y);
  y += 12;
  
  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;
  
  // Texto do termo
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMO DE CADASTRO DE WALLET:', margin, y);
  y += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  const termoTexto = getTermoTexto(tipoCliente, nomeRazao);
  
  // Quebrar texto em linhas
  const lines = doc.splitTextToSize(termoTexto, maxWidth);
  
  for (let i = 0; i < lines.length; i++) {
    if (y > pageHeight - margin - 10) {
      doc.addPage();
      y = margin;
    }
    doc.text(lines[i], margin, y);
    y += 5;
  }
  
  // Nova página para assinatura
  doc.addPage();
  y = margin;
  
  // Dados da assinatura eletrônica
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSINATURA ELETRÔNICA', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const dataAssinatura = new Date(signedAt).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'long',
    timeStyle: 'long',
  });
  
  doc.text(`Data e Hora: ${dataAssinatura}`, margin, y);
  y += 8;
  doc.text(`Endereço IP: ${ip}`, margin, y);
  y += 8;
  
  // User Agent pode ser longo, quebrar em múltiplas linhas
  const userAgentLines = doc.splitTextToSize(`Navegador: ${userAgent}`, maxWidth);
  for (let i = 0; i < userAgentLines.length; i++) {
    doc.text(userAgentLines[i], margin, y);
    y += 6;
  }
  
  y += 10;
  
  // Box de confirmação
  doc.setDrawColor(100, 100, 100);
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(margin, y, maxWidth, 30, 3, 3, 'FD');
  
  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIRMAÇÃO DE ACEITE:', margin + 5, y);
  y += 6;
  
  doc.setFont('helvetica', 'normal');
  const confirmacaoLines = doc.splitTextToSize(
    'Declaro que li, compreendi e concordo com todos os termos acima. Confirmo ser o proprietário da wallet cadastrada e que ela não está associada a atividades ilícitas.',
    maxWidth - 10
  );
  
  for (let i = 0; i < confirmacaoLines.length; i++) {
    doc.text(confirmacaoLines[i], margin + 5, y);
    y += 5;
  }
  
  y += 15;
  
  // Linha de assinatura
  doc.setDrawColor(0, 0, 0);
  doc.line(margin + 20, y, pageWidth - margin - 20, y);
  y += 6;
  doc.setFontSize(9);
  doc.text(nomeRazao, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text(tipoCliente, pageWidth / 2, y, { align: 'center' });
  
  y += 20;
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('1A1 Intermediação Ltda - Termo de Cadastro de Wallet', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text('Documento gerado eletronicamente e possui validade jurídica', pageWidth / 2, y, { align: 'center' });
  
  // Retornar como Uint8Array
  const pdfOutput = doc.output('arraybuffer');
  return new Uint8Array(pdfOutput);
}

/**
 * Retorna o texto completo do termo de wallet
 */
function getTermoTexto(tipoCliente: string, nomeRazao: string): string {
  return `
DECLARAÇÕES E RESPONSABILIDADES:

1. PROPRIEDADE DA WALLET
${nomeRazao}, doravante denominado(a) CLIENTE, declara sob as penas da lei que é o(a) único(a) e legítimo(a) proprietário(a) da wallet blockchain cadastrada neste documento. O CLIENTE declara ter controle exclusivo das chaves privadas associadas a este endereço e assume total responsabilidade por sua guarda e segurança.

2. ORIGEM LÍCITA DOS RECURSOS
O CLIENTE declara e garante que a wallet cadastrada não está, e não será, utilizada para atividades ilícitas, incluindo mas não se limitando a: lavagem de dinheiro, financiamento ao terrorismo, fraude, evasão fiscal, tráfico de drogas ou qualquer outra atividade proibida pela legislação brasileira ou internacional.

3. ANÁLISE KYT (KNOW YOUR TRANSACTION)
O CLIENTE está ciente e expressamente autoriza que a wallet cadastrada será submetida a análise de compliance via serviços de KYT (Know Your Transaction), incluindo mas não se limitando à plataforma Chainalysis. Esta análise visa identificar exposições a endereços sancionados, atividades ilícitas ou padrões de transação suspeitos.

4. REJEIÇÃO OU SUSPENSÃO
O CLIENTE está ciente de que, caso a análise KYT identifique riscos elevados, sanções ou exposições inaceitáveis, a 1A1 Intermediação Ltda reserva-se o direito de:
   a) Rejeitar o cadastro da wallet;
   b) Suspender ou cancelar serviços prestados;
   c) Reportar informações às autoridades competentes, conforme exigido por lei.

5. IRREVERSIBILIDADE DE TRANSAÇÕES
O CLIENTE compreende e aceita que transações realizadas em blockchain são irreversíveis por natureza. A 1A1 Intermediação Ltda não se responsabiliza por valores enviados para endereços incorretos, perdidos ou inacessíveis devido a erro do CLIENTE na informação ou guarda das chaves privadas.

6. ATUALIZAÇÃO DE INFORMAÇÕES
O CLIENTE compromete-se a informar imediatamente a 1A1 Intermediação Ltda caso:
   a) Perca o controle ou acesso à wallet cadastrada;
   b) Suspeite de comprometimento das chaves privadas;
   c) Deseje alterar a wallet cadastrada para outro endereço.

7. CONFORMIDADE COM REGULAMENTAÇÕES
O CLIENTE declara estar ciente e em conformidade com todas as regulamentações aplicáveis ao uso de criptoativos, incluindo mas não se limitando à Lei nº 14.478/2022 (Marco Legal das Criptomoedas) e às normas do Banco Central do Brasil, Receita Federal e demais órgãos reguladores.

8. POLÍTICA DE PRIVACIDADE
O CLIENTE autoriza a 1A1 Intermediação Ltda a coletar, armazenar e processar os dados da wallet cadastrada, bem como o histórico de transações associado, exclusivamente para fins de compliance, prevenção à lavagem de dinheiro e cumprimento de obrigações legais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).

9. RESPONSABILIDADE EXCLUSIVA
O CLIENTE assume total e exclusiva responsabilidade por todas as transações realizadas através da wallet cadastrada, isentando a 1A1 Intermediação Ltda de qualquer responsabilidade civil, criminal ou administrativa decorrente do uso indevido, negligente ou ilícito da wallet.

10. VALIDADE JURÍDICA
Este termo possui validade jurídica e constitui prova de consentimento expresso do CLIENTE. A assinatura eletrônica, juntamente com os dados de IP, data, hora e navegador, confere autenticidade e integridade a este documento, nos termos da Medida Provisória nº 2.200-2/2001 (ICP-Brasil) e do Marco Civil da Internet (Lei nº 12.965/2014).

Ao aceitar este termo, o CLIENTE declara ter lido, compreendido e concordado integralmente com todas as cláusulas acima.
`;
}
