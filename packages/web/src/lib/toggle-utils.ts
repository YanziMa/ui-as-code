/**
 * Toggle Utilities: Toggle switch, checkbox toggle, segmented control,
 * and toggle button group with multiple variants, sizes, and states.
 */

// --- Types ---

export type ToggleSize = "sm" | "md" | "lg";
export type ToggleVariant = "default" | "primary" | "success" | "danger";

export interface ToggleSwitchOptions {
  /** Initially checked? */
  checked?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: ToggleSize;
  /** Color variant */
  variant?: ToggleVariant;
  /** Label text (shown alongside) */
  label?: string;
  /** Label position */
  labelPosition?: "start" | "end";
  /** Description text */
  description?: string;
  /** Called on change */
  onChange?: (checked: boolean) => void;
  /** Custom class name */
  className?: string;
}

export interface SegmentedControlOptions {
  /** Segment options */
  options: Array<{ value: string; label: string; icon?: string; disabled?: boolean }>;
  /** Currently selected value */
  value?: string;
  /** Size variant */
  size?: ToggleSize;
  /** Full width? */
  fullWidth?: boolean;
  /** Called on selection change */
  onChange?: (value: string) => void;
  /** Custom class name */
  className?: string;
}

export interface ToggleButtonGroupOptions {
  /** Button options */
  buttons: Array<{ value: string; label: string; icon?: string; disabled?: boolean }>;
  /** Allow multiple selections? */
  multiple?: boolean;
  /** Selected values */
  values?: string[];
  /** Size variant */
  size?: ToggleSize;
  /** Called on change */
  onChange: (values: string[]) => void;
  /** Custom class name */
  className?: string;
}

// --- Size Config ---

const TOGGLE_SIZES: Record<ToggleSize, { trackW: string; trackH: string; thumb: string; font: string }> = {
  "sm": { trackW: "34px", trackH: "18px", thumb: "14px", font: "11px" },
  "md": { trackW: "44px", trackH: "24px", thumb: "20px", font: "13px" },
  "lg": { trackW: "54px", trackH: "30px", thumb: "26px", font: "15px" },
};

const TOGGLE_COLORS: Record<ToggleVariant, { on: string; off: string; thumbOn: string; thumbOff: string }> = {
  "default": { on: "#3b82f6", off: "#d1d5db", thumbOn: "#fff", thumbOff: "#fff" },
  "primary": { on: "#6366f1", off: "#e0e7ff", thumbOn: "#fff", thumbOff: "#6366f1" },
  "success": { on: "#22c55e", off: "#bbf7d0", thumbOn: "#fff", thumbOff: "#22c55e" },
  "danger": { on: "#ef4444", off: "#fecaca", thumbOn: "#fff", thumbOff: "#ef4444" },
};

// --- Toggle Switch ---

/**
 * Create a toggle switch.
 *
 * @example
 * ```ts
 * const toggle = createToggleSwitch({
 *   checked: false,
 *   label: "Dark mode",
 *   onChange: (checked) => setTheme(checked ? 'dark' : 'light'),
 * });
 * ```
 */
