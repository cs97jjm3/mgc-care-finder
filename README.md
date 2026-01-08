# Care Provider Finder - HTTP API

A REST API for searching UK & Ireland care providers with radius search capabilities. Designed to integrate with Excel, Python, JavaScript, and other tools that consume JSON APIs.

## Overview

This HTTP API provides programmatic access to care provider data across the UK and Ireland:

- **England (CQC)**: Live API access to 119,000+ registered care providers
- **Scotland**: 10,000+ care services from Care Inspectorate datastore
- **Northern Ireland**: 1,500+ services from RQIA register
- **Ireland**: 500+ nursing homes from HIQA register

### Key Features

- **Radius Search**: Find care homes within X miles of any UK postcode
- **Comprehensive Data**: 20+ fields per location including ratings, contact details, capacity, services
- **Smart Filtering**: Automatically excludes old deregistered homes, shows recent closures
- **Multi-Country Search**: Query all four UK countries + Ireland
- **Local Authority Search**: Filter by specific councils/regions
- **Rating Filters**: Search by CQC ratings (Outstanding, Good, etc.)
- **Real-time England Data**: Direct CQC API integration
- **Distance Calculation**: Automatically calculates and sorts by distance

## Quick Start

See [QUICKSTART.md](QUICKSTART.md) for a 5-minute setup guide.

**TL;DR:**
```bash
npm install
npm run build
npm start
# Open: http://localhost:3000/health
```

## Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get running in 5 minutes
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
