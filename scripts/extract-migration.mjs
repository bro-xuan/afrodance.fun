/**
 * Extract China migration flows from UN DESA International Migrant Stock 2024.
 *
 * Input:  scripts/data/raw/un_desa_migrant_stock_2024_bilateral.xlsx
 *         (filename on un.org: undesa_pd_2024_ims_stock_by_sex_destination_and_origin.xlsx)
 * Input:  public/china-migration/countries-110m.json       (world-atlas TopoJSON)
 * Output: src/app/china-migration/data/migration.json
 *
 * Re-run when UN DESA publishes a newer release.
 */
import * as XLSX from "xlsx";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { feature } from "topojson-client";
import { geoCentroid } from "d3-geo";

const HERE = new URL("./", import.meta.url);
const ROOT = new URL("../", import.meta.url);
const XLSX_PATH = new URL("./data/raw/un_desa_migrant_stock_2024_bilateral.xlsx", HERE);
const TOPO_PATH = new URL("./public/china-migration/countries-110m.json", ROOT);
const OUT_DIR = new URL("./src/app/china-migration/data/", ROOT);
const OUT_PATH = new URL("./migration.json", OUT_DIR);

const CHINA_CODE = 156;
const YEARS = [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024];
const YEAR_COL_OFFSET = 7; // cols 7..14 are "Both sexes" 1990..2024

// Build numeric M.49 → centroid lookup from the world-atlas TopoJSON.
function buildCentroids() {
  const topo = JSON.parse(readFileSync(TOPO_PATH, "utf8"));
  const fc = feature(topo, topo.objects.countries);
  const out = new Map();
  for (const f of fc.features) {
    const id = Number(f.id);
    if (!Number.isFinite(id)) continue;
    const [lng, lat] = geoCentroid(f);
    out.set(id, { lat: round(lat, 3), lng: round(lng, 3), name: f.properties?.name ?? null });
  }
  return out;
}

function round(n, digits) {
  const m = 10 ** digits;
  return Math.round(n * m) / m;
}

// Read Table 1 of the workbook into a 2D array of rows.
function readTable1() {
  const wb = XLSX.read(readFileSync(XLSX_PATH), { type: "buffer" });
  return XLSX.utils.sheet_to_json(wb.Sheets["Table 1"], { header: 1, defval: null });
}

// Manual centroid fallbacks for partners that exist in UN DESA but are
// absent from the world-atlas 110m TopoJSON (mostly small territories
// and the politically-distinct HK/Macau/Taiwan that UN treats separately).
const MANUAL_CENTROIDS = {
  158: { lat: 23.69, lng: 120.96, name: "Taiwan, Province of China" },
  344: { lat: 22.32, lng: 114.17, name: "China, Hong Kong SAR" },
  446: { lat: 22.20, lng: 113.55, name: "China, Macao SAR" },
  92:  { lat: 18.42, lng: -64.62, name: "British Virgin Islands" },
  136: { lat: 19.51, lng: -80.57, name: "Cayman Islands" },
  234: { lat: 62.00, lng: -6.79,  name: "Faroe Islands" },
  238: { lat: -51.80, lng: -59.52, name: "Falkland Islands" },
  254: { lat: 4.00,   lng: -53.00, name: "French Guiana" },
  258: { lat: -17.68, lng: -149.41, name: "French Polynesia" },
  292: { lat: 36.14,  lng: -5.35,  name: "Gibraltar" },
  304: { lat: 71.71,  lng: -42.60, name: "Greenland" },
  312: { lat: 16.27,  lng: -61.55, name: "Guadeloupe" },
  316: { lat: 13.44,  lng: 144.79, name: "Guam" },
  474: { lat: 14.64,  lng: -61.02, name: "Martinique" },
  500: { lat: 16.74,  lng: -62.19, name: "Montserrat" },
  531: { lat: 12.20,  lng: -68.97, name: "Curaçao" },
  535: { lat: 12.18,  lng: -68.24, name: "Bonaire, Sint Eustatius and Saba" },
  580: { lat: 17.33,  lng: 145.38, name: "Northern Mariana Islands" },
  638: { lat: -21.11, lng: 55.53,  name: "Réunion" },
  652: { lat: 17.90,  lng: -62.83, name: "Saint Barthélemy" },
  663: { lat: 18.07,  lng: -63.05, name: "Saint Martin (French part)" },
  666: { lat: 46.94,  lng: -56.27, name: "Saint Pierre and Miquelon" },
  796: { lat: 21.69,  lng: -71.80, name: "Turks and Caicos Islands" },
  833: { lat: 54.24,  lng: -4.55,  name: "Isle of Man" },
  831: { lat: 49.46,  lng: -2.59,  name: "Guernsey" },
  832: { lat: 49.21,  lng: -2.13,  name: "Jersey" },
  534: { lat: 18.04,  lng: -63.06, name: "Sint Maarten (Dutch part)" },
  175: { lat: -11.88, lng: 43.87,  name: "Mayotte" },
  574: { lat: -29.04, lng: 167.95, name: "Norfolk Island" },
  772: { lat: 35.13,  lng: 33.43,  name: "Tokelau" },
  876: { lat: -13.77, lng: -177.16, name: "Wallis and Futuna" },
  470: { lat: 35.94,  lng: 14.38,  name: "Malta" },
  438: { lat: 47.17,  lng: 9.55,   name: "Liechtenstein" },
  28:  { lat: 17.06,  lng: -61.80, name: "Antigua and Barbuda" },
  533: { lat: 12.52,  lng: -69.97, name: "Aruba" },
  52:  { lat: 13.19,  lng: -59.54, name: "Barbados" },
  212: { lat: 15.41,  lng: -61.37, name: "Dominica" },
  662: { lat: 13.91,  lng: -60.97, name: "Saint Lucia" },
  60:  { lat: 32.32,  lng: -64.76, name: "Bermuda" },
  584: { lat: 7.13,   lng: 171.18, name: "Marshall Islands" },
  520: { lat: -0.52,  lng: 166.93, name: "Nauru" },
  585: { lat: 7.51,   lng: 134.58, name: "Palau" },
  16:  { lat: -14.27, lng: -170.13, name: "American Samoa" },
  882: { lat: -13.76, lng: -172.10, name: "Samoa" },
  776: { lat: -21.18, lng: -175.20, name: "Tonga" },
  702: { lat: 1.35,   lng: 103.82, name: "Singapore" },
  480: { lat: -20.35, lng: 57.55,  name: "Mauritius" },
  690: { lat: -4.68,  lng: 55.48,  name: "Seychelles" },
  132: { lat: 16.00,  lng: -24.00, name: "Cabo Verde" },
};

