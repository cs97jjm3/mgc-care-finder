# API Endpoints Quick Reference

Quick reference for all 19 MGC Care Finder HTTP API endpoints.

**Base URL:** `http://localhost:3000`

---

## Core Search Endpoints

### 1. Health Check
```
GET /health
```
Check API status and view loaded data counts.

### 2. **Universal Provider Search** ⭐ NEW
```
GET /api/providers/search?postcode=BT1&country=ni&maxResults=20
```
Search across all UK/Ireland regions by postcode. Auto-detects region or use `country` parameter to force specific region.

**Parameters:**
- `postcode` (required) - Any UK/Ireland postcode
- `country` (optional) - Force region: `ni`, `scotland`, `ireland`, `england`
- `maxResults` (optional) - Default: 20

**Returns:** Unified provider data across all four countries.

### 3. Radius Search (England)
```
GET /api/search/radius?postcode=PE13+2PR&miles=10&careHome=Y&rating=Good
```
Find providers within X miles of a postcode. **Key feature** of the HTTP API.

### 4. Search CQC (England)
```
GET /api/search/cqc?localAuthority=Cambridgeshire&careHome=Y&rating=Good
```
Search by local authority or region in England.

### 5. Search by Postcode (England)
```
GET /api/search/postcode?postcode=PE13+2PR&careHome=Y
```
Find providers in same local authority and postcode area.

### 6. Get Provider Details (England)
```
GET /api/provider/1-123039495
```
Get full details for specific CQC location.

### 7. Search Scotland
```
GET /api/search/scotland?councilArea=Edinburgh&serviceType=Care+Home
```
Search Care Inspectorate registered services.

### 8. Search Northern Ireland
```
GET /api/search/northern-ireland?district=Belfast&serviceType=Nursing+Home
```
Search RQIA registered services.

### 9. Search Ireland
```
GET /api/search/ireland?county=Dublin&maxResults=10
```
Search HIQA registered nursing homes.

### 10. Postcode Lookup
```
GET /api/postcode/PE13%202PR
```
Get coordinates and administrative data for any UK postcode.

---

## Market Intelligence Endpoints

### 11. Outstanding Homes
```
GET /api/search/outstanding?region=London&maxResults=50
```
All Outstanding-rated care homes, optionally grouped by region.

### 12. At-Risk Homes
```
GET /api/search/at-risk?rating=Inadequate&region=London
```
Homes rated "Requires improvement" or "Inadequate".

### 13. Recent Inspections
```
GET /api/search/recent-inspections?days=30&region=London
```
Homes inspected within last X days.

### 14. Large Capacity Homes
```
GET /api/search/large-homes?minBeds=100&rating=Outstanding
```
Find homes with minimum bed count.

### 15. New Registrations
```
GET /api/search/new-registrations?months=6&region=London
```
Track new market entrants.

### 16. Provider Portfolio
```
GET /api/provider/portfolio?providerName=Barchester
```
Analyze entire operator performance.

### 17. Service Type Analysis
```
GET /api/analyze/services?serviceType=Dementia&rating=Outstanding
```
Find homes offering specific care services.

### 18. Compare Regions
```
GET /api/compare/regions
```
Rating distribution across all English regions.

### 19. Compare Local Authorities
```
GET /api/compare/authorities?authorities=Cambridgeshire,Peterborough
```
Compare statistics across multiple local authorities.

---

## Quick Tips

**Fast searches** (< 1 sec):
- Health, Scotland, NI, Ireland, Postcode Lookup

**Moderate** (2-5 sec):
- CQC search, Provider details

**Slow** (10-30 sec):
- Radius search (many API calls)

**Best for multi-country:**
- Use `/api/providers/search` with different postcodes

**Best for market analysis:**
- Outstanding, At-Risk, Compare endpoints

**Best for local search:**
- Radius search with your postcode

---

See [API-DOCS.md](API-DOCS.md) for complete parameter details and response formats.
