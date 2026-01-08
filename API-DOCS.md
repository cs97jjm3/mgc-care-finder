# API Documentation

Complete reference for all Care Provider Finder HTTP API endpoints.

## Base URL

```
http://localhost:3000
```

All endpoints are relative to this base URL.

## Response Format

All endpoints return JSON. Successful responses have HTTP status 200. Errors return appropriate status codes (400, 404, 500) with error messages in JSON format:

```json
{
  "error": "Error message description"
}
```

## Authentication

None required. This is a local API for personal/internal use only.

---

## Endpoints

### Health Check

Check if the API is running and view loaded data counts.

**Endpoint:** `GET /health`

**Parameters:** None

**Response:**
```json
{
  "status": "ok",
  "version": "2.0.0",
  "dataLoaded": {
    "scotland": 10645,
    "rqia": 1526,
    "hiqa": 542
  }
}
```

**Status Codes:**
- `200` - OK

---

### Radius Search (England)

Find care providers within a specified radius of a UK postcode. **This is the key feature of the HTTP API.**

**Endpoint:** `GET /api/search/radius`

**Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `postcode` | string | Yes | UK postcode | `PE13 2PR` |
| `miles` | number | No | Radius in miles (default: 5) | `10` |
| `careHome` | string | No | Y=care homes only, N=all services | `Y` |
| `rating` | string | No | Filter by CQC rating | `Good` |
| `maxResults` | number | No | Max results to return (default: 50) | `20` |

**Rating Values:**
- `Outstanding`
- `Good`
- `Requires improvement`
- `Inadequate`

**Example Request:**
```
GET /api/search/radius?postcode=PE13+2PR&miles=10&careHome=Y&rating=Good
```

**Example Response:**
```json
{
  "searchPostcode": "PE13 2PR",
  "centerPoint": {
    "latitude": 52.659857,
    "longitude": 0.156993,
    "localAuthority": "Fenland"
  },
  "radiusMiles": 10,
  "count": 6,
  "locations": [
    {
      "locationId": "1-123039495",
      "locationName": "Langley Lodge Residential Home",
      "postalCode": "PE13 2PE",
      "latitude": 52.6621084,
      "longitude": 0.1573108,
      "distance": 0.2,
      "fullAddress": "26 Queens Road, Wisbech",
      
      "rating": "Good",
      "ratingSafe": "Good",
      "ratingEffective": "Good",
      "ratingCaring": "Good",
      "ratingResponsive": "Good",
      "ratingWellLed": "Good",
      
      "phone": "01945582324",
      "website": "www.langley-lodge.co.uk",
      "beds": 20,
      
      "registrationStatus": "Registered",
      "registrationDate": "2010-11-26",
      "lastInspectionDate": "2024-01-15",
      
      "serviceTypes": "Residential homes",
      "specialisms": "Caring for adults over 65 yrs, Dementia",
      
      "providerName": "Langley Lodge Ltd",
      
      "cqcReportUrl": "https://www.cqc.org.uk/location/1-123039495"
    },
    {
      "locationId": "1-10205172843",
      "locationName": "Conifer Lodge",
      "postalCode": "PE13 1LL",
      "latitude": 52.6573303,
      "longitude": 0.1451282,
      "distance": 0.5,
      "fullAddress": "134 North Brink, Wisbech",
      
      "rating": "Outstanding",
      "ratingSafe": "Outstanding",
      "ratingEffective": "Outstanding",
      "ratingCaring": "Outstanding",
      "ratingResponsive": "Outstanding",
      "ratingWellLed": "Outstanding",
      
      "phone": "01945474912",
      "website": "www.activecaregroup.co.uk",
      "beds": 13,
      
      "registrationStatus": "Registered",
      "registrationDate": "2021-03-05",
      "lastInspectionDate": "2022-07-28",
      
      "serviceTypes": "Nursing homes",
      "specialisms": "Caring for adults over 65 yrs, Learning disabilities, Mental health conditions",
      
      "providerName": "Conifer Lodge",
      
      "cqcReportUrl": "https://www.cqc.org.uk/location/1-10205172843"
    }
  ]
}
```

