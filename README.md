# Care Provider Finder (UK & Ireland)

Find and compare care providers across the UK and Ireland using Claude Desktop.

## Coverage

| Country | Regulator | Data Type |
|---------|-----------|-----------|
| 🏴󠁧󠁢󠁥󠁮󠁧󠁿 **England** | CQC | Live API ✅ |
| 🏴󠁧󠁢󠁳󠁣󠁴󠁿 **Scotland** | Care Inspectorate | Bundled data |
| 🏴󠁧󠁢󠁷󠁬󠁳󠁿 **Wales** | CIW | Coming soon |
| 🇬🇧 **N. Ireland** | RQIA | Bundled data |
| 🇮🇪 **Ireland** | HIQA | Bundled data |

## Installation

1. Download the `.mcpb` file
2. Double-click to install in Claude Desktop
3. Start searching!

## Example Queries

**England:**
- "Show me care homes in Manchester"
- "Find Outstanding-rated nursing homes in London"
- "Search for domiciliary care near PE13 2PR"

**Scotland:**
- "Find care homes in Edinburgh"
- "Search for housing support services in Glasgow"

**Northern Ireland:**
- "Show nursing homes in Belfast"
- "Find domiciliary care agencies"

**Ireland:**
- "Find nursing homes in Dublin"
- "Show HIQA registered homes in Cork"

**Check data status:**
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
| `lookup_postcode` | Get local authority from UK postcode |
| `check_data_freshness` | See data age + download instructions |

## Data Freshness

- **England:** Always live from CQC API
- **Other countries:** Bundled CSV data, updated periodically

Use `check_data_freshness` to see when data was last updated and get instructions to download fresher data yourself if needed.

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

Then **restart Claude Desktop** to load the new data.

---

## For Developers

### Building from Source

```bash
git clone https://github.com/yourusername/uk-healthcare-research-mcp
cd uk-healthcare-research-mcp
npm install
npm run update-data   # Shows download instructions
# Download CSVs manually to data/ folder
npm run build
npm run pack
```

### Project Structure

```
uk-healthcare-research-mcp/
├── src/index.ts       # Main MCP server
├── data/              # Bundled CSV files
│   ├── hiqa.csv
│   ├── rqia.csv
│   ├── scotland.csv
│   └── timestamps.json
├── scripts/
│   └── update-data.cjs
└── package.json
```

## License

MIT

## Author

James Murrell, Business Analyst, The Access Group
