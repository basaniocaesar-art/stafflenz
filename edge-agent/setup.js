#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// LenzAI Edge Agent — Interactive Setup
// Run: node setup.js
// ═══════════════════════════════════════════════════════════════════════════════

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  LenzAI Edge Agent Setup');
  console.log('═══════════════════════════════════════════════\n');

  // Check if config already exists
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    const overwrite = await ask('config.json already exists. Overwrite? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('Enter your LenzAI cloud details:\n');

  const api_url = (await ask('LenzAI URL [https://www.lenzai.com]: ')).trim() || 'https://www.lenzai.com';
  const agent_key = (await ask('Agent Key (from admin panel): ')).trim();
  const client_id = (await ask('Client ID (from admin panel): ')).trim();
  const supabase_url = (await ask('Supabase URL: ')).trim();
  const supabase_key = (await ask('Supabase Service Role Key: ')).trim();

  console.log('\nEnter your DVR/NVR details:\n');

  const dvr_ip = (await ask('DVR IP address [192.168.1.64]: ')).trim() || '192.168.1.64';
  const dvr_port = parseInt((await ask('DVR HTTP port [80]: ')).trim() || '80');
  const dvr_username = (await ask('DVR username [admin]: ')).trim() || 'admin';
  const dvr_password = (await ask('DVR password: ')).trim();
  const max_channels = parseInt((await ask('Max camera channels [8]: ')).trim() || '8');
  const interval_min = parseInt((await ask('Scan interval in minutes [5]: ')).trim() || '5');

  const config = {
    agent_key,
    api_url,
    supabase_url,
    supabase_key,
    client_id,
    dvr_ip,
    dvr_port,
    dvr_username,
    dvr_password,
    max_channels,
    interval_ms: interval_min * 60 * 1000,
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`\nConfig saved to ${configPath}`);

  // Test DVR connection
  console.log('\nTesting DVR connection...');
  try {
    const http = require('http');
    const testUrl = `http://${dvr_ip}:${dvr_port}/ISAPI/System/deviceInfo`;
    await new Promise((resolve, reject) => {
      const req = http.get(testUrl, { timeout: 5000 }, (res) => {
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
    console.log('DVR is reachable!');
  } catch (e) {
    console.log(`Warning: Could not reach DVR at ${dvr_ip}:${dvr_port} — ${e.message}`);
    console.log('Make sure this device is on the same network as the DVR.');
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  Setup complete! Start the agent with:');
  console.log('  npm start');
  console.log('═══════════════════════════════════════════════\n');

  rl.close();
}

main().catch(console.error);