export function createToggleSwitch(options: ToggleSwitchOptions = {}): HTMLElement {
  const {
    checked = false,
    disabled = false,
    size = "md",
    variant = "default",
    label,
    labelPosition = "end",
    description,
    onChange,
    className,
  } = options;

  const ts = TOGGLE_SIZES[size];
  const tc = TOGGLE_COLORS[variant];
  let _checked = checked;

  // Wrapper
  const wrapper = document.createElement("label");
  wrapper.className = `toggle-switch ${size} ${variant} ${className ?? ""}`.trim();
  wrapper.style.cssText =
    "display:inline-flex;align-items:center;gap:8px;cursor:pointer;" +
    (disabled ? "opacity:0.5;cursor:not-allowed;" : "");

  // Label before
  if (label && labelPosition === "start") {
    const labelEl = _createLabel(label, ts.font, !!description);
    wrapper.insertBefore(labelEl, null);
  }

  // Track + Thumb
  const track = document.createElement("div");
  track.className = "toggle-track";
  track.style.cssText =
    `position:relative;width:${ts.trackW};height:${ts.trackH};border-radius:${parseInt(ts.trackH) / 2}px;` +
    `background:${_checked ? tc.on : tc.off};transition:background 0.2s ease;` +
    "flex-shrink:0;";

  const thumb = document.createElement("div");
  thumb.className = "toggle-thumb";
  thumb.style.cssText =
    `position:absolute;top:${(parseInt(ts.trackH) - parseInt(ts.thumb)) / 2}px;` +
    (_checked ? `left:calc(100% - ${ts.thumb} - 2px)` : "left:2px") + ";" +
    `width:${ts.thumb};height:${ts.thumb};border-radius:50%;background:${_checked ? tc.thumbOn : tc.thumbOff};` +
    "box-shadow:0 1px 3px rgba(0,0,0,0.15);transition:left 0.2s ease,background 0.2s ease;";

  // Hidden input for accessibility
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = _checked;
  input.disabled = disabled;
  input.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;";

  track.appendChild(thumb);
  track.appendChild(input);
  wrapper.appendChild(track);

  // Label after
  if (label && labelPosition === "end") {
    const labelEl = _createLabel(label, ts.font, !!description);
    wrapper.appendChild(labelEl);
  }

  // Click handler
  const handler = (): void => {
    if (disabled) return;
    _checked = !_checked;
    input.checked = _checked;
    thumb.style.left = _checked ? `calc(100% - ${ts.thumb} - 2px)` : "2px";
    thumb.style.background = _checked ? tc.thumbOn : tc.thumbOff;
    track.style.background = _checked ? tc.on : tc.off;
    onChange?.(_checked);
  };

  track.addEventListener("click", handler);
  if (!disabled) {
    wrapper.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); }
    });
  }

  return wrapper;
}

function _createLabel(text: string, fontSize: string, hasDesc: boolean): HTMLElement {
  const el = document.createElement("span");
  el.className = "toggle-label";
  el.textContent = text;
  el.style.cssText =
    `font-size:${fontSize};font-weight:500;color:#374151;line-height:1.2;` +
    (hasDesc ? "display:flex;flex-direction:column;gap:1px;" : "");
  return el;
}

// --- Segmented Control ---

/**
 * Create a segmented control (pill-style tab group).
 *
 * @example
 * ```ts
 * const seg = createSegmentedControl({
 *   options: [
 *     { value: "day", label: "Day" },
 *     { value: "week", label: "Week" },
 *     { value: "month", label: "Month" },
 *   ],
 *   value: "week",
 *   onChange: (v) => setView(v),
 * });
 * ```
 */
export function createSegmentedControl(options: SegmentedControlOptions): HTMLElement {
  const {
    opts: optionsList,
    value: selectedValue = "",
    size = "md",
    fullWidth = false,
    onChange,
    className,
  } = options as any;
  const { options, value: initValue } = options;

  let _selected = initValue ?? (options[0]?.value ?? "");

  const root = document.createElement("div");
  root.className = `segmented-control ${size} ${className ?? ""}`.trim();
  root.style.cssText =
    "display:inline-flex;background:#f3f4f6;border-radius:10px;padding:3px;" +
    `gap:2px;${fullWidth ? "width:100%;" : ""}`;
  root.setAttribute("role", "tablist");

  const fontSize = size === "sm" ? "12px" : size === "lg" ? "14px" : "13px";
  const padding = size === "sm" ? "4px 12px" : size === "lg" ? "8px 20px" : "6px 16px";

  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "segment-option";
    btn.dataset.value = opt.value;
    btn.disabled = opt.disabled ?? false;
    btn.style.cssText =
      `padding:${padding};border:none;border-radius:8px;` +
      "font-size:" + fontSize + ";font-weight:500;cursor:pointer;" +
      "line-height:1;white-space:nowrap;transition:all 0.15s ease;" +
      "display:inline-flex;align-items:center;gap:4px;" +
      (_selected === opt.value
        ? "background:#fff;color:#111827;box-shadow:0 1px 2px rgba(0,0,0,0.08);"
        : "background:transparent;color:#6b7280;");

    if (opt.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.innerHTML = opt.icon;
      btn.insertBefore(iconSpan, btn.firstChild);
    }

    const labelSpan = document.createElement("span");
    labelSpan.textContent = opt.label;
    btn.appendChild(labelSpan);

    if (!opt.disabled) {
      btn.addEventListener("click", () => {
        _selected = opt.value;
        // Update all buttons
        root.querySelectorAll(".segment-option").forEach((el) => {
          const isSelected = (el as HTMLElement).dataset.value === _selected;
          (el as HTMLElement).style.background = isSelected ? "#fff" : "transparent";
          (el as HTMLElement).style.color = isSelected ? "#111827" : "#6b7280";
          (el as HTMLElement).style.boxShadow = isSelected ? "0 1px 2px rgba(0,0,0,0.08)" : "";
        });
        onChange?.(_selected);
      });
    }

    root.appendChild(btn);
  });

  return root;
}

