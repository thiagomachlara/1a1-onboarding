import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTemplate() {
  const { data } = await supabase
    .from('contract_templates')
    .select('content')
    .eq('template_type', 'contract')
    .eq('is_active', true)
    .single();

  if (data) {
    // Extrair parte do endereço
    const lines = data.content.split('\n');
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      console.log(lines[i]);
    }
  }
}

checkTemplate();
