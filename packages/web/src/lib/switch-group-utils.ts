/**
 * Switch Group Utilities: Grouped toggle switches with shared context,
 * related settings panel, exclusive mode, and form integration.
 */

// --- Types ---

export type SwitchGroupLayout = "vertical" | "horizontal" | "grid";

export interface SwitchItemConfig {
  /** Unique ID */
  id: string;
  /** Label text */
  label: string;
  /** Description/subtitle */
  description?: string;
  /** Initially on/off */
  defaultChecked?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom onChange for this switch only */
  onChange?: (checked: boolean, item: SwitchItemConfig) => void;
  /** Data payload */
  data?: unknown;
}

export interface SwitchGroupOptions {
  /** Switch items */
  items: SwitchItemConfig[];
  /** Layout arrangement */
  layout?: SwitchGroupLayout;
  /** Columns per row (for grid layout) */
  columns?: number;
  /** Exclusive/radio mode (only one can be on at a time) */
  exclusive?: boolean;
  /** Show descriptions under each label */
  showDescriptions?: boolean;
  /** Group label/title */
  groupLabel?: string;
  /** Group description */
  groupDescription?: string;
  /** Size of switches ("sm" | "md" | "lg") */
  size?: "sm" | "md" | "lg";
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when any switch changes */
  onChange?: (id: string, checked: boolean, item: SwitchItemConfig) => void;
  /** Called when all switches' states are needed */
  onStateChange?: (state: Record<string, boolean>) => void;
}

export interface SwitchGroupInstance {
  /** The root element */
  el: HTMLElement;
  /** Get current state as record of id -> boolean */
  getState: () => Record<string, boolean>;
  /** Set a specific switch */
  setSwitch: (id: string, checked: boolean) => void;
  /** Get a specific switch's state */
  getSwitch: (id: string) => boolean;
  /** Turn all on */
  allOn: () => void;
  /** Turn all off */
  allOff: () => void;
  /** Replace all items */
  setItems: (items: SwitchItemConfig[]) => void;
  /** Get current items */
  getItems: () => SwitchItemConfig[];
  /** Destroy */
  destroy: () => void;
}

// --- Size Config ---

const SWITCH_SIZES: Record<string, { trackW: string; trackH: string; thumb: string }> = {
  "sm": { trackW: "32px", trackH: "16px", thumb: "12px" },
  "md": { trackW: "40px", trackH: "22px", thumb: "18px" },
  "lg": { trackW: "48px", trackH: "28px", thumb: "22px" },
};

// --- Core Factory ---

/**
 * Create a group of related toggle switches.
 *
 * @example
 * ```ts
 * const group = createSwitchGroup({
 *   groupLabel: "Notifications",
 *   items: [
 *     { id: "email", label: "Email notifications", description: "Get notified via email", defaultChecked: true },
 *     { id: "push", label: "Push notifications" },
 *     { id: "sms", label: "SMS notifications", disabled: true },
 *   ],
 *   onChange: (id, checked) => console.log(id, checked),
 * });
 * ```
 */
