/**
 * Scoreboard: Sports/game scoreboard with live scores, team display,
 * period/quarter/half tracking, timer, status indicators, animations,
 * and responsive layout variants.
 */

// --- Types ---

export type ScoreboardSport = "generic" | "basketball" | "football" | "soccer" | "hockey" | "baseball" | "tennis" | "cricket";
export type ScoreboardStatus = "scheduled" | "live" | "halftime" | "finished" | "postponed" | "suspended";
export type ScoreboardVariant = "default" | "compact" | "detailed" | "minimal";
export type ScoreboardSize = "sm" | "md" | "lg";

export interface TeamScore {
  /** Team name */
  name: string;
  /** Current score */
  score: number;
  /** Logo (emoji, SVG string, or HTML) */
  logo?: string | HTMLElement;
  /** Team color accent */
  color?: string;
  /** Period-by-period breakdown */
  periods?: number[];
  /** Fouls / cards / stats */
  fouls?: number;
  timeouts?: number;
}

export interface ScoreboardOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Home team */
  homeTeam: TeamScore;
  /** Away team */
  awayTeam: TeamScore;
  /** Sport type (affects labels like Period/Quarter/Half/Set) */
  sport?: ScoreboardSport;
  /** Game status */
  status?: ScoreboardStatus;
  /** Current period/quarter/half/inning/set number */
  currentPeriod?: number;
  /** Total periods in game */
  totalPeriods?: number;
  /** Clock/timer display text (e.g., "12:34", "HT", "-") */
  clock?: string;
  /** Visual variant */
  variant?: ScoreboardVariant;
  /** Size variant */
  size?: ScoreboardSize;
  /** Show period breakdown table? */
  showPeriodBreakdown?: boolean;
  /** Show clock? */
  showClock?: boolean;
  /** Show status badge? */
  showStatusBadge?: boolean;
  /** Click callback on the board */
  onClick?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface ScoreboardInstance {
  element: HTMLElement;
  /** Update home team score */
  setHomeScore: (score: number) => void;
  /** Update away team score */
  setAwayScore: (score: number) => void;
  /** Update game status */
  setStatus: (status: ScoreboardStatus) => void;
  /** Update clock */
  setClock: (clock: string) => void;
  /** Set current period */
  setPeriod: (period: number) => void;
  /** Update both teams' data */
  updateTeams: (home: Partial<TeamScore>, away: Partial<TeamScore>) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Sport Config ---

const SPORT_CONFIG: Record<ScoreboardSport, {
  periodLabel: string; shortLabel: string; defaultPeriods: number;
}> = {
  generic:     { periodLabel: "Period",   shortLabel: "P", defaultPeriods: 4 },
  basketball:  { periodLabel: "Quarter",  shortLabel: "Q", defaultPeriods: 4 },
  football:    { periodLabel: "Quarter",  shortLabel: "Q", defaultPeriods: 4 },
  soccer:      { periodLabel: "Half",     shortLabel: "H", defaultPeriods: 2 },
  hockey:      { periodLabel: "Period",   shortLabel: "P", defaultPeriods: 3 },
  baseball:    { periodLabel: "Inning",   shortLabel: "I", defaultPeriods: 9 },
  tennis:      { periodLabel: "Set",      shortLabel: "S", defaultPeriods: 3 },
  cricket:     { periodLabel: "Innings",  shortLabel: "Ov", defaultPeriods: 2 },
};

const STATUS_CONFIG: Record<ScoreboardStatus, {
  label: string; color: string; bg: string; pulse?: boolean;
}> = {
  scheduled:  { label: "Scheduled", color: "#6b7280", bg: "#f3f4f6" },
  live:       { label: "LIVE",       color: "#dc2626", bg: "#fef2f2", pulse: true },
  halftime:    { label: "Halftime",   color: "#d97706", bg: "#fffbeb" },
  finished:    { label: "Final",      color: "#111827", bg: "#f9fafb" },
  postponed:   { label: "Postponed",  color: "#7c3aed", bg: "#f5f3ff" },
  suspended:   { label: "Suspended",  color: "#ea580c", bg: "#fff7ed" },
};

const SIZE_STYLES: Record<ScoreboardSize, {
  fontSize: number; scoreFontSize: number; padding: string; gap: string; logoSize: number;
}> = {
  sm: { fontSize: 11, scoreFontSize: 20, padding: "8px 12px", gap: "8px", logoSize: 24 },
  md: { fontSize: 13, scoreFontSize: 28, padding: "14px 20px", gap: "12px", logoSize: 32 },
  lg: { fontSize: 15, scoreFontSize: 36, padding: "18px 28px", gap: "16px", logoSize: 40 },
};

// --- Main Factory ---

export function createScoreboard(options: ScoreboardOptions): ScoreboardInstance {
  const opts = {
    sport: options.sport ?? "generic",
    status: options.status ?? "scheduled",
    currentPeriod: options.currentPeriod ?? 1,
    totalPeriods: options.totalPeriods ?? SPORT_CONFIG[options.sport ?? "generic"].defaultPeriods,
    clock: options.clock ?? "--:--",
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    showPeriodBreakdown: options.showPeriodBreakdown ?? false,
    showClock: options.showClock ?? true,
    showStatusBadge: options.showStatusBadge ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Scoreboard: container not found");

  const sc = SPORT_CONFIG[opts.sport];
  const ss = SIZE_STYLES[opts.size];

  let state = {
    home: { ...options.homeTeam },
    away: { ...options.awayTeam },
    status: opts.status,
    clock: opts.clock,
    currentPeriod: opts.currentPeriod,
  };

  let destroyed = false;

  // Root element
  container.className = `scoreboard sb-${opts.variant} sb-${opts.size} ${opts.className}`;
  container.style.cssText = `
    font-family:-apple-system,sans-serif;color:#374151;
    background:#fff;border-radius:${opts.variant === "minimal" ? 0 : 12}px;
    border:1px solid ${opts.variant === "minimal" ? "transparent" : "#e5e7eb"};
    box-shadow:${opts.variant === "minimal" ? "none" : "0 1px 3px rgba(0,0,0,0.08)"};
    overflow:hidden;position:relative;
    ${opts.onClick && !destroyed ? "cursor:pointer;" : ""}
  `;

  function render(): void {
    container.innerHTML = "";

    // Status bar (top)
    if (opts.showStatusBadge || opts.showClock) {
      const statusBar = document.createElement("div");
      statusBar.className = "sb-status-bar";
      statusBar.style.cssText = `
        display:flex;align-items:center;justify-content:space-between;
        padding:${ss.padding};padding-bottom:6px;font-size:${ss.fontSize}px;color:#9ca3af;
        border-bottom:1px solid #f0f0f0;
      `;

      if (opts.showStatusBadge) {
        const st = STATUS_CONFIG[state.status];
        const badge = document.createElement("span");
        badge.className = "sb-status-badge";
        badge.style.cssText = `
          display:inline-flex;align-items:center;gap:5px;padding:2px 10px;
          border-radius:9999px;font-size:${Math.max(10, ss.fontSize - 1)}px;
          font-weight:700;letter-spacing:0.05em;background:${st.bg};color:${st.color};
          ${st.pulse ? "animation:sb-pulse 2s ease-in-out infinite;" : ""}
        `;
        if (st.pulse) {
          const dot = document.createElement("span");
          dot.style.cssText = `
            width:6px;height:6px;border-radius:50%;background:${st.color};
            animation:sb-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
          `;
          badge.appendChild(dot);
        }
        badge.appendChild(document.createTextNode(st.label));
        statusBar.appendChild(badge);
      }

      // Period + Clock
      const metaArea = document.createElement("div");
      metaArea.style.cssText = "display:flex;align-items:center;gap:10px;";
      if (state.status !== "finished" && state.status !== "postponed") {
        const periodEl = document.createElement("span");
        periodEl.className = "sb-period";
        periodEl.style.cssText = `font-weight:600;color:#6b7280;`;
        periodEl.textContent = `${sc.shortLabel}${state.currentPeriod}`;
        metaArea.appendChild(periodEl);
      }
      if (opts.showClock) {
        const clockEl = document.createElement("span");
        clockEl.className = "sb-clock";
        clockEl.style.cssText = `
          font-weight:700;font-variant-numeric:tabular-nums;
          color:${state.status === "live" ? "#dc2626" : "#374151"};
          min-width:48px;text-align:right;
        `;
        clockEl.textContent = state.clock;
        metaArea.appendChild(clockEl);
      }
      statusBar.appendChild(metaArea);
      container.appendChild(statusBar);
    }

    // Main score area
    const mainArea = document.createElement("div");
    mainArea.className = "sb-main";
    mainArea.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:${ss.padding};
    `;

    // Home team
    const homeEl = createTeamBlock(state.home, "home");
    mainArea.appendChild(homeEl);

    // VS separator (for detailed variant)
    if (opts.variant === "detailed") {
      const vsEl = document.createElement("div");
      vsEl.className = "sb-vs";
      vsEl.style.cssText = `
        font-size:${Math.max(10, ss.fontSize)}px;font-weight:800;
        color:#d1d5db;text-transform:uppercase;letter-spacing:0.1em;
        padding:0 16px;flex-shrink:0;
      `;
      vsEl.textContent = "VS";
      mainArea.appendChild(vsEl);
    } else {
      // Simple divider line
      const divider = document.createElement("div");
      divider.style.cssText = `
        width:1px;height:${ss.scoreFontSize + 10}px;background:#e5e7eb;margin:0 ${ss.gap};
        flex-shrink:0;
      `;
      mainArea.appendChild(divider);
    }

    // Away team
    const awayEl = createTeamBlock(state.away, "away");
    mainArea.appendChild(awayEl);

    container.appendChild(mainArea);

    // Period breakdown table
    if (opts.showPeriodBreakdown && opts.variant !== "minimal" && opts.variant !== "compact") {
      renderPeriodTable();
    }

    // Inject pulse keyframes if not present
    if (!document.getElementById("scoreboard-styles")) {
      const s = document.createElement("style");
      s.id = "scoreboard-styles";
      s.textContent = `
        @keyframes sb-pulse{0%,100%{opacity:1;}50%{opacity:0.7;}}
        @keyframes sb-ping{75%,100%{transform:scale(2);opacity:0;}}
        @keyframes sb-score-update{0%{transform:scale(1.2);}100%{transform:scale(1);}}
      `;
      document.head.appendChild(s);
    }
  }

  function createTeamBlock(team: TeamScore, side: "home" | "away"): HTMLElement {
    const isHome = side === "home";
    const block = document.createElement("div");
    block.className = `sb-team sb-team-${side}`;
    block.style.cssText = `
      display:flex;align-items:center;gap:${ss.gap};
      flex:1;${isHome ? "" : "flex-direction:row-reverse;text-align:right;"}
    `;

    // Logo
    if (team.logo) {
      const logoWrap = document.createElement("div");
      logoWrap.className = "sb-logo";
      logoWrap.style.cssText = `
        width:${ss.logoSize}px;height:${ss.logoSize}px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        flex-shrink:0;background:${team.color ? team.color + "12" : "#f3f4f6"};
        overflow:hidden;
      `;
      if (typeof team.logo === "string") {
        logoWrap.innerHTML = team.logo;
      } else if (team.logo instanceof HTMLElement) {
        logoWrap.appendChild(team.logo);
      }
      block.appendChild(logoWrap);
    }

    // Info column
    const infoCol = document.createElement("div");
    infoCol.className = "sb-info";
    infoCol.style.cssText = `min-width:0;`;

    // Team name
    const nameEl = document.createElement("div");
    nameEl.className = "sb-name";
    nameEl.style.cssText = `
      font-size:${ss.fontSize}px;font-weight:600;color:#374151;line-height:1.2;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;
    `;
    nameEl.textContent = team.name;
    infoCol.appendChild(nameEl);

    // Score
    const scoreEl = document.createElement("div");
    scoreEl.className = `sb-score sb-score-${side}`;
    scoreEl.style.cssText = `
      font-size:${ss.scoreFontSize}px;font-weight:800;
      font-variant-numeric:tabular-nums;line-height:1.1;
      color:${team.color ?? "#111827"};
    `;
    scoreEl.textContent = String(team.score);
    infoCol.appendChild(scoreEl);

    block.appendChild(infoCol);
    return block;
  }

  function renderPeriodTable(): void {
    const tableWrap = document.createElement("div");
    tableWrap.className = "sb-breakdown";
    tableWrap.style.cssText = `
      border-top:1px solid #f0f0f0;padding:${ss.padding};overflow-x:auto;
    `;

    const table = document.createElement("table");
    table.style.cssText = `
      width:100%;border-collapse:collapse;font-size:${Math.max(10, ss.fontSize - 1)}px;
    `;

    // Header row
    const headerRow = document.createElement("tr");
    headerRow.style.cssText = "color:#9ca3af;font-weight:500;";
    const thEmpty = document.createElement("th");
    thEmpty.style.cssText = "text-align:left;padding:4px 8px;width:80px;";
    thEmpty.textContent = "";
    headerRow.appendChild(thEmpty);

    for (let p = 1; p <= opts.totalPeriods; p++) {
      const th = document.createElement("th");
      th.style.cssText = "text-align:center;padding:4px 6px;white-space:nowrap;";
      th.textContent = `${sc.shortLabel}${p}`;
      headerRow.appendChild(th);
    }
    const thTotal = document.createElement("th");
    thTotal.style.cssText = "text-align:center;padding:4px 8px;font-weight:700;";
    thTotal.textContent = "T";
    headerRow.appendChild(thTotal);
    table.appendChild(headerRow);

    // Home row
    const homeRow = createPeriodRow(state.home, true);
    table.appendChild(homeRow);

    // Away row
    const awayRow = createPeriodRow(state.away, false);
    table.appendChild(awayRow);

    tableWrap.appendChild(table);
    container.appendChild(tableWrap);
  }

  function createPeriodRow(team: TeamScore, isHome: boolean): HTMLTableRowElement {
    const tr = document.createElement("tr");
    tr.style.cssText = isHome
      ? "background:#fafafa;"
      : "";

    const tdName = document.createElement("td");
    tdName.style.cssText = `padding:4px 8px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px;`;
    tdName.textContent = team.name;
    tr.appendChild(tdName);

    let runningTotal = 0;
    for (let p = 1; p <= opts.totalPeriods; p++) {
      const td = document.createElement("td");
      td.style.cssText = "text-align:center;padding:4px 6px;font-variant-numeric:tabular-nums;";
      const periodScore = team.periods?.[p - 1] ?? 0;
      runningTotal += periodScore;

      // Highlight current period
      if (p === state.currentPeriod && state.status === "live") {
        td.style.fontWeight = "700";
        td.style.color = team.color ?? "#111827";
      }

      td.textContent = team.periods && p <= team.periods.length ? String(periodScore) : "-";
      tr.appendChild(td);
    }

    const tdTotal = document.createElement("td");
    tdTotal.style.cssText = "text-align:center;padding:4px 8px;font-weight:700;font-variant-numeric:tabular-nums;";
    tdTotal.textContent = String(runningTotal);
    tr.appendChild(tdTotal);

    return tr;
  }

  // Event handlers
  if (opts.onClick) {
    container.addEventListener("click", () => opts.onClick?.());
    container.addEventListener("mouseenter", () => {
      if (!destroyed) container.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
    });
    container.addEventListener("mouseleave", () => {
      if (!destroyed) container.style.boxShadow = opts.variant === "minimal"
        ? "none"
        : "0 1px 3px rgba(0,0,0,0.08)";
    });
  }

  // Initial render
  render();

  const instance: ScoreboardInstance = {
    element: container,

    setHomeScore(score: number) {
      state.home.score = score;
      render();
    },

    setAwayScore(score: number) {
      state.away.score = score;
      render();
    },

    setStatus(status: ScoreboardStatus) {
      state.status = status;
      render();
    },

    setClock(clock: string) {
      state.clock = clock;
      render();
    },

    setPeriod(period: number) {
      state.currentPeriod = period;
      render();
    },

    updateTeams(home: Partial<TeamScore>, away: Partial<TeamScore>) {
      state.home = { ...state.home, ...home };
      state.away = { ...state.away, ...away };
      render();
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };

  return instance;
}
