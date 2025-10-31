import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Endpoint para redirecionar links curtos de PDFs do Sumsub
 * 
 * GET /sumsub/{id}
 * 
 * Redireciona para a URL completa do PDF armazenado no Supabase Storage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID do link curto não fornecido' },
        { status: 400 }
      );
    }

    // Buscar URL completa no banco de dados
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('pdf_short_links')
      .select('full_url')
      .eq('short_id', id)
      .single();

    if (error || !data) {
      console.error('[Sumsub Link] Erro ao buscar link:', error);
      return NextResponse.json(
        { error: 'Link não encontrado' },
        { status: 404 }
      );
    }

    // Incrementar contador de acessos (fire and forget)
    supabase.rpc('increment_pdf_access', { link_id: id }).then(() => {
      console.log(`[Sumsub Link] Acesso incrementado para ${id}`);
    }).catch(err => {
      console.error('[Sumsub Link] Erro ao incrementar acesso:', err);
    });

    // Redirecionar para URL completa
    return NextResponse.redirect(data.full_url, 302);
    
  } catch (error) {
    console.error('[Sumsub Link] Erro ao processar redirecionamento:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar link' },
      { status: 500 }
    );
  }
}

