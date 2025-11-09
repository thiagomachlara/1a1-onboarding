import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/admin-permissions';
import { logAdminAction, extractRequestInfo } from '@/lib/admin-audit';

/**
 * POST /api/admin/templates/[id]/activate
 * Ativa um template (e desativa o anterior)
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão
    const currentUser = await requirePermission({ resource: 'templates', action: 'edit' });
    
    const supabase = createClient();
    
    // Buscar template
    const { data: template, error: fetchError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (fetchError || !template) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      );
    }
    
    // Desativar template ativo anterior
    await supabase
      .from('contract_templates')
      .update({ is_active: false })
      .eq('template_type', template.template_type)
      .eq('is_active', true);
    
    // Ativar novo template
    const { error: updateError } = await supabase
      .from('contract_templates')
      .update({
        is_active: true,
        activated_at: new Date().toISOString(),
        activated_by: currentUser.id,
      })
      .eq('id', params.id);
    
    if (updateError) {
      throw updateError;
    }
    
    // Registrar no changelog
    await supabase
      .from('template_change_log')
      .insert({
        template_id: params.id,
        changed_by: currentUser.id,
        action: 'activated',
        change_summary: `Template ativado: ${template.title}`,
      });
    
    // Registrar auditoria
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAdminAction({
      adminUserId: currentUser.id,
      action: 'activate',
      resourceType: 'template',
      resourceId: params.id,
      newValue: { is_active: true },
      ipAddress,
      userAgent,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Template ativado com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao ativar template:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao ativar template' },
      { status: error.message === 'Permissão negada' ? 403 : 500 }
    );
  }
}
