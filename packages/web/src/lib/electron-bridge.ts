/**
 * Electron Bridge: IPC communication layer between renderer and main process,
 * context bridge for secure messaging, window management, file system access,
 * native dialogs, system tray, auto-updater integration, deep linking,
 * clipboard/notifications/shell APIs, crash reporting.
 */

// --- Types ---

export type IpcChannel = string;
export type IpcListener = (event: ElectronIpcEvent, ...args: unknown[]) => void;

export interface ElectronIpcEvent {
  senderId?: number;
  frameId?: number;
  reply?: (...args: unknown[]) => void;
}

export interface IpcMessage<T = unknown> {
  channel: IpcChannel;
  payload: T;
  timestamp: number;
  id?: string;
  source?: "main" | "renderer" | "worker";
}

export interface WindowOptions {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  x?: number;
  y?: number;
  title?: string;
  icon?: string;
  resizable?: boolean;
  movable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  closable?: boolean;
  focusable?: boolean;
  alwaysOnTop?: boolean;
  fullscreen?: boolean;
  fullscreenable?: boolean;
  kiosk?: boolean;
  show?: boolean;
  frame?: boolean;
  transparent?: boolean;
  hasShadow?: boolean;
  vibrancy?: string;
  backgroundThrottling?: boolean;
  opacity?: number;
  backgroundColor?: string;
  titleBarStyle?: "default" | "hidden" | "hiddenInset" | "hiddenInsetCustomizable" | "customButtonsOnHover";
  trafficLightPosition?: { x: number; y: number };
  webPreferences?: {
    nodeIntegration?: boolean;
    contextIsolation?: boolean;
    sandbox?: boolean;
    preload?: string;
  };
}

export interface DialogOptions {
  type?: "none" | "info" | "error" | "question" | "warning";
  title?: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
  icon?: string;
}

export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: Array<
    | "openFile"
    | "openDirectory"
    | "multiSelections"
    | "showHiddenFiles"
    | "createDirectory"
    | "promptToCreate"
    | "noResolveAliases"
    | "treatPackageAsDirectory"
    | "dontAddToRecent"
  >;
  message?: string;
}

export interface TrayOptions {
  icon: string;
  tooltip?: string;
  title?: string;
  pressedImage?: string;
  iconIsTemplate?: boolean;
  ignoreDoubleClickEvents?: boolean;
}

export interface MenuItemOptions {
  id?: string;
  label?: string;
  type?: "normal" | "separator" | "submenu" | "checkbox" | "radio";
  role?:
    | "undo"
    | "redo"
    | "cut"
    | "copy"
    | "paste"
    | "pasteAndMatchStyle"
    | "delete"
    | "selectAll"
    | "reload"
    | "forceReload"
    | "toggleDevTools"
    | "resetZoom"
    | "zoomIn"
    | "zoomOut"
    | "togglefullscreen"
    | "window"
    | "minimize"
    | "close"
    | "quit"
    | "recentDocuments"
    | "clearRecentDocuments"
    | "about"
    | "hide"
    | "hideOthers"
    | "unhide"
    | "startSpeaking"
    | "stopSpeaking"
    | "zoom"
    | "front"
    | "help"
    | "services"
    | "appMenu"
    | "fileMenu"
    | "editMenu"
    | "viewMenu"
    | "toggleTabBar"
    | "selectNextTab"
    | "selectPreviousTab"
    | "mergeAllWindows"
    | "moveTabToNewWindow"
    | "windowTabbingThreshold"
    | "closeWindow";
  accelerator?: string | null;
  enabled?: boolean;
  visible?: boolean;
  checked?: boolean;
  click?: () => void;
  submenu?: MenuItemOptions[];
  icon?: string;
  toolTip?: string;
  registerAcceleratorWhenActiveOnly?: boolean;
}

