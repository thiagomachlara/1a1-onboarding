import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/admin-permissions';
import { logAdminAction, extractRequestInfo } from '@/lib/admin-audit';

/**
 * GET /api/admin/templates
 * Lista todos os templates
 */
export async function GET(request: Request) {
  try {
    // Verificar permissão
    await requirePermission({ resource: 'templates', action: 'view' });
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    const supabase = createClient();
    
    let query = supabase
      .from('contract_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (type) {
      query = query.eq('template_type', type);
    }
    
    const { data: templates, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error('Erro ao listar templates:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao listar templates' },
      { status: error.message === 'Permissão negada' ? 403 : 500 }
    );
  }
}

/**
 * POST /api/admin/templates
 * Cria um novo template
 */
export async function POST(request: Request) {
  try {
    // Verificar permissão
    const currentUser = await requirePermission({ resource: 'templates', action: 'edit' });
    
    const { template_type, title, content, variables } = await request.json();
    
    // Validar dados
    if (!template_type || !title || !content || !variables) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }
    
    // Validar template_type
    if (!['contract', 'wallet_term'].includes(template_type)) {
      return NextResponse.json(
        { error: 'Tipo de template inválido' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // Buscar última versão
    const { data: lastVersion } = await supabase
      .from('contract_templates')
      .select('version')
      .eq('template_type', template_type)
      .order('version', { ascending: false })
      .limit(1)
      .single();
    
    const newVersion = (lastVersion?.version || 0) + 1;
    
    // Criar novo template
    const { data: template, error: insertError } = await supabase
      .from('contract_templates')
      .insert({
        template_type,
        version: newVersion,
        title,
        content,
        variables,
        is_active: false,
        created_by: currentUser.id,
      })
      .select()
      .single();
    
    if (insertError) {
      throw insertError;
    }
    
    // Registrar no changelog
    await supabase
      .from('template_change_log')
      .insert({
        template_id: template.id,
        changed_by: currentUser.id,
        action: 'created',
        new_content: content,
        change_summary: `Template criado: ${title}`,
      });
    
    // Registrar auditoria
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await logAdminAction({
      adminUserId: currentUser.id,
      action: 'create',
      resourceType: 'template',
      resourceId: template.id,
      newValue: { title, version: newVersion, template_type },
      ipAddress,
      userAgent,
    });
    
    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error: any) {
    console.error('Erro ao criar template:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar template' },
      { status: error.message === 'Permissão negada' ? 403 : 500 }
    );
  }
}
