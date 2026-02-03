# MGC Care Finder

A REST API for searching UK & Ireland care providers with radius search capabilities. Search across England (CQC), Scotland (Care Inspectorate), Northern Ireland (RQIA), and Ireland (HIQA) from a single unified API.

## What It Does

**Search 130,000+ care providers across UK & Ireland:**
- **England (CQC)**: 119,000+ registered locations with live API access
- **Scotland**: 10,600+ care services from Care Inspectorate
- **Northern Ireland**: 1,500+ services from RQIA
- **Ireland**: 500+ nursing homes from HIQA

**Key Features:**
- 🔍 **Universal Search**: Single endpoint searches all regions by postcode
- 📍 **Radius Search**: Find care homes within X miles of any UK postcode
- 🎯 **Smart Filtering**: By rating, service type, capacity, registration date
- 📊 **Market Intelligence**: Outstanding homes, at-risk analysis, regional comparisons
- 🔗 **Excel Integration**: Power Query compatible for dashboards
- 🌐 **Multi-Country**: Unified data format across UK + Ireland

## Quick Start

### Prerequisites
- Node.js 18+ ([download](https://nodejs.org/))
- ngrok (optional, for remote access - [download](https://ngrok.com/download))

### Installation

```bash
# Clone or download the repository
cd mgc-care-finder

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the server
npm start
```

Server runs at: **http://localhost:3000**

Test it works:
```bash
# In browser or terminal
curl http://localhost:3000/health
```

### First Search

Try these examples:

**Universal search (any postcode):**
```bash
# Northern Ireland
http://localhost:3000/api/providers/search?postcode=BT1&maxResults=10

# Scotland
http://localhost:3000/api/providers/search?postcode=G1&maxResults=10

# England
http://localhost:3000/api/providers/search?postcode=PE13&maxResults=10
```

**Radius search (England):**
```bash
# Find care homes within 5 miles of Wisbech
http://localhost:3000/api/search/radius?postcode=PE13+2PR&miles=5&careHome=Y
```

**Outstanding-rated homes:**
```bash
http://localhost:3000/api/search/outstanding?region=London&maxResults=20
```

## Running with ngrok (Remote Access)

ngrok creates a public HTTPS URL that tunnels to your local server. Useful for:
- Testing from mobile devices
- Sharing with colleagues
- Excel on different machines
- Remote access without deployment

### Setup ngrok:

1. **Download ngrok**: https://ngrok.com/download
2. **Install** (Windows: install from Microsoft Store, or extract exe to a folder in PATH)
3. **Start your server first**:
   ```bash
   npm start
   ```

4. **In another terminal, start ngrok**:
   ```bash
   ngrok http 3000
   ```

5. **Copy your public URL** from the ngrok output:
   ```
   Forwarding  https://fickly-leguminous-gricelda.ngrok-free.dev -> http://localhost:3000
   ```

6. **Use the ngrok URL** anywhere:
   ```bash
   # Test from browser
   https://fickly-leguminous-gricelda.ngrok-free.dev/health
   
   # Search Northern Ireland
   https://fickly-leguminous-gricelda.ngrok-free.dev/api/providers/search?postcode=BT1
   
   # Radius search
   https://fickly-leguminous-gricelda.ngrok-free.dev/api/search/radius?postcode=PE13+2PR&miles=5
   ```

**What you'll see in ngrok:**
```
Session Status    online
Account          James Murrell (Plan: Free)
Version          3.24.0
Region           Europe (eu)
Forwarding       https://your-unique-url.ngrok-free.dev -> http://localhost:3000

HTTP Requests
-------------
17:50:24  GET /api/providers/search  200 OK
```

**Important ngrok notes:**
- ✅ Free tier works great for development and testing
- ⚠️ URL changes each time you restart ngrok (e.g., `fickly-leguminous-gricelda` will be different next time)
- ⏰ Free sessions expire after 2 hours (just restart ngrok)
- 🌐 Anyone with the URL can access your API (don't share publicly if data is sensitive)
- 💰 Paid tier ($8/month): Fixed URLs, longer sessions, custom domains
- 🔍 View request logs at http://127.0.0.1:4040 (helpful for debugging)

**Ignoring the update warning:**
If you see "update failed (error: Access is denied)" - ignore it. This just means ngrok couldn't auto-update itself. Your current version works fine.

### ngrok + Excel

Use your ngrok URL in Excel Power Query:
```
Web.Contents("https://fickly-leguminous-gricelda.ngrok-free.dev/api/providers/search?postcode=BT1")
```

**Pro tip:** Save your Excel file with the query, but remember the ngrok URL will change when you restart. You'll need to update the URL in Power Query each session (or upgrade to ngrok paid for a fixed URL).

## Run Tests

Tests all 19 endpoints to verify everything works:

```bash
# Start server in one terminal
npm start

# Run tests in another terminal
npm test
```

Expected output:
```
=== Core Search Endpoints (10) ===
✓ PASS - Health Check
✓ PASS - Universal Provider Search (Northern Ireland)
✓ PASS - Universal Provider Search (Scotland)
...

Total Tests:  19
Passed:       19
Pass Rate:    100%
```

## Architecture

**Why Two Versions?**

This HTTP API complements the [stdio MCP server](https://github.com/cs97jjm3/care-provider-finder):

| Feature | stdio MCP | HTTP API (this) |
|---------|-----------|-----------------|
| **Use with** | Claude Desktop | Excel, Python, Web |
| **Access** | stdio process | HTTP REST |
| **Best for** | Interactive chat | Programmatic access |
| **Radius search** | Too slow | ✅ Optimized |
| **Excel integration** | ❌ | ✅ Power Query |
| **Natural language** | ✅ | ❌ |

**Problem solved:**
- MCP uses stdio (local process communication)
- Can't call stdio from Excel, Python, or over network
- HTTP API exposes same data via standard REST
- Use both: MCP for chat, HTTP for automation

## Documentation

- **[ENDPOINTS.md](ENDPOINTS.md)** - Quick reference of all 19 endpoints ⭐
- **[API-DOCS.md](API-DOCS.md)** - Complete API reference with examples
- **[EXCEL-GUIDE.md](EXCEL-GUIDE.md)** - Connect Excel using Power Query
- **[QUICKSTART.md](QUICKSTART.md)** - 5-minute getting started guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design and technical decisions
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide

## Key Endpoints

### Universal Provider Search (All Regions)
```
GET /api/providers/search?postcode={postcode}&country={ni|scotland|ireland|england}
```
Auto-detects region or force with `country` parameter.

### Radius Search (England)
```
GET /api/search/radius?postcode={postcode}&miles={miles}&careHome=Y
```
Find care homes within X miles. Includes ratings, contact info, capacity.

### Market Intelligence
```
GET /api/search/outstanding          # All Outstanding-rated homes
GET /api/search/at-risk              # Homes needing improvement
GET /api/search/large-homes          # High-capacity facilities
GET /api/provider/portfolio          # Operator analysis
GET /api/compare/regions             # Regional statistics
```

See [ENDPOINTS.md](ENDPOINTS.md) for complete list.

## Data Sources

**England:**
- **Source**: CQC Public API (live, real-time)
- **Status**: Always current - no download needed
- **API**: https://api.cqc.org.uk/public/v1
- **Records**: 119,000+ locations

**Scotland:**
- **Source**: Care Inspectorate datastore CSV
- **Bundled**: `/data/scotland.csv` (included in repo)
- **Download**: [Care Inspectorate Open Data Portal](https://www.careinspectorate.com/index.php/publications-statistics/94-public/data-and-analysis/2806-open-data)
- **Update frequency**: Quarterly
- **How to update**:
  1. Download latest CSV from portal
  2. Replace `/data/scotland.csv`
  3. Restart server
- **Records**: 10,600+ services

**Northern Ireland:**
- **Source**: RQIA register Excel export
- **Bundled**: `/data/rqia.xlsx` (included in repo)
- **Download**: [RQIA Service Search](https://admin.rqia.org.uk/search/servicesearch.cfm)
  1. Go to RQIA service search
  2. Leave all filters blank
  3. Click "Search"
  4. Click "Export to Excel"
  5. Save as `/data/rqia.xlsx`
- **Update frequency**: Monthly recommended
- **Records**: 1,500+ services

**Ireland:**
- **Source**: HIQA register CSV
- **Bundled**: `/data/hiqa.csv` (included in repo)
- **Download**: [HIQA Find a Centre](https://www.hiqa.ie/areas-we-work/regulation/registers)
  1. Go to HIQA registers page
  2. Download "Designated Centres Register"
  3. Export to CSV
  4. Save as `/data/hiqa.csv`
- **Update frequency**: Quarterly
- **Records**: 500+ nursing homes

**Checking Data Freshness:**
```bash
# Check loaded record counts and see if data is current
curl http://localhost:3000/health
```

**Data Update Schedule:**
- England: Real-time (no action needed)
- Scotland: Update quarterly
- Northern Ireland: Update monthly
- Ireland: Update quarterly

## Use Cases

**Business Analysts:**
- Market research and competitor analysis
- Regional comparison and benchmarking
- Provider portfolio analysis
- Excel dashboards and reports

**Developers:**
- Python data analysis scripts
- Automated monitoring systems
- Integration with other tools
- Web applications

**Care Sector Professionals:**
- Find local providers by postcode
- Track CQC rating changes
- Identify service gaps
- Build referral networks

## Development

**Project structure:**
```
mgc-care-finder/
├── src/
│   └── http-server.ts       # Main API server
├── data/                     # Scotland, NI, Ireland CSV/Excel
├── dist/                     # Compiled JavaScript
├── test-endpoints.js         # Test suite
└── docs/                     # Documentation
```

**Build and run:**
```bash
npm run build    # Compile TypeScript
npm start        # Run server
npm run dev      # Build + run in one command
npm test         # Run test suite
```

**Tech stack:**
- TypeScript + Node.js
- Express.js (HTTP server)
- XLSX (Excel file parsing)
- CQC Public API integration

## Troubleshooting

**Server won't start:**
- Check Node.js version: `node --version` (need 18+)
- Port 3000 in use? Change in `src/http-server.ts`
- Run `npm install` again

**Tests failing:**
- Make sure server is running first (`npm start`)
- Wait for "Server running" message
- Check `/health` endpoint returns data

**No results returned:**
- Scotland/NI/Ireland: Check CSV files exist in `/data`
- England: Check internet connection (uses CQC API)
- Check postcode format (BT1, G1, PE13, etc.)

**ngrok issues:**
- Make sure server runs on port 3000
- ngrok free tier expires after 2 hours
- URL changes each restart (free tier)

## License

MIT License - see [LICENSE](LICENSE) file

## Author

James Murrell - 

Built to solve the problem of accessing care provider data from multiple tools (Claude Desktop, Excel, Python) using different protocols (stdio MCP vs HTTP REST).
