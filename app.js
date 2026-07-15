// Signal Monitoring Dashboard Application Logic

// --- App State ---
let state = {
  signals: [],
  savedSignalIds: new Set(),
  searchQuery: "",
  relevanceFilter: "all",
  activeTab: "all",
  activePanel: "feed-panel",
  selectedSignal: null,
  apifyToken: "",
  hasBackendToken: false,
  apifyRuns: [],
  googleAccessToken: null,
  pendingExportSignal: null,
  keywords: {
    model: ["foundation model", "train", "fine-tuning", "vlm", "llm", "compute", "rlhf", "scaling compute"],
    sourcing: ["source", "vendor", "labeling", "annotation", "annotate", "annotators", "buy data", "license data", "sourcing"],
    discussion: ["synthetic data", "human-labelled", "dataset", "datasets", "compliance", "consent", "data quality", "catalogue"]
  }
};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", async () => {
  loadLocalStorage();
  initializeDefaultSignals();
  setupEventListeners();
  await checkBackendToken();
  renderAll();
  
  // Initialize Theme Switcher
  const themeToggle = document.getElementById("theme-toggle-btn");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
      const newTheme = currentTheme === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("p4_theme", newTheme);
      updateThemeIcon(newTheme);
    });
  }

  // Load and apply saved theme
  const savedTheme = localStorage.getItem("p4_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);

  // Initialize direct Google Sheets API client
  initGoogleTokenClient();

  // Set up periodic check for running Apify tasks (if token is present)
  if (state.apifyToken || state.hasBackendToken) {
    setInterval(checkRunningTasks, 10000);
  }
});

