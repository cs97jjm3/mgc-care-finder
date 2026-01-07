# Care Provider Finder (UK & Ireland)

Find and compare care providers across the UK and Ireland using Claude Desktop.

## Coverage

| Country | Regulator | Data Type | Status |
|---------|-----------|-----------|--------|
| 🏴󠁧󠁢󠁥󠁮󠁧󠁿 **England** | CQC | Live API | ✅ Real-time |
| 🏴󠁧󠁢󠁳󠁣󠁴󠁿 **Scotland** | Care Inspectorate | Bundled CSV | ✅ Available |
| 🏴󠁧󠁢󠁷󠁬󠁳󠁿 **Wales** | CIW | Not available | 🚧 Awaiting open data |
| 🇬🇧 **N. Ireland** | RQIA | Bundled CSV | ✅ Available |
| 🇮🇪 **Ireland** | HIQA | Bundled CSV | ✅ Available |

> **About Wales:** Care Inspectorate Wales (CIW) does not currently provide an API or downloadable dataset. The `search_wales` tool provides guidance on accessing CIW's online directory and requesting data directly from CIW.

## Installation

1. Download the `.mcpb` file from [Releases](https://github.com/cs97jjm3/care-provider-finder/releases)
2. Double-click to install in Claude Desktop
3. Start searching!

## Example Queries

**England (Real-time CQC data):**
- "Show me care homes in Manchester"
- "Find Outstanding-rated nursing homes in London"
- "Search for domiciliary care near PE13 2PR"
- "Compare care home ratings in Cambridgeshire"

**Scotland:**
- "Find care homes in Edinburgh"
- "Search for housing support services in Glasgow"

**Northern Ireland:**
- "Show nursing homes in Belfast"
- "Find domiciliary care agencies in Derry"

**Ireland:**
- "Find nursing homes in Dublin"
- "Show HIQA registered homes in Cork"

**Wales:**
- "How do I search for care providers in Wales?"
- "Tell me about Wales care data availability"

**Data status:**
- "How fresh is your data?"
- "Check data freshness"

## Tools Available

| Tool | Description |
|------|-------------|
| `search_care_providers` | Search England by local authority, region, rating |
| `search_by_postcode` | Find providers near a UK postcode |
| `get_provider_details` | Full CQC details for a specific location |
| `get_ratings_summary` | Rating distribution analysis |
| `search_scotland` | Search Care Inspectorate Scotland |
| `search_northern_ireland` | Search RQIA (Northern Ireland) |
| `search_ireland` | Search HIQA nursing homes (Ireland) |
| `search_wales` | Wales guidance and data request info |
| `lookup_postcode` | Get local authority from UK postcode |
| `check_data_freshness` | See data age + download instructions |

## Data Freshness

- **England (CQC):** ✅ Always live - real-time API
- **Scotland:** 📊 Bundled CSV - updated periodically
- **Northern Ireland:** 📊 Bundled CSV - updated periodically  
- **Ireland:** 📊 Bundled CSV - updated periodically
- **Wales:** 🚧 Not available - awaiting open data access from CIW

Use `check_data_freshness` to see when bundled data was last updated and get instructions to download fresher data yourself if needed.

---

## Wales - What's the Situation?

Care Inspectorate Wales (CIW) does not currently provide:
- ❌ A public API
- ❌ A downloadable data file (CSV/Excel)

**How to access Wales care provider data:**

1. **Online Directory** (Manual search only)
   - Visit: https://digital.careinspectorate.wales/directory
   - Search providers one by one

2. **Request Data from CIW** (For legitimate use)
   - Email: CIWInformation@gov.wales
   - Request the full register under Open Government Licence
   - They may provide an Excel/CSV extract

3. **CIW Data Tools** (Limited)
   - Visit: https://www.careinspectorate.wales/data-tools
   - View statistics and reports (not full provider list)

**When will Wales be added?**
As soon as CIW releases open data access or provides data extracts upon request, we'll add it to the MCP. Use the `search_wales` tool in Claude to get the latest guidance.

---

## Updating Data Yourself (Optional)

If the bundled data is out of date, you can download fresh CSVs:

### Ireland (HIQA)
1. Go to: https://www.hiqa.ie/areas-we-work/older-peoples-services
2. Click **"Download the Register"** button
3. Save as `hiqa.csv` in the MCP's `data` folder

### Northern Ireland (RQIA)
1. Go to: https://www.opendatani.gov.uk/dataset/rqia-registered-services
2. Click **Download** on the CSV resource
3. Save as `rqia.csv` in the MCP's `data` folder

### Scotland (Care Inspectorate)
1. Go to: https://www.careinspectorate.com/index.php/statistics-and-analysis/data-and-analysis
2. Download the latest **"Datastore CSV"**
3. Save as `scotland.csv` in the MCP's `data` folder

### Wales (CIW)
1. Email CIWInformation@gov.wales requesting the full register
2. If provided, save as `wales.csv` in the MCP's `data` folder
3. Open a GitHub issue to let us know data is available!

Then **restart Claude Desktop** to load the new data.

---

## For Developers

### Building from Source

```bash
git clone https://github.com/cs97jjm3/care-provider-finder.git
cd care-provider-finder
npm install
npm run update-data   # Shows download instructions
# Download CSVs manually to data/ folder
npm run build
npm run pack
```

### Project Structure

```
care-provider-finder/
├── src/index.ts       # Main MCP server
├── data/              # Bundled CSV files
│   ├── hiqa.csv
│   ├── rqia.csv
│   ├── scotland.csv
│   └── timestamps.json
├── scripts/
│   └── update-data.cjs
├── manifest.json
└── package.json
```

### Contributing

Contributions welcome! Especially:
- 🏴󠁧󠁢󠁷󠁬󠁳󠁿 Wales data access solutions
- 📊 Fresh data updates for Scotland/NI/Ireland
- 🐛 Bug fixes and improvements
- 📝 Documentation enhancements

## License

MIT - See [LICENSE](LICENSE) file for details

## Author

**James Murrell**
- Email: murrell.james@gmail.com
- GitHub: [@cs97jjm3](https://github.com/cs97jjm3)
- Role: Business Analyst, The Access Group

---

## 📚 Want to Build Tools Like This?

This tool was built using the process documented in **["The Business Analyst's Guide to AI-Assisted Tool Development"](https://gumroad.com/l/ba-ai-tools)**.

Learn how to:
- Identify workflows worth automating
- Work effectively with AI as a collaborator
- Build production-ready tools without being a developer
- Avoid common pitfalls and mistakes

**£5 • Real code • Real examples • Real process**

Available February 4th, 2025

---

## Acknowledgments

- **CQC** for providing the excellent real-time API for England
- **Care Inspectorate Scotland** for open data access
- **RQIA** and **HIQA** for providing downloadable registers
- **postcodes.io** for the free UK postcode API

## Support

Found a bug? Have a feature request? Want to contribute Wales data?
[Open an issue](https://github.com/cs97jjm3/care-provider-finder/issues) on GitHub!

---

## 📚 Learn to Build Tools Like This

This tool was built using the methods described in **"The Business Analyst's Guide to AI-Assisted Tool Development"**.

**Learn how to:**
- Integrate multiple data sources
- Work with APIs and CSV data
- Build data search tools
- Save hours on repetitive research

**Get the guide:** https://murrelljames.gumroad.com/l/pvfww (£5)

**Repository:** https://github.com/cs97jjm3/ba-ai-tools-guide

**Case Study:** Chapter 4 covers building this tool in detail.