export interface NotificationOptions {
  title: string;
  body?: string;
  silent?: boolean;
  icon?: string;
  hasReply?: boolean;
  replyPlaceholder?: string;
  sound?: string;
  actions?: Array<{ text: string; type?: "button" }>;
  urgency?: "normal" | "critical" | "low";
  closeButtonText?: string;
  subtitle?: string;
  sticker?: string;
  timeoutType?: "default" | "never";
}

export interface AutoUpdateInfo {
  available: boolean;
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
  downloadUrl?: string;
  fileSize?: number;
  sha256?: string;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  totalMemory: number;
  freeMemory: number;
  cpus: Array<{ model: string; speed: number }>;
  hostname: string;
  username: string;
  homeDir: string;
  appDataPath: string;
  tempDir: string;
  desktopPath: string;
  documentsPath: string;
  downloadsPath: string;
  musicPath: string;
  picturesPath: string;
  videosPath: string;
  isDevMode: boolean;
  isPackaged: boolean;
  appPath: string;
  appName: string;
  appVersion: string;
}

// --- Context Bridge (Renderer-Safe API) ---

/** Safe API exposed to renderer via contextBridge */
class ContextBridgeAPI {
  private api = new Map<string, (...args: unknown[]) => unknown>();
  private listeners = new Map<string, Set<IpcListener>>();

  /** Expose a function to the renderer */
  exposeInMainWorld(apiName: string, fn: (...args: unknown[]) => unknown): void {
    this.api.set(apiName, fn);
  }

  /** Get an exposed API */
  getApi<T>(apiName: string): T | undefined {
    return this.api.get(apiName) as T | undefined;
  }

  /** Listen for events from main process */
  on(channel: IpcChannel, listener: IpcListener): () => void {
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set());
    this.listeners.get(channel)!.add(listener);
    return () => this.listeners.get(channel)?.delete(listener);
  }

  /** Remove all listeners for a channel */
  removeAllListeners(channel: IpcChannel): void {
    this.listeners.delete(channel);
  }
}

// --- IPC Manager ---

export class IpcManager {
  private handlers = new Map<IpcChannel, Set<IpcListener>>();
  private onceHandlers = new Map<IpcChannel, Set<IpcListener>>();
  private pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private messageLog: IpcMessage[] = [];
  private maxLogSize = 1000;

  constructor(private mode: "main" | "renderer" = "renderer") {}

  /** Send a message (fire and forget) */
  send(channel: IpcChannel, ...args: unknown[]): void {
    const msg: IpcMessage = { channel, payload: args.length === 1 ? args[0] : args, timestamp: Date.now() };
    this.logMessage(msg);
    if (this.mode === "renderer") {
      // In real Electron: window.electronAPI.send(channel, ...args)
      this.emitLocal(channel, msg as any);
    }
  }

