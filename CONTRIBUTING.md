# Contributing to Care Provider Finder HTTP API

Thanks for your interest in contributing! This is a personal project, but improvements, bug fixes, and suggestions are welcome.

## How to Contribute

### Reporting Bugs

**Before submitting a bug report:**
- Check if the issue already exists in GitHub Issues
- Test with the latest version
- Verify the API is running: `curl http://localhost:3000/health`

**Include in your bug report:**
- Steps to reproduce
- Expected behavior
- Actual behavior
- Your environment (OS, Node version, etc.)
- Relevant logs or error messages

**Example:**
```
**Bug:** Radius search returns 0 results for valid postcode

**Steps:**
1. Start API with `npm start`
2. Call `http://localhost:3000/api/search/radius?postcode=SW1A+1AA&miles=5`
3. Receive empty results

**Expected:** Should return care homes in Westminster

**Environment:**
- OS: Windows 11
- Node: v18.17.0
- API version: 2.0.0
```

### Suggesting Features

**Good feature requests include:**
- Clear use case
- Why existing functionality doesn't work
- How it benefits users
- Bonus: Implementation ideas

**Example:**
```
**Feature:** Add county-level search for England

**Use Case:** Searching "Cambridgeshire" returns 281 care homes, but
users want to search entire counties like "Kent" which has multiple
local authorities.

**Benefit:** Easier market research across larger areas

**Implementation:** Add county lookup using postcodes.io, then query
all local authorities within that county.
```

### Contributing Code

**Step 1: Fork and Clone**
```bash
# Fork on GitHub, then:
git clone https://github.com/your-username/care-provider-finder-http.git
cd care-provider-finder-http
```

**Step 2: Create a Branch**
```bash
git checkout -b feature/your-feature-name
# Or: bugfix/your-bug-fix
```

**Step 3: Make Changes**
- Follow existing code style
- Add comments for complex logic
- Update documentation if needed
- Test your changes

**Step 4: Test Locally**
```bash
npm run build
npm start

# Test your endpoint
curl "http://localhost:3000/your-new-endpoint"
```

**Step 5: Commit**
```bash
git add .
git commit -m "Add county-level search for England"

# Good commit messages:
# "Fix radius search for areas with no providers"
# "Add caching layer for CQC API responses"
# "Update Scotland data to latest version"
```

**Step 6: Push and Create PR**
```bash
git push origin feature/your-feature-name

# Then create Pull Request on GitHub
```

## Code Style Guidelines

### TypeScript
- Use TypeScript types (avoid `any`)
- Interfaces for data structures
- Async/await for promises
- Descriptive variable names

**Good:**
```typescript
interface CareHome {
  locationId: string;
  name: string;
  distance: number;
}

