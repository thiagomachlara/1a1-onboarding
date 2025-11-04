import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    
    // Check if searching by applicantId (single applicant lookup)
    const applicantId = searchParams.get('applicantId');
    
    if (applicantId) {
      // Direct lookup by applicant_id
      const { data: applicant, error } = await supabase
        .from('applicants')
        .select('*')
        .eq('applicant_id', applicantId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Applicant não encontrado' },
            { status: 404 }
          );
        }
        throw error;
      }
      
      return NextResponse.json({
        success: true,
        applicants: [applicant]
      });
    }
    
    // Filters
    const status = searchParams.get('status'); // 'GREEN', 'RED'
    const type = searchParams.get('type') || 'company'; // 'company', 'individual'
    const search = searchParams.get('search'); // Search by name or document
    const minDays = searchParams.get('minDays'); // Minimum days since approval
    
    // Build query
    let query = supabase
      .from('applicants')
      .select('*', { count: 'exact' })
      .eq('applicant_type', type)
      .order('approved_at', { ascending: false });
    
    // Apply filters
    if (status) {
      query = query.eq('review_answer', status);
    }
    
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,full_name.ilike.%${search}%,document_number.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    // Filter by minimum days since approval
    if (minDays) {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - parseInt(minDays));
      query = query.lte('approved_at', minDate.toISOString());
    }
    
    // Execute query with pagination
    const { data, error, count } = await query
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw error;
    }
    
    // Calculate days since approval for each applicant
    const applicantsWithDays = data?.map(applicant => {
      let daysSinceApproval = null;
      
      if (applicant.approved_at) {
        const reviewedDate = new Date(applicant.approved_at);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - reviewedDate.getTime());
        daysSinceApproval = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      return {
        ...applicant,
        days_since_approval: daysSinceApproval,
        eligible_for_refresh: daysSinceApproval !== null && daysSinceApproval >= 180
      };
    }) || [];
    
    return NextResponse.json({
      success: true,
      data: applicantsWithDays,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error: any) {
    console.error('[KYB Applicants] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

