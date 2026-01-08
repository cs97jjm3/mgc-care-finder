#!/usr/bin/env node

/**
 * Care Provider Finder HTTP API
 * Exposes the MCP functionality as REST endpoints
 */

import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration (same as MCP version)
const CQC_API_BASE = "https://api.service.cqc.org.uk/public/v1";
const CQC_SUBSCRIPTION_KEY = "03d541ef28dd4861894343d518c8c5fd";
const POSTCODES_API_BASE = "https://api.postcodes.io";
const DATA_DIR = path.join(__dirname, "..", "data");

// Data storage
let scotlandData: any[] = [];
let rqiaData: any[] = [];
let hiqaData: any[] = [];

// Initialize data on startup
function initializeData() {
  try {
    // Load Scotland data
    const scotlandPath = path.join(DATA_DIR, "scotland.csv");
    if (fs.existsSync(scotlandPath)) {
      const workbook = XLSX.readFile(scotlandPath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      scotlandData = XLSX.utils.sheet_to_json(sheet);
      console.log(`Loaded ${scotlandData.length} Scotland providers`);
    }

    // Load RQIA data
    const rqiaPath = path.join(DATA_DIR, "rqia.xlsx");
    if (fs.existsSync(rqiaPath)) {
      const workbook = XLSX.readFile(rqiaPath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rqiaData = XLSX.utils.sheet_to_json(sheet);
      console.log(`Loaded ${rqiaData.length} RQIA providers`);
    }

    // Load HIQA data
    const hiqaPath = path.join(DATA_DIR, "hiqa.csv");
    if (fs.existsSync(hiqaPath)) {
      const workbook = XLSX.readFile(hiqaPath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      hiqaData = XLSX.utils.sheet_to_json(sheet);
      console.log(`Loaded ${hiqaData.length} HIQA providers`);
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

// ===== API ENDPOINTS =====

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    dataLoaded: {
      scotland: scotlandData.length,
      rqia: rqiaData.length,
      hiqa: hiqaData.length
    }
  });
});

// Search CQC providers (England)
app.get('/api/search/cqc', async (req, res) => {
  try {
    const { localAuthority, region, rating, careHome, page = 1, perPage = 20 } = req.query;
    
    let url = `${CQC_API_BASE}/locations?`;
    const params = new URLSearchParams();
    
    if (localAuthority) params.append('localAuthority', localAuthority as string);
    if (region) params.append('region', region as string);
    if (rating) params.append('overallRating', rating as string);
    if (careHome) params.append('careHome', careHome as string);
    params.append('page', page as string);
    params.append('perPage', perPage as string);
    
    url += params.toString();
    
    const response = await fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Search by postcode
app.get('/api/search/postcode', async (req, res) => {
  try {
    const { postcode, careHome, rating, perPage = 20 } = req.query;
    
    if (!postcode) {
      return res.status(400).json({ error: 'Postcode is required' });
    }
    
    // Get local authority from postcode
    const postcodeRes = await fetch(`${POSTCODES_API_BASE}/postcodes/${postcode}`);
    const postcodeData = await postcodeRes.json();
    
    if (!postcodeData.result) {
      return res.status(404).json({ error: 'Postcode not found' });
    }
    
    const localAuthority = postcodeData.result.admin_district;
    const postcodeArea = (postcode as string).split(' ')[0];
    
    // Search CQC with local authority
    let url = `${CQC_API_BASE}/locations?localAuthority=${encodeURIComponent(localAuthority)}`;
    if (careHome) url += `&careHome=${careHome}`;
    if (rating) url += `&overallRating=${rating}`;
    url += `&perPage=${perPage}`;
    
    const response = await fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
    });
    
    const data = await response.json();
    
    // Filter to postcode area
    if (data.locations) {
      data.locations = data.locations.filter((loc: any) => 
        loc.postalCode?.startsWith(postcodeArea)
      );
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get provider details
app.get('/api/provider/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    
    const url = `${CQC_API_BASE}/locations/${locationId}`;
    const response = await fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Search Scotland
app.get('/api/search/scotland', (req, res) => {
  try {
    const { name, councilArea, serviceType, maxResults = 20 } = req.query;
    
    let results = scotlandData;
    
    if (name) {
      const searchTerm = (name as string).toLowerCase();
      results = results.filter(r => 
        r['Service Name']?.toLowerCase().includes(searchTerm)
      );
    }
    
    if (councilArea) {
      results = results.filter(r => 
        r['Local Authority']?.toLowerCase() === (councilArea as string).toLowerCase()
      );
    }
    
    if (serviceType) {
      results = results.filter(r => 
        r['Service Type']?.toLowerCase().includes((serviceType as string).toLowerCase())
      );
    }
    
    results = results.slice(0, Number(maxResults));
    
    res.json({
      count: results.length,
      results: results
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Search Northern Ireland
app.get('/api/search/northern-ireland', (req, res) => {
  try {
    const { name, district, serviceType, maxResults = 20 } = req.query;
    
    let results = rqiaData;
    
    if (name) {
      const searchTerm = (name as string).toLowerCase();
      results = results.filter(r => 
        r['Establishment Name']?.toLowerCase().includes(searchTerm)
      );
    }
    
    if (district) {
      results = results.filter(r => 
        r['Local Government District']?.toLowerCase().includes((district as string).toLowerCase())
      );
    }
    
    if (serviceType) {
      results = results.filter(r => 
        r['Service Type']?.toLowerCase().includes((serviceType as string).toLowerCase())
      );
    }
    
    results = results.slice(0, Number(maxResults));
    
    res.json({
      count: results.length,
      results: results
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Search Ireland
app.get('/api/search/ireland', (req, res) => {
  try {
    const { name, county, maxResults = 20 } = req.query;
    
    let results = hiqaData;
    
    if (name) {
      const searchTerm = (name as string).toLowerCase();
      results = results.filter(r => 
        r['Centre Name']?.toLowerCase().includes(searchTerm)
      );
    }
    
    if (county) {
      results = results.filter(r => 
        r['County']?.toLowerCase() === (county as string).toLowerCase()
      );
    }
    
    results = results.slice(0, Number(maxResults));
    
    res.json({
      count: results.length,
      results: results
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Helper: Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Search by radius
app.get('/api/search/radius', async (req, res) => {
  try {
    const { postcode, miles = 5, careHome, rating, maxResults = 50 } = req.query;
    
    if (!postcode) {
      return res.status(400).json({ error: 'Postcode is required' });
    }
    
    const radiusMiles = Number(miles);
    if (isNaN(radiusMiles) || radiusMiles <= 0) {
      return res.status(400).json({ error: 'Miles must be a positive number' });
    }
    
    // Get postcode coordinates
    const postcodeRes = await fetch(`${POSTCODES_API_BASE}/postcodes/${postcode}`);
    const postcodeData = await postcodeRes.json();
    
    if (!postcodeData.result) {
      return res.status(404).json({ error: 'Postcode not found' });
    }
    
    const centerLat = postcodeData.result.latitude;
    const centerLon = postcodeData.result.longitude;
    const localAuthority = postcodeData.result.admin_district;
    
    // For radius search, we need to check multiple local authorities
    // Fenland has very few providers, so check neighbouring authorities too
    const authoritiesToSearch = [
      localAuthority,
      'Cambridgeshire',  // Main county - includes Wisbech area
      'Peterborough',
      'East Cambridgeshire', 
      'Huntingdonshire',
      'South Holland',
      'King\'s Lynn and West Norfolk'
    ];
    
    // Get all providers from these authorities
    let allLocations: any[] = [];
    
    for (const authority of authoritiesToSearch) {
      let page = 1;
      let hasMore = true;
      
      // Fetch all pages for this authority (limit to reasonable number)
      while (hasMore && page <= 20) {
        let url = `${CQC_API_BASE}/locations?localAuthority=${encodeURIComponent(authority)}`;
        if (careHome) url += `&careHome=${careHome}`;
        if (rating) url += `&overallRating=${rating}`;
        url += `&page=${page}&perPage=20`;
        
        const response = await fetch(url, {
          headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
        });
        
        const data = await response.json();
        
        if (data.locations && data.locations.length > 0) {
          allLocations = allLocations.concat(data.locations);
          hasMore = page < data.totalPages;
          page++;
        } else {
          hasMore = false;
        }
      }
    }
    
    // For each location, get full details to get coordinates
    const locationsWithDistance = await Promise.all(
      allLocations.map(async (loc) => {
        try {
          // Get full location details which include latitude/longitude
          const detailUrl = `${CQC_API_BASE}/locations/${loc.locationId}`;
          const detailRes = await fetch(detailUrl, {
            headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
          });
          const details = await detailRes.json();
          
          if (details.onspdLatitude && details.onspdLongitude) {
            const distance = calculateDistance(
              centerLat,
              centerLon,
              details.onspdLatitude,
              details.onspdLongitude
            );
            
            return {
              ...loc,
              latitude: details.onspdLatitude,
              longitude: details.onspdLongitude,
              distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
              fullAddress: details.postalAddressLine1 + ', ' + details.postalAddressTownCity
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching details for ${loc.locationId}:`, error);
          return null;
        }
      })
    );
    
    // Filter by radius and remove nulls
    const filtered = locationsWithDistance
      .filter(loc => loc !== null && loc.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, Number(maxResults));
    
    res.json({
      searchPostcode: postcode,
      centerPoint: {
        latitude: centerLat,
        longitude: centerLon,
        localAuthority: localAuthority
      },
      radiusMiles: radiusMiles,
      count: filtered.length,
      locations: filtered
    });
    
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Lookup postcode
app.get('/api/postcode/:postcode', async (req, res) => {
  try {
    const { postcode } = req.params;
    
    const response = await fetch(`${POSTCODES_API_BASE}/postcodes/${postcode}`);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Start server
initializeData();

app.listen(PORT, () => {
  console.log(`Care Provider Finder HTTP API v2.0.0`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