export function createSwitchGroup(options: SwitchGroupOptions): SwitchGroupInstance {
  const {
    items,
    layout = "vertical",
    columns = 2,
    exclusive = false,
    showDescriptions = true,
    groupLabel,
    groupDescription,
    size = "md",
    className,
    container,
    onChange,
    onStateChange,
  } = options;

  let _items = [...items];
  const _state: Record<string, boolean> = {};
  _items.forEach((item) => { _state[item.id] = item.defaultChecked ?? false; });
  let cleanupFns: Array<() => void> = [];

  const ss = SWITCH_SIZES[size];

  // Root
  const root = document.createElement("fieldset");
  root.className = `switch-group ${layout} ${className ?? ""}`.trim();
  root.style.cssText =
    "border:none;padding:0;margin:0;" +
    (layout === "horizontal"
      ? "display:flex;align-items:center;gap:20px;"
      : layout === "grid"
        ? `display:grid;grid-template-columns:repeat(${columns}, 1fr);gap:16px;`
        : "display:flex;flex-direction:column;gap:12px;");

  // Group label
  if (groupLabel) {
    const legend = document.createElement("legend");
    legend.textContent = groupLabel;
    legend.style.cssText = "font-size:14px;font-weight:600;color:#111827;padding-bottom:8px;";
    root.appendChild(legend);
  }

  if (groupDescription) {
    const desc = document.createElement("p");
    desc.textContent = groupDescription;
    desc.style.cssText = "font-size:12px;color:#6b7280;margin:0 0 12px 0;";
    root.appendChild(desc);
  }

  _render();

  (container ?? document.body).appendChild(root);

  // --- Render ---

  function _render(): void {
    // Keep legend/description, remove old rows
    const children = Array.from(root.children);
    children.forEach((child) => {
      if (child.tagName !== "FIELDSET" && child.tagName !== "LEGEND" && child.tagName !== "P") child.remove();
    });

    _items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "switch-row";
      row.dataset.switchId = item.id;
      row.style.cssText =
        "display:flex;align-items:flex-start;gap:10px;" +
        (layout === "horizontal" ? "justify-content:space-between;" : "");

      // Switch track + thumb
      const track = document.createElement("button");
      track.type = "button";
      track.className = "switch-track";
      track.setAttribute("role", "switch");
      track.setAttribute("aria-checked", String(_state[item.id] ?? false));
      track.setAttribute("aria-label", item.label);
      track.disabled = item.disabled ?? false;

      const isChecked = _state[item.id] ?? false;
      track.style.cssText =
        `position:relative;width:${ss.trackW};height:${ss.trackH};border-radius:${parseInt(ss.trackH) / 2}px;` +
        `background:${isChecked ? "#3b82f6" : "#d1d5db"};border:none;cursor:pointer;` +
        "flex-shrink:0;transition:background 0.2s ease;outline:none;padding:0;";

      const thumb = document.createElement("span");
      thumb.className = "switch-thumb";
      thumb.style.cssText =
        `position:absolute;top:${(parseInt(ss.trackH) - parseInt(ss.thumb)) / 2}px;` +
        (isChecked ? `left:calc(100% - ${ss.thumb} - 2px)` : "left:2px") + ";" +
        `width:${ss.thumb};height:${ss.thumb};border-radius:50%;background:#fff;` +
        "box-shadow:0 1px 3px rgba(0,0,0,0.15);transition:left 0.2s ease;pointer-events:none;";

      track.appendChild(thumb);
      row.appendChild(track);

      // Label area
      const labelArea = document.createElement("label");
      labelArea.className = "switch-label-area";
      labelArea.htmlFor = "";
      labelArea.style.cssText =
        "display:flex;flex-direction:column;gap:1px;cursor:pointer;flex:1;min-width:0;";

      const labelText = document.createElement("span");
      labelText.className = "switch-label-text";
      labelText.textContent = item.label;
      labelText.style.cssText =
        `font-size:${size === "sm" ? "12px" : "13px"};font-weight:500;color:${item.disabled ? "#9ca3af" : "#374151"};line-height:1.3;`;
      labelArea.appendChild(labelText);

      if (showDescriptions && item.description) {
        const descText = document.createElement("span");
        descText.className = "switch-desc";
        descText.textContent = item.description;
        descText.style.cssText = "font-size:11px;color:#9ca3af;line-height:1.3;";
        labelArea.appendChild(descText);
      }

      row.appendChild(labelArea);
      root.appendChild(row);

      // Click handler
      const handleClick = (): void => {
        if (item.disabled) return;
        const newValue = !(_state[item.id] ?? false);

        if (exclusive && newValue) {
          // Turn off all others
          for (const key of Object.keys(_state)) {
            if (key !== item.id) _state[key] = false;
          }
          _state[item.id] = true;
          _updateAllVisuals();
        } else {
          _state[item.id] = newValue;
          _updateSingleVisual(item.id, newValue);
        }

        onChange?.(item.id, newValue, item);
        onStateChange?.({ ..._state });
        item.onChange?.(newValue, item);
      };

      track.addEventListener("click", handleClick);
      labelArea.addEventListener("click", (e) => {
        e.preventDefault();
        handleClick();
      });

      // Keyboard support
      track.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      });
    });
  }

  function _updateSingleVisual(id: string, checked: boolean): void {
    const row = root.querySelector(`[data-switch-id="${id}"]`) as HTMLElement;
    if (!row) return;

    const track = row.querySelector(".switch-track") as HTMLElement;
    const thumb = row.querySelector(".switch-thumb") as HTMLElement;
    if (!track || !thumb) return;

    track.setAttribute("aria-checked", String(checked));
    track.style.background = checked ? "#3b82f6" : "#d1d5db";
    thumb.style.left = checked ? `calc(100% - ${ss.thumb} - 2px)` : "2px";
  }

  function _updateAllVisuals(): void {
    for (const [id, val] of Object.entries(_state)) {
      _updateSingleVisual(id, val);
    }
  }

  // --- Public API ---

  function getState(): Record<string, boolean> { return { ..._state }; }

  function setSwitch(id: string, checked: boolean): void {
    if (!(id in _state)) return;
    if (exclusive && checked) {
      for (const key of Object.keys(_state)) _state[key] = key === id;
    } else {
      _state[id] = checked;
    }
    _updateAllVisuals();
    onStateChange?.({ ..._state });
  }

  function getSwitch(id: string): boolean { return _state[id] ?? false; }

  function allOn(): void {
    for (const id of Object.keys(_state)) _state[id] = true;
    _updateAllVisuals();
    onStateChange?.({ ..._state });
  }

  function allOff(): void {
    for (const id of Object.keys(_state)) _state[id] = false;
    _updateAllVisuals();
    onStateChange?.({ ..._state });
  }

  function setItems(newItems: SwitchItemConfig[]): void {
    _items = newItems;
    const newState: Record<string, boolean> = {};
    newItems.forEach((item) => { newState[item.id] = item.defaultChecked ?? false; });
    Object.assign(_state, newState);
    _render();
  }

  function getItems(): SwitchItemConfig[] { return [..._items]; }

  function destroy(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
    root.remove();
  }

  return { el: root, getState, setSwitch, getSwitch, allOn, allOff, setItems, getItems, destroy };
}