  /** Send a message and wait for response */
  async invoke<T = unknown>(channel: IpcChannel, data?: unknown, timeout = 30000): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const responseChannel = `${channel}-response`;

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`IPC request timeout: ${channel} (${timeout}ms)`));
      }, timeout);

      this.pendingRequests.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });

      // Listen for response
      const cleanup = this.on(responseChannel, (_event, response) => {
        if ((response as any)?.requestId === id) {
          cleanup();
          clearTimeout(timer);
          this.pendingRequests.delete(id);
          if ((response as any)?.error) {
            reject(new Error((response as any).error));
          } else {
            resolve((response as any)?.data as T);
          }
        }
      });

      this.send(channel, { ...(data ?? {}), requestId: id });
    });
  }

  /** Handle incoming messages */
  handle(channel: IpcChannel, listener: IpcListener): () => void {
    if (!this.handlers.has(channel)) this.handlers.set(channel, new Set());
    this.handlers.get(channel)!.add(listener);
    return () => this.handlers.get(channel)?.delete(listener);
  }

  /** Handle a single message then remove listener */
  handleOnce(channel: IpcChannel, listener: IpcListener): () => void {
    if (!this.onceHandlers.has(channel)) this.onceHandlers.set(channel, new Set());
    this.onceHandlers.get(channel)!.add(listener);
    return () => this.onceHandlers.get(channel)?.delete(listener);
  }

  /** Simulate receiving a message (for testing / non-Electron env) */
  receive(channel: IpcChannel, event: ElectronIpcEvent, ...args: unknown[]): void {
    const msg: IpcMessage = { channel, payload: args.length === 1 ? args[0] : args, timestamp: Date.now(), source: "main" };
    this.logMessage(msg);

    // Regular handlers
    for (const handler of this.handlers.get(channel) ?? []) {
      try { handler(event, ...args); } catch (e) { console.error(`IPC handler error [${channel}]:`, e); }
    }

    // Once handlers
    const onceSet = this.onceHandlers.get(channel);
    if (onceSet && onceSet.size > 0) {
      for (const handler of onceSet) {
        try { handler(event, ...args); } catch (e) { console.error(`IPC once handler error [${channel}]:`, e); }
      }
      onceSet.clear();
    }
  }

  /** Register all handlers at once */
  registerHandlers(handlers: Record<IpcChannel, IpcListener>): void {
    for (const [channel, handler] of Object.entries(handlers)) {
      this.handle(channel, handler);
    }
  }

  /** Listen for messages from other process */
  on(channel: IpcChannel, listener: IpcListener): () => void {
    return this.handle(channel, listener);
  }

  /** Get message log */
  getMessageLog(): IpcMessage[] { return [...this.messageLog]; }

  /** Clear message log */
  clearLog(): void { this.messageLog.length = 0; }

  /** Get pending requests count */
  getPendingCount(): number { return this.pendingRequests.size; }

  /** Cancel all pending requests */
  cancelAllPending(): void {
    for (const [, entry] of this.pendingRequests) {
      clearTimeout(entry.timer);
      entry.reject(new Error("Cancelled"));
    }
    this.pendingRequests.clear();
  }

  private emitLocal(channel: string, msg: IpcMessage & { requestId?: string }): void {
    // If this is a response, resolve pending
    if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
      const entry = this.pendingRequests.get(msg.requestId)!;
      clearTimeout(entry.timer);
      this.pendingRequests.delete(msg.requestId);
      entry.resolve(msg.payload);
    }
  }

  private logMessage(msg: IpcMessage): void {
    this.messageLog.push(msg);
    if (this.messageLog.length > this.maxLogSize) {
      this.messageLog.shift();
    }
  }

  destroy(): void {
    this.cancelAllPending();
    this.handlers.clear();
    this.onceHandlers.clear();
    this.messageLog.length = 0;
  }
}

// --- Window Manager ---

export class WindowManager {
  private windows = new Map<number, WindowInstance>();

  /** Create a new browser window */
  async create(options: WindowOptions = {}): Promise<WindowInstance> {
    const id = Date.now() + Math.random();
    const win: WindowInstance = {
      id,
      options: { width: 800, height: 600, show: true, ...options },
      state: "created",
      position: { x: options.x ?? -1, y: options.y ?? -1 },
      size: { width: options.width ?? 800, height: options.height ?? 600 },
      listeners: new Map(),
    };

    this.windows.set(id, win);
    return win;
  }

  /** Get window by ID */
  get(id: number): WindowInstance | undefined { return this.windows.get(id); }

  /** Get focused window */
  getFocused(): WindowInstance | undefined {
    for (const [, win] of this.windows) {
      if (win.state === "focused") return win;
    }
    return undefined;
  }

  /** Get all windows */
  getAll(): WindowInstance[] { return Array.from(this.windows.values()); }

  /** Close a window */
  async close(id: number): Promise<void> {
    const win = this.windows.get(id);
    if (win) {
      win.state = "closed";
      this.windows.delete(id);
    }
  }