function updateThemeIcon(theme) {
  const icon = document.getElementById("theme-icon");
  if (!icon) return;
  if (theme === "dark") {
    // Sun icon SVG
    icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m2.828-9.9a5 5 0 11-7.07 7.07 5 5 0 017.07-7.07z"/>`;
  } else {
    // Moon icon SVG
    icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>`;
  }
}

async function checkBackendToken() {
  try {
    const res = await fetch('/api/apify?action=check');
    const data = await res.json();
    if (data && data.hasToken) {
      state.hasBackendToken = true;
      toggleTokenUI(true, true);
    }
  } catch (e) {
    console.log("No serverless API detected. Operating in Local/Demo Mode.");
  }
}

// --- LocalStorage Logic ---
function loadLocalStorage() {
  // Load API Key
  const storedToken = localStorage.getItem("p4_apify_token");
  if (storedToken) {
    const tokenInput = document.getElementById("apify-token-input");
    if (tokenInput) {
      tokenInput.value = storedToken;
      toggleTokenUI(true);
    }
  }

  // Load Google Sheets Config
  const storedSpreadsheetId = localStorage.getItem("p4_google_spreadsheet_id");
  if (storedSpreadsheetId) {
    const sheetInput = document.getElementById("google-spreadsheet-id");
    if (sheetInput) sheetInput.value = storedSpreadsheetId;
  }
  const storedSheetName = localStorage.getItem("p4_google_sheet_name");
  if (storedSheetName) {
    const tabInput = document.getElementById("google-sheet-name");
    if (tabInput) tabInput.value = storedSheetName;
  }
  const storedClientId = localStorage.getItem("p4_google_client_id");
  if (storedClientId) {
    const clientInput = document.getElementById("google-client-id");
    if (clientInput) clientInput.value = storedClientId;
  }
  
  // Try loading access token
  const storedAccessToken = localStorage.getItem("p4_google_access_token");
  if (storedAccessToken) {
    state.googleAccessToken = storedAccessToken;
    // We toggle Google UI after a delay to ensure elements are ready
    setTimeout(() => toggleGoogleUI(true), 100);
  }

  // Load SheetDB URL
  const storedSheetsUrl = localStorage.getItem("p4_sheets_url");
  if (storedSheetsUrl) {
    const sheetsInput = document.getElementById("sheets-url-input");
    if (sheetsInput) {
      sheetsInput.value = storedSheetsUrl;
      setTimeout(() => toggleSheetsUI(true), 100);
    }
  }

  // Load Saved Signal IDs
  const storedSavedIds = localStorage.getItem("p4_saved_signal_ids");
  if (storedSavedIds) {
    state.savedSignalIds = new Set(JSON.parse(storedSavedIds));
  }

  // Load Custom Keywords
  const storedKeywords = localStorage.getItem("p4_keywords");
  if (storedKeywords) {
    state.keywords = JSON.parse(storedKeywords);
  }

  // Load Scrape Runs
  const storedRuns = localStorage.getItem("p4_apify_runs");
  if (storedRuns) {
    state.apifyRuns = JSON.parse(storedRuns);
  }
  
  // Load Saved Signals
  const storedSignals = localStorage.getItem("p4_scraped_signals");
  if (storedSignals) {
    state.signals = JSON.parse(storedSignals);
  }
}

function saveToLocalStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function initializeDefaultSignals() {
  // If we haven't stored any custom/scraped signals, load the rich default mock dataset
  if (state.signals.length === 0) {
    // Re-evaluate mock signals with current keywords to calculate scores
    state.signals = MOCK_SIGNALS.map(sig => evaluateSignal(sig));
    saveToLocalStorage("p4_scraped_signals", state.signals);
  } else {
    // Re-score loaded signals in case keywords were changed in previous sessions
    state.signals = state.signals.map(sig => evaluateSignal(sig));
  }
}

// --- Relevance Scoring Engine ---
function evaluateSignal(signal) {
  const text = (signal.text || "").toLowerCase();
  const title = (signal.title || "").toLowerCase();
  const combinedText = `${title} ${text}`;
  
  let score = 0;
  const matchedKeywords = [];
  let categoryMatches = { model: 0, sourcing: 0, discussion: 0 };

  // Check model keywords (+15 each)
  state.keywords.model.forEach(kw => {
    if (combinedText.includes(kw.toLowerCase())) {
      score += 15;
      matchedKeywords.push(kw);
      categoryMatches.model++;
    }
  });

  // Check sourcing keywords (+25 each - highest signal)
  state.keywords.sourcing.forEach(kw => {
    if (combinedText.includes(kw.toLowerCase())) {
      score += 25;
      matchedKeywords.push(kw);
      categoryMatches.sourcing++;
    }
  });

  // Check discussion keywords (+15 each)
  state.keywords.discussion.forEach(kw => {
    if (combinedText.includes(kw.toLowerCase())) {
      score += 15;
      matchedKeywords.push(kw);
      categoryMatches.discussion++;
    }
  });

  // Determine Category based on highest match type
  let category = "AI Model Development";
  if (categoryMatches.sourcing >= categoryMatches.model && categoryMatches.sourcing >= categoryMatches.discussion && categoryMatches.sourcing > 0) {
    category = "Data Sourcing";
  } else if (categoryMatches.discussion >= categoryMatches.model && categoryMatches.discussion >= categoryMatches.sourcing && categoryMatches.discussion > 0) {
    category = "Dataset Discussion";
  }

  // Determine Relevance Tier
  let relevance = "low";
  if (score >= 35) {
    relevance = "high";
  } else if (score >= 15) {
    relevance = "medium";
  }

  return {
    ...signal,
    relevance,
    category,
    keywords: [...new Set(matchedKeywords)],
    score // Store numeric score for sorting details
  };
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Sidebar Panel Switching
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-target");
      
      // Update active nav item styles
      document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");
      
      // Toggle panel sections
      document.querySelectorAll(".panel-section").forEach(panel => panel.classList.remove("active"));
      document.getElementById(target).classList.add("active");
      
      // Update Header Text
      const titleText = item.textContent.trim();
      document.getElementById("panel-title-text").textContent = titleText;
      
      state.activePanel = target;
      renderAll();
    });
  });

  // Feed Tab Filtering
  document.querySelectorAll("[data-feed-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-feed-tab]").forEach(t => t.classList.remove("active"));
      btn.classList.add("active");
      state.activeTab = btn.getAttribute("data-feed-tab");
      renderSignalsList();
    });
  });

  // Search & Filter inputs
  document.getElementById("search-bar").addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    renderSignalsList();
  });

  document.getElementById("relevance-filter").addEventListener("change", (e) => {
    state.relevanceFilter = e.target.value;
    renderSignalsList();
  });

  // Apify Token Management
  document.getElementById("save-token-btn").addEventListener("click", () => {
    const input = document.getElementById("apify-token-input").value.trim();
    if (!input) {
      showToast("Please enter an Apify API Token", "warning");
      return;
    }
    state.apifyToken = input;
    localStorage.setItem("p4_apify_token", input);
    toggleTokenUI(true);
    showToast("Apify Token successfully connected!", "success");
    renderAll();
  });

  document.getElementById("disconnect-token-btn").addEventListener("click", () => {
    state.apifyToken = "";
    localStorage.removeItem("p4_apify_token");
    document.getElementById("apify-token-input").value = "";
    toggleTokenUI(false);
    showToast("Apify Token disconnected. Switched to Simulation Mode.", "info");
    renderAll();
  });

  // Google Sheets Direct OAuth Management
  document.getElementById("connect-google-btn").addEventListener("click", () => {
    requestGoogleAuth();
  });

  document.getElementById("disconnect-google-btn").addEventListener("click", () => {
    disconnectGoogle();
  });

  // Auto-save configs as user edits them
  document.getElementById("google-spreadsheet-id").addEventListener("input", (e) => {
    localStorage.setItem("p4_google_spreadsheet_id", e.target.value.trim());
  });

  document.getElementById("google-sheet-name").addEventListener("input", (e) => {
    localStorage.setItem("p4_google_sheet_name", e.target.value.trim());
  });

  document.getElementById("google-client-id").addEventListener("input", (e) => {
    localStorage.setItem("p4_google_client_id", e.target.value.trim());
    initGoogleTokenClient();
  });

  // SheetDB Management
  document.getElementById("save-sheets-btn").addEventListener("click", () => {
    const input = document.getElementById("sheets-url-input").value.trim();
    if (!input) {
      showToast("Please enter a SheetDB API URL", "warning");
      return;
    }
    localStorage.setItem("p4_sheets_url", input);
    toggleSheetsUI(true);
    showToast("SheetDB URL successfully saved and connected!", "success");
  });

  document.getElementById("disconnect-sheets-btn").addEventListener("click", () => {
    localStorage.removeItem("p4_sheets_url");
    toggleSheetsUI(false);
    showToast("SheetDB URL disconnected.", "info");
  });

  // Keyword Adding
  document.querySelectorAll(".add-keyword-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const category = btn.getAttribute("data-category");
      const inputEl = document.getElementById(`input-keyword-${category}`);
      const val = inputEl.value.trim().toLowerCase();
      
      if (!val) return;
      if (state.keywords[category].includes(val)) {
        showToast("Keyword already exists", "warning");
        return;
      }

      state.keywords[category].push(val);
      saveToLocalStorage("p4_keywords", state.keywords);
      inputEl.value = "";
      
      // Re-evaluate existing signals with new keyword score weights
      state.signals = state.signals.map(evaluateSignal);
      saveToLocalStorage("p4_scraped_signals", state.signals);
      
      showToast(`Added keyword: "${val}"`, "success");
      renderAll();
    });
  });

  // Reset Keywords
  document.getElementById("reset-keywords-btn").addEventListener("click", () => {
    state.keywords = {
      model: ["foundation model", "train", "fine-tuning", "vlm", "llm", "compute", "rlhf", "scaling compute"],
      sourcing: ["source", "vendor", "labeling", "annotation", "annotate", "annotators", "buy data", "license data", "sourcing"],
      discussion: ["synthetic data", "human-labelled", "dataset", "datasets", "compliance", "consent", "data quality", "catalogue"]
    };
    saveToLocalStorage("p4_keywords", state.keywords);
    state.signals = state.signals.map(evaluateSignal);
    saveToLocalStorage("p4_scraped_signals", state.signals);
    showToast("Keywords reset to default criteria", "info");
    renderAll();
  });

  // Manual Sync Action
  document.getElementById("manual-sync-btn").addEventListener("click", () => {
    if (!state.apifyToken) {
      showToast("Simulation Sync complete (Mock feed updated). Connect an Apify token to scrape live data.", "info");
      return;
    }
    checkRunningTasks();
    showToast("Checking recent Apify runs for new signals...", "info");
  });

  // Scraper Modals launch
  document.querySelectorAll(".run-actor-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!state.apifyToken) {
        showToast("Please connect your Apify API Token in the settings first", "warning");
        // Redirect user to the connection panel
        const navItem = document.querySelector('[data-target="integration-panel"]');
        if (navItem) navItem.click();
        return;
      }
      
      const actorType = btn.getAttribute("data-actor");
      openActorModal(actorType);
    });
  });

  // Modal Cancel
  document.getElementById("modal-cancel-btn").addEventListener("click", closeActorModal);

  // Modal Start Run
  document.getElementById("modal-start-btn").addEventListener("click", () => {
    const actorType = document.getElementById("modal-start-btn").getAttribute("data-actor-type");
    const queries = document.getElementById("actor-queries-input").value.trim();
    const maxItems = parseInt(document.getElementById("actor-max-items").value, 10) || 10;
    
    if (!queries) {
      showToast("Please specify search query phrases", "warning");
      return;
    }
    
    launchApifyScraper(actorType, queries, maxItems);
    closeActorModal();
  });
}

function toggleTokenUI(isConnected, isBackend = false) {
  const saveBtn = document.getElementById("save-token-btn");
  const disconnectBtn = document.getElementById("disconnect-token-btn");
  const tokenInput = document.getElementById("apify-token-input");
  const statusBadge = document.getElementById("connection-status-badge");
  const statusText = document.getElementById("connection-status-text");

  if (isConnected) {
    saveBtn.style.display = "none";
    tokenInput.disabled = true;
    statusBadge.className = "mode-badge live";
    if (isBackend) {
      disconnectBtn.style.display = "none";
      tokenInput.placeholder = "Configured securely in Vercel Environment Variables";
      tokenInput.value = "••••••••••••••••••••••••••••••••";
      statusText.textContent = "Live (Vercel Env)";
    } else {
      disconnectBtn.style.display = "block";
      statusText.textContent = "Live Connection";
    }
  } else {
    saveBtn.style.display = "block";
    disconnectBtn.style.display = "none";
    tokenInput.disabled = false;
    tokenInput.placeholder = "apify_api_...";
    tokenInput.value = "";
    statusBadge.className = "mode-badge simulation";
    statusText.textContent = "Demo Mode";
  }
}

// --- Render Core Router ---
function renderAll() {
  if (state.activePanel === "feed-panel") {
    renderStats();
    renderSignalsList();
  } else if (state.activePanel === "integration-panel") {
    renderRunsHistory();
  } else if (state.activePanel === "keywords-panel") {
    renderKeywordsChips();
  }
}

// --- Stats Rendering ---
function renderStats() {
  document.getElementById("stat-total").textContent = state.signals.length;
  
  const highCount = state.signals.filter(s => s.relevance === "high").length;
  document.getElementById("stat-high").textContent = highCount;

  const sourcingCount = state.signals.filter(s => s.category === "Data Sourcing").length;
  document.getElementById("stat-sourcing").textContent = sourcingCount;

  const savedCount = state.savedSignalIds.size;
  document.getElementById("stat-saved").textContent = savedCount;
}

// --- Feed List Rendering ---
function renderSignalsList() {
  const listEl = document.getElementById("signals-list-element");
  listEl.innerHTML = "";

  // Apply filters
  let filtered = state.signals;

  // Tab Filtering
  if (state.activeTab === "linkedin") {
    filtered = filtered.filter(s => s.source === "linkedin");
  } else if (state.activeTab === "news") {
    filtered = filtered.filter(s => s.source === "news");
  } else if (state.activeTab === "saved") {
    filtered = filtered.filter(s => state.savedSignalIds.has(s.id));
  }

  // Relevance Filtering
  if (state.relevanceFilter === "high") {
    filtered = filtered.filter(s => s.relevance === "high");
  } else if (state.relevanceFilter === "medium") {
    filtered = filtered.filter(s => s.relevance === "high" || s.relevance === "medium");
  }

  // Search Query Filtering
  if (state.searchQuery.trim() !== "") {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(s => 
      (s.company && s.company.toLowerCase().includes(q)) ||
      (s.author && s.author.toLowerCase().includes(q)) ||
      (s.text && s.text.toLowerCase().includes(q)) ||
      (s.title && s.title.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;color:var(--text-muted);border:1px dashed var(--glass-border);border-radius:var(--radius-md);">
        <p style="font-size:14px;font-weight:600;margin-bottom:8px;">No signals found</p>
        <p style="font-size:12px;">Try adjusting your filters, query keywords, or run a new Apify scraper task.</p>
      </div>
    `;
    return;
  }

  // Sort signals: High Relevance -> Medium -> Low, then new timestamps (represented by position in array if timestamp is string relative)
  // Since we want live scraped results first, we can reverse the list to show newest items first (assuming newest are pushed at the end)
  const sorted = [...filtered].reverse();

  sorted.forEach(signal => {
    const isSaved = state.savedSignalIds.has(signal.id);
    const card = document.createElement("div");
    card.className = `signal-card relevance-${signal.relevance} ${state.selectedSignal && state.selectedSignal.id === signal.id ? "active" : ""}`;
    card.setAttribute("data-id", signal.id);

    const initials = signal.author ? signal.author.split(" ").map(n => n[0]).join("").slice(0,2) : "AI";
    const sourceLabel = signal.source === "linkedin" ? "LinkedIn" : "News";

    card.innerHTML = `
      <div class="card-header">
        <div class="author-info">
          <div class="avatar ${signal.source}">${initials}</div>
          <div class="author-meta">
            <span class="author-name">${signal.author || signal.company}</span>
            <span class="author-title">${signal.title || "Industry Feed Update"}</span>
          </div>
        </div>
        <div class="meta-badges">
          ${isSaved ? `
            <svg style="color:var(--color-warning);width:16px;height:16px;margin-right:4px;" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
            </svg>
          ` : ""}
          <span class="badge badge-relevance-${signal.relevance}">${signal.relevance}</span>
          <span class="badge badge-source">${sourceLabel}</span>
        </div>
      </div>
      <div class="card-body">
        ${signal.text}
      </div>
      <div class="card-footer">
        <div class="keyword-tags">
          ${(signal.keywords || []).slice(0, 3).map(kw => `<span class="tag">${kw}</span>`).join("")}
          ${(signal.keywords || []).length > 3 ? `<span class="tag">+${signal.keywords.length - 3}</span>` : ""}
        </div>
        <span>${signal.timestamp}</span>
      </div>
    `;

    card.addEventListener("click", () => {
      // Toggle active states
      document.querySelectorAll(".signal-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      
      selectSignal(signal);
    });

    listEl.appendChild(card);
  });

  // Select first signal automatically if none is selected or the selected one isn't in the filtered list
  if (sorted.length > 0) {
    const isSelectedInFiltered = sorted.some(s => state.selectedSignal && s.id === state.selectedSignal.id);
    if (!state.selectedSignal || !isSelectedInFiltered) {
      // Small timeout to prevent active event trigger collision
      setTimeout(() => {
        const firstCard = listEl.querySelector(".signal-card");
        if (firstCard) firstCard.click();
      }, 50);
    }
  } else {
    // Hide detail content and show placeholder
    document.getElementById("detail-content-element").style.display = "none";
    document.getElementById("detail-placeholder-element").style.display = "flex";
  }
}

// --- Detail Drawer Selection & Render ---
function selectSignal(signal) {
  state.selectedSignal = signal;
  
  const placeholderEl = document.getElementById("detail-placeholder-element");
  const contentEl = document.getElementById("detail-content-element");
  
  placeholderEl.style.display = "none";
  contentEl.style.display = "flex";

  const isSaved = state.savedSignalIds.has(signal.id);
  const sourceLabel = signal.source === "linkedin" ? "LinkedIn Post" : "News Article";
  const channelIcon = signal.source === "linkedin" 
    ? `<svg style="width:16px;height:16px;color:#0077b5;" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>`
    : `<svg style="width:16px;height:16px;color:#de3e3e;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>`;

  // Dynamically generate pitch if it doesn't exist
  let pitch = signal.suggestedPitch;
  if (!pitch) {
    pitch = generateDynamicPitch(signal);
    // save it back
    signal.suggestedPitch = pitch;
    const idx = state.signals.findIndex(s => s.id === signal.id);
    if (idx !== -1) {
      state.signals[idx] = signal;
      saveToLocalStorage("p4_scraped_signals", state.signals);
    }
  }

  contentEl.innerHTML = `
    <!-- Header -->
    <div class="detail-header">
      <div class="detail-meta-row">
        <span class="detail-source-badge">${channelIcon} ${sourceLabel}</span>
        <span class="badge badge-relevance-${signal.relevance}">${signal.relevance} Relevance</span>
      </div>
      
      <div>
        <h2 style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:4px;">${signal.author || signal.company}</h2>
        <p style="font-size:12px;color:var(--text-muted);">${signal.title || "Lead Opportunity"}</p>
      </div>

      <div class="company-meta-card">
        <div class="company-meta-item">
          <span class="company-meta-label">Company size</span>
          <span class="company-meta-value">${signal.companySize || "N/A"}</span>
        </div>
        <div class="company-meta-item">
          <span class="company-meta-label">Est. Funding</span>
          <span class="company-meta-value">${signal.funding || "N/A"}</span>
        </div>
        <div class="company-meta-item">
          <span class="company-meta-label">Relevance Score</span>
          <span class="company-meta-value" style="color:var(--color-brand-light);">${signal.score || 0} pts</span>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="detail-body">
      <div>
        <h4 class="section-title">
          <svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Signal Post
        </h4>
        <div class="signal-text-block">
          ${signal.text}
        </div>
      </div>

      <div>
        <h4 class="section-title">
          <svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          Matched Contexts
        </h4>
        <div class="keyword-tags" style="margin-top:8px;">
          ${(signal.keywords || []).map(kw => `<span class="tag" style="background:rgba(99, 102, 241, 0.08);color:var(--color-brand-light);border:1.5px solid rgba(99, 102, 241, 0.15);padding:4px 8px;font-size:11px;">${kw}</span>`).join("")}
          ${(signal.keywords || []).length === 0 ? '<span class="text-muted" style="font-size:12px;">No specific trigger words matched. Relevance determined by general contextual scan.</span>' : ''}
        </div>
      </div>

      <div>
        <h4 class="section-title">
          <svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          Outreach Assistant (AI Pitch)
        </h4>
        <div class="pitch-box">
          <div class="pitch-text" id="pitch-text-container">${pitch}</div>
          <div class="pitch-actions">
            <button class="btn" id="save-signal-toggle-btn">
              ${isSaved ? `
                <svg style="width:14px;height:14px;color:var(--color-warning);" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/></svg>
                Saved
              ` : `
                <svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                Save Signal
              `}
            </button>
            <button class="btn" id="copy-pitch-btn">
              <svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-5 4h6m-6 4h6m-6 4h1"/></svg>
              Copy Pitch
            </button>
            <button class="btn" id="export-sheets-btn" style="background:#0f9d58; color:white; border:none; display:flex; align-items:center; gap:6px;">
              <svg style="width:14px;height:14px;" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 14H7v-2h5v2zm3-4H7v-2h8v2zm0-4H7V7h8v2z"/></svg>
              Export Lead
            </button>
            <a href="${signal.url}" target="_blank" class="btn btn-primary" style="text-decoration:none;">
              Open Original
              <svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach buttons inside detail content
  document.getElementById("copy-pitch-btn").addEventListener("click", () => {
    const pitchText = document.getElementById("pitch-text-container").innerText;
    navigator.clipboard.writeText(pitchText).then(() => {
      showToast("Pitch copied to clipboard!", "success");
    }).catch(err => {
      showToast("Failed to copy text", "warning");
    });
  });

  document.getElementById("export-sheets-btn").addEventListener("click", () => {
    exportToGoogleSheets(signal);
  });

  document.getElementById("save-signal-toggle-btn").addEventListener("click", () => {
    if (state.savedSignalIds.has(signal.id)) {
      state.savedSignalIds.delete(signal.id);
      showToast("Signal removed from saved feed", "info");
    } else {
      state.savedSignalIds.add(signal.id);
      showToast("Signal saved for outreach tracking", "success");
    }
    
    saveToLocalStorage("p4_saved_signal_ids", Array.from(state.savedSignalIds));
    
    // Rerender lists/stats to reflect saved change
    renderStats();
    renderSignalsList();
    
    // Keep current selection details active
    selectSignal(signal);
  });
}

function generateDynamicPitch(signal) {
  const company = signal.company || "your team";
  const name = signal.author || "there";
  
  let valueProposition = "At People4.ai, we are a specialist, compliance-aware data infrastructure partner. We source, collect, and curate bespoke multimodal datasets—including image, audio, video, and human feedback studies—under strict consent and regulatory care.";
  
  if (signal.category === "Data Sourcing") {
    valueProposition = "People4.ai helps AI development teams source and curate high-quality multimodal training data. We manage participant recruitment, consent protocols, and data quality validation end-to-end so you get custom, compliant research datasets without the administrative burden.";
  } else if (signal.category === "Dataset Discussion" && (signal.text.toLowerCase().includes("synthetic") || signal.text.toLowerCase().includes("quality"))) {
    valueProposition = "We help teams bridge the clinical/functional gap of synthetic data using custom, real-world human telemetry datasets. We run custom data collection studies and manage expert human feedback pipelines (RLHF) to supply highly-accurate datasets aligned to your precise model requirements.";
  }
  
  return `Hi ${name.split(" ")[0]},

I noticed your recent discussions regarding data requirements for ${company}. Specifically, your insights on "${signal.title || "AI data sourcing"}" caught my attention.

${valueProposition}

Given your focus on scaling these systems, I thought you might be interested in our structured datasets or bespoke research-based collection projects.

Would you be open to a brief 10-minute introduction call next Tuesday or Thursday?

Best regards,

[Your Name]
Business Development, People4.ai
[Your Email]`;
}

// --- Keyword Config Rendering ---
function renderKeywordsChips() {
  const renderContainer = (containerId, category) => {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    
    state.keywords[category].forEach(kw => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.innerHTML = `
        <span>${kw}</span>
        <span class="chip-remove" data-keyword="${kw}" data-category="${category}">×</span>
      `;
      
      chip.querySelector(".chip-remove").addEventListener("click", (e) => {
        const keywordToRemove = e.target.getAttribute("data-keyword");
        const cat = e.target.getAttribute("data-category");
        
        state.keywords[cat] = state.keywords[cat].filter(k => k !== keywordToRemove);
        saveToLocalStorage("p4_keywords", state.keywords);
        
        // Re-evaluate signals
        state.signals = state.signals.map(evaluateSignal);
        saveToLocalStorage("p4_scraped_signals", state.signals);
        
        showToast(`Removed keyword: "${keywordToRemove}"`, "info");
        renderAll();
      });
      
      container.appendChild(chip);
    });
  };

  renderContainer("keywords-model-container", "model");
  renderContainer("keywords-sourcing-container", "sourcing");
  renderContainer("keywords-discussion-container", "discussion");
}

// --- Apify Integration & Run Center Logic ---
function renderRunsHistory() {
  const container = document.getElementById("runs-history-container");
  
  if (state.apifyRuns.length === 0) {
    container.innerHTML = `<p class="text-muted" style="font-size:12px;text-align:center;padding:20px;">No recent runs. Connect your token and trigger a scraper run to see status here.</p>`;
    return;
  }

  container.innerHTML = "";
  
  // Display runs (newest first)
  const sortedRuns = [...state.apifyRuns].reverse();
  
  sortedRuns.forEach(run => {
    const item = document.createElement("div");
    item.className = "run-item";
    
    let statusClass = "running";
    if (run.status === "SUCCEEDED") statusClass = "succeeded";
    if (run.status === "FAILED" || run.status === "ABORTED") statusClass = "failed";
    
    const formattedTime = new Date(run.createdAt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    item.innerHTML = `
      <div>
        <strong style="color:var(--text-primary);">${run.actorName === "linkedin" ? "LinkedIn Scraper" : "Google News Scraper"}</strong>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Query: "${run.query}" | ${formattedTime}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span class="run-status ${statusClass}">
          <span style="width:6px;height:6px;border-radius:50%;background:currentColor;"></span>
          ${run.status}
        </span>
        ${run.status === "RUNNING" ? `
          <button class="btn check-status-btn" data-run-id="${run.runId}" style="padding:4px 8px;font-size:10px;">Check Status</button>
        ` : `
          <span style="font-size:10px;color:var(--text-muted);">${run.itemsCount || 0} items fetched</span>
        `}
      </div>
    `;

    if (run.status === "RUNNING") {
      item.querySelector(".check-status-btn").addEventListener("click", () => {
        pollRunStatus(run.runId, true);
      });
    }

    container.appendChild(item);
  });
}

function openActorModal(actorType) {
  const modal = document.getElementById("actor-run-modal");
  const modalTitle = document.getElementById("modal-actor-title");
  const modalDesc = document.getElementById("modal-actor-desc");
  const queriesInput = document.getElementById("actor-queries-input");
  const startBtn = document.getElementById("modal-start-btn");

  queriesInput.value = "";
  startBtn.setAttribute("data-actor-type", actorType);

  if (actorType === "linkedin") {
    modalTitle.textContent = "Configure LinkedIn Post Scraper";
    modalDesc.textContent = "Retrieves LinkedIn posts targeting specific subjects. Note: searching specific keywords matches posts in user feeds.";
    queriesInput.placeholder = "e.g. \"dataset recommendation\", \"RLHF medical\", \"ML training vendor\"";
  } else {
    modalTitle.textContent = "Configure Google News Scraper";
    modalDesc.textContent = "Retrieves recent news articles containing custom query search phrases.";
    queriesInput.placeholder = "e.g. Aura Robotics, AI datasets sourcing, foundation model bottleneck";
  }

  modal.style.display = "flex";
}

function closeActorModal() {
  document.getElementById("actor-run-modal").style.display = "none";
}

// Launch Apify Actor Run via API
function launchApifyScraper(actorType, query, maxItems) {
  if (!state.apifyToken && !state.hasBackendToken) {
    showToast("API token is missing", "warning");
    return;
  }

  const actorName = actorType === "linkedin" ? "apify/linkedin-post-scraper" : "apify/google-news-scraper";
  showToast(`Initiating scraper actor: ${actorName}...`, "info");

  let fetchUrl;
  let fetchOptions = {};

  if (state.hasBackendToken) {
    fetchUrl = `/api/apify`;
    fetchOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        actor: actorType,
        query: query,
        maxItems: maxItems
      })
    };
  } else {
    // Construct actor-specific inputs
    let actorInput = {};
    if (actorType === "linkedin") {
      actorInput = {
        "queries": query.split(",").map(q => q.trim()),
        "maxItems": maxItems,
        "deepScrape": false,
        "proxy": {
          "useApifyProxy": true
        }
      };
    } else {
      actorInput = {
        "query": query,
        "maxItems": maxItems,
        "sortBy": "relevance",
        "language": "en"
      };
    }

    fetchUrl = `https://api.apify.com/v2/acts/${actorName}/runs?token=${state.apifyToken}`;
    fetchOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(actorInput)
    };
  }

  fetch(fetchUrl, fetchOptions)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    const runData = data.data;
    const newRun = {
      runId: runData.id,
      actorName: actorType,
      query: query,
      status: runData.status,
      createdAt: runData.createdAt,
      datasetId: runData.defaultDatasetId,
      itemsCount: 0
    };

    state.apifyRuns.push(newRun);
    saveToLocalStorage("p4_apify_runs", state.apifyRuns);
    showToast(`Scraper launched successfully! Run ID: ${runData.id.slice(0, 8)}`, "success");
    
    // Automatically poll status
    pollRunStatus(runData.id);
    renderAll();
  })
  .catch(err => {
    console.error("Apify actor run failed:", err);
    showToast("Failed to launch scraper. Please check your API Token and network.", "warning");
  });
}

