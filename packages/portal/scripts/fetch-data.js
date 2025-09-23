#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const BACKEND_ENDPOINT = 'https://portal-data.arbitrum.io';

const filesToFetch = [
  '__auto-generated-projects.json',
  '__auto-generated-categories.json',
  '__auto-generated-subcategories.json',
  '__auto-generated-orbitChains.json',
  '__auto-generated-stats.json',
  '__auto-generated-categories-to-subcategories.json',
  '__auto-generated-ecosystem-missions.json',
  '__auto-generated-chain-metrics.json',
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(
              new Error(`Failed to parse JSON from ${url}: ${error.message}`),
            );
          }
        });
      })
      .on('error', (error) => {
        reject(new Error(`Failed to fetch ${url}: ${error.message}`));
      });
  });
}

async function fetchAllData() {
  console.log('🔄 Fetching data from', BACKEND_ENDPOINT);

  const publicDir = path.resolve(__dirname, '..', '..', 'app', 'public');

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const fetchPromises = filesToFetch.map(async (filename) => {
    const url = `${BACKEND_ENDPOINT}/${filename}`;
    const filePath = path.join(publicDir, filename);

    try {
      console.log(`📥 Fetching ${filename}...`);
      const data = await fetchJson(url);

      // Write the JSON file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✅ Saved ${filename}`);
    } catch (error) {
      console.error(`❌ Error fetching ${filename}:`, error.message);
      process.exit(1);
    }
  });

  await Promise.all(fetchPromises);

  console.log('🎉 All data fetched successfully!');
}

// Run the script
fetchAllData().catch((error) => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});
