/**
 * Emoji Picker: Categorized emoji picker with search, skin tones,
 * recent usage, keyboard navigation, and copy-to-clipboard.
 */

// --- Types ---

export interface EmojiData {
  id: string;
  emoji: string;
  name: string;
  keywords?: string[];
  category: EmojiCategory;
}

export type EmojiCategory =
  | "smileys"
  | "people"
 | "animals"
  | "food"
  | "activities"
  | "travel"
  | "objects"
 | "symbols"
  | "flags";

export interface SkinTone {
  id: string;
  label: string;
  base: string; // Unicode base character
}

export interface EmojiPickerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Callback when emoji is selected */
  onSelect: (emoji: EmojiData) => void;
  /** Initial category to show (default: "smileys") */
  initialCategory?: EmojiCategory;
  /** Show search bar? */
  showSearch?: boolean;
  /** Show skin tone selector? */
  showSkinTones?: boolean;
  /** Show recently used? */
  showRecent?: boolean;
  /** Max recent emojis (default: 20) */
  maxRecent?: number;
  /** Number of columns in grid (default: 8) */
  columns?: number;
  /** Emoji size in px (default: 32) */
  emojiSize?: number;
  /** Custom categories (overrides defaults) */
  categories?: Record<string, EmojiData[]>;
  /** Custom CSS class */
  className?: string;
  /** Z-index (default: 10000) */
  zIndex?: number;
  /** Anchor element for positioning */
  anchor?: HTMLElement;
  /** Position relative to anchor ("below" | "above" | "auto") */
  position?: "below" | "above" | "auto";
  /** Open/close state */
  open?: boolean;
  /** Callback on open/close */
  onOpen?: () => void;
  onClose?: () => void;
}

export interface EmojiPickerInstance {
  element: HTMLElement;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  getRecent: () => EmojiData[];
  clearRecent: () => void;
  destroy: () => void;
}

// --- Default Emoji Data (curated subset) ---

