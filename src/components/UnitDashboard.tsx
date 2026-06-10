import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Search, 
  RefreshCw, 
  SlidersHorizontal, 
  MapPin, 
  Calendar, 
  Hash, 
  Activity, 
  FileWarning, 
  BadgeAlert, 
  TrendingUp,
  X,
  Gauge,
  Database,
  Copy,
  Check,
  Pencil,
  Plus,
  CloudUpload,
  ExternalLink
} from 'lucide-react';

interface UnitData {
  snUnit: string;
  model: string;
  issueDescription: string;
  location: string;
  unitStatus: string;
  smuToRun: string;
  percent: string;
  plannedSmu: string;
  plannedDate: string;
  lastDateService: string;
  lastServiceSmu: string;
  averageUnitRun: string;
  srNumber: string;
  srDate: string;
  srAging: string;
  woNumber: string;
  idTicked: string;
  jobStatus: string;
}

// Helper to parse dates safely across multiple formats (e.g. ISO 8601, DD/MM/YYYY, etc.)
const parseDateSafe = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr || dateStr.trim() === '' || dateStr === '-') return null;
  
  // Try direct parsing
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  
  // Try split formats
  const cleanStr = dateStr.trim();
  const parts = cleanStr.split(/[-/T\s:]/);
  if (parts.length >= 3) {
    let year = 0;
    let month = 0;
    let day = 0;
    
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      // DD-MM-YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }
    
    const dAlt = new Date(year, month, day);
    if (!isNaN(dAlt.getTime())) return dAlt;
  }
  return null;
};

// Helper for dynamic coloring based on percent value
const getPercentColorClass = (pctStr: string) => {
  const val = parseFloat(pctStr);
  if (isNaN(val)) return 'text-slate-350';
  
  // Increasingly red as it approaches 100%
  if (val >= 90) return 'text-rose-600 font-extrabold';
  if (val >= 70) return 'text-rose-400 font-bold';
  if (val >= 50) return 'text-orange-400 font-bold';
  if (val >= 25) return 'text-yellow-400 font-semibold';
  return 'text-emerald-400 font-semibold';
};

// Helper for dynamic coloring of SMU TO RUN
const getSmuToRunColorClass = (valStr: string) => {
  const val = parseInt(valStr, 10);
  if (isNaN(val)) return 'text-slate-350';
  
  // Increasingly red as smaller (or negative)
  if (val <= 0) return 'text-rose-600 font-extrabold';
  if (val <= 50) return 'text-rose-400 font-bold';
  if (val <= 100) return 'text-orange-400 font-semibold';
  if (val <= 175) return 'text-yellow-400 font-semibold';
  return 'text-emerald-400 font-semibold';
};

// Main mathematical formula calculation runner
const enrichUnitWithCalculations = (u: UnitData): UnitData => {
  const today = new Date();
  
  // 0. Average run per day fixed at 18
  const runRate = 18;
  
  // 1. PLANNED SMU
  const lastServiceSmuVal = u.lastServiceSmu;
  const isLastServiceSmuFilled = lastServiceSmuVal && lastServiceSmuVal.trim() !== '' && lastServiceSmuVal !== '-';
  const lastServiceSmuNum = isLastServiceSmuFilled ? parseFloat(lastServiceSmuVal.replace(/[,]/g, '')) : NaN;
  
  let plannedSmu = 'NO DATA';
  if (!isNaN(lastServiceSmuNum)) {
    plannedSmu = String(Math.round(lastServiceSmuNum + 250));
  }

  // 2. PLANNED DATE
  const lastDateObj = parseDateSafe(u.lastDateService);
  // Calculate based on 250 jam / 18 jam/hari = 13.888 days, using 14 days for safety
  const plannedDateMsIncrement = 14 * 24 * 60 * 60 * 1000;
  
  let plannedDate = 'NO DATA';
  let plannedDateObj: Date | null = null;
  if (lastDateObj) {
    plannedDateObj = new Date(lastDateObj.getTime() + plannedDateMsIncrement);
    plannedDate = plannedDateObj.toISOString();
  }

  const unitStatusLower = (u.unitStatus || '').trim().toLowerCase();
  const isBreakdown = unitStatusLower.includes('breakdown');

  // 3. PERCENT %
  let percentNum = 0;
  if (isBreakdown) {
    // breakdown: stop increasing, keep previous value if possible or use last calculated
    percentNum = parseFloat(u.percent || '0');
  } else {
    // 4. SMU TO RUNNum
    let smuToRunNum = 250;
    if (isLastServiceSmuFilled && lastDateObj) {
      const diffMs = today.getTime() - lastDateObj.getTime();
      const elapsedDays = diffMs / (24 * 60 * 60 * 1000);
      smuToRunNum = 250 - (elapsedDays * runRate);
    }
    
  // Formula: ((250 - smuToRunNum) / 250) * 100
    percentNum = ((250 - smuToRunNum) / 250) * 100;
  }
  
  // Clean percent
  let percent = String(Math.round(percentNum * 10) / 10);
  if (!lastDateObj) percent = '!'; // If no date, alert!

  // 4. SMU TO RUN
  let smuToRun = '-';
  if (isLastServiceSmuFilled) {
    if (isBreakdown) {
        // breakdown: stop decreasing, keep previous value
        smuToRun = u.smuToRun && u.smuToRun !== '-' ? u.smuToRun : '250';
    } else if (lastDateObj) {
      const diffMs = today.getTime() - lastDateObj.getTime();
      const elapsedDays = diffMs / (24 * 60 * 60 * 1000);
      const smuToRunNum = 250 - (elapsedDays * runRate);
      smuToRun = String(Math.round(smuToRunNum));
    } else {
      smuToRun = '250';
    }
  }

  // 5. SR AGING
  let srAging = '-';
  const srDateObj = parseDateSafe(u.srDate);
  if (srDateObj) {
    const diffMs = today.getTime() - srDateObj.getTime();
    const elapsedDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
    srAging = String(elapsedDays);
  }

  return {
    ...u,
    plannedSmu,
    plannedDate,
    percent,
    smuToRun,
    srAging,
    averageUnitRun: '18', // Force permanently 18
  };
};

const DONUT_COLORS = {
  'Breakdown': '#f87171', // Red
  'Running with trouble': '#fbbf24', // Yellow
  'Running without trouble': '#10b981', // Emerald
  'Unknown': '#64748b' // Slate
};

const JOB_COLORS: Record<string, string> = {
  'RFU': '#10b981', // Green
  'READY FOR USE': '#10b981', // Green
  'COMPLETED': '#10b981', // Green
  'INPROGRESS': '#eab308', // Yellow
  'IN PROGRESS': '#eab308', // Yellow
  'WAITING PART': '#ef4444', // Red
  'DELAY LABOUR': '#ef4444', // Red
  'PENDING': '#ef4444', // Red
  'NONE': '#475569'
};

// Helper to get the Monday of a given date (Senin)
const getMondayOfDate = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  // Adjust day of week: Sunday (0) is treated as day 7, so Monday is day 1
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// Helper to format a week range label in Indonesian format
const formatWeekLabel = (monday: Date): string => {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDateIndo = (d: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };
  
  return `${formatDateIndo(monday)} - ${formatDateIndo(sunday)}`;
};

const isDateInWeek = (dateStr: string | null | undefined, monday: Date): boolean => {
  if (!dateStr || dateStr.trim() === '' || dateStr === '-') return false;
  const d = parseDateSafe(dateStr);
  if (!d) return false;
  
  const monTime = monday.getTime();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7); // end of Sunday
  const sunTime = sunday.getTime();
  
  const dTime = d.getTime();
  return dTime >= monTime && dTime < sunTime;
};

const formatUnitStatus = (status: string | null | undefined): string => {
  if (!status) return 'UNKNOWN';
  const s = status.toLowerCase();
  if (s.includes('breakdown')) return 'BREAKDOWN';
  if (s.includes('without')) return 'RUNNING WITHOUT TROUBLE';
  if (s.includes('trouble')) return 'RUNNING WITH TROUBLE';
  return status.toUpperCase();
};