  /** Close all windows */
  async closeAll(): Promise<void> {
    for (const [id] of this.windows) await this.close(id);
  }

  /** Focus a window */
  focus(id: number): void {
    const win = this.windows.get(id);
    if (win) win.state = "focused";
  }

  /** Minimize a window */
  minimize(id: number): void {
    const win = this.windows.get(id);
    if (win) win.state = "minimized";
  }

  /** Maximize a window */
  maximize(id: number): void {
    const win = this.windows.get(id);
    if (win) win.state = "maximized";
  }

  /** Restore a window from minimized/maximized */
  restore(id: number): void {
    const win = this.windows.get(id);
    if (win) win.state = "normal";
  }

  /** Set fullscreen */
  setFullscreen(id: number, fullscreen: boolean): void {
    const win = this.windows.get(id);
    if (win) win.isFullscreen = fullscreen;
  }

  /** Set window bounds */
  setBounds(id: number, bounds: { x?: number; y?: number; width?: number; height?: number }): void {
    const win = this.windows.get(id);
    if (win) {
      if (bounds.x !== undefined) win.position.x = bounds.x;
      if (bounds.y !== undefined) win.position.y = bounds.y;
      if (bounds.width !== undefined) win.size.width = bounds.width;
      if (bounds.height !== undefined) win.size.height = bounds.height;
    }
  }

  /** Center window on screen */
  center(id: number): void {
    const win = this.windows.get(id);
    if (win) {
      // Approximate screen center
      win.position.x = Math.round((screen?.width ?? 1920 - win.size.width) / 2);
      win.position.y = Math.round((screen?.height ?? 1080 - win.size.height) / 2);
    }
  }

  /** Set window title */
  setTitle(id: number, title: string): void {
    const win = this.windows.get(id);
    if (win) win.options.title = title;
  }

  /** Set progress bar (loading indicator in taskbar/dock) */
  setProgressBar(id: number, progress: number): void {
    const win = this.windows.get(id);
    if (win) win.progressBar = Math.max(-1, Math.min(1, progress));
  }

  /** Flash the window in taskbar to get attention */
  flashFrame(id: number): void {
    const win = this.windows.get(id);
    if (win) win.flashCount = (win.flashCount ?? 0) + 1;
  }

  /** Capture page as image */
  async capturePage(id: number): Promise<{ dataUrl: string; width: number; height: number }> {
    const win = this.windows.get(id);
    if (!win) throw new Error(`Window ${id} not found`);
    // Stub - would use webContents.capturePage() in real Electron
    return { dataUrl: "", width: win.size.width, height: win.size.height };
  }

  /** Open external URL in system browser */
  async openExternal(url: string): Promise<void> {
    // window.open(url, "_blank") or shell.openExternal
  }

  /** Show open dialog */
  async showOpenDialog(options?: FileDialogOptions): Promise<{ canceled: boolean; filePaths: string[] }> {
    // Stub - would use dialog.showOpenDialog
    return { canceled: true, filePaths: [] };
  }

  /** Show save dialog */
  async showSaveDialog(options?: FileDialogOptions): Promise<{ canceled: boolean; filePath?: string }> {
    return { canceled: true };
  }

  /** Show message box dialog */
  async showDialog(options: DialogOptions): Promise<{ response: number; checked?: boolean }> {
    // Stub - would use dialog.showMessageBox
    return { response: options.cancelId ?? -1 };
  }
}

interface WindowInstance {
  id: number;
  options: WindowOptions;
  state: "created" | "loading" | "ready" | "focused" | "blurred" | "minimized" | "maximized" | "fullscreen" | "closed" | "unresponsive";
  position: { x: number; y: number };
  size: { width: number; height: number };
  isFullscreen?: boolean;
  progressBar?: number;
  flashCount?: number;
  listeners: Map<string, Set<(...args: unknown[]) => void>>;
}

// --- System Tray ---

export class TrayManager {
  private items: TrayItem[] = [];
  private contextMenu: MenuItemOptions[] = [];

