import { jsPDF } from 'jspdf';
import type { Applicant } from './supabase-db';
import { createClient } from '@/lib/supabase/server';
import { renderTemplate, prepareContractVariables } from './template-renderer';

interface ContractData {
  applicant: Applicant;
  signedAt: string;
  ip: string;
  userAgent: string;
}

/**
 * Gera PDF do contrato assinado usando template do banco de dados
 */
export async function generateContractPDF(data: ContractData): Promise<Uint8Array> {
  const { applicant, signedAt, ip, userAgent } = data;
  
  // Buscar template ativo
  const supabase = createClient();
  const { data: template, error } = await supabase
    .from('contract_templates')
    .select('content')
    .eq('template_type', 'contract')
    .eq('is_active', true)
    .single();
  
  if (error || !template) {
    console.error('Template de contrato não encontrado, usando fallback');
    // Fallback para template hardcoded se não encontrar no BD
    return generateContractPDFFallback(data);
  }
  
  // Preparar variáveis
  const variables = prepareContractVariables(applicant, signedAt, ip, userAgent);
  
  // Renderizar template
  const contratoTexto = renderTemplate(template.content, variables);
  
  // Gerar PDF
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
  
  const tipoCliente = variables.tipo_cliente as string;
  const docLabel = variables.doc_label as string;
  const nomeRazao = variables.nome as string;
  
  doc.text(`Tipo: ${tipoCliente}`, margin, y);
  y += 6;
  doc.text(`${docLabel}: ${variables.documento}`, margin, y);
  y += 6;
  doc.text(`Nome/Razão Social: ${nomeRazao}`, margin, y);
  y += 6;
  doc.text(`Email: ${variables.email}`, margin, y);
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
  
  doc.text(`Data e Hora: ${variables.data_assinatura}`, margin, y);
  y += 8;
  doc.text(`Endereço IP: ${variables.ip}`, margin, y);
  y += 8;
  
  const userAgentLines = doc.splitTextToSize(`Navegador: ${variables.user_agent}`, maxWidth);
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
  doc.text(`${docLabel}: ${variables.documento}`, margin + 5, y);
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
 * Fallback: gera PDF com template hardcoded (caso não encontre no BD)
 */
function generateContractPDFFallback(data: ContractData): Uint8Array {
  // Importar função antiga
  const { generateContractPDF: oldGenerate } = require('./contract-pdf');
  return oldGenerate(data);
}
