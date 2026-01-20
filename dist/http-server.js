#!/usr/bin/env node
/**
 * MGC Care Finder HTTP API
 * Exposes care provider search functionality as REST endpoints
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
let scotlandData = [];
let rqiaData = [];
let hiqaData = [];
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
    }
    catch (error) {
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
        if (localAuthority)
            params.append('localAuthority', localAuthority);
        if (region)
            params.append('region', region);
        if (rating)
            params.append('overallRating', rating);
        if (careHome)
            params.append('careHome', careHome);
        params.append('page', page);
        params.append('perPage', perPage);
        url += params.toString();
        const response = await fetch(url, {
            headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
        });
        const data = await response.json();
        res.json(data);
    }
    catch (error) {
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
        const postcodeArea = postcode.split(' ')[0];
        // Search CQC with local authority
        let url = `${CQC_API_BASE}/locations?localAuthority=${encodeURIComponent(localAuthority)}`;
        if (careHome)
            url += `&careHome=${careHome}`;
        if (rating)
            url += `&overallRating=${rating}`;
        url += `&perPage=${perPage}`;
        const response = await fetch(url, {
            headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
        });
        const data = await response.json();
        // Filter to postcode area
        if (data.locations) {
            data.locations = data.locations.filter((loc) => loc.postalCode?.startsWith(postcodeArea));
        }
        res.json(data);
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// Search providers by postcode across all regions
app.get('/api/providers/search', async (req, res) => {
    try {
        const { postcode, country, maxResults = 20 } = req.query;
        if (!postcode) {
            return res.status(400).json({ error: 'Postcode parameter is required' });
        }
        const searchPostcode = postcode.trim().toUpperCase();
        const postcodeArea = searchPostcode.split(/\s+/)[0]; // e.g., BT1, G1, PE13
        let results = [];
        let region = 'Unknown';
        // Allow country parameter to override auto-detection
        // country values: 'ni' (Northern Ireland), 'scotland', 'ireland', 'england'
        const forceCountry = country ? country.toLowerCase() : null;
        // Determine region based on postcode prefix or forced country
        if (forceCountry === 'ni' || (!forceCountry && postcodeArea.startsWith('BT'))) {
            // Northern Ireland
            region = 'Northern Ireland';
            results = rqiaData.filter(r => {
                const providerPostcode = r['Postcode']?.toString().trim().toUpperCase() || '';
                return providerPostcode.startsWith(postcodeArea);
            }).map(r => ({
                source: 'RQIA',
                name: r['ServiceName'],
                address: r['AddressLine1'] + (r['AddressLine2'] ? ', ' + r['AddressLine2'] : ''),
                town: r['Town'],
                postcode: r['Postcode'],
                category: r['Category'],
                phone: r['Tel'],
                manager: r['Manager'],
                provider: r['ProviderName'],
                region: 'Northern Ireland'
            }));
        }
        else if (forceCountry === 'scotland' || (!forceCountry && postcodeArea.match(/^[A-Z]{1,2}\d{1,2}$/))) {
            // Check if it's Scotland (common Scottish postcode areas)
            const scotlandAreas = ['AB', 'DD', 'DG', 'EH', 'FK', 'G', 'HS', 'IV', 'KA', 'KW', 'KY', 'ML', 'PA', 'PH', 'TD', 'ZE'];
            const irishAreas = ['A', 'C', 'D', 'E', 'F', 'H', 'K', 'N', 'P', 'R', 'T', 'V', 'W', 'X', 'Y'];
            if (forceCountry === 'scotland' || scotlandAreas.some(area => postcodeArea.startsWith(area))) {
                // Scotland
                region = 'Scotland';
                results = scotlandData.filter(r => {
                    const providerPostcode = r['Service_Postcode']?.toString().trim().toUpperCase() || '';
                    return providerPostcode.startsWith(postcodeArea);
                }).map(r => ({
                    source: 'Care Inspectorate',
                    name: r['ServiceName'],
                    address: [r['Address_line_1'], r['Address_line_2'], r['Address_line_3']].filter(Boolean).join(', '),
                    town: r['Service_town'],
                    postcode: r['Service_Postcode'],
                    councilArea: r['Council_Area_Name'],
                    serviceType: r['ServiceType'],
                    subtype: r['Subtype'],
                    phone: r['Service_Phone_Number'],
                    region: 'Scotland'
                }));
            }
            else if (forceCountry === 'ireland' || irishAreas.some(area => postcodeArea.startsWith(area))) {
                // Ireland (Eircode system) - extract postcode from address
                region = 'Ireland';
                results = hiqaData.filter(r => {
                    const address = r['Centre_Address']?.toString() || '';
                    // Extract Eircode from address (format: "Street, Town, EIRCODE")
                    const eircodeMatch = address.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/);
                    if (eircodeMatch) {
                        const eircode = eircodeMatch[0].replace(/\s/g, '');
                        return eircode.startsWith(postcodeArea);
                    }
                    return false;
                }).map(r => {
                    const address = r['Centre_Address']?.toString() || '';
                    const eircodeMatch = address.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/);
                    const eircode = eircodeMatch ? eircodeMatch[0] : '';
                    return {
                        source: 'HIQA',
                        name: r['Centre_Title'],
                        address: r['Centre_Address'],
                        postcode: eircode,
                        county: r['County'],
                        phone: r['Centre_Phone'],
                        personInCharge: r['Person_in_Charge'],
                        provider: r['Registration_Provider'],
                        maxOccupancy: r['Maximum_Occupancy'],
                        region: 'Ireland'
                    };
                });
            }
            else if (forceCountry === 'england') {
                // Forced England search
                region = 'England';
                try {
                    // Get postcode info first
                    const postcodeRes = await fetch(`${POSTCODES_API_BASE}/postcodes/${searchPostcode}`);
                    const postcodeData = await postcodeRes.json();
                    if (postcodeData.result) {
                        const localAuthority = postcodeData.result.admin_district;
                        // Search CQC
                        let url = `${CQC_API_BASE}/locations?localAuthority=${encodeURIComponent(localAuthority)}&perPage=50`;
                        const response = await fetch(url, {
                            headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
                        });
                        const data = await response.json();
                        if (data.locations) {
                            results = data.locations
                                .filter((loc) => loc.postalCode?.toUpperCase().startsWith(postcodeArea))
                                .map((loc) => ({
                                source: 'CQC',
                                locationId: loc.locationId,
                                name: loc.locationName,
                                postcode: loc.postalCode,
                                localAuthority: localAuthority,
                                rating: loc.overallRating,
                                region: 'England',
                                cqcUrl: `https://www.cqc.org.uk/location/${loc.locationId}`
                            }));
                        }
                    }
                }
                catch (error) {
                    console.error('Error searching CQC:', error);
                }
            }
            else {
                // England - use CQC API
                region = 'England';
                try {
                    // Get postcode info first
                    const postcodeRes = await fetch(`${POSTCODES_API_BASE}/postcodes/${searchPostcode}`);
                    const postcodeData = await postcodeRes.json();
                    if (postcodeData.result) {
                        const localAuthority = postcodeData.result.admin_district;
                        // Search CQC
                        let url = `${CQC_API_BASE}/locations?localAuthority=${encodeURIComponent(localAuthority)}&perPage=50`;
                        const response = await fetch(url, {
                            headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
                        });
                        const data = await response.json();
                        if (data.locations) {
                            results = data.locations
                                .filter((loc) => loc.postalCode?.toUpperCase().startsWith(postcodeArea))
                                .map((loc) => ({
                                source: 'CQC',
                                locationId: loc.locationId,
                                name: loc.locationName,
                                postcode: loc.postalCode,
                                localAuthority: localAuthority,
                                rating: loc.overallRating,
                                region: 'England',
                                cqcUrl: `https://www.cqc.org.uk/location/${loc.locationId}`
                            }));
                        }
                    }
                }
                catch (error) {
                    console.error('Error searching CQC:', error);
                }
            }
        }
        // Limit results
        results = results.slice(0, Number(maxResults));
        res.json({
            postcode: searchPostcode,
            postcodeArea: postcodeArea,
            region: region,
            count: results.length,
            providers: results
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// Search Scotland
app.get('/api/search/scotland', (req, res) => {
    try {
        const { name, councilArea, serviceType, maxResults = 20 } = req.query;
        let results = scotlandData;
        if (name) {
            const searchTerm = name.toLowerCase();
            results = results.filter(r => r['Service Name']?.toLowerCase().includes(searchTerm));
        }
        if (councilArea) {
            results = results.filter(r => r['Local Authority']?.toLowerCase() === councilArea.toLowerCase());
        }
        if (serviceType) {
            results = results.filter(r => r['Service Type']?.toLowerCase().includes(serviceType.toLowerCase()));
        }
        results = results.slice(0, Number(maxResults));
        res.json({
            count: results.length,
            results: results
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// Search Northern Ireland
app.get('/api/search/northern-ireland', (req, res) => {
    try {
        const { name, district, serviceType, maxResults = 20 } = req.query;
        let results = rqiaData;
        if (name) {
            const searchTerm = name.toLowerCase();
            results = results.filter(r => r['Establishment Name']?.toLowerCase().includes(searchTerm));
        }
        if (district) {
            results = results.filter(r => r['Local Government District']?.toLowerCase().includes(district.toLowerCase()));
        }
        if (serviceType) {
            results = results.filter(r => r['Service Type']?.toLowerCase().includes(serviceType.toLowerCase()));
        }
        results = results.slice(0, Number(maxResults));
        res.json({
            count: results.length,
            results: results
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// Search Ireland
app.get('/api/search/ireland', (req, res) => {
    try {
        const { name, county, maxResults = 20 } = req.query;
        let results = hiqaData;
        if (name) {
            const searchTerm = name.toLowerCase();
            results = results.filter(r => r['Centre Name']?.toLowerCase().includes(searchTerm));
        }
        if (county) {
            results = results.filter(r => r['County']?.toLowerCase() === county.toLowerCase());
        }
        results = results.slice(0, Number(maxResults));
        res.json({
            count: results.length,
            results: results
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// Helper: Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
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
            'Cambridgeshire', // Main county - includes Wisbech area
            'Peterborough',
            'East Cambridgeshire',
            'Huntingdonshire',
            'South Holland',
            'King\'s Lynn and West Norfolk'
        ];
        // Get all providers from these authorities
        let allLocations = [];
        for (const authority of authoritiesToSearch) {
            let page = 1;
            let hasMore = true;
            // Fetch all pages for this authority (limit to reasonable number)
            while (hasMore && page <= 20) {
                let url = `${CQC_API_BASE}/locations?localAuthority=${encodeURIComponent(authority)}`;
                if (careHome)
                    url += `&careHome=${careHome}`;
                if (rating)
                    url += `&overallRating=${rating}`;
                url += `&page=${page}&perPage=20`;
                const response = await fetch(url, {
                    headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
                });
                const data = await response.json();
                if (data.locations && data.locations.length > 0) {
                    allLocations = allLocations.concat(data.locations);
                    hasMore = page < data.totalPages;
                    page++;
                }
                else {
                    hasMore = false;
                }
            }
        }
        // For each location, get full details to get coordinates
        const locationsWithDistance = await Promise.all(allLocations.map(async (loc) => {
            try {
                // Get full location details which include latitude/longitude
                const detailUrl = `${CQC_API_BASE}/locations/${loc.locationId}`;
                const detailRes = await fetch(detailUrl, {
                    headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
                });
                const details = await detailRes.json();
                if (details.onspdLatitude && details.onspdLongitude) {
                    const distance = calculateDistance(centerLat, centerLon, details.onspdLatitude, details.onspdLongitude);
                    return {
                        locationId: loc.locationId,
                        locationName: loc.locationName,
                        postalCode: loc.postalCode,
                        latitude: details.onspdLatitude,
                        longitude: details.onspdLongitude,
                        distance: Math.round(distance * 10) / 10,
                        fullAddress: details.postalAddressLine1 + ', ' + details.postalAddressTownCity,
                        // Ratings
                        rating: details.currentRatings?.overall?.rating || 'Not rated',
                        ratingSafe: details.currentRatings?.safe?.rating || 'Not rated',
                        ratingEffective: details.currentRatings?.effective?.rating || 'Not rated',
                        ratingCaring: details.currentRatings?.caring?.rating || 'Not rated',
                        ratingResponsive: details.currentRatings?.responsive?.rating || 'Not rated',
                        ratingWellLed: details.currentRatings?.wellLed?.rating || 'Not rated',
                        // Contact & Details
                        phone: details.mainPhoneNumber || null,
                        website: details.website || null,
                        beds: details.numberOfBeds || null,
                        // Status & History
                        registrationStatus: details.registrationStatus,
                        registrationDate: details.registrationDate || null,
                        lastInspectionDate: details.lastInspection?.date || null,
                        // What They Do
                        serviceTypes: details.gacServiceTypes?.map((s) => s.name).join(', ') || null,
                        specialisms: details.specialisms?.map((s) => s.name).join(', ') || null,
                        // Provider Info
                        providerName: details.organisationType === 'Location' ? details.name : null,
                        // Links
                        cqcReportUrl: `https://www.cqc.org.uk/location/${loc.locationId}`
                    };
                }
                return null;
            }
            catch (error) {
                console.error(`Error fetching details for ${loc.locationId}:`, error);
                return null;
            }
        }));
        // Filter by radius, remove nulls, and exclude old deregistered homes
        // Keep homes that are either:
        // 1. Currently registered, OR
        // 2. Deregistered within last 3 months (useful to spot recent closures)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const filtered = locationsWithDistance
            .filter((loc) => {
            if (!loc || loc.distance > radiusMiles)
                return false;
            // Keep if registered
            if (loc.registrationStatus === 'Registered')
                return true;
            // Keep if deregistered recently (within 3 months)
            if (loc.registrationStatus === 'Deregistered' && loc.lastInspectionDate) {
                const lastInspection = new Date(loc.lastInspectionDate);
                return lastInspection >= threeMonthsAgo;
            }
            // Otherwise exclude
            return false;
        })
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
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// Get all Outstanding-rated care homes (England)
app.get('/api/search/outstanding', async (req, res) => {
    try {
        const { careHome = 'Y', region, maxResults = 100 } = req.query;
        // Search for Outstanding rated providers
        let url = `${CQC_API_BASE}/locations?overallRating=Outstanding`;
        if (careHome)
            url += `&careHome=${careHome}`;
        if (region)
            url += `&region=${encodeURIComponent(region)}`;
        url += `&perPage=100`;
        let allLocations = [];
        let page = 1;
        let hasMore = true;
        // Fetch multiple pages up to maxResults
        while (hasMore && allLocations.length < Number(maxResults)) {
            const pageUrl = `${url}&page=${page}`;
            const response = await fetch(pageUrl, {
                headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
            });
            const data = await response.json();
            if (data.locations && data.locations.length > 0) {
                allLocations = allLocations.concat(data.locations);
                hasMore = page < data.totalPages && allLocations.length < Number(maxResults);
                page++;
            }
            else {
                hasMore = false;
            }
        }
        // Limit to maxResults
        allLocations = allLocations.slice(0, Number(maxResults));
        // Get full details for each location
        const detailedLocations = await Promise.all(allLocations.map(async (loc) => {
            try {
                const detailUrl = `${CQC_API_BASE}/locations/${loc.locationId}`;
                const detailRes = await fetch(detailUrl, {
                    headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
                });
                const details = await detailRes.json();
                return {
                    locationId: loc.locationId,
                    locationName: loc.locationName,
                    postalCode: loc.postalCode,
                    localAuthority: details.localAuthority,
                    region: details.region,
                    latitude: details.onspdLatitude,
                    longitude: details.onspdLongitude,
                    fullAddress: details.postalAddressLine1 + ', ' + details.postalAddressTownCity,
                    // Ratings
                    rating: details.currentRatings?.overall?.rating || 'Not rated',
                    ratingSafe: details.currentRatings?.safe?.rating || 'Not rated',
                    ratingEffective: details.currentRatings?.effective?.rating || 'Not rated',
                    ratingCaring: details.currentRatings?.caring?.rating || 'Not rated',
                    ratingResponsive: details.currentRatings?.responsive?.rating || 'Not rated',
                    ratingWellLed: details.currentRatings?.wellLed?.rating || 'Not rated',
                    // Contact & Details
                    phone: details.mainPhoneNumber || null,
                    website: details.website || null,
                    beds: details.numberOfBeds || null,
                    // Status & History
                    registrationStatus: details.registrationStatus,
                    registrationDate: details.registrationDate || null,
                    lastInspectionDate: details.lastInspection?.date || null,
                    // What They Do
                    serviceTypes: details.gacServiceTypes?.map((s) => s.name).join(', ') || null,
                    specialisms: details.specialisms?.map((s) => s.name).join(', ') || null,
                    // Provider Info
                    providerName: details.organisationType === 'Location' ? details.name : null,
                    // Links
                    cqcReportUrl: `https://www.cqc.org.uk/location/${loc.locationId}`
                };
            }
            catch (error) {
                console.error(`Error fetching details for ${loc.locationId}:`, error);
                return null;
            }
        }));
        // Filter out nulls and only keep registered
        const filtered = detailedLocations
            .filter((loc) => loc !== null && loc.registrationStatus === 'Registered');
        // Group by region if no region filter specified
        if (!region) {
            const byRegion = {};
            filtered.forEach(loc => {
                const r = loc.region || 'Unknown';
                if (!byRegion[r])
                    byRegion[r] = [];
                byRegion[r].push(loc);
            });
            res.json({
                total: filtered.length,
                byRegion: Object.entries(byRegion).map(([region, locations]) => ({
                    region,
                    count: locations.length,
                    locations
                })).sort((a, b) => b.count - a.count)
            });
        }
        else {
            res.json({
                total: filtered.length,
                region: region,
                locations: filtered
            });
        }
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// 1. At-Risk Homes (Requires Improvement / Inadequate)
app.get('/api/search/at-risk', async (req, res) => {
    try {
        const { careHome = 'Y', region, rating, maxResults = 100 } = req.query;
        const ratings = rating ? [rating] : ['Requires improvement', 'Inadequate'];
        let allLocations = [];
        for (const r of ratings) {
            let url = `${CQC_API_BASE}/locations?overallRating=${encodeURIComponent(r)}`;
            if (careHome)
                url += `&careHome=${careHome}`;
            if (region)
                url += `&region=${encodeURIComponent(region)}`;
            url += `&perPage=100`;
            let page = 1;
            let hasMore = true;
            while (hasMore && allLocations.length < Number(maxResults)) {
                const response = await fetch(`${url}&page=${page}`, {
                    headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
                });
                const data = await response.json();
                if (data.locations && data.locations.length > 0) {
                    allLocations = allLocations.concat(data.locations);
                    hasMore = page < data.totalPages;
                    page++;
                }
                else {
                    hasMore = false;
                }
            }
        }
        allLocations = allLocations.slice(0, Number(maxResults));
        const detailedLocations = await Promise.all(allLocations.map(async (loc) => {
            try {
                const detailRes = await fetch(`${CQC_API_BASE}/locations/${loc.locationId}`, {
                    headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
                });
                const details = await detailRes.json();
                return {
                    locationId: loc.locationId,
                    locationName: loc.locationName,
                    postalCode: loc.postalCode,
                    localAuthority: details.localAuthority,
                    region: details.region,
                    fullAddress: details.postalAddressLine1 + ', ' + details.postalAddressTownCity,
                    rating: details.currentRatings?.overall?.rating || 'Not rated',
                    phone: details.mainPhoneNumber || null,
                    beds: details.numberOfBeds || null,
                    registrationStatus: details.registrationStatus,
                    lastInspectionDate: details.lastInspection?.date || null,
                    providerName: details.name || null,
                    cqcReportUrl: `https://www.cqc.org.uk/location/${loc.locationId}`
                };
            }
            catch (error) {
                return null;
            }
        }));
        const filtered = detailedLocations.filter((loc) => loc !== null && loc.registrationStatus === 'Registered');
        res.json({
            total: filtered.length,
            locations: filtered.sort((a, b) => {
                if (a.rating === 'Inadequate' && b.rating !== 'Inadequate')
                    return -1;
                if (a.rating !== 'Inadequate' && b.rating === 'Inadequate')
                    return 1;
                return 0;
            })
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// 2. Recently Inspected Homes
app.get('/api/search/recent-inspections', async (req, res) => {
    try {
        const { days = 30, careHome = 'Y', region, maxResults = 100 } = req.query;
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - Number(days));
        let url = `${CQC_API_BASE}/locations?`;
        if (careHome)
            url += `careHome=${careHome}&`;
        if (region)
            url += `region=${encodeURIComponent(region)}&`;
        url += `perPage=100`;
        let allLocations = [];
        let page = 1;
        while (allLocations.length < Number(maxResults) && page <= 10) {
            const response = await fetch(`${url}&page=${page}`, {
                headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
            });
            const data = await response.json();
            if (data.locations && data.locations.length > 0) {
                allLocations = allLocations.concat(data.locations);
                page++;
            }
            else {
                break;
            }
        }
        const recentlyInspected = allLocations.filter(loc => {
            if (!loc.lastInspection?.date)
                return false;
            const inspectionDate = new Date(loc.lastInspection.date);
            return inspectionDate >= daysAgo;
        });
        res.json({
            total: recentlyInspected.length,
            daysAgo: Number(days),
            locations: recentlyInspected.slice(0, Number(maxResults)).map(loc => ({
                locationId: loc.locationId,
                locationName: loc.locationName,
                postalCode: loc.postalCode,
                region: loc.region,
                rating: loc.overallRating,
                lastInspectionDate: loc.lastInspection?.date,
                cqcReportUrl: `https://www.cqc.org.uk/location/${loc.locationId}`
            }))
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// 3. Large Capacity Homes
app.get('/api/search/large-homes', async (req, res) => {
    try {
        const { minBeds = 50, careHome = 'Y', region, rating, maxResults = 100 } = req.query;
        let url = `${CQC_API_BASE}/locations?`;
        if (careHome)
            url += `careHome=${careHome}&`;
        if (region)
            url += `region=${encodeURIComponent(region)}&`;
        if (rating)
            url += `overallRating=${rating}&`;
        url += `perPage=100`;
        let allLocations = [];
        let page = 1;
        while (page <= 10) {
            const response = await fetch(`${url}&page=${page}`, {
                headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
            });
            const data = await response.json();
            if (data.locations && data.locations.length > 0) {
                allLocations = allLocations.concat(data.locations);
                page++;
            }
            else {
                break;
            }
        }
        const detailedLocations = await Promise.all(allLocations.slice(0, 200).map(async (loc) => {
            try {
                const detailRes = await fetch(`${CQC_API_BASE}/locations/${loc.locationId}`, {
                    headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
                });
                const details = await detailRes.json();
                if (details.numberOfBeds >= Number(minBeds)) {
                    return {
                        locationId: loc.locationId,
                        locationName: loc.locationName,
                        postalCode: loc.postalCode,
                        localAuthority: details.localAuthority,
                        region: details.region,
                        beds: details.numberOfBeds,
                        rating: details.currentRatings?.overall?.rating,
                        phone: details.mainPhoneNumber,
                        registrationStatus: details.registrationStatus,
                        providerName: details.name,
                        cqcReportUrl: `https://www.cqc.org.uk/location/${loc.locationId}`
                    };
                }
                return null;
            }
            catch (error) {
                return null;
            }
        }));
        const filtered = detailedLocations
            .filter((loc) => loc !== null && loc.registrationStatus === 'Registered')
            .sort((a, b) => (b.beds || 0) - (a.beds || 0))
            .slice(0, Number(maxResults));
        res.json({
            total: filtered.length,
            minBeds: Number(minBeds),
            locations: filtered
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// 4. New Registrations
app.get('/api/search/new-registrations', async (req, res) => {
    try {
        const { months = 6, careHome = 'Y', region, maxResults = 100 } = req.query;
        const monthsAgo = new Date();
        monthsAgo.setMonth(monthsAgo.getMonth() - Number(months));
        let url = `${CQC_API_BASE}/locations?`;
        if (careHome)
            url += `careHome=${careHome}&`;
        if (region)
            url += `region=${encodeURIComponent(region)}&`;
        url += `perPage=100`;
        let allLocations = [];
        let page = 1;
        while (page <= 10) {
            const response = await fetch(`${url}&page=${page}`, {
                headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
            });
            const data = await response.json();
            if (data.locations && data.locations.length > 0) {
                allLocations = allLocations.concat(data.locations);
                page++;
            }
            else {
                break;
            }
        }
        const detailedLocations = await Promise.all(allLocations.slice(0, 200).map(async (loc) => {
            try {
                const detailRes = await fetch(`${CQC_API_BASE}/locations/${loc.locationId}`, {
                    headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
                });
                const details = await detailRes.json();
                if (details.registrationDate) {
                    const regDate = new Date(details.registrationDate);
                    if (regDate >= monthsAgo) {
                        return {
                            locationId: loc.locationId,
                            locationName: loc.locationName,
                            postalCode: loc.postalCode,
                            localAuthority: details.localAuthority,
                            region: details.region,
                            registrationDate: details.registrationDate,
                            beds: details.numberOfBeds,
                            rating: details.currentRatings?.overall?.rating || 'Not rated',
                            providerName: details.name,
                            cqcReportUrl: `https://www.cqc.org.uk/location/${loc.locationId}`
                        };
                    }
                }
                return null;
            }
            catch (error) {
                return null;
            }
        }));
        const filtered = detailedLocations
            .filter((loc) => loc !== null)
            .sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime())
            .slice(0, Number(maxResults));
        res.json({
            total: filtered.length,
            monthsAgo: Number(months),
            locations: filtered
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// 5. Provider Portfolio
app.get('/api/provider/portfolio', async (req, res) => {
    try {
        const { providerName, providerId } = req.query;
        if (!providerName && !providerId) {
            return res.status(400).json({ error: 'providerName or providerId is required' });
        }
        let url = `${CQC_API_BASE}/locations?perPage=100`;
        if (providerId)
            url += `&providerId=${providerId}`;
        let allLocations = [];
        let page = 1;
        while (page <= 20) {
            const response = await fetch(`${url}&page=${page}`, {
                headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
            });
            const data = await response.json();
            if (data.locations && data.locations.length > 0) {
                allLocations = allLocations.concat(data.locations);
                page++;
            }
            else {
                break;
            }
        }
        if (providerName) {
            allLocations = allLocations.filter(loc => loc.organisationName?.toLowerCase().includes(providerName.toLowerCase()));
        }
        const detailedLocations = await Promise.all(allLocations.map(async (loc) => {
            try {
                const detailRes = await fetch(`${CQC_API_BASE}/locations/${loc.locationId}`, {
                    headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
                });
                const details = await detailRes.json();
                return {
                    locationId: loc.locationId,
                    locationName: loc.locationName,
                    postalCode: loc.postalCode,
                    localAuthority: details.localAuthority,
                    region: details.region,
                    beds: details.numberOfBeds,
                    rating: details.currentRatings?.overall?.rating,
                    registrationStatus: details.registrationStatus,
                    lastInspectionDate: details.lastInspection?.date,
                    cqcReportUrl: `https://www.cqc.org.uk/location/${loc.locationId}`
                };
            }
            catch (error) {
                return null;
            }
        }));
        const filtered = detailedLocations.filter((loc) => loc !== null);
        const stats = {
            totalLocations: filtered.length,
            totalBeds: filtered.reduce((sum, loc) => sum + (loc.beds || 0), 0),
            registeredCount: filtered.filter(l => l.registrationStatus === 'Registered').length,
            ratingBreakdown: {
                Outstanding: filtered.filter(l => l.rating === 'Outstanding').length,
                Good: filtered.filter(l => l.rating === 'Good').length,
                'Requires improvement': filtered.filter(l => l.rating === 'Requires improvement').length,
                Inadequate: filtered.filter(l => l.rating === 'Inadequate').length,
                'Not rated': filtered.filter(l => l.rating === 'Not rated').length
            }
        };
        res.json({ provider: providerName || providerId, stats, locations: filtered });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// 6. Service Type Analysis
app.get('/api/analyze/services', async (req, res) => {
    try {
        const { serviceType, region, rating, maxResults = 100 } = req.query;
        if (!serviceType) {
            return res.status(400).json({ error: 'serviceType is required (e.g., "Dementia", "Learning disabilities")' });
        }
        let url = `${CQC_API_BASE}/locations?careHome=Y&perPage=100`;
        if (region)
            url += `&region=${encodeURIComponent(region)}`;
        if (rating)
            url += `&overallRating=${rating}`;
        let allLocations = [];
        let page = 1;
        while (page <= 10) {
            const response = await fetch(`${url}&page=${page}`, {
                headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
            });
            const data = await response.json();
            if (data.locations && data.locations.length > 0) {
                allLocations = allLocations.concat(data.locations);
                page++;
            }
            else {
                break;
            }
        }
        const detailedLocations = await Promise.all(allLocations.slice(0, 200).map(async (loc) => {
            try {
                const detailRes = await fetch(`${CQC_API_BASE}/locations/${loc.locationId}`, {
                    headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY }
                });
                const details = await detailRes.json();
                const hasService = details.specialisms?.some((s) => s.name?.toLowerCase().includes(serviceType.toLowerCase())) || details.gacServiceTypes?.some((s) => s.name?.toLowerCase().includes(serviceType.toLowerCase()));
                if (hasService) {
                    return {
                        locationId: loc.locationId,
                        locationName: loc.locationName,
                        postalCode: loc.postalCode,
                        localAuthority: details.localAuthority,
                        region: details.region,
                        beds: details.numberOfBeds,
                        rating: details.currentRatings?.overall?.rating,
                        serviceTypes: details.gacServiceTypes?.map((s) => s.name).join(', '),
                        specialisms: details.specialisms?.map((s) => s.name).join(', '),
                        phone: details.mainPhoneNumber,
                        registrationStatus: details.registrationStatus,
                        cqcReportUrl: `https://www.cqc.org.uk/location/${loc.locationId}`
                    };
                }
                return null;
            }
            catch (error) {
                return null;
            }
        }));
        const filtered = detailedLocations
            .filter((loc) => loc !== null && loc.registrationStatus === 'Registered')
            .slice(0, Number(maxResults));
        res.json({ serviceType, total: filtered.length, locations: filtered });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// 7. Compare Regions
app.get('/api/compare/regions', async (req, res) => {
    try {
        const { careHome = 'Y' } = req.query;
        const regions = [
            'London', 'South East', 'South West', 'East of England',
            'West Midlands', 'East Midlands', 'Yorkshire and the Humber',
            'North West', 'North East'
        ];
        const regionStats = await Promise.all(regions.map(async (region) => {
            try {
                const response = await fetch(`${CQC_API_BASE}/locations?region=${encodeURIComponent(region)}&careHome=${careHome}&perPage=1`, { headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY } });
                const data = await response.json();
                const ratings = await Promise.all(['Outstanding', 'Good', 'Requires improvement', 'Inadequate'].map(async (rating) => {
                    const ratingRes = await fetch(`${CQC_API_BASE}/locations?region=${encodeURIComponent(region)}&careHome=${careHome}&overallRating=${rating}&perPage=1`, { headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY } });
                    const ratingData = await ratingRes.json();
                    return { rating, count: ratingData.total || 0 };
                }));
                return {
                    region,
                    totalHomes: data.total || 0,
                    ratings: ratings.reduce((acc, r) => ({ ...acc, [r.rating]: r.count }), {})
                };
            }
            catch (error) {
                return { region, totalHomes: 0, ratings: {} };
            }
        }));
        res.json({ regions: regionStats.sort((a, b) => b.totalHomes - a.totalHomes) });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// 8. Compare Local Authorities
app.get('/api/compare/authorities', async (req, res) => {
    try {
        const { authorities, careHome = 'Y' } = req.query;
        if (!authorities) {
            return res.status(400).json({ error: 'authorities parameter required (comma-separated list)' });
        }
        const authorityList = authorities.split(',').map(a => a.trim());
        const authorityStats = await Promise.all(authorityList.map(async (authority) => {
            try {
                const response = await fetch(`${CQC_API_BASE}/locations?localAuthority=${encodeURIComponent(authority)}&careHome=${careHome}&perPage=1`, { headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY } });
                const data = await response.json();
                const ratings = await Promise.all(['Outstanding', 'Good', 'Requires improvement', 'Inadequate'].map(async (rating) => {
                    const ratingRes = await fetch(`${CQC_API_BASE}/locations?localAuthority=${encodeURIComponent(authority)}&careHome=${careHome}&overallRating=${rating}&perPage=1`, { headers: { 'Ocp-Apim-Subscription-Key': CQC_SUBSCRIPTION_KEY } });
                    const ratingData = await ratingRes.json();
                    return { rating, count: ratingData.total || 0 };
                }));
                return {
                    localAuthority: authority,
                    totalHomes: data.total || 0,
                    ratings: ratings.reduce((acc, r) => ({ ...acc, [r.rating]: r.count }), {})
                };
            }
            catch (error) {
                return { localAuthority: authority, totalHomes: 0, ratings: {} };
            }
        }));
        res.json({ authorities: authorityStats });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// Start server
initializeData();
app.listen(PORT, () => {
    console.log(`MGC Care Finder HTTP API v2.0.0`);
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
//# sourceMappingURL=http-server.js.map