  /** Create a tray icon */
  create(options: TrayOptions): TrayItem {
    const item: TrayItem = { ...options, visible: true, destroyed: false };
    this.items.push(item);
    return item;
  }

  /** Set tray tooltip */
  setTooltip(tooltip: string): void {
    for (const item of this.items) item.tooltip = tooltip;
  }

  /** Set tray title (macOS) */
  setTitle(title: string): void {
    for (const item of this.items) item.title = title;
  }

  /** Set context menu (right-click menu) */
  setContextMenu(items: MenuItemOptions[]): void {
    this.contextMenu = items;
  }

  /** Display a balloon notification from tray */
  displayBalloon(options: NotificationOptions): void {
    console.log("[Tray] Balloon:", options.title, options.body);
  }

  /** Destroy tray */
  destroy(): void {
    for (const item of this.items) item.destroyed = true;
    this.items = [];
  }
}

interface TrayItem extends TrayOptions {
  visible: boolean;
  destroyed: boolean;
  tooltip?: string;
  title?: string;
  destroy(): void;
}

// --- Menu Builder ---

export class MenuBuilder {
  private items: MenuItemOptions[] = [];

  /** Add a menu item */
  addItem(options: MenuItemOptions): this {
    this.items.push(options);
    return this;
  }

  /** Add a separator */
  addSeparator(): this {
    this.items.push({ type: "separator" });
    return this;
  }

  /** Add a submenu */
  addSubmenu(label: string, items: MenuItemOptions[]): this {
    this.items.push({ label, type: "submenu", submenu: items });
    return this;
  }

  /** Build application menu */
  buildAppMenu(): MenuItemOptions[] {
    return [
      { label: "&File", submenu: [
        { label: "&New", accelerator: "CmdOrCtrl+N", click: () => {} },
        { label: "&Open...", accelerator: "CmdOrCtrl+O", click: () => {} },
        { type: "separator" },
        { label: "&Save", accelerator: "CmdOrCtrl+S", click: () => {} },
        { label: "Save &As...", accelerator: "CmdOrCtrl+Shift+S", click: () => {} },
        { type: "separator" },
        { role: "quit" },
      ]},
      { label: "&Edit", submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ]},
      { label: "&View", submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ]},
      { label: "&Window", submenu: [
        { role: "minimize" },
        { role: "close" },
      ]},
      { label: "&Help", submenu: [
        { role: "about" },
      ]},
    ];
  }

  /** Build context menu (right-click) */
  buildContextMenu(): MenuItemOptions[] {
    return this.items;
  }

  /** Build tray menu */
  buildTrayMenu(): MenuItemOptions[] {
    return this.items;
  }

  /** Parse accelerator string into components */
  parseAccelerator(acc: string): { key: string; modifiers: string[] } | null {
    if (!acc || acc === null) return null;
    const modifiers: string[] = [];
    let key = acc;

    const modMap: Record<string, string> = {
      "CmdOrCtrl": "CommandOrControl", "Cmd": "CommandOrControl",
      "Ctrl": "ControlOrCommand", "Control": "ControlOrCommand",
      "Alt": "Alt", "Option": "Alt",
      "Shift": "Shift", "Meta": "Meta", "Super": "Super",
    };

    for (const [short, full] of Object.entries(modMap)) {
      if (key.includes(short + "+") || key.startsWith(short + "+")) {
        modifiers.push(full);
        key = key.replace(short + "+", "");
      }
    }

    return { key: key.trim() || "", modifiers };
  }

  clear(): void { this.items = []; }
}

// --- Native Notifications ---

export class NativeNotificationManager {
  private notifications = new Map<string, NotificationInstance>();

