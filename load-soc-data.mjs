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
  const inserts = {
    soc_basics: [],
    soc_related: [],
    soc_ri: []
  };

  const lines = sql.split('\n');

  for (const line of lines) {
    if (!line.trim().startsWith('INSERT INTO')) continue;

    if (line.includes('soc_basics')) {
      const match = line.match(/VALUES \('([^']+)', '([^']+)', '(.+)'\);/);
      if (match) {
        inserts.soc_basics.push({
          soc_code: match[1],
          title: match[2].replace(/''/g, "'"),
          description: match[3].replace(/''/g, "'")
        });
      }
    } else if (line.includes('soc_related')) {
      const match = line.match(/VALUES \('([^']+)', '([^']+)', '([^']+)'\);/);
      if (match) {
        inserts.soc_related.push({
          soc_code: match[1],
          related_soc_code: match[2],
          relatedness_tier: match[3]
        });
      }
    } else if (line.includes('soc_ri')) {
      const match = line.match(/VALUES \('([^']+)', ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+)\);/);
      if (match) {
        inserts.soc_ri.push({
          soc_code: match[1],
          realistic: parseFloat(match[2]),
          investigative: parseFloat(match[3]),
          artistic: parseFloat(match[4]),
          social: parseFloat(match[5]),
          enterprising: parseFloat(match[6]),
          conventional: parseFloat(match[7])
        });
      }
    }
  }

  return inserts;
}

async function loadData() {
  console.log('Reading SQL file...');
  const sql = readFileSync('./supabase/migrations/soc_data.sql', 'utf-8');

  console.log('Parsing INSERT statements...');
  const inserts = parseInserts(sql);

  console.log(`\nParsed data:`);
  console.log(`- soc_basics: ${inserts.soc_basics.length} rows`);
  console.log(`- soc_related: ${inserts.soc_related.length} rows`);
  console.log(`- soc_ri: ${inserts.soc_ri.length} rows`);

  const batchSize = 500;

  // Load soc_basics
  console.log('\n=== Loading soc_basics ===');
  for (let i = 0; i < inserts.soc_basics.length; i += batchSize) {
    const batch = inserts.soc_basics.slice(i, Math.min(i + batchSize, inserts.soc_basics.length));
    const { error } = await supabase.from('soc_basics').insert(batch);

    if (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
    } else {
      console.log(`Loaded ${Math.min(i + batchSize, inserts.soc_basics.length)}/${inserts.soc_basics.length}`);
    }
  }

  // Load soc_related
  console.log('\n=== Loading soc_related ===');
  for (let i = 0; i < inserts.soc_related.length; i += batchSize) {
    const batch = inserts.soc_related.slice(i, Math.min(i + batchSize, inserts.soc_related.length));
    const { error } = await supabase.from('soc_related').insert(batch);

    if (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
    } else {
      console.log(`Loaded ${Math.min(i + batchSize, inserts.soc_related.length)}/${inserts.soc_related.length}`);
    }
  }

  // Load soc_ri
  console.log('\n=== Loading soc_ri ===');
  for (let i = 0; i < inserts.soc_ri.length; i += batchSize) {
    const batch = inserts.soc_ri.slice(i, Math.min(i + batchSize, inserts.soc_ri.length));
    const { error } = await supabase.from('soc_ri').insert(batch);

    if (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
    } else {
      console.log(`Loaded ${Math.min(i + batchSize, inserts.soc_ri.length)}/${inserts.soc_ri.length}`);
    }
  }

  console.log('\n=== Load Complete ===');
}

loadData().catch(console.error);