function pollRunStatus(runId, userInitiated = false) {
  if (!state.apifyToken && !state.hasBackendToken) return;

  const fetchUrl = state.hasBackendToken 
    ? `/api/apify?action=status&runId=${runId}` 
    : `https://api.apify.com/v2/actor-runs/${runId}?token=${state.apifyToken}`;

  fetch(fetchUrl)
  .then(res => res.json())
  .then(data => {
    const runInfo = data.data;
    const idx = state.apifyRuns.findIndex(r => r.runId === runId);
    
    if (idx !== -1) {
      state.apifyRuns[idx].status = runInfo.status;
      saveToLocalStorage("p4_apify_runs", state.apifyRuns);
    }

    if (runInfo.status === "SUCCEEDED") {
      fetchDatasetItems(runId, runInfo.defaultDatasetId);
    } else if (runInfo.status === "FAILED" || runInfo.status === "ABORTED" || runInfo.status === "TIMED-OUT") {
      showToast(`Scraper task ${runId.slice(0, 8)} stopped with status: ${runInfo.status}`, "warning");
      renderAll();
    } else {
      if (userInitiated) {
        showToast(`Scraper task ${runId.slice(0,8)} is still ${runInfo.status}...`, "info");
      }
      renderAll();
    }
  })
  .catch(err => {
    console.error("Failed to query task status:", err);
  });
}