const DEFAULT_CATEGORIES: Record<string, EmojiData[]> = {
  smileys: [
    { id: "grin", emoji: "\u{1F600}", name: "Grinning Face", keywords: ["happy", "smile", "grin"], category: "smileys" },
    { id: "smile", emoji: "\u{1F642}", name: "Slightly Smiling", keywords: ["smile", ":)"], category: "smileys" },
    { id: "laugh", emoji: "\u{1F602}", name: "Face with Tears of Joy", keywords: ["laugh", "cry", "happy"], category: "smileys" },
    { id: "wink", emoji: "\u{1F609}", name: "Winking Face", keywords: ["wink", ";)", "flirt"], category: "smileys" },
    { id: "kiss", emoji: "\u{1F617}", name: "Kissing Face", keywords: ["kiss", "love", "xoxo"], category: "smileys" },
    { id: "sad", emoji: "\u{1F641}", name: "Pensive Face", keywords: ["sad", "cry", "unhappy"], category: "smileys" },
    { id: "thinking", emoji: "\u{1F914}", name: "Thinking Face", keywords: ["think", "hmm", "..."], category: "smileys" },
    { id: "cool", emoji: "\u{1F60E}", name: "Smiling Face with Sunglasses", keywords: ["cool", "sunglasses", "swag"], category: "smileys" },
    { id: "star-struck", emoji: "\u{1F929}", name: "Star-Struck", keywords: ["star", "dazzled", "amazed"], category: "smileys" },
    {: "fire": { id: "fire", emoji: "\u{1F525}", name: "Fire", keywords: ["fire", "hot", "lit"], category: "symbols" },
    { id: "heart", emoji: "\u{2764\uFE0F}", name: "Red Heart", keywords: ["heart", "love", "like"], category: "smileys" },
    { id: "broken-heart", emoji: "\u{1F494}", name: "Broken Heart", keywords: ["broken", "sad", "divorce"], category: "smileys" },
    { id: "thumbs-up", emoji: "\u{1F44D}", name: "Thumbs Up", keywords: ["thumb", "up", "like", "good"], category: "smileys" },
    { id: "thumbs-down", emoji: "\u{1F44E}", name: "Thumbs Down", keywords: ["thumb", "down", "dislike", "bad"], category: "smileys" },
    { id: "clap", emoji: "\u{1F44F}", name: "Clapping Hands", keywords: ["clap", "applause", "bravo"], category: "smileys" },
    { id: "ok-hand", emoji: "\u{1F44C}", name: "OK Hand Sign", keywords: ["ok", "perfect", "yes"], category: "smileys" },
    { id: "party", emoji: "\u{1F973}", name: "Party Popper", keywords: ["party", "celebrate", "confetti"], category: "smileys" },
  ],
  people: [
    { id: "wave", emoji: "\u{1F44B}", name: "Waving Hand", keywords: ["wave", "hello", "hi"], category: "people" },
    { id: "raised-fist", emoji: "\u{270A}\uFE0F", name: "Raised Fist", keywords: ["fist", "power", "resist"], category: "people" },
    { id: "handshake", emoji: "\u{1F91D}", name: "Handshake", keywords: ["deal", "agreement", "partner"], category: "people" },
    { id: "palms-up", emoji: "\u{1F64F}", name: "Palms Up Together", keywords: ["friends", "teamwork", "high-five"], category: "people" },
    { id: "pray", emoji: "\u{1F64F}", name: "Person with Folded Hands", keywords: ["pray", "hope", "please"], category: "people" },
    { id: "point-up", emoji: "\u{261D}\uFE0F", name: "Index Pointing Up", keywords: ["up", "there", "look"], category: "people" },
    { id: "facepalm", emoji: "\u{1F937}", name: "Face Palm", keywords: ["shy", "embarrassed", "oops"], category: "people" },
    { id: "muscle", emoji: "\u{1F4AA}", name: "Flexed Biceps", keywords: ["strong", "muscle", "gym"], category: "people" },
    { id: "brain", emoji: "\u{1F9E0}", name: "Brain", keywords: ["smart", "idea", "think"], category: "people" },
    { id: "nurse", emoji: "\u{1F46E}", name: "Woman Health Worker", keywords: ["doctor", "nurse", "hospital"], category: "people" },
    { id: "old-man", emoji: "\u{1F474}", name: "Old Man", keywords: ["elder", "grandpa", "senior"], category: "people" },
    { id: "baby", emoji: "\u{1F476}", name: "Baby", keywords: ["baby", "child", "infant"], category: "people" },
  ],
  animals: [
    { id: "dog", emoji: "\u{1F436}", name: "Dog Face", keywords: ["dog", "puppy", "pet"], category: "animals" },
    { id: "cat", emoji: "\u{1F431}", name: "Cat Face", keywords: ["cat", "kitty", "meow"], category: "animals" },
    { id: "mouse", emoji: "\u{1F42D}", name: "Mouse Face", keywords: ["mouse", "rat", "rodent"], category: "animals" },
    { id: "rabbit", emoji: "\u{1F430}", name: "Rabbit Face", keywords: ["rabbit", "bunny", "hop"], category: "animals" },
    { id: "fox", emoji: "\u{1F98A}", name: "Fox Face", keywords: ["fox", "sly", "clever"], category: "animals" },
    { id: "bear", emoji: "\u{43B}", name: "Bear", keywords: ["bear", "roar", "wild"], category: "animals" },
    { id: "panda", emoji: "\u{1F43C}", name: "Panda", keywords: ["panda", "cute", "bamboo"], category: "animals" },
    { id: "monkey", emoji: "\u{1F412}", name: "Monkey Face", keywords: ["monkey", "ape", "banana"], category: "animals" },
    { id: "chicken", emoji: "\u{1F424}", name: "Chicken", keywords: ["chicken", "bird", "cluck"], category: "animals" },
    { id: "cow", emoji: "\u{1F42E}", name: "Cow Face", keywords: ["cow", "moo", "milk"], category: "animals" },
    { id: "pig", emoji: "\u{1F437}", name: "Pig Face", keywords: ["pig", "oink", "bacon"], category: animals" },
    { id: "frog", emoji: "\u{1F438}", name: "Frog Face", keywords: ["frog", "toad", "ribbit"], category: "animals" },
    { id: "octopus", emoji: "\u{1F419}", name: "Octopus", keywords: ["octopus", "tentacle", "sea"], category: "animals" },
    { id: "butterfly", emoji: "\u{1F98B}", name: "Butterfly", keywords: ["butterfly", "fly", "wing"], category: "animals" },
    { id: "bee", emoji: "\u{1F41D}", name: "Honeybee", keywords: ["bee", "hive", "buzz"], category: "animals" },
    { id: "bug", emoji: "\u{1F41B}", name: "Bug", keywords: ["bug", "insect", "debug"], category: "animals" },
    { id: "snail", emoji: "\u{1F40C}", name: "Snail", keywords: ["snail", "slow", "shell"], category: "animals" },
  ],
  food: [
    { id: "apple", emoji: "\u{1F34E}", name: "Red Apple", keywords: ["apple", "fruit", "red"], category: "food" },
    { id: "grapes", emoji: "\u{1F347}", name: "Grapes", keywords: ["grapes", "fruit", "wine"], category: "food" },
    { id: "watermelon", emoji: "\u{1F349}", name: "Watermelon", keywords: ["melon", "summer", "fruit"], category: "food" },
    { id: "strawberry", emoji: "\u{1F353}", name: "Strawberry", keywords: ["strawberry", "berry", "red"], category: "food" },
    { id: "pizza", emoji: "\u{1F355}", name: "Pizza", keywords: ["pizza", "slice", "cheese"], category: "food" },
    { id: "burger", emoji: "\u{1F354}", name: "Hamburger", keywords: ["burger", "cheese", "fast food"], category: "food" },
    { id: "taco", emoji: "\u{1F32E}", name: "Taco", keywords: ["taco", "mexican", "food"], category: "food" },
    { id: "burrito", emoji: "\u{F32C}", name: "Burrito", keywords: ["burrito", "wrap", "mexican"], category: "food" },
    { id: "ramen", emoji: "\u{1F35C}", name: "Steaming Bowl", keywords: ["ramen", "noodle", "soup"], category: "food" },
    { id: "egg", emoji: "\u{1F95A}", name: "Cooking Egg", keywords: ["egg", "breakfast", "break"], category: "food" },
    { id: "popcorn", emoji: "\u{1F37F}", name: "Popcorn", keywords: ["popcorn", "snack", "movie"], category: "food" },
    { id: "cookie", emoji: "\u{1F36A}", name: "Cookie", keywords: ["cookie", "biscuit", "sweet"], category: "food" },
    { id: "cake", emoji: "\u{1F382}", name: "Birthday Cake", keywords: ["cake", "birthday", "celebration"], category: "food" },
    { id: "ice-cream", emoji: "\u{1F368}", name: "Ice Cream", keywords: ["ice cream", "cold", "dessert"], category: "food" },
    { id: "hot-beverage", emoji: "\u{2615}\u{FE0F}", name: "Hot Beverage", keywords: ["coffee", "tea", "drink"], category: "food" },
    { id: "beer", emoji: "\u{1F37A}", name: "Beer Mug", keywords: ["beer", "alcohol", "drink"], category: "food" },
  ],
  activities: [
    { id: "soccer", emoji: "\u26BD", name: "Soccer Ball", keywords: ["soccer", "football", "goal"], category: "activities" },
    { id: "basketball", emoji: "\u{1F3C0}", name: "Basketball", keywords: ["basketball", "hoop", "sport"], category: "activities" },
    { id: "football", emoji: "\u{1F3C8}", name: "American Football", keywords: ["football", "touchdown", "nfl"], category: "activities" },
    { id: "baseball", emoji: "\u26BE", name: "Baseball", keywords: ["baseball", "bat", "home run"], category: "activities" },
    { id: "video-game", emoji: "\u{1F3AE}", name: "Video Game Controller", keywords: ["game", "controller", "play"], category: "activities" },
    { id: "music", emoji: "\u{1F3B5}", name: "Musical Note", keywords: ["music", "song", "note"], category: "activities" },
    { id: "art", emoji: "\u{1F3A8}", name: "Artist Palette", keywords: ["art", "paint", "draw"], category: "activities" },
    { id: "trophy", emoji: "\u{1F3C6}", name: "Trophy", keywords: ["trophy", "award", "winner"], category: "activities" },
    { id: "medal", emoji: "\u{1F3C5}", name: "Sports Medal", keywords: ["medal", "gold", "silver"], category: "activities" },
    { id: "bike", emoji: "\u{1F6B2}", name: "Bicycle", keywords: ["bike", "cycle", "ride"], category: "activities" },
    { id: "car", emoji: "\u{1F697}", name: "Automobile", keywords: ["car", "drive", "vehicle"], category: "activities" },
    { id: "plane", emoji: "\u2708\uFE0F", name: "Airplane", keywords: ["plane", "flight", "travel"], category: "travel" },
    { id: "rocket", emoji: "\u{1F680}", name: "Rocket", keywords: ["rocket", "launch", "space"], category: "activities" },
  ],
  travel: [
    { id: "earth", emoji: "\u{1F30F}", name: "Earth Globe Europe-Africa", keywords: ["earth", "world", "planet"], category: "travel" },
    { id: "moon", emoji: "\u{1F314}", name: "Crescent Moon", keywords: ["moon", "night", "space"], category: "travel" },
    { id: "sun", emoji: "\u{2600}\uFE0F", name: "Sun", keywords: ["sun", "sunny", "day"], category: "travel" },
    { id: "cloud", emoji: "\u2601\ufe0f", name: "Cloud", keywords: ["cloud", "sky", "weather"], category: "travel" },
    { id: "rainbow", emoji: "\u{1F308}", name: "Rainbow", keywords: ["rainbow", "colorful", "pride"], category: "travel" },
    { id: "umbrella", emoji: "\u2602\uFE0F", name: "Umbrella with Rain Drops", keywords: ["umbrella", "rain", "weather"], category: "travel" },
    { id: "house", emoji: "\u{1F3E0}", name: "House Building", keywords: ["house", "home", "building"], category: "travel" },
    { id: "hotel", emoji: "🏨", name: "Hotel", keywords: ["hotel", "lodging", "vacation"], category: "travel" },
    { id: "tent", emoji: "\u⛺", name: "Tent", keywords: ["tent", "camping", "outdoor"], category: "travel" },
  ],
  objects: [
    { id: "money-bag", emoji: "\u{1F4B0}", name: "Money Bag", keywords: ["money", "cash", "payment"], category: "objects" },
    { id: "gem", emoji: "\u{1F48E}", name: "Gem Stone", keywords: ["gem", "diamond", "jewel"], category: "objects" },
    { id: "key", emoji: "\u{1F511}", name: "Key", keywords: ["key", "lock", "password"], category: "objects" },
    { id: "lock", emoji: "\u{1F512}", name: "Lock", keywords: ["lock", "secure", "private"], category: "objects" },
    {: "lightbulb": { id: "lightbulb", emoji: "\u{1F4A1}", name: "Light Bulb", keywords: ["light", "idea", "lamp"], category: "objects" },
    { id: "bomb", emoji: "\u{1F4A3}", name: "Bomb", keywords: ["bomb", "explosive", "danger"], category: "objects" },
    { id: "gun", emoji: " \u{1F52B}", name: "Pistol", keywords: ["gun", "weapon", "shoot"], category: "objects" },
    { id: "scissors", emoji: "\u{2702}\uFE0F", name: "Scissors", keywords: ["scissors", "cut", "edit"], category: "objects" },
    { id: "hammer", emoji: "\u{1F528}", name: "Hammer", keywords: ["hammer", "tool", "fix"], category: "objects" },
    { id: "wrench", emoji: "\u{1F527}", name: "Wrench", keywords: ["wrench", "tool", "fix"], category: "objects" },
    { id: "gear", emoji: "\u2699", name: "Gear", keywords: ["gear", "settings", "config"], category: "objects" },
    {: "package": { id: "package", emoji: "\u{1F4E6}", name: "Package", keywords: ["package", "box", "delivery"], category: "objects" },
    { id: "gift", emoji: "\u{1F381}", name: "Wrapped Gift", keywords: ["gift", "present", "surprise"], category: "objects" },
    {: "bell": { id: "bell", emoji: "\u{1F514}", name: "Bell", keywords: ["bell", "alarm", "notify"], category: "objects" },
    { id: "pin", emoji: "\u{1F4CC}", name: "Pushpin", keywords: ["pin", "attach", "mark"], category: "objects" },
    { id: "bookmark", emoji: "\u{1F516}", name: "Bookmark", keywords: ["bookmark", "save", "favorite"], category: "objects" },
    { id: "briefcase", emoji: "\u{1F4BC}", name: "Briefcase", keywords: ["briefcase", "document", "lawyer"], category: "objects" },
    { id: "microscope", emoji: "\u{1F52C}", name: "Microscope", keywords: ["microscope", "science", "lab"], category: "objects" },
    { id: "magnifying-glass", emoji: "\u{1F50D}", name: "Magnifying Glass Tilted Left", keywords: ["search", "zoom", "find"], category: "objects" },
    { id: "camera", emoji: "\u{1F4F7}", name: "Camera", keywords: ["camera", "photo", "picture"], category: "objects" },
  ],
  symbols: [
    { id: "checkmark", emoji: "\u2705", name: "White Heavy Check Mark", keywords: ["check", "yes", "correct", "done"], category: "symbols" },
    { id: "cross-mark", emoji: "\u274C", name: "Cross Mark", keywords: ["cross", "no", "wrong", "cancel"], category: "symbols" },
    { id: "plus", emoji: "+", name: "Plus Sign", keywords: ["plus", "add", "more"], category: "symbols" },
    { id: "minus", emoji: "-", name: "Minus Sign", keywords: ["minus", "subtract", "less"], category: "symbols" },
    { id: "multiply", emoji: "\u2715", name: "Multiplication Sign", keywords: ["times", "math", "calc"], category: "symbols" },
    { id: "divide", emoji: "\u2797", name: "Division Sign", keywords: ["divide", "slash", "math"], category: symbols" },
    { id: "hash", emoji: "#", name: "Number Sign", keywords: ["number", "pound", "tag"], category: "symbols" },
    { id: "asterisk", emoji: "*", name: "Asterisk", keywords: ["star", "wildcard", "important"], category: "symbols" },
    { id: "question", emoji: "?", name: "Question Mark", keywords: ["question", "help", "info"], category: "symbols" },
    { id: "exclamation", emoji: "!", name: "Exclamation Mark", keywords: ["!", "warn", "alert"], category: "symbols" },
    { id: "warning", emoji: "\u26A0\uFE0F", name: "Warning Symbol", keywords: ["warning", "caution", "alert"], category: "symbols" },
    {: "sparkles": { id: "sparkles", emoji: "\u2728", name: "Bright Sparkles", keywords: ["sparkle", "shine", "magic"], category: "symbols" },
    { id: "recycle", emoji: "\u{267B}\uFE0F}", name: "Recycling Symbol", keywords: ["recycle", "refresh", "eco"], category: "symbols" },
    { id: "infinity", emoji: "\u221E", name: "Infinity", keywords: ["infinity", "forever", "loop"], category: "symbols" },
    { id: "copyright", emoji: "\u00A9", name: "Copyright Sign", keywords: ["copyright", "(c)", "copy"], category: "symbols" },
    { id: "registered", emoji: "\u00AE", name: "Registered Sign", keywords: ["registered", "r", "circled"], category: "symbols" },
    { id: "tm", emoji: "\u2122", name: "Trade Mark Sign", keywords: ["tm", "trademark", "brand"], category: "symbols" },
  ],
};

// Category order
const CATEGORY_ORDER: EmojiCategory[] = [
  "smileys", "people", "animals", "food", "activities",
  "travel", "objects", "symbols",
];

// Skin tones
const SKIN_TONES: SkinTone[] = [
  { id: "default", label: "Default", base: "" },
  { id: "light", label: "Light Skin Tone 1-2", base: "\u{1F3FB}" },
  { id: "medium-light", label: "Medium-Light Skin Tone 3", base: "\u{1F3FC}" },
  { id: "medium", label: "Medium Skin Tone 4", base: "\u{1F3FD}" },
  { "medium-dark", label: "Medium-Dark Skin Tone 5", base: "\u{1F3FE}" },
  { "dark", label: "Dark Skin Tone 6", base: "\u{1F3FF}" },
];

// --- Main Factory ---

export function createEmojiPicker(options: EmojiPickerOptions): EmojiPickerInstance {
  const opts = {
    initialCategory: options.initialCategory ?? "smileys",
    showSearch: options.showSearch ?? true,
    showSkinTones: options.showSkinTones ?? true,
    showRecent: options.showRecent ?? true,
    maxRecent: options.maxRecent ?? 20,
    columns: options.columns ?? 8,
    emojiSize: options.emojiSize ?? 32,
    zIndex: options.zIndex ?? 10000,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("EmojiPicker: container not found");

  // Use custom categories if provided, otherwise use defaults
  const allCategories = opts.categories ?? DEFAULT_CATEGORIES;

  let visible = options.open ?? false;
  let currentCategory = opts.initialCategory;
  let currentSkinTone = SKIN_TONES[0];
  let destroyed = false;
  let recentEmojis: EmojiData[] = [];

  // Load recent from localStorage
  try {
    const saved = localStorage.getItem("emoji-recent");
    if (saved) recentEmojis = JSON.parse(saved);
  } catch {}

  // Create DOM
  const el = document.createElement("div");
  el.className = `emoji-picker ${opts.className ?? ""}`;
  el.style.cssText = `
    position:absolute;z-index:${opts.zIndex};background:#fff;border-radius:12px;
    box-shadow:0 16px 60px rgba(0,0,0,0.18);font-family:-apple-system,sans-serif;
    display:none;flex-direction:column;width:340px;max-height:400px;
    overflow:hidden;border:1px solid #e5e7eb;
  `;
  container.appendChild(el);

  // Search bar
  const searchEl = document.createElement("input");
  searchEl.type = "text";
  searchEl.placeholder = "Search emoji...";
  searchEl.spellcheck = false;
  searchEl.autocomplete = "off";
  searchEl.style.cssText = `
    width:100%;padding:10px 14px;border:none;border-bottom:1px solid #eee;font-size:14px;
    outline:none;background:transparent;margin:0;
  `;
  el.appendChild(searchEl);

  // Results area
  const resultsEl = document.createElement("div");
  resultsEl.className = "ep-results";
  resultsEl.style.cssText = "overflow-y:auto;padding:8px;flex:1;";
  el.appendChild(resultsEl);

  // Category tabs
  const tabsEl = document.createElement("div");
  tabsEl.className = "ep-tabs";
  tabsEl.style.cssText = "display:flex;flex-shrink:0;border-top:1px solid #eee;padding:0;overflow-x:auto;";
  el.appendChild(tabsEl);

  // Skin tones row
  const skinRowEl = document.createElement("div");
  skinRowEl.className = "ep-skin-row";
  skinRowEl.style.cssText = `
    display:flex;gap:4px;padding:8px 14px;border-top:1px solid #eee;
    align-items:center;flex-shrink:0;
  `;
  if (!opts.showSkinTones) skinRowEl.style.display = "none";
  el.appendChild(skinRowEl);

  // Render functions
  function renderTabs(): void {
    tabsEl.innerHTML = "";
    for (const cat of CATEGORY_ORDER) {
      if (!(cat in allCategories)) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      btn.dataset.category = cat;
      btn.style.cssText = `
        padding:6px 12px;border:none;background:none;font-size:12px;font-weight:${currentCategory === cat ? "600" : "500"};
        color:${currentCategory === cat ? "#111827" : "#6b7280"};cursor:pointer;
        border-bottom:2px solid ${currentCategory === cat ? opts.accentColor || "#4338ca" : "transparent"};
        white-space:nowrap;transition:all 0.15s;
      `;
      btn.addEventListener("click", () => { currentCategory = cat; renderAll(); });
      tabsEl.appendChild(btn);
    }
  }

  function renderSkinTones(): void {
    skinRowEl.innerHTML = "";
    for (const st of SKIN_TONES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = st.label === "Default" ? "Default" : st.base + "Aa";
      btn.dataset.skinId = st.id;
      btn.style.cssText = `
        width:28px;height:28px;border-radius:50%;border:1.5px solid #ddd;
        background:${st.id === currentSkinTone.id ? "#eef2ff" : "#fff"};
        font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;
        transition:background 0.15s;padding:0;line-height:1;
      `;
      btn.addEventListener("click", () => { currentSkinTone = st; renderAll(); });
      skinRowEl.appendChild(btn);
    }
  }

  function renderEmojis(filter = ""): void {
    resultsEl.innerHTML = "";
    const emojis = allCategories[currentCategory] ?? [];
    const filtered = filter
      ? emojis.filter((e) =>
          e.name.toLowerCase().includes(filter.toLowerCase()) ||
          e.keywords?.some((k) => k.toLowerCase().includes(filter.toLowerCase()))
      : emojis;

    for (let i = 0; i < filtered.length; i += opts.columns) {
      const rowEl = document.createElement("div");
      rowEl.style.cssText = "display:flex;gap:4px;margin-bottom:4px;";
      for (let j = 0; j < opts.columns && i + j < filtered.length; j++) {
        const emoji = filtered[i + j]!;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.title = `${emoji.name} (${emoji.id})`;
        btn.dataset.emojiId = emoji.id;
        btn.style.cssText = `
          width:${opts.emojiSize}px;height:${opts.emojiSize}px;
          border:none;border-radius:8px;font-size:${opts.emojiSize - 4}px;
          cursor:pointer;display:flex;align-items:center;justify-content:center;
          background:transparent;transition:background 0.15s;padding:0;
        `;
        btn.textContent = applySkinTone(emoji.emoji);
        btn.addEventListener("click", () => {
          handleSelect(emoji);
        });
        btn.addEventListener("mouseenter", () => { btn.style.background = "#f0f4ff"; });
        btn.addEventListener("mouseleave", () => { btn.style.background = "transparent"; });
        rowEl.appendChild(btn);
      }
      resultsEl.appendChild(rowEl);
    }

    if (filtered.length === 0) {
      resultsEl.innerHTML = `<div style="text-align:center;padding:20px;color:#9ca3af;">No emojis found</div>`;
    }
  }

  function applySkinTone(emoji: string): string {
    if (currentSkinTone.id === "default") return emoji;
    return emoji + currentSkinTone.base;
  }

  function handleSelect(emoji: EmojiData): void {
    // Add to recent
    if (recentEmojis.findIndex((e) => e.id === emoji.id) >= 0) {
      recentEmojis.splice(0, 0, emoji);
    } else {
      recentEmojis.unshift(emoji);
    }
    if (recentEmojis.length > opts.maxRecent) recentEmojis.pop();
    try { localStorage.setItem("emoji-recent", JSON.stringify(recentEmojis)); } catch {}
    opts.onSelect?.(emoji);
  }

  function renderAll(): void {
    renderTabs();
    renderSkinTones();
    renderEmojis(searchEl.value);
  }

  // Search handler
  searchEl.addEventListener("input", () => renderAll());

  // Click outside to close
  document.addEventListener("mousedown", (e) => {
    if (visible && !el.contains(e.target as Node)) instance.close();
  });

  // Instance
  const instance: EmojiPickerInstance = {
    element: el,

    get isOpen() { return visible; },

    open() {
      visible = true;
      el.style.display = "flex";
      renderAll();
      searchEl.focus();
      opts.onOpen?.();
    },

    close() {
      visible = false;
      el.style.display = "none";
      opts.onClose?.();
    },

    toggle() {
      if (visible) this.close();
      else this.open();
    },

    getRecent() { return [...recentEmojis]; },

    clearRecent() {
      recentEmojis = [];
      try { localStorage.removeItem("emoji-recent"); } catch {}
    },

    destroy() {
      destroyed = true;
      el.remove();
    },
  };

  return instance;
}
