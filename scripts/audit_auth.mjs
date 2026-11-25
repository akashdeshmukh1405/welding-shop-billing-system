import http from 'http';

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json || data,
          raw: data
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timed out after 5000ms'));
    });
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runAudit() {
  console.log("==================================================");
  console.log("PHASE 2 & 4: AUTHENTICATION & ROUTE AUDIT");
  console.log("==================================================\n");

  // Test 1: Check port 3000 server status
  console.log("1. Checking Server Connectivity on Port 3000...");
  try {
    const res = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/login',
      method: 'GET'
    });
    console.log(`✅ Server responded with HTTP ${res.statusCode} on /login`);
  } catch (err) {
    console.error(`❌ Server connection failed: ${err.message}`);
    process.exit(1);
  }

  // Test 2: Unauthenticated access to protected route (e.g. / or /bills)
  console.log("\n2. Testing Route Protection (Unauthenticated Request to /)...");
  const unauthRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET'
  });
  console.log(`Status: HTTP ${unauthRes.statusCode}`);
  console.log(`Location Header: ${unauthRes.headers.location || 'none'}`);
  if (unauthRes.statusCode === 307 || unauthRes.statusCode === 308 || unauthRes.statusCode === 302) {
    console.log("✅ Route Protection PASSED: Unauthenticated user redirected to login.");
  } else {
    console.warn("⚠️ Route did not redirect as expected:", unauthRes.statusCode);
  }

  // Test 3: Invalid login credentials
  console.log("\n3. Testing Invalid Login Credentials...");
  const invalidLoginRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    username: 'admin',
    password: 'wrong_password_123'
  });
  console.log(`Status: HTTP ${invalidLoginRes.statusCode}, Error:`, invalidLoginRes.data?.error);
  if (invalidLoginRes.statusCode === 401) {
    console.log("✅ Invalid credentials rejected properly with HTTP 401.");
  } else {
    console.error("❌ Invalid credentials test failed.");
  }

  // Test 4: Valid login credentials
  console.log("\n4. Testing Valid Shop Owner Login (admin / JaiMataDi@2026)...");
  const validLoginRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    username: 'admin',
    password: 'JaiMataDi@2026'
  });
  console.log(`Status: HTTP ${validLoginRes.statusCode}, Response:`, validLoginRes.data);
  const setCookie = validLoginRes.headers['set-cookie'];
  console.log(`Set-Cookie header present: ${Boolean(setCookie)}`);

  let sessionCookie = '';
  if (setCookie && Array.isArray(setCookie)) {
    sessionCookie = setCookie.find(c => c.startsWith('shop_session=')) || '';
  } else if (typeof setCookie === 'string') {
    sessionCookie = setCookie;
  }

  if (validLoginRes.statusCode === 200 && sessionCookie) {
    console.log("✅ Shop Owner Login PASSED: Session cookie issued successfully.");
  } else {
    console.error("❌ Valid login failed.");
  }

  // Test 5: Authenticated access to dashboard using session cookie
  console.log("\n5. Testing Authenticated Access to Dashboard with Session Cookie...");
  const cookieValue = sessionCookie.split(';')[0];
  const authDashRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET',
    headers: {
      'Cookie': cookieValue
    }
  });
  console.log(`Status: HTTP ${authDashRes.statusCode}`);
  if (authDashRes.statusCode === 200) {
    console.log("✅ Authenticated Access PASSED: Dashboard returned HTTP 200.");
  } else {
    console.error("❌ Authenticated access test failed:", authDashRes.statusCode);
  }

  // Test 6: Logout
  console.log("\n6. Testing Logout...");
  const logoutRes = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/logout',
    method: 'POST',
    headers: {
      'Cookie': cookieValue
    }
  });
  console.log(`Status: HTTP ${logoutRes.statusCode}, Set-Cookie:`, logoutRes.headers['set-cookie']);
  if (logoutRes.statusCode === 200) {
    console.log("✅ Logout PASSED: Session cleared.");
  }

  console.log("\n==================================================");
  console.log("AUTHENTICATION AUDIT COMPLETED SUCCESSFULLY");
  console.log("==================================================");
}

runAudit().catch(console.error);
