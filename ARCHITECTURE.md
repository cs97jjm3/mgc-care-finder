# Architecture Overview

Understanding how the Care Provider Finder system works and why it has two versions.

## The Problem

**Requirement:** Search UK care provider data from multiple sources and integrate with everyday tools (Claude Desktop, Excel, Python scripts).

**Challenges:**
1. Multiple data sources (CQC API, Scotland CSV, NI Excel, Ireland CSV)
2. Different tools need different integration methods
3. Corporate environments lock down plugins/add-ins
4. Need both interactive (chat) and programmatic (API) access

## The Solution: Two Complementary Versions

### 1. stdio MCP Server (Claude Desktop Integration)

**Purpose:** Enable Claude to search care providers during conversations

**How it works:**
```
Claude Desktop App
    ↓ (stdio communication)
MCP Server Process
    ↓ (API calls / file reads)
Care Provider Data
```

**Technology:**
- Node.js/TypeScript
- Model Context Protocol (MCP) stdio transport
- Runs as background process
- Communicates via standard input/output

**Use Cases:**
- "Find care homes in Edinburgh"
- "What's the rating for location 1-123456?"
- "Compare care home density in Cambridgeshire vs Peterborough"
- Interactive research during conversation with Claude

**Advantages:**
- ✅ Integrated directly into Claude Desktop
- ✅ Natural language queries
- ✅ No separate tools needed
- ✅ Fast for simple lookups

**Limitations:**
- ❌ Only accessible to Claude Desktop
- ❌ Can't be called from Excel/Python
- ❌ No network access (local only)
- ❌ Radius search would be too slow (blocks conversation)

### 2. HTTP API Server (Tool Integration)

**Purpose:** Provide programmatic access for Excel, scripts, and other tools

**How it works:**
```
Excel / Python / Browser
    ↓ (HTTP requests)
Express.js Server (localhost:3000)
    ↓ (API calls / file reads)
Care Provider Data
```

**Technology:**
- Node.js/TypeScript
- Express.js HTTP server
- REST API with JSON responses
- Runs on localhost:3000

**Use Cases:**
- Excel Power Query data connections
- Python data analysis scripts
- Business intelligence dashboards
- Automated reports
- Radius searches (find care homes within X miles)

**Advantages:**
- ✅ Accessible from any tool that speaks HTTP
- ✅ Standard REST API (familiar to developers)
- ✅ Can handle slow operations (radius search)
- ✅ Enables Excel integration without VBA/macros

**Limitations:**
- ❌ Requires manual API calls (no natural language)
- ❌ Must be running to access
- ❌ Not integrated into Claude Desktop

## Why Both?

**They complement each other:**

| Scenario | Best Tool |
|----------|-----------|
| Quick research question | stdio MCP |
| "Find care homes near me" | stdio MCP |
| Build Excel dashboard | HTTP API |
| Radius search (slow operation) | HTTP API |
| Python data analysis | HTTP API |
| Chat with Claude about findings | stdio MCP |

**Real-world workflow:**
1. Use HTTP API to pull data into Excel
2. Analyze and identify questions
3. Ask Claude (via stdio MCP) for insights
4. Claude searches additional details
5. Back to Excel with refined data

## System Architecture

### Data Flow - stdio MCP

```
┌─────────────────┐
│  Claude Desktop │
│   (User Chat)   │
└────────┬────────┘
         │ stdio
         ↓
┌─────────────────┐
│   MCP Server    │
│  (stdio mode)   │
└────────┬────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌────────┐  ┌─────────┐
│CQC API │  │CSV Files│
│(Live)  │  │(Bundled)│
└────────┘  └─────────┘
```

### Data Flow - HTTP API

