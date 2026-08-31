// Configuration settings (Secrets & student personal data are stored exclusively in Google Cloud)
const EXCEL_SETTINGS = {
  "config": {
    "academic_year": 2569,
    "min_hours_semester": 25,
    "min_hours": 50,
    "max_hours": 400
  },
  "line": {
    "line_oa_id": "@586diwio",
    "line_oa_url": "https://line.me/R/ti/p/@586diwio",
    "bot_name": "SMART DBS RTAFNC (@586diwio)"
  }
};
if (typeof window !== "undefined") { window.EXCEL_SETTINGS = EXCEL_SETTINGS; }
if (typeof globalThis !== "undefined") { globalThis.EXCEL_SETTINGS = EXCEL_SETTINGS; }
