# Excel Integration Guide

How to connect Excel to the Care Provider Finder HTTP API using Power Query - no VBA, no macros, no IT approval needed.

## Why Power Query?

**Advantages:**
- ✅ Built into Excel (2016+)
- ✅ No macro security warnings
- ✅ No "Enable Macros" prompt
- ✅ Works in locked-down corporate environments
- ✅ Automatically parses JSON
- ✅ Refreshable data connections
- ✅ Professional and IT-friendly

**Compared to VBA:**
- VBA requires macro-enabled workbooks (.xlsm)
- VBA triggers security warnings
- VBA often blocked by corporate IT
- Power Query is treated as normal Excel functionality

## Prerequisites

1. **Excel 2016 or later** (includes Power Query by default)
2. **HTTP API running locally** - Start with `npm start` in the API folder
3. **Verify the API works**: Open http://localhost:3000/health in a browser

## Quick Start: Your First Query

### Step 1: Open Power Query

1. Open Excel (new or existing workbook)
2. Go to the **Data** tab
3. Click **Get Data** → **From Other Sources** → **From Web**

### Step 2: Enter the API URL

In the dialog that appears, enter:

```
http://localhost:3000/api/search/radius?postcode=PE13 2PR&miles=5&careHome=Y
```

Click **OK**.

### Step 3: Authenticate (First Time Only)

Excel will ask how to access the data:
- Select **Anonymous**
- Click **Connect**

### Step 4: Transform the Data

Power Query Editor will open showing the JSON response. You'll see:

```
Record: {searchPostcode, centerPoint, radiusMiles, count, locations}
```

**To get the care home data:**

1. Click on **Record** next to "locations"
2. Click **To Table** (top toolbar)
3. Click **OK** on the dialog
4. Click the **expand icon** (two arrows) in the Column1 header
5. Select the fields you want:
   - ☑ locationName
   - ☑ postalCode
   - ☑ distance
   - ☑ fullAddress
   - ☑ latitude
   - ☑ longitude
6. Uncheck **"Use original column name as prefix"**
7. Click **OK**

### Step 5: Load to Excel

1. Click **Close & Load** (top left)
2. Data appears in your spreadsheet!

You now have a table with care homes, distances, and addresses.

## Common Use Cases

### 1. Find Care Homes Near a Postcode

**API URL:**
```
http://localhost:3000/api/search/radius?postcode=PE13 2PR&miles=10&careHome=Y
```

**What you get:**
- Care homes within 10 miles
- Sorted by distance (closest first)
- Full addresses and postcodes
- Latitude/longitude for mapping

**Expand these fields in Power Query:**
- locationName
- postalCode  
- distance
- fullAddress
- locationId (for looking up more details later)

### 2. Search by Local Authority

**API URL:**
```
http://localhost:3000/api/search/cqc?localAuthority=Cambridgeshire&careHome=Y&perPage=50
```

**What you get:**
- All care homes in Cambridgeshire
- Up to 50 results per query
- CQC location IDs for further lookup

**Note:** Response structure is different - locations are in the root level, not nested.

**Power Query steps:**
1. Import URL
2. Click **List** next to "locations"
3. **To Table** → **OK**
4. Expand the Column1 → select fields
5. Close & Load

### 3. Get Provider Details

**API URL:**
```
http://localhost:3000/api/provider/1-123039495
```

Replace `1-123039495` with actual location ID from previous searches.

**What you get:**
- Full provider information
- CQC ratings breakdown
- Service types and specialisms
- Inspection history

**Power Query steps:**
1. Import URL
2. Click **Record** at the root
3. **To Table**
4. Transpose the table (Transform tab → Transpose)
5. Promote first row to headers (Home tab → Use First Row as Headers)
6. Close & Load

### 4. Search Scotland Care Homes

**API URL:**
```
http://localhost:3000/api/search/scotland?councilArea=Edinburgh&maxResults=20
```

**What you get:**
- Care homes in Edinburgh
- Service types and grades
- Contact information

**Power Query steps:**
1. Import URL
2. Expand "results" → To Table
3. Expand Column1 → select fields
4. Close & Load

## Advanced Techniques

### Make Your Query Dynamic with Parameters

Instead of hardcoding the postcode, use Excel cells:

**Step 1: Create Named Ranges**
1. Put your postcode in cell A1 (e.g., "PE13 2PR")
2. Put radius in cell B1 (e.g., 10)
3. Name these cells: Select A1 → Name Box (top left) → type "Postcode"
4. Name B1 as "RadiusMiles"