```
┌────────────┐   ┌─────────┐   ┌─────────┐
│   Excel    │   │ Python  │   │ Browser │
│Power Query │   │ Scripts │   │  Tools  │
└─────┬──────┘   └────┬────┘   └────┬────┘
      │               │              │
      └───────────────┴──────────────┘
                      │ HTTP
                      ↓
          ┌───────────────────┐
          │  Express Server   │
          │   (localhost:3000)│
          └─────────┬─────────┘
                    │
               ┌────┴────┐
               ↓         ↓
          ┌────────┐  ┌─────────┐
          │CQC API │  │CSV Files│
          │(Live)  │  │(Bundled)│
          └────────┘  └─────────┘
```

## Key Technical Decisions

### Decision 1: Separate Repositories

**Why:**
- Different dependencies (MCP SDK vs Express)
- Different use cases and users
- stdio version already public and working
- HTTP version for personal/private use initially

**Trade-off:**
- Duplicate code for data loading
- Must maintain both
- But: Clear separation of concerns

### Decision 2: No Radius Search in stdio

**Why:**
- Takes 10-30 seconds (too slow for chat)
- Blocks Claude's response
- Poor user experience
- HTTP can show "loading..." state

**Alternative:**
- stdio returns local authority results quickly
- User can use HTTP API for radius if needed

### Decision 3: Localhost Only (For Now)

**Why:**
- No security concerns
- No hosting costs
- No rate limiting needed
- Simple to run and use

**Future:**
- Could deploy to internal server if team needs access
- Or cloud hosting for public API service

### Decision 4: Power Query over VBA

**Why:**
- No macro security warnings
- Works in locked-down corporate environments
- Built into Excel
- IT-friendly (looks like normal data connection)

**Trade-off:**
- Less flexible than VBA
- Can't create custom functions like =SearchCareHomes()
- But: Much better for actual use case

## Corporate Environment Considerations

### The "Plugin Problem"

**Typical Corporate Lockdowns:**
- ❌ Can't install Excel add-ins
- ❌ Can't install browser extensions
- ❌ Can't install desktop applications (sometimes)
- ❌ Macros disabled or require approval

**Our Workaround:**
- ✅ Claude Desktop is "just a chat app" (usually allowed)
- ✅ MCP servers are "configuration files" (not installations)
- ✅ HTTP API is "localhost process" (not a network service)
- ✅ Power Query is "built-in Excel feature" (not a plugin)

**This architecture flies under the IT radar while providing full functionality.**

### Security Model

**stdio MCP:**
- Runs in user space
- No network exposure
- Only Claude Desktop can access
- Reads public data only

**HTTP API:**
- Runs on localhost only
- No external network access
- No authentication needed (local only)
- Calls public APIs (CQC, postcodes.io)

**Corporate Compliance:**
- No data exfiltration
- No external hosting
- No proprietary data accessed
- Uses publicly available datasets

## Performance Characteristics

### stdio MCP
- **Startup:** 1-2 seconds (loads CSV files)
- **Simple queries:** < 1 second
- **CQC API calls:** 2-5 seconds
- **Memory:** ~50MB

### HTTP API
- **Startup:** 1-2 seconds (loads CSV files)
- **Simple queries:** < 1 second
- **CQC API calls:** 2-5 seconds
- **Radius search:** 10-30 seconds (many API calls)
- **Memory:** ~50MB
- **Concurrent requests:** ~100/sec (single-threaded Node.js)

### Optimization Strategies

**Current:**
- Bundle Scotland/NI/Ireland data (no API calls)
- Direct CQC API integration (real-time England data)
- Concurrent batch requests (10 at a time)

**Future Improvements:**
- Cache CQC responses (Redis/memory)
- Pre-fetch coordinates for common areas
- Database instead of CSV files
- Worker threads for radius calculations

## Deployment Options

### Current: Local Development

**stdio MCP:**
- Clone repo
- `npm install && npm run build`
- Configure Claude Desktop
- Auto-starts with Claude

**HTTP API:**
- Clone repo
- `npm install && npm run build`
- `npm start`
- Access at localhost:3000

### Option: Internal Corporate Server

**Requirements:**
- Node.js runtime
- Network accessible to employees
- Internal DNS (optional)

