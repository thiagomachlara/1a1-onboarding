import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * PATCH /api/ubos/[id]
 * 
 * Atualiza dados adicionais de um UBO (nome da mãe, pai, etc)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient();
    const { id } = await params;
    const body = await request.json();

    console.log('[UBO_UPDATE] Atualizando UBO:', id, body);

    // Validar campos permitidos
    const allowedFields = ['mother_name', 'father_name'];
    const updates: any = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo válido para atualizar' },
        { status: 400 }
      );
    }

    // Atualizar no banco
    const { data, error } = await supabase
      .from('beneficial_owners')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[UBO_UPDATE] Erro ao atualizar:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('[UBO_UPDATE] UBO atualizado com sucesso:', data);

    return NextResponse.json({
      success: true,
      ubo: data,
    });
  } catch (error: any) {
    console.error('[UBO_UPDATE] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
