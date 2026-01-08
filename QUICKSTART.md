# Quick Start Guide

Get the Care Provider Finder HTTP API running in 5 minutes.

## Prerequisites Check

**Do you have Node.js?**
```bash
node --version
```

If it shows v18.x or higher: ✅ You're ready
If it shows nothing or error: ❌ Install Node.js first

**Install Node.js (if needed):**
- **Windows:** Download from https://nodejs.org (LTS version)
- **Mac:** `brew install node` or download from nodejs.org
- **Linux:** `sudo apt install nodejs npm` (Ubuntu/Debian)

---

## Step 1: Get the Code (30 seconds)

**Option A: Clone from Git**
```bash
git clone https://github.com/your-username/care-provider-finder-http.git
cd care-provider-finder-http
```

**Option B: Download ZIP**
1. Download ZIP from GitHub
2. Extract to a folder
3. Open terminal/command prompt in that folder

---

## Step 2: Install Dependencies (1 minute)

```bash
npm install
```

Wait for it to download all the packages...

---

## Step 3: Build (30 seconds)

```bash
npm run build
```

This compiles TypeScript to JavaScript.

---

## Step 4: Start the API (10 seconds)

```bash
npm start
```

You should see:
```
Loaded 10645 Scotland providers
Loaded 1526 RQIA providers  
Loaded 542 HIQA providers
Care Provider Finder HTTP API v2.0.0
Server running on http://localhost:3000
Health check: http://localhost:3000/health
```

**Keep this terminal window open** - the API is running!

---

## Step 5: Test It Works (30 seconds)

**Open a web browser** and go to:
```
http://localhost:3000/health
```

You should see:
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

If you see this: **🎉 It's working!**

---

## Your First Searches

### Find Care Homes Near You

**In your browser:**
```
http://localhost:3000/api/search/radius?postcode=YOUR_POSTCODE&miles=5&careHome=Y
```

Replace `YOUR_POSTCODE` with your actual postcode (e.g., PE13 2PR)

**Example:**
```
http://localhost:3000/api/search/radius?postcode=PE13 2PR&miles=5&careHome=Y
```

### Search by Town/City

**In your browser:**
```
http://localhost:3000/api/search/cqc?localAuthority=Cambridgeshire&careHome=Y&perPage=10
```

Replace `Cambridgeshire` with your local authority.

### Get Provider Details

**In your browser:**
```
http://localhost:3000/api/provider/1-123039495
```

(Use a location ID from previous searches)

---

## Connect to Excel (5 minutes)

**Step 1:** Open Excel

**Step 2:** Go to Data tab → Get Data → From Other Sources → From Web

**Step 3:** Enter this URL:
```
http://localhost:3000/api/search/radius?postcode=PE13 2PR&miles=5&careHome=Y
```

**Step 4:** Select "Anonymous" when asked

**Step 5:** In Power Query:
- Click "Record"
- Click "locations" 
- Click "To Table"
- Click the expand icon (↕) on Column1
- Select: locationName, postalCode, distance, fullAddress
- Uncheck "Use original column name as prefix"
- Click OK
- Click "Close & Load"

**Done!** Care home data is now in Excel.

---

## Common Issues

### "npm: command not found"
**Problem:** Node.js not installed
**Solution:** Install Node.js from nodejs.org

### "Port 3000 already in use"
**Problem:** Something else is using port 3000
**Solution:** Either:
- Stop the other application
- Or run on different port: `PORT=8080 npm start`

### "Cannot find module"
**Problem:** Dependencies not installed
**Solution:** Run `npm install` again

### "No providers found"
**Problem:** Postcode might be in an area with few care homes
**Solution:** Try:
- Larger radius (e.g., 10 or 20 miles)
- Different local authority
- Check the postcode is valid

### Browser shows "This site can't be reached"
**Problem:** API not running
**Solution:** Check terminal - API must be running (`npm start`)

---

## Step 5: Test Everything Works

**Run the automated test suite:**

```bash
# In a NEW terminal (keep server running in first terminal)
npm test
```

This will:
- Test all 18 endpoints
- Show pass/fail status
- Display timing for each endpoint
- Give you a summary report

**Expected output:**
```
========================================
Care Provider Finder API Test Suite
========================================

Testing: 1. Health Check
  /health
  ✓ PASS - 5ms

Testing: 2. CQC Search (Cambridgeshire)
  /api/search/cqc?localAuthority=Cambridgeshire&careHome=Y&perPage=5
  ✓ PASS - 2341ms

...

Total Tests:  18
Passed:       18
Failed:       0
Pass Rate:    100.0%

🎉 All tests passed! API is working correctly.
```

If any tests fail, check that your server is running and you have internet access.

---

## Next Steps

**Now that it's working:**

1. **Read full documentation:**
   - [README.md](README.md) - Complete overview
   - [API-DOCS.md](API-DOCS.md) - All endpoints
   - [EXCEL-GUIDE.md](EXCEL-GUIDE.md) - Excel tips & tricks

2. **Try different searches:**
   - Different postcodes
   - Different radius values
   - Search Scotland, NI, Ireland
   - Filter by ratings

3. **Build something useful:**
   - Market research spreadsheet
   - Location analysis
   - Quality monitoring dashboard

---

## Stop the API

When you're done:
- Press `Ctrl+C` in the terminal window where API is running
- Or just close the terminal

To start again later:
- Open terminal in the project folder
- Run `npm start`

---

## Useful Commands

```bash
# Start the API
npm start

# Rebuild after code changes
npm run build

# Check Node version
node --version

# Update dependencies (occasionally)
npm update

# View API logs (if using PM2)
pm2 logs care-api
```

---

## Getting Help

**If you're stuck:**

1. Check the [README.md](README.md) for detailed explanations
2. Look at [API-DOCS.md](API-DOCS.md) for endpoint examples
3. Open an issue on GitHub
4. Check the [CONTRIBUTING.md](CONTRIBUTING.md) for common problems

---

## Quick Reference Card

**Health Check:**
```
http://localhost:3000/health
```

**Radius Search:**
```
http://localhost:3000/api/search/radius?postcode=YOUR_POSTCODE&miles=5&careHome=Y
```

**Local Authority Search:**
```
http://localhost:3000/api/search/cqc?localAuthority=YOUR_AUTHORITY&careHome=Y
```

**Provider Details:**
```
http://localhost:3000/api/provider/LOCATION_ID
```

**Scotland:**
```
http://localhost:3000/api/search/scotland?councilArea=Edinburgh
```

**Northern Ireland:**
```
http://localhost:3000/api/search/northern-ireland?district=Belfast
```

**Ireland:**
```
http://localhost:3000/api/search/ireland?county=Dublin
```

---

**That's it! You're ready to search UK care provider data.**

For more advanced usage, see the full documentation files. Enjoy! 🎉