async function searchNearby(postcode: string, miles: number): Promise<CareHome[]> {
  const results = await fetchFromAPI(postcode);
  return results.filter(home => home.distance <= miles);
}
```

**Bad:**
```typescript
async function search(pc: string, m: number): Promise<any> {
  const r = await fetch(pc);
  return r.filter((x: any) => x.d <= m);
}
```

### Express Routes
- RESTful URLs
- Query parameters for filters
- Consistent response format
- Error handling

**Good:**
```typescript
app.get('/api/search/radius', async (req, res) => {
  try {
    const { postcode, miles } = req.query;
    
    if (!postcode) {
      return res.status(400).json({ error: 'Postcode is required' });
    }
    
    const results = await radiusSearch(String(postcode), Number(miles) || 5);
    
    res.json({
      postcode,
      radiusMiles: Number(miles) || 5,
      count: results.length,
      locations: results
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});
```

### Documentation
- Update README.md if adding features
- Add examples to API-DOCS.md
- Include Excel usage in EXCEL-GUIDE.md if relevant
- Update CHANGELOG.md

## What to Contribute

### High Priority
- **Bug fixes** (anything broken)
- **Performance improvements** (faster radius search)
- **Better error messages** (help users debug)
- **Data updates** (fresh Scotland/NI/Ireland files)

### Medium Priority
- **New endpoints** (if genuinely useful)
- **Better documentation** (clarifications, examples)
- **Test coverage** (currently none!)
- **Caching layer** (reduce API calls)

### Low Priority
- **Code refactoring** (unless it fixes a problem)
- **Stylistic changes** (formatting, naming)
- **Dependencies** (avoid adding unless necessary)

### Not Accepted
- **Breaking changes** (without good reason)
- **Heavy dependencies** (keep bundle size small)
- **Authentication/security** (if you need it, fork it)
- **UI/frontend** (this is an API only)

## Testing Your Changes

**Manual testing checklist:**
```bash
# Health check
curl http://localhost:3000/health

# Basic search
curl "http://localhost:3000/api/search/cqc?localAuthority=Cambridgeshire&careHome=Y&perPage=5"

# Radius search
curl "http://localhost:3000/api/search/radius?postcode=PE13+2PR&miles=5&careHome=Y"

# Provider details
curl "http://localhost:3000/api/provider/1-123039495"

# Postcode lookup
curl "http://localhost:3000/api/postcode/PE13%202PR"

# Scotland
curl "http://localhost:3000/api/search/scotland?councilArea=Edinburgh&maxResults=5"

# Northern Ireland
curl "http://localhost:3000/api/search/northern-ireland?district=Belfast&maxResults=5"

# Ireland
curl "http://localhost:3000/api/search/ireland?county=Dublin&maxResults=5"
```

**Check for:**
- ✅ Correct HTTP status codes (200, 400, 404, 500)
- ✅ Valid JSON responses
- ✅ No console errors
- ✅ Reasonable response times (<30s even for radius)
- ✅ Proper error messages

## Code Review Process

1. **You submit PR** with clear description
2. **I review** (usually within a few days)
3. **Feedback** if changes needed
4. **You update** based on feedback
5. **I merge** when ready

**What I look for:**
- Does it solve a real problem?
- Is the code clean and maintainable?
- Does it break existing functionality?
- Is documentation updated?
- Are there any security concerns?

## Development Setup

### Prerequisites
- Node.js 18+
- npm
- Git
- Text editor (VS Code recommended)

### First Time Setup
```bash
# Clone your fork
git clone https://github.com/your-username/care-provider-finder-http.git
cd care-provider-finder-http

# Install dependencies
npm install

# Build
npm run build

# Run
npm start

# Verify
curl http://localhost:3000/health
```

### Development Workflow
```bash
# Make changes to src/http-server.ts

# Rebuild
npm run build

# Restart server
# (Ctrl+C to stop, npm start to restart)

# Test changes
curl "http://localhost:3000/..."
```

### Tools
- **TypeScript:** Language
- **Express.js:** HTTP server
- **Node.js:** Runtime
- **VS Code:** Editor (recommended)
  - Extensions: TypeScript, ESLint, Prettier

## Data Updates

### Updating Bundled Data

**Scotland:**
1. Download latest from https://www.careinspectorate.com/index.php/publications-statistics/44-public/93-datastore
2. Save as `data/scotland.csv`
3. Update `data/timestamps.json`: `"scotland": "2026-01-08T00:00:00.000Z"`
4. Test: `curl http://localhost:3000/api/search/scotland?maxResults=5`
5. Commit with message: "Update Scotland data to January 2026"

**Northern Ireland:**
1. Download from https://www.rqia.org.uk/register/
2. Save as `data/rqia.xlsx`
3. Update timestamps.json
4. Test
5. Commit

**Ireland:**
1. Download from https://www.hiqa.ie/
2. Save as `data/hiqa.csv`
3. Update timestamps.json
4. Test
5. Commit

### Adding New Data Sources

**If you want to add Wales or other data:**

1. **Create parser** in `src/http-server.ts`
```typescript
interface WalesProvider {
  // Define structure
}

function loadWalesData(): void {
  // Parse CSV/Excel/JSON
  // Store in walesData array
}
```

2. **Add search endpoint**
```typescript
app.get('/api/search/wales', (req, res) => {
  // Filter walesData
  // Return results
});
```

3. **Update documentation**
- README.md
- API-DOCS.md
- Health check endpoint

4. **Test thoroughly**

Run the test suite to ensure nothing broke:
```bash
npm test
```

Add tests for new endpoints in `test-endpoints.js`.

5. **Submit PR** with sample data file

## Questions?

**Not sure about something?**
- Open an issue to discuss before coding
- Ask questions in your PR
- Email me if sensitive

**Want to help but don't code?**
- Report bugs you find
- Improve documentation
- Share use cases
- Test new features
- Update data files

## Recognition

Contributors will be:
- Listed in CHANGELOG.md
- Credited in GitHub
- Mentioned in README.md (for significant contributions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Every contribution helps make this tool better for everyone searching UK care provider data. Whether it's fixing a typo or adding a major feature, it's appreciated!