  /** Show a native OS notification */
  show(options: NotificationOptions): string {
    const id = `notif-${Date.now()}`;
    const instance: NotificationInstance = { id, options, shownAt: Date.now(), clicked: false };
    this.notifications.set(id, instance);

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const n = new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        silent: options.silent,
        requireInteraction: options.timeoutType === "never",
        tag: id,
      });
      n.onclick = () => { instance.clicked = true; };
      n.onclose = () => this.notifications.delete(id);
    }

    return id;
  }

  /** Request notification permission */
  async requestPermission(): Promise<NotificationPermission> {
    if ("Notification" in window) return Notification.requestPermission();
    return "denied";
  }

  /** Check if notifications are supported */
  static isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window;
  }

  /** Get active notifications */
  getActive(): NotificationInstance[] {
    return Array.from(this.notifications.values()).filter((n) => !n.dismissed);
  }

  /** Dismiss a notification */
  dismiss(id: string): void {
    const n = this.notifications.get(id);
    if (n) { n.dismissed = true; this.notifications.delete(id); }
  }

  /** Dismiss all */
  dismissAll(): void {
    for (const [id] of this.notifications) this.dismiss(id);
  }
}

interface NotificationInstance {
  id: string;
  options: NotificationOptions;
  shownAt: number;
  clicked: boolean;
  dismissed?: boolean;
}

// --- Shell Utilities ---

export class ShellBridge {
  /** Open external link */
  async openExternal(path: string): Promise<void> {
    // shell.openExternal(path)
    window.open(path, "_blank", "noopener,noreferrer");
  }

  /** Open path in file explorer/finder */
  async openPath(path: string): Promise<void> {
    // shell.showItemInFolder(path)
  }

  ** Open item in its default application */
  async openItem(path: string): Promise<void> {
    // shell.openPath(path)
  }

  /** Move item to trash */
  async trashItem(path: string): Promise<void> {
    // shell.trashItem(path)
  }

  /** Read shortcut/alias target (Windows .lnk, macOS alias) */
  async readShortcutLink(path: string): Promise<{ target: string; args?: string } | null> {
    return null;
  }

  /** Write shortcut (Windows only) */
  async writeShortcutLink(options: { target: string; path: string; description?: string; args?: string; workingDirectory?: string; icon?: string }): Promise<void> {}

  /** Beep sound */
  beep(frequency = 1000, duration = 200): void {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration / 1000);
    } catch {}
  }
}

// --- Clipboard Bridge ---

export class ClipboardBridge {
  /** Write text to clipboard */
  async writeText(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
  }

  /** Read text from clipboard */
  async readText(): Promise<string> {
    return navigator.clipboard.readText();
  }

  /** Write HTML to clipboard */
  async writeHtml(html: string, plainText?: string): Promise<void> {
    // clipboard.write({ html, text: plainText })
  }

  /** Write RTF to clipboard */
  async writeRtf(rtf: string): Promise<void> {}

  /** Write image to clipboard */
  async writeImage(dataUrl: string): Promise<void> {
    // clipboard.writeImage(nativeImage.createFromDataURL(dataUrl))
  }

  /** Write bookmark/URL to clipboard (macOS) */
  async writeBookmark(title: string, url: string): Promise<void> {}

  /** Find text in clipboard */
  async findText(text: string): Promise<boolean> {
    const content = await this.readText();
    return content.includes(text);
  }

  /** Clear clipboard */
  async clear(): Promise<void> {
    // clipboard.clear()
  }

  /** Available formats */
  async availableFormats(): Promise<string[]> {
    return ["text/plain"];
  }
}

// --- Auto Updater ---

export class AutoUpdater {
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  private updateInfo: AutoUpdateInfo | null = null;
  private downloadProgress = { percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 };

  /** Check for updates */
  async checkForUpdates(): Promise<AutoUpdateInfo | null> {
    // Stub - would call autoUpdater.checkForUpdates()
    return this.updateInfo;
  }

  /** Download update */
  async downloadUpdate(): Promise<void> {
    // autoUpdater.downloadUpdate()
  }

