window.RTAFNC_ONE_CONFIG = Object.freeze({
  APP_NAME: "RTAFNC ONE",
  PILOT_VERSION: "0.3.0",
  GOOD_DEED_API_URL: "https://script.google.com/macros/s/AKfycbwV0b31hWMSs2oNOff4o-O_PNoEQ1XlTM77f4sei9JLh1rza1SfFPTOlTaxiIKCIxLT_Q/exec",
  CURRENT_LIFF_ID: "2010948179-Ympqt2bT",
  CURRENT_LIFF_URL: "https://liff.line.me/2010948179-Ympqt2bT",
  REQUEST_TIMEOUT_MS: 30000,
  RESPONSE_ORIGINS: ["https://script.google.com", "https://script.googleusercontent.com"],

  // Phase 3: leave blank until the authenticated AGIS Worker is deployed and verified.
  // Never place Gemini keys, MCP tokens, Drive credentials or other secrets in this client config.
  AGIS_API_BASE: "",
  FEATURES: Object.freeze({
    AGIS_KNOWLEDGE: true,
    SECURE_SOURCE_OPEN: true,
    MCP_ACTIONS: false
  }),

  LINKS: {
    GOOD_DEED: "../frontend/student-dashboard.html",
    APPROVAL: "../frontend/teacher-dashboard.html",
    CARD_SHOWCASE: "../frontend/view_cards.html",
    PROFILE: "../frontend/profile.html",
    SIGN: "../frontend/approve_sign.html",
    SUBMIT_DEED: "../frontend/submit-deed.html",
    LIBRARY: "library.html"
  }
});
