/**
 * Endpoint de Redirecionamento para PDFs
 * GET /pdf/[id]
 * 
 * Redireciona links curtos para URLs completas do Supabase Storage
 * Exemplo: /pdf/a7f9k2 → https://oospfhaxwovcceddnoho.supabase.co/storage/v1/object/sign/...
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFullUrl, trackAccess } from '@/lib/pdf-short-links';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shortId } = await params;

    // Validar formato do ID (6 caracteres alfanuméricos)
    if (!/^[a-z0-9]{6}$/.test(shortId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Buscar URL completa
    const fullUrl = await getFullUrl(shortId);

    if (!fullUrl) {
      return NextResponse.json(
        { error: 'PDF não encontrado' },
        { status: 404 }
      );
    }

    // Rastrear acesso (não aguardar para não atrasar redirecionamento)
    trackAccess(shortId).catch(err => {
      console.error('[PDF Redirect] Erro ao rastrear acesso:', err);
    });

    // Redirecionar para URL completa
    return NextResponse.redirect(fullUrl, 302);

  } catch (error: any) {
    console.error('[PDF Redirect] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar PDF' },
      { status: 500 }
    );
  }
}