**How it Works:**
1. Looks up postcode coordinates
2. Identifies local authority and neighboring authorities
3. Fetches all care providers from those authorities
4. Gets full details for each location (including ratings, contact info, etc.)
5. Calculates distance from center point to each provider
6. Filters to providers within radius
7. **Smart filtering:** Shows all registered homes + recently deregistered homes (within 3 months) to spot closures
8. Sorts by distance (closest first)
9. Returns top N results

**Response Fields:**

**Location & Distance:**
- `locationId` - CQC unique identifier
- `locationName` - Name of the care home
- `postalCode` - Postcode
- `latitude`, `longitude` - GPS coordinates
- `distance` - Distance in miles from search postcode (1 decimal place)
- `fullAddress` - Street address and town

**Quality Ratings:**
- `rating` - Overall CQC rating (Outstanding, Good, Requires improvement, Inadequate, Not rated)
- `ratingSafe`, `ratingEffective`, `ratingCaring`, `ratingResponsive`, `ratingWellLed` - Breakdown by CQC key question

**Contact & Capacity:**
- `phone` - Main phone number
- `website` - Website URL (if available)
- `beds` - Number of beds

**Status & History:**
- `registrationStatus` - Registered or Deregistered
- `registrationDate` - When first registered with CQC
- `lastInspectionDate` - Most recent inspection

**Services:**
- `serviceTypes` - Type of care provided (e.g., "Residential homes", "Nursing homes")
- `specialisms` - Specific care areas (e.g., "Dementia", "Learning disabilities")

**Provider & Links:**
- `providerName` - Organization that runs the home
- `cqcReportUrl` - Direct link to full CQC inspection report

**Performance:**
- Typically takes 10-30 seconds for 10-mile radius
- Fetches up to 200 providers from multiple authorities
- Makes individual API calls to get coordinates for each

**Status Codes:**
- `200` - OK
- `400` - Invalid postcode or parameters
- `404` - Postcode not found
- `500` - Server error

---

### Search CQC (England)

Search Care Quality Commission registered providers in England by local authority or region.

**Endpoint:** `GET /api/search/cqc`

**Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `localAuthority` | string | No | Local authority name | `Cambridgeshire` |
| `region` | string | No | Region name | `East of England` |
| `careHome` | string | No | Y=care homes, N=other services | `Y` |
| `rating` | string | No | Filter by rating | `Outstanding` |
| `page` | number | No | Page number (default: 1) | `2` |
| `perPage` | number | No | Results per page (default: 20, max: 50) | `30` |

**Common Local Authorities:**
- `Cambridgeshire`
- `Peterborough`
- `East Cambridgeshire`
- `Fenland`
- `Huntingdonshire`
- `South Holland`
- `King's Lynn and West Norfolk`

**Common Regions:**
- `East of England`
- `London`
- `South East`
- `South West`
- `North West`
- `North East`
- `Yorkshire and the Humber`
- `East Midlands`
- `West Midlands`

**Example Request:**
```
GET /api/search/cqc?localAuthority=Cambridgeshire&careHome=Y&rating=Good&perPage=10
```

**Example Response:**
```json
{
  "total": 281,
  "firstPageUri": "/locations?page=1&perPage=10...",
  "page": 1,
  "totalPages": 29,
  "nextPageUri": "/locations?page=2...",
  "perPage": 10,
  "locations": [
    {
      "locationId": "1-123039495",
      "locationName": "Langley Lodge Residential Home",
      "postalCode": "PE13 2PE"
    }
  ]
}
```

**Status Codes:**
- `200` - OK
- `500` - CQC API error

---

### Search by Postcode (England)

Find providers in the same local authority as a postcode, filtered to the same postcode area.

**Endpoint:** `GET /api/search/postcode`

**Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `postcode` | string | Yes | UK postcode | `PE13 2PR` |
| `careHome` | string | No | Y=care homes, N=other services | `Y` |
| `rating` | string | No | Filter by rating | `Good` |
| `perPage` | number | No | Max results (default: 20) | `50` |

**Example Request:**
```
GET /api/search/postcode?postcode=PE13+2PR&careHome=Y
```

**Example Response:**
```json
{
  "total": 0,
  "firstPageUri": "...",
  "page": 1,
  "locations": []
}
```

**Note:** Returns providers in the same postcode area (e.g., "PE13") within the local authority. For broader search, use radius search or local authority search.