export default function UnitDashboard() {
  const [units, setUnits] = useState<UnitData[]>([]);

  // Automatically compute all dynamic mathematical formulas
  const enrichedUnits = useMemo(() => {
    return units.map(enrichUnitWithCalculations);
  }, [units]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // States & calculations for weekly filter in Maintenance Job Service
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>('');

  const weekOptions = useMemo(() => {
    const weekMap = new Map<string, Date>();
    
    // Always include current week
    const currentMonday = getMondayOfDate(new Date());
    const currentKey = currentMonday.toISOString().split('T')[0];
    weekMap.set(currentKey, currentMonday);
    
    // Find weeks from all units
    enrichedUnits.forEach(u => {
      const d = parseDateSafe(u.srDate);
      if (d) {
        const mon = getMondayOfDate(d);
        const key = mon.toISOString().split('T')[0];
        weekMap.set(key, mon);
      }
    });
    
    // Sort chronological descending
    const sorted = Array.from(weekMap.values()).sort((a, b) => b.getTime() - a.getTime());
    
    return sorted.map(monday => {
      const key = monday.toISOString().split('T')[0];
      return {
        key,
        monday,
        label: formatWeekLabel(monday)
      };
    });
  }, [enrichedUnits]);

  // Fallback to latest week option as default active week
  const activeWeekKey = useMemo(() => {
    if (weekOptions.some(opt => opt.key === selectedWeekKey)) {
      return selectedWeekKey;
    }
    return weekOptions[0]?.key || '';
  }, [weekOptions, selectedWeekKey]);

  // Aggregate job status service counts per selected week
  const weeklyJobStatusData = useMemo(() => {
    const activeMonday = weekOptions.find(opt => opt.key === activeWeekKey)?.monday;
    if (!activeMonday) {
      return [
        { name: 'INPROGRESS', jumlah: 0, fill: '#eab308' },
        { name: 'DELAY LABOUR', jumlah: 0, fill: '#ef4444' },
        { name: 'WAITING PART', jumlah: 0, fill: '#ec4899' },
        { name: 'NEED SERVICE', jumlah: 0, fill: '#f97316' },
        { name: 'RFU', jumlah: 0, fill: '#10b981' }
      ];
    }
    
    let inProgress = 0;
    let delayLabour = 0;
    let waitingPart = 0;
    let rfu = 0;
    let needService = 0;
    
    enrichedUnits.forEach(u => {
      const smuVal = parseInt(u.smuToRun, 10);
      const isNeedService = !isNaN(smuVal) && smuVal <= 50;
      const belongsToWeek = isDateInWeek(u.srDate, activeMonday);
      
      if (belongsToWeek) {
        if (isNeedService) {
          needService++;
        } else {
          const jobStatus = (u.jobStatus || '').trim().toUpperCase();
          if (jobStatus === 'INPROGRESS' || jobStatus === 'IN PROGRESS') {
            inProgress++;
          } else if (jobStatus === 'DELAY LABOUR') {
            delayLabour++;
          } else if (jobStatus === 'WAITING PART') {
            waitingPart++;
          } else if (jobStatus === 'RFU' || jobStatus === 'READY FOR USE' || jobStatus === 'COMPLETED') {
            rfu++;
          }
        }
      } else if (isNeedService) {
        const currentMonday = getMondayOfDate(new Date());
        if (activeMonday.getTime() === currentMonday.getTime()) {
          needService++;
        }
      }
    });
    
    return [
      { name: 'INPROGRESS', jumlah: inProgress, fill: '#eab308' },
      { name: 'DELAY LABOUR', jumlah: delayLabour, fill: '#ef4444' },
      { name: 'WAITING PART', jumlah: waitingPart, fill: '#ec4899' },
      { name: 'NEED SERVICE', jumlah: needService, fill: '#f97316' },
      { name: 'RFU', jumlah: rfu, fill: '#10b981' }
    ];
  }, [enrichedUnits, activeWeekKey, weekOptions]);

  // States for Editing/Updating Unit
  const [editingUnit, setEditingUnit] = useState<UnitData | null>(null);
  const [editForm, setEditForm] = useState<UnitData | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);

  // States for Adding New Unit
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState<UnitData>({
    snUnit: '',
    model: '',
    issueDescription: '',
    location: '',
    unitStatus: 'Running without trouble',
    smuToRun: '',
    percent: '',
    plannedSmu: '',
    plannedDate: '',
    lastDateService: '',
    lastServiceSmu: '',
    averageUnitRun: '',
    srNumber: '',
    srDate: '',
    srAging: '',
    woNumber: '',
    idTicked: '',
    jobStatus: 'RFU'
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccessMsg, setAddSuccessMsg] = useState<string | null>(null);
  const [addErrorMsg, setAddErrorMsg] = useState<string | null>(null);

  // Compact Date Utility to optimize visual layout space
  const formatCompactDate = (dateStr: string) => {
    if (!dateStr || dateStr.trim() === '' || dateStr === '-') return '-';
    try {
      const date = new Date(dateStr);
      // Ensure valid date parsed
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    } catch (e) {
      // Return original if parsing fails
    }
    return dateStr;
  };

  // Google Sheet Web App URL States
  const [gasUrl, setGasUrl] = useState('');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Persistence and syncing tracking states
  const [unsyncedSns, setUnsyncedSns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('uniquip_unsynced_sns');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [localOverrides, setLocalOverrides] = useState<Record<string, UnitData>>(() => {
    try {
      const saved = localStorage.getItem('uniquip_local_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [pushing, setPushing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showFrcReloadConfirm, setShowFrcReloadConfirm] = useState(false);
  
  // Advanced Dropdown Filter States
  const [selectedModel, setSelectedModel] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedUnitStatus, setSelectedUnitStatus] = useState('ALL');
  const [selectedJobStatus, setSelectedJobStatus] = useState('ALL');
  
  // Spotlight Modal State
  const [selectedUnit, setSelectedUnit] = useState<UnitData | null>(null);

  const normalizeGasData = (rawData: any): UnitData[] => {
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
      
      return key.replace(/\s+(.)/g, (m, chr) => chr.toUpperCase()).replace(/\s+/g, '');
    };

    let items = rawData;
    if (rawData && !Array.isArray(rawData) && typeof rawData === 'object') {
      const possibleKeys = ['data', 'units', 'rows', 'sheet', 'values'];
      for (const k of possibleKeys) {
        if (Array.isArray((rawData as any)[k])) {
          items = (rawData as any)[k];
          break;
        }
      }
      if (!Array.isArray(items)) {
        for (const k of Object.keys(rawData)) {
          if (Array.isArray((rawData as any)[k])) {
            items = (rawData as any)[k];
            break;
          }
        }
      }
    }

    if (!Array.isArray(items)) return [];

    let parsedUnits: any[] = [];

    if (items.length > 0 && Array.isArray(items[0])) {
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

    return parsedUnits.filter((u: any) => {
      if (!u.snUnit || u.snUnit.toLowerCase().includes('sn unit') || u.snUnit.trim() === '') return false;
      if (u.snUnit.includes('PRATAMA ABADI') || u.snUnit.includes('SENTOSA')) return false;
      return true;
    }) as UnitData[];
  };

  const fetchConfig = async () => {
    try {
      // 1. Try to read from localStorage first as a reliable client-side fallback
      const localGasUrl = localStorage.getItem('uniquip_gas_url');
      if (localGasUrl) {
        setGasUrl(localGasUrl);
      }
      
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data && data.gasUrl) {
          setGasUrl(data.gasUrl);
          localStorage.setItem('uniquip_gas_url', data.gasUrl);
        }
      }
    } catch (err) {
      console.error('Error fetching config URL:', err);
    }
  };

  const fetchData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      let data: any[] | null = null;
      let fetchError: any = null;

      // Try fetching from Node API proxy first
      try {
        const res = await fetch('/api/units');
        if (res.ok) {
          data = await res.json();
        } else {
          const errData = await res.json().catch(() => ({}));
          fetchError = new Error(errData.error || 'backend returned error status');
        }
      } catch (err) {
        fetchError = err;
      }

      // If backend failed, try direct fetch from GAS URL client-side
      const activeUrl = gasUrl || localStorage.getItem('uniquip_gas_url') || '';
      if (!data && activeUrl) {
        try {
          console.log("Attempting direct client-side GAS fetch from:", activeUrl);
          const response = await fetch(activeUrl);
          if (response.ok) {
            const rawData = await response.json();
            data = normalizeGasData(rawData);
            fetchError = null; // Clear backend error if direct fetch succeeded
          }
        } catch (directErr) {
          console.error('Direct GAS fetch failed:', directErr);
        }
      }

      if (!data) {
        throw fetchError || new Error('Gagal memuat data dari semua sumber. Hubungkan url integrasi via menu Google Sheets.');
      }

      const rawUnits = Array.isArray(data) ? data : [];

      // Load latest overrides from localStorage to bypass potential React state closure delays
      let currentOverrides: Record<string, UnitData> = {};
      try {
        const saved = localStorage.getItem('uniquip_local_overrides');
        if (saved) {
          currentOverrides = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to parse local overrides:', e);
      }

      // Merge Google Sheets index data with our local unsynced overrides
      const merged = rawUnits.map((item) => {
        if (currentOverrides[item.snUnit]) {
          return currentOverrides[item.snUnit];
        }
        return item;
      });

      // Also append newly added units that are not in the Google Sheet yet
      const rawSns = new Set(rawUnits.map((u) => u.snUnit));
      const addedUnits = Object.values(currentOverrides).filter((u) => !rawSns.has(u.snUnit));

      setUnits([...addedUnits, ...merged]);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Gagal sinkronasi dengan database Google Sheet.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchData();
  }, []);

  // Synchronize Edit Form Calculated Fields Live!
  useEffect(() => {
    if (editForm) {
      const computed = enrichUnitWithCalculations(editForm);
      if (
        computed.plannedSmu !== editForm.plannedSmu ||
        computed.plannedDate !== editForm.plannedDate ||
        computed.percent !== editForm.percent ||
        computed.smuToRun !== editForm.smuToRun ||
        computed.srAging !== editForm.srAging
      ) {
        setEditForm({
          ...editForm,
          plannedSmu: computed.plannedSmu,
          plannedDate: computed.plannedDate,
          percent: computed.percent,
          smuToRun: computed.smuToRun,
          srAging: computed.srAging
        });
      }
    }
  }, [editForm?.lastServiceSmu, editForm?.lastDateService, editForm?.averageUnitRun, editForm?.srDate]);

  // Synchronize Add Form Calculated Fields Live!
  useEffect(() => {
    const computed = enrichUnitWithCalculations(addForm);
    if (
      computed.plannedSmu !== addForm.plannedSmu ||
      computed.plannedDate !== addForm.plannedDate ||
      computed.percent !== addForm.percent ||
      computed.smuToRun !== addForm.smuToRun ||
      computed.srAging !== addForm.srAging
    ) {
      setAddForm({
        ...addForm,
        plannedSmu: computed.plannedSmu,
        plannedDate: computed.plannedDate,
        percent: computed.percent,
        smuToRun: computed.smuToRun,
        srAging: computed.srAging
      });
    }
  }, [addForm.lastServiceSmu, addForm.lastDateService, addForm.averageUnitRun, addForm.srDate]);

  // Extract unique options for filter dropdowns dynamically
  const filterOptions = useMemo(() => {
    const models = new Set<string>();
    const locations = new Set<string>();
    const unitStatuses = new Set<string>();
    const jobStatuses = new Set<string>();

    enrichedUnits.forEach(u => {
      if (u.model) models.add(u.model);
      if (u.location) locations.add(u.location);
      if (u.unitStatus && u.unitStatus.toLowerCase() !== 'unknown' && u.unitStatus.trim() !== '') {
        unitStatuses.add(u.unitStatus);
      }
      if (u.jobStatus && u.jobStatus.toLowerCase() !== 'unknown' && u.jobStatus.trim() !== '') {
        jobStatuses.add(u.jobStatus);
      }
    });

    return {
      models: Array.from(models).sort(),
      locations: Array.from(locations).sort(),
      unitStatuses: Array.from(unitStatuses).sort(),
      jobStatuses: Array.from(jobStatuses).sort()
    };
  }, [enrichedUnits]);

  // Handle unit search and compound filters
  const filteredUnits = useMemo(() => {
    return enrichedUnits.filter(u => {
      // Search Box Filter
      const searchStr = `${u.snUnit} ${u.model} ${u.location} ${u.issueDescription} ${u.srNumber} ${u.woNumber}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
      
      // Dropdown Filters
      const matchesModel = selectedModel === 'ALL' || u.model === selectedModel;
      const matchesLocation = selectedLocation === 'ALL' || u.location === selectedLocation;
      const matchesUnitStatus = selectedUnitStatus === 'ALL' || u.unitStatus === selectedUnitStatus;
      const matchesJobStatus = selectedJobStatus === 'ALL' || u.jobStatus === selectedJobStatus;

      return matchesSearch && matchesModel && matchesLocation && matchesUnitStatus && matchesJobStatus;
    });
  }, [enrichedUnits, searchQuery, selectedModel, selectedLocation, selectedUnitStatus, selectedJobStatus]);

  // Aggregate Key Statistics
  const stats = useMemo(() => {
    let breakdownCount = 0;
    let runningTroubleCount = 0;
    let runningHealthyCount = 0;
    let activeSRs = 0;
    let totalWorkOrders = 0;
    let needServiceCount = 0;
    
    enrichedUnits.forEach(u => {
      const jobUpper = (u.jobStatus || '').trim().toUpperCase();
      const isRfu = jobUpper === 'RFU' || jobUpper === 'READY FOR USE' || jobUpper === 'COMPLETED';
      let statusLower = (u.unitStatus || '').toLowerCase();
      if (isRfu) {
        statusLower = 'running without trouble';
      }

      const smuVal = parseInt(u.smuToRun, 10);
      const isNeedService = !isNaN(smuVal) && smuVal <= 50;
      if (isNeedService) {
        needServiceCount++;
      }

      if (statusLower.includes('breakdown')) {
        breakdownCount++;
      } else if (statusLower.includes('without')) {
        runningHealthyCount++;
      } else if (statusLower.includes('trouble')) {
        runningTroubleCount++;
      }

      if (u.srNumber && u.srNumber !== '-') activeSRs++;
      if (u.woNumber && u.woNumber !== '-') totalWorkOrders++;
    });

    return {
      total: enrichedUnits.length,
      breakdown: breakdownCount,
      runningTrouble: runningTroubleCount,
      runningHealthy: runningHealthyCount,
      activeSRs,
      totalWorkOrders,
      needServiceCount
    };
  }, [enrichedUnits]);

  // Pie Chart Data for Unit Status
  const unitStatusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    enrichedUnits.forEach(u => {
      const jobUpper = (u.jobStatus || '').trim().toUpperCase();
      const isRfu = jobUpper === 'RFU' || jobUpper === 'READY FOR USE' || jobUpper === 'COMPLETED';
      let status = u.unitStatus || 'Unknown';
      if (isRfu) {
        status = 'Running without trouble';
      }
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [enrichedUnits]);

  // Bar Chart Data for Job Status
  const jobStatusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    enrichedUnits.forEach(u => {
      const job = u.jobStatus || 'NONE';
      if (job.trim() !== '') {
        counts[job] = (counts[job] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: status,
      jumlah: count
    }));
  }, [enrichedUnits]);

  // Bar Chart Data for Regional Location
  const locationChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    enrichedUnits.forEach(u => {
      const loc = u.location || 'Unknown';
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return Object.entries(counts).map(([loc, count]) => ({
      name: loc,
      count
    })).sort((a, b) => b.count - a.count);
  }, [enrichedUnits]);

  const getUnitStatusStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('breakdown')) {
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    } else if (s.includes('without')) {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    } else if (s.includes('trouble')) {
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
    return 'bg-slate-500/10 text-slate-400 border border-slate-700/30';
  };

  const getJobStatusStyle = (job: string) => {
    const j = (job || '').trim().toUpperCase();
    if (j === 'RFU' || j === 'READY FOR USE' || j === 'COMPLETED' || j.includes('COMPLETE')) {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    } else if (j === 'INPROGRESS' || j === 'IN PROGRESS' || j.includes('PROGRESS')) {
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    } else if (j === 'PENDING' || j === 'WAITING PART' || j === 'DELAY LABOUR' || j.includes('PENDING') || j.includes('WAITING') || j.includes('DELAY')) {
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    }
    return 'bg-slate-700/20 text-slate-400 border border-slate-700/50';
  };

  const handleSaveConfig = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSaveLoading(true);
      setSaveSuccess(false);
      
      // Save to localStorage regardless so it ALWAYS succeeds client-side
      localStorage.setItem('uniquip_gas_url', gasUrl);

      // Attempt to save to backend config file
      try {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gasUrl })
        });
        if (!res.ok) {
          console.warn('Backend API config returned error, using localStorage fallback instead.');
        }
      } catch (backendError) {
        console.warn('Backend API unavailable. Configured directly on client-side:', backendError);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleOpenEdit = (unit: UnitData) => {
    setEditingUnit(unit);
    setEditForm({ ...unit });
    setEditSuccessMsg(null);
    setEditErrorMsg(null);
  };

  const handleUpdateUnit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    try {
      setEditLoading(true);
      setEditSuccessMsg(null);
      setEditErrorMsg(null);

      // Automatically calculate all dynamic mathematical formulas before saving to Google Sheets
      const computedForm = enrichUnitWithCalculations(editForm);

      // 1. Immediately store in local state for instant user feedback
      setUnits((prev) => 
        prev.map((item) => item.snUnit === editForm.snUnit ? computedForm : item)
      );

      // 2. Persist in local overrides and register as unsynced
      const updatedOverrides = { ...localOverrides, [computedForm.snUnit]: computedForm };
      setLocalOverrides(updatedOverrides);
      localStorage.setItem('uniquip_local_overrides', JSON.stringify(updatedOverrides));

      let updatedUnsynced = [...unsyncedSns];
      if (!updatedUnsynced.includes(computedForm.snUnit)) {
        updatedUnsynced.push(computedForm.snUnit);
      }
      setUnsyncedSns(updatedUnsynced);
      localStorage.setItem('uniquip_unsynced_sns', JSON.stringify(updatedUnsynced));

      // 3. Attempt synchronous push to Google Sheets
      let success = false;
      let errorMsg = '';

      // Try Node backend proxy first
      try {
        const res = await fetch('/api/units/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(computedForm),
        });
        if (res.ok) {
          const resData = await res.json().catch(() => ({}));
          if (resData && resData.success !== false) {
            success = true;
          } else {
            errorMsg = resData.error || 'Ditolak oleh Google Apps Script';
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          errorMsg = errData.error || 'Server error';
        }
      } catch (err: any) {
        console.warn('Backend proxy update failed. Retrying with direct GAS request.', err);
        errorMsg = err.message || '';
      }

      // 3b. Client-side fallback: Try to push direct to GAS URL
      const activeUrl = gasUrl || localStorage.getItem('uniquip_gas_url') || '';
      if (!success && activeUrl) {
        try {
          console.log("Direct client-side GAS single push to:", activeUrl);
          const response = await fetch(activeUrl, {
            method: 'POST',
            body: JSON.stringify(computedForm)
          });
          if (response.ok) {
            const resData = await response.json();
            if (resData && resData.success !== false) {
              success = true;
            } else {
              errorMsg = resData.error || 'Ditolak oleh Google Apps Script (Direct)';
            }
          }
        } catch (directErr: any) {
          console.error('Direct GAS update failed:', directErr);
          errorMsg = directErr.message || 'Error koneksi jaringan';
        }
      }

      if (!success) {
        throw new Error(errorMsg || 'Gagal sinkron data.');
      }

      // 4. Success! Clear from unsynced and local overrides list
      const cleanUnsynced = updatedUnsynced.filter(sn => sn !== computedForm.snUnit);
      setUnsyncedSns(cleanUnsynced);
      localStorage.setItem('uniquip_unsynced_sns', JSON.stringify(cleanUnsynced));

      const cleanOverrides = { ...updatedOverrides };
      delete cleanOverrides[computedForm.snUnit];
      setLocalOverrides(cleanOverrides);
      localStorage.setItem('uniquip_local_overrides', JSON.stringify(cleanOverrides));

      setEditSuccessMsg(`Unit ${editForm.snUnit} berhasil di-update ke Google Sheet!`);
      
      setTimeout(() => {
        setEditingUnit(null);
        setEditForm(null);
        setEditSuccessMsg(null);
      }, 1500);

    } catch (err: any) {
      console.error('Update operation warning:', err);
      // Let user know their update is safely cached locally
      setEditSuccessMsg(`Perubahan disimpan lokal. Gagal sinkron otomatis Google Sheet: ${err.message || 'masalah jaringan'}. Silakan gunakan menu 'Push to Sheet' nanti.`);
      
      setTimeout(() => {
        setEditingUnit(null);
        setEditForm(null);
        setEditSuccessMsg(null);
      }, 3500);
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setAddForm({
      snUnit: '',
      model: '',
      issueDescription: '',
      location: '',
      unitStatus: 'Running without trouble',
      smuToRun: '',
      percent: '',
      plannedSmu: '',
      plannedDate: '',
      lastDateService: '',
      lastServiceSmu: '',
      averageUnitRun: '',
      srNumber: '',
      srDate: '',
      srAging: '',
      woNumber: '',
      idTicked: '',
      jobStatus: 'RFU'
    });
    setAddSuccessMsg(null);
    setAddErrorMsg(null);
    setAddModalOpen(true);
  };

  const handleCreateUnit = async (e: FormEvent) => {
    e.preventDefault();
    if (!addForm.snUnit || addForm.snUnit.trim() === '') {
      setAddErrorMsg('Serial Number (SN Unit) wajib diisi.');
      return;
    }

    const isDuplicate = units.some(
      (u) => u.snUnit.trim().toLowerCase() === addForm.snUnit.trim().toLowerCase()
    );
    if (isDuplicate) {
      setAddErrorMsg(`Gagal: Unit dengan SN ${addForm.snUnit} sudah ada dalam database.`);
      return;
    }

    try {
      setAddLoading(true);
      setAddSuccessMsg(null);
      setAddErrorMsg(null);

      // Automatically calculate all dynamic mathematical formulas before saving to Google Sheets
      const computedForm = enrichUnitWithCalculations(addForm);

      // 1. Immediately store in local state for instant user feedback
      setUnits((prev) => [computedForm, ...prev]);

      // 2. Persist in local overrides and register as unsynced
      const updatedOverrides = { ...localOverrides, [computedForm.snUnit]: computedForm };
      setLocalOverrides(updatedOverrides);
      localStorage.setItem('uniquip_local_overrides', JSON.stringify(updatedOverrides));

      let updatedUnsynced = [...unsyncedSns];
      if (!updatedUnsynced.includes(computedForm.snUnit)) {
        updatedUnsynced.push(computedForm.snUnit);
      }
      setUnsyncedSns(updatedUnsynced);
      localStorage.setItem('uniquip_unsynced_sns', JSON.stringify(updatedUnsynced));

      // 3. Attempt synchronous push to Google Sheets
      let success = false;
      let errorMsg = '';

      // Try Node backend proxy first
      try {
        const res = await fetch('/api/units/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(computedForm),
        });
        if (res.ok) {
          const resData = await res.json().catch(() => ({}));
          if (resData && resData.success !== false) {
            success = true;
          } else {
            errorMsg = resData.error || 'Ditolak oleh Google Apps Script';
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          errorMsg = errData.error || 'Server error';
        }
      } catch (err: any) {
        console.warn('Backend proxy update failed. Retrying with direct GAS request.', err);
        errorMsg = err.message || '';
      }

      // 3b. Client-side fallback: Try to push direct to GAS URL
      const activeUrl = gasUrl || localStorage.getItem('uniquip_gas_url') || '';
      if (!success && activeUrl) {
        try {
          console.log("Direct client-side GAS single push to:", activeUrl);
          const response = await fetch(activeUrl, {
            method: 'POST',
            body: JSON.stringify(computedForm)
          });
          if (response.ok) {
            const resData = await response.json();
            if (resData && resData.success !== false) {
              success = true;
            } else {
              errorMsg = resData.error || 'Ditolak oleh Google Apps Script (Direct)';
            }
          }
        } catch (directErr: any) {
          console.error('Direct GAS update failed:', directErr);
          errorMsg = directErr.message || 'Error koneksi jaringan';
        }
      }

      if (!success) {
        throw new Error(errorMsg || 'Gagal sinkron data.');
      }

      // 4. Success! Clear from unsynced and local overrides list
      const cleanUnsynced = updatedUnsynced.filter(sn => sn !== computedForm.snUnit);
      setUnsyncedSns(cleanUnsynced);
      localStorage.setItem('uniquip_unsynced_sns', JSON.stringify(cleanUnsynced));

      const cleanOverrides = { ...updatedOverrides };
      delete cleanOverrides[computedForm.snUnit];
      setLocalOverrides(cleanOverrides);
      localStorage.setItem('uniquip_local_overrides', JSON.stringify(cleanOverrides));

      setAddSuccessMsg(`Unit ${addForm.snUnit} berhasil ditambahkan ke Google Sheet!`);
      
      setTimeout(() => {
        setAddModalOpen(false);
        setAddSuccessMsg(null);
      }, 1500);

    } catch (err: any) {
      console.error('Create operation warning:', err);
      // Let user know their update is safely cached locally
      setAddSuccessMsg(`Unit baru disimpan lokal. Gagal sinkron otomatis Google Sheet: ${err.message || 'masalah jaringan'}. Silakan gunakan menu 'Push to Sheet' nanti.`);
      
      setTimeout(() => {
        setAddModalOpen(false);
        setAddSuccessMsg(null);
      }, 3500);
    } finally {
      setAddLoading(false);
    }
  };

  const handlePushToSheet = async (forceAll: boolean = false) => {
    try {
      setPushing(true);
      setSyncStatusMsg(null);
      
      let unitsToPush: UnitData[] = [];
      let currentUnsynced = [...unsyncedSns];
      let currentOverrides = { ...localOverrides };

      const isPushingAll = forceAll || currentUnsynced.length === 0;

      if (isPushingAll) {
        unitsToPush = [...units];
      } else {
        unitsToPush = currentUnsynced
          .map(sn => currentOverrides[sn] || units.find(item => item.snUnit === sn))
          .filter(Boolean) as UnitData[];
      }

      if (unitsToPush.length === 0) {
        setSyncStatusMsg({
          type: 'error',
          text: 'Tidak ada data unit yang dapat disalin.'
        });
        setPushing(false);
        return;
      }

      // We package the units to push inside a bulk sync payload
      const payload = {
        action: 'bulk_sync',
        units: unitsToPush
      };

      let success = false;
      let errorMsg = '';

      // 1. Try to push via the Node backend proxy
      try {
        const res = await fetch('/api/units/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const resData = await res.json().catch(() => ({}));
          if (resData && resData.success !== false) {
            success = true;
          } else {
            errorMsg = resData.error || 'Ditolak oleh Google Apps Script';
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          errorMsg = errData.error || 'Server error';
        }
      } catch (err: any) {
        console.warn('Backend proxy update failed. Retrying with direct GAS request.', err);
        errorMsg = err.message || '';
      }

      // 2. Client-side fallback: Try to push direct to GAS URL if node request didn't succeed
      const activeUrl = gasUrl || localStorage.getItem('uniquip_gas_url') || '';
      if (!success && activeUrl) {
        try {
          console.log("Direct client-side GAS bulk push to:", activeUrl);
          const response = await fetch(activeUrl, {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          if (response.ok) {
            const resData = await response.json();
            if (resData && resData.success !== false) {
              success = true;
            } else {
              errorMsg = resData.error || 'Ditolak oleh Google Apps Script (Direct)';
            }
          }
        } catch (directErr: any) {
          console.error('Direct GAS update failed:', directErr);
          errorMsg = directErr.message || 'Error koneksi jaringan langsung';
        }
      }

      if (success) {
        // Successful bulk update, clear local unsynced lists
        if (isPushingAll) {
          currentUnsynced = [];
          currentOverrides = {};
        } else {
          const pushedSns = new Set(unitsToPush.map(u => u.snUnit));
          currentUnsynced = currentUnsynced.filter(x => !pushedSns.has(x));
          unitsToPush.forEach(u => delete currentOverrides[u.snUnit]);
        }

        setUnsyncedSns(currentUnsynced);
        localStorage.setItem('uniquip_unsynced_sns', JSON.stringify(currentUnsynced));
        
        setLocalOverrides(currentOverrides);
        localStorage.setItem('uniquip_local_overrides', JSON.stringify(currentOverrides));

        setSyncStatusMsg({
          type: 'success',
          text: isPushingAll 
            ? `Berhasil menyalin seluruh data (${unitsToPush.length} unit) ke Google Sheet secara sinkron!`
            : `Berhasil menyalin ${unitsToPush.length} perubahan unit ke Google Sheet!`
        });

        // Re-fetch and align
        fetchData();
      } else {
        setSyncStatusMsg({
          type: 'error',
          text: `Gagal menyalin data: ${errorMsg || 'Akses ditolak atau kesalahan Apps Script.'}`
        });
      }

    } catch (err: any) {
      console.error('Error pushing data:', err);
      setSyncStatusMsg({
        type: 'error',
        text: 'Terjadi kegagalan komunikasi sistem saat menyalin data.'
      });
    } finally {
      setPushing(false);
      setTimeout(() => {
        setSyncStatusMsg(null);
      }, 6000);
    }
  };

  const handleForceReloadClick = () => {
    if (unsyncedSns.length > 0) {
      setShowFrcReloadConfirm(true);
    } else {
      fetchData();
    }
  };

  const handleConfirmDiscardAndReload = () => {
    setUnsyncedSns([]);
    localStorage.removeItem('uniquip_unsynced_sns');
    setLocalOverrides({});
    localStorage.removeItem('uniquip_local_overrides');
    
    setShowFrcReloadConfirm(false);
    fetchData();
  };

  const copyScriptText = () => {
    const code = `function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    // Find Header Row to know column indices (usually row 1, but scans first 6 rows)
    var headerRowIndex = 0;
    for (var i = 0; i < Math.min(data.length, 6); i++) {
      var rowStr = data[i].map(function(c) { return String(c).toLowerCase(); }).join('|');
      if (rowStr.indexOf('unit') !== -1 || rowStr.indexOf('sn') !== -1 || rowStr.indexOf('model') !== -1) {
        headerRowIndex = i;
        break;
      }
    }
    
    var headers = data[headerRowIndex].map(function(h) { return String(h).trim(); });
    
    // Find SN UNIT column index
    var snColIdx = -1;
    for (var col = 0; col < headers.length; col++) {
      var norm = headers[col].toLowerCase().replace(/[^a-z0-9%\\s]/g, '').replace(/\\s+/g, ' ').trim();
      if (norm.indexOf('sn unit') !== -1 || norm.indexOf('snunit') !== -1) {
        snColIdx = col;
        break;
      }
    }
    
    if (snColIdx === -1) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Kolom SN UNIT tidak ditemukan dalam Spreadsheet." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Normalize header names to associate with payload fields
    function getNormalizedKey(key) {
      var norm = key.toLowerCase().replace(/[^a-z0-9%\\s]/g, '').replace(/\\s+/g, ' ').trim();
      if (norm.indexOf('sn unit') !== -1 || norm.indexOf('snunit') !== -1) return 'snUnit';
      if (norm === 'model') return 'model';
      if (norm.indexOf('issue description') !== -1 || norm.indexOf('issue') !== -1) return 'issueDescription';
      if (norm === 'location') return 'location';
      if (norm.indexOf('unit status') !== -1 || norm.indexOf('unitstatus') !== -1) return 'unitStatus';
      if (norm.indexOf('smu to run') !== -1 || norm.indexOf('smutorun') !== -1) return 'smuToRun';
      if (norm === '%' || norm.indexOf('percent') !== -1 || norm.indexOf('persen') !== -1) return 'percent';
      if (norm.indexOf('planned smu') !== -1 || norm.indexOf('plannedsmu') !== -1) return 'plannedSmu';
      if (norm.indexOf('planned date') !== -1 || norm.indexOf('planneddate') !== -1) return 'plannedDate';
      if (norm.indexOf('last date service') !== -1 || norm.indexOf('lastdate') !== -1) return 'lastDateService';
      if (norm.indexOf('last service smu') !== -1 || norm.indexOf('lastservice') !== -1) return 'lastServiceSmu';
      if (norm.indexOf('averang') !== -1 || norm.indexOf('average') !== -1) return 'averageUnitRun';
      if (norm.indexOf('sr number') !== -1 || norm.indexOf('srnumber') !== -1) return 'srNumber';
      if (norm.indexOf('sr date') !== -1 || norm.indexOf('srdate') !== -1) return 'srDate';
      if (norm.indexOf('sr aging') !== -1 || norm.indexOf('sraging') !== -1) return 'srAging';
      if (norm.indexOf('wo number') !== -1 || norm.indexOf('wonumber') !== -1) return 'woNumber';
      if (norm.indexOf('id ticked') !== -1 || norm.indexOf('idticked') !== -1 || norm.indexOf('id ticket') !== -1 || norm.indexOf('idticket') !== -1) return 'idTicked';
      if (norm.indexOf('job status') !== -1 || norm.indexOf('jobstatus') !== -1) return 'jobStatus';
      return '';
    }
    
    // Key and indexing maps
    var keyToColIdx = {};
    for (var col = 0; col < headers.length; col++) {
      var normKey = getNormalizedKey(headers[col]);
      if (normKey) {
        keyToColIdx[normKey] = col;
      }
    }
    
    var activeSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // ACTION: BULK OVERWRITE SYNC DATABASE AT ONCE
    if (payload.action === 'bulk_sync' && Array.isArray(payload.units)) {
      var unitsList = payload.units;
      
      // Clear legacy values below headers
      var lastRow = activeSheet.getLastRow();
      if (lastRow > headerRowIndex + 1) {
        activeSheet.getRange(headerRowIndex + 2, 1, lastRow - headerRowIndex - 1, headers.length).clearContent();
      }
      
      if (unitsList.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Database dikosongkan." }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      var rowsToInsert = [];
      for (var u = 0; u < unitsList.length; u++) {
        var uItem = unitsList[u];
        var rowValues = [];
        for (var c = 0; c < headers.length; c++) {
          rowValues.push('');
        }
        
        if (snColIdx !== -1) {
          rowValues[snColIdx] = String(uItem.snUnit || '').trim();
        }
        
        for (var prop in uItem) {
          if (uItem.hasOwnProperty(prop) && prop !== 'snUnit') {
            var colIdx = keyToColIdx[prop];
            if (colIdx !== undefined) {
              rowValues[colIdx] = uItem[prop] !== undefined && uItem[prop] !== null ? String(uItem[prop]).trim() : '';
            }
          }
        }
        rowsToInsert.push(rowValues);
      }
      
      activeSheet.getRange(headerRowIndex + 2, 1, rowsToInsert.length, headers.length).setValues(rowsToInsert);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Berhasil menyinkronkan seluruh database unit (" + unitsList.length + " unit) sekaligus!" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ACTION: SINGLE RECORD INSERT/UPDATE
    var snToMatch = String(payload.snUnit).trim();
    if (!snToMatch) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Parameter snUnit bernilai kosong." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var rowToEdit = -1;
    for (var r = headerRowIndex + 1; r < data.length; r++) {
      if (String(data[r][snColIdx]).trim() === snToMatch) {
        rowToEdit = r;
        break;
      }
    }
    
    if (rowToEdit === -1) {
      // Append new unit row if not existing in sheet
      var newRow = [];
      for (var col = 0; col < headers.length; col++) {
        newRow.push('');
      }
      newRow[snColIdx] = snToMatch;
      for (var k in payload) {
        if (payload.hasOwnProperty(k) && k !== 'snUnit') {
          var colIndex = keyToColIdx[k];
          if (colIndex !== undefined) {
            newRow[colIndex] = payload[k];
          }
        }
      }
      activeSheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Unit baru berhasil ditambahkan" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Update matching columns with new payload values
    for (var k in payload) {
      if (payload.hasOwnProperty(k) && k !== 'snUnit') {
        var colIndex = keyToColIdx[k];
        if (colIndex !== undefined) {
          activeSheet.getRange(rowToEdit + 1, colIndex + 1).setValue(payload[k]);
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium">Synchronizing fleet databases from Google Sheets...</p>
      </div>
    );
  }

  return (
    <div className="px-2 py-6 md:px-4 w-full max-w-[100%] space-y-6 animate-fade-in">
      
      {/* Dynamic Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-sky-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Activity className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div className="flex flex-col">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase font-sans leading-none">
                  UNIQUIP PKY DEDICATED TRACKER
                </h1>
                <h2 className="text-lg md:text-xl font-extrabold text-indigo-400 font-sans tracking-wide uppercase leading-none">
                  PT. PRATAMA ABADI SENTOSA
                </h2>
              </div>
              <p className="text-xs font-bold text-orange-500 mt-1.5 uppercase tracking-wider">
                Real-time Maintenance and Daily Monitoring
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {unsyncedSns.length > 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
              {unsyncedSns.length} Data Belum Sinkron
            </div>
          ) : error ? (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
              Apps Script Sync: Error
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Apps Script Sync: Connected
            </div>
          )}

          <a
            href="https://docs.google.com/spreadsheets/d/1PMxOplOYvflXp46r9cb5AiZB5cN0-0gel8MkFlWl_Tk/edit?gid=1389168148#gid=1389168148"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/10"
            title="Buka Google Sheet utama PT. Pratama Abadi Sentosa"
          >
            <ExternalLink className="w-4 h-4" />
            Buka Google Sheet
          </a>

          <button 
            type="button"
            onClick={() => handlePushToSheet(unsyncedSns.length === 0)}
            disabled={pushing}
            className={`font-semibold px-4 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              unsyncedSns.length > 0
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/15 border border-amber-500/40 animate-pulse-subtle'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/40 shadow-indigo-600/10'
            }`}
            title={unsyncedSns.length > 0 ? "Salin semua perubahan data lokal ke Google Sheet" : "Sinkronkan semua data unit saat ini ke Google Sheet"}
          >
            <CloudUpload className={`w-4 h-4 ${pushing ? 'animate-bounce text-slate-100' : ''}`} />
            {pushing 
              ? 'Menyalin...' 
              : unsyncedSns.length > 0 
                ? `Push to Sheet (${unsyncedSns.length})` 
                : 'Push to Sheet (All)'}
          </button>

          <button 
            type="button"
            onClick={() => setConfigModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
          >
            <Database className="w-4 h-4" />
            Integrasi Google Sheets
          </button>
          
          <button 
            type="button"
            onClick={handleForceReloadClick} 
            disabled={refreshing}
            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 px-4 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
            {refreshing ? 'Syncing...' : 'Force Reload'}
          </button>
        </div>
      </header>

      {/* Synchronization Toast/Status Banner */}
      {syncStatusMsg && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-4 animate-fade-in shadow-lg ${
          syncStatusMsg.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 shadow-emerald-950/10' 
            : 'bg-rose-500/10 border border-rose-500/20 text-rose-300 shadow-rose-950/10'
        }`}>
          <div className="flex gap-3 items-center">
            {syncStatusMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <p className="text-sm font-semibold">{syncStatusMsg.text}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setSyncStatusMsg(null)}
            className="text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Connection Warning Banner */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in shadow-lg shadow-rose-950/10">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Sinkronisasi Google Sheet Terkendala</p>
              <p className="text-xs text-slate-400 mt-0.5">{error}. Mohon sambungkan URL Google Apps Script Web App Anda.</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setConfigModalOpen(true)}
            className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-4 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all"
          >
            Atur URL Integrasi
          </button>
        </div>
      )}

      {/* KPI Stats Widgets Area */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700/50 transition-all">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Units</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-white">{stats.total}</span>
            <span className="text-xs text-slate-500 font-mono">Heavy</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700/50 transition-all">
          <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            RUNNING WITHOUT TROUBLE
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-emerald-400">{stats.runningHealthy}</span>
            <span className="text-xs text-slate-500 font-mono">{stats.runningHealthy === 1 ? 'Unit' : 'Units'}</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700/50 transition-all">
          <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            RUNNING WITH TROUBLE
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-amber-400">{stats.runningTrouble}</span>
            <span className="text-xs text-slate-500 font-mono">
              {stats.runningTrouble === 1 ? 'Unit' : 'Units'}
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between hover:border-rose-500/30 transition-all group">
          <span className="text-xs text-rose-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            BREAKDOWN
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-rose-400">{stats.breakdown}</span>
            <span className="text-xs text-slate-500 font-mono font-medium">
              {stats.breakdown === 1 ? 'Unit' : 'Units'}
            </span>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700/50 transition-all">
          <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Service Requests</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-purple-400">{stats.activeSRs}</span>
            <span className="text-xs text-slate-500 font-mono">SRs Pending</span>
          </div>
        </div>

        {/* Metric 6 */}
        <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700/50 transition-all">
          <span className="text-xs text-sky-400 font-semibold uppercase tracking-wider">Need Service</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-sky-400">{stats.needServiceCount}</span>
            <span className="text-xs text-slate-500 font-mono">Units</span>
          </div>
        </div>

      </div>

      {/* Visual Analytics - Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Status Breakdown Donut Chart */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between min-h-[360px]">
          <div>
            <h3 className="text-base font-bold text-slate-200">UNIT STATUS</h3>
            <p className="text-xs text-orange-500 font-semibold mt-1">Status of all active heavy equipment</p>
          </div>
          
          <div className="h-56 relative flex items-center justify-center mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={unitStatusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {unitStatusChartData.map((entry) => {
                    const statusName = entry.name;
                    let fill = DONUT_COLORS['Unknown'];
                    if (statusName.toLowerCase().includes('breakdown')) fill = DONUT_COLORS['Breakdown'];
                    else if (statusName.toLowerCase().includes('without')) fill = DONUT_COLORS['Running without trouble'];
                    else if (statusName.toLowerCase().includes('trouble')) fill = DONUT_COLORS['Running with trouble'];
                    
                    return <Cell key={`cell-${entry.name}`} fill={fill} />;
                  })}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total active</span>
              <p className="text-3xl font-extrabold text-white mt-0.5">{stats.total}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs border-t border-slate-800/60 mt-2">
            <div>
              <span className="text-emerald-400 font-bold block">{stats.runningHealthy}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mt-0.5">RUNNING WITHOUT TROUBLE</span>
            </div>
            <div>
              <span className="text-amber-400 font-bold block">{stats.runningTrouble}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mt-0.5">RUNNING WITH TROUBLE</span>
            </div>
            <div>
              <span className="text-rose-400 font-bold block">{stats.breakdown}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mt-0.5">BREAKDOWN</span>
            </div>
          </div>
        </div>

        {/* Job Progress Status Bars Chart */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between min-h-[360px]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-200">Maintenance Job Service</h3>
              
              {/* Dropdown week selection */}
              <select
                value={activeWeekKey}
                onChange={(e) => setSelectedWeekKey(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-350 rounded-lg px-2.5 py-1 text-xs font-mono outline-none focus:border-sky-500/50 transition-all w-auto min-w-[210px] md:min-w-[230px] cursor-pointer"
              >
                {weekOptions.map(opt => (
                  <option key={opt.key} value={opt.key} className="bg-slate-950 text-slate-200 font-mono">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-400 mt-1">Pending maintenance categories counted weekly by Service Request Date</p>
          </div>

          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyJobStatusData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px' }}
                />
                <Bar dataKey="jumlah" radius={[4, 4, 0, 0]}>
                  {weeklyJobStatusData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-[10px] pt-4 border-t border-slate-800/60 mt-2 font-mono">
            {weeklyJobStatusData.map(item => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.fill }}></span>
                <span className="text-slate-400">{item.name} ({item.jumlah})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Location Site Map KPI */}
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between min-h-[360px]">
          <div>
            <h3 className="text-base font-bold text-slate-200">Active Minesite Deployment</h3>
            <p className="text-xs text-slate-400 mt-1">Deployment count categorized by localized active coordinates</p>
          </div>

          <div className="space-y-3 my-4 flex-1 overflow-y-auto pr-1">
            {locationChartData.map((loc, index) => {
              const percentages = (loc.count / stats.total) * 100;
              return (
                <div key={loc.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <span className="text-[10px] text-sky-400/80 font-mono">#{index+1}</span>
                      {loc.name}
                    </span>
                    <span className="font-mono text-slate-400 font-bold">{loc.count} unit ({percentages.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-sky-450 to-indigo-505 h-full rounded-full bg-sky-400 transition-all duration-500"
                      style={{ width: `${percentages}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800/60 mt-2 text-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Pratama Regional Sites fleet distribution Map</span>
          </div>
        </div>

      </div>

      {/* Advanced Control Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Searching */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Unit SN, Model, Location, Service / Work Request numbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/40 transition-all font-sans"
            />
          </div>

          {/* Sliders Icon Header */}
          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold select-none">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <span>FITUR CONSTR:</span>
          </div>

        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          
          {/* Model Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fleet Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500/40 transition-all"
            >
              <option value="ALL">All Models (ALL)</option>
              {filterOptions.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Minesite Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500/40 transition-all"
            >
              <option value="ALL">All Deployment Sites (ALL)</option>
              {filterOptions.locations.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Unit Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unit Status</label>
            <select
              value={selectedUnitStatus}
              onChange={(e) => setSelectedUnitStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500/40 transition-all"
            >
              <option value="ALL">All Unit Status (ALL)</option>
              {filterOptions.unitStatuses.map(s => (
                <option key={s} value={s}>{formatUnitStatus(s)}</option>
              ))}
            </select>
          </div>

          {/* Job Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Job Status</label>
            <select
              value={selectedJobStatus}
              onChange={(e) => setSelectedJobStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500/40 transition-all"
            >
              <option value="ALL">All Job Status (ALL)</option>
              {filterOptions.jobStatuses.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Clear filters label */}
        {(selectedModel !== 'ALL' || selectedLocation !== 'ALL' || selectedUnitStatus !== 'ALL' || selectedJobStatus !== 'ALL' || searchQuery !== '') && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/40">
            <p className="text-xs text-slate-400">
              Menampilkan <span className="text-sky-400 font-bold">{filteredUnits.length}</span> dari <span className="font-bold">{enrichedUnits.length}</span> fleet unit yang sesuai filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedModel('ALL');
                setSelectedLocation('ALL');
                setSelectedUnitStatus('ALL');
                setSelectedJobStatus('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-rose-400 hover:text-rose-350 hover:underline transition-all cursor-pointer"
            >
              Clear All Filtering Rules
            </button>
          </div>
        )}
      </div>

      {/* Pristine Master Grid / Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-col md:flex-row md:items-center gap-x-4 gap-y-1.5">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-sky-400" />
                Unit Maintenance Registry Records
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold font-sans tracking-wide shadow-lg shadow-rose-500/5 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 animate-bounce" />
                <span>SEGERA create SR dan WO jika persentase mendekati 90% atau SMU TO RUN mendekati angka minus</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Click any unit row to display detailed unit information</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="bg-sky-500 hover:bg-sky-600 font-bold text-slate-950 text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-sky-500/10 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Unit Baru
            </button>
            <span className="text-xs font-mono font-bold bg-slate-950 border border-slate-800 px-3 py-2 rounded text-slate-300">
              Total Rows: {filteredUnits.length}
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <table className="w-full text-left border-collapse min-w-[1600px] text-[10px] xl:text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[10px] uppercase tracking-wider font-mono">
                <th className="p-1.5 py-2.5 pl-4 sticky left-0 bg-slate-950/90 shadow-[4px_0_10px_rgba(0,0,0,0.4)] z-10">SN UNIT</th>
                <th className="p-1.5 py-2.5 text-center">MODEL</th>
                <th className="p-1.5 py-2.5 min-w-[130px]">ISSUE DESCRIPTION</th>
                <th className="p-1.5 py-2.5">LOCATION</th>
                <th className="p-1.5 py-2.5 text-center">UNIT STATUS</th>
                <th className="p-1.5 py-2.5 text-center">SMU TO RUN</th>
                <th className="p-1.5 py-2.5 text-center">%</th>
                <th className="p-1.5 py-2.5 text-center">PLANNED SMU</th>
                <th className="p-1.5 py-2.5">PLANNED DATE</th>
                <th className="p-1.5 py-2.5">LAST DATE SERVICE</th>
                <th className="p-1.5 py-2.5 text-center">LAST SERVICE SMU</th>
                <th className="p-1.5 py-2.5 text-center">AVERANGE UNIT RUN</th>
                <th className="p-1.5 py-2.5">SR NUMBER</th>
                <th className="p-1.5 py-2.5 bg-slate-950/20">SR DATE</th>
                <th className="p-1.5 py-2.5 text-center">SR AGING</th>
                <th className="p-1.5 py-2.5">WO NUMBER</th>
                <th className="p-1.5 py-2.5">ID TICKED</th>
                <th className="p-1.5 py-2.5 text-center">JOB STATUS</th>
                <th className="p-1.5 py-2.5 pr-4 text-center">EDIT</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={19} className="p-12 text-center text-slate-500 font-mono">
                    No active machinery records found matching the active filtering criteria.
                  </td>
                </tr>
              ) : (
                filteredUnits.map((u, idx) => (
                  <tr 
                    key={`${u.snUnit}-${idx}`}
                    onClick={() => setSelectedUnit(u)}
                    className="border-b border-slate-800/60 hover:bg-slate-800/40 text-[10px] xl:text-[11px] font-sans text-slate-350 cursor-pointer transition-colors"
                  >
                    
                    {/* SN UNIT */}
                    <td className="p-1.5 py-2 pl-4 font-mono font-bold text-sky-450 text-sky-400 sticky left-0 bg-slate-900/90 shadow-[4px_0_10px_rgba(0,0,0,0.3)] hover:text-sky-300 truncate">
                      {u.snUnit || '-'}
                    </td>
                    
                    {/* MODEL */}
                    <td className="p-1.5 py-2 font-semibold text-white text-center truncate">
                      {u.model || '-'}
                    </td>
                    
                    {/* ISSUE DESCRIPTION */}
                    <td className="p-1.5 py-2 max-w-[160px] truncate font-bold text-orange-500" title={u.issueDescription}>
                      {u.issueDescription || '-'}
                    </td>
                    
                    {/* LOCATION */}
                    <td className="p-1.5 py-2 truncate">
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{u.location || '-'}</span>
                      </span>
                    </td>
                    
                    {/* UNIT STATUS */}
                    <td className="p-1.5 py-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold inline-block leading-none tracking-tight ${getUnitStatusStyle(u.unitStatus)}`}>
                        {formatUnitStatus(u.unitStatus)}
                      </span>
                    </td>
                    
                    {/* SMU TO RUN */}
                    <td className="p-1.5 py-2 text-center font-mono truncate">
                      {u.smuToRun && u.smuToRun !== '-' && u.smuToRun !== 'NO DATA' ? (
                        <div className="flex items-center justify-center gap-1">
                          {parseInt(u.smuToRun, 10) <= -25 && (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-bounce" title="Critical Warning: SMU overrun!" />
                          )}
                          <span className={getSmuToRunColorClass(u.smuToRun)}>{u.smuToRun}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* % */}
                    <td className="p-1.5 py-2 text-center truncate">
                      {u.percent === '!' || !u.percent || u.percent === '-' || u.percent === 'NO DATA' ? (
                        <div className="inline-flex">
                          <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[9px] font-extrabold font-mono tracking-wider animate-pulse inline-flex items-center gap-1 justify-center">
                            ⚠️ !
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-0.5">
                          <span className={`font-mono font-bold ${getPercentColorClass(u.percent)}`}>{u.percent}</span>
                          <span className="text-[9px] text-slate-500">%</span>
                        </div>
                      )}
                    </td>

                    {/* PLANNED SMU */}
                    <td className="p-1.5 py-2 text-center font-mono truncate">
                      {u.plannedSmu === 'NO DATA' ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold font-mono tracking-wider">
                          NO DATA
                        </span>
                      ) : (
                        <span className="text-slate-300">{u.plannedSmu || '-'}</span>
                      )}
                    </td>

                    {/* PLANNED DATE */}
                    <td className="p-1.5 py-2 font-mono truncate text-center" title={u.plannedDate}>
                      {u.plannedDate === 'NO DATA' ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold font-mono tracking-wider">
                          NO DATA
                        </span>
                      ) : (
                        <span className="text-slate-350">{formatCompactDate(u.plannedDate)}</span>
                      )}
                    </td>

                    {/* LAST DATE SERVICE */}
                    <td className="p-1.5 py-2 text-slate-450 font-mono truncate text-slate-400" title={u.lastDateService}>
                      {formatCompactDate(u.lastDateService)}
                    </td>

                    {/* LAST SERVICE SMU */}
                    <td className="p-1.5 py-2 text-center font-mono text-slate-300 truncate">
                      {u.lastServiceSmu || '-'}
                    </td>

                    {/* AVERAGE UNIT RUN */}
                    <td className="p-1.5 py-2 text-center font-mono text-emerald-400 font-bold truncate">
                      {u.averageUnitRun || '-'}
                    </td>

                    {/* SR NUMBER */}
                    <td className="p-1.5 py-2 font-mono text-slate-400 truncate" title={u.srNumber}>
                      {u.srNumber || '-'}
                    </td>

                    {/* SR DATE */}
                    <td className="p-1.5 py-2 text-slate-400 font-mono truncate" title={u.srDate}>
                      {formatCompactDate(u.srDate)}
                    </td>

                    {/* SR AGING */}
                    <td className="p-1.5 py-2 text-center font-mono text-slate-300 truncate">
                      {u.srAging || '-'}
                    </td>

                    {/* WO NUMBER */}
                    <td className="p-1.5 py-2 font-mono text-slate-400 truncate" title={u.woNumber}>
                      {u.woNumber || '-'}
                    </td>

                    {/* ID TICKET */}
                    <td className="p-1.5 py-2 font-mono text-slate-300 truncate" title={u.idTicked}>
                      {u.idTicked || '-'}
                    </td>

                    {/* JOB STATUS */}
                    <td className="p-1.5 py-2 text-center truncate">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold inline-block leading-none tracking-tight ${getJobStatusStyle(u.jobStatus)}`}>
                        {u.jobStatus || '-'}
                      </span>
                    </td>

                    {/* EDIT ACTION */}
                    <td className="p-1.5 py-1 pr-4 text-center" onClick={(e) => { e.stopPropagation(); handleOpenEdit(u); }}>
                      <button
                        type="button"
                        className="w-7 h-7 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 rounded flex items-center justify-center mx-auto transition-all cursor-pointer shadow-sm"
                        title="Edit Data Unit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spotlight Detail Flyout Modal */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header info */}
            <div className="px-6 py-5 bg-slate-950/80 border-b border-slate-850 flex items-center justify-between">
              <div>
                <span className="text-[10px] md:text-xs font-bold font-mono tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded uppercase">
                  Machine Information Dossier
                </span>
                <h3 className="text-xl font-bold text-white font-mono mt-1 w-full truncate">
                  {selectedUnit.snUnit}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedUnit(null)}
                className="bg-slate-900 text-slate-400 hover:text-white p-1 rounded-lg border border-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content list */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Primary site details stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] font-bold text-slate-450 uppercase uppercase font-mono block">Model</span>
                  <span className="text-base font-bold text-white">{selectedUnit.model || '-'}</span>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] font-bold text-slate-450 uppercase uppercase font-mono block">Site Location</span>
                  <span className="text-base font-bold text-sky-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedUnit.location || '-'}
                  </span>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] font-bold text-slate-450 uppercase uppercase font-mono block">Unit Status</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded inline-block mt-1 ${getUnitStatusStyle(selectedUnit.unitStatus)}`}>
                    {formatUnitStatus(selectedUnit.unitStatus)}
                  </span>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] font-bold text-slate-450 uppercase uppercase font-mono block">Job Status</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded inline-block mt-1 ${getJobStatusStyle(selectedUnit.jobStatus)}`}>
                    {selectedUnit.jobStatus || '-'}
                  </span>
                </div>
              </div>

              {/* Troubleshooting info */}
              <div className="bg-slate-950/50 p-4 border border-rose-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wide">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Reported Machine Fault / Issue</span>
                </div>
                <p className="text-sm font-medium text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-850 font-mono">
                  {selectedUnit.issueDescription || 'No active fault reported in registry.'}
                </p>
              </div>

              {/* SMU telemetry details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-1">
                  <Gauge className="w-4 h-4 text-purple-400" />
                  Telemetry & SMU Analytics
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  <div className="space-y-1 bg-slate-950/30 p-3 rounded-lg border border-slate-850 text-xs">
                    <span className="text-slate-500">SMU To Run</span>
                    <p className="text-sm font-bold text-slate-200 font-mono">{selectedUnit.smuToRun || '-'}</p>
                  </div>
                  
                  <div className="space-y-1 bg-slate-950/30 p-3 rounded-lg border border-slate-850 text-xs">
                    <span className="text-slate-500">Planned SMU</span>
                    <p className="text-sm font-bold text-slate-200 font-mono">{selectedUnit.plannedSmu || '-'}</p>
                  </div>
                  
                  <div className="space-y-1 bg-slate-950/30 p-3 rounded-lg border border-slate-850 text-xs">
                    <span className="text-slate-500">Last Service SMU</span>
                    <p className="text-sm font-bold text-slate-200 font-mono">{selectedUnit.lastServiceSmu || '-'}</p>
                  </div>

                  <div className="space-y-1 bg-slate-950/30 p-3 rounded-lg border border-slate-850 text-xs">
                    <span className="text-slate-500">Average Unit Run</span>
                    <p className="text-sm font-bold text-emerald-400 font-mono">{selectedUnit.averageUnitRun || '-'} hr/day</p>
                  </div>

                  <div className="space-y-1 bg-slate-950/30 p-3 rounded-lg border border-slate-850 text-xs">
                    <span className="text-slate-500">Planned Maintenance %</span>
                    <p className="text-sm font-bold text-sky-400 font-mono">{selectedUnit.percent || '-'}%</p>
                  </div>

                  <div className="space-y-1 bg-slate-950/30 p-3 rounded-lg border border-slate-850 text-xs">
                    <span className="text-slate-500">SR Aging</span>
                    <p className="text-sm font-bold text-amber-400 font-mono">{selectedUnit.srAging || '-'} days</p>
                  </div>

                </div>
              </div>

              {/* Maintenance Schedule Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-950/20 border border-slate-850 rounded-lg flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Planned Date</span>
                    <span className="text-xs font-semibold text-slate-250 font-mono">{selectedUnit.plannedDate === 'NO DATA' ? '-' : formatCompactDate(selectedUnit.plannedDate || '')}</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-950/20 border border-slate-850 rounded-lg flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Last Service Date</span>
                    <span className="text-xs font-semibold text-slate-250 font-mono">{selectedUnit.lastDateService || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Tickets and References */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-sky-400" />
                  Systems Administration Registries
                </h4>
                <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-xl space-y-3 text-xs">
                  
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-850">
                    <span className="text-slate-500 font-medium">Service Request Number (SR)</span>
                    <span className="font-mono text-slate-200 font-semibold">{selectedUnit.srNumber || '-'}</span>
                  </div>

                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-850">
                    <span className="text-slate-500 font-medium">Service Request Date</span>
                    <span className="font-mono text-slate-205 text-slate-300">{selectedUnit.srDate || '-'}</span>
                  </div>

                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-850">
                    <span className="text-slate-500 font-medium">Work Order reference (WO)</span>
                    <span className="font-mono text-slate-200 font-semibold">{selectedUnit.woNumber || '-'}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Internal Support Ticket ID</span>
                    <span className="font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-white font-bold">{selectedUnit.idTicked || '-'}</span>
                  </div>

                </div>
              </div>

            </div>

            {/* Footer controls */}
            <div className="bg-slate-950 p-4 border-t border-slate-850 text-right">
              <button
                type="button"
                onClick={() => setSelectedUnit(null)}
                className="bg-slate-900 hover:bg-slate-800 text-slate-350 px-5 py-1.5 text-xs font-semibold rounded-lg border border-slate-800 transition-all cursor-pointer"
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Edit Unit Modal */}
      {editingUnit && editForm && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-500/20">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono uppercase">Edit Data Unit {editForm.snUnit}</h3>
                  <p className="text-xs text-slate-400">Sesuaikan data operasional dan sinkronisasikan ke Google Sheet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingUnit(null);
                  setEditForm(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateUnit} className="flex flex-col flex-1 overflow-hidden">
              {/* Form Content */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                
                {editSuccessMsg && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-mono flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{editSuccessMsg}</span>
                  </div>
                )}

                {editErrorMsg && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs font-mono flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                    <span>{editErrorMsg}</span>
                  </div>
                )}

                {/* Grid Layout groups */}
                <div className="space-y-6">
                  {/* Kelompok 1: Utama */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono border-b border-slate-800 pb-1">1. Informasi Pokok & Lokasi</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">SN UNIT (Primary Key)</label>
                        <input
                          type="text"
                          value={editForm.snUnit}
                          disabled
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-505 font-mono font-bold cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">MODEL</label>
                        <input
                          type="text"
                          value={editForm.model || ''}
                          onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg p-2.5 text-xs font-mono uppercase tracking-wide transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">LOKASI UNIT</label>
                        <input
                          type="text"
                          value={editForm.location || ''}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg p-2.5 text-xs font-mono uppercase tracking-wide transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Kelompok 2: Diagnosa & Status */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono border-b border-slate-800 pb-1">2. Diagnosa Troubleshoot & Status Operasional</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">UNIT STATUS</label>
                        <select
                          value={editForm.unitStatus || 'Running without trouble'}
                          onChange={(e) => setEditForm({ ...editForm, unitStatus: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-lg p-2.5 text-xs font-mono font-semibold transition-all focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="Running with trouble">Running with trouble</option>
                          <option value="Running without trouble">Running without trouble</option>
                          <option value="Breakdown">Breakdown</option>
                        </select>
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">JOB STATUS</label>
                        <select
                          value={
                            editForm.jobStatus === 'IN PROGRESS' ? 'INPROGRESS' :
                            (editForm.jobStatus === 'READY FOR USE' || editForm.jobStatus === 'COMPLETED' || !editForm.jobStatus) ? 'RFU' : 
                            editForm.jobStatus
                          }
                          onChange={(e) => setEditForm({ ...editForm, jobStatus: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-lg p-2.5 text-xs font-mono font-semibold transition-all focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="RFU">RFU</option>
                          <option value="WAITING PART">WAITING PART</option>
                          <option value="DELAY LABOUR">DELAY LABOUR</option>
                          <option value="INPROGRESS">INPROGRESS</option>
                          <option value="NONE">None</option>
                        </select>
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">ID TICKET</label>
                        <input
                          type="text"
                          value={editForm.idTicked || ''}
                          onChange={(e) => setEditForm({ ...editForm, idTicked: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg p-2.5 text-xs font-mono uppercase transition-all"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">DESKRIPSI KERUSAKAN / MASALAH (ISSUE DESCRIPTION)</label>
                        <textarea
                          rows={3}
                          value={editForm.issueDescription || ''}
                          onChange={(e) => setEditForm({ ...editForm, issueDescription: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 rounded-lg p-3 text-xs font-sans transition-all"
                          placeholder="Masukkan rincian kerusakan atau temuan problem di lapangan..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Kelompok 3: Telemetri */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono border-b border-slate-800 pb-1">3. Telemetri & Nilai Kinerja SMU</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-550 uppercase font-mono mb-1">SMU TO RUN (AUTO)</label>
                        <input
                          type="text"
                          value={editForm.smuToRun || '-'}
                          disabled
                          className="w-full bg-slate-900/60 border border-slate-800 text-sky-400 font-bold rounded-lg p-2 text-xs font-mono text-center cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-550 uppercase font-mono mb-1">PERCENT % (AUTO)</label>
                        <input
                          type="text"
                          value={editForm.percent || '-'}
                          disabled
                          className="w-full bg-slate-900/60 border border-slate-800 text-sky-400 font-bold rounded-lg p-2 text-xs font-mono text-center cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-550 uppercase font-mono mb-1">PLANNED SMU (AUTO)</label>
                        <input
                          type="text"
                          value={editForm.plannedSmu || '-'}
                          disabled
                          className="w-full bg-slate-900/60 border border-slate-800 text-sky-400 font-bold rounded-lg p-2 text-xs font-mono text-center cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono mb-1">LAST SERV SMU</label>
                        <input
                          type="text"
                          value={editForm.lastServiceSmu || ''}
                          onChange={(e) => setEditForm({ ...editForm, lastServiceSmu: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg p-2 text-xs font-mono text-center transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono mb-1 text-emerald-450">AVG RUN HR/DAY</label>
                        <input
                          type="text"
                          value="18"
                          disabled
                          className="w-full bg-slate-900/60 border border-slate-800 text-emerald-400 font-bold rounded-lg p-2 text-xs font-mono text-center cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Kelompok 4: Rencana dan Dokumen Administrasi */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono border-b border-slate-800 pb-1">4. Jadwal Pemeliharaan & Dokumen Administrasi</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1.5">PLANNED DATE (AUTO)</label>
                        <input
                          type="text"
                          value={editForm.plannedDate === 'NO DATA' ? 'NO DATA' : formatCompactDate(editForm.plannedDate)}
                          disabled
                          className="w-full bg-slate-900/60 border border-slate-800 text-sky-400 font-bold rounded-lg p-2.5 text-xs font-mono cursor-not-allowed"
                          placeholder="Calculated automatically"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">LAST DATE SERVICE (YYYY/MM/DD)</label>
                        <input
                          type="text"
                          value={editForm.lastDateService || ''}
                          className="w-full bg-slate-950 border border-slate-805 text-slate-300 rounded-lg p-2.5 text-xs font-mono focus:border-indigo-500 transition-all focus:ring-1 focus:ring-indigo-500"
                          placeholder="e.g. 01/06/2026"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">SR NUMBER (SERVICE REQ)</label>
                        <input
                          type="text"
                          value={editForm.srNumber || ''}
                          onChange={(e) => setEditForm({ ...editForm, srNumber: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg p-2.5 text-xs font-mono uppercase transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">SR DATE (TANGGAL SR)</label>
                        <input
                          type="text"
                          value={editForm.srDate || ''}
                          onChange={(e) => setEditForm({ ...editForm, srDate: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-805 text-slate-300 rounded-lg p-2.5 text-xs font-mono focus:border-indigo-500 transition-all focus:ring-1 focus:ring-indigo-500"
                          placeholder="e.g. 2026-06-03T07:00:00.000Z"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-550 uppercase font-mono mb-1.5">SR AGING (AUTO)</label>
                        <input
                          type="text"
                          value={editForm.srAging || '-'}
                          disabled
                          className="w-full bg-slate-900/60 border border-slate-800 text-sky-400 font-bold rounded-lg p-2.5 text-xs font-mono text-center cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">WO NUMBER (WORK ORDER)</label>
                        <input
                          type="text"
                          value={editForm.woNumber || ''}
                          onChange={(e) => setEditForm({ ...editForm, woNumber: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg p-2.5 text-xs font-mono uppercase transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer controls */}
              <div className="bg-slate-950/80 p-4 border-t border-slate-850 flex items-center justify-between shrink-0">
                <span className="text-[10px] text-slate-500 font-mono">PT. PRATAMA ABADI SENTOSA</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUnit(null);
                      setEditForm(null);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-350 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-800 transition-all cursor-pointer"
                    disabled={editLoading}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-500 hover:bg-sky-600 font-bold text-slate-955 text-xs px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-50"
                    disabled={editLoading}
                  >
                    {editLoading ? 'Menyimpan...' : 'Simpan ke Google Sheet'}
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {addModalOpen && addForm && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-500/10 text-sky-400 rounded-lg flex items-center justify-center border border-sky-500/20">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono uppercase">Tambah Unit Baru</h3>
                  <p className="text-xs text-slate-400">Daftarkan unit alat berat baru dan sinkronisasikan secara real-time ke Google Sheet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddModalOpen(false);
                }}
                className="text-slate-400 hover:text-white p-1 rounded transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateUnit} className="flex flex-col flex-1 overflow-hidden">
              {/* Form Content */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                
                {addSuccessMsg && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-mono flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{addSuccessMsg}</span>
                  </div>
                )}

                {addErrorMsg && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs font-mono flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                    <span>{addErrorMsg}</span>
                  </div>
                )}

                {/* Grid Layout groups */}
                <div className="space-y-6">
                  {/* Kelompok 1: Utama */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono border-b border-slate-800 pb-1">1. Informasi Pokok & Lokasi</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5 flex items-center gap-1">
                          SN UNIT <span className="text-rose-500 font-sans">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. HDCKEBAEJS0040563"
                          value={addForm.snUnit}
                          onChange={(e) => setAddForm({ ...addForm, snUnit: e.target.value.toUpperCase().trim() })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-white rounded-lg p-2.5 text-xs font-mono font-bold tracking-wider transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">MODEL</label>
                        <input
                          type="text"
                          placeholder="e.g. HX210HD"
                          value={addForm.model}
                          onChange={(e) => setAddForm({ ...addForm, model: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg p-2.5 text-xs font-mono uppercase tracking-wide transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">LOKASI UNIT</label>
                        <input
                          type="text"
                          placeholder="e.g. Tumbang Miri"
                          value={addForm.location}
                          onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg p-2.5 text-xs font-mono uppercase tracking-wide transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Kelompok 2: Diagnosa & Status */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono border-b border-slate-800 pb-1">2. Diagnosa Troubleshoot & Status Operasional</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">UNIT STATUS</label>
                        <select
                          value={addForm.unitStatus}
                          onChange={(e) => setAddForm({ ...addForm, unitStatus: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-lg p-2.5 text-xs font-mono font-semibold transition-all focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="Running with trouble">Running with trouble</option>
                          <option value="Running without trouble">Running without trouble</option>
                          <option value="Breakdown">Breakdown</option>
                        </select>
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">JOB STATUS</label>
                        <select
                          value={addForm.jobStatus || 'RFU'}
                          onChange={(e) => setAddForm({ ...addForm, jobStatus: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white rounded-lg p-2.5 text-xs font-mono font-semibold transition-all focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="RFU">RFU</option>
                          <option value="WAITING PART">WAITING PART</option>
                          <option value="DELAY LABOUR">DELAY LABOUR</option>
                          <option value="INPROGRESS">INPROGRESS</option>
                          <option value="NONE">None</option>
                        </select>
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">ID TICKET</label>
                        <input
                          type="text"
                          placeholder="e.g. 1000999"
                          value={addForm.idTicked}
                          onChange={(e) => setAddForm({ ...addForm, idTicked: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg p-2.5 text-xs font-mono uppercase transition-all"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">DESKRIPSI KERUSAKAN / MASALAH (ISSUE DESCRIPTION)</label>
                        <textarea
                          rows={3}
                          value={addForm.issueDescription}
                          onChange={(e) => setAddForm({ ...addForm, issueDescription: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 rounded-lg p-3 text-xs font-sans transition-all"
                          placeholder="Masukkan rincian kerusakan atau temuan problem di lapangan..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Kelompok 3: Telemetri */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono border-b border-slate-800 pb-1">3. Telemetri & Nilai Kinerja SMU</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-550 uppercase font-mono mb-1">SMU TO RUN (AUTO)</label>
                        <input
                          type="text"
                          value={addForm.smuToRun || '-'}
                          disabled
                          className="w-full bg-slate-900/60 border border-slate-800 text-sky-400 font-bold rounded-lg p-2 text-xs font-mono text-center cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-550 uppercase font-mono mb-1">PERCENT % (AUTO)</label>
                        <input
                          type="text"
                          value={addForm.percent || '-'}
                          disabled
                          className="w-full bg-slate-900/60 border border-slate-800 text-sky-400 font-bold rounded-lg p-2 text-xs font-mono text-center cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-550 uppercase font-mono mb-1">PLANNED SMU (AUTO)</label>
                        <input
                          type="text"
                          value={addForm.plannedSmu || '-'}
                          disabled
                          className="w-full bg-slate-900/60 border border-slate-800 text-sky-400 font-bold rounded-lg p-2 text-xs font-mono text-center cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono mb-1">LAST SERV SMU</label>
                        <input
                          type="text"
                          placeholder="-"
                          value={addForm.lastServiceSmu}
                          onChange={(e) => setAddForm({ ...addForm, lastServiceSmu: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg p-2 text-xs font-mono text-center transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono mb-1 text-emerald-450 flex items-center justify-center gap-0.5">AVG RUN/DAY</label>
                        <input
                          type="text"
                          value="18"
                          disabled
                          className="w-full bg-slate-900/60 border border-slate-800 text-emerald-400 font-bold rounded-lg p-2 text-xs font-mono text-center cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Kelompok 4: Rencana dan Dokumen Administrasi */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono border-b border-slate-800 pb-1">4. Jadwal Pemeliharaan & Dokumen Administrasi</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-505 uppercase font-mono mb-1.5">PLANNED DATE (AUTO)</label>
                        <input
                          type="text"
                          value={addForm.plannedDate === 'NO DATA' ? 'NO DATA' : formatCompactDate(addForm.plannedDate)}
                          disabled
                          className="w-full bg-slate-900/60 border border-slate-800 text-sky-400 font-bold rounded-lg p-2.5 text-xs font-mono cursor-not-allowed"
                          placeholder="Calculated automatically"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">LAST DATE SERVICE (YYYY/MM/DD)</label>
                        <input
                          type="text"
                          value={addForm.lastDateService}
                          onChange={(e) => setAddForm({ ...addForm, lastDateService: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-808 text-slate-350 rounded-lg p-2.5 text-xs font-mono focus:border-indigo-500 transition-all focus:ring-1 focus:ring-indigo-500"
                          placeholder="e.g. 01/06/2026"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">SR NUMBER (SERVICE REQ)</label>
                        <input
                          type="text"
                          placeholder="e.g. SR/BJM/03"
                          value={addForm.srNumber}
                          onChange={(e) => setAddForm({ ...addForm, srNumber: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg p-2.5 text-xs font-mono uppercase transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">SR DATE (TANGGAL SR)</label>
                        <input
                          type="text"
                          value={addForm.srDate}
                          onChange={(e) => setAddForm({ ...addForm, srDate: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-808 text-slate-350 rounded-lg p-2.5 text-xs font-mono focus:border-indigo-500 transition-all focus:ring-1 focus:ring-indigo-500"
                          placeholder="e.g. 2026-06-03T07:00:00.000Z"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-550 uppercase font-mono mb-1.5">SR AGING (AUTO)</label>
                        <input
                          type="text"
                          value={addForm.srAging || '-'}
                          disabled
                          className="w-full bg-slate-900/60 border border-slate-800 text-sky-400 font-bold rounded-lg p-2.5 text-xs font-mono text-center cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1.5">WO NUMBER (WORK ORDER)</label>
                        <input
                          type="text"
                          placeholder="e.g. WO-UEI-04"
                          value={addForm.woNumber}
                          onChange={(e) => setAddForm({ ...addForm, woNumber: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-lg p-2.5 text-xs font-mono uppercase transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer controls */}
              <div className="bg-slate-950/80 p-4 border-t border-slate-850 flex items-center justify-between shrink-0">
                <span className="text-[10px] text-slate-500 font-mono">PT. PRATAMA ABADI SENTOSA</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddModalOpen(false);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-350 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-800 transition-all cursor-pointer"
                    disabled={addLoading}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-500 hover:bg-sky-600 font-bold text-slate-955 text-xs px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-50"
                    disabled={addLoading}
                  >
                    {addLoading ? 'Menyimpan...' : 'Tambahkan Unit'}
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {configModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-500/20">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Integrasi Google Sheets</h3>
                  <p className="text-xs text-slate-400">Sinkronisasi armada PT. Pratama Abadi Sentosa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 text-xs uppercase"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Tab */}
            <div className="p-6 space-y-6">
              
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-200">Langkah 1: Pasang Google Apps Script</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Buka file Google Spreadsheet Anda, pilih menu <strong className="text-slate-200">Extensions (Ekstensi)</strong> &gt; <strong className="text-slate-200">Apps Script</strong>, hapus semua kode yang ada disana, lalu salin dan tempel kode berikut:
                </p>

                {/* Code highlight */}
                <div className="bg-slate-950 border border-slate-850 rounded-lg p-4 relative group">
                  <pre className="text-xs font-mono text-indigo-400 text-slate-300 overflow-x-auto leading-relaxed whitespace-pre font-mono max-h-[160px]">
                    {`function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    // Temukan header
    var headerRowIndex = 0;
    for (var i = 0; i < Math.min(data.length, 6); i++) {
      var rowStr = data[i].map(function(c) { return String(c).toLowerCase(); }).join('|');
      if (rowStr.indexOf('unit') !== -1 || rowStr.indexOf('sn') !== -1) {
        headerRowIndex = i;
        break;
      }
    }
    
    var headers = data[headerRowIndex].map(function(h) { return String(h).trim(); });
    
    // Cari kolom SN UNIT
    var snColIdx = -1;
    for (var col = 0; col < headers.length; col++) {
      var norm = headers[col].toLowerCase().replace(/[^a-z0-9%\\s]/g, '').replace(/\\s+/g, ' ').trim();
      if (norm.indexOf('sn unit') !== -1 || norm.indexOf('snunit') !== -1) {
        snColIdx = col;
        break;
      }
    }
    
    if (snColIdx === -1) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "SN UNIT not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var snToMatch = String(payload.snUnit).trim();
    if (!snToMatch) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "snUnit parameter is empty" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var rowToEdit = -1;
    for (var r = headerRowIndex + 1; r < data.length; r++) {
      if (String(data[r][snColIdx]).trim() === snToMatch) {
        rowToEdit = r;
        break;
      }
    }
    
    function getNormalizedKey(key) {
      var norm = key.toLowerCase().replace(/[^a-z0-9%\\s]/g, '').replace(/\\s+/g, ' ').trim();
      if (norm.indexOf('sn unit') !== -1 || norm.indexOf('snunit') !== -1) return 'snUnit';
      if (norm === 'model') return 'model';
      if (norm.indexOf('issue description') !== -1 || norm.indexOf('issue') !== -1) return 'issueDescription';
      if (norm === 'location') return 'location';
      if (norm.indexOf('unit status') !== -1 || norm.indexOf('unitstatus') !== -1) return 'unitStatus';
      if (norm.indexOf('smu to run') !== -1 || norm.indexOf('smutorun') !== -1) return 'smuToRun';
      if (norm === '%' || norm.indexOf('percent') !== -1 || norm.indexOf('persen') !== -1) return 'percent';
      if (norm.indexOf('planned smu') !== -1 || norm.indexOf('plannedsmu') !== -1) return 'plannedSmu';
      if (norm.indexOf('planned date') !== -1 || norm.indexOf('planneddate') !== -1) return 'plannedDate';
      if (norm.indexOf('last date service') !== -1 || norm.indexOf('lastdate') !== -1) return 'lastDateService';
      if (norm.indexOf('last service smu') !== -1 || norm.indexOf('lastservice') !== -1) return 'lastServiceSmu';
      if (norm.indexOf('averang') !== -1 || norm.indexOf('average') !== -1) return 'averageUnitRun';
      if (norm.indexOf('sr number') !== -1 || norm.indexOf('srnumber') !== -1) return 'srNumber';
      if (norm.indexOf('sr date') !== -1 || norm.indexOf('srdate') !== -1) return 'srDate';
      if (norm.indexOf('sr aging') !== -1 || norm.indexOf('sraging') !== -1) return 'srAging';
      if (norm.indexOf('wo number') !== -1 || norm.indexOf('wonumber') !== -1) return 'woNumber';
      if (norm.indexOf('id ticked') !== -1 || norm.indexOf('idticket') !== -1 || norm.indexOf('id ticket') !== -1) return 'idTicked';
      if (norm.indexOf('job status') !== -1 || norm.indexOf('jobstatus') !== -1) return 'jobStatus';
      return '';
    }
    
    var keyToColIdx = {};
    for (var col = 0; col < headers.length; col++) {
      var normKey = getNormalizedKey(headers[col]);
      if (normKey) {
        keyToColIdx[normKey] = col;
      }
    }
    
    var activeSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    if (rowToEdit === -1) {
      // Append new unit row if not existing in sheet
      var newRow = [];
      for (var col = 0; col < headers.length; col++) {
        newRow.push('');
      }
      newRow[snColIdx] = snToMatch;
      for (var k in payload) {
        if (payload.hasOwnProperty(k) && k !== 'snUnit') {
          var colIndex = keyToColIdx[k];
          if (colIndex !== undefined) {
            newRow[colIndex] = payload[k];
          }
        }
      }
      activeSheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Unit baru berhasil ditambahkan" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Update matching columns with new payload values
    for (var k in payload) {
      if (payload.hasOwnProperty(k) && k !== 'snUnit') {
        var colIndex = keyToColIdx[k];
        if (colIndex !== undefined) {
          activeSheet.getRange(rowToEdit + 1, colIndex + 1).setValue(payload[k]);
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                  </pre>
                  
                  <button
                    type="button"
                    onClick={copyScriptText}
                    className="absolute top-3 right-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-305 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Salin Kode
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-200">Langkah 2: Ambil Link Web App (Deploy)</h4>
                <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside leading-relaxed pl-1">
                  <li>Klik tombol <strong className="text-slate-200">Deploy</strong> di pojok kanan atas halaman Apps Script, pilih <strong className="text-slate-200">New deployment (Penerapan baru)</strong>.</li>
                  <li>Pilih jenis deployment: <strong className="text-slate-200">Web app</strong> (Kursor gerigi).</li>
                  <li>Isi deskripsi bebas, lalu atur <strong className="text-slate-200">Execute as:</strong> <span className="text-indigo-400 text-slate-300">Me (Email Anda)</span>.</li>
                  <li>Atur <strong className="text-slate-200">Who has access:</strong> <span className="text-emerald-400 text-slate-300">Anyone (Siapa saja)</span> agar dashboard dapat membaca data.</li>
                  <li>Klik tombol <strong className="text-slate-200">Deploy</strong>, konfirmasi izin masuk jika diminta oleh Google.</li>
                  <li>Salin alamat <strong className="font-bold text-slate-250 text-slate-300">Web app URL</strong> yang dihasilkan (berakhiran <code className="text-indigo-400 font-mono">/exec</code>).</li>
                </ol>
              </div>

              {/* Form Input URL */}
              <form onSubmit={handleSaveConfig} className="space-y-4 pt-4 border-t border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-400" />
                    Google Apps Script Web App URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    value={gasUrl}
                    onChange={(e) => setGasUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 font-mono focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                  <p className="text-[10px] text-slate-500 font-medium">
                    *URL ini digunakan sebagai secure connector data secara real-time dari Google Sheet PT. Pratama Abadi Sentosa.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs">
                    {saveSuccess && (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 animate-pulse">
                        <Check className="w-4 h-4" />
                        Konfigurasi berhasil disimpan!
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setConfigModalOpen(false)}
                      className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={saveLoading}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 font-semibold px-5 py-2 rounded-xl text-xs cursor-pointer flex items-center gap-2 disabled:opacity-50 transition-all"
                    >
                      {saveLoading ? 'Menyimpan...' : 'Simpan Koneksi'}
                    </button>
                  </div>
                </div>
              </form>

            </div>

          </div>
        </div>
      )}

      {/* Force Reload Confirmation Modal */}
      {showFrcReloadConfirm && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col p-6 space-y-6">
            <div className="flex gap-4">
              <div className="w-11 h-11 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Data Belum Disinkronkan!</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Terdapat <span className="text-amber-400 font-semibold">{unsyncedSns.length} perubahan unit</span> yang belum disalin ke Google Sheet. Melakukan Force Reload sekarang akan menimpa dan membuang perubahan lokal tersebut secara permanen.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end text-xs font-semibold pt-2">
              <button
                type="button"
                onClick={() => setShowFrcReloadConfirm(false)}
                className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Kembali
              </button>
              
              <button
                type="button"
                onClick={handleConfirmDiscardAndReload}
                className="bg-rose-950 border border-rose-800 text-rose-300 hover:bg-rose-900 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Buang & Reload
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowFrcReloadConfirm(false);
                  handlePushToSheet();
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white border border-amber-500 px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-amber-600/10 cursor-pointer"
              >
                <CloudUpload className="w-4 h-4" />
                Sinkronkan Dulu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
