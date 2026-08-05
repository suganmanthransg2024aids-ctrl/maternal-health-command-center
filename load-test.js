import fs from 'fs';

const BASE_URL = process.argv[2] || 'http://localhost:8001';
const DURATION_MS = 60 * 1000; // 60 seconds

// Endpoints mimicking standard user flow
const ENDPOINTS = [
  { method: 'GET', path: '/health' },
  { method: 'GET', path: '/api/stats?role=admin' },
  { method: 'GET', path: '/api/patients?role=admin' },
  { method: 'GET', path: '/api/alerts?role=admin' },
  { method: 'GET', path: '/api/calls?role=admin' },
  { method: 'GET', path: '/api/sync-status' }
];

const results = {
  totalRequests: 0,
  success: 0,
  errors: 0,
  rateLimited: 0,
  latencies: [],
  latenciesByEndpoint: {},
  statusCodes: {},
  syncTriggeredAt: null,
  duringSync: { total: 0, latencies: [] }
};

let isTestRunning = true;
let isSyncing = false; // tracked locally for the sync window

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function simulateUser(userId) {
  while (isTestRunning) {
    // Pick a random endpoint
    const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
    const url = `${BASE_URL}${endpoint.path}`;
    
    const start = Date.now();
    try {
      const res = await fetch(url, { method: endpoint.method });
      const duration = Date.now() - start;
      
      results.totalRequests++;
      results.statusCodes[res.status] = (results.statusCodes[res.status] || 0) + 1;
      
      if (res.status === 429) {
        results.rateLimited++;
      } else if (res.status >= 500) {
        results.errors++;
      } else {
        results.success++;
      }

      // Record latencies
      results.latencies.push(duration);
      if (isSyncing) results.duringSync.latencies.push(duration);
      if (isSyncing) results.duringSync.total++;
      
      if (!results.latenciesByEndpoint[endpoint.path]) results.latenciesByEndpoint[endpoint.path] = [];
      results.latenciesByEndpoint[endpoint.path].push(duration);

    } catch (e) {
      results.totalRequests++;
      results.errors++;
      results.statusCodes['FETCH_ERROR'] = (results.statusCodes['FETCH_ERROR'] || 0) + 1;
    }
    
    // Think time (user pauses between 200ms and 1500ms before next click)
    await sleep(200 + Math.random() * 1300);
  }
}

async function simulateRateLimitHammer() {
  const url = `${BASE_URL}/api/sync-status`;
  while (isTestRunning) {
    const start = Date.now();
    try {
      const res = await fetch(url);
      const duration = Date.now() - start;
      
      results.totalRequests++;
      results.statusCodes[res.status] = (results.statusCodes[res.status] || 0) + 1;
      
      if (res.status === 429) {
        results.rateLimited++;
      } else if (res.status >= 500) {
        results.errors++;
      } else {
        results.success++;
      }
    } catch (e) {
      results.totalRequests++;
      results.errors++;
    }
    // Hammer with barely any delay
    await sleep(5);
  }
}

async function triggerSync() {
  console.log('[LOAD TEST] Triggering background Excel sync (POST /api/refresh)...');
  results.syncTriggeredAt = Date.now();
  isSyncing = true;
  
  try {
    const res = await fetch(`${BASE_URL}/api/refresh`, { method: 'POST' });
    if (!res.ok) console.log(`[LOAD TEST] Sync trigger returned ${res.status}`);
  } catch (e) {
    console.log(`[LOAD TEST] Sync trigger fetch failed: ${e.message}`);
  }
  
  isSyncing = false;
  console.log('[LOAD TEST] Background sync completed.');
}

function calculatePercentiles(arr) {
  if (arr.length === 0) return { min: 0, max: 0, avg: 0, p95: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(sum / sorted.length),
    p95: sorted[Math.floor(sorted.length * 0.95)]
  };
}

async function run() {
  console.log(`Starting load test against ${BASE_URL} for ${DURATION_MS / 1000}s`);
  console.log(`Simulating 20 regular users + 1 rate-limit hammer`);

  // Start regular users
  const users = Array.from({ length: 20 }).map((_, i) => simulateUser(i));
  // Start rate hammer
  const hammer = simulateRateLimitHammer();
  
  // Schedule a sync trigger mid-test
  setTimeout(triggerSync, 10 * 1000); // 10 seconds in
  
  // Wait for test duration
  await sleep(DURATION_MS);
  
  isTestRunning = false;
  
  // Wait a moment for final requests to finish
  await sleep(2000);
  
  console.log('--- TEST COMPLETE ---\n');
  
  const overall = calculatePercentiles(results.latencies);
  const syncWindow = calculatePercentiles(results.duringSync.latencies);
  
  const report = {
    targetUrl: BASE_URL,
    durationSeconds: DURATION_MS / 1000,
    totalRequests: results.totalRequests,
    success: results.success,
    rateLimited: results.rateLimited,
    errors: results.errors,
    statusCodes: results.statusCodes,
    overallLatenciesMs: overall,
    duringSyncLatenciesMs: syncWindow,
    endpointLatenciesMs: Object.fromEntries(
      Object.entries(results.latenciesByEndpoint).map(([path, lats]) => [path, calculatePercentiles(lats)])
    )
  };
  
  fs.writeFileSync('load-test-results.json', JSON.stringify(report, null, 2));
  
  console.log('--- LOAD TEST SUMMARY ---');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Total Requests: ${results.totalRequests}`);
  console.log(`Success (2xx/3xx): ${results.success} | Rate Limited (429): ${results.rateLimited} | Errors (5xx): ${results.errors}`);
  console.log(`Status Codes:`, results.statusCodes);
  console.log('\nLatencies (overall):');
  console.log(`  Avg: ${overall.avg}ms | p95: ${overall.p95}ms | Max: ${overall.max}ms`);
  
  console.log('\nLatencies (during background Excel sync):');
  console.log(`  Avg: ${syncWindow.avg}ms | p95: ${syncWindow.p95}ms | Max: ${syncWindow.max}ms`);
  
  if (syncWindow.p95 > overall.p95 * 2) {
    console.log(`  => WARNING: p95 latency degraded significantly during sync (${overall.p95}ms -> ${syncWindow.p95}ms)`);
  } else {
    console.log(`  => PASS: Latency remained stable during background sync worker thread processing.`);
  }

  if (results.errors > 0) {
    console.log(`  => WARNING: Encountered ${results.errors} error(s)! Check logs for 502/500s.`);
  } else {
    console.log(`  => PASS: 0 server errors (No 502s!).`);
  }
  
  if (results.rateLimited > 0) {
    console.log(`  => PASS: Rate limiter actively blocked ${results.rateLimited} aggressive requests.`);
  } else {
    console.log(`  => WARNING: Rate limiter did not engage. The hammer user might not have hit the threshold or the limit is too high.`);
  }
  
  console.log('\nDetailed results saved to load-test-results.json');
}

run().catch(console.error);