**Status Codes:**
- `200` - OK
- `400` - Invalid postcode
- `404` - Postcode not found
- `500` - Server error

---

### Get Provider Details (England)

Get detailed information about a specific CQC registered location.

**Endpoint:** `GET /api/provider/:locationId`

**Path Parameters:**
- `locationId` - CQC location ID (e.g., `1-123039495`)

**Example Request:**
```
GET /api/provider/1-123039495
```

**Example Response:**
```json
{
  "locationId": "1-123039495",
  "providerId": "1-10144819059",
  "name": "Langley Lodge Residential Home",
  "organisationType": "Location",
  "type": "Social Care Org",
  "postalAddressLine1": "26 Queens Road",
  "postalAddressTownCity": "Wisbech",
  "postalAddressCounty": "Cambridgeshire",
  "postalCode": "PE13 2PE",
  "region": "East",
  "localAuthority": "Cambridgeshire",
  "onspdLatitude": 52.6621084,
  "onspdLongitude": 0.1573108,
  "careHome": "Y",
  "registrationStatus": "Registered",
  "registrationDate": "2015-04-01",
  "mainPhoneNumber": "01945123456",
  "numberOfBeds": 30,
  "currentRatings": {
    "overall": { "rating": "Good" },
    "safe": { "rating": "Good" },
    "effective": { "rating": "Good" },
    "caring": { "rating": "Good" },
    "responsive": { "rating": "Good" },
    "wellLed": { "rating": "Good" }
  },
  "lastInspection": {
    "date": "2024-01-15"
  },
  "gacServiceTypes": [
    {
      "name": "Residential homes",
      "description": "Care home service without nursing"
    }
  ],
  "specialisms": [
    { "name": "Caring for adults over 65 yrs" },
    { "name": "Dementia" }
  ]
}
```

**Status Codes:**
- `200` - OK
- `404` - Location not found
- `500` - CQC API error

---

### Search Scotland

Search Care Inspectorate registered services in Scotland.

**Endpoint:** `GET /api/search/scotland`

**Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `councilArea` | string | No | Council area name | `Edinburgh` |
| `serviceType` | string | No | Service type (partial match) | `Care Home` |
| `name` | string | No | Service name (partial match) | `Sunshine` |
| `maxResults` | number | No | Max results (default: 20) | `50` |

**Common Council Areas:**
- `Edinburgh`
- `Glasgow City`
- `Aberdeen City`
- `Dundee City`
- `Highland`
- `Fife`
- `Aberdeenshire`

**Common Service Types:**
- `Care Home Service`
- `Housing Support Service`
- `Support Service`
- `Nurse Agency`

**Example Request:**
```
GET /api/search/scotland?councilArea=Edinburgh&serviceType=Care+Home&maxResults=5
```

**Example Response:**
```json
{
  "count": 5,
  "results": [
    {
      "serviceNumber": "CS2003000123",
      "serviceName": "Sunshine Care Home",
      "serviceType": "Care Home Service",
      "subtype": "Care Home",
      "address": "123 Main Street, Edinburgh",
      "postcode": "EH1 1AA",
      "councilArea": "City of Edinburgh",
      "phone": "0131 123 4567",
      "providerName": "Sunshine Care Ltd",
      "registrationDate": "2015-06-01"
    }
  ]
}
```

**Status Codes:**
- `200` - OK
- `500` - Server error

---

### Search Northern Ireland

Search RQIA registered care services in Northern Ireland.

**Endpoint:** `GET /api/search/northern-ireland`

**Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `district` | string | No | Local government district | `Belfast` |
| `serviceType` | string | No | Service type (partial match) | `Nursing Home` |
| `name` | string | No | Service name (partial match) | `Royal` |
| `maxResults` | number | No | Max results (default: 20) | `30` |

**Common Districts:**
- `Belfast`
- `Derry City and Strabane`
- `Lisburn and Castlereagh`
- `Newry, Mourne and Down`
- `Armagh City, Banbridge and Craigavon`

**Common Service Types:**
- `Nursing Home`
- `Residential Care Home`
- `Domiciliary Care Agency`
- `Day Care Setting`

**Example Request:**
```
GET /api/search/northern-ireland?district=Belfast&serviceType=Nursing+Home
```

