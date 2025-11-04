import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'company'; // 'company', 'individual'
    
    // Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get all applicants of specified type
    const { data: applicants, error } = await supabase
      .from('applicants')
      .select('*')
      .eq('applicant_type', type);
    
    if (error) {
      throw error;
    }
    
    // Calculate statistics
    const total = applicants?.length || 0;
    const approved = applicants?.filter(a => a.review_answer === 'GREEN').length || 0;
    const rejected = applicants?.filter(a => a.review_answer === 'RED').length || 0;
    const pending = total - approved - rejected;
    
    // Calculate days since approval and eligibility for refresh
    const now = new Date();
    let eligibleForRefresh = 0;
    let needsRefreshSoon = 0; // 150-179 days
    
    applicants?.forEach(applicant => {
      if (applicant.approved_at && applicant.review_answer === 'GREEN') {
        const reviewedDate = new Date(applicant.approved_at);
        const diffTime = Math.abs(now.getTime() - reviewedDate.getTime());
        const daysSinceApproval = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysSinceApproval >= 180) {
          eligibleForRefresh++;
        } else if (daysSinceApproval >= 150) {
          needsRefreshSoon++;
        }
      }
    });
    
    // Calculate approval rate
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    
    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentApprovals = applicants?.filter(a => {
      if (!a.approved_at) return false;
      const reviewedDate = new Date(a.approved_at);
      return reviewedDate >= thirtyDaysAgo && a.review_answer === 'GREEN';
    }).length || 0;
    
    return NextResponse.json({
      success: true,
      stats: {
        total,
        approved,
        rejected,
        pending,
        approvalRate,
        eligibleForRefresh,
        needsRefreshSoon,
        recentApprovals
      }
    });
    
  } catch (error: any) {
    console.error('[KYB Stats] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

