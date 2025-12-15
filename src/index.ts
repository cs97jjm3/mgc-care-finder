#!/usr/bin/env node

/**
 * Care Provider Finder (UK & Ireland) MCP Server
 * 
 * Find and compare care providers across UK & Ireland regulators:
 * - CQC (England) - Real-time API ✅
 * - Care Inspectorate Scotland - Bundled CSV ✅
 * - Care Inspectorate Wales - Awaiting open data 🚧
 * - RQIA (Northern Ireland) - Bundled CSV ✅
 * - HIQA (Ireland) - Bundled CSV ✅
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// Configuration
// =============================================================================

// CQC API (England) - Real-time
const CQC_API_BASE = "https://api.service.cqc.org.uk/public/v1";
const CQC_SUBSCRIPTION_KEY = "03d541ef28dd4861894343d518c8c5fd";

// Postcodes.io - Free UK postcode lookup
const POSTCODES_API_BASE = "https://api.postcodes.io";

// Data directory for bundled CSVs
const DATA_DIR = path.join(__dirname, "..", "data");

// Data freshness - warn if older than this (days)
const STALE_WARNING_DAYS = 60;

// =============================================================================
// Types
// =============================================================================

interface DataTimestamps {
  hiqa?: string;
  rqia?: string;
  scotland?: string;
  wales?: string;
}

interface PostcodeResult {
  postcode: string;
  admin_district: string;
  admin_county: string | null;
  region: string;
  country: string;
  parliamentary_constituency: string;
  latitude: number;
  longitude: number;
}

interface CQCLocation {
  locationId: string;
  name: string;
  postalCode: string;
  postalAddressLine1?: string;
  postalAddressTownCity?: string;
  localAuthority: string;
  region: string;
  type: string;
  registrationStatus: string;
  mainPhoneNumber?: string;
  careHome?: string;
  currentRatings?: {
    overall?: { rating: string };
    safe?: { rating: string };
    effective?: { rating: string };
    caring?: { rating: string };
    responsive?: { rating: string };
    wellLed?: { rating: string };
  };
  lastInspection?: { date: string };
  gacServiceTypes?: Array<{ name: string }>;
  specialisms?: Array<{ name: string }>;
  regulatedActivities?: Array<{ name: string }>;
}

interface HIQAProvider {
  id: string;
  name: string;
  address: string;
  county: string;
  beds: number;
  phone: string;
  personInCharge: string;
  providerName: string;
  registrationDate: string;
  expiryDate: string;
  registrationNumber: string;
}

interface RQIAProvider {
  serviceName: string;
  serviceType: string;
  address: string;
  postcode: string;
  phone: string;
  providerName: string;
  localGovernmentDistrict: string;
  lastInspectionDate: string;
}

interface ScotlandProvider {
  serviceNumber: string;
  serviceName: string;
  serviceType: string;
  subtype: string;
  address: string;
  postcode: string;
  councilArea: string;
  phone: string;
  providerName: string;
  registrationDate: string;
  grades: {
    care?: number;
    environment?: number;
    staffing?: number;
    management?: number;
  };
}

// =============================================================================
// Data Loading & Timestamps
// =============================================================================

let dataTimestamps: DataTimestamps = {};
let hiqaData: HIQAProvider[] = [];
let rqiaData: RQIAProvider[] = [];
let scotlandData: ScotlandProvider[] = [];

function loadTimestamps(): DataTimestamps {
  const timestampFile = path.join(DATA_DIR, "timestamps.json");
  if (fs.existsSync(timestampFile)) {
    return JSON.parse(fs.readFileSync(timestampFile, "utf-8"));
  }
  return {};
}

function getDaysOld(isoDate: string | undefined): number {
  if (!isoDate) return Infinity;
  const date = new Date(isoDate);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDataAge(isoDate: string | undefined): string {
  if (!isoDate) return "Not available";
  const daysOld = getDaysOld(isoDate);
  const date = new Date(isoDate);
  const formatted = date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  
  if (daysOld > STALE_WARNING_DAYS) {
    return `${formatted} (${daysOld} days old) ⚠️`;
  }
  return `${formatted} (${daysOld} days old)`;
}

function parseCSV(content: string): string[][] {
  const lines: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current || row.length > 0) {
        row.push(current.trim());
        if (row.some(cell => cell !== "")) {
          lines.push(row);
        }
        row = [];
        current = "";
      }
      if (char === "\r" && content[i + 1] === "\n") {
        i++;
      }
    } else {
      current += char;
    }
  }
  
  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.some(cell => cell !== "")) {
      lines.push(row);
    }
  }
  
  return lines;
}

function loadHIQAData(): void {
  const filePath = path.join(DATA_DIR, "hiqa.csv");
  if (!fs.existsSync(filePath)) {
    console.error("HIQA data file not found:", filePath);
    return;
  }
  
  const content = fs.readFileSync(filePath, "utf-8");
  const rows = parseCSV(content);
  
  // Skip header row
  hiqaData = rows.slice(1).map(row => ({
    id: row[0] || "",
    name: row[1] || "",
    address: row[2] || "",
    county: row[3] || "",
    beds: parseInt(row[4]) || 0,
    phone: row[5] || "",
    personInCharge: row[6] || "",
    providerName: row[8] || "",
    registrationDate: row[11] || "",
    expiryDate: row[12] || "",
    registrationNumber: row[16] || ""
  })).filter(p => p.name);
  
  console.error(`Loaded ${hiqaData.length} HIQA providers`);
}

function loadRQIAData(): void {
  const filePath = path.join(DATA_DIR, "rqia.xlsx");
  if (!fs.existsSync(filePath)) {
    console.error("RQIA data file not found:", filePath);
    return;
  }
  
  try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);
    
    rqiaData = rows.map(row => {
      // Find columns by partial match (RQIA column names vary)
      const getValue = (keys: string[]): string => {
        for (const key of Object.keys(row)) {
          const keyLower = key.toLowerCase();
          for (const search of keys) {
            if (keyLower.includes(search.toLowerCase())) {
              return String(row[key] || "");
            }
          }
        }
        return "";
      };
      
      return {
        serviceName: getValue(["service name", "servicename", "name"]),
        serviceType: getValue(["service type", "servicetype", "category"]),
        address: getValue(["address"]),
        postcode: getValue(["postcode", "post code"]),
        phone: getValue(["phone", "telephone", "tel"]),
        providerName: getValue(["provider", "registered provider"]),
        localGovernmentDistrict: getValue(["town", "district", "lgd", "local government", "council"]),
        lastInspectionDate: getValue(["inspection", "inspected", "last inspected"])
      };
    }).filter(p => p.serviceName);
    
    console.error(`Loaded ${rqiaData.length} RQIA providers`);
  } catch (error) {
    console.error("Error loading RQIA xlsx:", error);
  }
}

function loadScotlandData(): void {
  const filePath = path.join(DATA_DIR, "scotland.csv");
  if (!fs.existsSync(filePath)) {
    console.error("Scotland data file not found:", filePath);
    return;
  }
  
  const content = fs.readFileSync(filePath, "utf-8");
  const rows = parseCSV(content);
  
  // Scotland datastore has specific column names
  const header = rows[0] || [];
  const getColIndex = (exactNames: string[]) => {
    for (const name of exactNames) {
      const idx = header.findIndex(h => h.toLowerCase() === name.toLowerCase());
      if (idx >= 0) return idx;
    }
    // Fallback to partial match
    for (const name of exactNames) {
      const idx = header.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  
  // Map to actual column names in Care Inspectorate datastore
  const numCol = getColIndex(["CSNumber", "csnumber"]);
  const nameCol = getColIndex(["ServiceName", "Service_Name"]);
  const typeCol = getColIndex(["CareService", "ServiceType", "Service_Type"]);
  const subtypeCol = getColIndex(["Subtype", "Sub_Type"]);
  const addr1Col = getColIndex(["Address_line_1", "Address"]);
  const townCol = getColIndex(["Service_town", "Town"]);
  const postcodeCol = getColIndex(["Service_Postcode", "Postcode"]);
  const councilCol = getColIndex(["Council_Area_Name", "Council_Area", "LocalAuthority"]);
  const phoneCol = getColIndex(["Service_Phone_Number", "Phone", "Telephone"]);
  const providerCol = getColIndex(["ServiceProvider", "Service_Provider", "Provider"]);
  const regDateCol = getColIndex(["Date_Reg", "DateReg", "Registration_Date"]);
  const statusCol = getColIndex(["ServiceStatus", "Status"]);
  
  // Filter to active services only, then map
  const activeRows = rows.slice(1).filter(row => {
    const status = (row[statusCol] || "").toLowerCase();
    return !status || status === "active";
  });
  
  scotlandData = activeRows.map(row => {
    // Combine address parts
    const addr1 = row[addr1Col] || "";
    const town = row[townCol] || "";
    const address = [addr1, town].filter(Boolean).join(", ");
    
    return {
      serviceNumber: row[numCol] || "",
      serviceName: row[nameCol] || "",
      serviceType: row[typeCol] || "",
      subtype: row[subtypeCol] || "",
      address: address,
      postcode: row[postcodeCol] || "",
      councilArea: row[councilCol] || "",
      phone: row[phoneCol] || "",
      providerName: row[providerCol] || "",
      registrationDate: row[regDateCol] || "",
      grades: {}
    };
  }).filter(p => p.serviceName);
  
  console.error(`Loaded ${scotlandData.length} Scotland providers`);
}

function initializeData(): void {
  dataTimestamps = loadTimestamps();
  loadHIQAData();
  loadRQIAData();
  loadScotlandData();
}

// =============================================================================
// API Helpers
// =============================================================================

async function lookupPostcode(postcode: string): Promise<PostcodeResult | null> {
  const cleanPostcode = postcode.replace(/\s/g, "").toUpperCase();
  const url = `${POSTCODES_API_BASE}/postcodes/${cleanPostcode}`;
  
  const response = await fetch(url);
  if (!response.ok) return null;
  
  const data = await response.json();
  return data.result;
}

async function cqcRequest(endpoint: string, params: Record<string, string | number | undefined> = {}): Promise<unknown> {
  const url = new URL(`${CQC_API_BASE}${endpoint}`);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.append(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "User-Agent": "UK-Healthcare-Research-MCP/2.0.0",
      "Ocp-Apim-Subscription-Key": CQC_SUBSCRIPTION_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`CQC API error: ${response.status}`);
  }

  return response.json();
}

async function getLocationDetails(locationId: string): Promise<CQCLocation> {
  return await cqcRequest(`/locations/${locationId}`) as CQCLocation;
}

async function enrichLocations(locationIds: string[], maxConcurrent: number = 10): Promise<CQCLocation[]> {
  const results: CQCLocation[] = [];
  
  for (let i = 0; i < locationIds.length; i += maxConcurrent) {
    const batch = locationIds.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(id => getLocationDetails(id).catch(() => null))
    );
    results.push(...batchResults.filter((r): r is CQCLocation => r !== null));
  }
  
  return results;
}

// =============================================================================
// Tool Definitions
// =============================================================================

const tools: Tool[] = [
  {
    name: "search_care_providers",
    description: `Search CQC registered care providers in England.
    
Filters by:
- Local authority name (e.g., "Merton", "Cambridgeshire")
- Region (e.g., "London", "East")
- Rating: Outstanding, Good, Requires improvement, Inadequate
- Care home: Y for care homes, N for domiciliary/other services

Returns provider details including ratings, inspection dates, and contact information.`,
    inputSchema: {
      type: "object",
      properties: {
        localAuthority: {
          type: "string",
          description: "Filter by local authority name (e.g., 'Cambridgeshire', 'Merton')"
        },
        region: {
          type: "string",
          description: "Filter by region (e.g., 'London', 'East', 'North West')"
        },
        rating: {
          type: "string",
          enum: ["Outstanding", "Good", "Requires improvement", "Inadequate"],
          description: "Filter by overall CQC rating"
        },
        careHome: {
          type: "string",
          enum: ["Y", "N"],
          description: "Y for care homes only, N for domiciliary care/other services"
        },
        page: { type: "number", description: "Page number (default 1)", default: 1 },
        perPage: { type: "number", description: "Results per page (default 20, max 50)", default: 20 }
      }
    }
  },
  {
    name: "search_by_postcode",
    description: `Search for care providers near a UK postcode.
    
Converts postcode to local authority using postcodes.io, then searches CQC.
Returns providers in that local authority, filtered to match the postcode area.

Example: "PE13 2PR" finds providers in Fenland local authority with PE13 postcodes.`,
    inputSchema: {
      type: "object",
      properties: {
        postcode: { type: "string", description: "UK postcode (e.g., 'PE13 2PR', 'SW1A 1AA')" },
        careHome: { type: "string", enum: ["Y", "N"], description: "Y for care homes, N for domiciliary care" },
        rating: { type: "string", enum: ["Outstanding", "Good", "Requires improvement", "Inadequate"] },
        perPage: { type: "number", description: "Maximum results (default 20)", default: 20 }
      },
      required: ["postcode"]
    }
  },
  {
    name: "get_provider_details",
    description: `Get detailed information about a specific CQC registered location.
    
Returns full address, ratings across all 5 key questions, regulated activities, service types, and inspection history.`,
    inputSchema: {
      type: "object",
      properties: {
        locationId: { type: "string", description: "The CQC location ID (e.g., '1-123456789')" }
      },
      required: ["locationId"]
    }
  },
  {
    name: "get_ratings_summary",
    description: `Get a summary of CQC ratings for providers in an area.
    
Useful for market analysis - shows distribution of Outstanding/Good/Requires improvement/Inadequate ratings.`,
    inputSchema: {
      type: "object",
      properties: {
        localAuthority: { type: "string", description: "Local authority name" },
        region: { type: "string", description: "Region name" },
        careHome: { type: "string", enum: ["Y", "N"], description: "Y for care homes, N for other services" }
      }
    }
  },
  {
    name: "lookup_postcode",
    description: `Look up details for a UK postcode using postcodes.io.
    
Returns local authority, region, constituency, and coordinates.
Useful for finding the correct local authority name to use in searches.`,
    inputSchema: {
      type: "object",
      properties: {
        postcode: { type: "string", description: "UK postcode to look up" }
      },
      required: ["postcode"]
    }
  },
  {
    name: "search_ireland",
    description: `Search HIQA registered nursing homes in Ireland.
    
Filter by county (e.g., "Dublin", "Cork", "Galway").
Returns nursing home details including beds, provider, and registration status.

Data source: HIQA nursing homes register (bundled, updated periodically).`,
    inputSchema: {
      type: "object",
      properties: {
        county: { type: "string", description: "Irish county (e.g., 'Dublin', 'Cork', 'Galway')" },
        name: { type: "string", description: "Search by name (partial match)" },
        maxResults: { type: "number", description: "Maximum results (default 20)", default: 20 }
      }
    }
  },
  {
    name: "search_northern_ireland",
    description: `Search RQIA registered care services in Northern Ireland.
    
Filter by service type (Nursing Home, Residential Care Home, Domiciliary Care Agency, etc.).
Returns service details including provider and last inspection date.

Data source: RQIA Register of Services (bundled, updated periodically).`,
    inputSchema: {
      type: "object",
      properties: {
        serviceType: { 
          type: "string", 
          description: "Service type (e.g., 'Nursing Home', 'Residential Care Home', 'Domiciliary Care Agency')" 
        },
        district: { type: "string", description: "Local government district" },
        name: { type: "string", description: "Search by name (partial match)" },
        maxResults: { type: "number", description: "Maximum results (default 20)", default: 20 }
      }
    }
  },
  {
    name: "search_scotland",
    description: `Search Care Inspectorate registered services in Scotland.
    
Filter by service type and council area.
Returns service details including grades.

Data source: Care Inspectorate Scotland datastore (bundled, updated periodically).`,
    inputSchema: {
      type: "object",
      properties: {
        serviceType: { 
          type: "string", 
          description: "Service type (e.g., 'Care Home Service', 'Housing Support Service')" 
        },
        councilArea: { type: "string", description: "Council area (e.g., 'Edinburgh', 'Glasgow')" },
        name: { type: "string", description: "Search by name (partial match)" },
        maxResults: { type: "number", description: "Maximum results (default 20)", default: 20 }
      }
    }
  },
  {
    name: "search_wales",
    description: `Wales care provider information and guidance.
    
Note: Automated search not available - CIW does not provide open data access (no API or downloadable dataset). This tool provides information on how to find Wales care providers manually and explains when Wales support will be added.`,
    inputSchema: {
      type: "object",
      properties: {
        localAuthority: { type: "string", description: "Local authority (e.g., 'Cardiff', 'Swansea')" },
        serviceType: { type: "string", description: "Service type" },
        name: { type: "string", description: "Search by name" }
      }
    }
  },
  {
    name: "check_data_freshness",
    description: `Shows when each country's data was last updated and how to download fresh data.
    
England (CQC) uses a live API. Other countries use bundled CSV data.
Includes download instructions for users who want to update data themselves.`,
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

// =============================================================================
// Tool Handlers
// =============================================================================

function formatCQCLocation(loc: CQCLocation): string {
  const lines: string[] = [];
  
  lines.push(`**${loc.name || "Unknown Provider"}**`);
  lines.push(`Location ID: ${loc.locationId}`);
  if (loc.type) lines.push(`Type: ${loc.type}`);
  if (loc.registrationStatus) lines.push(`Status: ${loc.registrationStatus}`);
  
  const addressParts: string[] = [];
  if (loc.postalAddressLine1) addressParts.push(loc.postalAddressLine1);
  if (loc.postalAddressTownCity) addressParts.push(loc.postalAddressTownCity);
  if (loc.postalCode) addressParts.push(loc.postalCode);
  if (addressParts.length > 0) lines.push(`Address: ${addressParts.join(", ")}`);
  
  if (loc.localAuthority) lines.push(`Local Authority: ${loc.localAuthority}`);
  if (loc.region) lines.push(`Region: ${loc.region}`);
  if (loc.mainPhoneNumber) lines.push(`Phone: ${loc.mainPhoneNumber}`);
  
  if (loc.currentRatings?.overall) {
    lines.push(`\n**CQC Ratings:**`);
    lines.push(`  Overall: ${loc.currentRatings.overall.rating}`);
    if (loc.currentRatings.safe) lines.push(`  Safe: ${loc.currentRatings.safe.rating}`);
    if (loc.currentRatings.effective) lines.push(`  Effective: ${loc.currentRatings.effective.rating}`);
    if (loc.currentRatings.caring) lines.push(`  Caring: ${loc.currentRatings.caring.rating}`);
    if (loc.currentRatings.responsive) lines.push(`  Responsive: ${loc.currentRatings.responsive.rating}`);
    if (loc.currentRatings.wellLed) lines.push(`  Well-Led: ${loc.currentRatings.wellLed.rating}`);
  }
  
  if (loc.lastInspection?.date) lines.push(`\nLast Inspection: ${loc.lastInspection.date}`);
  if (loc.gacServiceTypes?.length) lines.push(`Service Types: ${loc.gacServiceTypes.map(s => s.name).join(", ")}`);
  if (loc.specialisms?.length) lines.push(`Specialisms: ${loc.specialisms.map(s => s.name).join(", ")}`);
  
  return lines.join("\n");
}

async function handleSearchCareProviders(args: Record<string, unknown>): Promise<string> {
  const params: Record<string, string | number | undefined> = {
    page: (args.page as number) || 1,
    perPage: Math.min((args.perPage as number) || 20, 50)
  };

  if (args.careHome) params.careHome = String(args.careHome);
  if (args.region) params.region = String(args.region);
  if (args.localAuthority) params.localAuthority = String(args.localAuthority);
  if (args.rating) params.overallRating = String(args.rating);

  const data = await cqcRequest("/locations", params) as { total: number; page: number; totalPages: number; locations: Array<{ locationId: string }> };
  
  let result = `**CQC Search Results (England)**\n`;
  result += `Data source: CQC API (Live) ✅\n`;
  result += `Found ${data.total} providers (page ${data.page} of ${data.totalPages})\n`;
  
  if (data.locations.length === 0) {
    result += "\nNo providers found matching your criteria.";
    return result;
  }
  
  const locationIds = data.locations.map(loc => loc.locationId);
  const enrichedLocations = await enrichLocations(locationIds);
  const registered = enrichedLocations.filter(loc => loc.registrationStatus === "Registered");
  
  if (registered.length === 0) {
    result += "\nNo currently registered providers found.";
  } else {
    result += `\n\n${registered.map(formatCQCLocation).join("\n\n---\n\n")}`;
  }
  
  return result;
}

async function handleSearchByPostcode(args: Record<string, unknown>): Promise<string> {
  const postcode = String(args.postcode).trim();
  const postcodePrefix = postcode.replace(/\s/g, "").toUpperCase().substring(0, 4);
  
  const postcodeData = await lookupPostcode(postcode);
  
  if (!postcodeData) {
    return `**Error:** Postcode "${postcode}" not found. Please check the postcode is valid.`;
  }
  
  const localAuthority = postcodeData.admin_county || postcodeData.admin_district;
  
  let result = `**Care Providers near ${postcode}**\n`;
  result += `District: ${postcodeData.admin_district}\n`;
  result += `County/Authority: ${localAuthority}\n`;
  result += `Region: ${postcodeData.region}\n`;
  result += `Data source: CQC API (Live) ✅\n\n`;
  
  const params: Record<string, string | number | undefined> = {
    localAuthority: localAuthority,
    perPage: 100
  };
  
  if (args.careHome) params.careHome = String(args.careHome);
  if (args.rating) params.overallRating = String(args.rating);
  
  const data = await cqcRequest("/locations", params) as { total: number; locations: Array<{ locationId: string }> };
  
  if (data.locations.length === 0) {
    result += `No providers found in ${localAuthority}.`;
    return result;
  }
  
  const locationIds = data.locations.map(loc => loc.locationId);
  const enrichedLocations = await enrichLocations(locationIds, 15);
  
  const filtered = enrichedLocations.filter(loc => {
    if (loc.registrationStatus !== "Registered") return false;
    const locPostcode = loc.postalCode?.replace(/\s/g, "").toUpperCase() || "";
    return locPostcode.startsWith(postcodePrefix);
  });
  
  const maxResults = (args.perPage as number) || 20;
  const limited = filtered.slice(0, maxResults);
  
  result += `Found ${filtered.length} providers in ${postcodePrefix} area\n\n`;
  
  if (limited.length === 0) {
    result += `No registered providers found with ${postcodePrefix} postcode.\n`;
    result += `\nTry searching the whole local authority: ${localAuthority}`;
  } else {
    result += limited.map(formatCQCLocation).join("\n\n---\n\n");
    if (filtered.length > maxResults) {
      result += `\n\n*Showing ${maxResults} of ${filtered.length} results*`;
    }
  }
  
  return result;
}

async function handleGetProviderDetails(args: Record<string, unknown>): Promise<string> {
  const locationId = String(args.locationId);
  const data = await getLocationDetails(locationId);
  
  let result = `**Provider Details (England)**\n`;
  result += `Data source: CQC API (Live) ✅\n\n`;
  result += formatCQCLocation(data);
  
  if (data.regulatedActivities?.length) {
    result += `\n\n**Regulated Activities:**\n`;
    data.regulatedActivities.forEach(activity => {
      result += `  - ${activity.name}\n`;
    });
  }
  
  return result;
}

async function handleGetRatingsSummary(args: Record<string, unknown>): Promise<string> {
  const params: Record<string, string | number | undefined> = { perPage: 100 };

  if (args.careHome) params.careHome = String(args.careHome);
  if (args.region) params.region = String(args.region);
  if (args.localAuthority) params.localAuthority = String(args.localAuthority);

  const data = await cqcRequest("/locations", params) as { total: number; locations: Array<{ locationId: string }> };
  
  const locationIds = data.locations.map(loc => loc.locationId);
  const enrichedLocations = await enrichLocations(locationIds, 15);
  const registered = enrichedLocations.filter(loc => loc.registrationStatus === "Registered");
  
  const ratings: Record<string, number> = {
    "Outstanding": 0, "Good": 0, "Requires improvement": 0, "Inadequate": 0, "Not yet rated": 0
  };
  
  registered.forEach(loc => {
    const rating = loc.currentRatings?.overall?.rating || "Not yet rated";
    if (ratings[rating] !== undefined) ratings[rating]++;
    else ratings["Not yet rated"]++;
  });
  
  let result = `**Ratings Summary (England)**\n`;
  result += `Data source: CQC API (Live) ✅\n`;
  if (args.localAuthority) result += `Local Authority: ${args.localAuthority}\n`;
  if (args.region) result += `Region: ${args.region}\n`;
  result += `\nAnalysed ${registered.length} registered providers (of ${data.total} total)\n\n`;
  
  result += `**Distribution:**\n`;
  Object.entries(ratings).forEach(([rating, count]) => {
    const pct = registered.length > 0 ? ((count / registered.length) * 100).toFixed(1) : "0.0";
    const bar = "█".repeat(Math.round(count / Math.max(registered.length, 1) * 20));
    result += `  ${rating}: ${count} (${pct}%) ${bar}\n`;
  });
  
  return result;
}

async function handleLookupPostcode(args: Record<string, unknown>): Promise<string> {
  const postcode = String(args.postcode);
  const data = await lookupPostcode(postcode);
  
  if (!data) {
    return `**Error:** Postcode "${postcode}" not found.`;
  }
  
  const cqcAuthority = data.admin_county || data.admin_district;
  
  let result = `**Postcode: ${data.postcode}**\n\n`;
  result += `Country: ${data.country}\n`;
  result += `District: ${data.admin_district}\n`;
  if (data.admin_county) result += `County: ${data.admin_county}\n`;
  result += `Region: ${data.region}\n`;
  result += `Constituency: ${data.parliamentary_constituency}\n`;
  result += `Coordinates: ${data.latitude}, ${data.longitude}\n`;
  result += `\n*Use "${cqcAuthority}" as localAuthority for CQC searches*`;
  
  return result;
}

function handleSearchIreland(args: Record<string, unknown>): string {
  const county = args.county ? String(args.county).toLowerCase() : "";
  const name = args.name ? String(args.name).toLowerCase() : "";
  const maxResults = (args.maxResults as number) || 20;
  
  let filtered = hiqaData;
  
  if (county) {
    filtered = filtered.filter(p => p.county.toLowerCase().includes(county));
  }
  if (name) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(name));
  }
  
  const limited = filtered.slice(0, maxResults);
  const dataAge = formatDataAge(dataTimestamps.hiqa);
  const daysOld = getDaysOld(dataTimestamps.hiqa);
  
  let result = `**Nursing Homes in Ireland (HIQA)**\n`;
  result += `Data source: HIQA Register - ${dataAge}\n`;
  if (daysOld > STALE_WARNING_DAYS) {
    result += `⚠️ Data may be outdated. Check for MCP updates.\n`;
  }
  result += `Found ${filtered.length} providers`;
  if (county) result += ` in ${county}`;
  result += `\n\n`;
  
  if (limited.length === 0) {
    result += "No providers found matching your criteria.";
    return result;
  }
  
  limited.forEach(p => {
    result += `**${p.name}**\n`;
    result += `Address: ${p.address}\n`;
    result += `County: ${p.county}\n`;
    result += `Beds: ${p.beds}\n`;
    if (p.phone) result += `Phone: ${p.phone}\n`;
    if (p.personInCharge) result += `Person in Charge: ${p.personInCharge}\n`;
    result += `Provider: ${p.providerName}\n`;
    result += `Registration: ${p.registrationNumber}\n`;
    result += `Expires: ${p.expiryDate}\n`;
    result += `\n---\n\n`;
  });
  
  if (filtered.length > maxResults) {
    result += `*Showing ${maxResults} of ${filtered.length} results*`;
  }
  
  return result;
}

function handleSearchNorthernIreland(args: Record<string, unknown>): string {
  const serviceType = args.serviceType ? String(args.serviceType).toLowerCase() : "";
  const district = args.district ? String(args.district).toLowerCase() : "";
  const name = args.name ? String(args.name).toLowerCase() : "";
  const maxResults = (args.maxResults as number) || 20;
  
  let filtered = rqiaData;
  
  if (serviceType) {
    filtered = filtered.filter(p => p.serviceType.toLowerCase().includes(serviceType));
  }
  if (district) {
    filtered = filtered.filter(p => p.localGovernmentDistrict.toLowerCase().includes(district));
  }
  if (name) {
    filtered = filtered.filter(p => p.serviceName.toLowerCase().includes(name));
  }
  
  const limited = filtered.slice(0, maxResults);
  const dataAge = formatDataAge(dataTimestamps.rqia);
  const daysOld = getDaysOld(dataTimestamps.rqia);
  
  let result = `**Care Services in Northern Ireland (RQIA)**\n`;
  result += `Data source: RQIA Register - ${dataAge}\n`;
  if (daysOld > STALE_WARNING_DAYS) {
    result += `⚠️ Data may be outdated. Check for MCP updates.\n`;
  }
  result += `Found ${filtered.length} services`;
  if (serviceType) result += ` of type "${serviceType}"`;
  result += `\n\n`;
  
  if (limited.length === 0) {
    result += "No services found matching your criteria.";
    return result;
  }
  
  limited.forEach(p => {
    result += `**${p.serviceName}**\n`;
    result += `Type: ${p.serviceType}\n`;
    if (p.address) result += `Address: ${p.address}\n`;
    if (p.postcode) result += `Postcode: ${p.postcode}\n`;
    if (p.phone) result += `Phone: ${p.phone}\n`;
    result += `Provider: ${p.providerName}\n`;
    result += `District: ${p.localGovernmentDistrict}\n`;
    if (p.lastInspectionDate) result += `Last Inspection: ${p.lastInspectionDate}\n`;
    result += `\n---\n\n`;
  });
  
  if (filtered.length > maxResults) {
    result += `*Showing ${maxResults} of ${filtered.length} results*`;
  }
  
  return result;
}

function handleSearchScotland(args: Record<string, unknown>): string {
  const serviceType = args.serviceType ? String(args.serviceType).toLowerCase() : "";
  const councilArea = args.councilArea ? String(args.councilArea).toLowerCase() : "";
  const name = args.name ? String(args.name).toLowerCase() : "";
  const maxResults = (args.maxResults as number) || 20;
  
  let filtered = scotlandData;
  
  if (serviceType) {
    filtered = filtered.filter(p => p.serviceType.toLowerCase().includes(serviceType));
  }
  if (councilArea) {
    filtered = filtered.filter(p => p.councilArea.toLowerCase().includes(councilArea));
  }
  if (name) {
    filtered = filtered.filter(p => p.serviceName.toLowerCase().includes(name));
  }
  
  const limited = filtered.slice(0, maxResults);
  const dataAge = formatDataAge(dataTimestamps.scotland);
  const daysOld = getDaysOld(dataTimestamps.scotland);
  
  let result = `**Care Services in Scotland (Care Inspectorate)**\n`;
  result += `Data source: Care Inspectorate Datastore - ${dataAge}\n`;
  if (daysOld > STALE_WARNING_DAYS) {
    result += `⚠️ Data may be outdated. Check for MCP updates.\n`;
  }
  result += `Found ${filtered.length} services`;
  if (serviceType) result += ` of type "${serviceType}"`;
  if (councilArea) result += ` in ${councilArea}`;
  result += `\n\n`;
  
  if (limited.length === 0) {
    result += "No services found matching your criteria.\n";
    if (scotlandData.length === 0) {
      result += "\nNote: Scotland data file not found. Download from Care Inspectorate website.";
    }
    return result;
  }
  
  limited.forEach(p => {
    result += `**${p.serviceName}**\n`;
    result += `Service Number: ${p.serviceNumber}\n`;
    result += `Type: ${p.serviceType}`;
    if (p.subtype) result += ` (${p.subtype})`;
    result += `\n`;
    if (p.address) result += `Address: ${p.address}\n`;
    if (p.postcode) result += `Postcode: ${p.postcode}\n`;
    if (p.phone) result += `Phone: ${p.phone}\n`;
    result += `Provider: ${p.providerName}\n`;
    result += `Council Area: ${p.councilArea}\n`;
    result += `\n---\n\n`;
  });
  
  if (filtered.length > maxResults) {
    result += `*Showing ${maxResults} of ${filtered.length} results*`;
  }
  
  return result;
}

function handleSearchWales(): string {
  let result = `**Care Provider Search - Wales 🏴󠁧󠁢󠁷󠁬󠁳󠁿**\n\n`;
  result += `🚧 **Data Not Available - Awaiting Open Data Access**\n\n`;
  result += `Care Inspectorate Wales (CIW) does not currently provide open data access:\n`;
  result += `❌ No public API\n`;
  result += `❌ No downloadable dataset (CSV/Excel/JSON)\n`;
  result += `❌ No bulk data export\n\n`;
  result += `**Why this matters:** Without open data, we cannot include Wales providers in this automated search tool. Other UK countries (England, Scotland, N. Ireland) provide open data access, making comprehensive searches possible.\n\n`;
  result += `---\n\n`;
  result += `**How to Find Wales Care Providers:**\n\n`;
  result += `**Option 1: CIW Online Directory** (Manual search)\n`;
  result += `🔗 https://digital.careinspectorate.wales/directory\n`;
  result += `- Search by location, service type, provider name\n`;
  result += `- View individual provider details and inspection reports\n`;
  result += `- Must search one-by-one (no bulk export)\n\n`;
  result += `**Option 2: Request Data from CIW** (For research/business use)\n`;
  result += `📧 Email: CIWInformation@gov.wales\n`;
  result += `- Request the full register under Open Government Licence\n`;
  result += `- Explain your legitimate use case\n`;
  result += `- They may provide an Excel/CSV extract\n`;
  result += `- If you receive data, please open a GitHub issue to help us add Wales support!\n\n`;
  result += `**Option 3: CIW Statistics** (Limited data)\n`;
  result += `🔗 https://www.careinspectorate.wales/data-tools\n`;
  result += `- View aggregate statistics and reports\n`;
  result += `- No individual provider listings\n\n`;
  result += `---\n\n`;
  result += `**When will Wales be added to this tool?**\n\n`;
  result += `Wales support will be added as soon as CIW provides open data access through:\n`;
  result += `✅ A public API (like England's CQC)\n`;
  result += `✅ A downloadable dataset (like Scotland's Care Inspectorate)\n`;
  result += `✅ Data extracts provided upon request\n\n`;
  result += `**Help us add Wales:** If you have legitimate access to CIW data or know of data sources, please open an issue at:\n`;
  result += `🔗 https://github.com/cs97jjm3/care-provider-finder/issues\n\n`;
  result += `*Thank you for understanding. We're committed to adding Wales as soon as open data becomes available.*`;
  
  return result;
}

function handleCheckDataFreshness(): string {
  let result = `**Data Freshness Report**\n\n`;
  
  result += `| Country | Source | Last Updated | Status |\n`;
  result += `|---------|--------|--------------|--------|\n`;
  result += `| England | CQC API | Live | ✅ Real-time |\n`;
  
  const scotlandAge = getDaysOld(dataTimestamps.scotland);
  const scotlandStatus = scotlandData.length === 0 ? "❌ Not loaded" : 
                         scotlandAge > STALE_WARNING_DAYS ? "⚠️ Stale" : "✅ OK";
  result += `| Scotland | Care Inspectorate | ${formatDataAge(dataTimestamps.scotland)} | ${scotlandStatus} |\n`;
  
  result += `| Wales | CIW | Coming soon | 🚧 Not yet implemented |\n`;
  
  const rqiaAge = getDaysOld(dataTimestamps.rqia);
  const rqiaStatus = rqiaData.length === 0 ? "❌ Not loaded" :
                     rqiaAge > STALE_WARNING_DAYS ? "⚠️ Stale" : "✅ OK";
  result += `| N. Ireland | RQIA | ${formatDataAge(dataTimestamps.rqia)} | ${rqiaStatus} |\n`;
  
  const hiqaAge = getDaysOld(dataTimestamps.hiqa);
  const hiqaStatus = hiqaData.length === 0 ? "❌ Not loaded" :
                     hiqaAge > STALE_WARNING_DAYS ? "⚠️ Stale" : "✅ OK";
  result += `| Ireland | HIQA | ${formatDataAge(dataTimestamps.hiqa)} | ${hiqaStatus} |\n`;
  
  result += `\n**Record Counts:**\n`;
  result += `- England: Live API (119,000+ providers)\n`;
  result += `- Scotland: ${scotlandData.length.toLocaleString()} services\n`;
  result += `- Northern Ireland: ${rqiaData.length.toLocaleString()} services\n`;
  result += `- Ireland: ${hiqaData.length.toLocaleString()} nursing homes\n`;
  
  // Always show download instructions
  result += `\n---\n\n`;
  result += `**How to Update Data (Advanced Users)**\n\n`;
  result += `If you want fresher data, you can download the files yourself:\n\n`;
  result += `1. **Ireland (HIQA):**\n`;
  result += `   - Go to: https://www.hiqa.ie/areas-we-work/older-peoples-services\n`;
  result += `   - Click "Download the Register" button\n`;
  result += `   - Save as \`hiqa.csv\` in the MCP data folder\n\n`;
  result += `2. **Northern Ireland (RQIA):**\n`;
  result += `   - Go to: https://www.rqia.org.uk/register/\n`;
  result += `   - Download "Full Register of Services" (Excel file)\n`;
  result += `   - Save as \`rqia.xlsx\` in the MCP data folder\n\n`;
  result += `3. **Scotland (Care Inspectorate):**\n`;
  result += `   - Go to: https://www.careinspectorate.com/index.php/publications-statistics/44-public/93-datastore\n`;
  result += `   - Download the latest "Datastore CSV"\n`;
  result += `   - Save as \`scotland.csv\` in the MCP data folder\n\n`;
  result += `Then restart Claude Desktop to load the new data.\n`;
  
  if (scotlandAge > STALE_WARNING_DAYS || rqiaAge > STALE_WARNING_DAYS || hiqaAge > STALE_WARNING_DAYS ||
      scotlandData.length === 0 || rqiaData.length === 0 || hiqaData.length === 0) {
    result += `\n⚠️ **Action recommended:** Some data is missing or over ${STALE_WARNING_DAYS} days old.`;
  }
  
  return result;
}

// =============================================================================
// Server Setup
// =============================================================================

const server = new Server(
  { name: "care-provider-finder", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case "search_care_providers":
        result = await handleSearchCareProviders(args || {});
        break;
      case "search_by_postcode":
        result = await handleSearchByPostcode(args || {});
        break;
      case "get_provider_details":
        result = await handleGetProviderDetails(args || {});
        break;
      case "get_ratings_summary":
        result = await handleGetRatingsSummary(args || {});
        break;
      case "lookup_postcode":
        result = await handleLookupPostcode(args || {});
        break;
      case "search_ireland":
        result = handleSearchIreland(args || {});
        break;
      case "search_northern_ireland":
        result = handleSearchNorthernIreland(args || {});
        break;
      case "search_scotland":
        result = handleSearchScotland(args || {});
        break;
      case "search_wales":
        result = handleSearchWales();
        break;
      case "check_data_freshness":
        result = handleCheckDataFreshness();
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `Error: ${errorMessage}` }], isError: true };
  }
});

async function main() {
  initializeData();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Care Provider Finder (UK & Ireland) v2.0.0 running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