**Example Response:**
```json
{
  "count": 12,
  "results": [
    {
      "serviceName": "Royal Care Nursing Home",
      "serviceType": "Nursing Home",
      "address": "45 Royal Avenue",
      "postcode": "BT1 1AA",
      "phone": "028 9012 3456",
      "providerName": "Royal Care Ltd",
      "localGovernmentDistrict": "Belfast",
      "lastInspectionDate": "2024-06-15"
    }
  ]
}
```

**Status Codes:**
- `200` - OK
- `500` - Server error

---

### Search Ireland

Search HIQA registered nursing homes in Ireland.

**Endpoint:** `GET /api/search/ireland`

**Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `county` | string | No | Irish county | `Dublin` |
| `name` | string | No | Nursing home name (partial match) | `St Mary's` |
| `maxResults` | number | No | Max results (default: 20) | `40` |

**Common Counties:**
- `Dublin`
- `Cork`
- `Galway`
- `Limerick`
- `Waterford`
- `Kerry`
- `Meath`

**Example Request:**
```
GET /api/search/ireland?county=Dublin&maxResults=10
```

**Example Response:**
```json
{
  "count": 10,
  "results": [
    {
      "id": "NH123",
      "name": "St Mary's Nursing Home",
      "address": "123 O'Connell Street, Dublin",
      "county": "Dublin",
      "beds": 45,
      "phone": "01 234 5678",
      "personInCharge": "Mary Murphy",
      "providerName": "St Mary's Care Ltd",
      "registrationNumber": "NH-2015-001",
      "registrationDate": "2015-03-01",
      "expiryDate": "2026-03-01"
    }
  ]
}
```

**Status Codes:**
- `200` - OK
- `500` - Server error

---

### Postcode Lookup

Get detailed information about a UK postcode including coordinates and administrative areas.

**Endpoint:** `GET /api/postcode/:postcode`

**Path Parameters:**
- `postcode` - UK postcode (URL encoded)

**Example Request:**
```
GET /api/postcode/PE13%202PR
```

**Example Response:**
```json
{
  "status": 200,
  "result": {
    "postcode": "PE13 2PR",
    "quality": 1,
    "eastings": 545683,
    "northings": 309536,
    "country": "England",
    "nhs_ha": "East of England",
    "longitude": 0.156993,
    "latitude": 52.659857,
    "european_electoral_region": "Eastern",
    "primary_care_trust": "NHS Cambridgeshire and Peterborough CCG",
    "region": "East of England",
    "lsoa": "Fenland 014A",
    "msoa": "Fenland 014",
    "incode": "2PR",
    "outcode": "PE13",
    "parliamentary_constituency": "North East Cambridgeshire",
    "admin_district": "Fenland",
    "parish": "Wisbech",
    "admin_county": null,
    "date_of_introduction": "198001",
    "admin_ward": "Wisbech Clarkson",
    "ced": null,
    "ccg": "E38000026",
    "nuts": "Peterborough",
    "pfa": "Cambridgeshire",
    "codes": {
      "admin_district": "E07000140",
      "admin_county": "E10000003",
      "admin_ward": "E05010832",
      "parish": "E04003418",
      "parliamentary_constituency": "E14000838",
      "ccg": "E38000026",
      "ccg_id": "06H",
      "ced": "E58000652",
      "nuts": "TLH13",
      "lsoa": "E01025830",
      "msoa": "E02005492",
      "lau2": "E07000140",
      "pfa": "E23000007"
    }
  }
}
```

**Status Codes:**
- `200` - OK
- `404` - Postcode not found

---

## Common Workflows

### Workflow 1: Find Nearest Care Homes

1. **Lookup postcode** (optional, to verify):
   ```
   GET /api/postcode/PE13%202PR
   ```

2. **Radius search**:
   ```
   GET /api/search/radius?postcode=PE13+2PR&miles=5&careHome=Y
   ```

3. **Get details** for specific locations:
   ```
   GET /api/provider/1-123039495
   ```

### Workflow 2: Regional Market Analysis

1. **Search by local authority**:
   ```
   GET /api/search/cqc?localAuthority=Cambridgeshire&careHome=Y&perPage=50
   ```

2. **Get details** for each location to analyze ratings distribution

3. **Repeat** for neighboring authorities

4. **Combine** results for comprehensive market view

