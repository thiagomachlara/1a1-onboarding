import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

interface CSVRow {
  applicantId: string;
  externalUserId: string;
  createdAt: string;
  reviewedAt: string;
  companyName: string;
  email: string;
  phone: string;
  country: string;
  reviewStatus: string;
  levelName: string;
  applicantPlatform: string;
  reviewResult: string;
}

function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n');
  const headers = lines[0].split(';').map(h => h.replace(/"/g, '').trim());
  
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = line.split(';').map(v => v.replace(/"/g, '').trim());
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row as CSVRow);
  }
  
  return rows;
}

function parseDatetime(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  try {
    // Format: "2025-10-31 16:13:16"
    const date = new Date(dateStr.replace(' ', 'T') + 'Z');
    return date.toISOString();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Read CSV
    const csvText = await file.text();
    const rows = parseCSV(csvText);
    
    // Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    
    for (const row of rows) {
      try {
        // Skip if not completed
        if (row.reviewResult !== 'completed') {
          skipped++;
          continue;
        }
        
        // Skip if no reviewed_at date
        const reviewedAt = parseDatetime(row.reviewedAt);
        if (!reviewedAt) {
          skipped++;
          continue;
        }
        
        // Prepare data
        const data = {
          applicant_id: row.applicantId,
          external_user_id: row.externalUserId,
          name: row.companyName,
          email: row.email,
          document: row.externalUserId.replace('cnpj_', '').replace('unil-', ''),
          verification_type: 'company',
          review_answer: row.reviewStatus === 'GREEN' ? 'GREEN' : 'RED',
          level_name: row.levelName,
          created_at: parseDatetime(row.createdAt),
          reviewed_at: reviewedAt,
          payload: {
            country: row.country,
            phone: row.phone,
            platform: row.applicantPlatform,
            imported_from_csv: true,
            imported_at: new Date().toISOString()
          }
        };
        
        // Upsert to Supabase
        const { error } = await supabase
          .from('onboarding_notifications')
          .upsert(data, {
            onConflict: 'applicant_id'
          });
        
        if (error) {
          errors++;
          errorDetails.push(`${row.companyName}: ${error.message}`);
        } else {
          imported++;
        }
        
      } catch (error: any) {
        errors++;
        errorDetails.push(`${row.companyName}: ${error.message}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      summary: {
        total: rows.length,
        imported,
        skipped,
        errors
      },
      errorDetails: errorDetails.slice(0, 10) // First 10 errors only
    });
    
  } catch (error: any) {
    console.error('[Import CSV] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