function fetchDatasetItems(runId, datasetId) {
  const fetchUrl = state.hasBackendToken 
    ? `/api/apify?action=dataset&datasetId=${datasetId}` 
    : `https://api.apify.com/v2/datasets/${datasetId}/items?token=${state.apifyToken}`;

  fetch(fetchUrl)
  .then(res => res.json())
  .then(items => {
    if (!Array.isArray(items)) {
      items = [];
    }

    // Map the items to our internal format
    const idx = state.apifyRuns.findIndex(r => r.runId === runId);
    let actorType = "linkedin";
    if (idx !== -1) {
      state.apifyRuns[idx].itemsCount = items.length;
      actorType = state.apifyRuns[idx].actorName;
      saveToLocalStorage("p4_apify_runs", state.apifyRuns);
    }

    const processedSignals = items.map((item, index) => {
      let mapped = {
        id: `scraped-${runId.slice(0,6)}-${index}`,
        source: actorType,
        timestamp: "Just now",
        url: item.url || item.postUrl || item.link || "https://apify.com"
      };

      if (actorType === "linkedin") {
        mapped.author = item.authorName || item.authorProfileName || item.user?.name || "LinkedIn User";
        mapped.title = item.authorTitle || item.user?.position || "Professional Connection";
        mapped.company = extractCompanyFromTitle(mapped.title);
        mapped.text = item.text || item.body || item.description || "";
        mapped.companySize = "10-250";
        mapped.funding = "Growth/Scaleup";
      } else {
        // News format
        mapped.author = item.source?.title || item.publisher || "News Source";
        mapped.title = item.title || "Industry Update";
        mapped.company = extractCompanyFromText(mapped.title + " " + (item.description || item.snippet || ""));
        mapped.text = item.description || item.snippet || item.content || item.title || "";
        mapped.companySize = "50-1000+";
        mapped.funding = "Enterprise/Venture Backed";
      }

      return evaluateSignal(mapped);
    });

    // Merge into our local signals feed (avoiding duplicates based on URL or title/text combinations)
    let newCount = 0;
    processedSignals.forEach(newSig => {
      const isDuplicate = state.signals.some(existing => 
        existing.url === newSig.url || 
        (existing.text.slice(0, 50) === newSig.text.slice(0, 50) && existing.author === newSig.author)
      );

      if (!isDuplicate && newSig.text.trim() !== "") {
        state.signals.push(newSig);
        newCount++;
      }
    });

    saveToLocalStorage("p4_scraped_signals", state.signals);
    showToast(`Scrape complete! Successfully extracted ${items.length} items (${newCount} new signals added).`, "success");
    
    renderAll();
  })
  .catch(err => {
    console.error("Failed to fetch dataset items:", err);
    showToast("Scraper completed but failed to pull dataset items.", "warning");
  });
}

