import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Endpoint de sincronização de dados de applicants
 * 
 * Usado pelo Dashboard Lovable para buscar dados atualizados periodicamente
 * 
 * Query params:
 * - since: ISO timestamp (opcional) - retorna apenas applicants atualizados após essa data
 * 
 * Exemplo:
 * GET /api/kyb/sync?since=2024-12-01T00:00:00Z
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const since = searchParams.get('since');
    
    // Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Build query
    let query = supabase
      .from('applicants')
      .select('*')
      .eq('applicant_type', 'company')
      .eq('current_status', 'approved')
      .order('updated_at', { ascending: false });
    
    // Filter by timestamp if provided
    if (since) {
      query = query.gte('updated_at', since);
    }
    
    const { data: applicants, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // Transform data for Dashboard Lovable
    const transformedData = applicants?.map(applicant => ({
      // IDs
      applicant_id: applicant.applicant_id,
      external_user_id: applicant.external_user_id,
      
      // Basic info
      company_name: applicant.company_name || applicant.full_name,
      email: applicant.email,
      phone: applicant.phone,
      document: applicant.document_number,
      
      // Dates
      created_at: applicant.created_at,
      approved_at: applicant.approved_at,
      updated_at: applicant.updated_at,
      
      // Status
      status: applicant.current_status,
      review_answer: applicant.review_answer,
      
      // Refresh metadata
      refresh_requested_at: applicant.refresh_requested_at,
      refresh_status: applicant.refresh_status,
      
      // Additional data
      level_name: applicant.sumsub_level_name,
      metadata: {
        country: applicant.sumsub_review_result?.country,
        platform: applicant.sumsub_review_result?.platform,
        synced_from_nextjs: true
      }
    })) || [];
    
    return NextResponse.json({
      success: true,
      data: transformedData,
      count: transformedData.length,
      timestamp: new Date().toISOString(),
      since: since || null
    });
    
  } catch (error: any) {
    console.error('[KYB Sync] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message 
      },
      { status: 500 }
    );
  }
}

