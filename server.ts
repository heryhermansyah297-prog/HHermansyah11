import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const CONFIG_FILE_PATH = path.join(process.cwd(), "config-url.json");

// Helper to retrieve active GAS URL from JSON file or environment variable fallback
function getGasUrl() {
  if (fs.existsSync(CONFIG_FILE_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, "utf-8"));
      if (data && data.gasUrl) {
        return data.gasUrl;
      }
    } catch (e) {
      console.error("Error reading config-url.json:", e);
    }
  }
  return process.env.GOOGLE_SHEET_GAS_URL || "";
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse json payloads
  app.use(express.json());

  // GET current config
  app.get("/api/config", (req, res) => {
    res.json({ gasUrl: getGasUrl() });
  });

  // POST update config
  app.post("/api/config", (req, res) => {
    try {
      const { gasUrl } = req.body;
      if (gasUrl === undefined) {
        return res.status(400).json({ error: "gasUrl key is required" });
      }
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify({ gasUrl }, null, 2), "utf-8");
      console.log("Updated active Google Sheets GAS URL:", gasUrl);
      res.json({ success: true, gasUrl });
    } catch (error) {
      console.error("Error saving config:", error);
      res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  // API route to proxy Google Sheets data
  app.get("/api/units", async (req, res) => {
    try {
      const gasUrl = getGasUrl();
      if (!gasUrl) {
        return res.status(500).json({ error: "GAS URL not configured. Please use the Integrasi menu to set it up." });
      }
      
      console.log("Fetching from GAS URL:", gasUrl);
      const response = await fetch(gasUrl);
      const rawData = await response.json();
      
      // Normalize key function
      const normalizeKey = (key: string): string => {
        const norm = key.toLowerCase()
          .replace(/[^a-z0-9%\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (norm.includes('sn unit') || norm.includes('snunit')) return 'snUnit';
        if (norm === 'model') return 'model';
        if (norm.includes('issue description') || norm.includes('issue')) return 'issueDescription';
        if (norm === 'location') return 'location';
        if (norm.includes('unit status') || norm.includes('unitstatus')) return 'unitStatus';
        if (norm.includes('smu to run') || norm.includes('smutorun')) return 'smuToRun';
        if (norm === '%' || norm.includes('percent') || norm.includes('persen')) return 'percent';
        if (norm.includes('planned smu') || norm.includes('plannedsmu')) return 'plannedSmu';
        if (norm.includes('planned date') || norm.includes('planneddate')) return 'plannedDate';
        if (norm.includes('last date service') || norm.includes('lastdate')) return 'lastDateService';
        if (norm.includes('last service smu') || norm.includes('lastservice')) return 'lastServiceSmu';
        if (norm.includes('averang') || norm.includes('average')) return 'averageUnitRun';
        if (norm.includes('sr number') || norm.includes('srnumber')) return 'srNumber';
        if (norm.includes('sr date') || norm.includes('srdate')) return 'srDate';
        if (norm.includes('sr aging') || norm.includes('sraging')) return 'srAging';
        if (norm.includes('wo number') || norm.includes('wonumber')) return 'woNumber';
        if (norm.includes('id ticked') || norm.includes('idticked') || norm.includes('id ticket') || norm.includes('idticket')) return 'idTicked';
        if (norm.includes('job status') || norm.includes('jobstatus')) return 'jobStatus';
        
        // Match standard format to camelCase
        return key.replace(/\s+(.)/g, (m, chr) => chr.toUpperCase()).replace(/\s+/g, '');
      };

      // Extract items array
      let items = rawData;
      if (rawData && !Array.isArray(rawData) && typeof rawData === 'object') {
        // Look inside potential container keys
        const possibleKeys = ['data', 'units', 'rows', 'sheet', 'values'];
        for (const k of possibleKeys) {
          if (Array.isArray((rawData as any)[k])) {
            items = (rawData as any)[k];
            break;
          }
        }
        if (!Array.isArray(items)) {
          // If still not found, search all object keys
          for (const k of Object.keys(rawData)) {
            if (Array.isArray((rawData as any)[k])) {
              items = (rawData as any)[k];
              break;
            }
          }
        }
      }

      if (!Array.isArray(items)) {
        console.warn("GAS returned data that is not an array:", rawData);
        // Fallback or empty
        items = [];
      }

      let parsedUnits: any[] = [];

      // Check if it's a 2D Array
      if (items.length > 0 && Array.isArray(items[0])) {
        // Find header row (skip empty rows if any, usually first row is headers)
        // Check for any header that has "SN UNIT" or "sn" pattern to identify headers row
        let headerIndex = -1;
        for (let i = 0; i < Math.min(items.length, 5); i++) {
          const rowStr = items[i].map((c: any) => String(c).toLowerCase()).join('|');
          if (rowStr.includes('unit') || rowStr.includes('sn') || rowStr.includes('model') || rowStr.includes('location')) {
            headerIndex = i;
            break;
          }
        }
        
        if (headerIndex === -1) headerIndex = 0;
        
        const headers = items[headerIndex].map((h: any) => String(h).trim());
        const dataRows = items.slice(headerIndex + 1);

        parsedUnits = dataRows.map((row) => {
          const obj: any = {};
          headers.forEach((header, colIndex) => {
            if (!header) return;
            const normKey = normalizeKey(header);
            const rawVal = row[colIndex];
            obj[normKey] = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
          });
          return obj;
        });
      } else {
        // Array of objects
        parsedUnits = items.map((item: any) => {
          if (typeof item !== 'object' || item === null) return {};
          const normalizedItem: any = {};
          Object.keys(item).forEach((key) => {
            const normKey = normalizeKey(key);
            const rawVal = item[key];
            normalizedItem[normKey] = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
          });
          return normalizedItem;
        });
      }

      // Filter out completely empty rows and rows that are headers themselves (e.g. SN UNIT)
      const filteredUnits = parsedUnits.filter((u: any) => {
        if (!u.snUnit || u.snUnit.toLowerCase().includes('sn unit') || u.snUnit.trim() === '') {
          return false;
        }
        // Also discard rows targeting "PRATAMA ABADI SENTOSA" title cells if parsed inadvertently
        if (u.snUnit.includes('PRATAMA ABADI') || u.snUnit.includes('SENTOSA')) {
          return false;
        }
        return true;
      });

      console.log(`Parsed and filtered ${filteredUnits.length} units out of raw ${items.length} records.`);
      res.json(filteredUnits);
    } catch (error) {
      console.error("Error fetching units:", error);
      res.status(500).json({ error: "Failed to fetch unit data" });
    }
  });

  // API route to proxy Google Sheets updates
  app.post("/api/units/update", async (req, res) => {
    try {
      const gasUrl = getGasUrl();
      if (!gasUrl) {
        return res.status(500).json({ error: "GAS URL not configured. Please use the Integrasi menu to set it up." });
      }

      console.log("Forwarding update to GAS URL:", gasUrl, "for Unit:", req.body.snUnit);
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { raw: text };
      }

      res.json(data);
    } catch (error: any) {
      console.error("Error updating unit on Google Sheet:", error);
      res.status(500).json({ error: error.message || "Failed to update Google Sheet unit record" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
