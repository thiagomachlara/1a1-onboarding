#!/usr/bin/env node
/**
 * Bulk Sync Google Maps URLs
 * 
 * This script updates all companies with coordinates to use the new high-resolution
 * Google Maps images (1200x400 for map, 1200x600 for Street View).
 * 
 * It calls the /api/companies/[id]/enrich-address endpoint for each company
 * to regenerate the URLs with the new sizes.
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getAllCompaniesWithCoordinates() {
  console.log('📋 Fetching all companies with coordinates...');
  
  const { data, error } = await supabase
    .from('applicants')
    .select('id, company_name, enriched_lat, enriched_lng')
    .not('enriched_lat', 'is', null)
    .not('enriched_lng', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching companies:', error);
    throw error;
  }

  console.log(`✅ Found ${data.length} companies with coordinates`);
  return data;
}

async function syncCompany(companyId, companyName) {
  try {
    const url = `https://onboarding.1a1cripto.com/api/companies/${companyId}/enrich-address`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return { success: true, companyId, companyName, result };
  } catch (error) {
    return { success: false, companyId, companyName, error: error.message };
  }
}

async function bulkSync() {
  console.log('🚀 Starting bulk sync of Google Maps URLs...\n');

  const companies = await getAllCompaniesWithCoordinates();

  if (companies.length === 0) {
    console.log('ℹ️  No companies to sync');
    return;
  }

  console.log(`📊 Total companies to sync: ${companies.length}\n`);

  const results = {
    success: [],
    failed: [],
  };

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const progress = `[${i + 1}/${companies.length}]`;

    console.log(`${progress} Syncing: ${company.company_name || company.id}...`);

    const result = await syncCompany(company.id, company.company_name);

    if (result.success) {
      console.log(`  ✅ Success`);
      results.success.push(result);
    } else {
      console.log(`  ❌ Failed: ${result.error}`);
      results.failed.push(result);
    }

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 SYNC COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log('='.repeat(60));

  if (results.failed.length > 0) {
    console.log('\n❌ Failed companies:');
    results.failed.forEach(({ companyName, companyId, error }) => {
      console.log(`  - ${companyName || companyId}: ${error}`);
    });
  }
}

// Run the script
bulkSync().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
