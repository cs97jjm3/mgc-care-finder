#!/usr/bin/env node

/**
 * Test Script for MGC Care Finder HTTP API
 * Tests all 19 endpoints to verify they work correctly
 */

const BASE_URL = 'http://localhost:3000';

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

async function test(name, url, expectedStatus = 200, minResults = 0) {
  try {
    console.log(`${BLUE}Testing:${RESET} ${name}`);
    console.log(`  ${url}`);
    
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}${url}`);
    const duration = Date.now() - startTime;
    
    if (response.status !== expectedStatus) {
      console.log(`  ${RED}✗ FAIL${RESET} - Expected ${expectedStatus}, got ${response.status}`);
      failed++;
      return;
    }
    
    const data = await response.json();
    
    // Check for minimum results if specified
    if (minResults > 0) {
      const resultCount = data.count || data.total || data.locations?.length || 0;
      if (resultCount < minResults) {
        console.log(`  ${YELLOW}⚠ WARNING${RESET} - Expected at least ${minResults} results, got ${resultCount}`);
      }
    }
    
    console.log(`  ${GREEN}✓ PASS${RESET} - ${duration}ms`);
    passed++;
    
  } catch (error) {
    console.log(`  ${RED}✗ FAIL${RESET} - ${error.message}`);
    failed++;
  }
  console.log('');
}

async function runTests() {
  console.log(`\n${BLUE}========================================${RESET}`);
  console.log(`${BLUE}MGC Care Finder API Test Suite${RESET}`);
  console.log(`${BLUE}========================================${RESET}\n`);
  
  console.log(`${YELLOW}Testing against: ${BASE_URL}${RESET}\n`);
  
  // ===== Core Search Endpoints =====
  console.log(`${BLUE}=== Core Search Endpoints (10) ===${RESET}\n`);
  
  await test(
    '1. Health Check',
    '/health'
  );
  
  await test(
    '2. Universal Provider Search (Northern Ireland) ⭐ NEW',
    '/api/providers/search?postcode=BT1&country=ni&maxResults=10',
    200,
    1
  );
  
  await test(
    '3. Universal Provider Search (Scotland)',
    '/api/providers/search?postcode=G1&maxResults=10',
    200,
    1
  );
  
  await test(
    '4. CQC Search (Cambridgeshire)',
    '/api/search/cqc?localAuthority=Cambridgeshire&careHome=Y&perPage=5',
    200,
    1
  );
  
  await test(
    '5. Postcode Search',
    '/api/search/postcode?postcode=PE13+2PR&careHome=Y',
    200
  );
  
  await test(
    '6. Radius Search',
    '/api/search/radius?postcode=PE13+2PR&miles=5&careHome=Y',
    200,
    1
  );
  
  await test(
    '7. Provider Details',
    '/api/provider/1-123039495',
    200
  );
  
  await test(
    '8. Scotland Search',
    '/api/search/scotland?councilArea=Edinburgh&maxResults=5',
    200,
    1
  );
  
  await test(
    '9. Northern Ireland Search',
    '/api/search/northern-ireland?district=Belfast&maxResults=5',
    200,
    1
  );
  
  await test(
    '10. Ireland Search',
    '/api/search/ireland?county=Dublin&maxResults=5',
    200,
    1
  );
  
  await test(
    '11. Postcode Lookup',
    '/api/postcode/PE13%202PR',
    200
  );
  
  // ===== Market Intelligence Endpoints =====
  console.log(`${BLUE}=== Market Intelligence Endpoints (8) ===${RESET}\n`);
  
  await test(
    '12. Outstanding Homes (London)',
    '/api/search/outstanding?region=London&maxResults=10',
    200,
    1
  );
  
  await test(
    '13. At-Risk Homes',
    '/api/search/at-risk?rating=Inadequate&maxResults=10',
    200
  );
  
  await test(
    '14. Recent Inspections (30 days)',
    '/api/search/recent-inspections?days=30&maxResults=10',
    200
  );
  
  await test(
    '15. Large Capacity Homes (50+ beds)',
    '/api/search/large-homes?minBeds=50&region=London&maxResults=10',
    200
  );
  
  await test(
    '16. New Registrations (6 months)',
    '/api/search/new-registrations?months=6&maxResults=10',
    200
  );
  
  await test(
    '17. Provider Portfolio (HC-One)',
    '/api/provider/portfolio?providerName=HC-One',
    200
  );
  
  await test(
    '18. Service Analysis (Dementia)',
    '/api/analyze/services?serviceType=Dementia&region=London&maxResults=10',
    200
  );
  
  await test(
    '19. Compare Regions',
    '/api/compare/regions',
    200
  );
  
  await test(
    '20. Compare Authorities',
    '/api/compare/authorities?authorities=Cambridgeshire,Peterborough',
    200
  );
  
  // ===== Results Summary =====
  console.log(`${BLUE}========================================${RESET}`);
  console.log(`${BLUE}Test Results${RESET}`);
  console.log(`${BLUE}========================================${RESET}\n`);
  
  const total = passed + failed;
  const passRate = ((passed / total) * 100).toFixed(1);
  
  console.log(`Total Tests:  ${total}`);
  console.log(`${GREEN}Passed:       ${passed}${RESET}`);
  console.log(`${RED}Failed:       ${failed}${RESET}`);
  console.log(`Pass Rate:    ${passRate}%\n`);
  
  if (failed === 0) {
    console.log(`${GREEN}🎉 All tests passed! API is working correctly.${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${RED}⚠️  Some tests failed. Check the output above.${RESET}\n`);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    console.log(`${YELLOW}Checking if server is running...${RESET}`);
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      console.log(`${GREEN}✓ Server is running${RESET}\n`);
      return true;
    }
  } catch (error) {
    console.log(`${RED}✗ Server is not running at ${BASE_URL}${RESET}`);
    console.log(`${YELLOW}Please start the server with: npm start${RESET}\n`);
    process.exit(1);
  }
}

// Run tests
(async () => {
  await checkServer();
  await runTests();
})();
