import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseInserts(sql) {
  const inserts = [];
  const lines = sql.split('\n');

  for (const line of lines) {
    if (!line.trim().startsWith('INSERT INTO')) continue;

    // Match: INSERT INTO general_majors (cip_code, major_title, major_summary, family_label) VALUES ('...', '...', '...', '...');
    const match = line.match(/VALUES \('([^']+)', '([^']+)', '(.+?)', '([^']+)'\);/);
    if (match) {
      inserts.push({
        cip_code: match[1],
        major_title: match[2].replace(/''/g, "'"),
        major_summary: match[3].replace(/''/g, "'"),
        family_label: match[4]
      });
    }
  }

  return inserts;
}

async function loadData() {
  console.log('Reading SQL file...');
  const sql = readFileSync('./supabase/migrations/cip_majors.sql', 'utf-8');

  console.log('Parsing INSERT statements...');
  const inserts = parseInserts(sql);

  console.log(`\nParsed data:`);
  console.log(`- general_majors: ${inserts.length} rows`);

  const batchSize = 500;

  console.log('\n=== Loading general_majors ===');
  for (let i = 0; i < inserts.length; i += batchSize) {
    const batch = inserts.slice(i, Math.min(i + batchSize, inserts.length));
    const { error } = await supabase.from('general_majors').insert(batch);

    if (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
    } else {
      console.log(`Loaded ${Math.min(i + batchSize, inserts.length)}/${inserts.length}`);
    }
  }

  console.log('\n=== Load Complete ===');
}

loadData().catch(console.error);
