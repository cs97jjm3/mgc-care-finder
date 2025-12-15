#!/usr/bin/env node

/**
 * Data Update Script for UK & Ireland Healthcare Research MCP
 * 
 * All data sources require manual download (they block automated requests).
 * This script just updates the timestamps after you've downloaded the files.
 * 
 * Usage: 
 * 1. Download the files manually (see instructions below)
 * 2. Run: npm run update-data
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

console.log('UK & Ireland Healthcare Research MCP - Data Update\n');
console.log('='.repeat(60));
console.log('\nAll data sources require MANUAL download (sites block scripts).\n');

console.log('='.repeat(60));
console.log('DOWNLOAD INSTRUCTIONS:');
console.log('='.repeat(60));

console.log('\n1. IRELAND (HIQA):');
console.log('   URL: https://www.hiqa.ie/areas-we-work/older-peoples-services');
console.log('   Click: "Download the Register" button');
console.log('   Save as: data/hiqa.csv');

console.log('\n2. NORTHERN IRELAND (RQIA):');
console.log('   URL: https://www.rqia.org.uk/register/');
console.log('   Download: "Full Register of Services" (Excel file)');
console.log('   Save as: data/rqia.xlsx');

console.log('\n3. SCOTLAND (Care Inspectorate):');
console.log('   URL: https://www.careinspectorate.com/index.php/publications-statistics/44-public/93-datastore');
console.log('   Download: "Datastore (as at DD Month YYYY) CSV"');
console.log('   Save as: data/scotland.csv');

console.log('\n' + '='.repeat(60));

// Check what files exist and update timestamps
const timestampFile = path.join(DATA_DIR, 'timestamps.json');
const timestamps = {};

const files = {
  hiqa: 'hiqa.csv',
  rqia: 'rqia.xlsx', 
  scotland: 'scotland.csv'
};

console.log('\nCHECKING FILES:');

for (const [key, filename] of Object.entries(files)) {
  const filePath = path.join(DATA_DIR, filename);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(1);
    timestamps[key] = stats.mtime.toISOString();
    console.log(`  ✅ ${filename} (${size} KB, modified: ${stats.mtime.toLocaleDateString()})`);
  } else {
    console.log(`  ❌ ${filename} - NOT FOUND`);
  }
}

fs.writeFileSync(timestampFile, JSON.stringify(timestamps, null, 2));

console.log('\n' + '='.repeat(60));
console.log('Timestamps updated.');
console.log('\nNext steps:');
console.log('  1. Download any missing files using the URLs above');
console.log('  2. Run: npm run build');
console.log('  3. Run: npm run pack');
console.log('  4. Restart Claude Desktop');
console.log('='.repeat(60));
