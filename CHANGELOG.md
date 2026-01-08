# Changelog

All notable changes to the Care Provider Finder HTTP API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-08

### Added
- **Radius search functionality** - Find care homes within X miles of any UK postcode
- Distance calculation using Haversine formula
- Multi-authority search for areas with sparse provider coverage
- Automatic coordinate fetching from CQC API
- Comprehensive documentation suite:
  - README.md with setup instructions
  - API-DOCS.md with complete endpoint reference
  - EXCEL-GUIDE.md with Power Query integration
  - ARCHITECTURE.md explaining system design
- Clean console output (removed debug logging)
- Proper error handling for invalid postcodes
- Support for filtering by care home type and CQC rating in radius search

### Changed
- Improved local authority search to check neighboring authorities
- Updated coordinate field names to use CQC's actual fields (onspdLatitude/onspdLongitude)
- Enhanced search algorithm to handle edge cases (e.g., Fenland with 0 care homes)
- Better response formatting with metadata

### Fixed
- Radius search now returns correct coordinates for each location
- Local authority search no longer misses care homes in broader county areas
- Proper handling of postcodes in areas with few registered providers

### Technical
- Converted from stdio MCP to HTTP REST API
- Replaced MCP SDK dependencies with Express.js
- Added CORS support for browser-based tools
- Implemented concurrent API request batching (10 at a time)
- Created comprehensive test suite for radius calculations

## [1.0.0] - 2025-12-XX

### Added
- Initial HTTP API version forked from stdio MCP server
- Basic CQC search endpoints
- Support for Scotland, Northern Ireland, and Ireland data
- Postcode lookup functionality
- Health check endpoint
- Multi-country provider search

### Features
- Real-time CQC API integration for England
- Bundled data files for Scotland, NI, and Ireland
- JSON responses for all endpoints
- Express.js HTTP server on localhost:3000

---

## Upcoming / Planned

### [2.1.0] - Future
- [ ] Caching layer to reduce API calls
- [ ] Batch postcode search (multiple postcodes in one request)
- [ ] Export endpoints (CSV/Excel download)
- [ ] Auto-update for bundled data files
- [ ] Enhanced error messages with suggestions

### [2.2.0] - Future
- [ ] Database integration (replace CSV files)
- [ ] Historical data tracking
- [ ] Rating change notifications
- [ ] Performance optimizations

### [3.0.0] - Future
- [ ] Wales data integration (when available)
- [ ] Authentication and API keys (if hosting publicly)
- [ ] Rate limiting
- [ ] Usage analytics
- [ ] Webhook support for data updates

---

## Migration Notes

### Upgrading from 1.x to 2.0

**Breaking Changes:**
- None - all 1.x endpoints still work

**New Features:**
- Radius search is now available at `/api/search/radius`
- Response format for radius search includes distance and coordinates

**Recommendations:**
- Use radius search instead of postcode search for better coverage
- Specify `careHome=Y` to filter to residential care homes only
- Consider using smaller radius values (5-10 miles) for faster response times

### Migrating from stdio MCP to HTTP API

**If you're moving from the stdio MCP version:**

1. **Different dependencies**: HTTP version uses Express, not MCP SDK
2. **Different invocation**: Start with `npm start`, not through Claude Desktop
3. **Different access pattern**: HTTP requests, not stdio communication
4. **New capabilities**: Radius search, Power Query integration
5. **Same data sources**: Both versions use identical data files and CQC API

**Can you use both?** Yes! Run stdio MCP for Claude Desktop and HTTP API for Excel/tools.

---

## Contributors

- James Morris (@your-github-username) - Creator and maintainer

## Acknowledgments

- Anthropic for MCP framework and Claude Desktop
- CQC for providing public API
- Care Inspectorate Scotland for open data
- RQIA and HIQA for public registers
- postcodes.io for free postcode API

---

## License

MIT License - see LICENSE file for details