// Utility check for periodic scans of running tasks
function checkRunningTasks() {
  state.apifyRuns.forEach(run => {
    if (run.status === "RUNNING") {
      pollRunStatus(run.runId);
    }
  });
}

// Basic text processing helpers to mock metadata extraction
function extractCompanyFromTitle(title) {
  if (!title) return "Unknown";
  // Look for phrases like "at CompanyName", "@ CompanyName", "CTO of CompanyName"
  const matches = title.match(/(?:at|@|of|join)\s+([A-Z][a-zA-Z0-9\s]+?)(?:\s+|$|,|\.)/);
  return matches ? matches[1].trim() : "Tech Venture";
}

function extractCompanyFromText(text) {
  if (!text) return "Target Company";
  // Look for common corporate name pattern or proper noun phrases followed by raising/releasing/announcing
  const matches = text.match(/([A-Z][a-zA-Z0-9\s]+?)\s+(?:announced|raises|launches|releases)/);
  return matches ? matches[1].trim() : "Enterprise Client";
}

// --- Toast notification utility ---
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container-element");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s reverse";
    setTimeout(() => {
      if (toast.parentNode) {
        container.removeChild(toast);
      }
    }, 280);
  }, 4000);
}

function toggleSheetsUI(isConnected) {
  const saveBtn = document.getElementById("save-sheets-btn");
  const disconnectBtn = document.getElementById("disconnect-sheets-btn");
  const sheetsInput = document.getElementById("sheets-url-input");

  if (isConnected) {
    if (saveBtn) saveBtn.style.display = "none";
    if (disconnectBtn) disconnectBtn.style.display = "block";
    if (sheetsInput) sheetsInput.disabled = true;
  } else {
    if (saveBtn) saveBtn.style.display = "block";
    if (disconnectBtn) disconnectBtn.style.display = "none";
    if (sheetsInput) {
      sheetsInput.disabled = false;
      sheetsInput.value = "";
    }
  }
}