  /** Quit and install update */
  quitAndInstall(): void {
    // autoUpdater.quitAndInstall()
  }

  /** Set feed URL */
  setFeedURL(url: string): void {
    // autoUpdater.setFeedURL(url)
  }

  /** Get update info */
  getUpdateInfo(): AutoUpdateInfo | null { return this.updateInfo; }

  /** Get download progress */
  getDownloadProgress(): typeof this.downloadProgress { return this.downloadProgress; }

  /** Event listeners */
  on(event: "update-available" | "update-not-available" | "update-downloaded" | "error" | "download-progress" | "checking-for-update", listener: (...args: unknown[]) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  /** Simulate update available (for testing) */
  simulateUpdateAvailable(info: Partial<AutoUpdateInfo>): void {
    this.updateInfo = { available: true, version: info.version ?? "1.0.1", ...info };
    for (const l of this.listeners.get("update-available") ?? []) l(this.updateInfo);
  }

  /** Simulate download progress */
  simulateDownloadProgress(percent: number): void {
    this.downloadProgress = { ...this.downloadProgress, percent };
    for (const l of this.listeners.get("download-progress") ?? {}) l(this.downloadProgress);
  }
}

// --- Deep Linking ---

export class DeepLinkHandler {
  private protocols = new Map<string, (url: URL) => void>();
  private history: URL[] = [];

  /** Register protocol handler */
  registerProtocol(protocol: string, handler: (url: URL) => void): void {
    this.protocols.set(protocol.toLowerCase(), handler);
  }

  /** Handle incoming deep link */
  handleDeepLink(url: string): boolean {
    try {
      const parsed = new URL(url);
      const handler = this.protocols.get(parsed.protocol.replace(":", ""));
      if (handler) {
        this.history.push(parsed);
        handler(parsed);
        return true;
      }
    } catch {}
    return false;
  }

  /** Get recent deep links */
  getHistory(limit = 50): URL[] {
    return this.history.slice(-limit);
  }

  /** Check if app is registered as default handler for protocol */
  static async isDefaultProtocolClient(protocol: string): Promise<boolean> {
    // app.isDefaultProtocolClient(protocol)
    return false;
  }

  /** Register as default protocol handler */
  static async setAsDefaultProtocolClient(protocol: string): Promise<boolean> {
    // app.setDefaultProtocolClient(protocol)
    return true;
  }
}

// --- System Info ---

export async function getSystemInfo(): Promise<SystemInfo> {
  const nav = navigator.userAgent.match(/Chrome\/(\S+)/);
  const platform = navigator.platform ?? "unknown";

  return {
    platform,
    arch: "x64",
    version: "1.0.0",
    electronVersion: "28.0.0",
    chromeVersion: nav?.[1] ?? "unknown",
    nodeVersion: "20.0.0",
    totalMemory: navigator.deviceMemory ? navigator.deviceMemory * 1024 * 1024 * 1024 : 8 * 1024 * 1024 * 1024,
    freeMemory: 0,
    cpus: [{ model: "Unknown", speed: 0 }],
    hostname: "localhost",
    username: "user",
    homeDir: "",
    appDataPath: "",
    tempDir: "",
    desktopPath: "",
    documentsPath: "",
    downloadsPath: "",
    musicPath: "",
    picturesPath: "",
    videosPath: "",
    isDevMode: true,
    isPackaged: false,
    appPath: location.origin,
    appName: "UI-as-Code",
    appVersion: "1.0.0",
  };
}

// --- Crash Reporting Bridge ---

export class CrashReporter {
  private enabled = false;
  private extraParams = new Map<string, string>();

  /** Initialize crash reporter */
  init(options: {
    companyName?: string;
    submitURL?: string;
    uploadToServer?: boolean;
    compress?: boolean;
    extra?: Record<string, string>;
    rateLimit?: string;
  }): void {
    this.enabled = options.uploadToServer ?? false;
    if (options.extra) {
      for (const [k, v] of Object.entries(options.extra)) this.extraParams.set(k, v);
    }
  }