**Step 2: Modify Power Query**
1. Open Power Query Editor (Data → Queries & Connections → right-click query → Edit)
2. Click **Advanced Editor** (Home tab)
3. Replace the hardcoded URL with:

```m
let
    Postcode = Excel.CurrentWorkbook(){[Name="Postcode"]}[Content]{0}[Column1],
    Miles = Excel.CurrentWorkbook(){[Name="RadiusMiles"]}[Content]{0}[Column1],
    BaseUrl = "http://localhost:3000/api/search/radius",
    FullUrl = BaseUrl & "?postcode=" & Postcode & "&miles=" & Text.From(Miles) & "&careHome=Y",
    Source = Json.Document(Web.Contents(FullUrl)),
    locations = Source[locations],
    #"Converted to Table" = Table.FromList(locations, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Expanded Column1" = Table.ExpandRecordColumn(#"Converted to Table", "Column1", {"locationName", "postalCode", "distance", "fullAddress"})
in
    #"Expanded Column1"
```

4. Click **Done**
5. Click **Close & Load**

Now when you change A1 or B1 and click **Refresh All**, the query updates automatically!

### Refresh Data Automatically

**Option 1: Manual Refresh**
- Data tab → **Refresh All** (or Ctrl+Alt+F5)
- Queries update with latest data from API

**Option 2: Auto-Refresh on File Open**
1. Data → Queries & Connections
2. Right-click your query → Properties
3. Check ☑ **Refresh data when opening the file**
4. Click OK

**Option 3: Scheduled Refresh** (Excel for Microsoft 365 only)
1. Upload workbook to OneDrive/SharePoint
2. File → Info → Browser View Options
3. Set refresh schedule (requires Power Automate)

### Combine Multiple Queries

**Example: Get care homes from 3 different postcodes**

1. Create 3 separate queries (different postcodes)
2. In Power Query Editor: Home → Append Queries → Three or more tables
3. Select all your queries
4. Click OK
5. Now you have one combined table with results from all areas

### Add Calculated Columns

**Example: Convert distance to kilometers**

In Power Query Editor:
1. Add Column → Custom Column
2. Name: "distanceKm"
3. Formula: `[distance] * 1.60934`
4. Click OK

**Example: Flag care homes within 2 miles**

1. Add Column → Conditional Column
2. Name: "nearbyFlag"
3. If `distance` is less than `2` then "Yes" else "No"
4. Click OK

## Troubleshooting

### "Unable to connect" error

**Check these:**
1. Is the API running? Open http://localhost:3000/health in browser
2. Is the URL correct? Copy-paste from this guide
3. Firewall blocking localhost? Temporarily disable to test

### "Anonymous access denied"

**Solution:**
1. File → Options → Security → Privacy
2. Uncheck "Ignore Privacy Level settings"
3. Or: In Power Query, set privacy level to "Public" for localhost

### Data looks weird / not expanding correctly

**The JSON structure varies by endpoint:**

**For `/api/search/radius`:**
- Click Record → Click "locations" → To Table → Expand

**For `/api/search/cqc`:**
- Click Record → Click "locations" → To Table → Expand

**For `/api/provider/{id}`:**
- Click Record → To Table → Transpose → Use First Row as Headers

### Query is slow

**Speed tips:**
1. Reduce `perPage` to 20 or less
2. Use more specific filters (rating, careHome=Y)
3. For radius search, try smaller radius first
4. Scotland/NI/Ireland data is local (fast), England hits CQC API (slower)

### Data not refreshing

**Solutions:**
1. Check API is still running
2. Click Data → Refresh All (not just the refresh button on the table)
3. Check for errors in Queries & Connections pane
4. Close and reopen the workbook

## Real-World Examples

### Example 1: Market Research Report

**Goal:** Compare care home density across 5 towns

**Setup:**
1. Create 5 queries (one per town)
2. Use radius search with 5-mile radius
3. Append all queries into one table
4. Add pivot table to count by town
5. Create chart showing results

**Time to build:** 15 minutes
**Refresh time:** 30 seconds

### Example 2: Site Selection Analysis

**Goal:** Find best location for new care home (least competition)

**Setup:**
1. List of potential postcodes in Column A
2. Dynamic query using the postcode parameter technique
3. Copy query for each postcode
4. Compare count of nearby competitors
5. Sort by fewest competitors