// --- Toggle Button Group ---

/**
 * Create a toggle button group (multi-select or single-select).
 *
 * @example
 * ```ts
 * const group = createToggleButtonGroup({
 *   buttons: [
 *     { value: "bold", label: "B" },
 *     { value: "italic", label: "I" },
 *     { value: "underline", label: "U" },
 *   ],
 *   multiple: true,
 *   onChange: (vals) => applyFormatting(vals),
 * });
 * ```
 */
export function createToggleButtonGroup(options: ToggleButtonGroupOptions): HTMLElement {
  const {
    buttons,
    multiple = false,
    values: initialValues = [],
    size = "md",
    onChange,
    className,
  } = options;

  let _selected = new Set(initialValues);

  const root = document.createElement("div");
  root.className = `toggle-btn-group ${size} ${className ?? ""}`.trim();
  root.style.cssText = "display:inline-flex;gap:2px;";

  const padding = size === "sm" ? "5px 10px" : size === "lg" ? "8px 16px" : "6px 14px";
  const fontSize = size === "sm" ? "12px" : size === "lg" ? "14px" : "13px";

  buttons.forEach((btn) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "toggle-btn";
    el.dataset.value = btn.value;
    el.disabled = btn.disabled ?? false;
    const isSelected = _selected.has(btn.value);

    el.style.cssText =
      `padding:${padding};border:1px solid #d1d5db;border-radius:6px;` +
      "font-size:" + fontSize + ";font-weight:500;cursor:pointer;" +
      "line-height:1;display:inline-flex;align-items:center;gap:4px;" +
      "transition:all 0.12s;" +
      (isSelected
        ? "background:#eff6ff;color:#2563eb;border-color:#93c5fd;"
        : "background:#fff;color:#374151;") +
      (btn.disabled ? "opacity:0.5;cursor:not-allowed;" : "");

    if (btn.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.innerHTML = btn.icon;
      el.insertBefore(iconSpan, el.firstChild);
    }

    const labelSpan = document.createElement("span");
    labelSpan.textContent = btn.label;
    el.appendChild(labelSpan);

    if (!btn.disabled) {
      el.addEventListener("click", () => {
        if (multiple) {
          if (_selected.has(btn.value)) _selected.delete(btn.value);
          else _selected.add(btn.value);
        } else {
          _selected.clear();
          _selected.add(btn.value);
        }
        // Update visuals
        root.querySelectorAll(".toggle-btn").forEach((b) => {
          const sel = _selected.has((b as HTMLElement).dataset.value!);
          (b as HTMLElement).style.background = sel ? "#eff6ff" : "#fff";
          (b as HTMLElement).style.color = sel ? "#2563eb" : "#374151";
          (b as HTMLElement).style.borderColor = sel ? "#93c5fd" : "#d1d5db";
        });
        onChange?.([..._selected]);
      });
    }

    root.appendChild(el);
  });

  return root;
}