  /** Report a custom exception */
  report(exception: Error, extra?: Record<string, string>): void {
    if (!this.enabled) return;
    const report = {
      message: exception.message,
      stack: exception.stack,
      name: exception.name,
      timestamp: Date.now(),
      url: location.href,
      userAgent: navigator.userAgent,
      extra: { ...Object.fromEntries(this.extraParams), ...extra },
    };
    console.error("[CrashReporter]", JSON.stringify(report, null, 2));
  }

  /** Get last crash report */
  getLastCrashReport(): Record<string, unknown> | null {
    return null;
  }

  /** Upload pending reports */
  async uploadPendingReports(): Promise<number> {
    return 0;
  }

  /** Add extra parameter */
  addExtraParameter(key: string, value: string): void {
    this.extraParams.set(key, value);
  }

  /** Remove extra parameter */
  removeExtraParameter(key: string): void {
    this.extraParams.delete(key);
  }

  /** Get upload URL */
  getUploadURL(): string | undefined { return undefined; }
}

// --- Power Monitor Bridge ---

export class PowerMonitor {
  private listeners = new Map<string, Set<() => void>>();

  on(event: "suspend" | "resume" | "lock-screen" | "unlock-screen" | "on-ac" | "on-battery", listener: () => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  /** Check if on battery power */
  isOnBatteryPower(): boolean {
    // In real Electron: powerMonitor.isOnBatteryPower()
    return true;
  }

  /** Get system idle time in seconds */
  getSystemIdleTime(): number {
    // powerMonitor.getSystemIdleTime()
    return 0;
  }

  /** Get system idle state */
  getSystemIdleState(threshold = 60): "active" | "idle" | "locked" | "unknown" {
    // powerMonitor.getSystemIdleState(threshold)
    return "active";
  }

  /** Prevent system from sleeping */
  preventSleep(id: string): void {
    // powerSaveBlocker.start('prevent-display-sleep')
  }

  /** Allow system to sleep again */
  allowSleep(id: string): void {
    // powerSaveBlocker.stop(id)
  }
}

// --- Screen / Display ---

export class ScreenManager {
  /** Get primary display */
  getPrimaryDisplay(): DisplayInfo {
    return {
      id: 1,
      bounds: { x: 0, y: 0, width: screen?.width ?? 1920, height: screen?.height ?? 1080 },
      workArea: { x: 0, y: 0, width: screen?.availWidth ?? 1920, height: screen?.availHeight ?? 1040 },
      scaleFactor: window.devicePixelRatio ?? 1,
      rotation: 0,
      isPrimary: true,
      touchSupport: navigator.maxTouchPoints > 0,
    };
  }

  /** Get all displays */
  getAllDisplays(): DisplayInfo[] {
    return [this.getPrimaryDisplay()];
  }

  /** Get display containing point */
  getDisplayNearestPoint(x: number, y: number): DisplayInfo {
    return this.getPrimaryDisplay();
  }

  /** Get cursor's current screen */
  getDisplayMatching(rect: { x: number; y: number; width: number; height: number }): DisplayInfo {
    return this.getPrimaryDisplay();
  }

  /** Turn display off (macOS) */
  turnOff(): void {}

  /** Listen for display changes */
  onDisplayAdded(callback: (display: DisplayInfo) => void): () => void { return () => {}; }
  onDisplayRemoved(callback: (display: DisplayInfo) => void): () => void { return () => {}; }
  onDisplayMetricsChanged(callback: (display: DisplayInfo, changedMetrics: string[]) => void): () => void { return () => {}; }
}

interface DisplayInfo {
  id: number;
  bounds: Rectangle;
  workArea: Rectangle;
  scaleFactor: number;
  rotation: number;
  isPrimary: boolean;
  touchSupport: boolean;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}