**Setup:**
```bash
# On internal server
git clone <repo>
cd care-provider-finder-http
npm install --production
npm run build

# Run with PM2 (process manager)
npm install -g pm2
pm2 start dist/http-server.js --name care-api
pm2 startup
pm2 save

# Access at http://internal-server:3000
```

**Benefits:**
- Team can use without local setup
- Central updates
- Shared cache possible

### Option: Cloud Hosting

**Platforms:**
- DigitalOcean (£5/month droplet)
- AWS EC2 (t3.micro free tier)
- Heroku (free tier, auto-sleep)
- Railway (pay-per-use)

**Considerations:**
- Add authentication (API keys)
- Add rate limiting
- Monitor usage
- HTTPS required
- CORS configuration
- Logging and error tracking

**Not recommended unless:**
- Building a product/service
- Serving external users
- Need 24/7 uptime

## Data Management

### England (CQC)
- **Source:** Live API
- **Update:** Real-time (every request)
- **Reliability:** High (official government API)
- **Coverage:** Complete (119,000+ locations)

### Scotland (Care Inspectorate)
- **Source:** Bundled CSV
- **Update:** Manual (download from Care Inspectorate)
- **Reliability:** High (official data)
- **Coverage:** Active services only (10,000+)
- **Staleness:** Check timestamps.json

### Northern Ireland (RQIA)
- **Source:** Bundled Excel
- **Update:** Manual (download from RQIA)
- **Reliability:** Medium (Excel parsing required)
- **Coverage:** Current register (1,500+)
- **Staleness:** Check timestamps.json

### Ireland (HIQA)
- **Source:** Bundled CSV
- **Update:** Manual (download from HIQA)
- **Reliability:** High (official data)
- **Coverage:** Nursing homes only (542)
- **Staleness:** Check timestamps.json

### Updating Process

**Automated (Future Enhancement):**
```bash
# Cron job / scheduled task
0 0 * * 0 /path/to/update-data.sh

# Script downloads latest files
# Updates timestamps.json
# Restarts servers
```

**Current Manual Process:**
1. Download files from source websites
2. Save to data/ folder
3. Update timestamps.json
4. Restart servers

## API Design Principles

### RESTful Conventions
- GET for all endpoints (read-only)
- JSON responses
- Clear URL structure
- Query parameters for filters

### Error Handling
- Appropriate HTTP status codes
- JSON error responses
- Descriptive error messages
- No stack traces to client

### Response Format
- Consistent structure
- Include metadata (count, pagination)
- Distances in miles (UK standard)
- Coordinates in decimal degrees

### Naming Conventions
- camelCase for JSON keys
- Descriptive parameter names
- Clear boolean values (Y/N)
- ISO dates where applicable

## Future Enhancements

### Short Term (Next Month)
- [ ] Caching layer (Redis or in-memory)
- [ ] Auto-update for bundled data
- [ ] Health check improvements (data freshness warnings)
- [ ] Better error messages

### Medium Term (Next Quarter)
- [ ] Database instead of CSV files
- [ ] Batch endpoints (multiple postcodes at once)
- [ ] Export to Excel/CSV from API
- [ ] Rate limiting and auth (if hosting publicly)

### Long Term (Next Year)
- [ ] Wales data (when available)
- [ ] Historical ratings tracking
- [ ] Inspection report analysis
- [ ] ML for recommendations
- [ ] Map visualization endpoints

## Related Documentation

- [README.md](README.md) - Setup and quick start
- [API-DOCS.md](API-DOCS.md) - Complete API reference
- [EXCEL-GUIDE.md](EXCEL-GUIDE.md) - Excel Power Query integration
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide

## Questions?

This architecture emerged from actual use cases:
1. Need to chat with Claude about care homes → stdio MCP
2. Need to build Excel dashboards → HTTP API
3. Corporate IT restrictions → localhost + Power Query
4. Slow radius calculations → separate HTTP server

**The design prioritizes practicality over perfection.**