function switchPanel(panelId) {
  const navItem = document.querySelector(`.nav-item[data-target="${panelId}"]`);
  if (navItem) {
    navItem.click();
  }
}

let tokenClient;

// Initialize GIS token client
function initGoogleTokenClient() {
  try {
    if (typeof google === "undefined") {
      // Retry after a delay if script hasn't loaded yet
      setTimeout(initGoogleTokenClient, 500);
      return;
    }
    
    const client_id = document.getElementById("google-client-id").value.trim();
    if (!client_id) return;

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: client_id,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          state.googleAccessToken = tokenResponse.access_token;
          localStorage.setItem("p4_google_access_token", tokenResponse.access_token);
          showToast("Successfully connected Google Account!", "success");
          toggleGoogleUI(true);
          
          // If there was a pending export, execute it now
          if (state.pendingExportSignal) {
            exportToGoogleSheets(state.pendingExportSignal);
            state.pendingExportSignal = null;
          }
        }
      },
    });
  } catch (err) {
    console.error("GIS Initialization error:", err);
  }
}

// Trigger GIS popup login
function requestGoogleAuth() {
  if (!tokenClient) {
    initGoogleTokenClient();
  }
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    showToast("Google Library not loaded yet. Try again in 2 seconds.", "warning");
  }
}

