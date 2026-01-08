# Care Provider Finder - HTTP API

A REST API for searching UK & Ireland care providers with radius search capabilities. Designed to integrate with Excel, Python, JavaScript, and other tools that consume JSON APIs.

## Overview

This HTTP API provides programmatic access to care provider data across the UK and Ireland:

- **England (CQC)**: Live API access to 119,000+ registered care providers
- **Scotland**: 10,000+ care services from Care Inspectorate datastore
- **Northern Ireland**: 1,500+ services from RQIA register
- **Ireland**: 500+ nursing homes from HIQA register

### Key Features

**Search & Discovery:**
- **Radius Search**: Find care homes within X miles of any UK postcode
- **Comprehensive Data**: 20+ fields per location including ratings, contact details, capacity, services
- **Smart Filtering**: Automatically excludes old deregistered homes, shows recent closures
- **Multi-Country Search**: Query all four UK countries + Ireland
- **Local Authority Search**: Filter by specific councils/regions

**Market Intelligence:** ⭐ NEW
- **Outstanding Homes**: All top-rated homes grouped by region
- **At-Risk Analysis**: Homes needing improvement (turnaround opportunities)
- **Recent Inspections**: Track fresh CQC rating changes
- **Large Capacity**: Corporate/investment-grade analysis
- **New Entrants**: Track market expansion and new registrations
- **Provider Portfolios**: Analyze entire operator performance
- **Service Specialization**: Find homes offering specific care (Dementia, etc.)
- **Regional Comparison**: Macro market statistics across England
- **Authority Comparison**: Micro market analysis by local area

**Integration:**
- **Real-time England Data**: Direct CQC API integration
- **Distance Calculation**: Automatically calculates and sorts by distance
- **Excel-Ready**: Power Query compatible (see EXCEL-GUIDE.md)

## Quick Start

See [QUICKSTART.md](QUICKSTART.md) for a 5-minute setup guide.

**TL;DR:**
```bash
npm install
npm run build
npm start
# Open: http://localhost:3000/health
```

**Test all endpoints:**
```bash
# In another terminal while server is running
npm test
```

This will test all 18 endpoints and show pass/fail status with timing.

## Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get running in 5 minutes
- **[ENDPOINTS.md](ENDPOINTS.md)** - Quick reference of all 18 endpoints ⭐
- **[API-DOCS.md](API-DOCS.md)** - Complete API reference with examples
- **[EXCEL-GUIDE.md](EXCEL-GUIDE.md)** - Connect Excel using Power Query
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design and technical decisions
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

## Why This Exists

This is the HTTP version of the [care-provider-finder MCP server](https://github.com/cs97jjm3/care-provider-finder). The MCP server works great with Claude Desktop but uses stdio which isn't accessible over a network.

**Use the HTTP API for:**
- Excel data connections
- Python/JavaScript applications  
- Business intelligence tools
- Radius searches

**Use the stdio MCP for:**
- Claude Desktop integration
- Natural language queries
- Interactive research

## License

MIT License - see [LICENSE](LICENSE) file

## Author

James Morris - Business Analyst at The Access Group