**Time to build:** 20 minutes
**Refresh time:** ~10 seconds per location

### Example 3: Quality Monitoring Dashboard

**Goal:** Track CQC ratings in your region monthly

**Setup:**
1. Query for your local authority
2. Filter to care homes with ratings
3. Add calculated column for rating score (Outstanding=4, Good=3, etc.)
4. Create pivot table and chart
5. Set to auto-refresh on open
6. Check monthly for changes

**Time to build:** 10 minutes
**Refresh time:** 5 seconds

## Best Practices

### 1. Name Your Queries Clearly

Instead of "Query1", use names like:
- "CareHomes_Wisbech_5Miles"
- "CQC_Cambridgeshire_AllRatings"
- "Scotland_Edinburgh_CareHomes"

**How to rename:**
- Right-click query in Queries & Connections pane → Rename

### 2. Document Your Queries

Add descriptions:
1. Right-click query → Properties
2. Add description: "Care homes within 5 miles of office, updated weekly"
3. Click OK

### 3. Organize with Query Groups

For complex workbooks:
1. Right-click in Queries & Connections pane
2. New Group → name it (e.g., "Regional Analysis")
3. Drag related queries into the group

### 4. Set Appropriate Refresh Settings

**For static analysis:**
- Manual refresh only

**For dashboards:**
- Refresh on open

**For critical data:**
- Don't auto-refresh (avoid API hammering)
- Schedule specific refresh times

### 5. Handle Errors Gracefully

In Power Query Editor:
1. Right-click column header → Replace Errors
2. Replace with: "N/A" or 0 or null
3. Prevents whole query failing if one row has issues

## Moving to Production

### If IT Approves This Approach

**Considerations:**
1. **API Hosting**: Move from localhost to internal server
2. **Update URLs**: Change `localhost:3000` to `internal-server:3000`
3. **Authentication**: Add API key if needed
4. **Rate Limiting**: Implement if many users
5. **Monitoring**: Track usage and errors

### Sharing Workbooks

**What works:**
- ✅ Share the .xlsx file
- ✅ Others can open and refresh (if they have API access)
- ✅ Queries stay intact

**What doesn't work:**
- ❌ Excel Online (can't access localhost)
- ❌ Users without the API running
- ❌ Different network/port configurations

**Solution:**
- Document API setup in shared drive
- Or: Publish workbook with data snapshot (turn off auto-refresh)

## Security Considerations

### Corporate Environment

**This approach is typically allowed because:**
- ✅ No macros/VBA = no code execution risk
- ✅ Localhost only = no external network access
- ✅ Power Query = standard Excel feature
- ✅ Read-only data connections

**But check with IT if:**
- Policy explicitly bans external data connections
- Excel is locked down to only work with approved sources
- You're handling sensitive data subject to DLP policies

### Data Privacy

**The API calls:**
- Go to localhost (your machine only)
- Then to CQC public API (publicly available data)
- Do not transmit any personal or company data
- Do not expose internal information

**But be aware:**
- Your queries/postcodes might be sensitive
- Save workbooks in secure locations
- Don't share workbooks with hardcoded internal postcodes/locations

## Getting Help

### Check These First

1. **API Health**: http://localhost:3000/health
2. **API Docs**: [API-DOCS.md](API-DOCS.md)
3. **Test in Browser**: Try the URL in Chrome/Edge first

### Common Error Messages

**"Expression.Error: The import ... matches no exports"**
- The JSON structure is different than expected
- Try clicking Record first, then expanding

**"DataFormat.Error: Invalid JSON"**
- API returned an error instead of data
- Check the API is running and URL is correct

**"Web.Contents failed to get contents"**
- API not running on localhost:3000
- Firewall blocking connection
- Wrong URL/typo

## Next Steps

1. **Start simple**: Try the Quick Start example above
2. **Learn the endpoints**: Review [API-DOCS.md](API-DOCS.md)
3. **Build gradually**: Start with one query, then add more
4. **Experiment**: Power Query is forgiving, hard to break things
5. **Share back**: If you build something useful, document it!

## Additional Resources

**Power Query Learning:**
- Microsoft Power Query Documentation
- Excel Power Query YouTube tutorials
- "M" language reference (Power Query's formula language)

**API Learning:**
- REST API basics
- JSON data structures
- HTTP methods and parameters

**This Project:**
- [README.md](README.md) - API setup and overview
- [API-DOCS.md](API-DOCS.md) - Complete endpoint reference