### Workflow 3: Multi-Country Research

1. **England**:
   ```
   GET /api/search/cqc?region=East+of+England&careHome=Y
   ```

2. **Scotland**:
   ```
   GET /api/search/scotland?councilArea=Edinburgh
   ```

3. **Northern Ireland**:
   ```
   GET /api/search/northern-ireland?district=Belfast
   ```

4. **Ireland**:
   ```
   GET /api/search/ireland?county=Dublin
   ```

5. **Aggregate** and compare across regions

---

## Rate Limits

**None currently.** This is a local API for personal use.

**But be aware:**
- CQC public API may have undocumented rate limits
- Radius search makes many API calls (one per provider to get coordinates)
- Avoid hammering the endpoints (allow 1-2 seconds between requests)

**If hosting publicly, add:**
- Rate limiting middleware
- API key authentication
- Usage monitoring

---

## Error Handling

All errors return JSON with an `error` field:

```json
{
  "error": "Postcode is required"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (missing/invalid parameters)
- `404` - Resource not found
- `500` - Server error (API failure, data issue, etc.)

**Error Messages:**
- Clear, descriptive messages
- No stack traces in production
- Check server console for detailed errors

---

## Data Freshness

**England (CQC):**
- ✅ Real-time via CQC public API
- Always current

**Scotland:**
- ⚠️ Bundled CSV updated periodically
- Check `/health` for last update date
- Download fresh data from Care Inspectorate if needed

**Northern Ireland:**
- ⚠️ Bundled Excel updated periodically
- Check `/health` for last update date
- Download from RQIA if needed

**Ireland:**
- ⚠️ Bundled CSV updated periodically
- Check `/health` for last update date
- Download from HIQA if needed

---

## Performance Notes

**Fast Endpoints:**
- `/health` - Instant
- `/api/search/scotland` - < 1 second (local data)
- `/api/search/northern-ireland` - < 1 second (local data)
- `/api/search/ireland` - < 1 second (local data)
- `/api/postcode/:postcode` - < 1 second (external API)

**Moderate Speed:**
- `/api/search/cqc` - 2-5 seconds (CQC API)
- `/api/search/postcode` - 3-7 seconds (CQC API + filtering)
- `/api/provider/:id` - 1-2 seconds (CQC API)

**Slow Endpoints:**
- `/api/search/radius` - 10-30 seconds (many API calls for coordinates)

**Optimization Tips:**
- Use smaller radius values when possible
- Filter by `careHome=Y` and `rating` to reduce results
- Cache results locally if doing repeated queries
- For bulk analysis, download raw data instead of API calls

---

## Examples in Different Languages

### cURL
```bash
# Radius search
curl "http://localhost:3000/api/search/radius?postcode=PE13+2PR&miles=5&careHome=Y"

# Local authority search
curl "http://localhost:3000/api/search/cqc?localAuthority=Cambridgeshire&careHome=Y"

# Provider details
curl "http://localhost:3000/api/provider/1-123039495"
```

### Python
```python
import requests

# Radius search
response = requests.get(
    "http://localhost:3000/api/search/radius",
    params={
        "postcode": "PE13 2PR",
        "miles": 5,
        "careHome": "Y"
    }
)
data = response.json()
print(f"Found {data['count']} care homes")

for location in data['locations']:
    print(f"{location['locationName']} - {location['distance']} miles")
```

### JavaScript/Node.js
```javascript
const response = await fetch(
  'http://localhost:3000/api/search/radius?postcode=PE13+2PR&miles=5&careHome=Y'
);
const data = await response.json();

console.log(`Found ${data.count} care homes`);
data.locations.forEach(loc => {
  console.log(`${loc.locationName} - ${loc.distance} miles`);
});
```

### PowerShell
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/search/radius?postcode=PE13+2PR&miles=5&careHome=Y"

Write-Host "Found $($response.count) care homes"
$response.locations | ForEach-Object {
    Write-Host "$($_.locationName) - $($_.distance) miles"
}
```

---

## Next Steps

- See [README.md](README.md) for setup and overview
- See [EXCEL-GUIDE.md](EXCEL-GUIDE.md) for Excel Power Query integration
- Start with `/health` to verify the API works
- Try radius search with your local postcode
- Build from there!