function lookupCentroid(code, centroids) {
  return centroids.get(code) ?? MANUAL_CENTROIDS[code] ?? null;
}

function extractFlows(rows, centroids) {
  // Direction: "emigration" = origin is China, destination is partner country.
  //            "immigration" = destination is China, origin is partner country.
  const emigration = Object.fromEntries(YEARS.map((y) => [y, {}]));
  const immigration = Object.fromEntries(YEARS.map((y) => [y, {}]));
  const partners = new Map(); // code → { code, name }
  const dropped = new Map(); // code → name (for diagnostics)

  for (let r = 11; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    // 2024 file layout: 0=Index, 1=destination name, 2=Coverage, 3=Data type,
    // 4=destination code, 5=origin name, 6=origin code, 7..14=Both sexes years.
    const dstCode = row[4];
    const orgCode = row[6];
    const dstName = row[1];
    const orgName = row[5];

    let direction = null;
    let partnerCode = null;
    let partnerName = null;
    if (orgCode === CHINA_CODE && typeof dstCode === "number" && dstCode < 900) {
      direction = "emigration";
      partnerCode = dstCode;
      partnerName = trimName(dstName);
    } else if (dstCode === CHINA_CODE && typeof orgCode === "number" && orgCode < 900) {
      direction = "immigration";
      partnerCode = orgCode;
      partnerName = trimName(orgName);
    } else {
      continue;
    }

    if (!lookupCentroid(partnerCode, centroids)) {
      dropped.set(partnerCode, partnerName);
      continue;
    }

    partners.set(partnerCode, { code: partnerCode, name: partnerName });
    const target = direction === "emigration" ? emigration : immigration;
    for (let i = 0; i < YEARS.length; i++) {
      const v = row[YEAR_COL_OFFSET + i];
      if (typeof v === "number" && v > 0) target[YEARS[i]][partnerCode] = v;
    }
  }

  return { emigration, immigration, partners, dropped };
}

function trimName(s) {
  return typeof s === "string" ? s.trim() : s;
}

// --- main ---
mkdirSync(OUT_DIR, { recursive: true });
console.log("Building centroid map from TopoJSON…");
const centroids = buildCentroids();
console.log(`  ${centroids.size} countries with centroids`);

console.log("Reading UN DESA Table 1…");
const rows = readTable1();
console.log(`  ${rows.length} rows`);

console.log("Extracting China flows…");
const { emigration, immigration, partners, dropped } = extractFlows(rows, centroids);
console.log(`  partners with centroids: ${partners.size}`);
if (dropped.size) {
  console.log(`  dropped (no centroid) — add to MANUAL_CENTROIDS if needed:`);
  for (const [code, name] of dropped) console.log(`    ${code}: ${name}`);
}

// Build countries dictionary, joining UN names with centroid lookup.
const countries = {};
for (const { code, name } of [...partners.values()].sort((a, b) => a.code - b.code)) {
  const cent = lookupCentroid(code, centroids);
  countries[code] = {
    code,
    name: name || cent?.name || String(code),
    lat: cent.lat,
    lng: cent.lng,
  };
}

// Sanity-check: top 10 emigration destinations 2020.
const emi2020 = Object.entries(emigration[2020])
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([code, n]) => `${countries[code].name}=${n.toLocaleString()}`);
console.log("\nTop 10 emigration destinations 2020:");
emi2020.forEach((s) => console.log("  " + s));

const imm2020 = Object.entries(immigration[2020])
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([code, n]) => `${countries[code].name}=${n.toLocaleString()}`);
console.log("\nTop 10 immigration origins 2020:");
imm2020.forEach((s) => console.log("  " + s));

const out = { source: "UN DESA International Migrant Stock 2024", years: YEARS, countries, emigration, immigration };
writeFileSync(OUT_PATH, JSON.stringify(out));
const sizeKB = (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(1);
console.log(`\nWrote ${OUT_PATH.pathname} (${sizeKB} KB)`);
