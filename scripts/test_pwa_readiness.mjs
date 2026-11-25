import http from 'http';
import fs from 'fs';

const PORT = 3000;

function httpRequest(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: 'localhost', port: PORT, path }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    }).on('error', reject);
  });
}

async function verifyPwaReadiness() {
  console.log('================================================================================');
  console.log('📱 PWA & PWABUILDER READINESS VERIFICATION');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${detail}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail}`);
      failed++;
    }
  }

  // 1. Verify /manifest.json is accessible
  console.log('1. Checking Manifest Availability & MIME Type...');
  const manifestRes = await httpRequest('/manifest.json');
  assert(manifestRes.statusCode === 200, 'GET /manifest.json returns HTTP 200', `(got ${manifestRes.statusCode})`);
  
  let manifest = {};
  try {
    manifest = JSON.parse(manifestRes.body);
  } catch (e) {
    assert(false, 'Manifest is valid JSON', e.message);
  }

  // 2. Verify Manifest Fields required by PWABuilder
  console.log('\n2. Validating PWABuilder Required Fields in Manifest...');
  assert(manifest.name === 'Jai Mata Di Billing System', `App Name is "Jai Mata Di Billing System"`, `(got "${manifest.name}")`);
  assert(manifest.short_name === 'Jai Mata Di Billing', `Short Name is "Jai Mata Di Billing"`, `(got "${manifest.short_name}")`);
  assert(manifest.start_url === '/', 'Start URL is "/"', `(got "${manifest.start_url}")`);
  assert(manifest.display === 'standalone', 'Display mode is "standalone"', `(got "${manifest.display}")`);
  assert(manifest.theme_color === '#0f172a', 'Theme color is "#0f172a"', `(got "${manifest.theme_color}")`);
  assert(manifest.background_color === '#0f172a', 'Background color is "#0f172a"', `(got "${manifest.background_color}")`);
  assert(manifest.orientation === 'portrait', 'Orientation is portrait', `(got "${manifest.orientation}")`);

  // 3. Verify Icons in Manifest
  console.log('\n3. Validating PWA Icons in Manifest...');
  const icons = manifest.icons || [];
  const has192 = icons.some(i => i.sizes === '192x192' && i.src.includes('192'));
  const has512 = icons.some(i => i.sizes === '512x512' && i.src.includes('512') && i.purpose !== 'maskable');
  const hasMaskable = icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable');

  assert(has192, 'Manifest contains 192x192 standard icon');
  assert(has512, 'Manifest contains 512x512 standard icon');
  assert(hasMaskable, 'Manifest contains 512x512 maskable icon for Android adaptive icons');

  // 4. Verify Icons HTTP Accessibility
  console.log('\n4. Checking Icon Files HTTP Accessibility...');
  for (const icon of icons) {
    const res = await httpRequest(icon.src);
    assert(res.statusCode === 200, `Icon accessible: ${icon.src}`, `(HTTP ${res.statusCode}, Content-Type: ${res.headers['content-type']})`);
  }

  // 5. Verify /sw.js is accessible
  console.log('\n5. Checking Service Worker Availability & Security...');
  const swRes = await httpRequest('/sw.js');
  assert(swRes.statusCode === 200, 'GET /sw.js returns HTTP 200', `(got ${swRes.statusCode})`);
  assert(swRes.body.includes('shouldBypassCache'), 'Service worker contains security bypass for sensitive endpoints');
  assert(swRes.body.includes("pathname.startsWith('/api/')"), 'Service worker strictly bypasses all /api/ endpoints');
  assert(swRes.body.includes('CACHE_NAME'), 'Service worker declares standard cache container');

  // 6. Verify HTML links manifest
  console.log('\n6. Checking HTML Page Manifest & Meta Tags Linkage...');
  const htmlRes = await httpRequest('/');
  assert(htmlRes.statusCode === 200 || htmlRes.statusCode === 307, 'Root page accessible', `(HTTP ${htmlRes.statusCode})`);
  // Check login page if redirected
  const pageRes = htmlRes.statusCode === 307 ? await httpRequest('/login') : htmlRes;
  assert(pageRes.body.includes('/manifest.json'), 'HTML page includes link to manifest.json');
  assert(pageRes.body.includes('theme-color'), 'HTML page includes theme-color meta tag');

  console.log('\n================================================================================');
  console.log(`PWA VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================================');

  if (failed > 0) process.exit(1);
}

verifyPwaReadiness().catch(err => {
  console.error('Error during PWA test:', err);
  process.exit(1);
});