function disconnectGoogle() {
  state.googleAccessToken = null;
  localStorage.removeItem("p4_google_access_token");
  toggleGoogleUI(false);
  showToast("Google Account disconnected.", "info");
}

function toggleGoogleUI(isConnected) {
  const connectBtn = document.getElementById("connect-google-btn");
  const disconnectBtn = document.getElementById("disconnect-google-btn");
  const statusText = document.getElementById("google-status-text");

  if (isConnected) {
    if (connectBtn) connectBtn.style.display = "none";
    if (disconnectBtn) disconnectBtn.style.display = "block";
    if (statusText) {
      statusText.textContent = "Connected & Authorized";
      statusText.style.color = "var(--color-success)";
    }
  } else {
    if (connectBtn) connectBtn.style.display = "flex";
    if (disconnectBtn) disconnectBtn.style.display = "none";
    if (statusText) {
      statusText.textContent = "Not Connected";
      statusText.style.color = "var(--text-muted)";
    }
  }
}

function exportToGoogleSheets(signal) {
  const sheetsUrl = localStorage.getItem("p4_sheets_url");
  const exportBtn = document.getElementById("export-sheets-btn");
  
  if (exportBtn) {
    exportBtn.disabled = true;
    exportBtn.innerText = "Exporting...";
  }

  // 1. If SheetDB URL is saved, use SheetDB (Webhook)
  if (sheetsUrl) {
    const payload = {
      data: [{
        date: new Date().toLocaleDateString(),
        source: signal.source || "LinkedIn",
        author: signal.author || "Unknown",
        company: signal.company || "Target",
        score: signal.score || 0,
        text: signal.text || "",
        pitch: generateDynamicPitch(signal)
      }]
    };

    fetch(sheetsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
    .then(res => {
      if (!res.ok) throw new Error("HTTP error " + res.status);
      return res.json();
    })
    .then(data => {
      showToast("Successfully exported to Google Sheet!", "success");
    })
    .catch(err => {
      console.error("SheetDB export error:", err);
      showToast("Failed to write to SheetDB. Verify your SheetDB URL.", "warning");
    })
    .finally(() => {
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.innerHTML = `
          <svg style="width:14px;height:14px;" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 14H7v-2h5v2zm3-4H7v-2h8v2zm0-4H7V7h8v2z"/></svg>
          Export Lead
        `;
      }
    });
    return;
  }

  // 2. Otherwise, check Google OAuth Direct Connection
  if (!state.googleAccessToken) {
    showToast("Please connect either a SheetDB URL or Google Account in Settings first.", "warning");
    state.pendingExportSignal = signal;
    switchPanel("integration-panel");
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.innerHTML = `
        <svg style="width:14px;height:14px;" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 14H7v-2h5v2zm3-4H7v-2h8v2zm0-4H7V7h8v2z"/></svg>
        Export Lead
      `;
    }
    return;
  }

  const spreadsheetId = document.getElementById("google-spreadsheet-id").value.trim();
  const sheetName = document.getElementById("google-sheet-name").value.trim() || "Sheet1";
  
  if (!spreadsheetId) {
    showToast("Please enter a Spreadsheet ID in Settings.", "warning");
    switchPanel("integration-panel");
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.innerHTML = `
        <svg style="width:14px;height:14px;" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 14H7v-2h5v2zm3-4H7v-2h8v2zm0-4H7V7h8v2z"/></svg>
        Export Lead
      `;
    }
    return;
  }

  const payload = {
    range: `${sheetName}!A:G`,
    majorDimension: "ROWS",
    values: [
      [
        new Date().toLocaleDateString(),
        signal.source || "LinkedIn",
        signal.author || "Unknown Author",
        signal.company || "Target Company",
        signal.score || 0,
        signal.text || "",
        generateDynamicPitch(signal)
      ]
    ]
  };

  // Post to Google Sheets append API
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:G:append?valueInputOption=USER_ENTERED`;

  fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${state.googleAccessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
  .then(res => {
    if (res.status === 401) {
      // Token expired, re-auth
      showToast("Session expired. Re-authorizing Google Account...", "info");
      state.pendingExportSignal = signal;
      requestGoogleAuth();
      throw new Error("unauthorized");
    }
    if (!res.ok) throw new Error("HTTP error " + res.status);
    return res.json();
  })
  .then(data => {
    showToast("Successfully exported lead to Google Sheet!", "success");
  })
  .catch(err => {
    if (err.message !== "unauthorized") {
      console.error("Google Sheets API Export Error:", err);
      showToast("Failed to write to Google Sheets. Verify your Spreadsheet ID or credentials.", "warning");
    }
  })
  .finally(() => {
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.innerHTML = `
        <svg style="width:14px;height:14px;" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 14H7v-2h5v2zm3-4H7v-2h8v2zm0-4H7V7h8v2z"/></svg>
        Export Lead
      `;
    }
  });
}
