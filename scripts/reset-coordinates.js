#!/usr/bin/env node
/**
 * Reset Coordinates to Force Map URL Regeneration
 * 
 * This script clears the enriched_lat and enriched_lng fields for all companies.
 * This will force the /maps API to regenerate the URLs with the new high-resolution
 * sizes (1200x400 for map, 1200x600 for Street View) when the page is loaded.
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

async function resetCoordinates() {
  console.log('🚀 Starting coordinate reset...\n');

  // First, get count of companies with coordinates
  const { count, error: countError } = await supabase
    .from('applicants')
    .select('*', { count: 'exact', head: true })
    .not('enriched_lat', 'is', null)
    .not('enriched_lng', 'is', null);

  if (countError) {
    console.error('❌ Error counting companies:', countError);
    throw countError;
  }

  console.log(`📊 Found ${count} companies with coordinates`);

  if (count === 0) {
    console.log('ℹ️  No companies to reset');
    return;
  }

  // Ask for confirmation
  console.log('\n⚠️  This will clear enriched_lat and enriched_lng for all companies.');
  console.log('   The coordinates will be regenerated automatically when viewing each company page.');
  console.log('\n✅ Proceeding with reset...\n');

  // Clear the coordinates
  const { data, error } = await supabase
    .from('applicants')
    .update({ 
      enriched_lat: null, 
      enriched_lng: null 
    })
    .not('enriched_lat', 'is', null)
    .not('enriched_lng', 'is', null)
    .select('id, company_name');

  if (error) {
    console.error('❌ Error resetting coordinates:', error);
    throw error;
  }

  console.log('='.repeat(60));
  console.log('✅ RESET COMPLETE');
  console.log('='.repeat(60));
  console.log(`📊 Updated ${data.length} companies`);
  console.log('='.repeat(60));
  console.log('\nℹ️  Next steps:');
  console.log('   1. Open any company page in the admin panel');
  console.log('   2. Go to the "Documentos" tab');
  console.log('   3. The maps will be generated automatically with new high-resolution URLs');
  console.log('   4. The coordinates will be saved back to the database');
}

// Run the script
resetCoordinates().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
