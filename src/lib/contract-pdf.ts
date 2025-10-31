import { jsPDF } from 'jspdf';
import type { Applicant } from './supabase-db';

interface ContractData {
  applicant: Applicant;
  signedAt: string;
  ip: string;
  userAgent: string;
}

/**
 * Gera PDF do contrato assinado
 */
export function generateContractPDF(data: ContractData): Uint8Array {
  const { applicant, signedAt, ip, userAgent } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  
  let y = margin;
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  doc.setFontSize(14);
  doc.text('DE LIQUIDEZ EM USDT', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Dados do contratante
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CONTRATANTE:', margin, y);
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
  
  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;
  
  // Texto do contrato
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CLÁUSULAS CONTRATUAIS:', margin, y);
  y += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  const contratoTexto = getContratoTexto(tipoCliente, nomeRazao, applicant.document_number || '');
  
  // Quebrar texto em linhas
  const lines = doc.splitTextToSize(contratoTexto, maxWidth);
  
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
    timeStyle: 'medium',
  });
  
  doc.text(`Data e Hora: ${dataAssinatura}`, margin, y);
  y += 8;
  doc.text(`Endereço IP: ${ip}`, margin, y);
  y += 8;
  
  const userAgentLines = doc.splitTextToSize(`Navegador: ${userAgent}`, maxWidth);
  for (let i = 0; i < userAgentLines.length; i++) {
    doc.text(userAgentLines[i], margin, y);
    y += 6;
  }
  y += 10;
  
  // Box de assinatura
  doc.setDrawColor(100, 100, 100);
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, maxWidth, 40, 'FD');
  
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('ASSINADO ELETRONICAMENTE POR:', margin + 5, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(nomeRazao, margin + 5, y);
  y += 6;
  doc.text(`${docLabel}: ${applicant.document_number}`, margin + 5, y);
  y += 15;
  
  // Texto de validade jurídica
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const validadeTexto = 'Este documento foi assinado eletronicamente e possui validade jurídica nos termos da MP 2.200-2/2001 e Lei 14.063/2020. A autenticidade pode ser verificada através dos dados de assinatura acima.';
  const validadeLines = doc.splitTextToSize(validadeTexto, maxWidth);
  
  for (let i = 0; i < validadeLines.length; i++) {
    doc.text(validadeLines[i], margin, y);
    y += 4;
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('1A1 Cripto - Prestação de Serviços de Liquidez em USDT', pageWidth / 2, pageHeight - 10, { align: 'center' });
  
  // Retornar PDF como Uint8Array
  return doc.output('arraybuffer') as unknown as Uint8Array;
}

/**
 * Retorna o texto do contrato
 */
function getContratoTexto(tipo: string, nome: string, documento: string): string {
  const docLabel = tipo === 'Pessoa Física' ? 'CPF' : 'CNPJ';
  
  return `
CONTRATANTE: ${nome}, ${docLabel} nº ${documento}, doravante denominado CONTRATANTE.

CONTRATADA: 1A1 CRIPTO, doravante denominada CONTRATADA.

As partes acima qualificadas têm, entre si, justo e acordado o presente Contrato de Prestação de Serviços de Liquidez em USDT, que se regerá pelas cláusulas seguintes:

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação de serviços de liquidez em USDT (Tether) pela CONTRATADA ao CONTRATANTE, mediante as condições estabelecidas neste instrumento.

CLÁUSULA 2ª - DOS SERVIÇOS
2.1. A CONTRATADA se compromete a fornecer liquidez em USDT ao CONTRATANTE através de operações de compra e venda.
2.2. As operações serão realizadas mediante solicitação prévia do CONTRATANTE através dos canais oficiais da CONTRATADA.
2.3. A CONTRATADA se reserva o direito de aceitar ou recusar operações a seu critério, especialmente em casos de suspeita de atividades ilícitas.

CLÁUSULA 3ª - DO PROCESSO OPERACIONAL
3.1. RFQ (Request for Quote): O CONTRATANTE solicita cotação para operação de compra ou venda de USDT.
3.2. Lock: Após aceite da cotação, os valores são bloqueados por período determinado.
3.3. Settlement: Confirmação e liquidação da operação através de transferência bancária (BRL) e transferência blockchain (USDT).

CLÁUSULA 4ª - DA REDE BLOCKCHAIN
4.1. As operações de USDT serão realizadas exclusivamente na rede TRON (TRC-20).
4.2. O CONTRATANTE é responsável por fornecer endereço de wallet válido e compatível com a rede TRC-20.
4.3. Transações enviadas para endereços incorretos ou redes incompatíveis são irreversíveis e de responsabilidade exclusiva do CONTRATANTE.

CLÁUSULA 5ª - DA CONFORMIDADE (COMPLIANCE)
5.1. A CONTRATADA adota políticas rigorosas de Prevenção à Lavagem de Dinheiro (PLD) e Combate ao Financiamento do Terrorismo (CFT).
5.2. Todas as operações estão sujeitas a análise de compliance e KYT (Know Your Transaction) via Chainalysis.
5.3. A CONTRATADA se reserva o direito de solicitar documentação adicional a qualquer momento.
5.4. Operações suspeitas serão reportadas às autoridades competentes conforme legislação vigente.

CLÁUSULA 6ª - DO CADASTRO E VERIFICAÇÃO
6.1. O CONTRATANTE passou por processo de verificação de identidade (KYC) através da plataforma Sumsub.
6.2. O CONTRATANTE declara que todas as informações fornecidas são verdadeiras e atualizadas.
6.3. A CONTRATADA pode solicitar atualização cadastral periodicamente.

CLÁUSULA 7ª - DA WALLET E WHITELIST
7.1. O CONTRATANTE deve cadastrar wallet USDT (TRC-20) para recebimento de valores.
7.2. A wallet será submetida a análise KYT via Chainalysis antes da aprovação.
7.3. Apenas wallets aprovadas e incluídas em whitelist poderão receber USDT da CONTRATADA.
7.4. Alterações de wallet devem ser solicitadas formalmente e passarão por nova análise.

CLÁUSULA 8ª - DAS TAXAS E SPREADS
8.1. As cotações fornecidas pela CONTRATADA já incluem spread comercial.
8.2. Taxas de rede blockchain (gas fees) são de responsabilidade da CONTRATADA.
8.3. Taxas bancárias (TED, PIX) são de responsabilidade de cada parte conforme a operação.

CLÁUSULA 9ª - DOS LIMITES OPERACIONAIS
9.1. A CONTRATADA estabelece limites operacionais baseados no perfil e histórico do CONTRATANTE.
9.2. Limites podem ser ajustados mediante solicitação e análise de compliance.
9.3. Operações acima do limite estabelecido requerem aprovação prévia.

CLÁUSULA 10ª - DA PROTEÇÃO DE DADOS (LGPD)
10.1. As partes se comprometem a tratar dados pessoais em conformidade com a Lei 13.709/2018 (LGPD).
10.2. A CONTRATADA utilizará dados do CONTRATANTE exclusivamente para execução dos serviços contratados.
10.3. Dados serão armazenados de forma segura e não serão compartilhados com terceiros sem autorização, exceto quando exigido por lei.

CLÁUSULA 11ª - DAS RESPONSABILIDADES
11.1. A CONTRATADA não se responsabiliza por:
   a) Flutuações de mercado e variações cambiais;
   b) Valores enviados para endereços incorretos;
   c) Perdas decorrentes de ataques hackers em wallets do CONTRATANTE;
   d) Atrasos em transferências bancárias causados por instituições financeiras.

11.2. O CONTRATANTE é responsável por:
   a) Manter dados cadastrais atualizados;
   b) Garantir segurança de suas credenciais e wallets;
   c) Declarar origem lícita dos recursos;
   d) Cumprir obrigações fiscais e tributárias.

CLÁUSULA 12ª - DA VIGÊNCIA
12.1. O presente contrato entra em vigor na data de sua assinatura eletrônica.
12.2. O contrato possui prazo indeterminado, podendo ser rescindido por qualquer das partes mediante notificação prévia.

CLÁUSULA 13ª - DA RESCISÃO
13.1. O contrato pode ser rescindido imediatamente em caso de:
   a) Descumprimento de cláusulas contratuais;
   b) Suspeita de atividades ilícitas;
   c) Fornecimento de informações falsas;
   d) Determinação judicial ou de autoridade competente.

CLÁUSULA 14ª - DAS DISPOSIÇÕES GERAIS
14.1. Alterações contratuais devem ser formalizadas por escrito e aceitas por ambas as partes.
14.2. A tolerância de uma parte quanto ao descumprimento de obrigações não constitui novação ou renúncia de direitos.

CLÁUSULA 15ª - DO FORO
15.1. Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias oriundas do presente contrato.

CLÁUSULA 16ª - DA ASSINATURA ELETRÔNICA
16.1. As partes concordam que a assinatura eletrônica deste contrato possui validade jurídica equivalente à assinatura manuscrita, nos termos da MP 2.200-2/2001 e Lei 14.063/2020.
16.2. A autenticidade da assinatura pode ser verificada através dos dados técnicos registrados (timestamp, IP, user-agent).

E, por estarem assim justos e contratados, as partes assinam eletronicamente o presente instrumento.
`;
}

