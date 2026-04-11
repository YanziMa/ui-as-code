/**
 * Central exports for @/lib.
 */

// Core utilities
export {
  formatRelativeTime,
  truncate,
  shortId,
  debounce,
  cn,
  isBrowser,
  isServer,
  getBaseUrl,
  pluralize,
} from "./utils";

export {
  isValidEmail,
  isValidUrl,
  isValidUuid,
  sanitizeHtml,
  isBlank,
  clamp,
  slugify,
} from "./validators";

export {
  formatNumber,
  formatBytes,
  formatDuration,
  formatDate,
  formatPercent,
} from "./formatters";

export { generateUuid, randomString, hashString } from "./crypto";
export { env, envNumber, envBool, requireEnv } from "./env";

// App-specific
export * from "./constants";
export * from "./error-logger";
export * from "./performance";
export * from "./api-middleware";
export * from "./validation";
export * from "./api-logger";
export * from "./notifications";

// Data utilities
export { isToday, isYesterday, startOfDay, endOfDay, timeAgoLabel, toISODate } from "./date";
export { chunk, unique, groupBy, sortBy, flatten, times } from "./array";
export { createId } from "./id";
export {
  capitalize,
  toTitleCase,
  camelToKebab,
  kebabToCamel,
  truncateMiddle,
  maskEmail,
  maskString,
  isJsonString,
  repeat,
  stripHtml,
} from "./string";
export {
  round,
  clamp as numClamp,
  lerp,
  mapRange,
  formatBytes as formatBytesNum,
  formatCompact,
  percentOf,
  randomInt,
  approximately,
  parseNumber,
} from "./number";
export {
  deepClone,
  pick,
  omit,
  isEmpty as isObjEmpty,
  get,
  set as setPath,
  deepMerge,
  deepFreeze,
} from "./object";
export {
  stringToColor,
  generatePalette,
  hslToHex,
  lighten,
  darken,
  getContrastColor,
  lerpColor,
  STATUS_COLORS,
  type StatusColor,
} from "./color";

// Security
export {
  generateNonce,
  isBot,
  rateLimit,
  cleanupRateLimits,
  isAllowedOrigin,
  sanitizeFilename,
} from "./security";

// Browser utilities
export {
  qs, qsa, createElement,
  on as onEvent, domReady, isVisible, getStyle, scrollIntoView,
  copyToClipboard, downloadFile,
} from "./dom";
export {
  parseQueryString, buildQueryString, fetchWithTimeout, isOnline,
  getConnectionType, parseContentRange, buildUrl,
} from "./network";
export {
  SHORTCUTS, formatShortcut, matchesShortcut, getShortcutsByCategory,
  type Shortcut,
} from "./keyboard";
export {
  isValidUrl as urlIsValid, getDomain, getPathname, getQueryParams,
  isAbsoluteUrl, isSameOrigin, joinPath, resolveUrl, stripQueryAndHash, getUrlExtension,
} from "./url";
export { Timer, debounce as timedDebounce, throttle, delay, retry, withTimeout } from "./timer";
export { mdToHtml, stripMd } from "./markdown";
export {
  mean, median, stddev, percentile, linearRegression,
  sum, minmax, normalize, movingAverage, ema,
} from "./math";
export {
  globToRegex, isGlobMatch, wildcardMatch, levenshtein,
  fuzzyScore, findBestMatch, camelToWords, kebabToWords, snakeToWords,
} from "./pattern";
export {
  detectBrowser, supports, getViewport, isTouchDevice,
  prefersReducedMotion, prefersDarkMode, getColorGamut,
  type BrowserInfo,
} from "./browser";
export {
  cssVar, setCssVar, breakpoint, BREAKPOINTS,
  hexToRgb, rgbToHex, parseColor, mixColors, transparentize,
} from "./css";
export { AsyncQueue, RateLimiter, BatchingQueue } from "./queue";
export {
  distance, distanceSquared, midpoint, angle,
  degToRad, radToDeg, pointInRect, rectCenter, rectsIntersect,
  rectIntersection, boundingRect, scaleRect, clampPoint, aspectRatio, fitSize,
  type Point, type Rect, type Size,
} from "./geometry";
export {
  base64Encode, base64Decode, safeEncode, safeDecode,
  unicodeEscape, unicodeUnescape, encodeQuery,
  xorCipher, xorDecipher, simpleHash,
} from "./encoding";
export {
  isValidIP, isValidIPv6, isValidMac, isValidHexColor, isValidDate,
  isValidPort, isValidHostname, isJsonObject, validateAll, and, or as orValidator,
} from "./validation-helpers";
export { FiniteStateMachine, createToggle, type FSMState, type FSMTransition, type FSMConfig } from "./fsm";
export {
  toMap, toSet, uniqueBy, partition, groupBy, countBy,
  findFirst, findLast, all, any,
  intersection, difference, deepFlatten, zip, rotateLeft, sample, sampleMany,
} from "./collection";
export {
  progressBarAttrs, switchAttrs, liveRegion, announce,
  SKIP_LINK_ID, skipLinkAttrs, prefersReducedMotion, animationDuration,
  focusTrap, srOnly, ROLES,
} from "./accessibility";
export {
  getExtension, getBasename, getDirname, joinPath,
  normalizePath, isAbsolute, isUrlPath, relativePath,
} from "./file";
export {
  isDev, isProd, isTest, getEnv, isFeatureEnabled,
  requireEnv, getEnv, getEnvNumber, getEnvBool,
  isVercel, isServerless, getDeploymentInfo,
} from "./env-detection";
export { Observable, Computed, ReactiveStore } from "./observable";
export {
  Logger, log, apiLog, dbLog, extLog,
  setGlobalLogLevel, getGlobalLogLevel,
  type LogLevel, type LogEntry,
} from "./logger";
export { Cache, defaultCache, memoize, type CacheOptions } from "./cache";
export {
  searchText, searchArray, highlightMatches, SearchIndex,
  type SearchOptions, type SearchResult, type SearchMatch,
} from "./search";
export {
  calculateVisibleItems, DynamicVirtualizer,
  calculateGridCells, type VirtualItem, type VirtualizerOptions,
  type GridVirtualizerOptions, type GridVirtualizerResult,
} from "./virtualization";
export {
  sortByKey, multiSort, stableSort, naturalSort, createSorter,
  type SortDirection, type SortRule,
} from "./sort";
export {
  LOCALES, getPluralForm, formatLocaleNumber, formatCurrency,
  formatRelativeTimeLocale, formatList, detectLocale,
  TranslationDict, type LocaleConfig, type LocaleCode, type PluralRule,
} from "./i18n-utils";
export {
  animateValue, springAnimate, cssKeyframes, KEYFRAMES, DURATION, transition,
  EASING, type EasingName, type SpringConfig,
} from "./animation";
export { validate, validateField, createValidator, type SchemaRule, type FieldSchema, type ValidationResult } from "./schema";
export {
  UndoableStore, EventBus, globalEvents,
  type HistoryState,
} from "./state";
export {
  formatFileSize, formatDurationHuman, formatOrdinal, formatListNatural,
  truncateId, formatChange, formatRatio, formatPhone, maskCardNumber,
  formatAddress, formatVersion, formatDiffStats, type Address,
} from "./formatters-advanced";
export {
  parseUnifiedDiff, textDiff, getDiffStats,
  type DiffHunk, type DiffLine, type FileDiff,
} from "./diff-utils";
export {
  hasPermission, hasRoleLevel, getPermissions, ACL, appACL, type Role, type Permission,
} from "./permission";
export { renderTemplate, parseConditionalBlocks, Template, type TemplateBlock } from "./template";
export { parseCsv, generateCsv, csvToHtmlTable, type CsvOptions } from "./csv";
export {
  SlidingWindowRateLimiter, TokenBucketRateLimiter, FixedWindowRateLimiter,
  type RateLimitResult,
} from "./rate-limiter";
export {
  IdempotencyStore, generateIdempotencyKey, extractIdempotencyKey,
  type IdempotencyEntry,
} from "./idempotency";
export {
  retryWithBackoff, CircuitBreaker, type RetryOptions, type CircuitBreakerOptions,
} from "./retry";
export { gql, parseGqlOperation, extractVariables, extractFields, executeGql, fragment } from "./graphql";
export {
  FeatureFlagStore, DEFAULT_FLAGS, featureFlags, isFeatureEnabled,
  type FeatureFlag, type FlagContext,
} from "./feature-flags";
export {
  runPipeline, parallel, waterfall, raceWithCleanup,
  type PipelineStep, type PipelineContext, type PipelineResult,
} from "./waterfall";
export {
  toTitleCase, toSentenceCase, toKebabCase, toSnakeCase, toCamelCase, toPascalCase,
  truncateText, wordWrap, removeWhitespace, normalizeWhitespace, reverseString,
  countWords, countChars, estimateReadingTime, getInitials, slugifyText,
  stripAnsiCodes, isHtml, stripHtmlTags, padText, repeatText,
} from "./text-processing";
export {
  mapValues, groupAndAggregate, pivot, unpivot, flattenObject, unflattenObject, deepMergeCustom,
  type PivotOptions,
} from "./transform";
export {
  secureRandomString, cryptoUuid, fastHash, sha256, sha512, hmacSha256, verifyHmacSha256,
  encodeSimpleToken, decodeSimpleToken, type TokenPayload,
} from "./crypto-advanced";
export {
  valid, invalid, required, minLength, maxLength, range, pattern, emailValidator, urlValidator,
  oneOf, allOf, anyOf, not, when, validateObject,
  type Validator, type ValidationResult, type FieldValidators,
} from "./validation-advanced";
export {
  Scheduler, parseCronExpression, cronMatches, getNextCronRun,
  type ScheduledJob, type CronExpression,
} from "./scheduler";
export {
  MessageBroker, subscribePattern, type Message, type MessageContext,
  type MessageHandler, type SubscriptionOptions,
} from "./pubsub";
export {
  createInlineWorker, runInWorker, TaskQueue, BatchingProcessor,
  requestIdleCallback, cancelIdleCallback,
} from "./worker";
export {
  getComputedStyleValue, getElementRect, isInViewport, getVisibilityPercent,
  scrollIntoViewCentered, measureText, closestAncestor, getAncestors,
  insertAfter, replaceElement, containsOrIs, getFocusableElements, createFocusTrap,
} from "./dom-utils";
export {
  clampNumber, lerpNumber, mapRangeNumber, roundTo, roundToMultiple,
  floorToMultiple, ceilToMultiple, formatBytesAuto, formatCompactNumber,
  formatWithSeparators, percentChange, approximatelyEqual, randomIntInRange,
  randomFloatInRange, normalizeAngleDeg, normalizeAngleRad, degToRad, radToDeg,
  gcd, lcm, isInRange, wrapNumber,
} from "./number-utils";
export {
  chunkArray, splitAt, partitionArray, slidingWindow, groupConsecutive,
  deepFlatten, uniqueBy, intersectArrays, differenceArrays, symmetricDifference,
  rotateArray, sampleArray, shuffleArray, zipArrays, fillArray,
  argMin, argMax,
} from "./array-utils";
export {
  isBlank, isPresent, collapseWhitespace, stripDiacritics, escapeRegex,
  escapeHtmlEntities, unescapeHtmlEntities, toCamelCaseString, toPascalCaseString,
  toKebabCaseString, toSnakeCaseString, capitalizeWords, smartTruncate,
  repeatWithSeparator, centerPad, isAscii, looksLikeEmail, looksLikeUrl,
  extractNumbers, replaceMultiple, stringToId, countOccurrences, reverseWords, trimLines,
} from "./string-utils";
export {
  createTreeNode, buildTree, flattenTree, flattenTreeWithDepth,
  findNodeById, findNodes, getPathToNode, getTreeDepth, countNodes,
  mapTree, filterTree, type TreeNode,
} from "./tree";
export { Graph, type GraphNode, type GraphEdge } from "./graph";
export {
  getConsentState, saveConsent, isCategoryAllowed, acceptAllCookies,
  rejectNonEssentialCookies, resetConsent, hasConsented, getConsentHeader,
  type CookiePreferences, type ConsentState, type CookieCategory,
} from "./cookie-consent";
export {
  announce, setFocus, focusFirst, focusLast, createA11yFocusTrap,
  prefersReducedMotion, prefersHighContrast, generateAriaId, aria,
  SKIP_LINK_DEFAULTS,
} from "./a11y";
export {
  parseUrl, buildUrlFromParts, updateSearchParams, removeSearchParams,
  getQueryParams, isSameOrigin, normalizeUrl, isAbsoluteUrl,
  makeAbsoluteUrl, getDomainFromUrl, getPathnameFromUrl,
  joinPathSegments, encodeUriComponentSafe, decodeUriComponentSafe, urlsEqual,
  type ParsedUrl,
} from "./url-utils";
export {
  createCustomEvent, dispatchCustomEvent, onCustomEvent, throttleEvent,
  debounceEvent, once, waitForEvent, delegateEvent,
  preventDefault, stopPropagation, stopEvent,
} from "./event-utils";
export {
  cssVar, setCssVar, getCssVar, cssTransition, EASING_CSS, BREAKPOINTS,
  mediaQuery, matchesMedia, isAtLeast, isBelow,
  hexToRgb, rgbToHex, parseColor, mixColors, transparentize,
  lightenColor, darkenColor,
} from "./css-utils";
export {
  getImageDimensions, generateSrcSet, generateSizes, getAspectRatio,
  fitToContainer, generateBlurPlaceholder, isValidImageUrl,
  getDominantColor, fileToDataUrl, resizeImage,
} from "./image";
export {
  parseMarkdown, renderMdToHtml, mdToHtml, stripMarkdown,
  type MdNode,
} from "./markdown-advanced";
export {
  detectBrowser, supportsFeature, getViewportSize, getDevicePixelRatio,
  isDarkMode, isLightMode, onColorSchemeChange, isPageVisible,
  onVisibilityChange, getConnectionInfo, isSlowConnection, getMemoryInfo,
  type BrowserInfo,
} from "./browser-utils";
export {
  createFormState, setFieldValue, setFormValues, touchField, touchAllFields,
  resetForm, getFormData, hasErrors, getFormErrors, setSubmitting,
  type FormField, type FormState, type FieldValidator,
} from "./form-state";
export {
  httpRequest, http, retryHttp, setBaseUrl, getBaseUrl,
  type HttpRequestConfig, type HttpResponse, type HttpError,
} from "./http";
export {
  now, nowSeconds, delay, measureTime, toISOString, parseISODate,
  isToday, isYesterday, isWithinLastDays, timeAgo,
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths, diffDays, diffHours, isSameDay,
  formatDateLocale, formatTimeLocale, getTimezoneOffset,
} from "./time";
export {
  base64Encode, base64Decode, base64UrlEncode, base64UrlDecode,
  dataUriEncode, dataUriDecode, isValidBase64, base64EncodeObject, base64DecodeObject,
} from "./base64";
export {
  debounce as advancedDebounce, throttle as advancedThrottle,
  raf, cancelRaf, rafLoop, setIntervalRaf,
  type DebounceOptions, type ThrottleOptions,
} from "./debounce-advanced";
export {
  uuidv4, uuidv4Compact, NIL_UUID, isValidUuid,
  shortId, nanoid, cuid, cuidWithLength, ulid, parseUlid, sortedId,
} from "./ids";
export {
  LogLevel, LEVEL_NAMES, LEVEL_COLORS, LogEntry,
  formatLogEntry, formatJsonLogEntry, parseLogLine,
  createConsoleLogger, type ConsoleLoggerOptions,
} from "./log-formatter";
export {
  escapeRegexString, testRegex, extractMatches, replaceAll, splitByRegex,
  isValidEmailRegex, isValidUrlRegex, isValidHexColor, isValidRgbColor,
  globToRegex, isGlobMatch, filterGlob, createRegex,
  wordBoundary, digitPattern, whitespacePattern, newlinePattern,
  extractWords, extractNumbersRegex, countPattern, removeDiacritics, wildcardMatch,
} from "./regex";
export { MetricsCollector, type MetricsConfig, type MetricSnapshot } from "./metrics";
export {
  localeNames, localeFlags, getLocaleInfo, getLocaleByCode,
  formatNumberLocale, formatDateLocaleAdvanced, formatRelativeTimeAdvanced,
  getWeekStartDay, isRTL, getDirection, getTimezoneList,
  type LocaleInfo, type LocaleCode,
} from "./locale";
export {
  LocalStorage, SessionStorage, MemoryStorage, IndexedDBStore,
  setCookie, getCookie, removeCookie,
} from "./storage";
export {
  createProgressTracker, createMultiProgressTracker, createStepProgress,
  formatProgress, type ProgressState, type ProgressController,
  type MultiProgressController, type StepProgressController,
} from "./progress";
export {
  copyToClipboard, copyRichToClipboard, readFromClipboard, readRichFromClipboard,
  isClipboardAvailable, canReadClipboard, watchClipboard,
  type ClipboardData, type ClipboardOptions,
} from "./clipboard";
export {
  MIME_MAP, getMimeType, getExtension, isImageMime, isVideoMime, isAudioMime,
  isTextMime, isDocumentMime, isArchiveMime, getMimeCategory, getMimeCategoryLabel,
  parseContentType, buildContentType, detectMimeTypeFromBytes,
  type MimeCategory,
} from "./mime";
export {
  parseSemVer, formatSemVer, compareSemVer, satisfies, incrementVersion,
  versionDistance, sortVersions, getLatestVersion, isValidSemVer,
  extractVersions, isPrerelease, coerce,
  type SemVer,
} from "./semver";
export { generateQrSvg, generateQrDataUri, generateQrCanvas, validateQrInput } from "./qr-code";
export {
  hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, parseColor,
  getLuminance, getContrastRatio, getWcagLevel, getContrastingText,
  complementary, analogous, triadic, splitComplementary, tetradic, monochromatic,
  generatePaletteAdvanced, getColorTemperature, blendColors,
  lightenColor, darkenColor, saturateColor, desaturateColor, invertColor, withOpacity,
  type RgbColor, type HslColor, type Palette,
} from "./color-picker";
export {
  HotkeyManager, parseKeyCombo, eventMatchesCombo, formatKeyDisplay,
  createAppHotkeys, areModifiersDown, getModifierString,
  type HotkeyBinding, type HotkeyEvent, type HotkeyListener, type ParsedKeyCombo,
} from "./hotkeys";
export {
  WebhookSignatureVerifier, WebhookParser, WebhookRouter,
  GitHubWebhookParser, StripeWebhookParser,
  isWebhookRequest, getWebhookSource,
} from "./webhook";
export {
  createTableState, getSortedData, getFilteredData, getPaginatedData,
  getCellValue, applyFilterOperator, toggleSort, setSearchTerm, toggleFilter,
  goToPage, setPageSize, toggleRowSelection, toggleSelectAll, toggleRowExpand,
  resetTable, exportTableAsCsv,
  type Column, type TableState, type SortState, type FilterState,
  type FilterOperator, type PaginationState, type SelectionState,
} from "./table";
export {
  NotificationManager, getNotificationManager, toast,
  type Notification, type NotificationType, type NotificationOptions,
  type NotificationPosition,
} from "./notification";
export {
  createDropZone, readFileAsText, readFileAsDataURL, readFileAsArrayBuffer,
  getFileInfo, createSortableList,
  type DragItem, type DropZoneConfig, type DndState, type DropZoneController,
  type SortableItem, type SortableConfig, type SortableController, type FileInfo,
} from "./drag-drop";
export { PdfBuilder, type PdfOptions, type PdfTextOptions } from "./pdf";
export {
  I18nProvider, useI18n, useTranslation, useFormattedDate,
  useFormattedNumber, useRelativeTime, LocaleSwitcher, Trans, RtlWrapper,
  type I18nConfig, type I18nContextValue,
} from "./i18n-react";
export {
  OAuthClient, OAuthConfig, OAuthToken,
  generatePkceChallenge, verifyPkceChallenge,
  generateState, validateState, storeState, retrieveState,
  saveTokens, getTokens, clearTokens, isTokenExpired, getAccessToken,
  hasScope, hasAnyScope, normalizeScopes,
  googleProvider, githubProvider, microsoftProvider, discordProvider,
  parseCallbackUrl, buildLogoutUrl,
} from "./oauth";
export {
  createVirtualScroll, VirtualScrollController, type VirtualScrollOptions,
  type VirtualScrollItem, type VirtualScrollState,
  createVirtualGrid, VirtualGridController, type VirtualGridOptions, type VirtualGridState,
} from "./virtual-scroll";
export {
  FormValidator, required, minLength, maxLength, pattern, email, urlValidator,
  range, matchesField, asyncValidator, custom,
  type FieldConfig, type FieldValidationResult, type FormValidationResult,
  type ValidatorFn, type FormValidatorOptions,
} from "./form-validator";
export {
  ThemeManager, getThemeManager, useTheme, LIGHT_THEME, DARK_THEME, BUILT_IN_THEMES,
  type ThemeConfig, type ThemeColors,
} from "./theme";
export {
  calculateAxisScale, formatAxisLabel, valueToPixel, pixelToValue,
  aggregateByInterval, movingAverage, calculatePercentChanges, findExtrema,
  generateChartColors, interpolateColor, getDataStats,
  type DataPoint, type DataSeries, type ChartConfig, type AxisScale,
  type DataStats, type ColorPaletteName,
} from "./chart-utils";
export {
  TokenType, tokenize, tokenizeCode, getTokenFrequency, getTopTokens,
  getVocabulary, lexicalDiversity, findTokenPattern, tokensToString,
  type Token, type CodeToken,
} from "./tokenizer";
export {
  AuditLog, auditWrap, maskSensitiveData, AuditLogExporter,
  type AuditEvent, type AuditLogOptions, type AuditQueryFilters, type AuditStats,
} from "./audit-log";
export {
  makeResizable, createSplitPane,
  type ResizeOptions, type ResizeState, type ResizableController,
  type SplitPaneOptions, type SplitPaneController,
} from "./resizable";
export {
  OverlayProvider, openModal, openDrawer, openConfirm, openAlert, closeAllOverlays,
  type OverlayType, type OverlayOptions, type OverlayInstance,
} from "./overlay";
export {
  UndoHistory, type UndoItem, type UndoBranch, type UndoHistoryOptions,
  type UndoState, type UndoChangeListener,
} from "./undo-redo";
export {
  generatePassword, generatePassphrase, checkPasswordStrength,
  isCommonPassword, hashPasswordSimple, maskPassword,
  type PasswordGeneratorOptions, type PasswordStrengthResult,
} from "./password";
export {
  AiPipeline, CostTracker, SemanticCache, AiError,
  createPromptTemplate, diffGenerationPrompt, codeReviewPrompt, summarizePrompt,
  type AiPipelineConfig, type AiMessage, type ContentBlock, type ToolDefinition,
  type SendOptions, type AiResponse, type StreamChunk,
} from "./ai-pipeline";
export {
  getCurrentLocation, watchLocation, calculateDistance, isWithinRadius,
  midpoint, toDMS, formatCoordinates,
  getTimezoneInfo, getCommonTimezones, convertTime, formatDateInTimezone,
  type Coordinates, type LocationInfo, type DistanceResult, type TimezoneInfo,
} from "./location";
export {
  levenshtein, damerauLevenshtein, jaroWinkler, cosineSimilarity,
  sorensenDice, fuzzySearch, findBestMatch, approximatelyEqual, suggestSpelling,
  type FuzzySearchOptions, type FuzzySearchResult,
} from "./fuzzy";
export {
  MarkdownRenderer, renderMarkdownToText,
  type MarkdownRendererProps, type MarkdownComponents,
} from "./markdown-components";
export {
  isValidEmail, validateEmailDetailed, isDisposableEmail, isBusinessEmail,
  normalizeEmail, parseEmailAddress, parseEmailList, extractEmails, getDomain,
  formatEmailAddress, maskEmail, obfuscateEmail, generateGravatarUrl,
  renderEmailTemplate, inlineCss, generateReplyToHeader, createUnsubscribeUrl,
  generateEmailHeaders, buildMailtoLink,
  type EmailValidationResult,
} from "./email";
export {
  parseCsv, generateCsv, csvToHtmlTable, csvToMarkdown,
  inferCsvSchema, validateCsvAgainstSchema, transformCsv, filterCsv, sortCsv,
  aggregateCsv, downloadCsv,
  type CsvParseOptions, type CsvRow, type CsvWriteOptions, type CsvSchemaField,
} from "./csv-advanced";
export {
  isFileSystemAccessSupported, openFilePicker, openDirectoryPicker,
  readFileAsText, readFileAsBuffer, readFileAsDataUrl, saveFile,
  listDirectory, getFileExtension, guessMimeType, formatFileSize,
  formatLastModified, matchesPattern,
  type FileSystemEntry, type FileSystemOptions,
} from "./filesystem";
export {
  WebSocketManager, WsRoomManager,
  isWebSocketSupported, getWebSocketUrl, createWebSocketUrl, parseWsUrl,
  type WebSocketOptions, type WsEvent, type WsEventHandler,
  type WebSocketState, type WebSocketStats,
} from "./websocket";
export {
  StateMachine, createToggle, createLoadingMachine, createWizardMachine,
  type MachineConfig, type StateConfig, type TransitionConfig,
  type MachineState, type StateChangeListener, type TransitionResult,
  type StateId, type EventId,
} from "./state-machine";
export {
  BinaryHeap, PriorityQueue, RateLimitedQueue, RingBuffer,
  type PriorityQueueItem, type PriorityQueueOptions,
  type RateLimitedQueueOptions,
} from "./priority-queue";
export {
  HotkeyManager, parseKeyCombo, eventMatchesCombo, formatKeyDisplay,
  createAppHotkeys, areModifiersDown, getModifierString,
  type HotkeyBinding, type ParsedKeyCombo,
} from "./hotkeys-v2";
export {
  hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, parseColor,
  getLuminance, getContrastRatio, getWcagLevel, getContrastingText,
  complementary, analogous, triadic, splitComplementary, tetradic, monochromatic,
  generatePaletteAdvanced, blendColors, lighten, darken, saturate, desaturate,
  invertColor, withOpacity,
  type RgbColor, type HslColor, type Palette,
} from "./color-picker";
export {
  ThemeManager, getThemeManager, useTheme, LIGHT_THEME, DARK_THEME, BUILT_IN_THEMES,
  type ThemeConfig, type ThemeColors,
} from "./theme-v2";
export {
  normalizePointerEvent, pointDistance, midpoint, angleBetween, rotatePoint, lerpPoint,
  createGestureRecognizer,
  TouchTracker,
  type Point, type PointerEvent, type GestureConfig, type SwipeGesture,
  type PinchGesture, type RotationGesture, type GestureHandler, type GestureController,
  type TouchChange,
} from "./pointer";
export {
  parseUrl, buildUrl, getQueryParams, buildQueryString, setQueryParam, removeQueryParam,
  isSameOrigin, isAbsoluteUrl, resolveUrl, getDomain, getPathname, getHash,
  isHttps, isDataUri, encodeUriComponent, decodeUriComponent, joinPath, normalizePath,
  getUrlExtension, stripQueryAndHash, urlsEqual, parseMailtoLink, buildMailtoLink,
  isValidUrl, sanitizeUrl,
  type ParsedUrl, type UrlParts,
} from "./url-builder";
export {
  CanvasDrawEngine, BrushEngine, ShapeEngine, TextEngine, EraserEngine,
  LayerManager, HistoryManager, ExportManager, ColorPickerUI, ToolPaletteUI,
  createDrawingApp,
  type DrawOptions, type Point2D, type Rect, type BrushSettings, type ShapeSettings,
  type TextSettings, type Layer, type HistoryEntry, type ExportOptions,
  type DrawingTool, type ColorStop, type ToolConfig, type DrawingAppState,
} from "./canvas-draw";
export {
  getImageDimensions, loadImage, imageToCanvas, resizeImage, cropImage, applyFilters,
  convertFormat, generateThumbnail, compressImage, getDominantColor, getAverageColor,
  createCollage, addWatermark, detectOrientation, getAspectRatio,
  fileToDataUrl, fileToArrayBuffer, downloadImage, formatFileSize, isValidImageType,
  getExifOrientation,
  type ImageDimensions, type ImageProcessingOptions, type CropRegion, type FilterOptions,
} from "./image-utils";
export {
  getNetworkStatus, onNetworkChange, isSlowConnection, isDataSaverEnabled,
  fetchWithRetry, RequestQueue, syncWhenOnline, processOfflineQueue,
  BandwidthEstimator, ConnectionHealthChecker,
  type NetworkStatus, type RetryOptions, type RequestQueueItem,
} from "./network-utils";
export {
  detectTextRegion, preprocessForOCR, analyzeTextLayout, extractTextFromPDF,
  calculateAccuracy,
  type OCRResult, type OCRWord, type OCRLine, type BoundingBox, type OCREngineConfig,
} from "./ocr-utils";
export {
  getCurrentPosition, watchPosition, haversineDistance, pathDistance, midpointCoords,
  isInBoundingBox, createBoundingBox, GeofenceManager, formatCoordinates, formatDistance,
  generateMapLink, calculateSpeed, isStationary, getTimezoneForLocation,
  type Coordinates, type LocationInfo, type Geofence, type BoundingBox as GeoBoundingBox, type DistanceResult,
} from "./geolocation-utils";
export {
  printContent, printElement, printPreview, generateReceiptText, generateLabel,
  injectPrintStyles, PRINT_STYLES, getPrintableArea, estimatePageCount, paginateContent, generatePDF,
  type PrintOptions, type PageSettings,
} from "./print-utils";
export {
  // Audio context management
  AudioContextManager, AudioAnalyzer, AudioRecorder, AudioEffectsChain,
  AudioVisualization, AudioPlayer, VolumeMeter,
  // Utilities
  formatAudioTime, dbToLinear, linearToDb, frequencyToNote, noteToFrequency,
  generateTone, generateNoise, applyFadeInOut,
  type AudioAnalysisData, type FrequencyBand, type RecordingState, type EffectSettings,
  type VisualizationData, type PlaybackOptions,
} from "./audio-utils";
export {
  encryptAES, decryptAES, generateAESKey, encryptRSA, decryptRSA, generateRSAKeyPair,
  hashSHA256, hashSHA384, hashSHA512, hmacSHA256, deriveKeyPBKDF2,
  randomBytes, randomUUID, randomString, randomIntInRange,
  base64Encode, base64Decode, hexEncode, hexDecode, utf8ToArrayBuffer, arrayBufferToUtf8,
  signECDSA, verifyECDSA, createToken, verifyToken, KeyManager,
  type EncryptedData, type RSAKeyPair, type HashAlgorithm, type TokenPayload,
} from "./encryption";
export {
  parseMarkdown, renderToHtml, mdToHtml, extractToc, countWords, estimateReadingTime,
  type MarkdownNode, type MarkdownNodeType, type ParseOptions, type RenderOptions,
} from "./markdown-parser";
export {
  createFocusTrap, setupFocusVisible, focusElement, setAria, announce, createLiveRegion,
  prefersReducedMotion, onReducedMotionChange, getSafeDuration,
  relativeLuminance, contrastRatio, wcagCompliance,
  createRovingTabIndex, createSkipLink, createAccessibleDialog,
  type RovingIndexOptions, type DialogOptions,
} from "./a11y-v2";
export {
  SearchEngine, createSearchEngine, jaroWinkler, similarity,
  type SearchDocument, type SearchResult, type SearchOptions, type FacetResult,
} from "./search-engine";
export {
  WebSocketManager, TypedWebSocket, RoomManager, PresenceSystem,
  RateLimiter, ConnectionPool, WebSocketStats,
  type WSMessage, type WSConfig, type RoomConfig, type PresenceEvent,
  type AckRequest, type ConnectionInfo,
} from "./websocket-utils";
export {
  generateWebsiteSchema, generateArticleSchema, generateBreadcrumbSchema,
  generateOrganizationSchema, generateFaqSchema, generateSoftwareSchema,
  generateOpenGraph, generateTwitterCard, generateRssFeed, generateSitemap,
  generateSitemapIndex, generateRobotsTxt, generateManifest,
  injectStructuredData, removeStructuredData,
  type JsonLdContext, type OpenGraphData, type TwitterCardData,
  type RssItem, type RssFeedOptions, type SitemapEntry, type WebAppManifest,
} from "./structured-data";
export {
  easings, getEasing, springAnimate, AnimationTimeline,
  createScrollAnimation, staggerElements, animateCounter, createParallax,
  type EasingFunction, type SpringConfig, type SpringState,
  type Keyframe, type AnimationTrack, type ScrollAnimationConfig,
} from "./animation-engine";
export {
  I18nEngine, detectBrowserLocale, loadLocale, defineMessages,
  getPluralRule,
  type LocaleConfig, type I18nMessage, type I18nOptions, type PluralRule,
} from "./i18n-engine";
export {
  FormBuilder, createForm, validations,
  type FormSchema, type FormField, type FormSection, type FormState,
  type FieldValidation, type FieldError, type SelectOption, type FieldType,
} from "./form-builder";
export {
  toCsv, parseCsv, downloadCsv, copyCsvToClipboard, streamParseCsv, templateCsv,
  isValidCsvFormat, getCsvStats,
  type CsvOptions, type ParseOptions, type ParsedCsv, type StreamParseOptions,
} from "./csv-export";
export {
  AnalyticsEngine, EventTracker, PageViewTracker, PerformanceMonitor,
  FunnelTracker, CohortAnalyzer, SessionManager, ErrorTracker,
  UserProperties, ABTestTracker, DataExporter, PrivacyControls,
  generateMockAnalytics,
  type AnalyticsEvent, type WebVitals, type FunnelStep, type CohortData,
  type SessionData, type ErrorEvent, type MockDashboardData,
} from "./analytics-utils";
export {
  VNode, VirtualDOM, DiffEngine, PatchOp, Reconciler, EventDelegator,
  Scheduler, ComponentLifecycle, Memo, ContextProvider, ErrorBoundary,
  createVNode, h, fragment, render, hydrate, mount,
  type VNodeProps, type PatchType, type FiberNode, type WorkPriority,
  type ComponentHooks, type DevToolsHook,
} from "./virtual-dom";
export {
  parseCron, validateCron, getNextRuns, getPreviousRuns, matchesCron,
  describeCron, analyzeCron, COMMON_CRON_EXPRESSIONS,
  type CronExpression, type CronFields, type ParsedCron, type ValidationResult,
} from "./cron-parser";
export {
  computeDiff, toUnifiedDiff, applyPatch, renderInlineDiffHtml, renderSideBySideDiffHtml,
  wordDiff, renderWordDiffHtml, getDiffStyles, textSimilarity, formatDiffStats,
  type DiffChunk, type DiffResult, type FileDiff,
} from "./diff-viewer";
export {
  FormBuilder, createForm, validations,
  type FormSchema, type FormField, type FormSection, type FormState,
  type FieldValidation, type FieldError, type SelectOption, type FieldType,
} from "./form-builder";
export {
  toCsv, parseCsv, downloadCsv, copyCsvToClipboard, streamParseCsv, templateCsv,
  isValidCsvFormat, getCsvStats,
  type CsvOptions, type ParseOptions, type ParsedCsv, type StreamParseOptions,
} from "./csv-export";
export {
  TaskQueue, createTaskQueue,
  type Task, type TaskPriority, type TaskStatus, type TaskResult,
  type WorkerPoolOptions, type QueueStats,
} from "./task-queue";
export {
  VirtualFileSystem, normalizePath as fsNormalizePath, joinPath as fsJoinPath,
  dirname as fsDirname, basename as fsBasename, extname as fsExtname,
  isAbsolute as fsIsAbsolute, relative as fsRelative, resolvePath as fsResolvePath,
  matchGlob, globMatch, diffTrees,
  type FsNode, type FsTreeDiff, type GlobOptions,
} from "./file-system-v2";
export {
  DataPipeline, filter, map as mapTransform, pick, omit, rename, derive,
  sortBy, limit, offset, paginate, uniqBy, groupBy,
  aggregate, aggregateBy, validate, validations as pipelineValidations,
  innerJoin, leftJoin,
  type TransformStep, type TransformContext, type PipelineResult,
  type AggregationResult, type ValidationRule,
} from "./data-pipeline";
export {
  EventBus, createEventBus,
  type EventCallback, type EventMiddleware, type Subscription,
  type EmittedEvent, type EventBusOptions,
} from "./event-bus";
export {
  DataPipeline, filter, map as mapTransform, pick, omit, rename, derive,
  sortBy, limit, offset, paginate, uniqBy, groupBy,
  aggregate, aggregateBy, validate, validations as pipelineValidations,
  innerJoin, leftJoin,
  type TransformStep, type TransformContext, type PipelineResult,
  type AggregationResult, type ValidationRule,
} from "./data-pipeline";
export {
  EventBus, createEventBus,
  type EventCallback, type EventMiddleware, type Subscription,
  type EmittedEvent, type EventBusOptions,
} from "./event-bus";
export {
  $, $$, closest, matches, findByDataAttr, getFocusableElements, getVisibleParent,
  createElement, div, span, fragment, createSvgElement,
  addClass, removeClass, toggleClass, hasClass, replaceClass, swapClasses,
  setStyles, getStyle, show, hide, toggleVisibility, isVisible,
  getRect, getPosition, scrollIntoView, scrollToTop, scrollToBottom,
  setAttr, getData, setData,
  delegate, delegateOnce,
  observeMutations, waitForElement, waitForRemoval,
  getFullSize, isPointInside, doElementsOverlap,
  insertAfter, insertBefore, replaceElement, removeElement, empty, cloneDeep, wrap, unwrap,
} from "./dom-utils-v2";
export {
  toTitleCase, toSentenceCase, toCamelCase, toKebabCase, toSnakeCase, toPascalCase, toConstantCase,
  detectCase, convertCase as convertStringCase,
  slugify, uniqueSlug, humanize,
  truncateMiddle, truncateAtWord, smartTruncate,
  countWords, readingTime, charCount, stringStats, isBlank, isPresent,
  interpolate, html, repeat, pad,
  startsWith, endsWith, includes, findAllOccurrences, countOccurrences, replaceAll,
  escapeHtml, unescapeHtml,
  splitKeep, joinWithAnd, initialism, acronym,
  maskEmail, maskPhone, maskCard, maskString,
} from "./string-utils-v2";
export {
  WebhookManager, verifySignature, WebhookDispatcher, WebhookReceiver,
  EventSchemaRegistry, WebhookLog, SecretManager, IdempotencyHandler,
  type WebhookPayload, type SignatureVerificationOptions, type DeliveryStatus,
} from "./webhook-utils";
export {
  ApiClient, createApiClient, ResourceBuilder,
  type ApiClientConfig, type RequestInterceptor, type ResponseInterceptor,
  type ApiError, type NetworkError, type TimeoutError, type CacheConfig,
  type PaginationResult, type MockRule,
} from "./api-client";
export {
  clamp, lerp, smoothStep, mapRange, roundTo, roundToMultiple, ceilToMultiple, floorToMultiple,
  approxEqual, inRange, wrap, normalizeAngle, degToRad, radToDeg,
  mean, median, mode, variance, stdev, percentile, quartiles, iqr, findOutliers,
  covariance, correlation,
  rangesOverlap, rangeIntersection, rangeUnion, inAnyRange, mergeRanges, subtractRanges,
  type NumericRange,
} from "./number-utils-v2";
export {
  Observable, ComputedValue, ReactiveStore, watch,
  SeededRNG, rng, randInt, randFloat, randPick, shuffle, uuid,
  formatNumber, formatCompact, formatBytes, formatPercent, formatCurrency, parseFormattedNumber,
  celsiusToFahrenheit, fahrenheitToCelsius, celsiusToKelvin, kelvinToCelsius,
  metersToFeet, feetToMeters, metersToMiles, milesToMeters, kmToMiles, milesToKm,
  kgToPounds, poundsToKg,
  msToSeconds, secondsToMs, minutesToMs, hoursToMs, daysToMs, msToReadable,
  type Subscriber, type Unsubscribe, type StoreOptions, type StoreState, type WatchOptions,
} from "./observer";
export {
  injectStyle, removeStyle, updateStyle,
  setCssVar, getCssVar, setCssVars, getRootVar, setRootVar,
  getCurrentBreakpoint, isMinWidth, isMaxWidth, onBreakpointChange,
  isMobile, isTablet, isDesktop, getDevicePixelRatio, isRetina,
  mq, mediaQueries, matchesMedia, subscribeMedia,
  isDarkMode, isLightMode, toggleDarkMode, setDarkMode, onDarkModeChange,
  buildKeyframes, registerKeyframes, animations, animate,
  toggleClass, classIf, setClasses, hasAnyClass,
  bringToFront, sendToBack,
  type KeyframeRule,
} from "./css-injs";
export {
  SameSiteValue, CookieCategory, ConsentPreferences, CookieAttributes, ParsedCookie,
  getCookie, setCookie, deleteCookie, getAllCookies, hasCookie,
  parseCookieString, serializeCookie, isCookieValid,
  CookieJar, createCookieJar,
  ConsentManager, createConsentManager,
  SubCookie, getSubCookie, setSubCookie, deleteSubCookie,
  CookieChangeDetector, createCookieChangeDetector,
  CookieAnalytics, createCookieAnalytics,
} from "./cookie-utils";
export {
  WebVitalName, CustomMetricType, TrendDirection, AlertSeverity, ResourceCategory,
  WebVitalMetric, MetricCallback, AlertCallback, PerformanceAlert,
  PerformanceMonitor, createPerformanceMonitor,
  CustomMetric, createCustomMetric,
  ResourceTimingAnalyzer, createResourceTimingAnalyzer,
  NavigationTimingAnalyzer, createNavigationTimingAnalyzer,
  MemoryMonitor, createMemoryMonitor,
  LongTaskMonitor, createLongTaskMonitor,
  FPSCounter, createFPSCounter,
  PerformanceScoreCalculator, calculatePerformanceScore,
  PerformanceBudget, createPerformanceBudget,
  PerformanceReporter, createPerformanceReporter,
  TrendTracker, createTrendTracker,
  ABImpactAnalyzer, createABImpactAnalyzer,
  type MetricOptions, type ResourceEntryEx, type MemorySnapshot, type LongTaskInfo,
  type FPSStats, type ScoreBreakdown, type BudgetResult, type ReportConfig,
  type TrendData, type ABExperimentResult,
} from "./performance-monitor";
export {
  ValidationError, ValidationResult, ValidatorFn, ValidationContext, FieldSchema, Schema,
  required, typeCheck, minLength, maxLength, lengthRange, minVal, maxVal, rangeVal,
  matchesPattern, email, url, oneOf, custom, validations,
  SchemaBuilder, validate, validateAsync,
  formatErrors, formatErrorString, getFirstError, groupErrorsByField, filterErrorsByCode,
  isValidString, isValidNumber, isValidBoolean, isArray, isObject, isDate, isEmpty, isNonEmptyString,
  stripHtml, trimInput, normalizeWhitespace, escapeRegex, sanitizeControlChars, sanitizeXss,
  mergeSchemas, pickFields, omitFields, partialSchema, extendSchema,
} from "./validation-v2";
export {
  ArrayQueue, LinkedListQueue, ArrayStack, LinkedStack, Deque,
  CircularBuffer, OverwriteMode,
  PriorityQueue, HeapOrder,
  MinMaxStack,
  LRUCache,
  Trie,
  BloomFilter,
  SkipList,
  UnionFind,
} from "./queue-ds";
export {
  toBase64, fromBase64, toHex, fromHex, strToBytes, bytesToStr,
  toBase64Url, fromBase64Url,
  randomBytes, randomInt, randomUUID, randomString, generateToken, generateApiKey,
  hash, sha256, sha512,
  hmac, hmacSha256,
  pbkdf2,
  generateAesKey, exportAesKey, importAesKey, aesEncrypt, aesDecrypt,
  generateRsaKeyPair, rsaEncrypt, rsaDecrypt, exportRsaPublicKey, importRsaPublicKey,
  generateEcKeyPair, ecdsaSign, ecdsaVerify,
  rsaPssSign, rsaPssVerify,
  keyFingerprint,
  ecdhDeriveBits,
  estimatePasswordStrength, generatePassword,
  type AesGcmResult, type HashAlgorithm, type EcCurve, type PasswordStrengthResult,
} from "./crypto-utils";
export {
  createMachine, interpret, match,
  mount, updateTree, unmount,
  beginFiberWork, memo, shallowEqual,
  createContext, readContext, subscribeToContext,
  renderWithErrorBoundary,
  createRenderer,
  type StateConfig, type StateMachine, type MachineContext, type Event,
  type Transition, type Guard, type Action, type ServiceConfig,
  type FiberNode, type Effect, type ReconcilerConfig,
  type ContextValue, type ContextSubscriber,
} from "./state-machine";
export {
  h, createTextVNode, Fragment, createComponentVNode,
  createElement, applyProps,
  diff, patch,
  mount as vdomMount, updateTree as vdomUpdateTree, unmount as vdomUnmount,
  renderWithErrorBoundary as vdomRenderWithErrorBoundary,
  scheduler as vdomScheduler,
  memo as vdomMemo, shallowEqual as vdomShallowEqual,
  createContext as vdomCreateContext, readContext as vdomReadContext,
  subscribeToContext as vdomSubscribeToContext,
  createDevToolsHook, registerRendererWithDevTools, createRenderer as vdomCreateRenderer,
  type VNode, type VNodeProps, type VNodeChild, type FunctionalComponent,
  type ComponentClass, type PatchType, type Patch, type DOMElement,
  type SyntheticEvent, type EventHandler, type EventMap,
  type Reconciler, type SchedulerTask, type Priority,
  type ComponentInstance, type LifecycleHooks, type DiffResult as VDomDiffResult,
  type DevToolsMessage,
} from "./virtual-dom";
export {
  haversineDistance, vincentyDistance, euclideanDistance2D, manhattanDistance2D, euclideanDistance3D,
  initialBearing, destinationPoint, midpoint,
  boundingBoxFromPoints, isInBoundingBox, bboxCenter, expandBBox, mergeBBoxes, bboxArea, bboxesIntersect,
  isWithinRadius, isInsidePolygon, geofenceCheck,
  polygonArea, polygonCentroid, simplifyPolygon, convexHull,
  latLngToTile, tileToLatLng, getTilesForBBox, buildTileUrl,
  decimalToDms, dmsToDecimal, getUTMZone, getMGRSZone,
  parseNmeaGga, encodePolyline, decodePolyline,
  mercatorProject, mercatorInverse,
  clampLat, normalizeLng, formatCoordinate,
  type LatLng, type Point2D, type Point3D, type BoundingBox, type Circle,
} from "./geo-spatial";
export {
  Message, ContentBlock, ToolDefinition, ToolResult, LLMRequest, LLMResponse, StreamChunk,
  ProviderConfig, LLMProvider,
  registerProvider, getProviderConfig, listProviders, unregisterProvider, setDefaultModel,
  Conversation, AIClient, createClient,
  getConversation, deleteConversation, listConversations,
  RateLimiter, estimateTokens as llmEstimateTokens, countTokensAccurate, truncateToTokens,
  PromptTemplate, requestJSON, withRetry,
} from "./ai-sdk-wrapper";
export {
  PdfDocument, createPdf, quickPdf, htmlToPdf,
  type PdfOptions, type FontOptions, type CellOptions, type ImageOptions, type AnnotationOptions,
} from "./pdf-generator";
export {
  TextToSpeech, SpeechRecognizer, VoiceActivityDetector, AudioRecorder,
  parseSsml, ssmlToSpeechCommands, speakSsml, scorePronunciation,
  type VoiceInfo, type SpeechOptions, type RecognitionOptions, type PronunciationScore,
  type SsmlNode, type VoiceActivityConfig,
} from "./speech-utils";
export {
  createWorker, createSharedWorker, terminateWorker, WorkerPool,
  postMessage, createMessageChannel, broadcast,
  runInWorker, runTasksInParallel, WorkerTaskQueue,
  PubSubWorker, RequestResponse, StreamWorker,
  isWorkerContext, getWorkerInfo, measureWorkerPerformance, transferOwnership, createOffscreenCanvas,
  WorkerErrorBoundary, DeadWorkerDetector,
  type WorkerMetrics, type WorkerInfo as WorkerInfoType,
} from "./web-workers";
export {
  CanvasEngine, createCanvas,
  SceneNode, GroupNode, ShapeNode, TextNode, ImageNode,
  Renderer, Layer, Camera,
  AnimationController, Animator,
  HitTester,
  toDataURL as canvasToDataURL, toBlob as canvasToBlob, toImageBitmap, exportAsPNG,
  type CanvasOptions, type Transform as CanvasTransform, type EasingFunction,
} from "./canvas-engine";
export {
  AudioEngine, createAudioEngine,
  SoundLoader, SoundCache, SoundInstance, PlaybackManager,
  EffectChain, SpatialAudioManager, AudioAnalyzer, Visualizer,
  AudioRecorder as AudioRecorderAdvanced, MidiManager,
  AudioUtils, MasterVolume,
  type AudioEngineOptions, type SoundOptions, type SpatialConfig, type AnalyserData,
} from "./audio-engine";
export {
  Matrix, dot, norm, normalize, euclideanDist, manhattanDist, cosineSimilarity,
  activations, softmax, logSoftmax,
  losses,
  NeuralNetwork, LayerConfig, TrainingConfig,
  kMeans, KNNClassifier,
  pca, PCAResult,
  linearRegression, RegressionResult,
  accuracy, precisionScore, recallScore, f1Score, confusionMatrix,
  standardize, normalizeData, oneHotEncode, binarize, polynomialFeatures,
  type ActivationFn, type LossFn, type ClusterResult,
} from "./machine-learning";
export {
  CrdtDocument, generateOpId,
  transform as otTransform, compose as otCompose,
  PresenceManager, CollaborativeUndoManager,
  SyncMessageType, createSyncMessage,
  VectorClock, ConflictStrategy, resolveConflict, ActivityTracker,
  type UserId, type CursorPosition, type PresenceInfo, type OtOperation,
  type TransformResult, type SyncMessage, type ConflictInfo, type Resolution, type UserActivity,
} from "./realtime-collab";
export {
  TerminalEmulator, TerminalBuffer, AnsiParser,
  DEFAULT_THEME, LIGHT_THEME,
  resolveColor, unpackRgb,
  type TerminalConfig, type TerminalTheme, type Cell, type CursorState,
} from "./terminal-emulator";
export {
  parseMarkdown, renderToHtml, generateToc, renderToc,
  extractFrontMatter, extractText, countWords, readingTime, mdToHtml,
  type MdNode, type MdNodeType, type MdRenderOptions, type TocEntry, type FrontMatter,
} from "./markdown-renderer";
export {
  RigidBody2D, PhysicsWorld,
  BodyDef, Contact, RaycastResult, WorldSettings,
  type Shape as PhysicsShape,
} from "./physics-engine";
export {
  ShortcutManager, ShortcutRecorder, ShortcutOverlay,
  eventToCombo, normalizeKey, comboToString, parseCombo, comboMatches, comboHash,
  commonShortcuts,
  type KeyCombo, type ShortcutBinding, type ShortcutScope, type RecordedSequence,
} from "./keyboard-shortcuts";
export {
  setAria, getAria,
  createFocusTrap, navigateFocus, focusElement,
  announce, announceAssertive, createLiveRegion,
  contrastRatio, checkContrast,
  createSkipLinks,
  AccessibleModal,
  linkErrorToInput, clearInputError, createFieldSet, markRequired,
  prefersReducedMotion, safeDuration, applyMotion, prefersHighContrast, forcedColorsActive,
  createRoveList,
  type AriaAttrs, type ContrastResult, type ModalOptions,
} from "./accessibility-v3";
export {
  createGraph, addNode, removeNode, addEdge, removeEdge,
  neighbors, inDegree, outDegree, areAdjacent, getEdge,
  topologicalSort, topologicalSortDFS, hasCycle, findCycles,
  findShortestPath, dijkstra, findAllPaths,
  stronglyConnectedComponents, isConnected,
  resolveDependencies, getDependencyTree,
  WorkflowEngine,
  exportGraph, importGraph,
  type FlowGraph, type GraphNode, type GraphEdge,
  type WorkflowNode, type WorkflowExecution, type WorkflowNodeStatus, type DependencyTreeNode,
} from "./flow-graph";
export {
  colorPalettes, getColor, createColorScale,
  formatNumber, formatPercent, formatCurrency, autoFormat,
  calculateStats, histogramBins,
  ChartBase, BarChart, LineChart, PieChart,
  interpolateColor,
  type ChartConfig, type DataPoint, type SeriesData, type AxisConfig, type LegendConfig, type TooltipConfig, type StatsResult,
} from "./data-visualization";
export {
  normalizePath, joinPath, dirname, basename, extname, parsePath, isAbsolute, isParent, relative,
  globMatch, globToRegex, glob,
  VirtualFileSystem, OpfsWrapper,
  detectMimeType, detectMimeTypeFromBytes,
  type PathComponents, type VFile, type FsEvent, type GlobOptions,
} from "./file-system-v3";
export {
  NotificationCenter, PushNotificationManager,
  type Notification, type NotificationType, type NotificationPriority, type NotificationConfig,
} from "./notification-system";
export {
  Scheduler as SchedulerV3, CronScheduler, TokenBucketRateLimiter, DeadlineManager,
  type TaskStatus, type TaskResult, type TaskError, type ScheduleOptions,
  type Job, type ResourcePoolConfig, type CronJob,
} from "./scheduler-v3";
export {
  IpcManager, WindowManager, TrayManager, MenuBuilder,
  NativeNotificationManager, ShellBridge, ClipboardBridge,
  AutoUpdater, DeepLinkHandler, getSystemInfo,
  CrashReporter, PowerMonitor, ScreenManager,
  type IpcChannel, type IpcListener, type ElectronIpcEvent, type IpcMessage,
  type WindowOptions, type DialogOptions, type FileDialogOptions, type TrayOptions,
  type MenuItemOptions, type NotificationOptions as ElectronNotifOptions,
  type AutoUpdateInfo, type SystemInfo, type DisplayInfo,
  type ContextBridgeAPI,
} from "./electron-bridge";
export {
  ActionExecutor, DataExtractor, FormFiller, WorkflowEngine,
  Assertions, TestReport,
  type Selector, type AutomationOptions, type StepResult, type WorkflowStep,
  type ExtractedData, type FormFillRule, type RecordedAction, type ActionType,
  type StepOptions, type AssertionResult,
} from "./automation-framework";
export {
  TimeSeriesStore, AlertManager, HealthChecker, DashboardLayout,
  MonitoringChartRenderer,
  formatMetricBytes, formatUptime, calcPercentChange, getTrendIndicator, emaSmooth,
  type MetricPoint, type MetricSeries, type AlertRule, type AlertEvent,
  type HealthCheckResult, type DashboardWidget, type WidgetType, type WidgetConfig,
} from "./monitoring-dashboard";
export {
  TemplateEngine, registerBuiltinHelpers, createTemplateEngine, renderTemplate,
  unescapeHtml,
  type TemplateContext, type TemplateOptions, type TemplateError,
  type PartialTemplate, type HelperFunction,
} from "./template-engine";
export {
  Vec3, Mat4, Quaternion,
  createCube, createSphere, createCylinder, createPlane, createTorus,
  SceneNode, Scene, Camera,
  Light, LightType,
  createDirectionalLight, createPointLight, createSpotLight, createAmbientLight, createHemisphereLight,
  Material, createMaterial,
  Ray3D, AABB3D, SphereBounds, Frustum,
  KeyframeAnimation3D, Keyframe,
  isWebGLSupported, isWebGL2Supported, getWebGLInfo, createDefaultShaderSource,
  type Transform, type MeshData,
} from "./3d-graphics";
export {
  RealtimeClient, RoomManager, PresenceSystem, SyncEngine,
  createRealtimeClient,
  signMessage, verifySignature, rateLimitByConnection,
  type ConnectionState, type ConnectionMetrics, type ReconnectStrategy,
  type MessageEnvelope, type MessageType, type RoomInfo, type PresenceData,
  type SyncOperation, type RoomEvent, type RealtimeClientOptions,
  type RateLimitResult,
} from "./websocket-realtime";
export {
  AdvancedFormState, FormPersistence, FormAnalytics,
  required, minLength, maxLength, lengthRange, minValue, maxValue, rangeVal,
  pattern, email, url, matchesField, notMatchesField, greaterThan, lessThan,
  dateRange, futureDate, pastDate, custom,
  trimTransform, lowercaseTransform, uppercaseTransform, numberTransform,
  intTransform, floatTransform, boolTransform, nullIfEmptyTransform,
  defaultIfEmptyTransform, clampTransform,
  type FieldState, type FormState, type ValidationRule, type TransformRule,
  type FieldConfig,
} from "./form-state-advanced";
export {
  DataTableEngine, formatCellValue, aggregateColumn, generateCsv,
  type Column, type RowData, type SortState, type FilterState,
  type FilterOperator, type PaginationState, type SelectionState,
  type GroupState, type TableState,
} from "./data-table-engine";
export {
  FeatureFlagStore, FlagAnalytics,
  registerBuiltinHelpers as registerFlagHelpers,
  type FeatureFlag, type FlagType, type FlagStatus,
  type SegmentDefinition, type SegmentCondition,
  type EvaluationContext, type EvaluationResult, type FlagChange,
  type RemoteFlagProvider,
} from "./feature-flag-system";
export {
  InMemoryEventStore, SagaOrchestrator,
  serializeEvent, deserializeEvent, generateEventId, createCorrelationId,
  validateEvent, eventHash,
  type BaseEvent, type StoredEvent, type AggregateRoot, type Projection,
  type Snapshot, type SagaStep, type SagaDefinition,
  type EventType,
} from "./event-sourcing";
export {
  UndoManager, transform as transformOperation,
  type Command, type BranchInfo, type UndoState, type UndoListener,
  type RedoResult, type ApplyFn, type InvertFn, type TransformOperation,
} from "./undo-redo-v2";
export {
  GridEngine, ResponsiveGridBuilder, GridPresets, GridDebugOverlay,
  type TrackSize, type GridAlign, type GridItem, type GridTemplate,
  type Breakpoint, type ComputedGrid, type PlacedItem, type GridAreaDef,
  type SpanDef,
} from "./css-grid-system";
export {
  FSM, HSM,
  createMachine, interpret, match, stateEquals,
  evaluateChoice, evaluateJunction, deepHistoryTarget, shallowHistoryTarget,
  type MachineConfig, type StateConfig, type TransitionDef,
  type StateValue, type TransitionHistoryEntry,
  type ChoiceConfig, type JunctionConfig,
  type GuardFn, type ActionFn, type Service,
  type HistoryMode, type InvalidEventStrategy,
} from "./state-machine";
export {
  hash, hashHex, hashBase64, hmac, hmacHex,
  pbkdf2, pbkdf2Hex,
  generateAesKey, importAesKey, exportAesKey,
  encrypt, decrypt, encryptString, decryptString,
  generateRsaKeyPair, generateEcKeyPair, sign, verify,
  rsaEncrypt, rsaDecrypt,
  secureRandom, secureRandomInt, secureRandomPick, secureShuffle,
  generateToken, generateUuid, uniqueId, nanoid,
  analyzePassword,
  createUnsignedJwt, parseJwt,
  ecdhDeriveBits, generateEcdhKeyPair,
  constantTimeEqual, isCryptoAvailable,
  encode, decode, toBase64Url, fromBase64Url,
  type HashAlgorithm, type SymmetricAlgorithm, type AsymmetricAlgorithm,
  type Encoding, type KeyPairResult, type EncryptedData,
  type PasswordStrengthResult, type TokenOptions,
} from "./cryptography-toolkit";
export {
  I18nEngine, initI18n, getI18n, t as translate,
  parseLocale, getLocaleDirection, isSameLanguage, matchLocale, getBrowserLocales,
  getPluralForm,
  formatNumber, formatCurrency, formatPercent, formatCompact, formatBytes,
  formatDate, formatRelativeTime, formatDateRange,
  type Locale, type LocaleDirection, type PluralRule,
  type MessageCatalog, type Namespace, type I18nConfig,
  type InterpolationContext, type FormatOptions, type DateFormatOptions,
  type I18nStats,
} from "./i18n-system";
export {
  h, createTextVNode, Fragment, createComponentVNode,
  createElement, applyProps, computePropsDiff, patch,
  mount, updateTree, unmount,
  beginFiberWork, performWork,
  memo, shallowEqual,
  createContext, readContext, subscribeToContext,
  renderWithErrorBoundary,
  createDevToolsHook, registerRendererWithDevTools, createRenderer,
  scheduler, enqueueUpdate, startBatch, endBatch,
  type VNode, type VNodeProps, type VNodeType,
  type ComponentFunction, type ComponentLifecycle, type ComponentInstance,
  type Patch, type PropsDiff, type SyntheticEvent,
  type Context, type MemoCompareFunction, type MemoizedComponent,
  type DevToolsHook, type VNodeWork, type ScheduledWork,
  type RendererConfig, type VDOMRendererOptions,
  type ErrorInfo, type PooledEvent,
  Priority, PatchType,
} from "./virtual-dom";
export {
  PluginManager, parseSemver, satisfiesConstraint,
  type PluginManifest, type PluginContext, type PluginInstance,
  type PluginStatus, type HookType, type HookHandler, type HookOptions,
  type RegisteredHook, type PluginLogger, type PluginStorage,
  type PluginLoadResult, type SystemStats, type EventHandler,
  type PluginPermission,
} from "./plugin-system";
export {
  parseColor, hexToRgb, rgbToHex, rgbToHsl, hslToRgb, oklchToRgb, formatCss,
  mixColors, lighten, darken, saturate, desaturate, setOpacity, invert,
  contrastRatio, checkContrast, findAccessibleColor,
  generatePalette, generateComplementaryPalette, generateAnalogousPalette, generateTriadicPalette,
  generateGradient, Gradients,
  generateSpacingScale, spacingScale, Spacing,
  generateTypeScale, majorThirdScale, perfectFourthScale,
  generateRadiusScale, radiusScale,
  generateElevationShadows, elevationShadows,
  generateCssVariables, generatePaletteCssVariables, generateDarkTheme,
  type ColorFormat, type ColorSpace, type RGB, type HSL, type OKLCH,
  type DesignToken, type TokenGroup, type ThemeDefinition,
  type ContrastResult, type GradientStop, type GradientDef,
  type PaletteColor, type ColorPalette, type ScaleStep,
} from "./color-design-tokens";
export {
  signal, computed, effect, batch, flushPending,
  isSignal, isComputed, untrack, peek,
  not, mapSignal, filterSignal,
  asyncEffect,
  getDependencyGraph, getPendingCount, getBatchDepth,
  shallowEqual as signalShallowEqual, deepEqual,
  type EqualityFn, type SignalOptions, type ComputedOptions,
  type EffectOptions, type ReactionNode,
} from "./reactive-signals";
export {
  TaskScheduler,
  type Task, type TaskStatus, type TaskPriority, type RetryStrategy,
  type SchedulerConfig, type SchedulerMetrics, type WorkerPoolOptions,
} from "./task-scheduler";
export {
  parse, render, extractText, extractFrontMatter, generateTableOfContents,
  type MdNode, type MdNodeType, type TocEntry, type FrontMatter,
  type ParseOptions, type RenderOptions, type MdExtension,
} from "./markdown-processor";
export {
  FileSystemManager, InMemoryBackend, LocalStorageBackend,
  normalizePath, joinPath, dirname, basename, extname, isAbsolute, relative,
  type FileSystemBackend, type FileEntry, type FileType, type Permission,
  type FileSystemStats, type FileWatchEvent, type FileWatchCallback,
  type GlobOptions,
} from "./file-system-abstraction";
export {
  NotificationCenter, PushNotificationManager,
  type Notification, type NotificationType, type NotificationPriority,
  type NotificationConfig,
} from "./notification-system";
export {
  VirtualList,
  type VirtualItem, type VirtualListConfig, type VisibleRange,
  type RenderState, type ScrollPosition, type VirtualListMetrics,
} from "./virtualized-list";
export {
  DndManager,
  type DragItem, type DropZone, type DragData,
  type DragConstraints, type GhostOptions, type AutoScrollConfig,
  type DropPosition, type DropEffect, type DragPhase,
  type DndConfig, type DndEvent,
} from "./drag-drop-system";
export {
  easings, getEasing,
  springAnimate, AnimationTimeline,
  createScrollAnimation, staggerElements, animateCounter, createParallax,
  type EasingFunction, type SpringConfig, type SpringState,
  type Keyframe, type AnimationTrack, type ScrollAnimationConfig,
} from "./animation-engine";
export {
  FormBuilder, WizardController,
  type SchemaField, type FormSchema, type FormState,
  type FieldType, type ValidationRuleType, type FieldValidation,
  type ValidationResult, type WizardStep,
} from "./schema-form-builder";
export {
  HotkeyManager,
  normalizeKeyEvent, parseCombo, buildCombo, combosEqual,
  type HotkeyBinding, type HotkeyEvent, type RecordedHotkey,
  type HotkeyHint, type HotkeyStats, type KeyModifier, type Scope, type HotkeyPriority,
} from "./hotkey-manager";
export {
  FuzzyFinder,
  type FinderItem, type FinderOptions, type SearchResult,
  type FinderState, type FinderHistory,
} from "./fuzzy-finder";
export {
  normalizeData, pivotToSeries, flattenSeries,
  aggregateBy, bucketByTime,
  stats, detectOutliers, correlation, linearRegression,
  Palettes, getPaletteColors, makeColorblindSafe,
  formatValue, toChartJsFormat,
  type DataPoint, type SeriesData, type ChartDataset,
  type AggregationResult, type TimeBucket, type ColorPalette,
  type AxisFormatConfig,
} from "./chart-adapter";
export {
  UndoRedoManager, createCommand, createPropertyCommand,
  type Command, type HistoryBranch, type UndoRedoState,
  type UndoRedoConfig, type BatchOptions,
} from "./undo-redo-system";
export {
  AccessibilityAnnouncer, FocusTrap, RovingTabIndex,
  prefersReducedMotion, prefersHighContrast, prefersDarkMode,
  hasTouchCapability, detectScreenReader, watchMediaQuery,
  getFocusableElements, focusElement, saveFocus, createSkipLink,
  setAria, getAria, ariaPatterns,
  contrastRatio, wcagLevel, suggestAccessibleColor,
  validateHeadingStructure,
  type A11yConfig, type FocusTrapConfig, type FocusableElement,
  type LiveRegionPoliteness, type AriaRole, type AriaProperty,
  type HeadingIssue,
} from "./accessibility-engine";
export {
  Logger, ConsoleTransport, MemoryTransport, RemoteTransport,
  getLogger, resetLogger, createModuleLogger,
  generateCorrelationId, generateRequestId,
  type LogEntry, type LogTransport, type LoggerConfig,
  type TimerHandle, type LogLevel,
} from "./logger-system";
export {
  UrlRouter,
  parseQueryString, buildQueryString, joinPath, normalizePath,
  type RouteDefinition, type RouteMatch, type RouteParams,
  type QueryParams, type NavigationResult, type RouterState,
  type RouterConfig, type RouteMethod,
} from "./url-router";
export {
  EventBus, createEventBus,
  type EventCallback, type Subscription, type EmittedEvent,
  type EventBusOptions, type EventMiddleware,
} from "./event-bus";
export {
  StorageManager,
  type StorageEntry, type StorageOptions, type StorageStats,
  type MigrationPlan, type StorageBackend,
} from "./storage-manager";
export {
  WebSocketManager,
  type WsConfig, type WsMessage, type ChannelSubscription,
  type PendingRequest, type WsStats, type MessageType, type ConnectionState,
} from "./websocket-manager";
export {
  PermissionEngine,
  type Permission, type Role, type UserIdentity, type ResourceContext,
  type EvaluationContext, type EvaluationResult, type Policy, type Condition,
  type TimeConstraint, type AuditLogEntry, type PermissionAction,
} from "./permission-system";
export {
  injectStyle, removeStyle, updateStyle,
  setCssVar, getCssVar, setCssVars, getRootVar, setRootVar,
  getCurrentBreakpoint, isMinWidth, isMaxWidth, onBreakpointChange,
  isMobile, isTablet, isDesktop, getDevicePixelRatio, isRetina,
  mq, mediaQueries, matchesMedia, subscribeMedia,
  isDarkMode, isLightMode, toggleDarkMode, setDarkMode, onDarkModeChange,
  buildKeyframes, registerKeyframes, animations, animate,
  toggleClass, classIf, setClasses, hasAnyClass,
  bringToFront, sendToBack,
  type Breakpoints, type KeyframeRule,
} from "./css-in-js";
export {
  Schema, string_, number_, boolean_, object, array, enum_, literal, nullable, any_, unknown_,
  ValidationException,
  type ValidatorResult, type ValidationError, type ValidationContext,
  type ValidatorOptions, type SchemaValidator,
} from "./data-validator";
export {
  createStore, createSimpleStore, createSecureStore, createSessionStore, createCacheStore,
  StorageAdapter, SyncEngine, UndoRedoStack, DevToolsConnector, QuotaManager,
  Compression, Encryption,
  isBrowser, isSecureContext, uid, deepClone, isExpired, createMetadata, runMigrations,
  batchUpdates, inspectStorage, exportAllData, importData,
  type StorageResult, type EntryMetadata, type StorageEnvelope,
  type MigrationFunction, type MigrationStep, type SchemaMigration,
  type SyncConfig, type EncryptionConfig, type CompressionConfig,
  type QuotaConfig, type PersistOptions, type StateAction,
  type StateObserver, type HistoryEntry, type StateStore,
  type ConflictStrategy, type QuotaCleanupStrategy, type StorageBackend as SpStorageBackend,
} from "./state-persistence";
export {
  VirtualScroller,
  type ScrollItem, type VisibleRange, type ScrollerConfig, type ScrollerState,
  type ScrollToOptions,
} from "./virtual-scroller";
export {
  ImageOptimizer,
  detectImageFormat, generateSrcset, generateSizes, createBlurPlaceholder,
  optimizeImage, applyResponsiveAttributes, preloadImages,
  type ImageSrc, type ImageOptimizeConfig, type ImageStats,
  type ArtDirectionSource, type ImageFormat,
} from "./image-optimizer";
export {
  ClipboardManager,
  requestClipboardPermission, requestReadPermission,
  isClipboardApiAvailable, sanitizeHtml,
  type ClipboardData, type ClipboardDataType, type ClipboardPermission,
  type CopyOptions, type PasteOptions, type ClipboardHistoryEntry,
  type ClipboardConfig,
} from "./clipboard-manager";

// --- DOM Diff & Patch ---
export {
  domToTree,
  diff,
  patch,
  syncDOM,
  renderDOM,
  type PatchOp,
  type DomNode,
  type DiffOptions,
  type DiffResult,
  type PatchResult,
} from "./dom-diff";

// --- Gesture Recognizer ---
export {
  GestureRecognizer,
  type Point,
  type GestureEvent,
  type GestureConfig,
  type GestureHandler,
} from "./gesture-recognizer";

// --- I18n Framework ---
export {
  I18n,
  getI18n,
  _,
  type LocaleCode,
  type LocaleInfo,
  type MessageParams,
  type MessageEntry,
  type PluralRule,
  type I18nConfig,
  type NumberFormatOptions,
  type DateFormatOptions,
} from "./i18n-framework";

// --- Notification System ---
export {
  NotificationCenter,
  PushNotificationManager,
  type Notification,
  type NotificationType,
  type NotificationPriority,
  type NotificationConfig,
} from "./notification-system";

// --- Modal Manager ---
export {
  ModalManager,
  getModalManager,
  type ModalOptions,
  type ModalSize,
  type ModalAnimation,
  type ModalAction,
  type ModalInstance,
  type ConfirmOptions,
} from "./modal-manager";

// --- Tooltip Engine ---
export {
  TooltipEngine,
  getTooltipEngine,
  type TooltipOptions,
  type TooltipPlacement,
  type TooltipTrigger,
  type TooltipInstance,
  type PositionedTooltip,
} from "./tooltip-engine";

// --- Drag and Drop ---
export {
  DragDropManager,
  getDragDropManager,
  type DragItem,
  type DragOptions,
  type DropZoneOptions,
  type DropResult,
  type SortableConfig,
  type DragMode,
  type DropPosition,
} from "./drag-and-drop";

// --- Form Builder ---
export {
  FormBuilder,
  createForm,
  validations,
  type FormSchema,
  type FormField,
  type FormSection,
  type FieldType,
  type FieldValidation,
  type SelectOption,
  type FormState,
  type FieldError,
} from "./form-builder";

// --- Color Utilities ---
export {
  parseColor,
  requireColor,
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToHsl,
  toHexString,
  toRgbString,
  toHslString,
  lighten,
  darken,
  saturate,
   desaturate,
  rotateHue,
  setOpacity,
  mix,
  invert,
  luminance,
  contrastRatio,
  meetsAA,
  meetsAAA,
  contrastingText,
  minAlphaForContrast,
  generatePalette,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  generateScheme,
  linearGradient,
  radialGradient,
  gradientBetween,
  shimmerGradient,
  colorTemperature,
  isWarmColor,
  hueCategory,
  cssVariablesFromPalette,
  generateDesignTokens,
  type RGB,
  type HSL,
  type HSV,
  type ColorStop,
  type ColorPalette,
} from "./color-utils";

// --- Markdown Parser ---
export {
  parseMarkdown,
  renderToHtml,
  mdToHtml,
  extractToc,
  countWords,
  estimateReadingTime,
  type MarkdownNode,
  type MarkdownNodeType,
  type ParseOptions,
  type RenderOptions,
} from "./markdown-parser";

// --- Scheduler ---
export {
  Scheduler,
  parseCronExpression,
  cronMatches,
  getNextCronRun,
  type ScheduledJob,
  type JobStatus,
  type CronExpression,
} from "./scheduler";

// --- Crypto Utils ---
export {
  sha1, sha256, sha384, sha512, hash, hashHex,
  hmac, hmacHex,
  pbkdf2, deriveAesKey,
  generateAesKey, aesGcmEncrypt, aesGcmDecrypt, aesGcmEncryptString, aesGcmDecryptString,
  generateRsaOaepKeyPair, rsaOaepEncrypt, rsaOaepDecrypt,
  generateEcdsaKeyPair, ecdsaSign, ecdsaVerify,
  generateRsaPssKeyPair, rsaPssSign, rsaPssVerify,
  exportKey, importKey, keyFingerprint, generateEcdhKeyPair,
  ecdhDeriveSecret, ecdhDeriveAesKey,
  randomBytes, secureRandomInt, secureRandomUuid, secureRandomString,
  toBase64, fromBase64, toBase64Url, fromBase64Url, toHex, fromHex,
  encodeUtf8, decodeUtf8,
  estimatePasswordStrength, generatePassword,
  generateTokenHex, generateTokenBase64Url, generateApiKey, generateSessionId,
  type HashAlgorithm, type HmacAlgorithm, type AesKeyLength, type EcNamedCurve,
  type RsaKeySize, type KeyFormat, type Pbkdf2Options, type AesGcmOptions,
  type RsaKeyGenOptions, type EcdsaKeyGenOptions, type RsaPssSignOptions,
  type PasswordStrengthResult, type PasswordGeneratorOptions, type ApiKeyOptions,
  type AesGcmEncryptedData,
} from "./crypto-utils";

// --- Animation Engine ---
export {
  easings,
  getEasing,
  springAnimate,
  AnimationTimeline,
  createScrollAnimation,
  staggerElements,
  animateCounter,
  createParallax,
  type EasingFunction,
  type SpringConfig,
  type SpringState,
  type Keyframe,
  type AnimationTrack,
  type ScrollAnimationConfig,
} from "./animation-engine";

// --- Table Engine ---
export {
  TableEngine,
  type Column,
  type TableFilter,
  type TableSort,
  type PaginationState,
  type SelectionState,
  type TableConfig,
  type TableState,
  type SortDirection,
  type FilterOperator,
  type ColumnAlign,
} from "./table-engine";

// --- Command Palette ---
export {
  CommandPalette,
  type Command,
  type CommandCategory,
  type CommandPaletteConfig,
  type CommandPaletteState,
} from "./command-palette";

// --- Tree View ---
export {
  TreeView,
  type TreeNode,
  type TreeNodeData,
  type TreeViewConfig,
  type CheckMode,
} from "./tree-view";

// --- Split Pane ---
export {
  createSplitPane,
  type SplitPaneOptions,
  type SplitPaneInstance,
  type SplitOrientation,
  type SplitCollapseDirection,
} from "./split-pane";

// --- Infinite Scroll ---
export {
  InfiniteScroll,
  type InfiniteScrollItem,
  type InfiniteScrollOptions,
  type InfiniteScrollState,
} from "./infinite-scroll";

// --- Context Menu ---
export {
  ContextMenuManager,
  type ContextMenuItem,
  type ContextMenuOptions,
  type ContextMenuPosition,
  type ContextMenuInstance,
} from "./context-menu";

// --- Debounce & Throttle ---
export {
  Debounced,
  Throttled,
  debounce,
  throttle,
  debouncePromise,
  rafThrottle,
  idleThrottle,
  type DebounceOptions,
  type ThrottleOptions,
  type RateLimitStats,
} from "./debounce-throttle";

// --- Observer Pattern ---
export {
  Observer,
  createObserver,
  type Subscription,
  type ObserverOptions,
  type ObserverStats,
  type EventHandler,
  type EventErrorHandler,
} from "./observer-pattern";

// --- Cache Manager ---
export {
  CacheManager, createCacheManager,
  LRUCache, createLRUCache,
  LFUCache, createLFUCache,
  TTLCache, createTTLCache,
  SWRCache, createSWRCache,
  MemoryStorageAdapter, LocalStorageAdapter, SessionStorageAdapter, IndexedDBStorageAdapter,
  type CacheEntry, type CacheKey, type CacheNamespace, type CacheValue,
  type CacheOptions, type CacheConfig, type CacheStats,
  type CacheEventType, type CacheEvent, type CacheEventEmitter,
  type StorageAdapter,
} from "./cache-manager";

// --- Auth Manager ---
export {
  AuthManager, createAuthManager,
  validatePassword, estimatePasswordStrength,
  decodeJwtPayload, isJwtExpired, getJwtRemainingTtl,
  getUserIdFromToken, getRolesFromToken,
  type AuthUser, type AuthTokens, type AuthSession,
  type LoginCredentials, type RegisterData, type PasswordPolicy,
  type MfaSetup, type AuthEvent, type AuthConfig, type AuthResult,
} from "./auth-manager";

// --- Resource Pool ---
export {
  ResourcePool, ConnectionPool,
  createResourcePool, createConnectionPool,
  type ResourceWrapper, type PoolOptions, type PoolMetrics,
  type AcquireOptions, type PoolStatus, type ResourceId,
  type ConnectionPoolOptions,
} from "./resource-pool";

// --- PubSub Bus ---
export {
  PubSubBus, createPubSubBus, MemoryBusStorage,
  type PubSubMessage, type Subscriber, type SubscriptionFilter,
  type DeadLetterEntry, type BusStats, type BusConfig,
  type BusStorageAdapter, type Topic, type MessageId, type SubscriberId,
} from "./pubsub-bus";

// --- Advanced Rate Limiter ---
export {
  AdvancedRateLimiter, createAdvancedRateLimiter,
  createRateLimitMiddleware,
  type LimitAlgorithm, type RateLimitResult, type RateLimitConfig,
  type MultiDimensionalLimit, type RateLimiterMetrics,
  type DistributedCoordinator,
} from "./rate-limiter-advanced";

// --- Inverted Index (Full-Text Search) ---
export {
  InvertedIndex, createInvertedIndex,
  type SearchDocument, type SearchResult, type SearchOptions,
  type FacetResult, type IndexStats, type AutocompleteOptions,
  type Suggestion, type DocumentId, type Term,
} from "./inverted-index";

// --- Advanced Circuit Breaker ---
export {
  AdvancedCircuitBreaker, CircuitBreakerRegistry,
  createCircuitBreaker, createCircuitBreakerRegistry,
  type CircuitState, type CircuitEvent, type CircuitBreakerConfig,
  type CircuitBreakerState, type CircuitBreakerMetrics,
  type CircuitBreakerEventDetail, type CircuitResult,
} from "./circuit-breaker-advanced";

// --- Data Sync Engine ---
export {
  DataSyncEngine, createDataSyncEngine, MemorySyncStore,
  type SyncEntity, type SyncOperation, type SyncConflict, type SyncStatus,
  type SyncConfig, type SyncPullResult, type SyncPushResult,
  type ConflictStrategy, type SyncStorageAdapter,
  type SyncId, type EntityId, type EntityType, type Revision,
} from "./data-sync-engine";

// --- Structured Logger ---
export {
  StructuredLogger, createStructuredLogger, getLogger, log,
  type LogEntry, type LogLevel, type LogFormat, type LoggerConfig,
  type LogSearchQuery, type LogStats, type CacheOptions as LogCacheOptions,
} from "./structured-logger";

// --- API Gateway Client ---
export {
  ApiGatewayClient, createApiClient,
  type ApiRequestConfig, type ApiResponse, type ApiError,
  type CacheOptions, type RetryOptions, type InterceptorContext,
  type RequestInterceptor, type ResponseInterceptor, type ErrorInterceptor,
  type FinallyInterceptor, type ClientConfig, type BatchRequestItem,
  type ClientMetrics, type HttpMethod,
} from "./api-gateway-client";

// --- Animation Timeline ---
export {
  AnimationTimeline, createTimeline, easings,
  type AnimationTrack, type Keyframe, type TimelineLabel, type TimelineEvent,
  type TimelineOptions, type TimelineState, type TimelinePlaybackState,
  type EasingFn,
} from "./animation-timeline";

// --- Data Query Engine ---
export {
  DataQueryEngine, InMemoryDatabase, QueryBuilder,
  createQueryEngine, createDatabase, query,
  type Row, type TableSchema, type QueryResult, type QueryConfig,
  type SelectColumn, type WhereClause, type GroupByClause, type OrderByClause,
  type JoinClause, type ComparisonOp, type LogicalOp, type AggregateFn,
  type JoinType, type TableName, type ColumnName, type Value,
} from "./data-query-engine";

// --- URL State Manager ---
export {
  UrlStateManagerImpl, createUrlStateManager, createTypedUrlStateManager,
  type UrlStateManager, type ParamDefinition, type UrlStateConfig,
  type ParamKey, type ParamValue, type StateDiff,
} from "./url-state-manager";

// --- Advanced Task Scheduler ---
export {
  AdvancedTaskScheduler, createAdvancedScheduler, PriorityQueue,
  type Task, type TaskResult, type TaskId, type TaskStatus, type TaskPriority,
  type WorkerPoolOptions, type SchedulerConfig, type SchedulerStats,
  type DeadLetterEntry,
} from "./task-scheduler-advanced";

// --- Style Runtime ---
export {
  StyleRuntime, createStyleRuntime,
  type StyleDeclaration, type StyleRule, type ThemeVariable, type ThemeDefinition,
  type RuntimeStyleOptions, type BreakpointInfo, type ComputedStyle,
  type StyleProperty, type StyleValue, type Selector, type ScopeSelector,
} from "./style-runtime";

// --- Event Bus v2 ---
export {
  EventBusV2, createEventBusV2,
  type BaseEvent, type TypedEvent, type EventHandler, type SubscriptionOptions,
  type SubscriptionHandle, type MiddlewareContext, type EventMiddleware,
  type BusMetrics, type EventBusConfig,
  type ChannelName, type EventName, type EventId, type SubscriberId, type MiddlewareId,
} from "./event-bus-v2";

// --- Form Engine ---
export {
  FormEngine, createFormEngine, validators,
  type FieldDefinition, type FieldValidationRule, type ValidationContext,
  type FieldError, type FieldType, type FormState, type StepDefinition,
  type FormConfig, type ValidationResult, type FieldName, type FormId,
} from "./form-engine";

// --- I18n Manager ---
export {
  I18nManager, createI18n,
  type LocaleData, type MessageCatalog, type Locale, type MessageKey,
  type Namespace, type PluralRuleSet, type LocaleFormats, type I18nConfig,
  type InterpolationOptions, type I18nStats,
} from "./i18n-manager";

// --- Permission System ---
export {
  PermissionEngine,
  type Permission, type Role, type Condition, type TimeConstraint,
  type UserIdentity, type ResourceContext, type EvaluationContext,
  type EvaluationResult, type Policy, type AuditLogEntry,
  type PermissionAction,
} from "./permission-system";

// --- Virtual Scroller ---
export {
  VirtualScroller, SizeCache,
  type ScrollItem, type VisibleRange, type ScrollerConfig, type ScrollerState,
  type ScrollToOptions,
} from "./virtual-scroller";

// --- Drag and Drop ---
export {
  DragDropManager, getDragDropManager,
  type DragItem, type DragOptions, type DropZoneOptions, type DropResult,
  type SortableConfig, type DragMode, type DropPosition,
} from "./drag-and-drop";

// --- Clipboard Manager ---
export {
  ClipboardManager,
  requestClipboardPermission, requestReadPermission,
  isClipboardApiAvailable, sanitizeHtml,
  type ClipboardData, type ClipboardPermission, type CopyOptions,
  type PasteOptions, type ClipboardHistoryEntry, type ClipboardConfig,
  type ClipboardDataType,
} from "./clipboard-manager";

// --- Undo Manager ---
export {
  UndoManager,
  type Command, type HistoryEntry, type Branch, type UndoManagerConfig,
  type UndoStats, type CommandId, type BranchId, type GroupId,
} from "./undo-manager";

// --- Notification System ---
export {
  NotificationCenter, PushNotificationManager,
  type Notification, type NotificationConfig, type NotificationType,
  type NotificationPriority,
} from "./notification-system";

// --- Keyboard Shortcuts ---
export {
  ShortcutManager, ShortcutRecorder, ShortcutOverlay,
  eventToCombo, normalizeKey, comboToString, parseCombo,
  comboMatches, comboHash, commonShortcuts,
  type KeyCombo, type ShortcutBinding, type ShortcutScope,
  type RecordedSequence,
} from "./keyboard-shortcuts";

// --- Overlay Manager ---
export {
  OverlayManager,
  type OverlayOptions, type OverlayInstance, type OverlayId, type OverlayRole,
} from "./overlay-manager";

// --- Tooltip Manager ---
export {
  TooltipManager,
  type TooltipOptions, type TooltipInstance, type Placement, type TriggerMode,
  type VirtualElement,
} from "./tooltip-manager";

// --- Context Menu Manager ---
export {
  ContextMenuManager,
  type ContextMenuItem, type MenuContext, type ContextMenuOptions,
  type ContextMenuInstance, type ContextMenuItemId,
} from "./context-menu-manager";

// --- Resizable ---
export {
  makeResizable, createSplitPane,
  type ResizeOptions, type ResizeState, type ResizableController,
  type SplitPaneOptions as ResizableSplitPaneOptions, type SplitPaneController,
} from "./resizable";

// --- Split Pane ---
export {
  createSplitPane as createAdvancedSplitPane,
  type SplitOrientation, type SplitCollapseDirection,
  type SplitPaneInstance, type SplitPaneOptions as AdvancedSplitPaneOptions,
} from "./split-pane";

// --- Draggable Window ---
export {
  createDraggableWindow,
  type DraggableWindowOptions, type DraggableWindowInstance, type WindowState, type WindowControl,
} from "./draggable-window";

// --- Color Utils ---
export {
  parseColor, requireColor, rgbToHex, hexToRgb, rgbToHsl, hslToRgb, rgbToHsv, hsvToHsl,
  toHexString, toRgbString, toHslString,
  lighten, darken, saturate, desaturate, rotateHue, setOpacity, mix, invert,
  luminance, contrastRatio, meetsAA, meetsAAA, contrastingText, minAlphaForContrast,
  generatePalette, complementary, analogous, triadic, splitComplementary, tetradic, generateScheme,
  linearGradient, radialGradient, gradientBetween, shimmerGradient,
  colorTemperature, isWarmColor, hueCategory,
  cssVariablesFromPalette, generateDesignTokens,
  type RGB, type HSL, type HSV, type ColorStop, type ColorPalette,
} from "./color-utils";

// --- Math 3D ---
export {
  Vec2, Vec3, Vec4, Mat3, Mat4, Quat, Ray, AABB, Frustum,
} from "./math-3d";

// --- Crypto Wallet ---
export {
  randomBytes, randomInt, randomHex,
  sha256, sha512, hmacSha256, pbkdf2,
  generateEd25519KeyPair, signEd25519, verifyEd25519,
  encrypt, decrypt,
  deriveAddress, deriveHDAddress,
  generateMnemonic, validateMnemonic, mnemonicToSeed,
  bytesToHex, hexToBase64, base64ToHex,
  type KeyPair, type WalletAddress, type Signature, type EncryptedData,
  type MnemonicWordlist, type HashResult,
} from "./crypto-wallet";

// --- Expression Parser ---
export {
  parseExpression, evaluate, evalNode,
  type ExprNode, type ExprType, type ParseError,
  type EvalContext, type ParseResult,
} from "./expression-parser";

// --- State Machine Visualizer ---
export {
  renderStateMachine, toMermaidDiagram, toPlantUmlDiagram,
  createInteractiveViewer, StateMachineViewer,
  buildModel, getReachableStates, findAllPaths, validateModel,
  type VisualState, type VisualTransition, type LayoutOptions,
  type RenderOptions, type SvgDiagram, type StateMachineModel,
  type AnimationFrame,
} from "./state-machine-visual";

// --- CSV Parser ---
export {
  parseCsv, serializeCsv, createStreamingParser,
  validateAgainstSchema, queryCsv,
  StreamingParser,
  type CsvFieldType, type CsvField, type CsvRow, type CsvSchema,
  type ParseOptions, type ParseResult, type ParseError,
  type TypeInferenceOptions,
} from "./csv-parser";

// --- Chart.js Adapter ---
export {
  createChartConfig, quickChart, timeSeriesChart, dualAxisChart,
  updateChartData, exportConfigJson,
  type ChartType, type DataPoint, type Dataset, type AxisConfig,
  type TooltipConfig, type LegendConfig, type AnimationConfig,
  type ChartJsConfig, type AdapterOptions, type ColorPaletteName,
} from "./chartjs-adapter";

// --- WebSocket Reconnection ---
export {
  WebSocketManager, createWebSocket, createChatWebSocket, createStreamWebSocket,
  type ConnectionState, type ReconnectOptions, type HeartbeatOptions,
  type WsReconnectConfig, type WsEventListener, type ConnectionStats,
} from "./websocket-reconnection";

// --- Excel Exporter ---
export {
  ExcelExporter, quickExportExcel, quickExportArray,
  colToLetter, letterToCol, cellRef, parseCellRef, parseRange,
  type CellValue, type CellStyle, type Worksheet, type RowData,
  type CellRef as ExcelCellRef, type ConditionalFormat, type DataValidation,
  type WorkbookOptions, type BorderStyle,
} from "./excel-exporter";

// --- Notification Channels ---
export {
  NotificationManager, createNotificationManager, createSaaSNotifier,
  type ChannelType, type NotificationPriority, type NotificationPayload,
  type DeliveryResult, type SendResult, type ChannelConfig,
  type UserPreferences, type NotificationTemplate, type NotificationStats,
} from "./notification-channels";

// --- Rate Limiter v2 ---
export {
  AdvancedRateLimiter, createRateLimiter, createApiMiddleware,
  RATE_LIMIT_PRESETS,
  type RateLimitAlgorithm, type LimitScope, type RateLimitResult,
  type RateLimitConfig, type RateLimitContext, type RateLimitMetrics,
  type StorageAdapter,
} from "./rate-limiter-v2";

// --- DOM Observer ---
export {
  DomObserverManager, takeSnapshot, compareSnapshots,
  createRouteChangeDetector, createLazyLoader,
  type ObserveTarget, type MutationOptions, type IntersectionOptions,
  type ResizeOptions, type MutationRecordEx, type DomSnapshot,
  type ObserverCallbacks, type ObserverStats,
} from "./dom-observer";

// --- URL Pattern Matcher ---
export {
  compilePattern, matchUrl, quickMatch, UrlRouter,
  generatePath, validateParams,
  type RouteMatch, type RoutePattern, type MatchOptions,
  type RouterConfig,
} from "./url-pattern-matcher";

// --- Change Detector ---
export {
  ChangeDetector, diffValues, deepEquals, getChangedPaths,
  getChangeMap, applyChanges, simpleHash,
  type ChangeType, type ChangeInfo, type DiffResult, type Snapshot,
  type DetectorOptions,
} from "./change-detector";

// --- Text Diff ---
export {
  diffText, merge3Way, applyPatch, reversePatch,
  type DiffOp, type DiffHunk, type DiffResult, type DiffStats,
  type DiffFormat, type TextDiffOptions, type Patch, type MergeResult,
} from "./text-diff";

// --- Schema Validator ---
export {
  validate, str, num, int, bool, nullable, obj, arr, enumer, constant,
  inferSchema,
  type Schema, type SchemaType, type ValidationError,
  type ValidationResult, type ValidationContext, type ValidatorOptions,
} from "./schema-validator";

// --- Event Aggregator ---
export {
  EventAggregator,
  type MetricId, type MetricType,
  type CounterValue, type GaugeValue, type HistogramBucket,
  type HistogramValue, type TimerValue, type AggregatedMetrics,
  type AlertRule, type AlertEvent,
} from "./event-aggregator";

// --- CSS Transform ---
export {
  transformCss, minifyCss, extractCustomProperties, needsPrefix,
  type CssTransformOptions, type CssRule, type CssAtRule,
  type TransformResult,
} from "./css-transform";

// --- Key-Value Store ---
export {
  KvStore, CancellationToken,
  type KvStoreOptions, type KvEntry, type StoreStats,
  type StoreBackend, type Transaction,
} from "./key-value-store";

// --- Task Runner ---
export {
  TaskRunner, CancellationToken,
  type Task, type TaskResult, type TaskStatus, type TaskPriority,
  type ConcurrencyOptions, type RunnerStats, type ProgressCallback,
  type TaskFilter,
} from "./task-runner";

// --- Form Validator v2 ---
export {
  FormValidator, validateForm, createValidator,
  type ValidationTrigger, type FieldType,
  type FieldRule, type FormSchema, type FieldError,
  type FormValidationResult, type ValidatorOptions,
} from "./form-validator-v2";

// --- i18n Number ---
export {
  I18nNumber,
  formatNumber, formatCurrency, formatPercent, formatFileSize, timeAgo,
  escapeHtml, unescapeHtml,
  type NumberFormatStyle, type CurrencyDisplay, type CompactDisplay,
  type Notation, type SignDisplay, type RoundingMode,
  type RelativeTimeUnit, type ListType, type MeasurementSystem,
  type NumberFormatOptions, type CurrencyInfo, type RelativeTimeOptions,
  type ListFormatOptions, type UnitConversion, type MeasurementFormatOptions,
} from "./i18n-number";

// --- DOM Builder ---
export {
  DomBuilder,
  createElement, createFragment, createText, createComment, createSvgElement,
  builderToString, domDiff, applyPatches,
  escapeHtml as domEscapeHtml, unescapeHtml as domUnescapeHtml,
  type DomNode, type AttributeMap, type StyleMap, type EventMap,
  type BuilderOptions, type DomPatch, type DiffResult,
} from "./dom-builder";

// --- Virtual Scroller ---
export {
  VirtualScroller,
  type ScrollItem, type VisibleRange, type ScrollerConfig, type ScrollerState,
  type ScrollToOptions,
} from "./virtual-scroller";

// --- Color Utils ---
export {
  parseColor, requireColor, rgbToHex, hexToRgb, rgbToHsl, hslToRgb,
  rgbToHsv, hsvToHsl, toHexString, toRgbString, toHslString,
  lighten, darken, saturate, desaturate, rotateHue, setOpacity, mix, invert,
  luminance, contrastRatio, meetsAA, meetsAAA, contrastingText, minAlphaForContrast,
  generatePalette, complementary, analogous, triadic, splitComplementary, tetradic,
  generateScheme, linearGradient, radialGradient, gradientBetween, shimmerGradient,
  colorTemperature, isWarmColor, hueCategory,
  cssVariablesFromPalette, generateDesignTokens,
  type RGB, type HSL, type HSV, type ColorStop, type ColorPalette,
} from "./color-utils";

// --- Animation Timeline ---
export {
  AnimationTimeline, easings, createTimeline,
  type EasingFn, type TimelinePlaybackState, type Keyframe, type AnimationTrack,
  type TimelineLabel, type TimelineEvent, type TimelineOptions, type TimelineState,
} from "./animation-timeline";

// --- Undo/Redo History ---
export {
  UndoHistory,
  type UndoItem, type UndoBranch, type UndoHistoryOptions, type UndoState,
  type UndoChangeListener,
} from "./undo-redo";

// --- Reactive Store ---
export {
  ReactiveStore, createStore,
  loggerMiddleware, throttleMiddleware, immutabilityCheckMiddleware,
  type Listener, type Selector, type Middleware, type EqualityFn,
  type StoreAction, type StoreOptions, type ComputedConfig,
  type SubscriptionInfo, type StoreStats,
} from "./reactive-store";

// --- Markdown to HTML ---
export {
  mdToHtml, quickMd, stripMarkdown, extractToc,
  type MdToHtmlOptions, type MdToken, type ConvertResult,
} from "./markdown-to-html";

// --- Clipboard API ---
export {
  ClipboardAPI,
  requestClipboardPermission, copyToClipboard, readFromClipboard,
  copyElement, copyElementRich,
  type ClipboardFormat, type ClipboardItemData, type ClipboardResult,
  type ClipboardOptions, type ClipboardPermissionState, type ClipboardHistoryEntry,
} from "./clipboard-api";

// --- Drag and Drop ---
export {
  DragDropManager, getDragDropManager,
  type DragMode, type DropPosition, type DragItem, type DragOptions,
  type DropZoneOptions, type DropResult, type SortableConfig,
} from "./drag-and-drop";

// --- Keyboard Shortcuts ---
export {
  ShortcutManager, ShortcutRecorder, ShortcutOverlay,
  eventToCombo, normalizeKey, comboToString, parseCombo, comboMatches, comboHash,
  commonShortcuts,
  type KeyCombo, type ShortcutBinding, type ShortcutScope, type RecordedSequence,
} from "./keyboard-shortcuts";

// --- PDF Generator ---
export {
  PdfDocument, createPdf, quickPdf, htmlToPdf,
  type PdfOptions, type FontOptions, type CellOptions, type ImageOptions,
  type AnnotationOptions,
} from "./pdf-generator";

// --- QR Code ---
export {
  generateQrSvg, generateQrDataUri, generateQrCanvas, validateQrInput,
  type QrOptions,
} from "./qr-code";

// --- Avatar Generator ---
export {
  AvatarGenerator, generateAvatar, avatarDataUri, userAvatar,
  type AvatarShape, type AvatarStyle, type AvatarOptions, type AvatarResult,
  type GradientStop, type PatternConfig,
} from "./avatar-generator";

// --- Screen Capture ---
export {
  ScreenCapture,
  type CaptureSource, type CaptureFormat, type CaptureState,
  type CaptureOptions, type RegionSelection, type Annotation,
  type RecordingOptions, type CaptureResult,
} from "./screen-capture";

// --- Audio Processor ---
export {
  AudioProcessor,
  type AudioState, type AudioNodeChain, type AudioEffect,
  type VisualizationOptions, type AudioAnalysis, type RecordingOptions as AudioRecordingOptions,
} from "./audio-processor";

// --- File System ---
export {
  VirtualFileSystem,
  type VfsEntry, type FileType, type WatchEventType,
  type FileSystemOptions, type WatchEvent, type FileSystemStats,
  type SearchResult, type TreeViewNode,
} from "./file-system";

// --- Crypto Wallet ---
export {
  randomBytes, randomInt, randomHex,
  sha256, sha512, hmacSha256, pbkdf2,
  generateEd25519KeyPair, signEd25519, verifyEd25519,
  encrypt, decrypt,
  deriveAddress, deriveHDAddress,
  generateMnemonic, validateMnemonic, mnemonicToSeed,
  bytesToHex, hexToBase64, base64ToHex,
  type KeyPair, type WalletAddress, type Signature, type EncryptedData,
  type MnemonicWordlist, type HashResult,
} from "./crypto-wallet";

// --- OAuth Client ---
export {
  OAuthClient,
  PROVIDER_PRESETS,
  type OAuthProviderConfig, type OAuthToken, type OAuthSession,
  type OAuthFlow, type ResponseType, type GrantType, type OAuthOptions,
} from "./oauth-client";

// --- WebSocket Manager ---
export {
  WebSocketManager,
  type WsState, type WebSocketOptions, type WsMessage, type WsRequest,
  type RoomInfo, type PresenceEntry, type WsMetrics,
} from "./web-socket-manager";

// --- Template Engine ---
export {
  TemplateEngine,
  renderTemplate, createTemplateEngine, registerBuiltinHelpers,
  unescapeHtml,
  type TemplateContext, type TemplateOptions, type TemplateError,
  type PartialTemplate, type HelperFunction, type CronExpression,
} from "./template-engine";

// --- Scheduler ---
export {
  Scheduler,
  parseCronExpression, cronMatches, getNextCronRun,
  type ScheduledJob, type JobStatus,
} from "./scheduler";

// --- Notification System ---
export {
  NotificationCenter, PushNotificationManager,
  type Notification, type NotificationConfig,
  type NotificationType, type NotificationPriority,
} from "./notification-system";

// --- State Machine ---
export {
  FSM, HSM,
  createMachine, interpret, match, stateEquals,
  evaluateChoice, evaluateJunction,
  deepHistoryTarget, shallowHistoryTarget,
  type StateId, type EventId, type MachineContext, type EventPayload,
  type GuardFn, type ActionFn, type StateListener, type InvalidEventStrategy,
  type TransitionTarget, type TransitionDef, type StateConfig, type MachineConfig,
  type HistoryMode, type ChoiceConfig, type JunctionConfig,
  type StateValue, type TransitionHistoryEntry, type Service,
} from "./state-machine";

// --- Event Bus ---
export {
  EventBus, createEventBus,
  type EventCallback, type EventMiddleware, type Subscription,
  type EmittedEvent, type EventBusOptions,
} from "./event-bus";

// --- Rate Limiter ---
export {
  TokenBucketRateLimiter,
  SlidingWindowLogRateLimiter,
  SlidingWindowCounterRateLimiter,
  FixedWindowRateLimiter,
  LeakyBucketRateLimiter,
  AdaptiveRateLimiter,
  CircuitBreaker,
  Bulkhead,
  debounce, throttle,
  RequestCoalescer,
  PriorityQueue, Priority,
  DistributedRateLimiter,
  StatsCollector,
  createRateLimiter,
  type RateLimitResult, type BaseRateLimitConfig,
  type CircuitState, type CircuitBreakerConfig, type CircuitBreakerResult,
  type AdaptiveLimitResult, type AdaptiveLimiterOptions,
  type BulkheadConfig, type BulkheadResult,
  type ThrottleOptions,
  type RateLimiterStats, type StatsTrackable,
  type RateLimitStore, type DistributedRateLimiterConfig,
  type PriorityQueueOptions,
} from "./rate-limiter";

// --- Data Structures ---
export {
  LinkedList, DoublyLinkedList, Stack, Queue,
  BinaryHeap, Trie, LRUCache, BloomFilter, RingBuffer,
  type ListNode, type DListNode, type HeapEntry,
  type HeapType, type TrieNode, type LRUCacheEntry,
} from "./data-structures";

// --- Graph Utils ---
export {
  Graph, bfs, dfs, dfsRecursive,
  bfsShortestPath, dijkstra, dijkstraShortestPath,
  astar, topologicalSort, findConnectedComponents,
  hasCycle, findCycle, hasCycleUnionFind,
  UnionFind, primMST, mstTotalWeight, computeCentrality,
  type GraphNodeId, type GraphEdge, type GraphPath,
  type TraversalResult, type CentralityResult,
} from "./graph-utils";

// --- String Utils ---
export {
  isBlank, isPresent, collapseWhitespace, stripDiacritics,
  escapeRegex, escapeHtmlEntities, unescapeHtmlEntities,
  toCamelCaseString, toPascalCaseString, toKebabCaseString, toSnakeCaseString,
  capitalizeWords, smartTruncate, repeatWithSeparator, centerPad,
  isAscii, looksLikeEmail, looksLikeUrl, extractNumbers,
  replaceMultiple, stringToId, countOccurrences, reverseWords, trimLines,
  detectCase, slugify, levenshtein, isSimilar, soundex,
  randomString, randomHex, generateId,
  wordCount, charFrequency, mostCommonChars, uniqueWords,
  pluralize, singularize, acronym, abbreviate,
  maskString, maskEmail, detectIndentation, indentText,
  simpleDiff, type DiffSegment,
} from "./string-utils";

// --- Validation Utils ---
export {
  isString, isNumber, isInteger, isFiniteNumber,
  isObject, isArray, isValidDate, isBoolean,
  isFunction, isNil, isNotNil, isEmpty,
  isMap, isSet, isPromise,
  isEmail, isURL, isUUID, isUUIDv4,
  isHexColor, isIPv4, isIPv6, isIP,
  isMACAddress, isCreditCard, detectCardBrand,
  isPhoneNumber, isISODate, isISODateTime, isJSON,
  matchesPattern, isLength, isArraySize, inRange,
  isOneOf, every, some,
  validate, validateAsync,
  rules, assert, assertType,
  type ValidationResult, type ValidationError, type ValidationWarning,
  type ValidationRule, type FieldSchema, type ObjectSchema,
} from "./validation-utils";

// --- Math Utils ---
export {
  mean, median, mode, variance, stddev,
  covariance, correlation, linearRegression, percentile,
  Vec2, Vec3, Matrix,
  dist2D, dist3D, angleBetweenPoints,
  pointInPolygon, polygonArea, polygonCentroid, boundingBox, lineIntersection,
  lerp, clamp, mapRange, smoothStep,
  bezierQuad, bezierCubic, catmullRom,
  gcd, lcm, isPrime, sieveOfEratosthenes,
  factorial, fibonacci, fibonacciSequence,
  combinations, permutations, modPow,
  angle, temperature, length as lengthUnits, weight,
  randomNormal, randomUniform, randomInt, randomPick, shuffle, weightedRandom,
  type Vector2D, type Vector3D,
} from "./math-utils";

// --- Encoding Utils ---
export {
  base64Encode, base64Decode, base64UrlEncode, base64UrlDecode, base64Wrap,
  base32Encode, base32Decode,
  base58Encode, base58Decode,
  hexEncode, hexDecode, isHex,
  urlEncode, urlDecode, queryStringify, queryParse, parseUrl,
  normalizeUnicode, codePoints, isBMP, reverseUnicode,
  htmlEncode, htmlDecode,
  parseCSV, generateCSV,
  decodeBuffer, encodeBuffer, uint8ToBinaryString, binaryStringToUint8,
  decodeJWT, isJWTExpired, createUnsignedJWT,
  formatBytes, parseBytes,
  type JWTPayload, type DecodedJWT, type ParsedURL,
} from "./encoding-utils";

// --- DOM Observer ---
export {
  DomObserverManager,
  takeSnapshot, compareSnapshots,
  createRouteChangeDetector, createLazyLoader,
  type ObserveTarget, type MutationOptions, type IntersectionOptions,
  type ResizeOptions, type MutationRecordEx, type DomSnapshot,
  type ObserverCallbacks, type ObserverStats,
} from "./dom-observer";

// --- Storage Utils ---
export {
  StorageManager,
  createLocalStorage, createSessionStorage, createMemoryStore,
  type StorageBackend, type StorageEntry, type StorageOptions,
  type StorageStats, type StorageMigration,
} from "./storage-utils";

// --- Network Utils ---
export {
  getNetworkStatus, onNetworkChange, isSlowConnection, isDataSaverEnabled,
  fetchWithRetry, RequestQueue,
  syncWhenOnline, processOfflineQueue,
  BandwidthEstimator, ConnectionHealthChecker,
  type NetworkStatus, type RetryOptions, type RequestQueueItem,
} from "./network-utils";

// --- CSS Utils ---
export {
  cssVar, setCssVar, getCssVar,
  cssTransition, EASING_CSS, BREAKPOINTS,
  mediaQuery, matchesMedia, isAtLeast, isBelow,
  hexToRgb, rgbToHex, parseColor,
  mixColors, transparentize, lightenColor, darkenColor,
} from "./css-utils";

// --- Image Utils ---
export {
  getImageDimensions, loadImage, imageToCanvas,
  resizeImage, cropImage, applyFilters,
  convertFormat, generateThumbnail, compressImage,
  getDominantColor, getAverageColor, createCollage, addWatermark,
  detectOrientation, getAspectRatio,
  fileToDataUrl, fileToArrayBuffer, downloadImage,
  formatFileSize, isValidImageType, getExifOrientation,
  type ImageDimensions, type ImageProcessingOptions,
  type CropRegion, type FilterOptions,
} from "./image-utils";

// --- Accessibility Utils ---
export {
  setAria, getAria, setRole, setAccessibleName,
  hideFromScreenReader, showToScreenReader,
  getFocusableElements, focusFirst, focusLast, isFocusable,
  createFocusTrap, setupRovingTabindex,
  announce, announceAssertive,
  checkContrast, suggestTextColor,
  getHeadingHierarchy, validateHeadingHierarchy,
  findLandmarks, hasProperLandmarks,
  prefersReducedMotion, prefersHighContrast,
  prefersDarkMode, prefersLightMode, onPreferenceChange,
  createSkipLink, openAccessibleModal,
  type ContrastResult, type FocusableElement,
  type HeadingInfo, type LandmarkInfo,
} from "./accessibility-utils";

// --- i18n System ---
export {
  I18nEngine, initI18n, getI18n, t,
  parseLocale, getLocaleDirection, isSameLanguage, matchLocale,
  getBrowserLocales,
  getPluralForm,
  formatNumber, formatCurrency, formatPercent, formatCompact, formatBytes,
  formatDate, formatRelativeTime, formatDateRange,
  type Locale, type LocaleDirection, type PluralRule,
  type MessageCatalog, type Namespace, type I18nConfig,
  type InterpolationContext, type FormatOptions, type DateFormatOptions,
  type I18nStats,
} from "./i18n-system";

// --- Logger ---
export {
  Logger, log, apiLog, dbLog, extLog,
  setGlobalLogLevel, getGlobalLogLevel,
  type LogLevel,
} from "./logger";

// --- Performance Utils ---
export {
  PerfObserver,
  measureSync, measureAsync, perfMark, perfMeasure, measureBetween,
  FPSCounter, getMemoryUsage, getMemoryPercent, MemoryMonitor,
  LongTaskDetector,
  getNavigationTiming, collectWebVitals,
  getResourceTiming, findSlowResources, CustomMetric,
  type TimingResult, type MemoryUsage, type FPSStats,
  type WebVitals, type NavigationTiming,
} from "./performance-utils";

// --- File Download ---
export {
  downloadFile, saveBlob, revokeBlobUrl, downloadMultiple,
  DownloadQueue, createDraggableDownload,
  downloadText, downloadJSON, downloadCSV,
  readFileAsArrayBuffer, readAsText, readAsDataURL, createFileLink,
  type DownloadProgress, type DownloadOptions, type DownloadResult,
  type DownloadTask, type DownloadQueueOptions, type DownloadPriority,
} from "./file-download";

// --- Form Builder ---
export {
  FormBuilder, createForm, validations,
  type FieldType, type FieldValidation, type SelectOption,
  type FormField, type FormSection, type FormSchema,
  type FieldError, type FormState,
} from "./form-builder";

// --- Context Menu ---
export {
  ContextMenuManager,
  type ContextMenuItem, type ContextMenuPosition,
  type ContextMenuOptions, type ContextMenuInstance,
} from "./context-menu";

// --- Clipboard Utilities ---
export {
  copyToClipboard, copyRich, copyImage, copyFiles,
  readClipboardText, readClipboard, cutToClipboard,
  requestClipboardPermission, checkClipboardReadPermission, isClipboardSupported,
  selectAll, selectRange, clearSelection, getSelectedText, getSelectionTarget,
  ClipboardHistory, detectClipboardFormats, hasImageInClipboard, hasFilesInClipboard,
  copyWithFeedback, copySelection, onClipboardChange,
  type ClipboardData, type CopyOptions, type PasteOptions,
  type PasteResult, type ClipboardHistoryEntry, type ClipboardHistoryOptions,
} from "./clipboard-utils";

// --- Drag and Drop ---
export {
  DragDropManager, getDragDropManager,
  type DragMode, type DropPosition, type DragItem,
  type DragOptions, type DropZoneOptions, type DropResult,
  type SortableConfig,
} from "./drag-and-drop";

// --- Virtual Scroll ---
export {
  createVirtualScroll, createVirtualGrid,
  type VirtualScrollItem, type VirtualScrollOptions, type VirtualScrollState,
  type VirtualScrollController, type VirtualGridOptions, type VirtualGridState,
  type VirtualGridController,
} from "./virtual-scroll";

// --- Hotkeys ---
export {
  HotkeyManager, createAppHotkeys,
  parseKeyCombo, eventMatchesCombo, formatKeyDisplay,
  areModifiersDown, getModifierString,
  type HotkeyBinding, type HotkeyEvent, type HotkeyListener,
  type ParsedKeyCombo,
} from "./hotkeys";

// --- Undo/Redo ---
export {
  UndoHistory,
  type UndoItem, type UndoBranch, type UndoHistoryOptions,
  type UndoState, type UndoChangeListener,
} from "./undo-redo";

// --- Tooltip ---
export {
  TooltipManager, getTooltipManager, tooltip,
  type TooltipPlacement, type TooltipTrigger, type TooltipOptions,
  type TooltipInstance,
} from "./tooltip";

// --- Color Picker ---
export {
  hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex,
  parseColor, getLuminance, getContrastRatio, getWcagLevel, getContrastingText,
  complementary, analogous, triadic, splitComplementary, tetradic, monochromatic,
  blendColors, lighten, darken, saturate, desaturate, invertColor, withOpacity,
  generatePaletteAdvanced,
  type RgbColor, type HslColor, type Palette,
} from "./color-picker";

// --- Date Picker ---
export {
  DatePickerManager, createDatePicker,
  type DatePickerOptions, type DatePickerInstance,
} from "./date-picker";

// --- Modal ---
export {
  ModalManager, getModalManager, alertModal, confirmModal,
  type ModalSize, type ModalPlacement, type ModalOptions, type ModalInstance,
} from "./modal";

// --- Notification ---
export {
  NotificationManager, getNotificationManager, toast,
  type Notification, type NotificationOptions, type NotificationPosition,
  type NotificationType,
} from "./notification";

// --- Skeleton ---
export {
  createSkeleton, createTextSkeleton, createHeadingSkeleton,
  createAvatarSkeleton, createCardSkeleton, createTableSkeleton,
  wrapWithSkeleton,
  type SkeletonOptions, type SkeletonTextOptions,
  type SkeletonAvatarOptions, type SkeletonCardOptions, type SkeletonTableOptions,
} from "./skeleton";

// --- Avatar ---
export {
  createAvatar, createAvatarGroup, getInitials,
  type AvatarOptions, type AvatarGroupOptions,
  type AvatarSize, type AvatarShape,
} from "./avatar";

// --- Progress ---
export {
  createProgressTracker, createMultiProgressTracker, createStepProgress,
  formatProgress,
  type ProgressState, type ProgressCallback,
  type ProgressController, type MultiProgressController, type StepProgressController,
} from "./progress";

// --- Badge ---
export {
  createBadge, createPositionedBadge, createStatusDot,
  addDotBadge, addCountBadge,
  type BadgeOptions, type BadgeVariant, type BadgePosition, type BadgeSize,
  type StatusDotOptions,
} from "./badge";

// --- Tabs ---
export {
  TabsManager, createTabs,
  type TabItem, type TabsOptions, type TabsInstance,
  type TabOrientation, type TabVariant,
} from "./tabs";

// --- Accordion ---
export {
  AccordionManager, createAccordion,
  type AccordionItem, type AccordionOptions, type AccordionInstance,
  type AccordionMode,
} from "./accordion";

// --- Carousel ---
export {
  CarouselManager, createCarousel,
  type CarouselSlide, type CarouselOptions, type CarouselInstance,
} from "./carousel";

// --- Tree View ---
export {
  TreeView,
  type TreeNodeData, type TreeNode, type TreeViewConfig,
  type CheckMode,
} from "./tree-view";

// --- Command Palette ---
export {
  CommandPalette,
  type Command, type CommandCategory, type CommandPaletteConfig, type CommandPaletteState,
} from "./command-palette";

// --- Split Pane ---
export {
  createSplitPane,
  type SplitPaneOptions, type SplitPaneInstance,
  type SplitOrientation, type SplitCollapseDirection,
} from "./split-pane";

// --- Infinite Scroll ---
export {
  InfiniteScroll,
  type InfiniteScrollItem, type InfiniteScrollOptions, type InfiniteScrollState,
} from "./infinite-scroll";

// --- Markdown Renderer ---
export {
  parseMarkdown, renderToHtml, mdToHtml,
  generateToc, renderToc,
  extractFrontMatter, extractText, countWords, readingTime,
  type MdNode, type MdNodeType, type MdRenderOptions,
  type TocEntry, type FrontMatter,
} from "./markdown-renderer";

// --- Code Editor ---
export {
  CodeEditorManager, createCodeEditor,
  type CodeEditorOptions, type CodeEditorInstance,
} from "./code-editor";

// --- Chart Utils ---
export {
  calculateAxisScale, formatAxisLabel, valueToPixel, pixelToValue,
  aggregateByInterval, movingAverage, calculatePercentChanges, findExtrema,
  generateChartColors, interpolateColor, getDataStats,
  type DataPoint, type DataSeries, type ChartConfig,
  type AxisScale, type DataStats, type ColorPaletteName,
} from "./chart-utils";

// --- Resizable ---
export {
  makeResizable, createSplitPane,
  type ResizeOptions, type ResizeState, type ResizableController,
  type SplitPaneOptions, type SplitPaneController,
} from "./resizable";

// --- Anchor Positioning ---
export {
  computePosition, positionElement, createArrowStyles,
  type Placement, type Alignment, type VirtualElement, type Rect, type PositionResult,
} from "./anchor-positioning";

// --- Typeahead ---
export {
  TypeaheadManager, createTypeahead,
  type TypeaheadItem, type TypeaheadOptions, type TypeaheadInstance,
} from "./typeahead";

// --- Select ---
export {
  SelectManager, createSelect,
  type SelectOptions, type SelectOption, type SelectInstance,
} from "./select";

// --- Slider ---
export {
  SliderManager, createSlider,
  type SliderOptions, type SliderInstance, type SliderMark,
} from "./slider";

// --- Rating ---
export {
  RatingManager, createRating,
  type RatingOptions, type RatingInstance, type StarIconType,
} from "./rating";

// --- Pagination ---
export {
  PaginationManager, createPagination,
  type PaginationOptions, type PaginationInstance,
} from "./pagination";

// --- Stepper ---
export {
  StepperManager, createStepper,
  type StepperOptions, type StepperInstance, type StepConfig, type StepStatus,
} from "./stepper";

// --- Timeline ---
export {
  TimelineManager, createTimeline,
  type TimelineOptions, type TimelineInstance, type TimelineItem, type TimelineItemStatus,
} from "./timeline";

// --- Input Mask ---
export {
  InputMaskManager, createInputMask,
  type MaskOptions, type MaskInstance, type MaskType,
} from "./input-mask";

// --- Form Validation ---
export {
  FormValidator, createFormValidator,
  type FormValidationOptions, type FormValidatorInstance,
  type ValidationRule, type FieldConfig, type ValidationResult, type ValidationError,
  type ValidationContext,
  BuiltInRules,
} from "./form-validation";

// --- Tag Input ---
export {
  TagInputManager, createTagInput,
  type TagInputOptions, type TagInputInstance, type TagItem,
} from "./tag-input";

// --- Popover ---
export {
  PopoverManager, createPopover,
  type PopoverOptions, type PopoverInstance, type PopoverTrigger, type PopoverPlacement,
} from "./popover";

// --- Dropdown Menu ---
export {
  DropdownMenuManager, createDropdownMenu,
  type DropdownMenuOptions, type DropdownMenuInstance, type MenuItem, type MenuItemType,
} from "./dropdown-menu";

// --- Alert Banner ---
export {
  AlertManager, createAlert,
  type AlertOptions, type AlertInstance, type AlertSeverity,
} from "./alert-banner";

// --- Toast ---
export {
  ToastManager, getToastManager, showToast,
  type ToastOptions, type ToastInstance, type ToastType, type ToastPosition, type ToastManagerConfig,
} from "./toast";

// --- Image Cropper ---
export {
  ImageCropperManager, createImageCropper,
  type ImageCropperOptions, type ImageCropperInstance, type CropRegion, type AspectRatio,
} from "./image-cropper";

// --- File Upload ---
export {
  FileUploadManager, createFileUpload,
  type FileUploadOptions, type FileUploadInstance, type UploadFile,
} from "./file-upload";

// --- Table (Data Grid) ---
export {
  createTableState, getSortedData, getFilteredData, getPaginatedData,
  getCellValue, applyFilterOperator, toggleSort, setSearchTerm,
  toggleFilter, goToPage, setPageSize, toggleRowSelection,
  toggleSelectAll, toggleRowExpand, resetTable, exportTableAsCsv,
  type Column, type TableState, type SortState, type FilterState,
  type FilterOperator, type PaginationState, type SelectionState,
} from "./table";

// --- Empty State ---
export {
  EmptyStateManager, createEmptyState,
  type EmptyStateOptions, type EmptyStateInstance, type EmptyStateVariant,
} from "./empty-state";

// --- Loading Spinner ---
export {
  LoadingSpinnerManager, createLoadingSpinner,
  type LoadingSpinnerOptions, type SpinnerInstance, type SpinnerType, type SpinnerSize,
} from "./loading-spinner";

// --- Sidebar ---
export {
  SidebarManager, createSidebar,
  type SidebarOptions, type SidebarInstance, type SidebarItem, type SidebarGroup,
} from "./sidebar";

// --- Breadcrumb ---
export {
  BreadcrumbManager, createBreadcrumb,
  type BreadcrumbOptions, type BreadcrumbInstance, type BreadcrumbItem,
} from "./breadcrumb";

// --- Navbar ---
export {
  NavbarManager, createNavbar,
  type NavbarOptions, type NavbarInstance, type NavItem, type UserMenuConfig,
} from "./navbar";

// --- Overlay ---
export {
  OverlayProvider, openModal, openDrawer, openConfirm, openAlert, closeAllOverlays,
  type OverlayOptions, type OverlayInstance, type OverlayType,
} from "./overlay";

// --- Portal ---
export {
  createPortal, PortalManager, getPortalManager,
  type PortalOptions, type PortalInstance, type PortalTarget,
} from "./portal";

// --- Scroll Lock ---
export {
  ScrollLockManager, getScrollLockManager, lockScroll, withScrollLock, withScrollLockAsync, setupAutoResizeScrollLock,
  type ScrollLockOptions, type ScrollLockInstance,
} from "./scroll-lock";

// --- Focus Trap ---
export {
  FocusTrapManager, createFocusTrap, FocusTrapStack,
  type FocusTrapOptions, type FocusTrapInstance,
} from "./focus-trap";

// --- Animate ---
export {
  transition, stagger, springs, prefersReducedMotion,
} from "./animate";

// --- Gesture ---
export {
  GestureManager, createGesture, swipeGestures, tapGesture,
  type GestureConfig, type GestureInstance, type GestureEvent,
  type GestureType, type SwipeDirection, type Point, type GestureHandlerConfig,
} from "./gesture";

// --- i18n ---
export {
  t, getLocale, setLocale,
  type Locale,
  LOCALE_CHANGE_EVENT,
} from "./i18n";

// --- Theme ---
export {
  ThemeManager, getThemeManager, useTheme,
  LIGHT_THEME, DARK_THEME, BUILT_IN_THEMES,
  type ThemeConfig, type ThemeColors,
} from "./theme";

// --- Event Bus ---
export {
  EventBus, createEventBus,
  type EventBusOptions, type Subscription, type EmittedEvent,
  type EventCallback, type EventMiddleware,
} from "./event-bus";

// --- Intersection Observer ---
export {
  IntersectionManager, createIntersectionObserver,
  whenVisible, whenHidden, isInViewport, getVisibilityPercent,
  type IntersectionObserverOptions, type IntersectionObserverInstance,
  type IntersectionObserverEntry,
} from "./intersection";

// --- Mutation Observer ---
export {
  MutationWatcher, createMutationObserver,
  waitForElement, waitForRemoval,
  type MutationObserverOptions, type MutationObserverInstance,
  type SimplifiedMutationRecord, type MutationFilter,
} from "./mutation-observer";

// --- Resize Observer ---
export {
  ResizeWatcher, createResizeObserver,
  matchParentSize, whenSizeExceeds,
  type ResizeObserverOptions, type ResizeObserverInstance,
  type ResizeObserverEntry, type ResizeBox,
} from "./resize-observer";

// --- Performance Observer ---
export {
  PerformanceWatcher, createPerformanceObserver,
  measureAsync, measureSync, reportWebVitals, getPageLoadMetrics,
  type PerformanceObserverOptions, type PerformanceObserverInstance,
  type NormalizedPerformanceEntry, type CoreWebVitals,
  type ResourceTimingSummary, type PerformanceEntryType,
} from "./performance-observer";

// --- Clipboard ---
export {
  copyToClipboard, copyRichToClipboard,
  readFromClipboard, readRichFromClipboard,
  isClipboardAvailable, canReadClipboard, watchClipboard,
  type ClipboardData, type ClipboardOptions,
} from "./clipboard";

// --- Keyboard Shortcuts ---
export {
  KeyboardManager, createKeyboardManager,
  formatShortcut, matchesShortcut,
  type KeyBinding, type KeyChord, type KeyboardManagerOptions,
  type KeyboardManagerInstance,
} from "./keyboard";

// --- Network ---
export {
  NetworkManager, createNetworkManager,
  readConnectionInfo, parseQueryString, buildQueryString,
  buildUrl, parseContentRange, fetchWithTimeout,
  type NetworkStatus, type FetchOptions, type FetchResult,
  type QueuedRequest, type NetworkManagerOptions, type NetworkManagerInstance,
} from "./network";

// --- Print ---
export {
  PrintManager, createPrintManager,
  quickPrint, addPageBreakBefore, addPageBreakAfter, avoidBreakInside,
  type PrintOptions, type PrintManagerInstance,
} from "./print";

// --- Notification Permissions ---
export {
  NotificationPermissionManager, createNotificationManager,
  isSupported as isNotificationSupported,
  quickNotify, requestNotificationPermission,
  type NotificationOptions, type ScheduledNotification,
  type NotificationManagerOptions, type NotificationManagerInstance,
  type PermissionStatus,
} from "./notification-permissions";

// --- Biometrics / WebAuthn ---
export {
  BiometricManager, createBiometricManager,
  toBase64Url as credentialToBase64Url,
  fromBase64Url as base64UrlToCredential,
  type WebAuthnOptions, type AssertionOptions, type CredentialResult,
  type BiometricManagerOptions, type BiometricManagerInstance, type BiometricError,
  type AuthenticatorTransport, type UserVerification, type AttestationConveyance,
  type ResidentKeyRequirement,
} from "./biometrics";

// --- Share API ---
export {
  ShareManager, createShareManager,
  quickShare, isShareAvailable,
  type ShareData, type ShareOptions, type ShareTarget,
  type ShareManagerInstance,
} from "./share";

// --- Screen Orientation ---
export {
  ScreenOrientationManager, createScreenOrientation,
  isPortraitMode, isLandscapeMode,
  lockOrientation, unlockOrientation,
  type OrientationType, type OrientationLockType,
  type OrientationState, type ScreenOrientationOptions,
  type ScreenOrientationInstance,
} from "./screen-orientation";

// --- Vibration ---
export {
  VibrationManager, createVibrationManager,
  vibrate, vibratePreset, cancelVibration,
  type VibrationPreset, type VibrationPattern,
  type VibrationManagerOptions, type VibrationManagerInstance,
} from "./vibration";

// --- Speech Synthesis (TTS) ---
export {
  SpeechSynthesisManager, createSpeechSynthesisManager,
  speak as speakText,
  type VoiceInfo, type SpeechOptions, type SpeechManagerInstance,
} from "./speech-synthesis";

// --- Speech Recognition ---
export {
  SpeechRecognitionManager, createSpeechRecognition,
  recognizeOnce,
  type RecognitionResult, type RecognitionOptions,
  type SpeechRecognitionInstance,
} from "./speech-recognition";

// --- Fullscreen ---
export {
  FullscreenManager, createFullscreenManager, isSupported as isFullscreenSupported,
  type FullscreenState, type FullscreenOptions, type FullscreenError,
  type FullscreenErrorType, type FullscreenManagerInstance,
} from "./fullscreen";

// --- Media Query / Responsive ---
export {
  ResponsiveManager, createResponsiveManager,
  matchesQuery, getCurrentBreakpoint,
  type BreakpointName, type Breakpoint, type BreakpointConfig,
  type MediaQueryOptions, type MediaQueryInstance,
  type ResponsiveManagerInstance,
} from "./media-query";

// --- Color Scheme ---
export {
  ColorSchemeManager, createColorScheme,
  prefersDarkMode, hasForcedColors,
  type ColorScheme, type ContrastMode, type ColorSchemeState,
  type ColorSchemeOptions, type ColorSchemeInstance,
} from "./color-scheme";

// --- Persistent Storage ---
export {
  PersistentStorageManager, createPersistentStorage,
  type StorageBackend, type StorageItem, type PersistentStorageOptions,
  type PersistentStorageInstance,
} from "./storage-persistent";

// --- History Manager ---
export {
  HistoryManager, createHistoryManager,
  type HistoryState, type NavigationGuard,
  type HistoryManagerOptions, type HistoryManagerInstance,
} from "./history";

// --- Selection / Range API ---
export {
  SelectionManager, createSelectionManager,
  type SelectionRange, type CaretPosition,
  type SelectionManagerOptions, type SelectionManagerInstance,
} from "./selection";

// --- Drag & Drop File ---
export {
  DragDropFileManager, createDropZone,
  type FileValidationRule, type DroppedFile, type DropZoneOptions,
  type DropZoneInstance, type FileValidationError,
} from "./drag-and-drop-file";

// --- Context Menu ---
export {
  ContextMenuManager,
  type ContextMenuItem, type ContextMenuOptions, type ContextMenuInstance,
  type ContextMenuPosition,
} from "./context-menu";

// --- Tooltip ---
export {
  TooltipManager, getTooltipManager, tooltip,
  type TooltipOptions, type TooltipInstance,
  type TooltipPlacement, type TooltipTrigger,
} from "./tooltip";

// --- Command Palette ---
export {
  CommandPalette,
  type Command, type CommandCategory, type CommandPaletteConfig,
  type CommandPaletteState,
} from "./command-palette";

// --- Avatar ---
export {
  createAvatar, createAvatarGroup, getInitials,
  type AvatarOptions, type AvatarGroupOptions,
  type AvatarSize, type AvatarShape,
} from "./avatar";

// --- Hotkeys Display ---
export {
  HotkeyDisplayRenderer, renderHotkey, hotkeyHtml,
  type KeyCombo, type KeyDisplayStyle, type HotkeyDisplayOptions,
  type HotkeyDisplayInstance,
} from "./hotkeys-display";

// --- Virtual Scroller ---
export {
  VirtualScroller,
  type ScrollItem, type VisibleRange, type ScrollerConfig,
  type ScrollerState, type ScrollToOptions,
} from "./virtual-scroller";

// --- Infinite Scroll ---
export {
  InfiniteScroll,
  type InfiniteScrollItem, type InfiniteScrollOptions,
  type InfiniteScrollState,
} from "./infinite-scroll";

// --- Skeleton Loading ---
export {
  createSkeleton, createTextSkeleton, createHeadingSkeleton,
  createAvatarSkeleton, createCardSkeleton, createTableSkeleton,
  wrapWithSkeleton,
  type SkeletonOptions, type SkeletonTextOptions,
  type SkeletonAvatarOptions, type SkeletonCardOptions,
  type SkeletonTableOptions,
} from "./skeleton";

// --- Progress Bar ---
export {
  createProgressBar, createCircleProgress,
  type ProgressBarOptions, type CircleProgressOptions,
  type ProgressVariant, type ProgressSize,
} from "./progress-bar";

// --- Badge ---
export {
  createBadge, createPositionedBadge, createStatusDot,
  addDotBadge, addCountBadge,
  type BadgeOptions, type StatusDotOptions,
  type BadgeVariant, type BadgePosition, type BadgeSize,
} from "./badge";

// --- Divider ---
export {
  createDivider, hDivider, vDivider, labeledDivider, sectionDivider,
  type DividerOptions, type DividerOrientation, type DividerStyle,
} from "./divider";

// --- Accordion ---
export {
  AccordionManager, createAccordion,
  type AccordionItem, type AccordionOptions, type AccordionInstance,
  type AccordionMode,
} from "./accordion";

// --- Tabs ---
export {
  TabsManager, createTabs,
  type TabItem, type TabsOptions, type TabsInstance,
  type TabOrientation, type TabVariant,
} from "./tabs";

// --- Collapse ---
export {
  CollapseManager, createCollapse, createCollapseGroup,
  type CollapseOptions, type CollapseInstance,
  type CollapseSize, type CollapseVariant,
} from "./collapse";

// --- Pagination ---
export {
  PaginationManager, createPagination,
  type PaginationOptions, type PaginationInstance,
} from "./pagination";

// --- Breadcrumb ---
export {
  BreadcrumbManager, createBreadcrumb,
  type BreadcrumbItem, type BreadcrumbOptions, type BreadcrumbInstance,
} from "./breadcrumb";

// --- Tree View ---
export {
  TreeView,
  type TreeNodeData, type TreeNode, type CheckMode, type TreeViewConfig,
} from "./tree-view";

// --- Timeline ---
export {
  TimelineManager, createTimeline,
  type TimelineItem, type TimelineOptions, type TimelineInstance,
  type TimelineItemStatus,
} from "./timeline";

// --- Carousel ---
export {
  CarouselManager, createCarousel,
  type CarouselSlide, type CarouselOptions, type CarouselInstance,
} from "./carousel";

// --- Empty State ---
export {
  EmptyStateManager, createEmptyState,
  type EmptyStateOptions, type EmptyStateInstance, type EmptyStateVariant,
} from "./empty-state";

// --- Comment Thread ---
export {
  CommentThreadManager, createCommentThread,
  type CommentThreadOptions, type CommentThreadInstance,
  type Comment, type CommentAuthor,
} from "./comment-thread";

// --- Chat Bubble ---
export {
  ChatBubbleManager, createChatBubble,
  type ChatBubbleOptions, type ChatBubbleInstance,
  type ChatMessage, type MessageRole,
} from "./chat-bubble";

// --- Code Block ---
export {
  CodeBlockManager, createCodeBlock,
  type CodeBlockOptions, type CodeBlockInstance, type CodeTheme,
} from "./code-block";

// --- Markdown Renderer ---
export {
  parseMarkdown, renderToHtml, mdToHtml,
  generateToc, renderToc,
  extractFrontMatter, extractText, countWords, readingTime,
  type MdNode, type MdNodeType, type MdRenderOptions,
  type TocEntry, type FrontMatter,
} from "./markdown-renderer";

// --- Rating ---
export {
  RatingManager, createRating,
  type RatingOptions, type RatingInstance,
  type StarIconType,
} from "./rating";

// --- Steps ---
export {
  StepsManager, createSteps,
  type StepsOptions, type StepsInstance,
  type StepItem, type StepStatus, type StepsOrientation, type StepsVariant,
} from "./steps";

// --- Image Gallery ---
export {
  ImageGalleryManager, createImageGallery,
  type ImageGalleryOptions, type ImageGalleryInstance, type GalleryImage,
} from "./image-gallery";

// --- File Preview ---
export {
  FilePreviewManager, createFilePreview,
  type FilePreviewOptions, type FilePreviewInstance, type FileType,
} from "./file-preview";

// --- Statistic ---
export {
  StatManager, createStat,
  type StatOptions, type StatInstance,
  type TrendDirection, type StatVariant, type TrendColor,
} from "./statistic";

// --- Upload Zone ---
export {
  UploadZoneManager, createUploadZone,
  type UploadZoneOptions, type UploadZoneInstance,
  type FileValidationRule, type UploadedFile,
} from "./upload-zone";

// --- Notification Center ---
export {
  NotificationCenterManager, createNotificationCenter,
  type NotificationCenterOptions, type NotificationCenterInstance,
  type NotificationItem, type NotificationType,
} from "./notification-center";

// --- Search Highlight ---
export {
  SearchHighlightManager, createSearchHighlight,
  type SearchHighlightOptions, type SearchHighlightInstance,
} from "./search-highlight";

// --- Context Provider ---
export {
  createContext,
  ThemeContext, AuthContext, I18nContext, ResponsiveContext,
  createResponsiveProvider,
  type Context, type ContextOptions, type ProviderInstance,
  type ConsumerHandle, type ThemeContextValue, type AuthContextValue,
  type I18nContextValue, type ResponsiveContextValue,
} from "./context-provider";

// --- i18n ---
export {
  t, getLocale, setLocale, LOCALE_CHANGE_EVENT,
  type Locale,
} from "./i18n";

// --- Logger ---
export {
  Logger, log, apiLog, dbLog, extLog,
  setGlobalLogLevel, getGlobalLogLevel,
  type LogLevel,
} from "./logger";

// --- Virtual Keyboard ---
export {
  VirtualKeyboardManager, createVirtualKeyboard,
  type VirtualKeyboardOptions, type VirtualKeyboardInstance,
  type KeyboardLayout,
} from "./virtual-keyboard";

// --- Color Palette ---
export {
  ColorPaletteManager, createColorPalette,
  type ColorPaletteOptions, type ColorPaletteInstance,
  type ColorPalette, type PaletteColor, type ColorShade,
  type PaletteScheme, contrastRatio,
} from "./color-palette";

// --- QR Code ---
export {
  generateQrSvg, generateQrDataUri, generateQrCanvas, validateQrInput,
} from "./qr-code";

// --- Form Validator ---
export {
  FormValidator,
  required, minLength, maxLength, pattern, email, urlValidator,
  range, matchesField, asyncValidator, custom,
  type FieldValidationResult, type FormValidationResult,
  type FieldConfig, type FormValidatorOptions, type ValidatorFn,
} from "./form-validator";

// --- Table of Contents ---
export {
  TableOfContentsManager, createTableOfContents,
  type TableOfContentsOptions, type TocInstance, type TocEntry,
} from "./table-of-contents";

// --- Overlay ---
export {
  OverlayProvider, openModal, openDrawer, openConfirm, openAlert, closeAllOverlays,
  type OverlayOptions, type OverlayInstance, type OverlayType,
} from "./overlay";

// --- Countdown ---
export {
  CountdownManager, createCountdown,
  type CountdownOptions, type CountdownInstance,
  type CountdownSize, type CountdownVariant,
} from "./countdown";

// --- Marquee ---
export {
  MarqueeManager, createMarquee,
  type MarqueeOptions, type MarqueeInstance,
  type MarqueeDirection, type MarqueeStyle, type MarqueeItem,
} from "./marquee";

// --- Avatar Stack ---
export {
  AvatarStackManager, createAvatarStack,
  type AvatarStackOptions, type AvatarStackInstance,
  type AvatarStackSize, type AvatarStatus, type AvatarStackItem,
} from "./avatar-stack";

// --- Progress Bar ---
export {
  createProgressBar, createCircleProgress,
  type ProgressBarOptions, type CircleProgressOptions,
  type ProgressVariant, type ProgressSize,
} from "./progress-bar";

// --- Skeleton ---
export {
  createSkeleton, createTextSkeleton, createHeadingSkeleton,
  createAvatarSkeleton, createCardSkeleton, createTableSkeleton,
  wrapWithSkeleton,
  type SkeletonOptions, type SkeletonTextOptions,
  type SkeletonAvatarOptions, type SkeletonCardOptions,
  type SkeletonTableOptions,
} from "./skeleton";

// --- Tooltip ---
export {
  TooltipManager, getTooltipManager, tooltip,
  type TooltipOptions, type TooltipInstance,
  type TooltipPlacement, type TooltipTrigger,
} from "./tooltip";

// --- Badge ---
export {
  createBadge, createPositionedBadge, createStatusDot,
  addDotBadge, addCountBadge,
  type BadgeOptions, type StatusDotOptions,
  type BadgeVariant, type BadgePosition, type BadgeSize,
} from "./badge";

// --- Divider ---
export {
  createDivider, hDivider, vDivider, labeledDivider, sectionDivider,
  type DividerOptions, type DividerOrientation, type DividerStyle,
} from "./divider";

// --- Spinner ---
export {
  createSpinner, miniSpinner, fullPageSpinner,
  type SpinnerOptions, type SpinnerVariant, type SpinnerSize,
} from "./spinner";

// --- Alert ---
export {
  AlertManager, createAlert,
  type AlertOptions, type AlertInstance,
  type AlertVariant, type AlertSize, type AlertAction,
} from "./alert";

// --- Toggle ---
export {
  ToggleManager, createToggle,
  type ToggleOptions, type ToggleInstance,
  type ToggleSize, type ToggleVariant,
} from "./toggle";

// --- Slider ---
export {
  SliderManager, createSlider,
  type SliderOptions, type SliderInstance, type SliderMark,
} from "./slider";

// --- Select ---
export {
  SelectManager, createSelect,
  type SelectOptions, type SelectInstance, type SelectOption,
} from "./select";

// --- Checkbox & Radio ---
export {
  createCheckbox, createRadio, createCheckboxGroup,
  type CheckboxOptions, type CheckboxInstance,
  type RadioOptions, type RadioInstance,
  type CheckboxGroupOptions, type CheckboxGroupInstance,
  type CheckboxSize, type CheckboxVariant,
} from "./checkbox";

// --- Input Field ---
export {
  createInputField,
  type InputFieldOptions, type InputInstance,
  type InputVariant, type InputSize, type InputState,
} from "./input-field";

// --- Button ---
export {
  createButton, createButtonGroup,
  type ButtonOptions, type ButtonGroupOptions, type ButtonGroupInstance,
  type ButtonVariant, type ButtonSize,
} from "./button";

// --- Card ---
export {
  createCard,
  type CardOptions, type CardInstance,
  type CardVariant, type CardSize, type CardHeaderOptions, type CardImageOptions,
} from "./card";

// --- Modal ---
export {
  createModal,
  type ModalOptions, type ModalInstance,
  type ModalSize, type ModalPosition,
} from "./modal";

// --- Drawer ---
export {
  createDrawer,
  type DrawerOptions, type DrawerInstance, type DrawerSide, type DrawerSize,
} from "./drawer";

// --- Popover ---
export {
  PopoverManager, createPopover,
  type PopoverOptions, type PopoverInstance,
  type PopoverTrigger, type PopoverPlacement,
} from "./popover";

// --- Dropdown Menu ---
export {
  DropdownMenuManager, createDropdownMenu,
  type DropdownMenuOptions, type DropdownMenuInstance, type MenuItem, type MenuItemType,
} from "./dropdown-menu";

// --- Toast ---
export {
  ToastManager, getToastManager, showToast,
  type ToastOptions, type ToastInstance, type ToastType,
  type ToastPosition, type ToastManagerConfig,
} from "./toast";

// --- Command Palette ---
export {
  CommandPalette,
  type Command, type CommandPaletteConfig, type CommandPaletteState,
} from "./command-palette";

// --- Masonry ---
export {
  MasonryManager, createMasonry,
  type MasonryOptions, type MasonryInstance, type MasonryItem,
} from "./masonry";

// --- Scroll Progress ---
export {
  createScrollProgress,
  type ScrollProgressOptions, type ScrollProgressInstance,
  type ProgressBarPosition, type ProgressBarVariant,
} from "./scroll-progress";

// --- Back to Top ---
export {
  createBackToTop,
  type BackToTopOptions, type BackToTopInstance,
  type BttPosition, type BttSize, type BttShape,
} from "./back-to-top";

// --- Sticky Header ---
export {
  createStickyHeader,
  type StickyHeaderOptions, type StickyHeaderInstance,
  type StickyBehavior, type StickyShadow,
} from "./sticky-header";

// --- Infinite Scroll ---
export {
  InfiniteScroll,
  type InfiniteScrollOptions, type InfiniteScrollState, type InfiniteScrollItem,
} from "./infinite-scroll";

// --- Pull to Refresh ---
export {
  createPullToRefresh,
  type PullToRefreshOptions, type PullToRefreshInstance,
} from "./pull-to-refresh";

// --- Virtual List ---
export {
  createVirtualList,
  type VirtualListOptions, type VirtualListInstance, type VirtualListItem,
} from "./virtual-list";

// --- Hotkeys ---
export {
  HotkeyManager, createAppHotkeys,
  parseKeyCombo, eventMatchesCombo, formatKeyDisplay,
  areModifiersDown, getModifierString,
  type HotkeyBinding, type HotkeyEvent, type HotkeyListener, type ParsedKeyCombo,
} from "./hotkeys";

// --- Clipboard ---
export {
  copyToClipboard, copyRichToClipboard, readFromClipboard, readRichFromClipboard,
  isClipboardAvailable, canReadClipboard, watchClipboard,
  type ClipboardData, type ClipboardOptions,
} from "./clipboard";

// --- Print ---
export {
  PrintManager, createPrintManager, quickPrint,
  addPageBreakBefore, addPageBreakAfter, avoidBreakInside,
  type PrintOptions, type PrintManagerInstance,
} from "./print";

// --- Anchor Nav ---
export {
  createAnchorNav,
  type AnchorLink, type AnchorNavOptions, type AnchorNavInstance,
} from "./anchor-nav";

// --- Feature Tour ---
export {
  FeatureTourManager, createFeatureTour,
  type TourStep, type TourOptions, type TourInstance,
} from "./feature-tour";

// --- Notification Bell ---
export {
  createNotificationBell,
  type NotificationItem, type NotificationBellOptions, type NotificationBellInstance,
} from "./notification-bell";

// --- Tabs ---
export {
  TabsManager, createTabs,
  type TabItem, type TabOptions as TabsOptions, type TabInstance,
  type TabOrientation, type TabVariant,
} from "./tabs";

// --- Accordion ---
export {
  AccordionManager, createAccordion,
  type AccordionItem, type AccordionOptions, type AccordionInstance,
  type AccordionMode,
} from "./accordion";

// --- Pagination ---
export {
  PaginationManager, createPagination,
  type PaginationOptions, type PaginationInstance,
} from "./pagination";

// --- Breadcrumb ---
export {
  BreadcrumbManager, createBreadcrumb,
  type BreadcrumbItem, type BreadcrumbOptions, type BreadcrumbInstance,
} from "./breadcrumb";

// --- Rating ---
export {
  RatingManager, createRating,
  type RatingOptions, type RatingInstance,
  type StarIconType,
} from "./rating";

// --- Tree View ---
export {
  TreeView,
  type TreeNodeData, type TreeNode, type CheckMode, type TreeViewConfig,
} from "./tree-view";

// --- Timeline ---
export {
  TimelineManager, createTimeline,
  type TimelineItem, type TimelineOptions, type TimelineInstance,
  type TimelineItemStatus,
} from "./timeline";

// --- Carousel ---
export {
  CarouselManager, createCarousel,
  type CarouselSlide, type CarouselOptions, type CarouselInstance,
} from "./carousel";

// --- Color Picker ---
export {
  hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, parseColor,
  getLuminance, getContrastRatio, getWcagLevel, getContrastingText,
  complementary, analogous, triadic, splitComplementary, tetradic, monochromatic,
  blendColors, lighten, darken, saturate, desaturate, invertColor, withOpacity,
  generatePaletteAdvanced,
  type RgbColor, type HslColor, type Palette,
} from "./color-picker";

// --- File Upload ---
export {
  FileUploadManager, createFileUpload,
  type FileUploadOptions, type FileUploadInstance, type UploadFile,
} from "./file-upload";

// --- QR Code ---
export {
  generateQrSvg, generateQrDataUri, generateQrCanvas, validateQrInput,
} from "./qr-code";

// --- Signature Pad ---
export {
  SignaturePadManager, createSignaturePad,
  type SignaturePadOptions, type SignaturePadInstance,
  type StrokePoint, type Stroke,
} from "./signature-pad";

// --- Markdown Renderer ---
export {
  parseMarkdown, renderToHtml, mdToHtml,
  generateToc, renderToc, extractFrontMatter, extractText, countWords, readingTime,
  type MdNode, type MdNodeType, type MdRenderOptions, type TocEntry, type FrontMatter,
} from "./markdown-renderer";

// --- Code Highlighter ---
export {
  highlight, highlightToHtml, detectCodeLanguage, registerLanguage,
  themes,
  type Language as HighlightLanguage, type Theme, type HighlightToken, type HighlightOptions, type HighlightResult,
} from "./code-highlighter";

// --- Image Gallery ---
export {
  ImageGalleryManager, createImageGallery,
  type GalleryImage, type ImageGalleryOptions, type ImageGalleryInstance,
} from "./image-gallery";

// --- Data Table ---
export {
  DataTableManager, createDataTable,
  type Column, type DataTableOptions, type DataTableInstance,
  type SortDirection, type SortState, type FilterState,
} from "./data-table";

// --- Form Builder ---
export {
  FormBuilder, createForm, validations,
  type FormField, type FormSchema, type FormSection, type FieldType,
  type SelectOption, type FieldValidation, type FormState, type FieldError,
} from "./form-builder";

// --- Search Autocomplete ---
export {
  AutocompleteManager, createAutocomplete,
  type SuggestionItem, type AutocompleteOptions, type AutocompleteInstance,
} from "./search-autocomplete";

// --- Context Menu ---
export {
  ContextMenuManager,
  type ContextMenuItem, type ContextMenuOptions, type ContextMenuInstance,
  type ContextMenuPosition,
} from "./context-menu";

// --- Modal Manager ---
export {
  ModalManager, getModalManager,
  type ModalOptions, type ModalInstance, type ModalAction, type ConfirmOptions,
  type ModalSize, type ModalAnimation,
} from "./modal-manager";

// --- Toast Manager ---
export {
  ToastManagerClass, createToastManager, getToastManager,
  type ToastOptions, type Toast, type ToastAction,
  type ToastType, type ToastPosition, type ToastManagerOptions, type ToastManagerInstance,
} from "./toast-manager";

// --- Split Pane ---
export {
  createSplitPane,
  type SplitPaneOptions, type SplitPaneInstance,
  type SplitOrientation, type SplitCollapseDirection,
} from "./split-pane";

// --- Resizable ---
export {
  makeResizable, createSplitPane as createSplitPaneAlt,
  type ResizeOptions, type ResizeState, type ResizableController,
} from "./resizable";

// --- Drag & Drop ---
export {
  createDropZone, readFileAsText, readFileAsDataURL, readFileAsArrayBuffer, getFileInfo,
  createSortableList,
  type DragItem, type DropZoneConfig, type DndState, type DropZoneController,
  type SortableItem, type SortableConfig, type SortableController, type FileInfo,
} from "./drag-drop";

// --- Step Wizard ---
export { StepWizardManager, createStepWizard } from "./step-wizard";
export type { WizardStep, WizardOptions, WizardInstance } from "./step-wizard";

// --- Stats Card ---
export { StatsCardManager, createStatsCard } from "./stats-card";
export type { StatsCardOptions, StatsCardInstance, TrendDirection, StatsVariant, SparklinePoint } from "./stats-card";

// --- Waterfall / Pipeline ---
export { runPipeline, parallel, waterfall, raceWithCleanup } from "./waterfall";
export type { PipelineStep, PipelineContext, PipelineResult } from "./waterfall";

// --- Command Palette ---
export { CommandPalette } from "./command-palette";
export type { Command, CommandPaletteConfig, CommandPaletteState, CommandCategory } from "./command-palette";

// --- Virtual Scroller ---
export { VirtualScroller } from "./virtual-scroller";
export type { ScrollItem, VisibleRange, ScrollerConfig, ScrollerState, ScrollToOptions } from "./virtual-scroller";

// --- Infinite Scroll ---
export { InfiniteScroll } from "./infinite-scroll";
export type { InfiniteScrollItem, InfiniteScrollOptions, InfiniteScrollState } from "./infinite-scroll";

// --- Skeleton ---
export { createSkeleton, createTextSkeleton, createHeadingSkeleton, createAvatarSkeleton, createCardSkeleton, createTableSkeleton, wrapWithSkeleton } from "./skeleton";
export type { SkeletonOptions, SkeletonTextOptions, SkeletonAvatarOptions, SkeletonCardOptions, SkeletonTableOptions } from "./skeleton";

// --- Avatar ---
export { createAvatar, createAvatarGroup, getInitials } from "./avatar";
export type { AvatarOptions, AvatarGroupOptions, AvatarSize, AvatarShape } from "./avatar";

// --- Badge ---
export { createBadge, createPositionedBadge, createStatusDot, addDotBadge, addCountBadge } from "./badge";
export type { BadgeOptions, BadgeVariant, BadgePosition, BadgeSize, StatusDotOptions } from "./badge";

// --- Tooltip ---
export { TooltipManager, getTooltipManager, tooltip } from "./tooltip";
export type { TooltipOptions, TooltipInstance, TooltipPlacement, TooltipTrigger } from "./tooltip";

// --- Popover ---
export { PopoverManager, createPopover } from "./popover";
export type { PopoverOptions, PopoverInstance, PopoverTrigger, PopoverPlacement } from "./popover";

// --- Progress ---
export { createProgressTracker, createMultiProgressTracker, createStepProgress, formatProgress } from "./progress";
export type { ProgressState, ProgressCallback, ProgressController, MultiProgressController, StepProgressController } from "./progress";

// --- Alert ---
export { AlertManager, createAlert } from "./alert";
export type { AlertOptions, AlertInstance, AlertVariant, AlertSize, AlertAction } from "./alert";

// --- Empty State ---
export { EmptyStateManager, createEmptyState } from "./empty-state";
export type { EmptyStateOptions, EmptyStateInstance, EmptyStateVariant } from "./empty-state";

// --- Divider ---
export { createDivider, hDivider, vDivider, labeledDivider, sectionDivider } from "./divider";
export type { DividerOptions, DividerOrientation, DividerStyle } from "./divider";

// --- Switch ---
export { createSwitch } from "./switch";
export type { SwitchOptions, SwitchInstance, SwitchSize, SwitchVariant } from "./switch";

// --- Checkbox & Radio ---
export { createCheckbox, createRadio, createCheckboxGroup } from "./checkbox";
export type { CheckboxOptions, CheckboxInstance, RadioOptions, RadioInstance, CheckboxGroupOptions, CheckboxGroupInstance, CheckboxSize, CheckboxVariant } from "./checkbox";

// --- Input ---
export { createInput } from "./input";
export type { InputOptions, InputInstance, InputSize, InputVariant, InputState } from "./input";

// --- Textarea ---
export { createTextarea } from "./textarea";
export type { TextareaOptions, TextareaInstance, TextareaSize, TextareaState } from "./textarea";

// --- Select ---
export { SelectManager, createSelect } from "./select";
export type { SelectOptions, SelectInstance, SelectOption } from "./select";

// --- Button ---
export { createButton, createButtonGroup } from "./button";
export type { ButtonOptions, ButtonGroupOptions, ButtonGroupInstance, ButtonVariant, ButtonSize } from "./button";

// --- Card ---
export { createCard } from "./card";
export type { CardOptions, CardInstance, CardVariant, CardSize, CardHeaderOptions, CardImageOptions } from "./card";

// --- List ---
export { createList } from "./list";
export type { ListOptions, ListInstance, ListItem, ListSelectionMode, ListVariant } from "./list";

// --- Drawer ---
export { createDrawer } from "./drawer";
export type { DrawerOptions, DrawerInstance, DrawerSide, DrawerSize } from "./drawer";

// --- Sheet ---
export { createSheet } from "./sheet";
export type { SheetOptions, SheetInstance, SheetSnapPoint } from "./sheet";

// --- Dialog ---
export { createDialog, alertDialog, confirmDialog, dangerDialog } from "./dialog";
export type { DialogOptions, DialogInstance, DialogVariant } from "./dialog";

// --- Date Picker ---
export { DatePickerManager, createDatePicker } from "./date-picker";
export type { DatePickerOptions, DatePickerInstance } from "./date-picker";

// --- Time Picker ---
export { createTimePicker } from "./time-picker";
export type { TimePickerOptions, TimePickerInstance, TimeFormat, TimePickerMode } from "./time-picker";

// --- Slider ---
export { SliderManager, createSlider } from "./slider";
export type { SliderOptions, SliderInstance, SliderMark } from "./slider";

// --- KBD (Keyboard) ---
export { createKbd } from "./kbd";
export type { KbdOptions, KbdSize, KbdStyle } from "./kbd";

// --- Chip ---
export { createChip, createChipGroup } from "./chip";
export type { ChipOptions, ChipInstance, ChipGroupOptions, ChipGroupInstance, ChipSize, ChipVariant } from "./chip";

// --- Stepper ---
export { StepperManager, createStepper } from "./stepper";
export type { StepperOptions, StepperInstance, StepConfig, StepStatus } from "./stepper";

// --- Navbar ---
export { NavbarManager, createNavbar } from "./navbar";
export type { NavItem, UserMenuConfig, NavbarOptions, NavbarInstance } from "./navbar";

// --- Sidebar ---
export { SidebarManager, createSidebar } from "./sidebar";
export type { SidebarItem, SidebarGroup, SidebarOptions, SidebarInstance } from "./sidebar";

// --- Breadcrumb ---
export { BreadcrumbManager, createBreadcrumb } from "./breadcrumb";
export type { BreadcrumbItem, BreadcrumbOptions, BreadcrumbInstance } from "./breadcrumb";

// --- Tabs ---
export { TabsManager, createTabs } from "./tabs";
export type { TabItem, TabOrientation, TabVariant, TabsOptions, TabsInstance } from "./tabs";

// --- Accordion ---
export { AccordionManager, createAccordion } from "./accordion";
export type { AccordionItem, AccordionMode, AccordionOptions, AccordionInstance } from "./accordion";

// --- Carousel ---
export { CarouselManager, createCarousel } from "./carousel";
export type { CarouselSlide, CarouselOptions, CarouselInstance } from "./carousel";

// --- Table ---
export {
  createTableState,
  getSortedData,
  getFilteredData,
  getPaginatedData,
  getCellValue,
  applyFilterOperator,
  toggleSort,
  setSearchTerm,
  toggleFilter,
  goToPage,
  setPageSize,
  toggleRowSelection,
  toggleSelectAll,
  toggleRowExpand,
  resetTable,
  exportTableAsCsv,
} from "./table";
export type {
  Column,
  TableState,
  SortState,
  FilterState,
  FilterOperator,
  PaginationState,
  SelectionState,
} from "./table";

// --- Tree View ---
export { TreeView } from "./tree-view";
export type {
  TreeNodeData,
  TreeNode,
  CheckMode,
  TreeViewConfig,
} from "./tree-view";

// --- Timeline ---
export { TimelineManager, createTimeline } from "./timeline";
export type {
  TimelineItem,
  TimelineItemStatus,
  TimelineOptions,
  TimelineInstance,
} from "./timeline";

// --- Rating ---
export { RatingManager, createRating } from "./rating";
export type { StarIconType, RatingOptions, RatingInstance } from "./rating";

// --- Avatar Group ---
export { AvatarGroupManager, createAvatarGroup } from "./avatar-group";
export type {
  AvatarItem,
  AvatarSize,
  StackDirection,
  AvatarGroupOptions,
  AvatarGroupInstance,
} from "./avatar-group";

// --- Notification Toast ---
export {
  ToastManager,
  getToastManager,
  showToast,
  toastSuccess,
  toastError,
  toastWarning,
  toastInfo,
} from "./notification-toast";
export type {
  ToastType,
  ToastPosition,
  ToastOptions,
  ToastInstance,
  ToastAction,
  ToastManagerOptions,
} from "./notification-toast";

// --- Context Menu ---
export { ContextMenuManager } from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";

// --- Modal ---
export { createModal } from "./modal";
export type { ModalSize, ModalPosition, ModalOptions, ModalInstance } from "./modal";

// --- Color Picker ---
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type { RgbColor, HslColor, Palette } from "./color-picker";

// --- Dropzone ---
export { DropzoneManager, createDropzone } from "./dropzone";
export type { DropzoneFile, DropzoneOptions, DropzoneInstance, FileValidationRule, FileValidationError } from "./dropzone";

// --- Pagination ---
export { PaginationManager, createPagination } from "./pagination";
export type { PaginationOptions, PaginationInstance } from "./pagination";

// --- Search Input ---
export { SearchInputManager, createSearchInput } from "./search-input";
export type { SuggestionItem, SearchHistoryEntry, SearchInputOptions, SearchInputInstance } from "./search-input";

// --- File Tree ---
export { FileManager, createFileTree } from "./file-tree";
export type { FileTreeNode, FileType, FileTreeOptions, FileTreeInstance } from "./file-tree";

// --- Markdown Renderer ---
export {
  parseMarkdown,
  renderToHtml,
  generateToc,
  renderToc,
  extractFrontMatter,
  extractText,
  countWords,
  readingTime,
  mdToHtml,
} from "./markdown-renderer";
export type {
  MdNode,
  MdNodeType,
  MdRenderOptions,
  TocEntry,
  FrontMatter,
} from "./markdown-renderer";

// --- Code Editor ---
export { CodeEditorManager, createCodeEditor } from "./code-editor";
export type { CodeEditorOptions, CodeEditorInstance } from "./code-editor";

// --- Form Builder ---
export { FormBuilder, createForm, validations } from "./form-builder";
export type {
  FieldType,
  FormField,
  FormSection,
  FormSchema,
  FieldValidation,
  SelectOption,
  FieldError,
  FormState,
} from "./form-builder";

// --- Data Grid ---
export { DataGridManager, createDataGrid } from "./data-grid";
export type {
  GridColumn,
  GridRow,
  GridGrouping,
  GridOptions,
  DataGridInstance,
} from "./data-grid";

// --- Chart ---
export { ChartManager, createChart } from "./chart";
export type {
  ChartType,
  ChartDataPoint,
  ChartDataset,
  ChartOptions,
  ChartInstance,
} from "./chart";

// --- Kanban ---
export { KanbanManager, createKanban } from "./kanban";
export type {
  KanbanCard,
  KanbanColumn,
  KanbanSwimlane,
  KanbanLabel,
  CardPriority,
  CardSize,
  KanbanOptions,
  KanbanInstance,
} from "./kanban";

// --- Calendar ---
export { CalendarManager, createCalendar } from "./calendar";
export type {
  CalendarView,
  WeekStartDay,
  CalendarEvent,
  CalendarOptions,
  CalendarInstance,
} from "./calendar";

// --- Command Menu ---
export { CommandMenuManager, createCommandMenu } from "./command-menu";
export type {
  CommandItem,
  CommandCategory,
  CommandMenuOptions,
  CommandMenuInstance,
} from "./command-menu";

// --- Split Pane ---
export { createSplitPane } from "./split-pane";
export type { SplitOrientation, SplitCollapseDirection, SplitPaneOptions, SplitPaneInstance } from "./split-pane";

// --- Resizable ---
export { makeResizable, createSplitPane as createSplitPaneAlt } from "./resizable";
export type { ResizeOptions, ResizeState, ResizableController } from "./resizable";

// --- Tour Guide ---
export { TourManager, createTour } from "./tour-guide";
export type { TourStep, TourOptions, TourInstance } from "./tour-guide";

// --- Notification Bell ---
export { createNotificationBell } from "./notification-bell";
export type {
  NotificationItem,
  NotificationBellOptions,
  NotificationBellInstance,
} from "./notification-bell";

// --- Feature Tour ---
export { FeatureTourManager, createFeatureTour } from "./feature-tour";
export type {
  TourStep as FeatureTourStep,
  TourOptions as FeatureTourOptions,
  TourInstance as FeatureTourInstance,
} from "./feature-tour";

// --- Anchor Nav ---
export { createAnchorNav } from "./anchor-nav";
export type {
  AnchorLink,
  AnchorNavOptions,
  AnchorNavInstance,
} from "./anchor-nav";

// --- Tooltip ---
export { TooltipManager, getTooltipManager, tooltip } from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";

// --- Popover ---
export { PopoverManager, createPopover } from "./popover";
export type {
  PopoverTrigger,
  PopoverPlacement,
  PopoverOptions,
  PopoverInstance,
} from "./popover";

// --- Drawer ---
export { createDrawer } from "./drawer";
export type {
  DrawerSide,
  DrawerSize,
  DrawerOptions,
  DrawerInstance,
} from "./drawer";

// --- Skeleton Loader ---
export { createSkeleton } from "./skeleton-loader";
export type {
  SkeletonShape,
  SkeletonAnimation,
  SkeletonItem,
  SkeletonOptions,
  SkeletonInstance,
} from "./skeleton-loader";

// --- Empty State ---
export { EmptyStateManager, createEmptyState } from "./empty-state";
export type {
  EmptyStateVariant,
  EmptyStateOptions,
  EmptyStateInstance,
} from "./empty-state";

// --- Back to Top ---
export { createBackToTop } from "./back-to-top";
export type {
  BttPosition,
  BttSize,
  BttShape,
  BackToTopOptions,
  BackToTopInstance,
} from "./back-to-top";

// --- Infinite Scroll ---
export { InfiniteScroll } from "./infinite-scroll";
export type {
  InfiniteScrollItem,
  InfiniteScrollOptions,
  InfiniteScrollState,
} from "./infinite-scroll";

// --- Reading Progress ---
export { createReadingProgress } from "./reading-progress";
export type {
  ProgressColor,
  ProgressSize,
  ProgressPosition,
  ReadingProgressOptions,
  ReadingProgressInstance,
} from "./reading-progress";

// --- Sticky Header ---
export { createStickyHeader } from "./sticky-header";
export type {
  StickyBehavior,
  StickyShadow,
  StickyHeaderOptions,
  StickyHeaderInstance,
} from "./sticky-header";

// --- Comment Thread ---
export { CommentThreadManager, createCommentThread } from "./comment-thread";
export type {
  CommentAuthor,
  Comment,
  CommentThreadOptions,
  CommentThreadInstance,
} from "./comment-thread";

// --- Activity Feed ---
export { ActivityFeedManager, createActivityFeed } from "./activity-feed";
export type {
  ActivityType,
  ActivityGroupBy,
  FeedDensity,
  ActivityItem,
  ActivityFeedOptions,
  ActivityFeedInstance,
} from "./activity-feed";

// --- Stats Overview ---
export { StatsOverviewManager, createStatsOverview } from "./stats-overview";
export type {
  TrendDirection,
  StatCardSize,
  TrendData,
  SparklinePoint,
  StatCard,
  StatsOverviewOptions,
  StatsOverviewInstance,
} from "./stats-overview";

// --- Filter Bar ---
export { createFilterBar } from "./filter-bar";
export type {
  FilterType,
  FilterOption,
  FilterDefinition,
  FilterState,
  FilterBarOptions,
  FilterBarInstance,
} from "./filter-bar";

// --- Badge List ---
export { createBadgeList } from "./badge-list";
export type {
  BadgeColor,
  BadgeSize,
  BadgeItem,
  BadgeListOptions,
  BadgeListInstance,
} from "./badge-list";

// --- Toggle Group ---
export { createToggleGroup } from "./toggle-group";
export type {
  ToggleSize,
  ToggleVariant,
  ToggleOption,
  ToggleGroupOptions,
  ToggleGroupInstance,
} from "./toggle-group";

// --- Image Gallery ---
export { ImageGalleryManager, createImageGallery } from "./image-gallery";
export type {
  GalleryImage,
  ImageGalleryOptions,
  ImageGalleryInstance,
} from "./image-gallery";

// --- QR Code ---
export { generateQrSvg, generateQrDataUri, generateQrCanvas, validateQrInput } from "./qr-code";
export type { QrOptions } from "./qr-code";

// --- Signature Pad ---
export { SignaturePadManager, createSignaturePad } from "./signature-pad";
export type {
  StrokePoint,
  Stroke,
  SignaturePadOptions,
  SignaturePadInstance,
} from "./signature-pad";

// --- Mention Input ---
export { createMentionInput } from "./mention-input";
export type {
  MentionUser,
  MentionOptions,
  MentionInputInstance,
} from "./mention-input";

// --- Color Palette ---
export { ColorPaletteManager, createColorPalette, contrastRatio } from "./color-palette";
export type {
  PaletteScheme,
  ColorShade,
  PaletteColor,
  ColorPalette,
  ColorPaletteOptions,
  ColorPaletteInstance,
} from "./color-palette";

// --- Slider ---
export { SliderManager, createSlider } from "./slider";
export type {
  SliderMark,
  SliderOptions,
  SliderInstance,
} from "./slider";

// --- Virtual Scroller ---
export { VirtualScroller } from "./virtual-scroller";
export type {
  ScrollItem,
  VisibleRange,
  ScrollerConfig,
  ScrollerState,
  ScrollToOptions,
} from "./virtual-scroller";

// --- Heatmap ---
export { createHeatmap } from "./heatmap";
export type {
  HeatmapType,
  ColorScale,
  HeatmapCell,
  HeatmapOptions,
  HeatmapInstance,
} from "./heatmap";

// --- Sparkline Chart ---
export { createSparklineChart } from "./sparkline-chart";
export type {
  SparklineType,
  TrendIndicator as SparkTrendIndicator,
  SparklinePoint,
  SparklineOptions,
  SparklineInstance,
} from "./sparkline-chart";

// --- Accordion List ---
export { createAccordionList } from "./accordion-list";
export type {
  AccordionMode,
  ExpandIcon,
  AccordionItem,
  AccordionListOptions,
  AccordionListInstance,
} from "./accordion-list";

// --- Context Panel ---
export { createContextPanel } from "./context-panel";
export type {
  PanelSide,
  PanelSize,
  PanelSection,
  BreadcrumbItem,
  ContextPanelOptions,
  ContextPanelInstance,
} from "./context-panel";

// --- Command Palette ---
export { CommandPalette } from "./command-palette";
export type {
  Command,
  CommandCategory,
  CommandPaletteConfig,
  CommandPaletteState,
} from "./command-palette";

// --- File Preview ---
export { FilePreviewManager, createFilePreview } from "./file-preview";
export type {
  FileType,
  FilePreviewOptions,
  FilePreviewInstance,
} from "./file-preview";

// --- Time Picker ---
export { createTimePicker } from "./time-picker";
export type {
  TimeFormat,
  TimePickerMode,
  TimePickerOptions,
  TimePickerInstance,
} from "./time-picker";

// --- Avatar Editor ---
export { createAvatarEditor } from "./avatar-editor";
export type {
  AvatarEditorOptions,
  AvatarEditorInstance,
} from "./avatar-editor";

// --- Color Picker Utilities ---
export {
  hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, parseColor,
  getLuminance, getContrastRatio, getWcagLevel, getContrastingText,
  complementary, analogous, triadic, splitComplementary, tetradic, monochromatic,
  blendColors, lighten, darken, saturate, desaturate, invertColor, withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type { RgbColor, HslColor, Palette } from "./color-picker";

// --- Date Range Picker ---
export { createDateRangePicker } from "./date-range-picker";
export type {
  DateRangePreset,
  DateRangePickerOptions,
  DateRangePickerInstance,
} from "./date-range-picker";

// --- Rating Stars ---
export { createRatingStars } from "./rating-stars";
export type {
  StarIcon,
  RatingSize,
  RatingStarsOptions,
  RatingStarsInstance,
} from "./rating-stars";

// --- Progress Stepper ---
export { createProgressStepper } from "./progress-stepper";
export type {
  StepStatus,
  StepperOrientation,
  StepperVariant,
  StepItem,
  ProgressStepperOptions,
  ProgressStepperInstance,
} from "./progress-stepper";

// --- Tree View ---
export { TreeView } from "./tree-view";
export type {
  TreeNodeData,
  TreeNode,
  CheckMode,
  TreeViewConfig,
} from "./tree-view";

// --- Split Pane ---
export { createSplitPane } from "./split-pane";
export type {
  SplitOrientation,
  SplitCollapseDirection,
  SplitPaneOptions,
  SplitPaneInstance,
} from "./split-pane";

// --- Markdown Editor ---
export { createMarkdownEditor } from "./markdown-editor";
export type {
  MarkdownEditorOptions,
  MarkdownEditorInstance,
} from "./markdown-editor";

// --- Code Editor ---
export { CodeEditorManager, createCodeEditor } from "./code-editor";
export type {
  CodeEditorOptions,
  CodeEditorInstance,
} from "./code-editor";

// --- Rich Text Editor ---
export { createRichTextEditor } from "./rich-text-editor";
export type {
  EditorCommand,
  ToolbarButton,
  RichTextEditorOptions,
  RichTextEditorInstance,
} from "./rich-text-editor";

// --- Form Builder ---
export { FormBuilder, createForm, validations } from "./form-builder";
export type {
  FieldType,
  FieldValidation,
  SelectOption,
  FormField,
  FormSection,
  FormSchema,
  FieldError,
  FormState,
} from "./form-builder";

// --- Data Table ---
export { DataTableManager, createDataTable } from "./data-table";
export type {
  Column,
  SortDirection,
  SortState,
  FilterState,
  DataTableOptions,
  DataTableInstance,
} from "./data-table";

// --- Kanban Board ---
export { createKanbanBoard } from "./kanban-board";
export type {
  KanbanCard,
  KanbanColumn,
  KanbanBoardOptions,
  KanbanBoardInstance,
} from "./kanban-board";

// --- Notification Center ---
export { NotificationCenterManager, createNotificationCenter } from "./notification-center";
export type {
  NotificationType,
  NotificationItem,
  NotificationCenterOptions,
  NotificationCenterInstance,
} from "./notification-center";

// --- Search Dialog ---
export { createSearchDialog } from "./search-dialog";
export type {
  SearchResult,
  SearchCategory,
  SearchDialogOptions,
  SearchDialogInstance,
} from "./search-dialog";

// --- Command Menu ---
export { CommandMenuManager, createCommandMenu } from "./command-menu";
export type {
  CommandItem,
  CommandCategory,
  CommandMenuOptions,
  CommandMenuInstance,
} from "./command-menu";

// --- Carousel ---
export { CarouselManager, createCarousel } from "./carousel";
export type {
  CarouselSlide,
  CarouselOptions,
  CarouselInstance,
} from "./carousel";

// --- Tabs ---
export { TabsManager, createTabs } from "./tabs";
export type {
  TabOrientation,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs";

// --- Accordion ---
export { AccordionManager, createAccordion } from "./accordion";
export type {
  AccordionItem,
  AccordionMode,
  AccordionOptions,
  AccordionInstance,
} from "./accordion";

// --- Toast Notification ---
export { createToastManager } from "./toast-notification";
export type {
  ToastType,
  ToastPosition,
  ToastOptions,
  ToastManagerOptions,
  ToastInstance,
} from "./toast-notification";

// --- Modal Dialog ---
export { createModal } from "./modal-dialog";
export type {
  ModalSize,
  ModalVariant,
  ModalOptions,
  ModalInstance,
} from "./modal-dialog";

// --- Drawer ---
export { createDrawer } from "./drawer";
export type {
  DrawerSide,
  DrawerSize,
  DrawerOptions,
  DrawerInstance,
} from "./drawer";

// --- Dropzone ---
export { DropzoneManager, createDropzone } from "./dropzone";
export type {
  FileValidationError,
  FileValidationRule,
  DropzoneFile,
  DropzoneOptions,
  DropzoneInstance,
} from "./dropzone";

// --- Skeleton ---
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";

// --- Empty State ---
export { EmptyStateManager, createEmptyState } from "./empty-state";
export type {
  EmptyStateVariant,
  EmptyStateOptions,
  EmptyStateInstance,
} from "./empty-state";

// --- Chips ---
export { createChipGroup, createChipElement } from "./chips";
export type {
  ChipVariant,
  ChipSize,
  ChipOptions,
  ChipGroupOptions,
  ChipGroupInstance,
} from "./chips";

// --- Badge ---
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  BadgeOptions,
  StatusDotOptions,
} from "./badge";

// --- Avatar ---
export { createAvatar, createAvatarGroup, getInitials } from "./avatar";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";

// --- Tooltip ---
export { TooltipManager, getTooltipManager, tooltip } from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";

// --- Popover ---
export { PopoverManager, createPopover } from "./popover";
export type {
  PopoverTrigger,
  PopoverPlacement,
  PopoverOptions,
  PopoverInstance,
} from "./popover";

// --- Switch ---
export { createSwitch } from "./switch";
export type {
  SwitchSize,
  SwitchVariant,
  SwitchOptions,
  SwitchInstance,
} from "./switch";

// --- Slider ---
export { SliderManager, createSlider } from "./slider";
export type {
  SliderMark,
  SliderOptions,
  SliderInstance,
} from "./slider";

// --- Radio Group ---
export { createRadioGroup } from "./radio-group";
export type {
  RadioSize,
  RadioVariant,
  RadioOption,
  RadioGroupOptions,
  RadioGroupInstance,
} from "./radio-group";

// --- Checkbox Group ---
export { createCheckboxGroup } from "./checkbox-group";
export type {
  CheckboxSize,
  CheckboxVariant,
  CheckboxOption,
  CheckboxGroupOptions,
  CheckboxGroupInstance,
} from "./checkbox-group";

// --- Select ---
export { SelectManager, createSelect } from "./select";
export type {
  SelectOption,
  SelectOptions,
  SelectInstance,
} from "./select";

// --- Input Group ---
export { createInputGroup } from "./input-group";
export type {
  InputSize,
  InputVariant,
  ValidationState,
  InputGroupOptions,
  InputGroupInstance,
} from "./input-group";

// --- Progress Bar ---
export { createProgressBar, createCircleProgress } from "./progress-bar";
export type {
  ProgressVariant,
  ProgressSize,
  ProgressBarOptions,
  CircleProgressOptions,
} from "./progress-bar";

// --- Pagination ---
export { PaginationManager, createPagination } from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";

// --- Breadcrumb ---
export { BreadcrumbManager, createBreadcrumb } from "./breadcrumb";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb";

// --- Steps ---
export { StepsManager, createSteps } from "./steps";
export type {
  StepStatus,
  StepItem,
  StepsOrientation,
  StepsVariant,
  StepsOptions,
  StepsInstance,
} from "./steps";

// --- Alert ---
export { AlertManager, createAlert } from "./alert";
export type {
  AlertVariant,
  AlertSize,
  AlertAction,
  AlertOptions,
  AlertInstance,
} from "./alert";

// --- Divider ---
export { createDivider, hDivider, vDivider, labeledDivider, sectionDivider } from "./divider";
export type {
  DividerOrientation,
  DividerStyle,
  DividerOptions,
} from "./divider";

// --- Spinner ---
export { createSpinner, miniSpinner, fullPageSpinner } from "./spinner";
export type {
  SpinnerVariant,
  SpinnerSize,
  SpinnerOptions,
} from "./spinner";

// --- Context Menu ---
export { ContextMenuManager } from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";

// --- Tab Bar ---
export { createTabBar } from "./tab-bar";
export type {
  TabItem,
  TabSize,
  TabVariant,
  TabBarOptions,
  TabBarInstance,
} from "./tab-bar";

// --- Collapse ---
export { CollapseManager, createCollapse, createCollapseGroup } from "./collapse";
export type {
  CollapseSize,
  CollapseVariant,
  CollapseOptions,
  CollapseInstance,
  CollapseGroupOptions,
  CollapseGroupInstance,
} from "./collapse";

// --- Rating ---
export { RatingManager, createRating } from "./rating";
export type {
  StarIconType,
  RatingOptions,
  RatingInstance,
} from "./rating";

// --- File Upload ---
export { FileUploadManager, createFileUpload } from "./file-upload";
export type {
  FileUploadOptions,
  UploadFile,
  FileUploadInstance,
} from "./file-upload";

// --- Timeline ---
export { TimelineManager, createTimeline } from "./timeline";
export type {
  TimelineItemStatus,
  TimelineItem,
  TimelineOptions,
  TimelineInstance,
} from "./timeline";

// --- Stat Card ---
export { createStatCard } from "./stat-card";
export type {
  TrendDirection,
  StatCardVariant,
  StatCardOptions,
} from "./stat-card";

// --- Comment ---
export { createCommentSystem } from "./comment";
export type {
  CommentAuthor,
  CommentData,
  CommentOptions,
  CommentInstance,
} from "./comment";

// --- Mention Autocomplete ---
export { createMentionAutocomplete } from "./mention-autocomplete";
export type {
  MentionItem,
  MentionAutocompleteOptions,
  MentionAutocompleteInstance,
} from "./mention-autocomplete";

// --- Color Picker ---
export {
  hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, parseColor,
  getLuminance, getContrastRatio, getWcagLevel, getContrastingText,
  complementary, analogous, triadic, splitComplementary, tetradic, monochromatic,
  blendColors, lighten, darken, saturate, desaturate, invertColor, withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type { RgbColor, HslColor, Palette } from "./color-picker";

// --- Date Picker ---
export { DatePickerManager, createDatePicker } from "./date-picker";
export type {
  DatePickerOptions,
  DatePickerInstance,
} from "./date-picker";

// --- Time Picker ---
export { createTimePicker } from "./time-picker";
export type {
  TimeFormat,
  TimePickerMode,
  TimePickerOptions,
  TimePickerInstance,
} from "./time-picker";

// --- Notification System ---
export { NotificationCenter, PushNotificationManager } from "./notification-system";
export type {
  Notification,
  NotificationConfig,
  NotificationType,
  NotificationPriority,
} from "./notification-system";

// --- Onboarding Tour ---
export { TourManager, createTour } from "./onboarding-tour";
export type {
  TourStep,
  TourOptions,
  TourInstance,
} from "./onboarding-tour";

// --- Keyboard Shortcuts ---
export {
  ShortcutManager,
  ShortcutRecorder,
  ShortcutOverlay,
  commonShortcuts,
  eventToCombo,
  normalizeKey,
  comboToString,
  parseCombo,
  comboMatches,
  comboHash,
} from "./keyboard-shortcuts";
export type {
  KeyCombo,
  ShortcutBinding,
  ShortcutScope,
  RecordedSequence,
} from "./keyboard-shortcuts";

// --- Form Builder ---
export { FormBuilder, createForm, validations } from "./form-builder";
export type {
  FieldType,
  FieldValidation,
  SelectOption,
  FormField,
  FormSection,
  FormSchema,
  FieldError,
  FormState,
} from "./form-builder";

// --- Data Table ---
export { DataTableManager, createDataTable } from "./data-table";
export type {
  Column,
  SortDirection,
  SortState,
  FilterState,
  DataTableOptions,
  DataTableInstance,
} from "./data-table";

// --- Modal Manager ---
export { ModalManager, getModalManager } from "./modal-manager";
export type {
  ModalSize,
  ModalAnimation,
  ModalOptions,
  ModalAction,
  ModalInstance,
  ConfirmOptions,
} from "./modal-manager";

// --- Virtual Scroller ---
export { VirtualScroller, SizeCache } from "./virtual-scroller";
export type {
  ScrollItem,
  VisibleRange,
  ScrollerConfig,
  ScrollerState,
  ScrollToOptions,
} from "./virtual-scroller";

// --- Drag and Drop ---
export { DragDropManager, getDragDropManager } from "./drag-and-drop";
export type {
  DragMode,
  DropPosition,
  DragItem,
  DragOptions,
  DropZoneOptions,
  DropResult,
  SortableConfig,
} from "./drag-and-drop";

// --- Infinite Scroll ---
export { InfiniteScroll } from "./infinite-scroll";
export type {
  InfiniteScrollItem,
  InfiniteScrollOptions,
  InfiniteScrollState,
} from "./infinite-scroll";

// --- Tree View ---
export { TreeView } from "./tree-view";
export type {
  TreeNodeData,
  TreeNode,
  CheckMode,
  TreeViewConfig,
} from "./tree-view";

// --- Split Pane ---
export { createSplitPane } from "./split-pane";
export type {
  SplitOrientation,
  SplitCollapseDirection,
  SplitPaneOptions,
  SplitPaneInstance,
} from "./split-pane";

// --- Command Palette ---
export { CommandPalette } from "./command-palette";
export type {
  Command,
  CommandCategory,
  CommandPaletteConfig,
  CommandPaletteState,
} from "./command-palette";

// --- Markdown Editor ---
export { createMarkdownEditor } from "./markdown-editor";
export type {
  MarkdownEditorOptions,
  MarkdownEditorInstance,
} from "./markdown-editor";

// --- Code Editor ---
export { CodeEditorManager, createCodeEditor } from "./code-editor";
export type {
  CodeEditorOptions,
  CodeEditorInstance,
} from "./code-editor";

// --- Rich Text Editor ---
export { createRichTextEditor } from "./rich-text-editor";
export type {
  EditorCommand,
  ToolbarButton,
  RichTextEditorOptions,
  RichTextEditorInstance,
} from "./rich-text-editor";

// --- Chart ---
export { ChartManager, createChart } from "./chart";
export type {
  ChartType,
  ChartDataPoint,
  ChartDataset,
  ChartOptions,
  ChartInstance,
} from "./chart";

// --- Canvas Drawing ---
export { createDrawing } from "./canvas-drawing";
export type {
  ToolType,
  StrokeCap,
  StrokeJoin,
  Point,
  Stroke,
  DrawingLayer,
  DrawingOptions,
  DrawingInstance,
} from "./canvas-drawing";

// --- Animation Engine ---
export { easings, getEasing, springAnimate, AnimationTimeline, createScrollAnimation, staggerElements, animateCounter, createParallax } from "./animation-engine";
export type {
  EasingFunction,
  SpringConfig,
  SpringState,
  Keyframe,
  AnimationTrack,
  ScrollAnimationConfig,
} from "./animation-engine";

// --- i18n ---
export { t, getLocale, setLocale, LOCALE_CHANGE_EVENT } from "./i18n";
export type {
  Locale,
} from "./i18n";

// --- State Manager ---
export { createStore, combineStores } from "./state-manager";
export type {
  StoreOptions,
  StoreInstance,
  Listener,
  Middleware,
  Selector,
  ComputedValue,
} from "./state-manager";

// --- Router ---
export { Router, createRouter, getRouter } from "./router";
export type {
  RouteMode,
  RouteParams,
  QueryParams,
  RouteDefinition,
  RouterConfig,
  RouteInfo,
  NavigationResult,
} from "./router";

// --- Theme System ---
export { ThemeManager, createThemeManager, getThemeManager, readCSSVar, hexToRgb, luminance, contrastRatio } from "./theme-system";
export type {
  ThemeMode,
  ColorScheme,
  DesignToken,
  ThemeTokens,
  ThemeConfig,
} from "./theme-system";

// --- Accessibility ---
export { progressBarAttrs, switchAttrs, liveRegion, announce, skipLinkAttrs, SKIP_LINK_ID, prefersReducedMotion, animationDuration, focusTrap, srOnly, ROLES } from "./accessibility";

// --- Storage ---
export { storageGet, storageSet, storageRemove, storageKeys, storageClear } from "./storage";

// --- Logger ---
export { Logger, log, apiLog, dbLog, extLog, setGlobalLogLevel, getGlobalLogLevel } from "./logger";
export type {
  LogLevel,
} from "./logger";

// --- Event Bus ---
export { EventBus, createEventBus } from "./event-bus";
export type {
  EventCallback,
  EventMiddleware,
  Subscription,
  EmittedEvent,
  EventBusOptions,
} from "./event-bus";

// --- Performance ---
export { reportMetric, getSessionMetrics, observeWebVitals, markRender } from "./performance";
export type {
  PerformanceMetric,
} from "./performance";

// --- Crypto Utils ---
export {
  sha1,
  sha256,
  sha384,
  sha512,
  hash,
  hashHex,
  hmac,
  hmacHex,
  pbkdf2,
  deriveAesKey,
  generateAesKey,
  aesGcmEncrypt,
  aesGcmDecrypt,
  aesGcmEncryptString,
  aesGcmDecryptString,
  generateRsaOaepKeyPair,
  rsaOaepEncrypt,
  rsaOaepDecrypt,
  generateEcdsaKeyPair,
  ecdsaSign,
  ecdsaVerify,
  generateRsaPssKeyPair,
  rsaPssSign,
  rsaPssVerify,
  exportKey,
  importKey,
  keyFingerprint,
  generateEcdhKeyPair,
  ecdhDeriveSecret,
  ecdhDeriveAesKey,
  randomBytes,
  secureRandomInt,
  secureRandomUuid,
  secureRandomString,
  toBase64,
  fromBase64,
  toBase64Url,
  fromBase64Url,
  toHex,
  fromHex,
  encodeUtf8,
  decodeUtf8,
  estimatePasswordStrength,
  generatePassword,
  generateTokenHex,
  generateTokenBase64Url,
  generateApiKey,
  generateSessionId,
  cryptoUtils,
} from "./crypto-utils";
export type {
  HashAlgorithm,
  HmacAlgorithm,
  AesKeyLength,
  EcNamedCurve,
  RsaKeySize,
  KeyFormat,
  Pbkdf2Options,
  AesGcmOptions,
  RsaKeyGenOptions,
  EcdsaKeyGenOptions,
  RsaPssSignOptions,
  PasswordStrengthResult,
  PasswordGeneratorOptions,
  ApiKeyOptions,
  AesGcmEncryptedData,
} from "./crypto-utils";

// --- Validation ---
export {
  GenerateDiffSchema,
  CreateFrictionSchema,
  CreatePRSchema,
  VoteSchema,
  validateBody,
} from "./validation";
export type {
  GenerateDiffInput,
  CreateFrictionInput,
  CreatePRInput,
  VoteInput,
} from "./validation";

// --- Formatting ---
export {
  formatNumber,
  formatCurrency,
  formatPercent,
  compactNumber,
  formatDate,
  formatTime,
  formatRelativeTime,
  formatISO,
  formatDateTime,
  formatFileSize,
  formatBitSize,
  formatDuration,
  pluralize,
  ordinal,
  bytesForHuman,
  parseSizeString,
  maskString,
  maskEmail,
  maskPhone,
} from "./formatting";
export type {
  RelativeTimeStyle,
} from "./formatting";

// --- Network ---
export {
  NetworkManager,
  createNetworkManager,
  readConnectionInfo,
  parseQueryString,
  buildQueryString,
  buildUrl,
  parseContentRange,
  fetchWithTimeout,
} from "./network";
export type {
  NetworkStatus,
  FetchOptions,
  FetchResult,
  QueuedRequest,
  NetworkManagerOptions,
  NetworkManagerInstance,
} from "./network";

// --- DOM Helpers ---
export {
  $,
  $$,
  byId,
  byTag,
  byClass,
  closest,
  matches,
  text,
  html,
  createElement,
  createFragment,
  div,
  span,
  button,
  input,
  createSvgElement,
  insertAfter,
  insertBefore,
  replaceElement,
  removeElement,
  clearChildren,
  wrapElement,
  unwrapElement,
  moveTo,
  cloneDeep,
  swapElements,
  addClass,
  removeClass,
  toggleClass,
  hasClass,
  replaceClass,
  setStyles,
  getStyle,
  show,
  hide,
  toggleVisibility,
  isVisible,
  getRect,
  getCenter,
  getOffset,
  containsPoint,
  contains,
  distanceBetween,
  positionRelative,
  scrollToElement,
  scrollContainerTo,
  scrollToBottom,
  scrollToTop,
  isScrolledBottom,
  isScrolledTop,
  getScrollProgress,
  disableBodyScroll,
  isInViewport,
  getVisibilityRatio,
  observeViewport,
  observeFullyVisible,
  delegate,
  delegateOnce,
  raf,
  nextFrame,
  afterFrames,
  rafThrottle,
  rafDebounce,
  trapFocus,
  focusElement,
  isFocused,
  saveFocus,
  getSelectionText,
  selectAll,
  clearSelection,
  copyToClipboard,
  readFromClipboard,
  serializeForm,
  populateForm,
  resetForm,
  domReady,
  waitForElement,
  measureText,
  isInIframe,
  getViewportSize,
  getDevicePixelRatio,
} from "./dom-helpers";

// --- Color ---
export {
  parseColor,
  toRgb,
  toHsl,
  toHsv,
  toHex,
  toCss,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToRgb,
  hslToHex,
  hexToHsl,
  lighten,
  darken,
  saturate,
  desaturate,
  rotateHue,
  setOpacity,
  mix,
  lerpColor,
  invert,
  grayscale,
  complement,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  luminance,
  contrastRatio,
  passesWCAGAA,
  passesWCAGAAA,
  getContrastColor,
  bestContrast,
  stringToColor,
  generatePalette,
  generateGradientPalette,
  shadeScale,
  tailwindPalette,
  STATUS_COLORS,
  getStatusColor,
} from "./color";
export type {
  ColorInput,
  RgbColor,
  HslColor,
  HsvColor,
  HwbColor,
  StatusColor,
} from "./color";

// --- Image Utils ---
export {
  getImageDimensions,
  loadImage,
  imageToCanvas,
  resizeImage,
  cropImage,
  applyFilters,
  convertFormat,
  generateThumbnail,
  compressImage,
  getDominantColor,
  getAverageColor,
  createCollage,
  addWatermark,
  detectOrientation,
  getAspectRatio,
  fileToDataUrl,
  fileToArrayBuffer,
  downloadImage,
  formatFileSize as imageFormatFileSize,
  isValidImageType,
  getExifOrientation,
} from "./image-utils";
export type {
  ImageDimensions,
  ImageProcessingOptions,
  CropRegion,
  FilterOptions,
} from "./image-utils";

// --- String Utils ---
export {
  isBlank,
  isPresent,
  collapseWhitespace,
  stripDiacritics,
  escapeRegex,
  escapeHtmlEntities,
  unescapeHtmlEntities,
  toCamelCaseString,
  toPascalCaseString,
  toKebabCaseString,
  toSnakeCaseString,
  capitalizeWords,
  smartTruncate,
  repeatWithSeparator,
  centerPad,
  isAscii,
  looksLikeEmail,
  looksLikeUrl,
  extractNumbers,
  replaceMultiple,
  stringToId,
  countOccurrences,
  reverseWords,
  trimLines,
  detectCase,
  slugify,
  levenshtein,
  isSimilar,
  soundex,
  randomString,
  randomHex,
  generateId,
  wordCount,
  charFrequency,
  mostCommonChars,
  uniqueWords,
  pluralize as strPluralize,
  singularize,
  acronym,
  abbreviate,
  maskString as strMaskString,
  maskEmail as strMaskEmail,
  detectIndentation,
  indentText,
  simpleDiff,
} from "./string-utils";
export type {
  DiffSegment,
} from "./string-utils";

// --- URL Utils ---
export {
  parseUrl,
  buildUrlFromParts,
  updateSearchParams,
  removeSearchParams,
  getQueryParams,
  isSameOrigin,
  normalizeUrl,
  isAbsoluteUrl,
  makeAbsoluteUrl,
  getDomainFromUrl,
  getPathnameFromUrl,
  joinPathSegments,
  encodeUriComponentSafe,
  decodeUriComponentSafe,
  urlsEqual,
} from "./url-utils";
export type {
  ParsedUrl,
} from "./url-utils";

// --- File Utils ---
export {
  MIME_MAP,
  getMimeType,
  getExtension,
  getBaseName,
  categorizeFile,
  isFileType,
  FILE_EXTENSIONS,
  validateFile,
  validateFiles,
  sanitizeFilename,
  uniqueFilename,
  formatBytes as fileFormatBytes,
  formatFileSizeShort,
  getFileIcon,
  parseDropEvent,
  setupDropZone,
  readFileAsText,
  readFileAsDataURL,
  readFileAsArrayBuffer,
  readFileAsBinaryString,
  readFileHeader,
  splitFileIntoChunks,
  UploadTracker,
} from "./file-utils";
export type {
  FileCategory,
  FileValidationOptions,
  FileValidationError,
  DropEvent,
  FileChunk,
  UploadProgress,
} from "./file-utils";

// --- Math Utils ---
export {
  mean,
  median,
  mode,
  variance,
  stddev,
  covariance,
  correlation,
  linearRegression,
  percentile,
  Vec2,
  Vec3,
  Matrix,
  dist2D,
  dist3D,
  angleBetweenPoints,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  boundingBox,
  lineIntersection,
  lerp,
  clamp,
  mapRange,
  smoothStep,
  bezierQuad,
  bezierCubic,
  catmullRom,
  gcd,
  lcm,
  isPrime,
  sieveOfEratosthenes,
  factorial,
  fibonacci,
  fibonacciSequence,
  combinations,
  permutations,
  modPow,
  angle,
  temperature,
  length,
  weight,
  randomNormal,
  randomUniform,
  randomInt,
  randomPick,
  shuffle,
  weightedRandom,
} from "./math-utils";
export type {
  Vector2D,
  Vector3D,
} from "./math-utils";

// --- Time Utils ---
export {
  parseDuration,
  formatDuration as timeFormatDuration,
  formatDurationCompact,
  CountdownTimer,
  Stopwatch,
  RateLimiter,
  FixedWindowRateLimiter,
  debounce,
  throttle,
  addTime,
  diffDates,
  isSameDay,
  isToday,
  isYesterday,
  isTomorrow,
  getDayOfYear,
  getWeekNumber,
  getQuarter,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  daysInMonth,
  isLeapYear,
  getMonthDays,
  formatDateRange,
  getUserTimezone,
  getTimezoneOffset,
  toTimezone,
  TIMEZONE_ALIASES,
  scheduleAt,
  IntervalScheduler,
} from "./time-utils";
export type {
  ParsedDuration,
  CountdownOptions,
  StopwatchLap,
  RateLimitResult,
} from "./time-utils";

// --- CSS Utils ---
export {
  cssVar,
  setCssVar,
  getCssVar,
  setCssVars,
  removeCssVar,
  getAllCssVars,
  createStylesheet,
  injectCSS,
  removeInjectedCSS,
  addCSSRule,
  clearDynamicStyles,
  styleObjectToString,
  cssStringToObject,
  applyStyles as cssApplyStyles,
  bem,
  createBem,
  cn,
  mergeClasses,
  mediaQuery,
  matchesMedia,
  isAtLeast,
  isBelow,
  subscribeMedia,
  subscribeBreakpoint,
  getCurrentBreakpoint,
  media,
  cssTransition,
  EASING_CSS,
  keyframes,
  ANIMATIONS,
  animateOnce,
  hexToRgb as cssHexToRgb,
  rgbToHex as cssRgbToHex,
  mixColors,
  transparentize,
  lightenColor,
  darkenColor,
  parseCssColor,
  pxToRem,
  remToPx,
  ensureUnit,
  cssClamp,
  fluidFontSize,
} from "./css-utils";
export type {
  BreakpointName,
} from "./css-utils";

// --- Clipboard Utils ---
export {
  requestClipboardPermission,
  checkClipboardReadPermission,
  isClipboardSupported,
  copyToClipboard as clipCopyToClipboard,
  copyRich,
  copyImage,
  copyFiles,
  readClipboardText,
  readClipboard,
  cutToClipboard,
  selectAll as clipSelectAll,
  selectRange,
  clearSelection as clipClearSelection,
  getSelectedText,
  getSelectionTarget,
  ClipboardHistory,
  detectClipboardFormats,
  hasImageInClipboard,
  hasFilesInClipboard,
  copyWithFeedback,
  copySelection,
  onClipboardChange,
} from "./clipboard-utils";
export type {
  ClipboardData,
  CopyOptions,
  PasteOptions,
  PasteResult,
  ClipboardHistoryEntry,
  ClipboardHistoryOptions,
} from "./clipboard-utils";

// --- Geolocation Utils ---
export {
  getCurrentPosition,
  watchPosition,
  haversineDistance,
  pathDistance,
  midpointCoords,
  isInBoundingBox,
  createBoundingBox,
  GeofenceManager,
  formatCoordinates,
  formatDistance,
  generateMapLink,
  calculateSpeed,
  isStationary,
  getTimezoneForLocation,
} from "./geolocation-utils";
export type {
  Coordinates,
  LocationInfo,
  Geofence,
  BoundingBox,
  DistanceResult,
} from "./geolocation-utils";

// --- Storage Utils ---
export {
  StorageManager,
  createLocalStorage,
  createSessionStorage,
  createMemoryStore,
} from "./storage-utils";
export type {
  StorageBackend,
  StorageEntry,
  StorageOptions,
  StorageStats,
  StorageMigration,
} from "./storage-utils";

// --- Animation Utils ---
export {
  Tween,
  tween,
  tweenPromise,
  SpringAnimation,
  springTo,
  stagger,
  staggerFadeIn,
  scrollAnimate,
  parallax,
  mouseParallax,
  animate as waapiAnimate,
  fadeIn,
  fadeOut,
  slideUp,
  slideDown,
  scaleIn,
  shake,
  pulse,
  easings,
} from "./animation-utils";
export type {
  TweenOptions,
  SpringConfig,
  AnimationFrame,
  EasingName,
} from "./animation-utils";

// --- A11y Helpers ---
export {
  createAnnouncer,
  announce,
  announceError,
  announceStatus,
  captureFocus,
  focusFirst,
  focusLast,
  getFirstFocusable,
  getLastFocusable,
  getFocusableElements,
  isFocusable,
  setupRovingTabindex,
  createSkipLink,
  setAria,
  removeAria,
  setBusy,
  setExpanded,
  toggleExpanded,
  setSelected,
  setPressed,
  setDisabled,
  hideVisually,
  showVisually,
  injectScreenReaderOnlyStyles,
  prefersReducedMotion,
  onReducedMotionChange,
  getSafeDuration,
  setupDialog,
  ensureLabel,
  autoLabelForm,
} from "./a11y-helpers";

// --- I18n Utils ---
export {
  LOCALES,
  getPluralForm,
  formatLocaleNumber,
  formatCurrency as i18nFormatCurrency,
  formatRelativeTimeLocale,
  formatList,
  detectLocale,
  TranslationDict,
} from "./i18n-utils";
export type {
  LocaleConfig,
  LocaleCode,
  PluralRule,
} from "./i18n-utils";

// --- Schema Validation ---
export {
  isValidEmail,
  isValidUrl,
  isValidPhone,
  isValidCreditCard,
  detectCardType,
  isValidIban,
  isValidIPv4,
  isValidIPv6,
  isValidIP,
  isValidMacAddress,
  isValidUuid,
  isValidUuidV4,
  isValidSemver,
  parseSemver,
  compareSemver,
  isValidSlug,
  isValidHexColor,
  validatePassword,
  validateRules,
  validateRulesAsync,
  createValidator,
  allOf,
  anyOf,
  required,
  minLength,
  maxLength,
  range,
  pattern,
  oneOf,
  email as emailRule,
  url as urlRule,
  custom,
  fieldsMatch,
  fieldGreaterThan,
  whenField,
} from "./schema-validation";
export type {
  ValidationResult,
  FieldValidationResult,
  ValidationRule,
  AsyncValidationRule,
  FormValidationContext,
  PasswordStrengthResult,
} from "./schema-validation";

// --- React Interop ---
export {
  createLazyComponent,
  importKey,
  preload,
  ErrorBoundary,
  withErrorBoundary,
  createContextFactory,
  PortalManager,
  getPortalManager,
  mergeRefs,
  useRefWithPrevious,
  useCallbackRef,
  useMeasure,
  createCompoundComponent,
  isServer,
  isBrowser,
  useHydratedState,
  useMountedCallback,
  getWindowSize,
  isElementType,
  containsElementType,
  getChildrenByType,
} from "./react-interop";

// --- Regex Utils ---
export {
  RegexBuilder,
  PATTERNS,
  testRegex,
  matchesPattern,
  extractAll,
  extractFirst,
  replaceWith,
  replaceTemplate,
  analyzePerformance,
  escapeRegexChars,
  unescapeRegexChars,
} from "./regex-utils";
export type {
  RegexTestResult,
  RegexPerformance,
} from "./regex-utils";

// --- Encoding Utils ---
export {
  base64Encode,
  base64Decode,
  base64UrlEncode,
  base64UrlDecode,
  base64Wrap,
  base32Encode,
  base32Decode,
  base58Encode,
  base58Decode,
  hexEncode,
  hexDecode,
  isHex,
  urlEncode,
  urlDecode,
  queryStringify,
  queryParse as encQueryParse,
  parseUrl as encParseUrl,
  normalizeUnicode,
  codePoints,
  isBMP,
  reverseUnicode,
  htmlEncode,
  htmlDecode,
  parseCSV,
  generateCSV,
  decodeBuffer,
  encodeBuffer,
  uint8ToBinaryString,
  binaryStringToUint8,
  decodeJWT,
  isJWTExpired,
  createUnsignedJWT,
  formatBytes as encFormatBytes,
  parseBytes as encParseBytes,
} from "./encoding-utils";
export type {
  ParsedURL as EncParsedURL,
  JWTPayload,
  DecodedJWT,
} from "./encoding-utils";

// --- Queue Utils ---
export {
  Queue,
  PriorityQueue,
  CircularBuffer,
  RateLimitedQueue,
  ObservableQueue,
  DebounceQueue,
  AsyncTaskQueue,
  BatchProcessor,
} from "./queue-utils";
export type {
  QueueItem,
  QueueStats,
  BatchProcessorOptions,
} from "./queue-utils";

// --- Event Emitter ---
export {
  EventEmitter,
  createEmitter,
} from "./event-emitter";
export type {
  Listener,
  AsyncListener,
  EmitterOptions,
  Subscription as EmitterSubscription,
  EmitResult,
  EmitterStats,
} from "./event-emitter";

// --- State Machine ---
export {
  FSM,
  HSM,
  createMachine,
  interpret,
  match,
  evaluateChoice,
  evaluateJunction,
  deepHistoryTarget,
  shallowHistoryTarget,
} from "./state-machine";
export type {
  StateValue,
  TransitionHistoryEntry,
  Machine,
} from "./state-machine";

// --- Observer Pattern ---
export {
  Observer,
  createObserver,
} from "./observer-pattern";
export type {
  EventHandler,
  EventErrorHandler,
  Subscription as ObserverSubscription,
  ObserverOptions,
  ObserverStats,
} from "./observer-pattern";

// --- Reactive Primitives ---
export {
  Signal,
  Computed,
  Effect,
  signal,
  computed,
  effect,
  batch,
  untrack,
  readonly,
  deepSignal,
  derived,
  combine,
} from "./reactive";
export type {
  EqualityFn,
  EffectCleanup,
  EffectFn,
  ReactiveNode,
  SignalOptions,
  EffectOptions,
} from "./reactive";

// --- Scheduler ---
export {
  Scheduler,
  parseCronExpression,
  cronMatches,
  getNextCronRun,
} from "./scheduler";
export type {
  ScheduledJob,
  JobStatus,
  CronExpression,
} from "./scheduler";

// --- Cache ---
export {
  Cache,
  defaultCache,
  memoize,
} from "./cache";
export type {
  CacheOptions,
} from "./cache";

// --- Pub/Sub ---
export {
  PubSub,
  createPubSub,
} from "./pub-sub";
export type {
  MessageHandler,
  TopicPattern,
  Message,
  Subscription as PubSubSubscription,
  PubSubOptions,
  PubSubStats,
} from "./pub-sub";

// --- Mediator ---
export {
  Mediator,
  createMediator,
} from "./mediator";
export type {
  RequestHandler,
  Middleware,
  MediatorContext,
  HandlerRegistration,
  MediatorOptions,
  MediatorStats,
} from "./mediator";

// --- Command Pattern ---
export {
  BaseCommand,
  MacroCommand,
  CommandManager,
  createCommand,
} from "./command";
export type {
  Command,
  CommandResult,
  CommandConstructor,
  CommandHistoryEntry,
  CommandManagerOptions,
} from "./command";

// --- Virtual DOM ---
export {
  h,
  createTextVNode,
  Fragment,
  createComponentVNode,
  createElement,
  applyProps,
  diff,
  computePropsDiff,
  patch,
  mount,
  updateTree,
  unmount,
  enqueueUpdate,
  startBatch,
  endBatch,
  flushBatchedUpdates,
  renderWithErrorBoundary,
  scheduler,
  beginFiberWork,
  memo,
  shallowEqual,
  createContext,
  readContext,
  subscribeToContext,
  createDevToolsHook,
  registerRendererWithDevTools,
  createRenderer,
  Priority,
  PatchType,
  PROPERTY_ATTRIBUTES,
  EVENT_HANDLER_RE,
} from "./virtual-dom";
export type {
  VNode,
  VNodeType,
  VNodeProps,
  ComponentFunction,
  ComponentLifecycle,
  ComponentInstance,
  ErrorInfo,
  Patch,
  PropsDiff,
  SyntheticEvent,
  Context,
  MemoCompareFunction,
  MemoizedComponent,
  DevToolsHook,
  VNodeWork,
  ScheduledWork,
  RendererConfig,
  VDOMRendererOptions,
} from "./virtual-dom";

// --- Template Engine ---
export {
  TemplateEngine,
  registerBuiltinHelpers,
  unescapeHtml,
  createTemplateEngine,
  renderTemplate,
} from "./template-engine";
export type {
  TemplateContext,
  TemplateOptions,
  TemplateError,
  PartialTemplate,
  HelperFunction,
} from "./template-engine";

// --- Data Structures ---
export {
  LinkedList,
  DoublyLinkedList,
  Stack,
  Queue as DSQueue,
  BinaryHeap,
  Trie,
  LRUCache,
  BloomFilter,
  RingBuffer,
} from "./data-structures";
export type {
  ListNode,
  DListNode,
  HeapType,
  HeapEntry,
  TrieNode,
  LRUCacheEntry,
} from "./data-structures";

// --- Graph ---
export {
  Graph,
} from "./graph";
export type {
  GraphNode,
  GraphEdge,
} from "./graph";

// --- Stream ---
export {
  Stream,
  Subject,
  BehaviorSubject,
  ReplaySubject,
} from "./stream";
export type {
  StreamSubscriber,
  StreamErrorHandler,
  StreamCompleteHandler,
  TeardownLogic,
  OperatorFunction,
  Observer,
  Subscription as StreamSubscription,
} from "./stream";

// --- Logger ---
export {
  Logger,
  log,
  apiLog,
  dbLog,
  extLog,
  setGlobalLogLevel,
  getGlobalLogLevel,
} from "./logger";
export type {
  LogLevel,
} from "./logger";

// --- Plugin System ---
export {
  PluginManager,
  parseSemver,
  satisfiesConstraint,
} from "./plugin-system";
export type {
  PluginStatus,
  HookType,
  PluginPermission,
  PluginManifest,
  PluginContext,
  HookHandler,
  EventHandler,
  HookOptions,
  RegisteredHook,
  PluginInstance,
  PluginLogger,
  PluginStorage,
  PluginLoadResult,
  SystemStats,
} from "./plugin-system";

// --- Feature Flags ---
export {
  FeatureFlagStore,
  featureFlags,
  isFeatureEnabled,
  DEFAULT_FLAGS,
} from "./feature-flags";
export type {
  FeatureFlag,
  FlagContext,
} from "./feature-flags";

// --- Rate Limiter ---
export {
  TokenBucketRateLimiter,
  SlidingWindowLogRateLimiter,
  SlidingWindowCounterRateLimiter,
  FixedWindowRateLimiter,
  LeakyBucketRateLimiter,
  AdaptiveRateLimiter,
  CircuitBreaker,
  Bulkhead,
  RequestCoalescer,
  DistributedRateLimiter,
  StatsCollector,
  createRateLimiter,
  debounce as rateLimitDebounce,
  throttle as rateLimitThrottle,
} from "./rate-limiter";
export type {
  RateLimitResult,
  BaseRateLimitConfig,
  CircuitState,
  RateLimiterStats,
  AdaptiveLimitResult,
  AdaptiveLimiterOptions,
  CircuitBreakerConfig,
  CircuitBreakerResult,
  BulkheadConfig,
  BulkheadResult,
  ThrottleOptions,
  RateLimitStore,
  DistributedRateLimiterConfig,
  StatsTrackable,
} from "./rate-limiter";

// --- i18n ---
export {
  t,
  getLocale,
  setLocale,
  LOCALE_CHANGE_EVENT,
} from "./i18n";
export type {
  Locale,
} from "./i18n";

// --- Config ---
export {
  ConfigManager,
  createConfig,
} from "./config";
export type {
  ConfigValue,
  ConfigSchema,
  ConfigSchemaEntry,
  Environment,
  ConfigOptions,
  ConfigSource,
  ConfigValidationResult,
} from "./config";

// --- Permissions (RBAC) ---
export {
  RBAC,
  createRBAC,
  COMMON_ROLES,
} from "./permissions";
export type {
  Permission,
  RoleName,
  Role,
  User,
  Policy,
  CheckResult,
  AuditEntry,
} from "./permissions";

// --- Crypto Wallet ---
export {
  randomBytes,
  randomInt,
  randomHex,
  sha256,
  sha512,
  hmacSha256,
  pbkdf2,
  generateEd25519KeyPair,
  signEd25519,
  verifyEd25519,
  encrypt,
  decrypt,
  deriveAddress,
  deriveHDAddress,
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  bytesToHex,
  hexToBase64,
  base64ToHex,
} from "./crypto-wallet";
export type {
  KeyPair,
  WalletAddress,
  Signature,
  EncryptedData,
  MnemonicWordlist,
  HashResult,
} from "./crypto-wallet";

// --- Search Engine ---
export {
  SearchEngine,
  jaroWinkler,
  similarity,
  createSearchEngine,
} from "./search-engine";
export type {
  SearchDocument,
  SearchResult,
  SearchOptions,
  FacetResult,
} from "./search-engine";

// --- Workflow ---
export {
  WorkflowDefinition,
  WorkflowExecutor,
  runWorkflow,
  sequentialWorkflow,
  parallelWorkflow,
} from "./workflow";
export type {
  TaskId,
  WorkflowId,
  TaskDefinition,
  WorkflowContext,
  WorkflowStatus,
  TaskResult,
  WorkflowResult,
  WorkflowHook,
  WorkflowOptions,
} from "./workflow";

// --- WebSocket ---
export {
  WebSocketManager,
  WsRoomManager,
  isWebSocketSupported,
  getWebSocketUrl,
  createWebSocketUrl,
  parseWsUrl,
} from "./websocket";
export type {
  WsEvent,
  WebSocketData,
  OpenHandler,
  CloseHandler,
  ErrorHandler,
  MessageHandler,
  ReconnectingHandler,
  WebSocketState,
  WebSocketStats,
  ReconnectConfig,
  HeartbeatConfig,
  WebSocketOptions,
  RoomMessage,
} from "./websocket";

// --- SSR (Server-Side Rendering) ---
export {
  Router,
  buildHTML,
  createSSRResponse,
  StreamRenderer,
  serializeHydrationData,
  parseHydrationData,
  generateHydrationId,
  redirect,
  notFound,
  serverError,
  isServer,
  isBrowser,
  isNode,
  isWorker,
  getEnvironment,
  parseURL,
  buildURL,
} from "./ssr";
export type {
  Route,
  SSRContext,
  RenderResult,
  HydrationData,
  StreamOptions,
} from "./ssr";

// --- CSS-in-JS ---
export {
  injectStyle,
  removeStyle,
  updateStyle,
  setCssVar,
  getCssVar,
  setCssVars,
  getRootVar,
  setRootVar,
  getCurrentBreakpoint,
  isMinWidth,
  isMaxWidth,
  onBreakpointChange,
  isMobile,
  isTablet,
  isDesktop,
  getDevicePixelRatio,
  isRetina,
  matchesMedia,
  subscribeMedia,
  isDarkMode,
  isLightMode,
  toggleDarkMode,
  setDarkMode,
  onDarkModeChange,
  buildKeyframes,
  registerKeyframes,
  animate,
  animations,
  toggleClass,
  classIf,
  setClasses,
  hasAnyClass,
  bringToFront,
  sendToBack,
  mediaQueries,
} from "./css-in-js";
export type {
  Breakpoints,
  KeyframeRule,
} from "./css-in-js";

// --- ORM Lite ---
export {
  Model,
  QueryBuilder,
  OrmLiteDB,
  createDatabase,
} from "./orm-lite";
export type {
  FieldType,
  FieldDefinition,
  SchemaDefinition,
  ModelInstance,
  QueryOptions,
  FilterCondition,
  FilterOperator,
  OrderByClause,
  RelationInclude,
  MigrationOperation,
  MigrationResult,
} from "./orm-lite";

// --- Form Validation ---
export {
  FormValidator,
  createFormValidator,
  BuiltInRules,
} from "./form-validation";
export type {
  ValidationRule,
  ValidationContext,
  FieldConfig,
  FormValidationOptions,
  ValidationError,
  ValidationResult,
  FormValidatorInstance,
} from "./form-validation";

// --- Markdown ---
export {
  mdToHtml,
  stripMd,
} from "./markdown";

// --- Color ---
export {
  parseColor,
  toRgb,
  toHsl,
  toHsv,
  toHex,
  toCss,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToRgb,
  hslToHex,
  hexToHsl,
  lighten,
  darken,
  saturate,
  desaturate,
  rotateHue,
  setOpacity,
  mix,
  lerpColor,
  invert,
  grayscale,
  complement,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  luminance,
  contrastRatio,
  passesWCAGAA,
  passesWCAGAAA,
  getContrastColor,
  bestContrast,
  stringToColor,
  generatePalette,
  generateGradientPalette,
  shadeScale,
  tailwindPalette,
  getStatusColor,
  STATUS_COLORS,
} from "./color";
export type {
  RgbColor,
  HslColor,
  HsvColor,
  HwbColor,
  ColorInput,
  StatusColor,
} from "./color";

// --- DOM Utils ---
export {
  getComputedStyleValue,
  getElementRect,
  isInViewport,
  getVisibilityPercent,
  scrollIntoViewCentered,
  measureText,
  closestAncestor,
  getAncestors,
  insertAfter,
  replaceElement,
  containsOrIs,
  getFocusableElements,
  createFocusTrap,
} from "./dom-utils";

// --- Animation ---
export {
  EASING,
  animateValue,
  springAnimate,
  cssKeyframes,
  KEYFRAMES,
  DURATION,
  transition,
} from "./animation";
export type {
  EasingName,
  SpringConfig,
} from "./animation";

// --- Storage ---
export {
  storageGet,
  storageSet,
  storageRemove,
  storageKeys,
  storageClear,
} from "./storage";

// --- Clipboard ---
export {
  copyToClipboard,
  copyRichToClipboard,
  readFromClipboard,
  readRichFromClipboard,
  isClipboardAvailable,
  canReadClipboard,
  watchClipboard,
} from "./clipboard";
export type {
  ClipboardData,
  ClipboardOptions,
} from "./clipboard";

// --- Keyboard ---
export {
  KeyboardManager,
  createKeyboardManager,
  formatShortcut,
  matchesShortcut,
} from "./keyboard";
export type {
  KeyBinding,
  KeyChord,
  KeyboardManagerOptions,
  KeyboardManagerInstance,
} from "./keyboard";

// --- Drag & Drop ---
export {
  createDropZone,
  createSortableList,
  readFileAsText,
  readFileAsDataURL,
  readFileAsArrayBuffer,
  getFileInfo,
} from "./drag-drop";
export type {
  DragItem,
  DropZoneConfig,
  DndState,
  DropZoneController,
  FileInfo,
  SortableItem,
  SortableConfig,
  SortableController,
} from "./drag-drop";

// --- Virtual Scroll ---
export {
  createVirtualScroll,
  createVirtualGrid,
} from "./virtual-scroll";
export type {
  VirtualScrollItem,
  VirtualScrollOptions,
  VirtualScrollState,
  VirtualScrollController,
  VirtualGridOptions,
  VirtualGridState,
  VirtualGridController,
} from "./virtual-scroll";

// --- Toast ---
export {
  ToastManager,
  getToastManager,
  showToast,
} from "./toast";
export type {
  ToastType,
  ToastPosition,
  ToastOptions,
  ToastInstance,
  ToastManagerConfig,
} from "./toast";

// --- Modal ---
export {
  createModal,
} from "./modal";
export type {
  ModalSize,
  ModalPosition,
  ModalOptions,
  ModalInstance,
} from "./modal";

// --- Tooltip ---
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";

// --- Tabs ---
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabOrientation,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs";

// --- Progress ---
export {
  createProgressTracker,
  createMultiProgressTracker,
  createStepProgress,
  formatProgress,
} from "./progress";
export type {
  ProgressState,
  ProgressCallback,
  ProgressController,
  MultiProgressController,
  StepProgressController,
} from "./progress";

// --- Skeleton ---
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";

// --- Avatar ---
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
} from "./avatar";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";

// --- Table ---
export {
  createTableState,
  getSortedData,
  getFilteredData,
  getPaginatedData,
  getCellValue,
  applyFilterOperator,
  toggleSort,
  setSearchTerm,
  toggleFilter,
  goToPage,
  setPageSize,
  toggleRowSelection,
  toggleSelectAll,
  toggleRowExpand,
  resetTable,
  exportTableAsCsv,
} from "./table";
export type {
  Column,
  TableState,
  SortState,
  FilterState,
  FilterOperator,
  PaginationState,
  SelectionState,
} from "./table";

// --- Chart ---
export {
  ChartManager,
  createChart,
} from "./chart";
export type {
  ChartType,
  ChartDataPoint,
  ChartDataset,
  ChartOptions,
  ChartInstance,
} from "./chart";

// --- Tree ---
export {
  createTreeNode,
  buildTree,
  flattenTree,
  flattenTreeWithDepth,
  findNodeById,
  findNodes,
  getPathToNode,
  getTreeDepth,
  countNodes,
  mapTree,
  filterTree,
} from "./tree";
export type {
  TreeNode,
} from "./tree";

// --- Context Menu ---
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";

// --- Resizable ---
export {
  makeResizable,
  createSplitPane,
} from "./resizable";
export type {
  ResizeOptions,
  ResizeState,
  ResizableController,
  SplitPaneOptions,
  SplitPaneController,
} from "./resizable";

// --- Split View ---
export {
  createSplitView,
  createHorizontalSplit,
  createVerticalSplit,
} from "./split-view";
export type {
  SplitDirection,
  PaneConfig,
  SplitViewOptions,
  SplitViewState,
  SplitViewInstance,
} from "./split-view";

// --- Notification ---
export {
  NotificationManager,
  getNotificationManager,
  toast,
} from "./notification";
export type {
  Notification,
  NotificationOptions,
  NotificationPosition,
  NotificationType,
} from "./notification";

// --- Badge ---
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  BadgeOptions,
  StatusDotOptions,
} from "./badge";

// --- Empty State ---
export {
  EmptyStateManager,
  createEmptyState,
} from "./empty-state";
export type {
  EmptyStateVariant,
  EmptyStateOptions,
  EmptyStateInstance,
} from "./empty-state";

// --- File Upload ---
export {
  FileUploadManager,
  createFileUpload,
} from "./file-upload";
export type {
  UploadFile,
  FileUploadOptions,
  FileUploadInstance,
} from "./file-upload";

// --- Pagination ---
export {
  PaginationManager,
  createPagination,
} from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";

// --- Breadcrumb ---
export {
  BreadcrumbManager,
  createBreadcrumb,
} from "./breadcrumb";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb";

// --- Command Palette ---
export {
  CommandPalette,
} from "./command-palette";
export type {
  Command,
  CommandCategory,
  CommandPaletteConfig,
  CommandPaletteState,
} from "./command-palette";

// --- Infinite Scroll ---
export {
  InfiniteScroll,
} from "./infinite-scroll";
export type {
  InfiniteScrollItem,
  InfiniteScrollOptions,
  InfiniteScrollState,
} from "./infinite-scroll";

// --- Rating ---
export {
  RatingManager,
  createRating,
} from "./rating";
export type {
  StarIconType,
  RatingOptions,
  RatingInstance,
} from "./rating";

// --- Date Picker ---
export {
  DatePickerManager,
  createDatePicker,
} from "./date-picker";
export type {
  DatePickerOptions,
  DatePickerInstance,
  DatePickerMode,
  TimeFormat,
} from "./date-picker";

// --- Time Picker ---
export {
  createTimePicker,
} from "./time-picker";
export type {
  TimePickerOptions,
  TimePickerInstance,
  TimeFormat as TimePickerFormat,
  TimePickerMode,
} from "./time-picker";

// --- Select ---
export {
  SelectManager,
  createSelect,
} from "./select";
export type {
  SelectOption,
  SelectOptions,
  SelectInstance,
} from "./select";

// --- Switch ---
export {
  createSwitch,
} from "./switch";
export type {
  SwitchSize,
  SwitchVariant,
  SwitchOptions,
  SwitchInstance,
} from "./switch";

// --- Slider ---
export {
  SliderManager,
  createSlider,
} from "./slider";
export type {
  SliderMark,
  SliderOptions,
  SliderInstance,
} from "./slider";

// --- Input Mask ---
export {
  InputMaskManager,
  createInputMask,
} from "./input-mask";
export type {
  MaskType,
  MaskOptions,
  MaskInstance,
} from "./input-mask";

// --- Color Picker ---
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type {
  RgbColor,
  HslColor,
  Palette,
} from "./color-picker";

// --- Autocomplete ---
export {
  AutocompleteManager,
  createAutocomplete,
} from "./autocomplete";
export type {
  AutocompleteOption,
  AutocompleteOptions,
  AutocompleteInstance,
} from "./autocomplete";

// --- Cascader ---
export {
  CascaderManager,
  createCascader,
} from "./cascader";
export type {
  CascaderOption,
  CascaderColumn,
  CascaderOptions,
  CascaderInstance,
} from "./cascader";

// --- Transfer ---
export {
  TransferManager,
  createTransfer,
} from "./transfer";
export type {
  TransferItem,
  TransferOptions,
  TransferInstance,
} from "./transfer";

// --- Mention ---
export {
  MentionManager,
  createMention,
} from "./mention";
export type {
  MentionOption,
  MentionOptions,
  MentionInstance,
} from "./mention";

// --- Tree Select ---
export {
  TreeSelectManager,
  createTreeSelect,
} from "./tree-select";
export type {
  TreeNodeData,
  TreeSelectOptions,
  TreeSelectInstance,
} from "./tree-select";

// --- Segmented Control ---
export {
  createSegmentedControl,
} from "./segmented-control";
export type {
  SegmentedOption,
  SegmentedSize,
  SegmentedControlOptions,
  SegmentedControlInstance,
} from "./segmented-control";

// --- Affix ---
export {
  createAffix,
} from "./affix";
export type {
  AffixOptions,
  AffixInstance,
} from "./affix";

// --- Back Top ---
export {
  createBackTop,
} from "./back-top";
export type {
  BackTopShape,
  BackTopPosition,
  BackTopOptions,
  BackTopInstance,
} from "./back-top";

// --- Anchor ---
export {
  createAnchor,
} from "./anchor";
export type {
  AnchorLink,
  AnchorOptions,
  AnchorInstance,
} from "./anchor";

// --- Watermark ---
export {
  createWatermark,
} from "./watermark";
export type {
  WatermarkOptions,
  WatermarkInstance,
} from "./watermark";

// --- Tour ---
export {
  createTour,
} from "./tour";
export type {
  TourStep,
  TourOptions,
  TourInstance,
} from "./tour";

// --- QR Code ---
export {
  generateQrSvg,
  generateQrDataUri,
  generateQrCanvas,
  validateQrInput,
} from "./qr-code";

// --- Signature Pad ---
export {
  SignaturePadManager,
  createSignaturePad,
} from "./signature-pad";
export type {
  StrokePoint,
  Stroke,
  SignaturePadOptions,
  SignaturePadInstance,
} from "./signature-pad";

// --- Countdown ---
export {
  CountdownManager,
  createCountdown,
} from "./countdown";
export type {
  CountdownSize,
  CountdownVariant,
  CountdownOptions,
  CountdownInstance,
} from "./countdown";

// --- Image Cropper ---
export {
  ImageCropperManager,
  createImageCropper,
} from "./image-cropper";
export type {
  AspectRatio,
  CropRegion,
  ImageCropperOptions,
  ImageCropperInstance,
} from "./image-cropper";

// --- Code Editor ---
export {
  CodeEditorManager,
  createCodeEditor,
} from "./code-editor";
export type {
  CodeEditorOptions,
  CodeEditorInstance,
} from "./code-editor";

// --- File Tree ---
export {
  FileManager,
  createFileTree,
} from "./file-tree";
export type {
  FileType,
  FileTreeNode,
  FileTreeOptions,
  FileTreeInstance,
} from "./file-tree";

// --- Calendar ---
export {
  CalendarManager,
  createCalendar,
} from "./calendar";
export type {
  CalendarView,
  WeekStartDay,
  CalendarEvent,
  CalendarOptions,
  CalendarInstance,
} from "./calendar";

// --- Timeline ---
export {
  TimelineManager,
  createTimeline,
} from "./timeline";
export type {
  TimelineItemStatus,
  TimelineItem,
  TimelineOptions,
  TimelineInstance,
} from "./timeline";

// --- Statistics ---
export {
  createStatCard,
} from "./statistics";
export type {
  TrendDirection,
  SparklineType,
  StatCardOptions,
  StatisticsInstance,
} from "./statistics";

// --- Drawer ---
export {
  createDrawer,
} from "./drawer";
export type {
  DrawerSide,
  DrawerSize,
  DrawerOptions,
  DrawerInstance,
} from "./drawer";

// --- Collapse ---
export {
  CollapseManager,
  createCollapse,
  createCollapseGroup,
} from "./collapse";
export type {
  CollapseSize,
  CollapseVariant,
  CollapseOptions,
  CollapseInstance,
  CollapseGroupOptions,
  CollapseGroupInstance,
} from "./collapse";

// --- Steps ---
export {
  StepsManager,
  createSteps,
} from "./steps";
export type {
  StepStatus,
  StepItem,
  StepsOrientation,
  StepsVariant,
  StepsOptions,
  StepsInstance,
} from "./steps";

// --- Carousel ---
export {
  CarouselManager,
  createCarousel,
} from "./carousel";
export type {
  CarouselSlide,
  CarouselOptions,
  CarouselInstance,
} from "./carousel";

// --- Notification Bar ---
export {
  NotificationBarManager,
  createNotificationBar,
} from "./notification-bar";
export type {
  NotificationType,
  NotificationBarOptions,
  NotificationBarInstance,
} from "./notification-bar";

// --- Avatar Group ---
export {
  AvatarGroupManager,
  createAvatarGroup,
} from "./avatar-group";
export type {
  AvatarSize,
  StackDirection,
  AvatarItem,
  AvatarGroupOptions,
  AvatarGroupInstance,
} from "./avatar-group";

// --- Skeleton ---
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";

// --- Empty State ---
export {
  EmptyStateManager,
  createEmptyState,
} from "./empty-state";
export type {
  EmptyStateVariant,
  EmptyStateOptions,
  EmptyStateInstance,
} from "./empty-state";

// --- Result Page ---
export {
  ResultPageManager,
  createResultPage,
} from "./result-page";
export type {
  ResultStatus,
  ResultPageOptions,
  ResultPageInstance,
} from "./result-page";

// --- List ---
export {
  createList,
} from "./list";
export type {
  ListSelectionMode,
  ListVariant,
  ListItem,
  ListOptions,
  ListInstance,
} from "./list";

// --- Grid ---
export {
  createGrid,
} from "./grid";
export type {
  GridGap,
  GridJustify,
  GridAlign,
  GridItem,
  GridOptions,
  GridInstance,
} from "./grid";

// --- Virtual List ---
export {
  createVirtualList,
} from "./virtual-list";
export type {
  VirtualListItem,
  VirtualListOptions,
  VirtualListInstance,
} from "./virtual-list";

// --- Segmented Control ---
export {
  SegmentedControlManager,
  createSegmentedControl,
} from "./segmented";
export type {
  SegmentedSize,
  SegmentedBlockMode,
  SegmentedOption,
  SegmentedOptions,
  SegmentedInstance,
} from "./segmented";

// --- Breadcrumb ---
export {
  BreadcrumbManager,
  createBreadcrumb,
} from "./breadcrumb";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb";

// --- Pagination ---
export {
  PaginationManager,
  createPagination,
} from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";

// --- Tabs ---
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabOrientation,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs";

// --- Accordion ---
export {
  AccordionManager,
  createAccordion,
} from "./accordion";
export type {
  AccordionItem,
  AccordionMode,
  AccordionOptions,
  AccordionInstance,
} from "./accordion";

// --- Side Sheet ---
export {
  SideSheetManager,
  createSideSheet,
} from "./side-sheet";
export type {
  SheetSide,
  SheetSize,
  SheetOptions,
  SheetInstance,
} from "./side-sheet";

// --- Tooltip ---
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";

// --- Popover ---
export {
  PopoverManager,
  createPopover,
} from "./popover";
export type {
  PopoverTrigger,
  PopoverPlacement,
  PopoverOptions,
  PopoverInstance,
} from "./popover";

// --- Dropdown Menu ---
export {
  DropdownMenuManager,
  createDropdownMenu,
} from "./dropdown-menu";
export type {
  MenuItemType,
  MenuItem,
  DropdownMenuOptions,
  DropdownMenuInstance,
} from "./dropdown-menu";

// --- Modal ---
export {
  createModal,
} from "./modal";
export type {
  ModalSize,
  ModalPosition,
  ModalOptions,
  ModalInstance,
} from "./modal";

// --- Dialog ---
export {
  createDialog,
  alertDialog,
  confirmDialog,
  dangerDialog,
} from "./dialog";
export type {
  DialogVariant,
  DialogOptions,
  DialogInstance,
} from "./dialog";

// --- Alert ---
export {
  AlertManager,
  createAlert,
} from "./alert";
export type {
  AlertVariant,
  AlertSize,
  AlertAction,
  AlertOptions,
  AlertInstance,
} from "./alert";

// --- Context Menu ---
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";

// --- Toast ---
export {
  ToastManager,
  getToastManager,
  showToast,
} from "./toast";
export type {
  ToastType,
  ToastPosition,
  ToastOptions,
  ToastInstance,
  ToastManagerConfig,
} from "./toast";

// --- Loading Bar ---
export {
  LoadingBarManager,
  createLoadingBar,
  getGlobalLoadingBar,
  startLoading,
  doneLoading,
} from "./loading-bar";
export type {
  LoadingBarColor,
  LoadingBarOptions,
  LoadingBarInstance,
} from "./loading-bar";

// --- Progress ---
export {
  createProgressTracker,
  createMultiProgressTracker,
  createStepProgress,
  formatProgress,
} from "./progress";
export type {
  ProgressState,
  ProgressCallback,
  ProgressController,
  MultiProgressController,
  StepProgressController,
} from "./progress";

// --- Badge ---
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  BadgeOptions,
  StatusDotOptions,
} from "./badge";

// --- Tag ---
export {
  TagManager,
  createTag,
  createTagGroup,
} from "./tag";
export type {
  TagVariant,
  TagSize,
  TagShape,
  TagOptions,
  TagInstance,
  TagGroupOptions,
  TagGroupInstance,
} from "./tag";

// --- Rating ---
export {
  RatingManager,
  createRating,
} from "./rating";
export type {
  StarIconType,
  RatingOptions,
  RatingInstance,
} from "./rating";

// --- Divider ---
export {
  createDivider,
  hDivider,
  vDivider,
  labeledDivider,
  sectionDivider,
} from "./divider";
export type {
  DividerOrientation,
  DividerStyle,
  DividerOptions,
} from "./divider";

// --- Spin ---
export {
  SpinManager,
  createSpin,
} from "./spin";
export type {
  SpinType,
  SpinSize,
  SpinOptions,
  SpinInstance,
} from "./spin";

// --- Affix ---
export {
  createAffix,
} from "./affix";
export type {
  AffixOptions,
  AffixInstance,
} from "./affix";

// --- Back Top ---
export {
  createBackTop,
} from "./back-top";
export type {
  BackTopShape,
  BackTopPosition,
  BackTopOptions,
  BackTopInstance,
} from "./back-top";

// --- Anchor ---
export {
  createAnchor,
} from "./anchor";
export type {
  AnchorLink,
  AnchorOptions,
  AnchorInstance,
} from "./anchor";

// --- Color Thief ---
export {
  getDominantColor,
  getPalette,
  getPaletteWithCounts,
  getColorAnalysis,
  generateScheme,
  colorToCss,
  colorToHex,
  parseColor,
} from "./color-thief";
export type {
  Color,
  ColorWithCount,
  ColorThiefOptions,
} from "./color-thief";

// --- Lottie Player ---
export {
  createLottiePlayer,
  loadLottieData,
} from "./lottie-player";
export type {
  LottieData,
  LottieLayer,
  LottiePlayerOptions,
  LottiePlayerInstance,
  AnimatableValue,
  Keyframe,
  BezierPathData,
} from "./lottie-player";

// --- Confetti ---
export {
  createConfetti,
  confetti,
  confettiFromElement,
} from "./confetti";
export type {
  ParticleShape,
  Particle,
  ConfettiColors,
  ConfettiPhysics,
  ConfettiOptions,
  ConfettiInstance,
} from "./confetti";

// --- Image Compare ---
export {
  createImageCompare,
} from "./image-compare";
export type {
  CompareDirection,
  HandleStyle,
  InteractionMode,
  ImageCompareOptions,
  ImageCompareInstance,
} from "./image-compare";

// --- Photo Editor ---
export {
  createPhotoEditor,
  getFilterPresets,
} from "./photo-editor";
export type {
  FilterName,
  FilterPreset,
  AdjustmentValues,
  CropRegion,
  TextOverlay,
  StickerItem,
  DrawStroke,
  PhotoEditorOptions,
  PhotoEditorInstance,
} from "./photo-editor";

// --- Screen Recorder ---
export {
  createScreenRecorder,
  isScreenRecordingSupported,
  isCameraAvailable,
} from "./screen-recorder";
export type {
  RecorderSource,
  OutputFormat,
  RecorderStatus,
  RecorderConstraints,
  RecorderOptions,
  RecorderStats,
  ScreenRecorderInstance,
} from "./screen-recorder";

// --- Marquee Carousel ---
export {
  createMarqueeCarousel,
} from "./marquee-carousel";
export type {
  MarqueeDirection as MarqueeCarouselDirection,
  MarqueeItem,
  MarqueeLane,
  MarqueeCarouselOptions,
  MarqueeCarouselInstance,
} from "./marquee-carousel";

// --- Masonry Grid ---
export {
  createMasonryGrid,
} from "./masonry-grid";
export type {
  MasonryItem,
  MasonryGridOptions,
  LayoutInfo,
  MasonryGridInstance,
} from "./masonry-grid";

// --- Parallax Scroller ---
export {
  createParallaxScroller,
} from "./parallax-scroller";
export type {
  ParallaxDirection,
  ParallaxLayer,
  ScrollAnimation,
  TiltConfig,
  ParallaxScrollerOptions,
  ParallaxScrollerInstance,
} from "./parallax-scroller";

// --- Color Picker Advanced ---
export {
  createColorPicker,
} from "./color-picker-advanced";
export type {
  ColorMode as ColorPickerMode,
  RgbColor,
  HslColor,
  HsvColor,
  ColorSwatch,
  ColorPickerOptions,
  ColorPickerInstance,
} from "./color-picker-advanced";

// --- Emoji Picker ---
export {
  createEmojiPicker,
} from "./emoji-picker";
export type {
  SkinTone,
  EmojiData,
  EmojiCategory,
  CustomEmoji,
  EmojiPickerOptions,
  EmojiPickerInstance,
} from "./emoji-picker";

// --- Mentionable ---
export {
  createMentionable,
} from "./mentionable";
export type {
  MentionItem,
  MentionSearchFn,
  MentionableOptions,
  MentionableInstance,
} from "./mentionable";

// --- Sticky Notes ---
export {
  createStickyNotes,
} from "./sticky-notes";
export type {
  NoteColor as StickyNoteColor,
  StickyNoteData,
  StickyNotesOptions,
  StickyNotesInstance,
} from "./sticky-notes";

// --- Drawing Board ---
export {
  createDrawingBoard,
} from "./drawing-board";
export type {
  ToolName as DrawingToolName,
  FillMode,
  StrokeStyle,
  DrawingTool,
  DrawingBoardOptions,
  DrawingBoardInstance,
} from "./drawing-board";

// --- Audio Visualizer ---
export {
  createAudioVisualizer,
} from "./audio-visualizer";
export type {
  VizType,
  AudioSource,
  VisualizerColors,
  AudioVisualizerOptions,
  AudioVisualizerInstance,
} from "./audio-visualizer";

// --- Rating Input ---
export {
  createRatingInput,
} from "./rating-input";
export type {
  RatingIcon,
  RatingSize,
  RatingInputOptions,
  RatingInputInstance,
} from "./rating-input";

// --- Slider Range ---
export {
  createSliderRange,
} from "./slider-range";
export type {
  SliderOrientation as SliderRangeOrientation,
  SliderRangeOptions,
  SliderRangeInstance,
} from "./slider-range";

// --- Avatar Uploader ---
export {
  createAvatarUploader,
} from "./avatar-uploader";
export type {
  AvatarShape,
  UploadMode,
  AvatarUploaderOptions,
  AvatarUploaderInstance,
} from "./avatar-uploader";

// --- Context Panel ---
export {
  createContextPanel,
} from "./context-panel";
export type {
  PanelSide,
  PanelSize,
  PanelSection,
  BreadcrumbItem,
  ContextPanelOptions,
  ContextPanelInstance,
} from "./context-panel";

// --- Split Pane Resizable ---
export {
  createSplitPane,
} from "./split-pane-resizable";
export type {
  SplitDirection,
  ResizeHandle,
  PaneConfig,
  SplitPaneOptions,
  SplitPaneInstance,
} from "./split-pane-resizable";

// --- Command Log ---
export {
  createCommandLog,
} from "./command-log";
export type {
  LogLevel,
  LogEntry,
  CommandLogOptions,
  CommandLogInstance,
} from "./command-log";

// --- Notification Center ---
export {
  createNotificationCenter,
  NotificationCenterManager,
} from "./notification-center";
export type {
  NotificationType,
  NotificationItem,
  NotificationCenterOptions,
  NotificationCenterInstance,
} from "./notification-center";

// --- File Tree ---
export {
  createFileTree,
  FileManager,
} from "./file-tree";
export type {
  FileType,
  FileTreeNode,
  FileTreeOptions,
  FileTreeInstance,
} from "./file-tree";

// --- Code Editor ---
export {
  createCodeEditor,
  CodeEditorManager,
} from "./code-editor";
export type {
  CodeEditorOptions,
  CodeEditorInstance,
} from "./code-editor";

// --- Kanban Board ---
export {
  createKanbanBoard,
} from "./kanban-board";
export type {
  KanbanCard,
  KanbanColumn,
  KanbanBoardOptions,
  KanbanBoardInstance,
} from "./kanban-board";

// --- Gantt Chart ---
export {
  createGanttChart,
} from "./gantt-chart";
export type {
  GanttTask,
  GanttChartOptions,
  GanttChartInstance,
} from "./gantt-chart";

// --- Org Chart ---
export {
  createOrgChart,
} from "./org-chart";
export type {
  OrgNode,
  OrgChartOptions,
  OrgChartInstance,
} from "./org-chart";

// --- Rich Text Editor ---
export {
  createRichTextEditor,
} from "./rich-text-editor";
export type {
  EditorCommand,
  ToolbarButton,
  RichTextEditorOptions,
  RichTextEditorInstance,
} from "./rich-text-editor";

// --- Markdown Editor ---
export {
  createMarkdownEditor,
} from "./markdown-editor";
export type {
  MarkdownEditorOptions,
  MarkdownEditorInstance,
} from "./markdown-editor";

// --- JSON Editor ---
export {
  createJsonEditor,
} from "./json-editor";
export type {
  JsonNodeType,
  JsonNode,
  JsonSchemaProperty,
  JsonEditorOptions,
  JsonEditorInstance,
} from "./json-editor";

// --- Form Builder ---
export {
  FormBuilder,
  createForm,
  validations,
} from "./form-builder";
export type {
  FieldType,
  FieldValidation,
  SelectOption,
  FormField,
  FormSection,
  FormSchema,
  FieldError,
  FormState,
} from "./form-builder";

// --- Data Table Advanced ---
export {
  createDataTable,
} from "./data-table-advanced";
export type {
  SortDirection,
  AlignType,
  ColumnDef,
  TableRow,
  DataTableOptions,
  DataTableInstance,
} from "./data-table-advanced";

// --- Timeline ---
export {
  TimelineManager,
  createTimeline,
} from "./timeline";
export type {
  TimelineItemStatus,
  TimelineItem,
  TimelineOptions,
  TimelineInstance,
} from "./timeline";

// --- Calendar ---
export {
  CalendarManager,
  createCalendar,
} from "./calendar";
export type {
  CalendarView,
  WeekStartDay,
  CalendarEvent,
  CalendarOptions,
  CalendarInstance,
} from "./calendar";

// --- Color Palette ---
export {
  ColorPaletteManager,
  createColorPalette,
  contrastRatio,
} from "./color-palette";
export type {
  PaletteScheme,
  ColorShade,
  PaletteColor,
  ColorPalette,
  ColorPaletteOptions,
  ColorPaletteInstance,
} from "./color-palette";

// --- Signature Pad ---
export {
  SignaturePadManager,
  createSignaturePad,
} from "./signature-pad";
export type {
  StrokePoint,
  Stroke,
  SignaturePadOptions,
  SignaturePadInstance,
} from "./signature-pad";

// --- Changelog ---
export {
  ChangelogManager,
  createChangelog,
} from "./changelog";
export type {
  ChangelogEntryType,
  ChangelogItem,
  ChangelogVersion,
  ChangelogOptions,
  ChangelogInstance,
} from "./changelog";

// --- Comment Thread ---
export {
  CommentThreadManager,
  createCommentThread,
} from "./comment-thread";
export type {
  CommentAuthor,
  Comment,
  CommentThreadOptions,
  CommentThreadInstance,
} from "./comment-thread";

// --- Activity Feed ---
export {
  ActivityFeedManager,
  createActivityFeed,
} from "./activity-feed";
export type {
  ActivityType,
  ActivityGroupBy,
  FeedDensity,
  ActivityItem,
  ActivityFeedOptions,
  ActivityFeedInstance,
} from "./activity-feed";

// --- Stats Card ---
export {
  StatsCardManager,
  createStatsCard,
} from "./stats-card";
export type {
  TrendDirection,
  StatsVariant,
  SparklinePoint,
  StatsCardOptions,
  StatsCardInstance,
} from "./stats-card";

// --- Progress Stepper ---
export {
  createProgressStepper,
} from "./progress-stepper";
export type {
  StepStatus,
  StepperOrientation,
  StepperVariant,
  StepItem,
  ProgressStepperOptions,
  ProgressStepperInstance,
} from "./progress-stepper";

// --- Empty State ---
export {
  EmptyStateManager,
  createEmptyState,
} from "./empty-state";
export type {
  EmptyStateVariant,
  EmptyStateOptions,
  EmptyStateInstance,
} from "./empty-state";

// --- Breadcrumb Navigation ---
export {
  createBreadcrumb,
} from "./breadcrumb-nav";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb-nav";

// --- Skeleton Loader ---
export {
  createSkeleton,
} from "./skeleton-loader";
export type {
  SkeletonShape,
  SkeletonAnimation,
  SkeletonItem,
  SkeletonOptions,
  SkeletonInstance,
} from "./skeleton-loader";

// --- Tooltip ---
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";

// --- Avatar ---
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
} from "./avatar";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";

// --- Badge ---
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  BadgeOptions,
  StatusDotOptions,
} from "./badge";

// --- Divider ---
export {
  createDivider,
  hDivider,
  vDivider,
  labeledDivider,
  sectionDivider,
} from "./divider";
export type {
  DividerOrientation,
  DividerStyle,
  DividerOptions,
} from "./divider";

// --- Chip ---
export {
  createChip,
  createChipGroup,
} from "./chip";
export type {
  ChipSize,
  ChipVariant,
  ChipOptions,
  ChipInstance,
  ChipGroupOptions,
  ChipGroupInstance,
} from "./chip";

// --- Switch ---
export {
  createSwitch,
} from "./switch";
export type {
  SwitchSize,
  SwitchVariant,
  SwitchOptions,
  SwitchInstance,
} from "./switch";

// --- Radio Group ---
export {
  createRadioGroup,
} from "./radio-group";
export type {
  RadioSize,
  RadioVariant,
  RadioOption,
  RadioGroupOptions,
  RadioGroupInstance,
} from "./radio-group";

// --- Checkbox Group ---
export {
  createCheckboxGroup,
} from "./checkbox-group";
export type {
  CheckboxSize,
  CheckboxVariant,
  CheckboxOption,
  CheckboxGroupOptions,
  CheckboxGroupInstance,
} from "./checkbox-group";

// --- Select ---
export {
  SelectManager,
  createSelect,
} from "./select";
export type {
  SelectOption,
  SelectOptions,
  SelectInstance,
} from "./select";

// --- Input ---
export {
  createInput,
} from "./input";
export type {
  InputSize,
  InputVariant,
  InputState,
  InputOptions,
  InputInstance,
} from "./input";

// --- Textarea ---
export {
  createTextarea,
} from "./textarea";
export type {
  TextareaSize,
  TextareaState,
  TextareaOptions,
  TextareaInstance,
} from "./textarea";

// --- Slider ---
export {
  SliderManager,
  createSlider,
} from "./slider";
export type {
  SliderMark,
  SliderOptions,
  SliderInstance,
} from "./slider";

// --- Progress ---
export {
  createProgressTracker,
  createMultiProgressTracker,
  formatProgress,
  createStepProgress,
} from "./progress";
export type {
  ProgressState,
  ProgressCallback,
  ProgressController,
  MultiProgressController,
  StepProgressController,
} from "./progress";

// --- Tabs ---
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabOrientation,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs";

// --- Accordion ---
export {
  AccordionManager,
  createAccordion,
} from "./accordion";
export type {
  AccordionItem,
  AccordionMode,
  AccordionOptions,
  AccordionInstance,
} from "./accordion";

// --- Modal ---
export {
  createModal,
} from "./modal";
export type {
  ModalSize,
  ModalPosition,
  ModalOptions,
  ModalInstance,
} from "./modal";

// --- Dropdown Menu ---
export {
  DropdownMenuManager,
  createDropdownMenu,
} from "./dropdown-menu";
export type {
  MenuItemType,
  MenuItem,
  DropdownMenuOptions,
  DropdownMenuInstance,
} from "./dropdown-menu";

// --- Popover ---
export {
  PopoverManager,
  createPopover,
} from "./popover";
export type {
  PopoverTrigger,
  PopoverPlacement,
  PopoverOptions,
  PopoverInstance,
} from "./popover";

// --- Alert ---
export {
  AlertManager,
  createAlert,
} from "./alert";
export type {
  AlertVariant,
  AlertSize,
  AlertAction,
  AlertOptions,
  AlertInstance,
} from "./alert";

// --- Toast ---
export {
  ToastManager,
  getToastManager,
  showToast,
} from "./toast";
export type {
  ToastType,
  ToastPosition,
  ToastOptions,
  ToastInstance,
  ToastManagerConfig,
} from "./toast";

// --- Drawer ---
export {
  createDrawer,
} from "./drawer";
export type {
  DrawerSide,
  DrawerSize,
  DrawerOptions,
  DrawerInstance,
} from "./drawer";

// --- Carousel ---
export {
  CarouselManager,
  createCarousel,
} from "./carousel";
export type {
  CarouselSlide,
  CarouselOptions,
  CarouselInstance,
} from "./carousel";

// --- Rating ---
export {
  RatingManager,
  createRating,
} from "./rating";
export type {
  StarIconType,
  RatingOptions,
  RatingInstance,
} from "./rating";

// --- Pagination ---
export {
  PaginationManager,
  createPagination,
} from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";

// --- Tree View ---
export {
  TreeView,
} from "./tree-view";
export type {
  TreeNodeData,
  TreeNode,
  CheckMode,
  TreeViewConfig,
} from "./tree-view";

// --- Context Menu ---
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";

// --- Lightbox ---
export {
  LightboxManager,
  createLightbox,
} from "./lightbox";
export type {
  LightboxImage,
  LightboxOptions,
  LightboxInstance,
} from "./lightbox";

// --- Skeleton Screen ---
export {
  createSkeletonScreen,
} from "./skeleton-screen";
export type {
  SkeletonLayout,
  SkeletonScreenOptions,
  SkeletonScreenInstance,
} from "./skeleton-screen";

// --- Color Picker ---
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type {
  RgbColor,
  HslColor,
  Palette,
} from "./color-picker";

// --- Date Picker ---
export {
  DatePickerManager,
  createDatePicker,
} from "./date-picker";
export type {
  DatePickerOptions,
  DatePickerInstance,
  DayInfo,
} from "./date-picker";

// --- File Upload ---
export {
  FileUploadManager,
  createFileUpload,
} from "./file-upload";
export type {
  FileUploadOptions,
  UploadFile,
  FileUploadInstance,
} from "./file-upload";

// --- Form Builder ---
export {
  FormBuilder,
  createForm,
  validations,
} from "./form-builder";
export type {
  FieldType,
  FieldValidation,
  SelectOption,
  FormField,
  FormSection,
  FormSchema,
  FieldError,
  FormState,
} from "./form-builder";

// --- Virtual Scroll ---
export {
  createVirtualScroll,
  createVirtualGrid,
} from "./virtual-scroll";
export type {
  VirtualScrollItem,
  VirtualScrollOptions,
  VirtualScrollState,
  VirtualScrollController,
  VirtualGridOptions,
  VirtualGridState,
  VirtualGridController,
} from "./virtual-scroll";

// --- Rich Text Editor ---
export {
  createRichTextEditor,
} from "./rich-text-editor";
export type {
  EditorCommand,
  ToolbarButton,
  RichTextEditorOptions,
  RichTextEditorInstance,
} from "./rich-text-editor";

// --- Kanban Board ---
export {
  createKanbanBoard,
} from "./kanban-board";
export type {
  KanbanCard,
  KanbanColumn,
  KanbanBoardOptions,
  KanbanBoardInstance,
} from "./kanban-board";

// --- Chart ---
export {
  ChartManager,
  createChart,
} from "./chart";
export type {
  ChartType,
  ChartDataPoint,
  ChartDataset,
  ChartOptions,
  ChartInstance,
} from "./chart";

// --- Notification Center ---
export {
  NotificationCenterManager,
  createNotificationCenter,
} from "./notification-center";
export type {
  NotificationType,
  NotificationItem,
  NotificationCenterOptions,
  NotificationCenterInstance,
} from "./notification-center";

// --- Command Palette ---
export {
  CommandPalette,
} from "./command-palette";
export type {
  Command,
  CommandCategory,
  CommandPaletteConfig,
  CommandPaletteState,
} from "./command-palette";

// --- Data Table ---
export {
  DataTableManager,
  createDataTable,
} from "./data-table";
export type {
  Column,
  SortDirection,
  SortState,
  FilterState,
  DataTableOptions,
  DataTableInstance,
} from "./data-table";

// --- Timeline ---
export {
  TimelineManager,
  createTimeline,
} from "./timeline";
export type {
  TimelineItemStatus,
  TimelineItem,
  TimelineOptions,
  TimelineInstance,
} from "./timeline";

// --- Markdown Renderer ---
export {
  parseMarkdown,
  renderToHtml,
  generateToc,
  renderToc,
  extractFrontMatter,
  extractText,
  countWords,
  readingTime,
  mdToHtml,
} from "./markdown-renderer";
export type {
  MdNodeType,
  MdNode,
  MdRenderOptions,
  TocEntry,
  FrontMatter,
} from "./markdown-renderer";

// --- Avatar Group ---
export {
  AvatarGroupManager,
  createAvatarGroup,
} from "./avatar-group";
export type {
  AvatarSize,
  StackDirection,
  AvatarItem,
  AvatarGroupOptions,
  AvatarGroupInstance,
} from "./avatar-group";

// --- Empty State ---
export {
  EmptyStateManager,
  createEmptyState,
} from "./empty-state";
export type {
  EmptyStateVariant,
  EmptyStateOptions,
  EmptyStateInstance,
} from "./empty-state";

// --- Comment Thread ---
export {
  CommentThreadManager,
  createCommentThread,
} from "./comment-thread";
export type {
  CommentAuthor,
  Comment,
  CommentThreadOptions,
  CommentThreadInstance,
} from "./comment-thread";

// --- Mention ---
export {
  MentionManager,
  createMention,
} from "./mention";
export type {
  MentionOption,
  MentionOptions,
  MentionInstance,
} from "./mention";

// --- Tour Guide ---
export {
  TourManager,
  createTour,
} from "./tour-guide";
export type {
  TourStep,
  TourOptions,
  TourInstance,
} from "./tour-guide";

// --- Search Highlight ---
export {
  SearchHighlightManager,
  createSearchHighlight,
} from "./search-highlight";
export type {
  SearchHighlightOptions,
  SearchHighlightInstance,
} from "./search-highlight";

// --- Clipboard ---
export {
  copyToClipboard,
  copyRichToClipboard,
  readFromClipboard,
  readRichFromClipboard,
  isClipboardAvailable,
  canReadClipboard,
  watchClipboard,
} from "./clipboard";
export type {
  ClipboardData,
  ClipboardOptions,
} from "./clipboard";

// --- Hotkeys ---
export {
  HotkeyManager,
  parseKeyCombo,
  eventMatchesCombo,
  formatKeyDisplay,
  createAppHotkeys,
  areModifiersDown,
  getModifierString,
} from "./hotkeys";
export type {
  HotkeyBinding,
  HotkeyEvent,
  ParsedKeyCombo,
} from "./hotkeys";

// --- Resizable ---
export {
  makeResizable,
  createSplitPane,
} from "./resizable";
export type {
  ResizeOptions,
  ResizeState,
  ResizableController,
  SplitPaneOptions,
  SplitPaneController,
} from "./resizable";

// --- Split View ---
export {
  createSplitView,
  createHorizontalSplit,
  createVerticalSplit,
} from "./split-view";
export type {
  SplitDirection,
  PaneConfig,
  SplitViewOptions,
  SplitViewState,
  SplitViewInstance,
} from "./split-view";

// --- Anchor Positioning ---
export {
  computePosition,
  createArrowStyles,
  positionElement,
} from "./anchor-positioning";
export type {
  Placement,
  Alignment,
  VirtualElement,
  Rect,
  PositionResult,
} from "./anchor-positioning";

// --- Infinite Scroll ---
export {
  InfiniteScroll,
} from "./infinite-scroll";
export type {
  InfiniteScrollItem,
  InfiniteScrollOptions,
  InfiniteScrollState,
} from "./infinite-scroll";

// --- Pull to Refresh ---
export {
  createPullToRefresh,
} from "./pull-to-refresh";
export type {
  PullToRefreshOptions,
  PullToRefreshInstance,
} from "./pull-to-refresh";

// --- Lazy Load ---
export {
  createLazyLoad,
  initBatchLazy,
} from "./lazy-load";
export type {
  LazyLoadOptions,
  LazyLoadInstance,
  BatchLazyOptions,
} from "./lazy-load";

// --- Countdown ---
export {
  CountdownManager,
  createCountdown,
} from "./countdown";
export type {
  CountdownSize,
  CountdownVariant,
  CountdownOptions,
  CountdownInstance,
} from "./countdown";

// --- Typing Indicator ---
export {
  createTypingIndicator,
} from "./typing-indicator";
export type {
  TypingAnimation,
  TypingSize,
  TypingIndicatorOptions,
  TypingIndicatorInstance,
} from "./typing-indicator";

// --- Rating Stars ---
export {
  createRatingStars,
} from "./rating-stars";
export type {
  StarIcon,
  RatingSize,
  RatingStarsOptions,
  RatingStarsInstance,
} from "./rating-stars";

// --- Progress Bar ---
export {
  createProgressBar,
  createCircleProgress,
} from "./progress-bar";
export type {
  ProgressVariant,
  ProgressSize,
  ProgressBarOptions,
  CircleProgressOptions,
} from "./progress-bar";

// --- Skeleton ---
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";

// --- Toast ---
export {
  ToastManager,
  getToastManager,
  showToast,
} from "./toast";
export type {
  ToastType,
  ToastPosition,
  ToastOptions,
  ToastInstance,
  ToastManagerConfig,
} from "./toast";

// --- Accordion ---
export {
  AccordionManager,
  createAccordion,
} from "./accordion";
export type {
  AccordionItem,
  AccordionMode,
  AccordionOptions,
  AccordionInstance,
} from "./accordion";

// --- Tabs ---
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabOrientation,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs";

// --- Modal ---
export {
  createModal,
} from "./modal";
export type {
  ModalSize,
  ModalPosition,
  ModalOptions,
  ModalInstance,
} from "./modal";

// --- Tooltip ---
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";

// --- Dropdown ---
export {
  createDropdown,
} from "./dropdown";
export type {
  DropdownPlacement,
  DropdownItem,
  DropdownSeparator,
  DropdownGroup,
  DropdownEntry,
  DropdownOptions,
  DropdownInstance,
} from "./dropdown";

// --- Popover ---
export {
  PopoverManager,
  createPopover,
} from "./popover";
export type {
  PopoverTrigger,
  PopoverPlacement,
  PopoverOptions,
  PopoverInstance,
} from "./popover";

// --- Carousel ---
export {
  CarouselManager,
  createCarousel,
} from "./carousel";
export type {
  CarouselSlide,
  CarouselOptions,
  CarouselInstance,
} from "./carousel";

// --- Lightbox ---
export {
  LightboxManager,
  createLightbox,
} from "./lightbox";
export type {
  LightboxImage,
  LightboxOptions,
  LightboxInstance,
} from "./lightbox";

// --- Image Gallery ---
export {
  ImageGalleryManager,
  createImageGallery,
} from "./image-gallery";
export type {
  GalleryImage,
  ImageGalleryOptions,
  ImageGalleryInstance,
} from "./image-gallery";

// --- Slider ---
export {
  SliderManager,
  createSlider,
} from "./slider";
export type {
  SliderMark,
  SliderOptions,
  SliderInstance,
} from "./slider";

// --- Switch ---
export {
  createSwitch,
} from "./switch";
export type {
  SwitchSize,
  SwitchVariant,
  SwitchOptions,
  SwitchInstance,
} from "./switch";

// --- Badge ---
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  BadgeOptions,
  StatusDotOptions,
} from "./badge";

// --- Avatar ---
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
} from "./avatar";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";

// --- Chip ---
export {
  createChip,
  createChipGroup,
} from "./chip";
export type {
  ChipSize,
  ChipVariant,
  ChipOptions,
  ChipInstance,
  ChipGroupOptions,
  ChipGroupInstance,
} from "./chip";

// --- Select ---
export {
  SelectManager,
  createSelect,
} from "./select";
export type {
  SelectOption,
  SelectOptions,
  SelectInstance,
} from "./select";

// --- Context Menu ---
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";

// --- Tree View ---
export {
  TreeView,
} from "./tree-view";
export type {
  TreeNodeData,
  TreeNode,
  CheckMode,
  TreeViewConfig,
} from "./tree-view";

// --- Pagination ---
export {
  PaginationManager,
  createPagination,
} from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";

// --- Breadcrumbs ---
export {
  createBreadcrumbs,
} from "./breadcrumbs";
export type {
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumbs";

// --- Stepper ---
export {
  StepperManager,
  createStepper,
} from "./stepper";
export type {
  StepStatus,
  StepConfig,
  StepperOptions,
  StepperInstance,
} from "./stepper";

// --- Timeline ---
export {
  TimelineManager,
  createTimeline,
} from "./timeline";
export type {
  TimelineItemStatus,
  TimelineItem,
  TimelineOptions,
  TimelineInstance,
} from "./timeline";

// --- Alert ---
export {
  AlertManager,
  createAlert,
} from "./alert";
export type {
  AlertVariant,
  AlertSize,
  AlertAction,
  AlertOptions,
  AlertInstance,
} from "./alert";

// --- Drawer ---
export {
  createDrawer,
} from "./drawer";
export type {
  DrawerSide,
  DrawerSize,
  DrawerOptions,
  DrawerInstance,
} from "./drawer";

// --- Splitter ---
export {
  createSplitter,
} from "./splitter";
export type {
  SplitterOrientation,
  SplitterPaneOptions,
  SplitterOptions,
  SplitterInstance,
} from "./splitter";

// --- Upload / File Manager ---
export {
  UploadManager,
  createUploadManager,
} from "./upload";
export type {
  UploadFile,
  UploadOptions,
  UploadInstance,
  UploadStatus,
  UploadProgressEvent,
  UploadResult,
  UploadConfig,
} from "./upload";

// --- Form Builder ---
export {
  FormBuilder,
  createForm,
  validations,
} from "./form-builder";
export type {
  FieldType,
  FieldValidation,
  SelectOption,
  FormField,
  FormSection,
  FormSchema,
  FieldError,
  FormState,
} from "./form-builder";

// --- Search Input ---
export {
  SearchInputManager,
  createSearchInput,
} from "./search-input";
export type {
  SuggestionItem,
  SearchHistoryEntry,
  SearchInputOptions,
  SearchInputInstance,
} from "./search-input";

// --- Data Table ---
export {
  DataTableManager,
  createDataTable,
} from "./data-table";
export type {
  Column,
  SortDirection,
  SortState,
  FilterState,
  DataTableOptions,
  DataTableInstance,
} from "./data-table";

// --- Chart ---
export {
  ChartManager,
  createChart,
} from "./chart";
export type {
  ChartType,
  ChartDataPoint,
  ChartDataset,
  ChartOptions,
  ChartInstance,
} from "./chart";

// --- Date Picker ---
export {
  DatePickerManager,
  createDatePicker,
} from "./date-picker";
export type {
  DatePickerOptions,
  DatePickerInstance,
} from "./date-picker";

// --- Color Picker ---
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type {
  RgbColor,
  HslColor,
  Palette,
} from "./color-picker";

// --- Notification ---
export {
  NotificationManager,
  getNotificationManager,
  toast,
} from "./notification";
export type {
  NotificationType,
  Notification,
  NotificationOptions,
  NotificationPosition,
} from "./notification";

// --- Command Palette ---
export {
  CommandPalette,
} from "./command-palette";
export type {
  Command,
  CommandCategory,
  CommandPaletteConfig,
  CommandPaletteState,
} from "./command-palette";

// --- Virtual List ---
export {
  createVirtualList,
} from "./virtual-list";
export type {
  VirtualListItem,
  VirtualListOptions,
  VirtualListInstance,
} from "./virtual-list";

// --- Rich Text Editor ---
export {
  createRichTextEditor,
} from "./rich-text-editor";
export type {
  EditorCommand,
  ToolbarButton,
  RichTextEditorOptions,
  RichTextEditorInstance,
} from "./rich-text-editor";

// --- Kanban Board ---
export {
  KanbanManager,
  createKanban,
} from "./kanban";
export type {
  CardPriority,
  CardSize,
  KanbanLabel,
  KanbanCard,
  KanbanColumn,
  KanbanSwimlane,
  KanbanOptions,
  KanbanInstance,
} from "./kanban";

// --- Markdown Editor ---
export {
  createMarkdownEditor,
} from "./markdown-editor";
export type {
  MarkdownEditorOptions,
  MarkdownEditorInstance,
} from "./markdown-editor";

// --- File Tree ---
export {
  FileManager,
  createFileTree,
} from "./file-tree";
export type {
  FileType,
  FileTreeNode,
  FileTreeOptions,
  FileTreeInstance,
} from "./file-tree";

// --- Terminal ---
export {
  createTerminal,
} from "./terminal";
export type {
  TerminalLine,
  TerminalTheme,
  TerminalCommand,
  TerminalOptions,
  TerminalInstance,
} from "./terminal";

// --- Code Editor ---
export {
  CodeEditorManager,
  createCodeEditor,
} from "./code-editor";
export type {
  CodeEditorOptions,
  CodeEditorInstance,
} from "./code-editor";

// --- Diff Viewer ---
export {
  computeDiff,
  toUnifiedDiff,
  applyPatch,
  renderInlineDiffHtml,
  renderSideBySideDiffHtml,
  wordDiff,
  renderWordDiffHtml,
  getDiffStyles,
  textSimilarity,
  formatDiffStats,
} from "./diff-viewer";
export type {
  DiffChunk,
  DiffResult,
  FileDiff,
} from "./diff-viewer";

// --- Comment Thread ---
export {
  CommentThreadManager,
  createCommentThread,
} from "./comment-thread";
export type {
  CommentAuthor,
  Comment,
  CommentThreadOptions,
  CommentThreadInstance,
} from "./comment-thread";

// --- Scheduler ---
export {
  Scheduler,
  parseCronExpression,
  cronMatches,
  getNextCronRun,
} from "./scheduler";
export type {
  ScheduledJob,
  CronExpression,
} from "./scheduler";

// --- Gantt Chart ---
export {
  createGanttChart,
} from "./gantt-chart";
export type {
  GanttTask,
  GanttChartOptions,
  GanttChartInstance,
} from "./gantt-chart";

// --- Mind Map ---
export {
  createMindMap,
} from "./mind-map";
export type {
  MindMapNode,
  MindMapOptions,
  MindMapInstance,
} from "./mind-map";

// --- Audio Player / Image Compare ---
export {
  createImageCompare,
} from "./audio-player";
export type {
  CompareDirection,
  HandleStyle,
  InteractionMode,
  ImageCompareOptions,
  ImageCompareInstance,
} from "./audio-player";

// --- Video Player ---
export {
  createVideoPlayer,
} from "./video-player";
export type {
  VideoTrack,
  QualityOption,
  Chapter,
  PlaylistItem,
  VideoPlayerOptions,
  VideoPlayerInstance,
} from "./video-player";

// --- Emoji Picker ---
export {
  createEmojiPicker,
} from "./emoji-picker";
export type {
  EmojiCategory,
  EmojiData,
  EmojiPickerOptions,
  EmojiPickerInstance,
} from "./emoji-picker";

// --- QR Code ---
export {
  generateQrSvg,
  generateQrDataUri,
  generateQrCanvas,
  validateQrInput,
} from "./qr-code";
export type {
  QrOptions,
} from "./qr-code";

// --- Signature Pad ---
export {
  createSignaturePad,
} from "./signature-pad";
export type {
  StrokePoint,
  Stroke,
  SignaturePadOptions,
  SignaturePadInstance,
} from "./signature-pad";

// --- Tooltip ---
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";

// --- Modal ---
export {
  createModal,
} from "./modal";
export type {
  ModalSize,
  ModalPosition,
  ModalOptions,
  ModalInstance,
} from "./modal";

// --- Tabs ---
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabOrientation,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs";

// --- Accordion ---
export {
  AccordionManager,
  createAccordion,
} from "./accordion";
export type {
  AccordionItem,
  AccordionMode,
  AccordionOptions,
  AccordionInstance,
} from "./accordion";

// --- Carousel ---
export {
  CarouselManager,
  createCarousel,
} from "./carousel";
export type {
  CarouselSlide,
  CarouselOptions,
  CarouselInstance,
} from "./carousel";

// --- Skeleton ---
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";

// --- Avatar ---
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
} from "./avatar";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";

// --- Badge ---
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  BadgeOptions,
  StatusDotOptions,
} from "./badge";

// --- Progress ---
export {
  createProgressTracker,
  createMultiProgressTracker,
  createStepProgress,
  formatProgress,
} from "./progress";
export type {
  ProgressState,
  ProgressCallback,
  ProgressController,
  MultiProgressController,
  StepProgressController,
} from "./progress";

// --- Rating ---
export {
  RatingManager,
  createRating,
} from "./rating";
export type {
  StarIconType,
  RatingOptions,
  RatingInstance,
} from "./rating";

// --- Slider ---
export {
  SliderManager,
  createSlider,
} from "./slider";
export type {
  SliderMark,
  SliderOptions,
  SliderInstance,
} from "./slider";

// --- Switch ---
export {
  createSwitch,
} from "./switch";
export type {
  SwitchSize,
  SwitchVariant,
  SwitchOptions,
  SwitchInstance,
} from "./switch";

// --- Breadcrumb ---
export {
  BreadcrumbManager,
  createBreadcrumb,
} from "./breadcrumb";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb";

// --- Pagination ---
export {
  PaginationManager,
  createPagination,
} from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";

// --- Dropdown Menu ---
export {
  DropdownMenuManager,
  createDropdownMenu,
} from "./dropdown-menu";
export type {
  MenuItemType,
  MenuItem,
  DropdownMenuOptions,
  DropdownMenuInstance,
} from "./dropdown-menu";

// --- Tree Select ---
export {
  TreeSelectManager,
  createTreeSelect,
} from "./tree-select";
export type {
  TreeNodeData,
  TreeSelectOptions,
  TreeSelectInstance,
} from "./tree-select";

// --- Time Picker ---
export {
  createTimePicker,
} from "./time-picker";
export type {
  TimeFormat,
  TimePickerMode,
  TimePickerOptions,
  TimePickerInstance,
} from "./time-picker";

// --- Popover ---
export {
  PopoverManager,
  createPopover,
} from "./popover";
export type {
  PopoverTrigger,
  PopoverPlacement,
  PopoverOptions,
  PopoverInstance,
} from "./popover";

// --- Context Menu ---
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";

// --- Select ---
export {
  SelectManager,
  createSelect,
} from "./select";
export type {
  SelectOption,
  SelectOptions,
  SelectInstance,
} from "./select";

// --- Alert ---
export {
  AlertManager,
  createAlert,
} from "./alert";
export type {
  AlertVariant,
  AlertSize,
  AlertAction,
  AlertOptions,
  AlertInstance,
} from "./alert";

// --- Splitter ---
export {
  createSplitter,
} from "./drawer";
export type {
  SplitterOrientation,
  SplitterPaneOptions,
  SplitterOptions,
  SplitterInstance,
} from "./drawer";

// --- Steps ---
export {
  StepsManager,
  createSteps,
} from "./steps";
export type {
  StepStatus,
  StepItem,
  StepsOrientation,
  StepsVariant,
  StepsOptions,
  StepsInstance,
} from "./steps";

// --- Empty State ---
export {
  EmptyStateManager,
  createEmptyState,
} from "./empty-state";
export type {
  EmptyStateVariant,
  EmptyStateOptions,
  EmptyStateInstance,
} from "./empty-state";

// --- Toast ---
export {
  ToastManager,
  getToastManager,
  showToast,
} from "./toast";
export type {
  ToastType,
  ToastPosition,
  ToastOptions,
  ToastInstance,
  ToastManagerConfig,
} from "./toast";

// --- Confirm Dialog ---
export {
  createConfirmDialog,
} from "./confirm-dialog";
export type {
  ConfirmDialogVariant,
  ConfirmButtonVariant,
  ConfirmButton,
  ConfirmDialogOptions,
  ConfirmDialogInstance,
} from "./confirm-dialog";

// --- Lightbox ---
export {
  LightboxManager,
  createLightbox,
} from "./lightbox";
export type {
  LightboxImage,
  LightboxOptions,
  LightboxInstance,
} from "./lightbox";

// --- Notification Channels ---
export {
  NotificationManager,
  ChannelRateLimiter,
  TemplateEngine,
  createNotificationManager,
  createSaaSNotifier,
} from "./notification-channels";
export type {
  NotificationChannelType,
  NotificationMessage,
  EmailChannelConfig,
  PushChannelConfig,
  SmsChannelConfig,
  WebhookChannelConfig,
  SlackChannelConfig,
  DiscordChannelConfig,
  ChannelProvider,
  RateLimitConfig,
  TemplateVariable,
  UserNotificationPreference,
  NotificationStats,
  NotificationHistoryEntry,
  NotificationManagerConfig,
  NotificationSendResult,
  SaaSNotifierInstance,
} from "./notification-channels";

// --- Tree View ---
export {
  TreeView,
} from "./tree-view";
export type {
  TreeNodeData,
  TreeNode,
  CheckMode,
  TreeViewConfig,
} from "./tree-view";

// --- Input OTP ---
export {
  createOtpInput,
} from "./input-otp";
export type {
  OtpInputVariant,
  OtpSize,
  OtpInputOptions,
  OtpInputInstance,
} from "./input-otp";

// --- Color Picker ---
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type {
  RgbColor,
  HslColor,
  Palette,
} from "./color-picker";

// --- Date Picker ---
export {
  DatePickerManager,
  createDatePicker,
} from "./date-picker";
export type {
  DatePickerOptions,
  DatePickerInstance,
} from "./date-picker";

// --- File Upload ---
export {
  FileUploadManager,
  createFileUpload,
} from "./file-upload";
export type {
  FileUploadOptions,
  UploadFile,
  FileUploadInstance,
} from "./file-upload";

// --- Form Builder ---
export {
  FormBuilder,
  createForm,
  validations,
} from "./form-builder";
export type {
  FieldType,
  FieldValidation,
  SelectOption,
  FormField,
  FormSection,
  FormSchema,
  FieldError,
  FormState,
} from "./form-builder";

// --- Data Table ---
export {
  DataTableManager,
  createDataTable,
} from "./data-table";
export type {
  Column,
  SortDirection,
  SortState,
  FilterState,
  DataTableOptions,
  DataTableInstance,
} from "./data-table";

// --- Command Palette ---
export {
  CommandPalette,
} from "./command-palette";
export type {
  Command,
  CommandCategory,
  CommandPaletteConfig,
  CommandPaletteState,
} from "./command-palette";

// --- Markdown Editor ---
export {
  createMarkdownEditor,
} from "./markdown-editor";
export type {
  MarkdownEditorOptions,
  MarkdownEditorInstance,
} from "./markdown-editor";

// --- Code Editor ---
export {
  CodeEditorManager,
  createCodeEditor,
} from "./code-editor";
export type {
  CodeEditorOptions,
  CodeEditorInstance,
} from "./code-editor";

// --- Rich Text Editor ---
export {
  createRichTextEditor,
} from "./rich-text-editor";
export type {
  EditorCommand,
  ToolbarButton,
  RichTextEditorOptions,
  RichTextEditorInstance,
} from "./rich-text-editor";

// --- Kanban Board ---
export {
  createKanbanBoard,
} from "./kanban-board";
export type {
  KanbanCard,
  KanbanColumn,
  KanbanBoardOptions,
  KanbanBoardInstance,
} from "./kanban-board";

// --- Calendar ---
export {
  CalendarManager,
  createCalendar,
} from "./calendar";
export type {
  CalendarView,
  WeekStartDay,
  CalendarEvent,
  CalendarOptions,
  CalendarInstance,
} from "./calendar";

// --- Chart ---
export {
  ChartManager,
  createChart,
} from "./chart";
export type {
  ChartType,
  ChartDataPoint,
  ChartDataset,
  ChartOptions,
  ChartInstance,
} from "./chart";

// --- Virtual Scroller ---
export {
  VirtualScroller,
} from "./virtual-scroller";
export type {
  ScrollItem,
  VisibleRange,
  ScrollerConfig,
  ScrollerState,
  ScrollToOptions,
} from "./virtual-scroller";

// --- Infinite Scroll ---
export {
  InfiniteScroll,
} from "./infinite-scroll";
export type {
  InfiniteScrollItem,
  InfiniteScrollOptions,
  InfiniteScrollState,
} from "./infinite-scroll";

// --- Lazy Image ---
export {
  createLazyImage,
} from "./lazy-image";
export type {
  LazyImageFit,
  LazyImageLoading,
  LazyImageOptions,
  LazyImageInstance,
} from "./lazy-image";

// --- Tour Guide ---
export {
  TourManager,
  createTour,
} from "./tour-guide";
export type {
  TourStep,
  TourOptions,
  TourInstance,
} from "./tour-guide";

// --- Hotkeys ---
export {
  HotkeyManager,
  createAppHotkeys,
  parseKeyCombo,
  eventMatchesCombo,
  formatKeyDisplay,
  areModifiersDown,
  getModifierString,
} from "./hotkeys";
export type {
  HotkeyBinding,
  HotkeyEvent,
  ParsedKeyCombo,
} from "./hotkeys";

// --- Clipboard ---
export {
  copyToClipboard,
  copyRichToClipboard,
  readFromClipboard,
  readRichFromClipboard,
  isClipboardAvailable,
  canReadClipboard,
  watchClipboard,
} from "./clipboard";
export type {
  ClipboardData,
  ClipboardOptions,
} from "./clipboard";

// --- Analytics ---
export {
  AnalyticsManager,
  getAnalytics,
  initAnalytics,
} from "./analytics";
export type {
  AnalyticsEvent,
  PageView,
  PerformanceMetric,
  AnalyticsConfig,
  AnalyticsState,
} from "./analytics";

// --- i18n ---
export {
  t,
  getLocale,
  setLocale,
  LOCALE_CHANGE_EVENT,
} from "./i18n";
export type {
  Locale,
} from "./i18n";

// --- Theme ---
export {
  ThemeManager,
  LIGHT_THEME,
  DARK_THEME,
  BUILT_IN_THEMES,
  getThemeManager,
  useTheme,
} from "./theme";
export type {
  ThemeColors,
  ThemeConfig,
} from "./theme";

// --- State Machine ---
export {
  FSM,
  HSM,
  createMachine,
  interpret,
  evaluateChoice,
  evaluateJunction,
  deepHistoryTarget,
  shallowHistoryTarget,
  match,
  stateEquals,
} from "./state-machine";
export type {
  StateId,
  EventId,
  MachineContext,
  GuardFn,
  ActionFn,
  TransitionDef,
  StateConfig,
  MachineConfig,
  InvalidEventStrategy,
  HistoryMode,
  ChoiceConfig,
  JunctionConfig,
  StateValue,
  TransitionHistoryEntry,
  Service,
} from "./state-machine";

// --- Event Bus ---
export {
  EventBus,
  createEventBus,
} from "./event-bus";
export type {
  EventCallback,
  EventMiddleware,
  Subscription,
  EmittedEvent,
  EventBusOptions,
} from "./event-bus";

// --- Storage ---
export {
  storageGet,
  storageSet,
  storageRemove,
  storageKeys,
  storageClear,
} from "./storage";

// --- Drag and Drop ---
export {
  DragDropManager,
  getDragDropManager,
} from "./drag-and-drop";
export type {
  DragMode,
  DropPosition,
  DragItem,
  DragOptions,
  DropZoneOptions,
  DropResult,
  SortableConfig,
} from "./drag-and-drop";

// --- Resize Observer ---
export {
  ResizeWatcher,
  createResizeObserver,
  matchParentSize,
  whenSizeExceeds,
} from "./resize-observer";
export type {
  ResizeBox,
  ResizeObserverOptions,
  ResizeObserverEntry,
  ResizeObserverInstance,
} from "./resize-observer";

// --- Intersection Manager ---
export {
  IntersectionManager,
  createIntersectionManager,
  whenInView,
  trackVisibility,
  lazyLoadElements,
} from "./intersection-manager";
export type {
  IntersectionTarget,
  IntersectionManagerOptions,
  IntersectionManagerInstance,
} from "./intersection-manager";

// --- Scroll Lock ---
export {
  ScrollLockManager,
  getScrollLockManager,
  lockScroll,
  withScrollLock,
  withScrollLockAsync,
  setupAutoResizeScrollLock,
} from "./scroll-lock";
export type {
  ScrollLockOptions,
  ScrollLockInstance,
} from "./scroll-lock";

// --- Focus Trap ---
export {
  FocusTrapManager,
  createFocusTrap,
  FocusTrapStack,
} from "./focus-trap";
export type {
  FocusTrapOptions,
  FocusTrapInstance,
} from "./focus-trap";

// --- Modal Manager ---
export {
  ModalManager,
  getModalManager,
} from "./modal-manager";
export type {
  ModalSize,
  ModalAnimation,
  ModalOptions,
  ModalAction,
  ModalInstance,
  ConfirmOptions,
} from "./modal-manager";

// --- Toast ---
export {
  ToastManager,
  getToastManager,
  showToast,
} from "./toast";
export type {
  ToastType,
  ToastPosition,
  ToastOptions,
  ToastInstance,
  ToastManagerConfig,
} from "./toast";

// --- Tooltip ---
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";

// --- Popover ---
export {
  PopoverManager,
  createPopover,
} from "./popover";
export type {
  PopoverTrigger,
  PopoverPlacement,
  PopoverOptions,
  PopoverInstance,
} from "./popover";

// --- Splitter / Drawer ---
export {
  createSplitter,
} from "./drawer";
export type {
  SplitterOrientation,
  SplitterPaneOptions,
  SplitterOptions,
  SplitterInstance,
} from "./drawer";

// --- Sheet ---
export {
  createSheet,
} from "./sheet";
export type {
  SheetSnapPoint,
  SheetOptions,
  SheetInstance,
} from "./sheet";

// --- Accordion ---
export {
  AccordionManager,
  createAccordion,
} from "./accordion";
export type {
  AccordionItem,
  AccordionMode,
  AccordionOptions,
  AccordionInstance,
} from "./accordion";

// --- Tabs ---
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabOrientation,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs";

// --- Stepper ---
export {
  StepperManager,
  createStepper,
} from "./stepper";
export type {
  StepStatus,
  StepConfig,
  StepperOptions,
  StepperInstance,
} from "./stepper";

// --- Breadcrumb ---
export {
  BreadcrumbManager,
  createBreadcrumb,
} from "./breadcrumb";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb";

// --- Skeleton ---
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";

// --- Avatar ---
export {
  getInitials,
  createAvatar,
  createAvatarGroup,
} from "./avatar";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";

// --- Badge ---
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  BadgeOptions,
  StatusDotOptions,
} from "./badge";

// --- Progress ---
export {
  createProgressTracker,
  createMultiProgressTracker,
  formatProgress,
  createStepProgress,
} from "./progress";
export type {
  ProgressState,
  ProgressCallback,
  ProgressController,
  MultiProgressController,
  StepProgressController,
} from "./progress";

// --- Spinner ---
export {
  createSpinner,
  miniSpinner,
  fullPageSpinner,
} from "./spinner";
export type {
  SpinnerVariant,
  SpinnerSize,
  SpinnerOptions,
} from "./spinner";

// --- Rating ---
export {
  RatingManager,
  createRating,
} from "./rating";
export type {
  StarIconType,
  RatingOptions,
  RatingInstance,
} from "./rating";

// --- Carousel ---
export {
  CarouselManager,
  createCarousel,
} from "./carousel";
export type {
  CarouselSlide,
  CarouselOptions,
  CarouselInstance,
} from "./carousel";

// --- Pagination ---
export {
  PaginationManager,
  createPagination,
} from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";

// --- Empty State ---
export {
  EmptyStateManager,
  createEmptyState,
} from "./empty-state";
export type {
  EmptyStateVariant,
  EmptyStateOptions,
  EmptyStateInstance,
} from "./empty-state";

// --- Switch ---
export {
  createSwitch,
} from "./switch";
export type {
  SwitchSize,
  SwitchVariant,
  SwitchOptions,
  SwitchInstance,
} from "./switch";

// --- Checkbox ---
export {
  createCheckbox,
  createRadio,
  createCheckboxGroup,
} from "./checkbox";
export type {
  CheckboxSize,
  CheckboxVariant,
  CheckboxOptions,
  RadioOptions,
  CheckboxInstance,
  RadioInstance,
  CheckboxGroupOptions,
  CheckboxGroupInstance,
} from "./checkbox";

// --- Radio Group ---
export {
  RadioGroupManager,
  createRadioGroup,
} from "./radio";
export type {
  RadioSize,
  RadioVariant,
  RadioOption,
  RadioGroupOptions,
  RadioGroupInstance,
} from "./radio";

// --- Input ---
export {
  createInput,
} from "./input";
export type {
  InputSize,
  InputVariant,
  InputState,
  InputOptions,
  InputInstance,
} from "./input";

// --- Select ---
export {
  SelectManager,
  createSelect,
} from "./select";
export type {
  SelectOption,
  SelectOptions,
  SelectInstance,
} from "./select";

// --- Textarea ---
export {
  createTextarea,
} from "./textarea";
export type {
  TextareaSize,
  TextareaState,
  TextareaOptions,
  TextareaInstance,
} from "./textarea";

// --- Alert ---
export {
  AlertManager,
  createAlert,
} from "./alert";
export type {
  AlertVariant,
  AlertSize,
  AlertAction,
  AlertOptions,
  AlertInstance,
} from "./alert";

// --- Notification ---
export {
  NotificationManager,
  getNotificationManager,
  toast as toastUtil,
} from "./notification";
export type {
  NotificationType,
  NotificationPosition,
  NotificationOptions,
  Notification,
} from "./notification";

// --- Context Menu ---
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";

// --- Confirm Dialog ---
export {
  createConfirmDialog,
} from "./confirm-dialog";
export type {
  ConfirmDialogVariant,
  ConfirmButtonVariant,
  ConfirmButton,
  ConfirmDialogOptions,
  ConfirmDialogInstance,
} from "./confirm-dialog";

// --- Split Button ---
export {
  createSplitButton,
} from "./splitter";
export type {
  SplitButtonSize,
  SplitButtonVariant,
  SplitButtonItem,
  SplitButtonOptions,
  SplitButtonInstance,
} from "./splitter";

// --- Dropdown ---
export {
  createDropdown,
} from "./dropdown";
export type {
  DropdownPlacement,
  DropdownItem,
  DropdownSeparator,
  DropdownGroup,
  DropdownEntry,
  DropdownOptions,
  DropdownInstance,
} from "./dropdown";

// --- Command Palette ---
export {
  CommandPalette,
} from "./command-palette";
export type {
  Command,
  CommandCategory,
  CommandPaletteConfig,
  CommandPaletteState,
} from "./command-palette";

// --- Date Picker ---
export {
  DatePickerManager,
  createDatePicker,
} from "./date-picker";
export type {
  DatePickerOptions,
  DatePickerInstance,
} from "./date-picker";

// --- Color Picker ---
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type {
  RgbColor,
  HslColor,
  Palette,
} from "./color-picker";

// --- Tree View ---
export {
  TreeView,
} from "./tree-view";
export type {
  TreeNodeData,
  TreeNode,
  CheckMode,
  TreeViewConfig,
} from "./tree-view";

// --- Table ---
export {
  createTableState,
  getSortedData,
  getFilteredData,
  getPaginatedData,
  getCellValue,
  applyFilterOperator,
  toggleSort,
  setSearchTerm,
  toggleFilter,
  goToPage,
  setPageSize,
  toggleRowSelection,
  toggleSelectAll,
  toggleRowExpand,
  resetTable,
  exportTableAsCsv,
} from "./table";
export type {
  Column,
  TableState,
  SortState,
  FilterState,
  FilterOperator,
  PaginationState,
  SelectionState,
} from "./table";

// --- Transfer ---
export {
  TransferManager,
  createTransfer,
} from "./transfer";
export type {
  TransferItem,
  TransferOptions,
  TransferInstance,
} from "./transfer";

// --- Slider ---
export {
  SliderManager,
  createSlider,
} from "./slider";
export type {
  SliderMark,
  SliderOptions,
  SliderInstance,
} from "./slider";

// --- Upload ---
export {
  createUpload,
} from "./upload";
export type {
  UploadStatus,
  UploadFile,
  UploadOptions,
  UploadInstance,
} from "./upload";

// --- Tour ---
export {
  createTour,
} from "./tour";
export type {
  TourStep,
  TourOptions,
  TourInstance,
} from "./tour";

// --- Autocomplete ---
export {
  AutocompleteManager,
  createAutocomplete,
} from "./autocomplete";
export type {
  AutocompleteOption,
  AutocompleteOptions,
  AutocompleteInstance,
} from "./autocomplete";

// --- Tag Input ---
export {
  TagInputManager,
  createTagInput,
} from "./tag-input";
export type {
  TagItem,
  TagInputOptions,
  TagInputInstance,
} from "./tag-input";

// --- Mention ---
export {
  MentionManager,
  createMention,
} from "./mention";
export type {
  MentionOption,
  MentionOptions,
  MentionInstance,
} from "./mention";

// --- Timeline ---
export {
  TimelineManager,
  createTimeline,
} from "./timeline";
export type {
  TimelineItemStatus,
  TimelineItem,
  TimelineOptions,
  TimelineInstance,
} from "./timeline";

// --- Statistics ---
export {
  createStatCard,
} from "./statistics";
export type {
  TrendDirection,
  SparklineType,
  StatCardOptions,
  StatisticsInstance,
} from "./statistics";

// --- Sidebar ---
export {
  SidebarManager,
  createSidebar,
} from "./sidebar";
export type {
  SidebarItem,
  SidebarGroup,
  SidebarOptions,
  SidebarInstance,
} from "./sidebar";

// --- Code Block ---
export {
  CodeBlockManager,
  createCodeBlock,
} from "./code-block";
export type {
  CodeTheme,
  CodeBlockOptions,
  CodeBlockInstance,
} from "./code-block";

// --- Markdown Renderer ---
export {
  parseMarkdown,
  renderToHtml,
  generateToc,
  renderToc,
  extractFrontMatter,
  extractText,
  countWords,
  readingTime,
  mdToHtml,
} from "./markdown-renderer";
export type {
  MdNodeType,
  MdNode,
  MdRenderOptions,
  TocEntry,
  FrontMatter,
} from "./markdown-renderer";

// --- Virtual List ---
export {
  createVirtualList,
} from "./virtual-list";
export type {
  VirtualListItem,
  VirtualListOptions,
  VirtualListInstance,
} from "./virtual-list";

// --- Calendar ---
export {
  CalendarManager,
  createCalendar,
} from "./calendar";
export type {
  CalendarView,
  WeekStartDay,
  CalendarEvent,
  CalendarOptions,
  CalendarInstance,
} from "./calendar";

// --- Lightbox ---
export {
  LightboxManager,
  createLightbox,
} from "./lightbox";
export type {
  LightboxImage,
  LightboxOptions,
  LightboxInstance,
} from "./lightbox";

// --- Segmented Control ---
export {
  createSegmentedControl,
} from "./segmented-control";
export type {
  SegmentedOption,
  SegmentedSize,
  SegmentedControlOptions,
  SegmentedControlInstance,
} from "./segmented-control";

// --- Form ---
export {
  createForm,
} from "./form";
export type {
  FieldType,
  ValidationRule,
  FormField,
  FormGroup,
  FormOptions,
  FormInstance,
} from "./form";

// --- Chart ---
export {
  ChartManager,
  createChart,
} from "./chart";
export type {
  ChartType,
  ChartDataPoint,
  ChartOptions,
  ChartInstance,
} from "./chart";

// --- Notification Card ---
export {
  createNotificationCard,
} from "./notification-card";
export type {
  NotificationPriority,
  NotificationType,
  NotificationAction,
  NotificationCardOptions,
  NotificationCardInstance,
} from "./notification-card";

// --- Progress ---
export {
  createProgressTracker,
  createMultiProgressTracker,
  formatProgress,
  createStepProgress,
  getInitials,
} from "./progress";
export type {
  ProgressState,
  ProgressCallback,
  ProgressController,
  MultiProgressController,
  StepProgressController,
} from "./progress";

// --- Avatar ---
export {
  createAvatar,
  createAvatarGroup,
} from "./avatar";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";

// --- Breadcrumb ---
export {
  BreadcrumbManager,
  createBreadcrumb,
} from "./breadcrumb";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb";

// --- Rating ---
export {
  RatingManager,
  createRating,
} from "./rating";
export type {
  StarIconType,
  RatingOptions,
  RatingInstance,
} from "./rating";

// --- Skeleton ---
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";

// --- Empty State ---
export {
  EmptyStateManager,
  createEmptyState,
} from "./empty-state";
export type {
  EmptyStateVariant,
  EmptyStateOptions,
  EmptyStateInstance,
} from "./empty-state";

// --- Tooltip ---
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";

// --- Popover ---
export {
  PopoverManager,
  createPopover,
} from "./popover";
export type {
  PopoverTrigger,
  PopoverPlacement,
  PopoverOptions,
  PopoverInstance,
} from "./popover";

// --- Context Menu ---
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";

// --- Accordion ---
export {
  AccordionManager,
  createAccordion,
} from "./accordion";
export type {
  AccordionItem,
  AccordionMode,
  AccordionOptions,
  AccordionInstance,
} from "./accordion";

// --- Tabs ---
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabOrientation,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs";

// --- Modal ---
export {
  createModal,
} from "./modal";
export type {
  ModalSize,
  ModalPosition,
  ModalOptions,
  ModalInstance,
} from "./modal";

// --- Drawer / Splitter ---
export {
  createSplitter,
} from "./drawer";
export type {
  SplitterOrientation,
  SplitterPaneOptions,
  SplitterOptions,
  SplitterInstance,
} from "./drawer";

// --- Alert ---
export {
  AlertManager,
  createAlert,
} from "./alert";
export type {
  AlertVariant,
  AlertSize,
  AlertAction,
  AlertOptions,
  AlertInstance,
} from "./alert";

// --- Badge ---
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  BadgeOptions,
  StatusDotOptions,
} from "./badge";

// --- Switch ---
export {
  createSwitch,
} from "./switch";
export type {
  SwitchSize,
  SwitchVariant,
  SwitchOptions,
  SwitchInstance,
} from "./switch";

// --- Checkbox ---
export {
  createCheckbox,
  createRadio,
  createCheckboxGroup,
} from "./checkbox";
export type {
  CheckboxSize,
  CheckboxVariant,
  CheckboxOptions,
  RadioOptions,
  CheckboxInstance,
  RadioInstance,
  CheckboxGroupOptions,
  CheckboxGroupInstance,
} from "./checkbox";

// --- Radio Group ---
export {
  createRadioGroup,
} from "./radio-group";
export type {
  RadioSize,
  RadioVariant,
  RadioOption,
  RadioGroupOptions,
  RadioGroupInstance,
} from "./radio-group";

// --- Input ---
export {
  createInput,
} from "./input";
export type {
  InputSize,
  InputVariant,
  InputState,
  InputOptions,
  InputInstance,
} from "./input";

// --- Select ---
export {
  SelectManager,
  createSelect,
} from "./select";
export type {
  SelectOption,
  SelectOptions,
  SelectInstance,
} from "./select";

// --- Textarea ---
export {
  createTextarea,
} from "./textarea";
export type {
  TextareaSize,
  TextareaState,
  TextareaOptions,
  TextareaInstance,
} from "./textarea";

// --- Button ---
export {
  createButton,
  createButtonGroup,
} from "./button";
export type {
  ButtonVariant,
  ButtonSize,
  ButtonOptions,
  ButtonGroupOptions,
  ButtonGroupInstance,
} from "./button";

// --- Card ---
export {
  createCard,
} from "./card";
export type {
  CardVariant,
  CardSize,
  CardHeaderOptions,
  CardImageOptions,
  CardOptions,
  CardInstance,
} from "./card";

// --- List ---
export {
  createList,
} from "./list";
export type {
  ListSelectionMode,
  ListVariant,
  ListItem,
  ListOptions,
  ListInstance,
} from "./list";

// --- Spinner ---
export {
  createSpinner,
  miniSpinner,
  fullPageSpinner,
} from "./spinner";
export type {
  SpinnerVariant,
  SpinnerSize,
  SpinnerOptions,
} from "./spinner";

// --- Pagination ---
export {
  PaginationManager,
  createPagination,
} from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";

// --- Stepper ---
export {
  StepperManager,
  createStepper,
} from "./stepper";
export type {
  StepStatus,
  StepConfig,
  StepperOptions,
  StepperInstance,
} from "./stepper";

// --- Carousel ---
export {
  CarouselManager,
  createCarousel,
} from "./carousel";
export type {
  CarouselSlide,
  CarouselOptions,
  CarouselInstance,
} from "./carousel";

// --- Collapse ---
export {
  CollapseManager,
  createCollapse,
  createCollapseGroup,
} from "./collapse";
export type {
  CollapseSize,
  CollapseVariant,
  CollapseOptions,
  CollapseInstance,
  CollapseGroupOptions,
  CollapseGroupInstance,
} from "./collapse";

// --- Drawer Panel ---
export {
  createDrawer,
} from "./drawer-panel";
export type {
  DrawerPlacement,
  DrawerSize,
  DrawerOptions,
  DrawerInstance,
} from "./drawer-panel";

// --- Typeahead / Autocomplete ---
export {
  TypeaheadManager,
  createTypeahead,
} from "./typeahead";
export type {
  TypeaheadItem,
  TypeaheadOptions,
  TypeaheadInstance,
} from "./typeahead";

// --- Command Menu / Palette ---
export {
  CommandMenuManager,
  createCommandMenu,
} from "./command-menu";
export type {
  CommandItem,
  CommandCategory,
  CommandMenuOptions,
  CommandMenuInstance,
} from "./command-menu";

// --- Toast Notification System ---
export {
  ToastManager,
  getToastManager,
  showToast,
} from "./toast";
export type {
  ToastType,
  ToastPosition,
  ToastOptions,
  ToastInstance,
  ToastManagerConfig,
} from "./toast";

// --- Range Slider ---
export {
  SliderManager,
  createSlider,
} from "./slider";
export type {
  SliderMark,
  SliderOptions,
  SliderInstance,
} from "./slider";

// --- Date Picker ---
export {
  DatePickerManager,
  createDatePicker,
} from "./date-picker";
export type {
  DatePickerOptions,
  DatePickerInstance,
} from "./date-picker";

// --- Color Picker Utilities ---
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type {
  RgbColor,
  HslColor,
  Palette,
} from "./color-picker";

// --- Tree View ---
export {
  TreeView,
} from "./tree-view";
export type {
  TreeNodeData,
  TreeNode,
  CheckMode,
  TreeViewConfig,
} from "./tree-view";

// --- Table / Data Grid Utilities ---
export {
  createTableState,
  getSortedData,
  getFilteredData,
  getPaginatedData,
  getCellValue,
  applyFilterOperator,
  toggleSort,
  setSearchTerm,
  toggleFilter,
  goToPage,
  setPageSize,
  toggleRowSelection,
  toggleSelectAll,
  toggleRowExpand,
  resetTable,
  exportTableAsCsv,
} from "./table";
export type {
  Column,
  TableState,
  SortState,
  FilterState,
  FilterOperator,
  PaginationState,
  SelectionState,
} from "./table";

// --- File Upload ---
export {
  createUpload,
} from "./upload";
export type {
  UploadStatus,
  UploadFile,
  UploadOptions,
  UploadInstance,
} from "./upload";

// --- Dropdown Menu ---
export {
  DropdownMenuManager,
  createDropdownMenu,
} from "./dropdown-menu";
export type {
  MenuItemType,
  MenuItem,
  DropdownMenuOptions,
  DropdownMenuInstance,
} from "./dropdown-menu";

// --- Tag / Chip Input ---
export {
  TagInputManager,
  createTagInput,
} from "./tag-input";
export type {
  TagItem,
  TagInputOptions,
  TagInputInstance,
} from "./tag-input";

// --- Timeline Component ---
export {
  TimelineManager,
  createTimeline,
} from "./timeline";
export type {
  TimelineItemStatus,
  TimelineItem,
  TimelineOptions,
  TimelineInstance,
} from "./timeline";

// --- Menu Bar ---
export {
  MenuBarManager,
  createMenuBar,
} from "./menu-bar";
export type {
  MenuBarItem,
  MenuBarOptions,
  MenuBarInstance,
} from "./menu-bar";

// --- Toolbar ---
export {
  createToolbar,
} from "./toolbar";
export type {
  ToolbarAlignment,
  ToolbarSize,
  ToolbarItem,
  ToolbarOptions,
  ToolbarInstance,
} from "./toolbar";

// --- Notification Bell ---
export {
  createNotificationBell,
} from "./notification-bell";
export type {
  NotificationItem,
  NotificationBellOptions,
  NotificationBellInstance,
} from "./notification-bell";

// --- Stat Card ---
export {
  createStatCard,
} from "./stat-card";
export type {
  TrendDirection,
  StatCardVariant,
  StatCardOptions,
} from "./stat-card";

// --- Pricing Table ---
export {
  createPricingTable,
} from "./pricing-table";
export type {
  PricingFeature,
  PricingPlan,
  PricingTableOptions,
  PricingTableInstance,
} from "./pricing-table";

// --- Testimonial / Review Card ---
export {
  createTestimonial,
} from "./testimonial";
export type {
  TestimonialLayout,
  TestimonialSize,
  TestimonialItem,
  TestimonialOptions,
  TestimonialInstance,
} from "./testimonial";

// --- Comment Section ---
export {
  createCommentSection,
} from "./comment-section";
export type {
  CommentAuthor,
  Comment,
  CommentSectionOptions,
  CommentSectionInstance,
} from "./comment-section";

// --- Chat Bubble ---
export {
  ChatBubbleManager,
  createChatBubble,
} from "./chat-bubble";
export type {
  MessageRole,
  ChatMessage,
  ChatBubbleOptions,
  ChatBubbleInstance,
} from "./chat-bubble";

// --- Hero Banner ---
export {
  createHeroBanner,
} from "./hero-banner";
export type {
  HeroLayout,
  HeroSize,
  HeroButton,
  HeroBannerOptions,
  HeroBannerInstance,
} from "./hero-banner";

// --- Sidebar Navigation ---
export {
  SidebarManager,
  createSidebar,
} from "./sidebar";
export type {
  SidebarItem,
  SidebarGroup,
  SidebarOptions,
  SidebarInstance,
} from "./sidebar";

// --- Tab Bar ---
export {
  createTabBar,
} from "./tab-bar";
export type {
  TabItem,
  TabSize,
  TabVariant,
  TabBarOptions,
  TabBarInstance,
} from "./tab-bar";

// --- Page Footer ---
export {
  createFooter,
} from "./footer";
export type {
  FooterLink,
  FooterColumn,
  SocialLink,
  FooterOptions,
  FooterInstance,
} from "./footer";

// --- Search Dialog ---
export {
  createSearchDialog,
} from "./search-dialog";
export type {
  SearchResult,
  SearchCategory,
  SearchDialogOptions,
  SearchDialogInstance,
} from "./search-dialog";

// --- QR Code Generator ---
export {
  generateQrSvg,
  generateQrDataUri,
  generateQrCanvas,
  validateQrInput,
} from "./qr-code";
export type {
  QrOptions,
} from "./qr-code";

// --- Avatar Editor ---
export {
  createAvatarEditor,
} from "./avatar-editor";
export type {
  AvatarEditorOptions,
  AvatarEditorInstance,
} from "./avatar-editor";

// --- Image Gallery ---
export {
  ImageGalleryManager,
  createImageGallery,
} from "./image-gallery";
export type {
  GalleryImage,
  ImageGalleryOptions,
  ImageGalleryInstance,
} from "./image-gallery";

// --- Copy Button ---
export {
  createCopyButton,
} from "./copy-button";
export type {
  CopyVariant,
  CopySize,
  CopyButtonOptions,
  CopyButtonInstance,
} from "./copy-button";

// --- Print Button ---
export {
  createPrintButton,
} from "./print-button";
export type {
  PrintVariant,
  PrintSize,
  PrintButtonOptions,
  PrintButtonInstance,
} from "./print-button";

// --- Progress Bar ---
export {
  createProgressBar,
  createCircleProgress,
} from "./progress-bar";
export type {
  ProgressVariant,
  ProgressSize,
  ProgressBarOptions,
  CircleProgressOptions,
} from "./progress-bar";

// --- Skeleton Loading ---
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";

// --- Badge ---
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  BadgeOptions,
  StatusDotOptions,
} from "./badge";

// --- Accordion ---
export {
  AccordionManager,
  createAccordion,
} from "./accordion";
export type {
  AccordionItem,
  AccordionMode,
  AccordionOptions,
  AccordionInstance,
} from "./accordion";

// --- Modal ---
export {
  createModal,
} from "./modal";
export type {
  ModalSize,
  ModalPosition,
  ModalOptions,
  ModalInstance,
} from "./modal";

// --- Tooltip ---
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";

// --- Tabs ---
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabItem as TabsTabItem,
  TabOrientation,
  TabVariant,
  TabsOptions,
  TabsInstance,
} from "./tabs";

// --- Alert ---
export {
  AlertManager,
  createAlert,
} from "./alert";
export type {
  AlertVariant,
  AlertSize,
  AlertAction,
  AlertOptions,
  AlertInstance,
} from "./alert";

// --- Switch ---
export {
  createSwitch,
} from "./switch";
export type {
  SwitchSize,
  SwitchVariant,
  SwitchOptions,
  SwitchInstance,
} from "./switch";

// --- Dropdown Menu ---
export {
  createDropdown,
} from "./dropdown";
export type {
  DropdownPlacement,
  DropdownItem,
  DropdownSeparator,
  DropdownGroup,
  DropdownEntry,
  DropdownOptions,
  DropdownInstance,
} from "./dropdown";

// --- Checkbox & Radio ---
export {
  createCheckbox,
  createRadio,
  createCheckboxGroup,
} from "./checkbox";
export type {
  CheckboxSize,
  CheckboxVariant,
  CheckboxOptions,
  CheckboxInstance,
  RadioOptions,
  RadioInstance,
  CheckboxGroupOptions,
  CheckboxGroupInstance,
} from "./checkbox";

// --- Radio Group ---
export {
  createRadioGroup,
} from "./radio-group";
export type {
  RadioSize,
  RadioVariant,
  RadioOption,
  RadioGroupOptions,
  RadioGroupInstance,
} from "./radio-group";

// --- Input ---
export {
  createInput,
} from "./input";
export type {
  InputSize,
  InputVariant,
  InputState,
  InputOptions,
  InputInstance,
} from "./input";

// --- Textarea ---
export {
  createTextarea,
} from "./textarea";
export type {
  TextareaSize,
  TextareaState,
  TextareaOptions,
  TextareaInstance,
} from "./textarea";

// --- Select ---
export {
  SelectManager,
  createSelect,
} from "./select";
export type {
  SelectOption,
  SelectOptions,
  SelectInstance,
} from "./select";

// --- Form ---
export {
  createForm,
} from "./form";
export type {
  FieldType,
  ValidationRule,
  FormField,
  FormGroup,
  FormOptions,
  FormInstance,
} from "./form";

// --- Button ---
export {
  createButton,
  createButtonGroup,
} from "./button";
export type {
  ButtonVariant,
  ButtonSize,
  ButtonOptions,
  ButtonGroupOptions,
  ButtonGroupInstance,
} from "./button";

// --- Card ---
export {
  createCard,
} from "./card";
export type {
  CardVariant,
  CardSize,
  CardHeaderOptions,
  CardImageOptions,
  CardOptions,
  CardInstance,
} from "./card";

// --- Popover ---
export {
  PopoverManager,
  createPopover,
} from "./popover";
export type {
  PopoverTrigger,
  PopoverPlacement,
  PopoverOptions,
  PopoverInstance,
} from "./popover";

// --- Splitter (Resizable Panes) ---
export {
  createSplitter,
} from "./drawer";
export type {
  SplitterOrientation,
  SplitterPaneOptions,
  SplitterOptions,
  SplitterInstance,
} from "./drawer";

// --- Context Menu ---
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";

// --- Notification ---
export {
  NotificationManager,
  getNotificationManager,
  toast,
} from "./notification";
export type {
  NotificationType,
  Notification,
  NotificationOptions,
  NotificationPosition,
} from "./notification";

// --- Breadcrumb ---
export {
  BreadcrumbManager,
  createBreadcrumb,
} from "./breadcrumb";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb";

// --- Pagination ---
export {
  PaginationManager,
  createPagination,
} from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";

// --- Empty State ---
export {
  EmptyStateManager,
  createEmptyState,
} from "./empty-state";
export type {
  EmptyStateVariant,
  EmptyStateOptions,
  EmptyStateInstance,
} from "./empty-state";

// --- Rating ---
export {
  RatingManager,
  createRating,
} from "./rating";
export type {
  StarIconType,
  RatingOptions,
  RatingInstance,
} from "./rating";

// --- Avatar ---
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
} from "./avatar";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";

// --- Stepper ---
export {
  StepperManager,
  createStepper,
} from "./stepper";
export type {
  StepStatus,
  StepConfig,
  StepperOptions,
  StepperInstance,
} from "./stepper";

// --- Chip ---
export {
  createChip,
  createChipGroup,
} from "./chip";
export type {
  ChipSize,
  ChipVariant,
  ChipOptions,
  ChipInstance,
  ChipGroupOptions,
  ChipGroupInstance,
} from "./chip";

// --- Divider ---
export {
  createDivider,
  hDivider,
  vDivider,
  labeledDivider,
  sectionDivider,
} from "./divider";
export type {
  DividerOrientation,
  DividerStyle,
  DividerOptions,
} from "./divider";

// --- Spinner ---
export {
  createSpinner,
  miniSpinner,
  fullPageSpinner,
} from "./spinner";
export type {
  SpinnerVariant,
  SpinnerSize,
  SpinnerOptions,
} from "./spinner";

// --- Skeleton Loader ---
export {
  createSkeleton,
} from "./skeleton-loader";
export type {
  SkeletonShape,
  SkeletonAnimation,
  SkeletonItem,
  SkeletonOptions,
  SkeletonInstance,
} from "./skeleton-loader";

// --- Back to Top ---
export {
  createBackToTop,
} from "./back-to-top";
export type {
  BttPosition,
  BttSize,
  BttShape,
  BackToTopOptions,
  BackToTopInstance,
} from "./back-to-top";

// --- Countdown ---
export {
  CountdownManager,
  createCountdown,
} from "./countdown";
export type {
  CountdownSize,
  CountdownVariant,
  CountdownOptions,
  CountdownInstance,
} from "./countdown";

// --- QR Code ---
export {
  generateQrSvg,
  generateQrDataUri,
  generateQrCanvas,
  validateQrInput,
} from "./qr-code";
export type {
  QrOptions,
} from "./qr-code";

// --- Signature Pad ---
export {
  SignaturePadManager,
  createSignaturePad,
} from "./signature-pad";
export type {
  StrokePoint,
  Stroke,
  SignaturePadOptions,
  SignaturePadInstance,
} from "./signature-pad";

// --- Confetti ---
export {
  createConfetti,
  confetti,
  confettiFromElement,
} from "./confetti";
export type {
  ParticleShape,
  Particle,
  ConfettiColors,
  ConfettiPhysics,
  ConfettiOptions,
  ConfettiInstance,
} from "./confetti";

// --- Marquee ---
export {
  MarqueeManager,
  createMarquee,
} from "./marquee";
export type {
  MarqueeDirection,
  MarqueeStyle,
  MarqueeItem,
  MarqueeOptions,
  MarqueeInstance,
} from "./marquee";

// --- Typing Indicator ---
export {
  createTypingIndicator,
} from "./typing-indicator";
export type {
  TypingAnimation,
  TypingSize,
  TypingIndicatorOptions,
  TypingIndicatorInstance,
} from "./typing-indicator";

// --- Scroll Progress ---
export {
  createScrollProgress,
} from "./scroll-progress";
export type {
  ProgressBarPosition,
  ProgressBarVariant,
  ScrollProgressOptions,
  ScrollProgressInstance,
} from "./scroll-progress";

// --- Reading Progress ---
export {
  createReadingProgress,
} from "./reading-progress";
export type {
  ProgressColor,
  ProgressSize,
  ProgressPosition,
  ReadingProgressOptions,
  ReadingProgressInstance,
} from "./reading-progress";

// --- Pull to Refresh ---
export {
  createPullToRefresh,
} from "./pull-to-refresh";
export type {
  PullToRefreshOptions,
  PullToRefreshInstance,
} from "./pull-to-refresh";

// --- Sticky Notes ---
export {
  createStickyNotes,
} from "./sticky-notes";
export type {
  NoteColor,
  StickyNoteData,
  StickyNotesOptions,
  StickyNotesInstance,
} from "./sticky-notes";

// --- Draggable Window ---
export {
  createDraggableWindow,
} from "./draggable-window";
export type {
  WindowState,
  WindowControl,
  DraggableWindowOptions,
  DraggableWindowInstance,
} from "./draggable-window";

// --- Masonry ---
export {
  MasonryManager,
  createMasonry,
} from "./masonry";
export type {
  MasonryItem,
  MasonryOptions,
  MasonryInstance,
} from "./masonry";

// --- Heatmap ---
export {
  createHeatmap,
} from "./heatmap";
export type {
  HeatmapType,
  ColorScale,
  HeatmapCell,
  HeatmapOptions,
  HeatmapInstance,
} from "./heatmap";

// --- Sparkline Chart ---
export {
  createSparklineChart,
} from "./sparkline-chart";
export type {
  SparklineType,
  TrendIndicator,
  SparklinePoint,
  SparklineOptions,
  SparklineInstance,
} from "./sparkline-chart";

// --- Stat Card ---
export {
  createStatCard,
} from "./stat-card";
export type {
  TrendDirection,
  StatCardVariant,
  StatCardOptions,
} from "./stat-card";

// --- Feature Tour ---
export {
  FeatureTourManager,
  createFeatureTour,
} from "./feature-tour";
export type {
  TourStep as FeatureTourStep,
  TourOptions as FeatureTourOptions,
  TourInstance as FeatureTourInstance,
} from "./feature-tour";

// --- Onboarding Tour ---
export {
  TourManager,
  createTour,
} from "./onboarding-tour";
export type {
  TourStep,
  TourOptions,
  TourInstance,
} from "./onboarding-tour";

// --- Hotkey Manager ---
export {
  HotkeyManager,
  normalizeKeyEvent,
  parseCombo,
  buildCombo,
  combosEqual,
} from "./hotkey-manager";
export type {
  KeyModifier,
  Scope,
  HotkeyPriority,
  HotkeyBinding,
  HotkeyEvent,
  RecordedHotkey,
  HotkeyHint,
  HotkeyStats,
} from "./hotkey-manager";

// --- Comment Section ---
export {
  createCommentSection,
} from "./comment-section";
export type {
  CommentAuthor,
  Comment,
  CommentSectionOptions,
  CommentSectionInstance,
} from "./comment-section";

// --- Testimonial ---
export {
  createTestimonial,
} from "./testimonial";
export type {
  TestimonialLayout,
  TestimonialSize,
  TestimonialItem,
  TestimonialOptions,
  TestimonialInstance,
} from "./testimonial";

// --- Pricing Table ---
export {
  createPricingTable,
} from "./pricing-table";
export type {
  PricingFeature,
  PricingPlan,
  PricingTableOptions,
  PricingTableInstance,
} from "./pricing-table";

// --- Org Chart ---
export {
  createOrgChart,
} from "./org-chart";
export type {
  OrgNode,
  OrgChartOptions,
  OrgChartInstance,
} from "./org-chart";

// --- Mind Map ---
export {
  createMindMap,
} from "./mind-map";
export type {
  MindMapNode,
  MindMapOptions,
  MindMapInstance,
} from "./mind-map";

// --- Flow Graph ---
export {
  createGraph,
  addNode,
  removeNode,
  addEdge,
  removeEdge,
  neighbors,
  inDegree,
  outDegree,
  areAdjacent,
  getEdge,
  topologicalSort,
  topologicalSortDFS,
  hasCycle,
  findCycles,
  findShortestPath,
  dijkstra,
  findAllPaths,
  stronglyConnectedComponents,
  isConnected,
  resolveDependencies,
  getDependencyTree,
  exportGraph,
  importGraph,
  WorkflowEngine,
} from "./flow-graph";
export type {
  GraphNode,
  GraphEdge,
  FlowGraph,
  WorkflowNodeStatus,
  WorkflowNode,
  WorkflowExecution,
  DependencyTreeNode,
} from "./flow-graph";
export {
  createKanbanBoard,
} from "./kanban-board";
export type {
  KanbanCard,
  KanbanColumn,
  KanbanBoardOptions,
  KanbanBoardInstance,
} from "./kanban-board";
export {
  createGanttChart,
} from "./gantt-chart";
export type {
  GanttTask,
  GanttDependency,
  GanttChartOptions,
  GanttChartInstance,
} from "./gantt-chart";
export {
  createTimeline,
  TimelineManager,
} from "./timeline";
export type {
  TimelineItem,
  TimelineOptions,
  TimelineInstance,
  TimelineItemStatus,
} from "./timeline";
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type {
  RgbColor,
  HslColor,
  Palette,
} from "./color-picker";
export {
  createFileManager,
} from "./file-manager";
export type {
  FileManagerFile,
  FileManagerOptions,
  FileManagerInstance,
} from "./file-manager";
export {
  createTerminal,
} from "./terminal";
export type {
  TerminalLine,
  TerminalTheme,
  TerminalCommand,
  TerminalOptions,
  TerminalInstance,
} from "./terminal";
export {
  createCodeEditor,
  CodeEditorManager,
} from "./code-editor";
export type {
  CodeEditorOptions,
  CodeEditorInstance,
} from "./code-editor";
export {
  createMarkdownPreview,
} from "./markdown-preview";
export type {
  MarkdownHeading,
  MarkdownOptions,
  MarkdownInstance,
} from "./markdown-preview";
export {
  computeDiff,
  toUnifiedDiff,
  applyPatch,
  renderInlineDiffHtml,
  renderSideBySideDiffHtml,
  wordDiff,
  renderWordDiffHtml,
  getDiffStyles,
  textSimilarity,
  formatDiffStats,
} from "./diff-viewer";
export type {
  DiffChunk,
  DiffResult,
  FileDiff,
} from "./diff-viewer";
export {
  FormBuilder,
  createForm,
  validations,
} from "./form-builder";
export type {
  FieldType,
  FieldValidation,
  SelectOption,
  FormField,
  FormSection,
  FormSchema,
  FieldError,
  FormState,
} from "./form-builder";
export {
  DataTableManager,
  createDataTable,
} from "./data-table";
export type {
  Column,
  SortDirection,
  SortState,
  FilterState,
  DataTableOptions,
  DataTableInstance,
} from "./data-table";
export {
  createRichTextEditor,
} from "./rich-text-editor";
export type {
  EditorCommand,
  ToolbarButton,
  RichTextEditorOptions,
  RichTextEditorInstance,
} from "./rich-text-editor";
export {
  NotificationCenterManager,
  createNotificationCenter,
} from "./notification-center";
export type {
  NotificationType,
  NotificationItem,
  NotificationCenterOptions,
  NotificationCenterInstance,
} from "./notification-center";
export {
  CommandPalette,
} from "./command-palette";
export type {
  Command,
  CommandCategory,
  CommandPaletteConfig,
  CommandPaletteState,
} from "./command-palette";
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";
export {
  createSplitView,
  createHorizontalSplit,
  createVerticalSplit,
} from "./split-view";
export type {
  SplitDirection,
  PaneConfig,
  SplitViewOptions,
  SplitViewState,
  SplitViewInstance,
} from "./split-view";
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabOrientation,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs";
export {
  AccordionManager,
  createAccordion,
} from "./accordion";
export type {
  AccordionItem,
  AccordionMode,
  AccordionOptions,
  AccordionInstance,
} from "./accordion";
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
} from "./avatar";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  BadgeOptions,
  StatusDotOptions,
} from "./badge";
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";
export {
  createProgressTracker,
  createMultiProgressTracker,
  formatProgress,
  createStepProgress,
} from "./progress";
export type {
  ProgressState,
  ProgressCallback,
  ProgressController,
  MultiProgressController,
  StepProgressController,
} from "./progress";
export {
  EmptyStateManager,
  createEmptyState,
} from "./empty-state";
export type {
  EmptyStateVariant,
  EmptyStateOptions,
  EmptyStateInstance,
} from "./empty-state";
export {
  createBreadcrumbs,
} from "./breadcrumbs";
export type {
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumbs";
export {
  createChipGroup,
} from "./chips";
export type {
  ChipOptions,
  ChipGroupOptions,
  ChipVariant,
  ChipSize,
  ChipGroupInstance,
} from "./chips";
export {
  createRating,
  RatingManager,
} from "./rating";
export type {
  RatingOptions,
  RatingInstance,
  StarIconType,
} from "./rating";
export {
  createSkeletonScreen,
} from "./skeleton-screen";
export type {
  SkeletonScreenOptions,
  SkeletonLayout,
  SkeletonScreenInstance,
} from "./skeleton-screen";
export {
  createCarousel,
  CarouselManager,
} from "./carousel";
export type {
  CarouselSlide,
  CarouselOptions,
  CarouselInstance,
} from "./carousel";
export {
  createModal,
} from "./modal";
export type {
  ModalSize,
  ModalPosition,
  ModalOptions,
  ModalInstance,
} from "./modal";
export {
  createSplitter,
} from "./drawer";
export type {
  SplitterOrientation,
  SplitterPaneOptions,
  SplitterOptions,
  SplitterInstance,
} from "./drawer";
export {
  createPopconfirm,
} from "./popconfirm";
export type {
  PopconfirmPlacement,
  PopconfirmOptions,
  PopconfirmInstance,
} from "./popconfirm";
export {
  createAlert,
  AlertManager,
} from "./alert";
export type {
  AlertVariant,
  AlertSize,
  AlertAction,
  AlertOptions,
  AlertInstance,
} from "./alert";
export {
  createSwitch,
} from "./switch";
export type {
  SwitchSize,
  SwitchVariant,
  SwitchOptions,
  SwitchInstance,
} from "./switch";
export {
  createSelect,
  SelectManager,
} from "./select";
export type {
  SelectOption,
  SelectOptions,
  SelectInstance,
} from "./select";
export {
  createCheckbox,
  createCheckboxGroup,
} from "./checkbox";
export type {
  CheckboxSize,
  CheckboxVariant,
  CheckboxOptions,
  CheckboxInstance,
  CheckboxGroupOptions,
  CheckboxGroupInstance,
  RadioOptions,
  RadioInstance,
} from "./checkbox";
export {
  createRadioGroup,
  RadioGroupManager,
} from "./radio";
export type {
  RadioSize,
  RadioVariant,
  RadioOption,
  RadioGroupOptions,
  RadioGroupInstance,
} from "./radio";
export {
  createInput,
} from "./input";
export type {
  InputSize,
  InputVariant,
  InputState,
  InputOptions,
  InputInstance,
} from "./input";
export {
  createTextarea,
} from "./textarea";
export type {
  TextareaSize,
  TextareaState,
  TextareaOptions,
  TextareaInstance,
} from "./textarea";
export {
  createSlider,
  SliderManager,
} from "./slider";
export type {
  SliderMark,
  SliderOptions,
  SliderInstance,
} from "./slider";
export {
  createDatePicker,
  DatePickerManager,
} from "./date-picker";
export type {
  DatePickerOptions,
  DatePickerInstance,
} from "./date-picker";
export {
  createUpload,
} from "./upload";
export type {
  UploadStatus,
  UploadFile,
  UploadOptions,
  UploadInstance,
} from "./upload";
export {
  TreeView,
} from "./tree-view";
export type {
  TreeNodeData,
  TreeNode,
  CheckMode,
  TreeViewConfig,
} from "./tree-view";
export {
  createPagination,
  PaginationManager,
} from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";
export {
  createSteps,
  StepsManager,
} from "./steps";
export type {
  StepStatus,
  StepItem,
  StepsOrientation,
  StepsVariant,
  StepsOptions,
  StepsInstance,
} from "./steps";
export {
  createAnchor,
} from "./anchor";
export type {
  AnchorLink,
  AnchorOptions,
  AnchorInstance,
} from "./anchor";
export {
  createAffix,
} from "./affix";
export type {
  AffixOptions,
  AffixInstance,
} from "./affix";
export {
  createBackTop,
} from "./back-top";
export type {
  BackTopShape,
  BackTopPosition,
  BackTopOptions,
  BackTopInstance,
} from "./back-top";
export {
  createConfigProvider,
  getConfig,
  getToken,
} from "./config-provider";
export type {
  Direction,
  ThemeMode,
  DesignTokens,
  ComponentOverrides,
  ConfigProviderOptions,
  ConfigSnapshot,
  ConfigProviderInstance,
} from "./config-provider";
export {
  createWatermark,
} from "./watermark";
export type {
  WatermarkOptions,
  WatermarkInstance,
} from "./watermark";
export {
  generateQrSvg,
  generateQrDataUri,
  generateQrCanvas,
  validateQrInput,
} from "./qr-code";
export type {
  QrOptions,
} from "./qr-code";
export {
  createCountdown,
  CountdownManager,
} from "./countdown";
export type {
  CountdownSize,
  CountdownVariant,
  CountdownOptions,
  CountdownInstance,
} from "./countdown";
export {
  createTour,
} from "./tour";
export type {
  TourStep,
  TourOptions,
  TourInstance,
} from "./tour";
export {
  createVirtualList,
} from "./virtual-list";
export type {
  VirtualListItem,
  VirtualListOptions,
  VirtualListInstance,
} from "./virtual-list";
export {
  createCommentSystem,
} from "./comment";
export type {
  CommentAuthor,
  CommentData,
  CommentOptions,
  CommentInstance,
} from "./comment";
export {
  createStat,
  StatManager,
} from "./statistic";
export type {
  TrendDirection,
  StatVariant,
  TrendColor,
  StatOptions,
  StatInstance,
} from "./statistic";
export {
  createResult,
} from "./result";
export type {
  ResultStatus,
  ResultVariant,
  ResultOptions,
  ResultInstance,
} from "./result";
export {
  createTag,
  TagManager,
  createTagGroup,
} from "./tag";
export type {
  TagVariant,
  TagSize,
  TagShape,
  TagOptions,
  TagInstance,
  TagGroupOptions,
  TagGroupInstance,
} from "./tag";
export {
  NotificationManager,
  getNotificationManager,
  toast,
} from "./notification";
export type {
  NotificationType,
  Notification,
  NotificationOptions,
  NotificationPosition,
  ProgressCallback,
  ProgressState,
  ProgressController,
  MultiProgressController,
  StepProgressController,
} from "./notification";
export {
  createProgressTracker,
  createMultiProgressTracker,
  formatProgress,
  createStepProgress,
} from "./progress";
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
} from "./avatar";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  BadgeOptions,
  StatusDotOptions,
} from "./badge";
export {
  createDivider,
  hDivider,
  vDivider,
  labeledDivider,
  sectionDivider,
} from "./divider";
export type {
  DividerOrientation,
  DividerStyle,
  DividerOptions,
} from "./divider";
export {
  createEmpty,
} from "./empty";
export type {
  EmptySize,
  EmptyVariant,
  EmptyOptions,
  EmptyInstance,
} from "./empty";
export {
  CollapseManager,
  createCollapse,
  createCollapseGroup,
} from "./collapse";
export type {
  CollapseSize,
  CollapseVariant,
  CollapseOptions,
  CollapseInstance,
  CollapseGroupOptions,
  CollapseGroupInstance,
} from "./collapse";
export {
  TimelineManager,
  createTimeline,
} from "./timeline";
export type {
  TimelineItemStatus,
  TimelineItem,
  TimelineOptions,
  TimelineInstance,
} from "./timeline";
export {
  BreadcrumbManager,
  createBreadcrumb,
} from "./breadcrumb";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb";
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabOrientation,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs";
export {
  createDescriptionList,
} from "./description-list";
export type {
  DlLayout,
  DlSize,
  DlItem,
  DescriptionListOptions,
  DescriptionListInstance,
} from "./description-list";
export {
  createList,
} from "./list";
export type {
  ListSelectionMode,
  ListVariant,
  ListItem,
  ListOptions,
  ListInstance,
} from "./list";
export {
  createTableState,
  getSortedData,
  getFilteredData,
  getPaginatedData,
  getCellValue,
  applyFilterOperator,
  toggleSort,
  setSearchTerm,
  toggleFilter,
  goToPage,
  setPageSize,
  toggleRowSelection,
  toggleSelectAll,
  toggleRowExpand,
  resetTable,
  exportTableAsCsv,
} from "./table";
export type {
  Column,
  TableState,
  SortState,
  FilterState,
  FilterOperator,
  PaginationState,
  SelectionState,
} from "./table";
export {
  createCard,
} from "./card";
export type {
  CardVariant,
  CardSize,
  CardHeaderOptions,
  CardImageOptions,
  CardOptions,
  CardInstance,
} from "./card";
export {
  createForm,
} from "./form";
export type {
  FieldType,
  ValidationRule,
  FormField,
  FormGroup,
  FormOptions,
  FormInstance,
} from "./form";
export {
  createGrid,
} from "./grid";
export type {
  GridGap,
  GridJustify,
  GridAlign,
  GridItem,
  GridOptions,
  GridInstance,
} from "./grid";
export {
  SidebarManager,
  createSidebar,
} from "./sidebar";
export type {
  SidebarItem,
  SidebarGroup,
  SidebarOptions,
  SidebarInstance,
} from "./sidebar";
export {
  createHeader,
} from "./header";
export type {
  HeaderSize,
  HeaderVariant,
  HeaderAction,
  HeaderTab,
  HeaderOptions,
  HeaderInstance,
} from "./header";
export {
  createFooter,
} from "./footer";
export type {
  FooterLink,
  FooterColumn,
  SocialLink,
  FooterOptions,
  FooterInstance,
} from "./footer";
export {
  createLayout,
} from "./layout";
export type {
  LayoutMode,
  SidebarPosition as LayoutSidebarPosition,
  LayoutRegion,
  LayoutOptions,
  LayoutInstance,
} from "./layout";
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";
export {
  createDropdown,
} from "./dropdown";
export type {
  DropdownPlacement,
  DropdownItem,
  DropdownSeparator,
  DropdownGroup,
  DropdownEntry,
  DropdownOptions,
  DropdownInstance,
} from "./dropdown";
export {
  createMenu,
} from "./menu";
export type {
  MenuMode,
  MenuVariant,
  MenuItem,
  MenuOptions,
  MenuInstance,
} from "./menu";
export {
  SpinManager,
  createSpin,
} from "./spin";
export type {
  SpinType,
  SpinSize,
  SpinOptions,
  SpinInstance,
} from "./spin";
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";
export {
  createTypography,
  createHeading,
  createParagraph,
  createBlockquote,
  code,
  createCodeBlock,
  highlightText,
} from "./typography";
export type {
  HeadingLevel,
  TextSize,
  TextWeight,
  TextColor,
  TypographyOptions,
  HeadingOptions,
  ParagraphOptions,
} from "./typography";
export {
  getImageDimensions,
  generateSrcSet,
  generateSizes,
  getAspectRatio,
  fitToContainer,
  generateBlurPlaceholder,
  isValidImageUrl,
  getDominantColor,
  fileToDataUrl,
  resizeImage,
} from "./image";
export {
  createAnchorGroup,
  createBackToTop,
} from "./anchor-link";
export type {
  AnchorLink,
  AnchorGroupOptions,
  AnchorGroupInstance,
  BackToTopOptions,
  BackToTopInstance,
} from "./anchor-link";
export {
  OverlayProvider,
  openModal,
  openDrawer,
  openConfirm,
  openAlert,
  closeAllOverlays,
} from "./overlay";
export type {
  OverlayType,
  OverlayOptions,
  OverlayInstance,
} from "./overlay";
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type {
  RgbColor,
  HslColor,
  Palette,
} from "./color-picker";
export {
  TransferManager,
  createTransfer,
} from "./transfer";
export type {
  TransferItem,
  TransferOptions,
  TransferInstance,
} from "./transfer";
export {
  CalendarManager,
  createCalendar,
} from "./calendar";
export type {
  CalendarView,
  WeekStartDay,
  CalendarEvent,
  CalendarOptions,
  CalendarInstance,
} from "./calendar";
export {
  DatePickerManager,
  createDatePicker,
} from "./date-picker";
export type {
  DatePickerOptions,
  DatePickerInstance,
} from "./date-picker";
export {
  createTimePicker,
} from "./time-picker";
export type {
  TimeFormat,
  TimePickerMode,
  TimePickerOptions,
  TimePickerInstance,
} from "./time-picker";
export {
  RatingManager,
  createRating,
} from "./rating";
export type {
  StarIconType,
  RatingOptions,
  RatingInstance,
} from "./rating";
export {
  SliderManager,
  createSlider,
} from "./slider";
export type {
  SliderMark,
  SliderOptions,
  SliderInstance,
} from "./slider";
export {
  createSwitch,
} from "./switch";
export type {
  SwitchSize,
  SwitchVariant,
  SwitchOptions,
  SwitchInstance,
} from "./switch";
export {
  createCheckbox,
  createRadio,
  createCheckboxGroup,
} from "./checkbox";
export type {
  CheckboxSize,
  CheckboxVariant,
  CheckboxOptions,
  CheckboxInstance,
  RadioOptions,
  RadioInstance,
  CheckboxGroupOptions,
  CheckboxGroupInstance,
} from "./checkbox";
export {
  createInput,
} from "./input";
export type {
  InputSize,
  InputVariant,
  InputState,
  InputOptions,
  InputInstance,
} from "./input";
export {
  createTextarea,
} from "./textarea";
export type {
  TextareaSize,
  TextareaState,
  TextareaOptions,
  TextareaInstance,
} from "./textarea";
export {
  SelectManager,
  createSelect,
} from "./select";
export type {
  SelectOption,
  SelectOptions,
  SelectInstance,
} from "./select";
export {
  createButton,
  createButtonGroup,
} from "./button";
export type {
  ButtonVariant,
  ButtonSize,
  ButtonOptions,
  ButtonGroupOptions,
  ButtonGroupInstance,
} from "./button";
export {
  createRadioGroup,
} from "./radio-group";
export type {
  RadioSize,
  RadioVariant,
  RadioOption,
  RadioGroupOptions,
  RadioGroupInstance,
} from "./radio-group";
export {
  PopoverManager,
  createPopover,
} from "./popover";
export type {
  PopoverTrigger,
  PopoverPlacement,
  PopoverOptions,
  PopoverInstance,
} from "./popover";
export {
  createModal,
} from "./modal";
export type {
  ModalSize,
  ModalPosition,
  ModalOptions,
  ModalInstance,
} from "./modal";
export {
  createSplitter,
} from "./drawer";
export type {
  SplitterOrientation,
  SplitterPaneOptions,
  SplitterOptions,
  SplitterInstance,
} from "./drawer";
export {
  createDialog,
  alertDialog,
  confirmDialog,
  dangerDialog,
} from "./dialog";
export type {
  DialogVariant,
  DialogOptions,
  DialogInstance,
} from "./dialog";
export {
  AccordionManager,
  createAccordion,
} from "./accordion";
export type {
  AccordionItem,
  AccordionMode,
  AccordionOptions,
  AccordionInstance,
} from "./accordion";
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabOrientation,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs";
export {
  CollapseManager,
  createCollapse,
  createCollapseGroup,
} from "./collapse";
export type {
  CollapseSize,
  CollapseVariant,
  CollapseOptions,
  CollapseInstance,
  CollapseGroupOptions,
  CollapseGroupInstance,
} from "./collapse";
export {
  CarouselManager,
  createCarousel,
} from "./carousel";
export type {
  CarouselSlide,
  CarouselOptions,
  CarouselInstance,
} from "./carousel";
export {
  StepperManager,
  createStepper,
} from "./stepper";
export type {
  StepStatus,
  StepConfig,
  StepperOptions,
  StepperInstance,
} from "./stepper";
export {
  PaginationManager,
  createPagination,
} from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";
export {
  createTreeNode,
  buildTree,
  flattenTree,
  flattenTreeWithDepth,
  findNodeById,
  findNodes,
  getPathToNode,
  getTreeDepth,
  countNodes,
  mapTree,
  filterTree,
} from "./tree";
export type {
  TreeNode,
} from "./tree";
export {
  KanbanManager,
  createKanban,
} from "./kanban";
export type {
  CardPriority,
  KanbanLabel,
  KanbanCard,
  KanbanColumn,
  KanbanSwimlane,
  KanbanOptions,
  KanbanInstance,
} from "./kanban";
export {
  GanttManager,
  createGantt,
} from "./gantt";
export type {
  GanttTask,
  GanttMilestone,
  GanttZoom,
  GanttViewMode,
  GanttOptions,
  GanttInstance,
} from "./gantt";
export {
  NotificationManager,
  getNotificationManager,
  toast,
} from "./notification";
export type {
  NotificationType,
  NotificationOptions,
  NotificationPosition,
} from "./notification";
export {
  ToastManager,
  getToastManager,
  showToast,
} from "./toast";
export type {
  ToastType,
  ToastPosition,
  ToastOptions,
  ToastInstance,
  ToastManagerConfig,
} from "./toast";
export {
  AlertManager,
  createAlert,
} from "./alert";
export type {
  AlertVariant,
  AlertSize,
  AlertAction,
  AlertOptions,
  AlertInstance,
} from "./alert";
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";
export {
  DropdownMenuManager,
  createDropdownMenu,
} from "./dropdown-menu";
export type {
  MenuItemType,
  MenuItem,
  DropdownMenuOptions,
  DropdownMenuInstance,
} from "./dropdown-menu";
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
} from "./avatar";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  BadgeOptions,
  StatusDotOptions,
} from "./badge";
export {
  createProgressTracker,
  createMultiProgressTracker,
  formatProgress,
  createStepProgress,
} from "./progress";
export type {
  ProgressState,
  ProgressCallback,
  ProgressController,
  MultiProgressController,
  StepProgressController,
} from "./progress";
export {
  createSpinner,
  miniSpinner,
  fullPageSpinner,
} from "./spinner";
export type {
  SpinnerVariant,
  SpinnerSize,
  SpinnerOptions,
} from "./spinner";
export {
  EmptyStateManager,
  createEmptyState,
} from "./empty-state";
export type {
  EmptyStateVariant,
  EmptyStateOptions,
  EmptyStateInstance,
} from "./empty-state";
export {
  CommandPalette,
} from "./command-palette";
export type {
  Command,
  CommandCategory,
  CommandPaletteConfig,
  CommandPaletteState,
} from "./command-palette";
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";
export {
  createTour,
} from "./tour";
export type {
  TourStep,
  TourOptions,
  TourInstance,
} from "./tour";
export {
  createTableState,
  getSortedData,
  getFilteredData,
  getPaginatedData,
  getCellValue,
  applyFilterOperator,
  toggleSort,
  setSearchTerm,
  toggleFilter,
  goToPage,
  setPageSize,
  toggleRowSelection,
  toggleSelectAll,
  toggleRowExpand,
  resetTable,
  exportTableAsCsv,
} from "./table";
export type {
  Column,
  TableState,
  SortState,
  FilterState,
  FilterOperator,
  PaginationState,
  SelectionState,
} from "./table";
export {
  createForm,
} from "./form";
export type {
  FieldType,
  ValidationRule,
  FormField,
  FormGroup,
  FormOptions,
  FormInstance,
} from "./form";
export {
  copyToClipboard,
  copyRichToClipboard,
  readFromClipboard,
  readRichFromClipboard,
  isClipboardAvailable,
  canReadClipboard,
  watchClipboard,
} from "./clipboard";
export type {
  ClipboardData,
  ClipboardOptions,
} from "./clipboard";
export {
  scrollToId,
  scrollToTop,
  getScrollPosition,
  isInViewport,
} from "./scroll";
export {
  HotkeyManager,
  createAppHotkeys,
  parseKeyCombo,
  eventMatchesCombo,
  formatKeyDisplay,
  areModifiersDown,
  getModifierString,
} from "./hotkeys";
export type {
  HotkeyBinding,
  HotkeyEvent,
  HotkeyListener,
  ParsedKeyCombo,
} from "./hotkeys";
export {
  createSortable,
  createDropZone,
  makeDraggable,
  configureDnD,
  getDnDConfig,
} from "./dnd";
export type {
  DnDMode,
  DragData,
  DropZoneOptions,
  SortableOptions,
  SortableInstance,
  DnDManagerConfig,
  DraggableOptions,
} from "./dnd";
export {
  makeResizable,
  createSplitPane,
} from "./resizable";
export type {
  ResizeOptions,
  ResizeState,
  ResizableController,
  SplitPaneOptions,
  SplitPaneController,
} from "./resizable";
export {
  createVirtualScroll,
  createVirtualGrid,
} from "./virtual-scroll";
export type {
  VirtualScrollItem,
  VirtualScrollOptions,
  VirtualScrollState,
  VirtualScrollController,
  VirtualGridOptions,
  VirtualGridState,
  VirtualGridController,
} from "./virtual-scroll";
export {
  parseColor,
  toRgb,
  toHsl,
  toHsv,
  toHex,
  toCss,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToRgb,
  hslToHex,
  hexToHsl,
  lighten,
  darken,
  saturate,
  desaturate,
  rotateHue,
  setOpacity,
  mix,
  lerpColor,
  invert,
  grayscale,
  complement,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  luminance,
  contrastRatio,
  passesWCAGAA,
  passesWCAGAAA,
  getContrastColor,
  bestContrast,
  stringToColor,
  generatePalette,
  generateGradientPalette,
  shadeScale,
  tailwindPalette,
  getStatusColor,
} from "./color";
export type {
  RgbColor,
  HslColor,
  HsvColor,
  HwbColor,
  ColorInput,
  StatusColor,
} from "./color";
export {
  ThemeManager,
  getThemeManager,
  useTheme,
  LIGHT_THEME,
  DARK_THEME,
  BUILT_IN_THEMES,
} from "./theme";
export type {
  ThemeColors,
  ThemeConfig,
} from "./theme";
export {
  EASING,
  animateValue,
  springAnimate,
  cssKeyframes,
  KEYFRAMES,
  DURATION,
  transition,
} from "./animation";
export type {
  EasingName,
  SpringConfig,
} from "./animation";
export {
  t,
  getLocale,
  setLocale,
  LOCALE_CHANGE_EVENT,
} from "./i18n";
export type {
  Locale,
} from "./i18n";
export {
  storageGet,
  storageSet,
  storageRemove,
  storageKeys,
  storageClear,
} from "./storage";
export {
  debounce,
  throttle,
  delay,
  withTimeout,
  retry,
  raf,
  nextFrame,
  whenIdle,
  createInterval,
  Stopwatch,
  createBatchScheduler,
} from "./timing";
export type {
  DebounceOptions,
  ThrottleOptions,
  DelayOptions,
  IntervalHandle,
} from "./timing";
export {
  qs,
  qsa,
  createElement,
  on,
  domReady,
  isVisible,
  getStyle,
  scrollIntoView,
} from "./dom";
export {
  EventBus,
  createEventBus,
} from "./event-bus";
export type {
  EventCallback,
  EventMiddleware,
  Subscription,
  EmittedEvent,
  EventBusOptions,
} from "./event-bus";
export {
  Logger,
  log,
  apiLog,
  dbLog,
  extLog,
  setGlobalLogLevel,
  getGlobalLogLevel,
} from "./logger";
export type {
  LogLevel,
} from "./logger";
export {
  validate,
  validateSync,
  assert,
  throwIfInvalid,
  isString,
  isNumber,
  isInteger,
  isFiniteNumber,
  isBoolean,
  isArray,
  isObject,
  isDate,
  isEmail,
  isUrl,
  isNil,
  isPresent,
} from "./validator";
export type {
  ValidationError,
  ValidationResult,
  ValidationRule,
  ValidationSchema,
} from "./validator";
export {
  httpRequest,
  http,
  retryHttp,
  setBaseUrl,
  getBaseUrl,
} from "./http";
export type {
  HttpRequestConfig,
  HttpResponse,
  HttpError,
} from "./http";
export {
  mdToHtml,
  stripMd,
} from "./markdown";
export {
  highlightCode,
} from "./code-highlight";
export type {
  SupportedLang,
  HighlightOptions,
  HighlightResult,
} from "./code-highlight";
export {
  createMask,
  createSpotlight,
} from "./mask";
export type {
  MaskMode,
  MaskOptions,
  CutoutOptions,
  MaskInstance,
} from "./mask";
export {
  announce,
  setFocus,
  focusFirst,
  focusLast,
  createA11yFocusTrap,
  prefersReducedMotion,
  prefersHighContrast,
  generateAriaId,
  aria,
  SKIP_LINK_DEFAULTS,
} from "./a11y";
export {
  mean,
  median,
  stddev,
  percentile,
  linearRegression,
  sum,
  minmax,
  normalize,
  movingAverage,
  ema,
} from "./math";
export {
  getFocusHistory,
  clearFocusHistory,
  startFocusTracking,
  getFocusedElement,
  applyFocusRing,
  createFocusScope,
  makeFocusable,
  findNextFocusable,
} from "./focus-manager";
export type {
  FocusEntry,
  FocusHistoryOptions,
  FocusRingOptions,
  FocusScopeOptions,
  FocusManagerConfig,
} from "./focus-manager";
export {
  generateUuid,
  randomString,
  hashString,
} from "./crypto";
export {
  isValidUrl,
  getDomain,
  getPathname,
  getQueryParams,
  isAbsoluteUrl,
  isSameOrigin,
  joinPath as urlJoinPath,
  resolveUrl,
  stripQueryAndHash,
  getUrlExtension,
} from "./url";
export {
  getExtension,
  getBasename,
  getDirname,
  joinPath,
  normalizePath,
  isAbsolute,
  isUrlPath,
  relativePath,
} from "./file";
export {
  isToday,
  isYesterday,
  startOfDay,
  endOfDay,
  timeAgoLabel,
  toISODate,
} from "./date";
export {
  round,
  clamp,
  lerp,
  mapRange,
  formatBytes,
  formatCompact,
  percentOf,
  randomInt,
  approximately,
  parseNumber,
} from "./number";
export {
  capitalize,
  toTitleCase,
  camelToKebab,
  kebabToCamel,
  truncateMiddle,
  maskEmail,
  maskString,
  isJsonString,
  repeat,
  stripHtml,
} from "./string";
export {
  chunk,
  unique,
  groupBy,
  sortBy,
  flatten,
  times,
} from "./array";
export {
  deepClone,
  pick,
  omit,
  isEmpty,
  get,
  set,
  deepMerge,
  deepFreeze,
} from "./object";
export {
  createTreeNode,
  buildTree,
  flattenTree,
  flattenTreeWithDepth,
  findNodeById,
  findNodes,
  getPathToNode,
  getTreeDepth,
  countNodes,
  mapTree,
  filterTree,
} from "./tree";
export type {
  TreeNode,
} from "./tree";
export {
  Graph,
} from "./graph";
export type {
  GraphNode,
  GraphEdge,
} from "./graph";
export {
  AsyncQueue,
  RateLimiter,
  BatchingQueue,
} from "./queue";
export type {
  QueueTask,
} from "./queue";
export {
  Stack,
  UndoRedoManager,
  CallTracker,
} from "./stack";
export type {
  StackOptions,
  UndoRedoState,
} from "./stack";
export {
  globToRegex,
  isGlobMatch,
  wildcardMatch,
  levenshtein,
  fuzzyScore,
  findBestMatch,
  camelToWords,
  kebabToWords,
  snakeToWords,
} from "./pattern";
export {
  UndoableStore,
  EventBus,
  globalEvents,
} from "./state";
export type {
  HistoryState,
} from "./state";
export {
  Scheduler,
  parseCronExpression,
  cronMatches,
  getNextCronRun,
} from "./scheduler";
export type {
  ScheduledJob,
  JobStatus,
  CronExpression,
} from "./scheduler";
export {
  distance,
  distanceSquared,
  midpoint,
  angle,
  degToRad,
  radToDeg,
  pointInRect,
  rectCenter,
  rectsIntersect,
  rectIntersection,
  boundingRect,
  scaleRect,
  clampPoint,
  aspectRatio,
  fitSize,
} from "./geometry";
export type {
  Point,
  Rect,
  Size,
} from "./geometry";
export {
  mapValues,
  groupAndAggregate,
  pivot,
  unpivot,
  flattenObject,
  unflattenObject,
  deepMergeCustom,
} from "./transform";
export type {
  PivotOptions,
} from "./transform";
export {
  createLayout,
} from "./layout";
export type {
  LayoutMode,
  SidebarPosition,
  LayoutRegion,
  LayoutOptions,
  LayoutInstance,
} from "./layout";
export {
  CanvasContext,
  createCanvas,
  drawGrid,
  drawCheckerboard,
} from "./canvas";
export type {
  Point2D as CanvasPoint,
  CanvasSize,
  DrawOptions,
  TextOptions,
  GradientStop,
} from "./canvas";
export {
  SvgBuilder,
  commandsToD,
  parsePathD,
  smoothCurve,
  arcPath,
  ringArcPath,
  roundedRectPath,
  starPath,
  polygonPath,
  arrowPath,
  createSvg,
  svg,
} from "./svg";
export type {
  SvgPoint,
  SvgSize,
  SvgViewBox,
  SvgOptions,
  PathCommand,
} from "./svg";
export {
  ChartManager,
  createChart,
} from "./chart";
export type {
  ChartType,
  ChartDataPoint,
  ChartDataset,
  ChartOptions,
  ChartInstance,
} from "./chart";
export {
  GestureManager,
  createGesture,
  swipeGestures,
  tapGesture,
} from "./gesture";
export type {
  GestureType,
  SwipeDirection,
  GestureConfig,
  GestureHandlerConfig,
  GestureEvent,
  GestureInstance,
} from "./gesture";
export {
  trackCursor,
  getCursorPosition,
  setCustomCursor,
  setCursorStyle,
  hideCursor,
  createCursorTrail,
  hideCursorOnIdle,
  isNearCursor,
  getCursorRelativeTo,
  constrainToElement,
} from "./cursor";
export type {
  CursorPosition,
  CursorTrailOptions,
  CustomCursorOptions,
  CursorTrackerOptions,
} from "./cursor";
export {
  SelectionManager,
  createSelectionManager,
} from "./selection";
export type {
  SelectionRange,
  CaretPosition,
  SelectionManagerOptions,
  SelectionManagerInstance,
} from "./selection";
export {
  getViewportSize,
  getVisualViewportSize,
  getDocumentSize,
  isLandscape,
  isPortrait,
  createScrollTracker,
  getScrollProgress,
  scrollToElement,
  scrollToTop,
  scrollToBottom,
  observeVisibility,
  whenVisible,
  observeResize,
  requestFullscreen,
  exitFullscreen,
  isFullscreen,
  onFullscreenChange,
} from "./viewport";
export type {
  ViewportSize,
  ScrollPosition,
  VisibilityOptions,
  ViewportObserverInstance,
  ResizeObserverOptions,
} from "./viewport";
export {
  getBreakpoints,
  getCurrentBreakpoint,
  matchesMedia,
  watchMedia,
  isMinSm,
  isMinMd,
  isMinLg,
  isMinXl,
  isMaxXs,
  isMaxSm,
  isMaxMd,
  isMobile,
  isTablet,
  isDesktop,
  onBreakpointChange,
  isPrinting,
  onPrintStart,
  onPrintEnd,
  isDarkMode,
  isLightMode,
  onColorSchemeChange,
  getOrientation,
  onOrientationChange,
} from "./media";
export type {
  BreakpointName,
  Breakpoint,
  BreakpointConfig,
  MediaQueryOptions,
  MediaQueryInstance,
} from "./media";
export {
  detectOS,
  detectBrowser,
  isTouchDevice,
  getDeviceType,
  getDeviceInfo,
  isIOS,
  isAndroid,
  isMobileDevice,
  isTabletDevice,
  isDesktopDevice,
  isSafari,
  isFirefox,
  isChrome,
  isEdge,
  getDeviceMemory,
  getCPUCores,
  isDataSaver,
  getConnectionQuality,
  isHiDPI,
  getSafeAreaInsets,
} from "./device";
export type {
  OSType,
  BrowserType,
  DeviceType,
  DeviceInfo,
} from "./device";
export {
  reportMetric,
  getSessionMetrics,
  observeWebVitals,
  markRender,
} from "./performance";
export type {
  PerformanceMetric,
} from "./performance";
export {
  createInlineWorker,
  runInWorker,
  TaskQueue,
  BatchingProcessor,
  requestIdleCallback,
  cancelIdleCallback,
} from "./worker";
export {
  Cache,
  defaultCache,
  memoize,
} from "./cache";
export type {
  CacheOptions,
} from "./cache";
export {
  cssVar,
  setCssVar,
  breakpoint,
  BREAKPOINTS,
  hexToRgb,
  rgbToHex,
  parseColor,
  mixColors,
  transparentize,
} from "./css";
export {
  EventDelegate,
  createBodyDelegate,
  createDelegate,
} from "./event-delegate";
export type {
  DelegateOptions,
  DelegatedEvent,
  DelegateHandler,
  EventDelegateInstance,
} from "./event-delegate";
export {
  DOMMutationObserver,
  observeMutations,
  waitForElement,
} from "./mutation";
export type {
  MutationFilter,
  MutationObserverOptions,
  MutationChange,
  MutationObserverInstance,
} from "./mutation";
export {
  Animator,
  easings,
  resolveEasing,
  staggerAnimate,
  scrollTrigger,
} from "./animate";
export type {
  Keyframe,
  AnimationOptions,
  AnimationInstance,
  StaggerOptions,
  TimelineOptions,
} from "./animate";
export {
  transition,
  stagger,
  springs,
  prefersReducedMotion,
} from "./transition";
export {
  MotionValueImpl,
  motionValue,
  Spring,
  createSpring,
  inertia,
  lerp,
  interpolate,
  clamp as motionClamp,
  mapRange,
} from "./motion";
export type {
  SpringConfig,
  SpringState,
  MotionValue,
  MotionTransitionOptions,
  InertiaOptions,
} from "./motion";
export {
  h,
  createTextVNode,
  Fragment as VDOMFragment,
  createComponentVNode,
  createElement,
  applyProps,
  diff,
  patch,
  computePropsDiff,
  mount,
  updateTree,
  unmount,
  enqueueUpdate,
  startBatch,
  endBatch,
  renderWithErrorBoundary,
  scheduler,
  beginFiberWork,
  memo as vdomMemo,
  shallowEqual,
  createContext,
  readContext,
  subscribeToContext,
  createRenderer,
  createDevToolsHook,
} from "./virtual-dom";
export type {
  VNodeType,
  VNode,
  VNodeProps,
  ComponentFunction as VDOMComponentFunction,
  ComponentLifecycle,
  ComponentInstance as VDOMComponentInstance,
  Patch,
  PropsDiff,
  SyntheticEvent,
  Context as VDOMContext,
  MemoizedComponent,
  DevToolsHook,
  VDOMRendererOptions,
} from "./virtual-dom";
export {
  BaseComponent,
  createComponent,
  withProps,
  when,
  memoComponent,
  Fragment as CompFragment,
} from "./component";
export type {
  ComponentProps,
  ComponentState,
  ComponentNode,
  LifecycleHooks,
  ErrorInfo as CompErrorInfo,
  RenderFunction,
} from "./component";
export {
  Signal,
  Computed,
  Effect,
  signal,
  computed,
  effect,
  batch,
  untrack,
  readonly,
  deepSignal,
  derived,
  combine,
} from "./reactive";
export type {
  EqualityFn,
  SignalOptions,
  EffectOptions,
} from "./reactive";
export {
  formatNumber,
  formatBytes,
  formatDuration,
  formatDate,
  formatPercent,
} from "./formatters";
export {
  hasPermission,
  hasRoleLevel,
  getPermissions,
  ACL,
  appACL,
} from "./permission";
export type {
  Role,
  Permission,
} from "./permission";
export {
  EnhancedLogger,
  logger,
  log,
  createLogger,
} from "./logger-enhanced";
export type {
  LogLevel,
  LogEntry,
  TransportOptions,
} from "./logger-enhanced";
export {
  I18nManager,
  createI18n,
  getI18n,
} from "./i18n-enhanced";
export type {
  LocaleCode,
  LocaleDirection,
  LocaleInfo,
  MessageCatalog,
  I18nOptions,
  PluralForm,
} from "./i18n-enhanced";
export {
  Router,
  createRouter,
  getRouter,
} from "./router";
export type {
  RouteMode,
  RouteParams,
  QueryParams,
  RouteDefinition,
  RouterConfig,
  RouteInfo,
  NavigationResult,
} from "./router";
export {
  Store,
  createStore,
  createComputed,
  persistMiddleware,
  connectDevTools,
  registerStore,
  getStore,
  unregisterStore,
} from "./store";
export type {
  Listener,
  Selector,
  EqualityFn,
  PartialState as StorePartialState,
  Middleware,
  StoreOptions,
  StoreApi,
  PersistOptions,
} from "./store";
export {
  httpRequest,
  http,
  retryHttp,
  setBaseUrl,
  getBaseUrl,
} from "./http";
export type {
  HttpRequestConfig,
  HttpResponse,
  HttpError,
} from "./http";
export {
  WebSocketManager,
  WsRoomManager,
  isWebSocketSupported,
  getWebSocketUrl,
  createWebSocketUrl,
  parseWsUrl,
} from "./websocket";
export type {
  WsEvent,
  WebSocketData,
  WebSocketState,
  WebSocketStats,
  ReconnectConfig,
  HeartbeatConfig,
  WebSocketOptions,
} from "./websocket";
export {
  EventBus,
  createEventBus,
} from "./event-bus";
export type {
  EventCallback,
  EventMiddleware,
  Subscription,
  EmittedEvent,
  EventBusOptions,
} from "./event-bus";
export {
  validate,
  validateField,
  createValidator,
} from "./validation";
export type {
  SchemaType,
  SchemaRule,
  FieldSchema,
  ValidationResult,
} from "./validation";
export {
  GenerateDiffSchema,
  CreateFrictionSchema,
  CreatePRSchema,
  VoteSchema,
  validateBody,
} from "./schema";
export type {
  GenerateDiffInput,
  CreateFrictionInput,
  CreatePRInput,
  VoteInput,
} from "./schema";
export {
  createForm,
} from "./form";
export type {
  FieldType,
  ValidationRule as FormValidationRule,
  FormField,
  FormGroup,
  FormOptions,
  FormInstance,
} from "./form";
export {
  parseJwt,
  isJwtExpired,
  isJwtExpiringSoon,
  jwtTimeToExpiry,
  getJwtSubject,
  decodeJwtHeader,
  checkPasswordStrength,
  buildOAuthUrl,
  parseOAuthCallback,
  AuthManager,
} from "./auth";
export type {
  JwtPayload,
  AuthState,
  AuthConfig,
  PasswordStrengthResult,
  OAuthProvider,
} from "./auth";
export {
  EnhancedACL,
} from "./permission-enhanced";
export type {
  Action,
  Resource,
  RoleDefinition,
  Permission,
  AttributeCondition,
  Policy,
  TimeConstraint,
  UserContext,
  EvaluationResult,
  RolePermissionMap,
} from "./permission-enhanced";
export {
  SessionManager,
} from "./session";
export type {
  SessionData,
  SessionConfig,
  SessionState,
  SessionEventType,
  SessionListener,
} from "./session";
export {
  ThemeManager,
  getThemeManager,
  useTheme,
  LIGHT_THEME,
  DARK_THEME,
  BUILT_IN_THEMES,
} from "./theme";
export type {
  ThemeColors,
  ThemeConfig,
} from "./theme";
export {
  DesignTokenManager,
} from "./design-tokens";
export type {
  ColorToken,
  SpacingScale,
  TypographyScale,
  ShadowToken,
  RadiusScale,
  TransitionToken,
  BreakpointDefinition,
  DesignTokensConfig,
  ResolvedTokens,
} from "./design-tokens";
export {
  injectStyle,
  removeStyle,
  updateStyle,
  setCssVar,
  getCssVar,
  setCssVars,
  getRootVar,
  setRootVar,
  getCurrentBreakpoint,
  isMinWidth,
  isMaxWidth,
  onBreakpointChange,
  isMobile,
  isTablet,
  isDesktop,
  getDevicePixelRatio,
  isRetina,
  mq,
  mediaQueries,
  matchesMedia,
  subscribeMedia,
  isDarkMode,
  isLightMode,
  toggleDarkMode,
  setDarkMode,
  onDarkModeChange,
  buildKeyframes,
  registerKeyframes,
  animations,
  animate,
  toggleClass,
  classIf,
  setClasses,
  hasAnyClass,
  bringToFront,
  sendToBack,
} from "./css-in-js";
export type {
  Breakpoints,
  KeyframeRule,
} from "./css-in-js";
export {
  NotificationManager,
  getNotificationManager,
  toast,
} from "./notification";
export type {
  NotificationType,
  Notification,
  NotificationOptions,
  NotificationPosition,
} from "./notification";
export {
  createModal,
} from "./modal";
export type {
  ModalSize,
  ModalPosition,
  ModalOptions,
  ModalInstance,
} from "./modal";
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";
export {
  createTableState,
  getSortedData,
  getFilteredData,
  getPaginatedData,
  getCellValue,
  applyFilterOperator,
  toggleSort,
  setSearchTerm,
  toggleFilter,
  goToPage,
  setPageSize,
  toggleRowSelection,
  toggleSelectAll,
  toggleRowExpand,
  resetTable,
  exportTableAsCsv,
} from "./table";
export type {
  Column,
  TableState,
  SortState,
  FilterState,
  FilterOperator,
  PaginationState,
  SelectionState,
} from "./table";
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabOrientation,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs";
export {
  AccordionManager,
  createAccordion,
} from "./accordion";
export type {
  AccordionItem,
  AccordionMode,
  AccordionOptions,
  AccordionInstance,
} from "./accordion";
export {
  createDropdown,
} from "./dropdown";
export type {
  DropdownPlacement,
  DropdownItem,
  DropdownSeparator,
  DropdownGroup,
  DropdownEntry,
  DropdownOptions,
  DropdownInstance,
} from "./dropdown";
export {
  CarouselManager,
  createCarousel,
} from "./carousel";
export type {
  CarouselSlide,
  CarouselOptions,
  CarouselInstance,
} from "./carousel";
export {
  createProgressTracker,
  createMultiProgressTracker,
  formatProgress,
  createStepProgress,
} from "./progress";
export type {
  ProgressState,
  ProgressCallback,
  ProgressController,
  MultiProgressController,
  StepProgressController,
} from "./progress";
export {
  CommandPalette,
} from "./command-palette";
export type {
  Command,
  CommandCategory,
  CommandPaletteConfig,
  CommandPaletteState,
} from "./command-palette";
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";
export {
  createSplitView,
  createHorizontalSplit,
  createVerticalSplit,
} from "./split-view";
export type {
  SplitDirection,
  PaneConfig,
  SplitViewOptions,
  SplitViewState,
  SplitViewInstance,
} from "./split-view";
export {
  InfiniteScroll,
} from "./infinite-scroll";
export type {
  InfiniteScrollItem,
  InfiniteScrollOptions,
  InfiniteScrollState,
} from "./infinite-scroll";
export {
  createVirtualList,
} from "./virtual-list";
export type {
  VirtualListItem,
  VirtualListOptions,
  VirtualListInstance,
} from "./virtual-list";
export {
  DragDropManager,
  getDragDropManager,
} from "./drag-and-drop";
export type {
  DragMode,
  DropPosition,
  DragItem,
  DragOptions,
  DropZoneOptions,
  DropResult,
  SortableConfig,
} from "./drag-and-drop";
export {
  TreeView,
} from "./tree-view";
export type {
  TreeNodeData,
  TreeNode,
  CheckMode,
  TreeViewConfig,
} from "./tree-view";
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
} from "./avatar";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  BadgeOptions,
  StatusDotOptions,
} from "./badge";
export {
  RatingManager,
  createRating,
} from "./rating";
export type {
  StarIconType,
  RatingOptions,
  RatingInstance,
} from "./rating";
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";
export {
  EmptyStateManager,
  createEmptyState,
} from "./empty-state";
export type {
  EmptyStateVariant,
  EmptyStateOptions,
  EmptyStateInstance,
} from "./empty-state";
export {
  BreadcrumbManager,
  createBreadcrumb,
} from "./breadcrumb";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb";
export {
  PaginationManager,
  createPagination,
} from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";
export {
  TagInputManager,
  createTagInput,
} from "./tag-input";
export type {
  TagItem,
  TagInputOptions,
  TagInputInstance,
} from "./tag-input";
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type {
  RgbColor,
  HslColor,
  Palette,
} from "./color-picker";
export {
  DatePickerManager,
  createDatePicker,
} from "./date-picker";
export type {
  DatePickerOptions,
  DatePickerInstance,
} from "./date-picker";
export {
  SliderManager,
  createSlider,
} from "./slider";
export type {
  SliderMark,
  SliderOptions,
  SliderInstance,
} from "./slider";
export {
  FileUploadManager,
  createFileUpload,
} from "./file-upload";
export type {
  FileUploadOptions,
  UploadFile,
  FileUploadInstance,
} from "./file-upload";
export {
  createSwitch,
} from "./switch";
export type {
  SwitchSize,
  SwitchVariant,
  SwitchOptions,
  SwitchInstance,
} from "./switch";
export {
  createCheckboxGroup,
} from "./checkbox-group";
export type {
  CheckboxSize,
  CheckboxVariant,
  CheckboxOption,
  CheckboxGroupOptions,
  CheckboxGroupInstance,
} from "./checkbox-group";
export {
  TimelineManager,
  createTimeline,
} from "./timeline";
export type {
  TimelineItemStatus,
  TimelineItem,
  TimelineOptions,
  TimelineInstance,
} from "./timeline";
export {
  StepperManager,
  createStepper,
} from "./stepper";
export type {
  StepStatus,
  StepConfig,
  StepperOptions,
  StepperInstance,
} from "./stepper";
export {
  TransferManager,
  createTransfer,
} from "./transfer";
export type {
  TransferItem,
  TransferOptions,
  TransferInstance,
} from "./transfer";
export {
  AutoCompleteManager,
  createAutoComplete,
} from "./auto-complete";
export type {
  AutoCompleteOption,
  AutoCompleteOptions,
  AutoCompleteInstance,
} from "./auto-complete";
export {
  MentionManager,
  createMention,
} from "./mention";
export type {
  MentionOption,
  MentionOptions,
  MentionInstance,
} from "./mention";
export {
  SelectManager,
  createSelect,
} from "./select";
export type {
  SelectOption,
  SelectOptions,
  SelectInstance,
} from "./select";
export {
  ImageGalleryManager,
  createImageGallery,
} from "./image-gallery";
export type {
  GalleryImage,
  ImageGalleryOptions,
  ImageGalleryInstance,
} from "./image-gallery";
export {
  parseMarkdown,
  renderToHtml,
  generateToc,
  renderToc,
  extractFrontMatter,
  mdToHtml,
} from "./markdown-renderer";
export type {
  MdNode,
  MdNodeType,
  MdRenderOptions,
  TocEntry,
  FrontMatter,
} from "./markdown-renderer";
export {
  generateQrSvg,
  generateQrDataUri,
  generateQrCanvas,
  validateQrInput,
} from "./qr-code";
export {
  CountUpManager,
  createCountUp,
} from "./count-up";
export type {
  EasingFn,
  CountUpOptions,
  CountUpInstance,
} from "./count-up";
export {
  TypewriterManager,
  createTypewriter,
} from "./typewriter";
export type {
  TypewriterOptions,
  TypewriterInstance,
} from "./typewriter";
export {
  MarqueeManager,
  createMarquee,
} from "./marquee";
export type {
  MarqueeDirection,
  MarqueeStyle,
  MarqueeItem,
  MarqueeOptions,
  MarqueeInstance,
} from "./marquee";
export {
  copyToClipboard,
  copyRichToClipboard,
  readFromClipboard,
  readRichFromClipboard,
  isClipboardAvailable,
  canReadClipboard,
  watchClipboard,
} from "./clipboard";
export type {
  ClipboardData,
  ClipboardOptions,
} from "./clipboard";
export {
  PrintManager,
  createPrintManager,
  quickPrint,
  addPageBreakBefore,
  addPageBreakAfter,
  avoidBreakInside,
} from "./print";
export type {
  PrintOptions,
  PrintManagerInstance,
} from "./print";
export {
  createBackToTop,
} from "./back-to-top";
export type {
  BttPosition,
  BttSize,
  BttShape,
  BackToTopOptions,
  BackToTopInstance,
} from "./back-to-top";
export {
  NotificationManager,
  getNotificationManager,
  toast,
} from "./notification";
export type {
  NotificationType,
  Notification,
  NotificationOptions,
  NotificationPosition,
} from "./notification";
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";
export {
  createModal,
} from "./modal";
export type {
  ModalSize,
  ModalPosition,
  ModalOptions,
  ModalInstance,
} from "./modal";
export {
  createSplitter,
} from "./drawer";
export type {
  SplitterOrientation,
  SplitterPaneOptions,
  SplitterOptions,
  SplitterInstance,
} from "./drawer";
export {
  PopoverManager,
  createPopover,
} from "./popover";
export type {
  PopoverTrigger,
  PopoverPlacement,
  PopoverOptions,
  PopoverInstance,
} from "./popover";
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";
export {
  createAffix,
} from "./affix";
export type {
  AffixOptions,
  AffixInstance,
} from "./affix";
export {
  createVirtualScroll,
  createVirtualGrid,
} from "./virtual-scroll";
export type {
  VirtualScrollItem,
  VirtualScrollOptions,
  VirtualScrollState,
  VirtualScrollController,
  VirtualGridOptions,
  VirtualGridState,
  VirtualGridController,
} from "./virtual-scroll";
export {
  InfiniteScroll,
} from "./infinite-scroll";
export type {
  InfiniteScrollItem,
  InfiniteScrollOptions,
  InfiniteScrollState,
} from "./infinite-scroll";
export {
  createAnchor,
} from "./anchor";
export type {
  AnchorLink,
  AnchorOptions,
  AnchorInstance,
} from "./anchor";
export {
  createTour,
} from "./tour";
export type {
  TourStep,
  TourOptions,
  TourInstance,
} from "./tour";
export {
  HotkeyManager,
  createAppHotkeys,
  parseKeyCombo,
  eventMatchesCombo,
  formatKeyDisplay,
  areModifiersDown,
  getModifierString,
} from "./hotkeys";
export type {
  HotkeyBinding,
  HotkeyEvent,
  ParsedKeyCombo,
} from "./hotkeys";
export {
  createForm,
} from "./form";
export type {
  FieldType,
  ValidationRule,
  FormField,
  FormGroup,
  FormOptions,
  FormInstance,
} from "./form";
export {
  createTableState,
  getSortedData,
  getFilteredData,
  getPaginatedData,
  getCellValue,
  applyFilterOperator,
  toggleSort,
  setSearchTerm,
  toggleFilter,
  goToPage,
  setPageSize,
  toggleRowSelection,
  toggleSelectAll,
  toggleRowExpand,
  resetTable,
  exportTableAsCsv,
} from "./table";
export type {
  Column,
  TableState,
  SortState,
  FilterState,
  FilterOperator,
  PaginationState,
  SelectionState,
} from "./table";
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabOrientation,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs";
export {
  createProgressTracker,
  createMultiProgressTracker,
  createStepProgress,
  formatProgress,
} from "./progress";
export type {
  ProgressState,
  ProgressCallback,
  ProgressController,
  MultiProgressController,
  StepProgressController,
} from "./progress";
export {
  AccordionManager,
  createAccordion,
} from "./accordion";
export type {
  AccordionItem,
  AccordionMode,
  AccordionOptions,
  AccordionInstance,
} from "./accordion";
export {
  CarouselManager,
  createCarousel,
} from "./carousel";
export type {
  CarouselSlide,
  CarouselOptions,
  CarouselInstance,
} from "./carousel";
export {
  ConfigManager,
  createConfig,
} from "./config";
export type {
  ConfigValue,
  ConfigSchema,
  ConfigSchemaEntry,
  Environment,
  ConfigOptions,
  ConfigSource,
  ConfigValidationResult,
} from "./config";
export {
  t,
  getLocale,
  setLocale,
  LOCALE_CHANGE_EVENT,
} from "./i18n";
export type {
  Locale,
} from "./i18n";
export {
  AnalyticsManager,
  getAnalytics,
  initAnalytics,
} from "./analytics";
export type {
  AnalyticsEvent,
  PageView,
  PerformanceMetric,
  AnalyticsConfig,
  AnalyticsState,
} from "./analytics";
export {
  createWatermark,
} from "./watermark";
export type {
  WatermarkOptions,
  WatermarkInstance,
} from "./watermark";
export {
  createFullscreen,
} from "./screen-full";
export type {
  FullscreenOptions,
  FullscreenInstance,
} from "./screen-full";
export {
  createIdleDetector,
} from "./idle";
export type {
  IdleState,
  IdleOptions,
  IdleInstance,
} from "./idle";
export {
  ThemeManager,
  getThemeManager,
  useTheme,
  LIGHT_THEME,
  DARK_THEME,
  BUILT_IN_THEMES,
} from "./theme";
export type {
  ThemeColors,
  ThemeConfig,
} from "./theme";
export {
  createCssVars,
  parseCssValue,
  pxToRem,
  remToPx,
  resolveCssVarChain,
} from "./css-variables";
export type {
  CssVarOptions,
  CssVarInstance,
} from "./css-variables";
export {
  ResponsiveManager,
  getResponsiveManager,
  matchesMedia,
  watchMedia,
  getSafeAreaInsets,
  getViewportSize,
  DEFAULT_BREAKPOINTS,
} from "./responsive";
export type {
  Breakpoint,
  ResponsiveOptions,
  ResponsiveInfo,
} from "./responsive";
export {
  storageGet,
  storageSet,
  storageRemove,
  storageKeys,
  storageClear,
} from "./storage";
export {
  qs,
  qsa,
  createElement,
  on,
  domReady,
  isVisible,
  getStyle,
  scrollIntoView,
  copyToClipboard: domCopyToClipboard,
  downloadFile,
} from "./dom";
export {
  EventBus,
  createEventBus,
} from "./event-bus";
export type {
  EventCallback,
  EventMiddleware,
  Subscription,
  EmittedEvent,
  EventBusOptions,
} from "./event-bus";
export {
  debounce,
  throttle,
  debounceAsync,
  throttleAsync,
  debounceCancel,
  debounceFlush,
} from "./debounce";
export type {
  DebounceOptions,
  ThrottleOptions,
} from "./debounce";
export {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatBytes,
  formatCompact,
  formatDate,
  formatRelativeTime,
  formatIsoDate,
  formatTime,
  formatDuration,
  template,
  pluralize,
  truncate,
  capitalize,
  titleCase,
  kebabCase,
  snakeCase,
  camelCase,
  maskString,
} from "./format";
export {
  validate,
  validateSync,
  check,
  required,
  isEmail,
  isUrl,
  isPhone,
  minLength,
  maxLength,
  minValue,
  maxValue,
  matches,
  oneOf,
  isNumber,
  isBoolean,
  isDate,
  custom,
} from "./validate";
export type {
  ValidationResult,
  ValidationRule,
  ValidatorFn,
} from "./validate";
export {
  uuidv4,
  uuidv7,
  nanoId,
  shortId,
  prefixedId,
  isUuid,
  getUuidVersion,
} from "./uuid";
export {
  sha256,
  sha384,
  sha512,
  simpleHash,
  hashToInt,
  hashObject,
  combineHashes,
  hashColor,
  hashHexColor,
  fingerprint,
  timingSafeEqual,
} from "./hash";
export {
  secureRandomInt,
  secureRandomFloat,
  securePick,
  secureShuffle,
  weightedRandom,
  createWeightedPicker,
  createSeededRng,
  seededInt,
  seededPick,
  seededShuffle,
  normalRandom,
  clampedNormal,
  randomString,
  randomHex,
  generatePassword,
} from "./random";
export {
  mean,
  median,
  stddev,
  percentile,
  linearRegression,
  sum,
  minmax,
  normalize,
  movingAverage,
  ema,
} from "./math";
export {
  isValidUrl,
  getDomain,
  getPathname,
  getQueryParams,
  isAbsoluteUrl,
  isSameOrigin,
  joinPath,
  resolveUrl,
  stripQueryAndHash,
  getUrlExtension,
} from "./url";
export {
  DomObserverManager,
  takeSnapshot,
  compareSnapshots,
  createRouteChangeDetector,
  createLazyLoader,
} from "./dom-observer";
export type {
  ObserveTarget,
  MutationOptions,
  IntersectionOptions as DomIntersectionOptions,
  ResizeOptions,
  MutationRecordEx,
  DomSnapshot,
  ObserverCallbacks,
  ObserverStats,
} from "./dom-observer";
export {
  IntersectionManager,
  createIntersectionObserver,
  whenVisible,
  whenHidden,
  isInViewport,
  getVisibilityPercent,
} from "./intersection";
export type {
  IntersectionObserverOptions,
  IntersectionObserverEntry as IntersectionObserverEntryType,
  IntersectionObserverInstance,
} from "./intersection";
export {
  chunk,
  unique,
  groupBy,
  sortBy,
  flatten,
  times,
} from "./array";
export {
  deepClone,
  pick,
  omit,
  isEmpty,
  get as objGet,
  set as objSet,
  deepMerge,
  deepFreeze,
} from "./object";
export {
  EASING,
  animateValue,
  springAnimate,
  cssKeyframes,
  KEYFRAMES,
  DURATION,
  transition,
} from "./animation";
export type { EasingName, SpringConfig } from "./animation";
export {
  parseColor,
  toRgb,
  toHsl,
  toHsv,
  toHex,
  toCss,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToRgb,
  hslToHex,
  hexToHsl,
  lighten,
  darken,
  saturate,
  desaturate,
  rotateHue,
  setOpacity,
  mix,
  lerpColor,
  invert,
  grayscale,
  complement,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  luminance,
  contrastRatio,
  passesWCAGAA,
  passesWCAGAAA,
  getContrastColor,
  bestContrast,
  stringToColor,
  generatePalette,
  generateGradientPalette,
  shadeScale,
  tailwindPalette,
  STATUS_COLORS,
  getStatusColor,
} from "./color";
export type {
  RgbColor,
  HslColor,
  HsvColor,
  ColorInput,
  StatusColor,
} from "./color";
export {
  isToday,
  isYesterday,
  startOfDay,
  endOfDay,
  timeAgoLabel,
  toISODate,
} from "./date";
export {
  round,
  clamp as numClamp,
  lerp,
  mapRange,
  formatBytes,
  formatCompact,
  percentOf,
  randomInt,
  approximately,
  parseNumber,
} from "./number";
export {
  capitalize,
  toTitleCase,
  camelToKebab,
  kebabToCamel,
  truncateMiddle,
  maskEmail,
  maskString,
  isJsonString,
  repeat,
  stripHtml,
} from "./string";
export {
  escapeRegexString,
  testRegex,
  extractMatches,
  replaceAll,
  splitByRegex,
  isValidEmailRegex,
  isValidUrlRegex,
  isValidHexColor,
  isValidRgbColor,
  globToRegex,
  isGlobMatch,
  filterGlob,
  createRegex,
  wordBoundary,
  digitPattern,
  whitespacePattern,
  newlinePattern,
  extractWords,
  extractNumbersRegex,
  countPattern,
  removeDiacritics,
  wildcardMatch,
} from "./regex";
export {
  retry,
  withTimeout,
  sleep,
  nextTick,
  nextFrame,
  debounceAsync,
  throttleAsync,
  concurrencyLimit,
  batchProcess,
  raceWithFallback,
  mapConcurrent,
  sequence,
  createDeferred,
  poll,
  memoizeAsync,
} from "./async";
export type {
  RetryOptions,
  TimeoutOptions,
  DebounceAsyncOptions,
  ThrottleAsyncOptions,
  ConcurrencyOptions,
} from "./async";
export {
  detectBrowser,
  supports,
  getViewport,
  isTouchDevice,
  prefersReducedMotion,
  prefersDarkMode,
  getColorGamut,
} from "./browser";
export type { BrowserInfo } from "./browser";
export {
  getPlatform,
  getOSType,
  isMobile,
  isTablet,
  isDesktop,
  getUserLanguage,
  getTimezoneOffset,
  getTimezoneName,
  isRTL,
  isStandalone,
  isFullscreen,
  requestFullscreen,
  exitFullscreen,
  getScreenOrientation,
  onOrientationChange,
  getDevicePixelRatio,
  onPixelRatioChange,
  getConnectionInfo,
  onConnectionChange,
  getBatteryInfo,
} from "./platform";
export type { PlatformInfo, OSType } from "./platform";
export {
  KeyboardManager,
  createKeyboardManager,
  formatShortcut,
  matchesShortcut,
} from "./keyboard";
export type {
  KeyBinding,
  KeyChord,
  KeyboardManagerOptions,
  KeyboardManagerInstance,
} from "./keyboard";
export {
  getPointerPosition,
  createPositionTracker,
  onClickOutside,
  makeDraggable,
  onLongPress,
  trackScrollDirection,
  requestPointerLock,
  exitPointerLock,
  isPointerLocked,
  pointDistance,
  pointAngle,
  pointInRect,
} from "./mouse";
export type {
  Point as MousePoint,
  MousePosition,
  ClickOutsideOptions,
  DragOptions,
  DragInstance,
  LongPressOptions,
  ScrollDirectionInfo,
} from "./mouse";
export {
  GestureManager,
  createGesture,
  swipeGestures,
  tapGesture,
} from "./gesture";
export type {
  GestureType,
  SwipeDirection,
  GestureConfig,
  GestureHandlerConfig,
  GestureEvent,
  GestureInstance,
} from "./gesture";
export {
  createFocusTrap,
  applyFocusRing,
  withRestoredFocus,
  autofocusDescendant,
  getTabOrder,
  setTabOrderIndex,
  disableOutsideFocus,
  restoreFocusState,
  createSkipLink,
} from "./focus";
export type { FocusTrapOptions, FocusTrapInstance, FocusRingOptions, SkipLinkOptions } from "./focus";
export {
  scrollToId,
  scrollToTop,
  getScrollPosition,
  isInViewport as scrollIsInViewport,
} from "./scroll";
export {
  createLayout,
} from "./layout";
export type {
  LayoutMode,
  SidebarPosition,
  LayoutRegion,
  LayoutOptions,
  LayoutInstance,
} from "./layout";
export {
  I18nNumber,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatFileSize,
  timeAgo as i18nTimeAgo,
} from "./i18n-number";
export type {
  NumberFormatStyle,
  CurrencyDisplay,
  CompactDisplay,
  Notation,
  SignDisplay,
  RoundingMode,
  RelativeTimeUnit,
  ListType,
  MeasurementSystem,
  NumberFormatOptions,
  CurrencyInfo,
  RelativeTimeOptions,
  ListFormatOptions,
  UnitConversion,
  MeasurementFormatOptions,
} from "./i18n-number";
export {
  createTreeNode,
  buildTree,
  flattenTree,
  flattenTreeWithDepth,
  findNodeById,
  findNodes,
  getPathToNode,
  getTreeDepth,
  countNodes,
  mapTree,
  filterTree,
} from "./tree";
export type { TreeNode } from "./tree";
export {
  UndoableStore,
  EventBus,
  globalEvents,
} from "./state";
export {
  parseCsv,
  generateCsv,
  csvToHtmlTable,
} from "./csv";
export type { CsvOptions } from "./csv";
export {
  mdToHtml,
  stripMd,
} from "./markdown";
export {
  renderTemplate,
  parseConditionalBlocks,
  Template,
} from "./template";
export type { TemplateBlock } from "./template";
export {
  Logger,
  log,
  apiLog,
  dbLog,
  extLog,
  setGlobalLogLevel,
  getGlobalLogLevel,
} from "./logger";
export type { LogLevel } from "./logger";
export {
  AppError,
  NetworkError,
  ValidationError,
  NotFoundError,
  AuthError,
  RateLimitError,
  TimeoutError,
  CancelledError,
  classifyError,
  isRecoverable,
  isUserFacing,
  getUserMessage,
  ErrorBoundary,
  captureError,
  safeAsync,
  wrapWithErrorHandler,
} from "./error";
export type { ErrorCategory, ErrorBoundaryProps, ErrorBoundaryState } from "./error";
export {
  perfMark,
  perfMeasure,
  getPerfMeasures,
  clearPerfMarks,
  timeSync,
  createFpsCounter,
  getMemoryUsage,
  formatMemoryBytes,
  pollMemory,
  getResourceTimings,
  getPageLoadTiming,
  observeLongTasks,
  observeLayoutShifts,
  getFCP,
  observeLCP,
  getCoreWebVitals,
  reportCustomMetric,
} from "./perf";
export type {
  PerfMark,
  PerfMeasure as PerfMeasureType,
  FpsStats,
  MemoryInfo,
  ResourceTimingEntry,
} from "./perf";
export {
  validate,
  validateField,
  createValidator,
} from "./schema";
export type {
  SchemaType,
  SchemaRule,
  FieldSchema,
  ValidationResult,
} from "./schema";
export {
  mapValues,
  groupAndAggregate,
  pivot,
  unpivot,
  flattenObject,
  unflattenObject,
  deepMergeCustom,
} from "./transform";
export type { PivotOptions } from "./transform";
export {
  AsyncQueue,
  RateLimiter,
  BatchingQueue,
} from "./queue";
export type { QueueTask } from "./queue";
export {
  generateUuid,
  randomString as cryptoRandomString,
  hashString,
} from "./crypto";
export {
  base64Encode,
  base64Decode,
  safeEncode,
  safeDecode,
  unicodeEscape,
  unicodeUnescape,
  encodeQuery,
  xorCipher,
  xorDecipher,
  simpleHash,
  truncateMiddle as encTruncateMiddle,
} from "./encoding";
export {
  generateNonce,
  isBot,
  rateLimit,
  cleanupRateLimits,
  isAllowedOrigin,
  sanitizeFilename,
} from "./security";
export {
  getExtension as fileGetExtension,
  getBasename,
  getDirname,
  joinPath as fileJoinPath,
  normalizePath,
  isAbsolute as fileIsAbsolute,
  isUrlPath,
  relativePath,
} from "./file";
export {
  getImageDimensions,
  generateSrcSet,
  generateSizes,
  getAspectRatio,
  fitToContainer,
  generateBlurPlaceholder,
  isValidImageUrl,
  getDominantColor,
  fileToDataUrl,
  resizeImage,
} from "./image";
export {
  getBreakpoints,
  getCurrentBreakpoint,
  matchesMedia,
  watchMedia,
  isMinSm,
  isMinMd,
  isMinLg,
  isMinXl,
  isMaxXs,
  isMaxSm,
  isMaxMd,
  isMobile as mediaIsMobile,
  isTablet as mediaIsTablet,
  isDesktop as mediaIsDesktop,
  onBreakpointChange,
  isPrinting,
  onPrintStart,
  onPrintEnd,
  isDarkMode,
  isLightMode,
  onColorSchemeChange,
  getOrientation as mediaGetOrientation,
  onOrientationChange as mediaOnOrientationChange,
} from "./media";
export type {
  BreakpointName,
  Breakpoint,
  BreakpointConfig,
  MediaQueryOptions,
  MediaQueryInstance,
} from "./media";
export {
  createElement,
  div,
  span,
  btn,
  qs,
  qsa,
  closest,
  matchesAny,
  toggleClass,
  addClasses,
  removeClasses,
  replaceClass,
  hasClasses,
  getStyle,
  setStyles,
  show,
  hide,
  diffElements,
  setSafeHTML,
  sanitizeHTML,
  delegate,
  insertAfter,
  insertBefore,
  replaceEl,
  wrap,
  unwrap,
} from "./dom-helper";
export type { CreateElementOptions, DiffOperation } from "./dom-helper";
export {
  FormManager,
  MultiStepForm,
  uploadFile,
  required,
  minLength as formMinLength,
  maxLength as formMaxLength,
  email as formEmail,
  pattern as formPattern,
  minVal,
  maxVal,
  compose as composeValidators,
} from "./form-helper";
export type {
  FieldState,
  FormState,
  FormValidator,
  AutoSaveOptions,
  MultiStepFormOptions,
  UploadProgress,
  UploadOptions,
} from "./form-helper";
export {
  progressBarAttrs,
  switchAttrs,
  liveRegion,
  announce,
  skipLinkAttrs,
  SKIP_LINK_ID,
  prefersReducedMotion as a11yPrefersReducedMotion,
  animationDuration,
  focusTrap as a11yFocusTrap,
  srOnly,
  ROLES,
} from "./accessibility";
export {
  h,
  createTextVNode,
  Fragment,
  createComponentVNode,
  createElement as vdomCreateElement,
  applyProps,
  diff,
  patch as vdomPatch,
  mount,
  updateTree,
  unmount,
  renderWithErrorBoundary,
  memo,
  shallowEqual,
  createContext,
  readContext,
  subscribeToContext,
  createRenderer,
  beginFiberWork,
  enqueueUpdate,
  startBatch,
  endBatch,
} from "./virtual-dom";
export type {
  VNodeType,
  VNode,
  VNodeProps,
  ComponentFunction,
  ComponentInstance,
  Patch,
  PropsDiff,
  Context,
  MemoizedComponent,
  DevToolsHook,
  VDOMRendererOptions,
} from "./virtual-dom";
export { Priority, PatchType } from "./virtual-dom";
export {
  Scheduler,
  parseCronExpression,
  cronMatches,
  getNextCronRun,
} from "./scheduler";
export type { ScheduledJob, CronExpression } from "./scheduler";
export {
  addPoints,
  subPoints,
  scalePoint,
  distance,
  distanceSquared,
  midpoint,
  angleBetween,
  rotatePoint,
  rotatePointAround,
  lerpPoint,
  quadraticBezier,
  cubicBezier,
  rectFromCenter,
  rectToBox,
  boxToRect,
  rectCenter,
  rectArea,
  rectPerimeter,
  pointInRect,
  pointInBox,
  rectsIntersect,
  intersectionRect,
  unionRect,
  inflateRect,
  deflateRect,
  rectContains,
  circlesCollide,
  circleRectCollide,
  pointInCircle,
  linesIntersect,
  pageToViewport,
  viewportToPage,
  clientToPage,
  getElementViewportPosition,
  getElementPagePosition,
  transformPoint,
  polygonArea,
  pointInPolygon,
  boundingBox,
  getBoundingRect,
  clampPointToRect,
  normalizeAngle,
  degToRad,
  radToDeg,
} from "./coordinate";
export type { Point2D, Point3D, Size, Rect, Box, Circle, Line } from "./coordinate";
export {
  NetworkManager,
  createNetworkManager,
  readConnectionInfo,
  parseQueryString,
  buildQueryString,
  buildUrl,
  parseContentRange,
  fetchWithTimeout,
} from "./network";
export type {
  NetworkStatus,
  FetchOptions,
  FetchResult,
  QueuedRequest,
  NetworkManagerOptions,
  NetworkManagerInstance,
} from "./network";
export {
  StorageHelper,
  createStorageHelper,
  isLocalStorageAvailable,
  isSessionStorageAvailable,
  storageGet,
  storageSet,
  storageRemove,
  storageRemainingSpace,
  setCookie,
  getCookie,
  deleteCookie,
} from "./storage-helper";
export type {
  StorageOptions,
  StorageEntry,
  StorageStats,
  StorageMigration,
  CrossTabMessage,
  StorageManagerInstance,
} from "./storage-helper";
export {
  ClipboardAdvanced,
  createClipboardManager,
  copyToClipboard,
  readFromClipboard,
  copyHtmlToClipboard,
  stripHtml,
  readImageFromClipboard,
  blobToDataURL,
  clipboardHasImage,
} from "./clipboard-advanced";
export type {
  ClipboardCopyOptions,
  ClipboardPasteOptions,
  ClipboardData,
  ClipboardPermissionState,
  ClipboardHistoryEntry,
  ClipboardMonitorOptions,
  ClipboardMonitorInstance,
} from "./clipboard-advanced";
export {
  ThemeManager,
  getThemeManager,
  useTheme,
  LIGHT_THEME,
  DARK_THEME,
  BUILT_IN_THEMES,
} from "./theme";
export type { ThemeColors, ThemeConfig } from "./theme";
export {
  EventBus,
  createEventBus,
} from "./event-bus";
export type {
  EventCallback,
  EventMiddleware,
  Subscription,
  EmittedEvent,
  EventBusOptions,
} from "./event-bus";
export {
  GenerateDiffSchema,
  CreateFrictionSchema,
  CreatePRSchema,
  VoteSchema,
  validateBody,
} from "./validation";
export type {
  GenerateDiffInput,
  CreateFrictionInput,
  CreatePRInput,
  VoteInput,
} from "./validation";
export {
  t,
  getLocale,
  setLocale,
  LOCALE_CHANGE_EVENT,
} from "./i18n";
export type { Locale } from "./i18n";
export {
  Router,
  createRouter,
  getRouter,
} from "./router";
export type {
  RouteMode,
  RouteParams,
  QueryParams,
  RouteDefinition,
  RouterConfig,
  RouteInfo,
  NavigationResult,
} from "./router";
export {
  Cache,
  defaultCache,
  memoize,
} from "./cache";
export type { CacheOptions } from "./cache";
export {
  FSM,
  HSM,
  createMachine,
  interpret,
  match,
  stateEquals,
  evaluateChoice,
  evaluateJunction,
  deepHistoryTarget,
  shallowHistoryTarget,
} from "./state-machine";
export type {
  StateId,
  EventId,
  MachineContext,
  EventPayload,
  GuardFn,
  ActionFn,
  StateListener,
  TransitionDef,
  StateConfig,
  MachineConfig,
  ChoiceConfig,
  JunctionConfig,
  StateValue,
  TransitionHistoryEntry,
  Service,
  HistoryMode,
  InvalidEventStrategy,
} from "./state-machine";
export {
  Observable,
  Computed,
  ReactiveStore,
} from "./observable";
export type { Unsubscribe, SubscriberFn } from "./observable";
export {
  Debounced,
  Throttled,
  debounce,
  throttle,
  debouncePromise,
  rafThrottle,
  idleThrottle,
} from "./debounce-throttle";
export type {
  DebounceOptions,
  ThrottleOptions,
  RateLimitStats,
} from "./debounce-throttle";
export {
  injectStyle,
  removeStyle,
  updateStyle,
  setCssVar,
  getCssVar,
  setCssVars,
  getRootVar,
  setRootVar,
  getCurrentBreakpoint,
  isMinWidth,
  isMaxWidth,
  onBreakpointChange,
  isMobile,
  isTablet,
  isDesktop,
  getDevicePixelRatio,
  isRetina,
  mq,
  mediaQueries,
  matchesMedia,
  subscribeMedia,
  isDarkMode,
  isLightMode,
  toggleDarkMode,
  setDarkMode,
  onDarkModeChange,
  buildKeyframes,
  registerKeyframes,
  animations,
  animate,
  toggleClass,
  classIf,
  setClasses,
  hasAnyClass,
  bringToFront,
  sendToBack,
} from "./css-in-js";
export type { Breakpoints } from "./css-in-js";
export {
  createElement,
  div,
  span,
  button,
  input,
  anchor,
  img,
  p,
  ul,
  ol,
  li,
  form,
  select,
  textarea,
  table,
  domBuilder,
  fragment,
  replaceChildren,
  clearChildren,
  cloneElement,
  wrapElement,
  unwrapElement,
  insertAtIndex,
  getElementIndex,
} from "./dom-creator";
export type { CreateElementOptions, DomBuilder } from "./dom-creator";
export {
  parseHtml,
  serializeHtml,
  querySelector as htmlQuerySelector,
  querySelectorAll as htmlQuerySelectorAll,
  walkNodes,
  extractText,
  stripHtmlTags,
  sanitizeHtml,
  htmlToDom,
  decodeHtmlEntities,
  encodeHtmlEntities,
} from "./html-parser";
export type {
  HtmlNode,
  ParseOptions,
  QuerySelectorResult,
  SanitizeOptions,
} from "./html-parser";
export {
  createDropZone,
  readFileAsText,
  readFileAsDataURL,
  readFileAsArrayBuffer,
  getFileInfo,
  createSortableList,
} from "./drag-drop";
export type {
  DragItem,
  DropZoneConfig,
  DndState,
  DropZoneController,
  FileInfo,
  SortableItem,
  SortableConfig,
  SortableController,
} from "./drag-drop";
export {
  makeResizable,
  createSplitPane,
} from "./resizable";
export type {
  ResizeOptions,
  ResizeState,
  ResizableController,
  SplitPaneOptions,
  SplitPaneController,
} from "./resizable";
export {
  SelectionManager,
  createSelectionManager,
} from "./selection";
export type {
  SelectionRange,
  CaretPosition,
  SelectionManagerOptions,
  SelectionManagerInstance,
} from "./selection";
export {
  VirtualScroller,
} from "./virtual-scroller";
export type {
  ScrollItem,
  VisibleRange,
  ScrollerConfig,
  ScrollerState,
  ScrollToOptions,
} from "./virtual-scroller";
export {
  InfiniteScroll,
} from "./infinite-scroll";
export type {
  InfiniteScrollItem,
  InfiniteScrollOptions,
  InfiniteScrollState,
} from "./infinite-scroll";
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";
export {
  createModal,
} from "./modal";
export type {
  ModalSize,
  ModalPosition,
  ModalOptions,
  ModalInstance,
} from "./modal";
export {
  NotificationManager,
  getNotificationManager,
  toast,
} from "./notification";
export type {
  NotificationType,
  Notification,
  NotificationOptions,
  NotificationPosition,
} from "./notification";
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";
export {
  HotkeyManager,
  createAppHotkeys,
  parseKeyCombo,
  eventMatchesCombo,
  formatKeyDisplay,
  areModifiersDown,
  getModifierString,
} from "./hotkeys";
export type {
  HotkeyBinding,
  HotkeyEvent,
  ParsedKeyCombo,
} from "./hotkeys";
export {
  FormValidator,
  required,
  minLength,
  maxLength,
  pattern,
  email,
  urlValidator,
  range,
  matchesField,
  asyncValidator,
  custom,
} from "./form-validator";
export type {
  FieldValidationResult,
  FormValidationResult,
  ValidatorFn,
  FieldConfig,
  FormValidatorOptions,
} from "./form-validator";
export {
  createTableState,
  getSortedData,
  getFilteredData,
  getPaginatedData,
  getCellValue,
  applyFilterOperator,
  toggleSort,
  setSearchTerm,
  toggleFilter,
  goToPage,
  setPageSize,
  toggleRowSelection,
  toggleSelectAll,
  toggleRowExpand,
  resetTable,
  exportTableAsCsv,
} from "./table";
export type {
  Column,
  TableState,
  SortState,
  FilterState,
  FilterOperator,
  PaginationState,
  SelectionState,
} from "./table";
export {
  createProgressTracker,
  createMultiProgressTracker,
  formatProgress,
  createStepProgress,
} from "./progress";
export type {
  ProgressState,
  ProgressCallback,
  ProgressController,
  MultiProgressController,
  StepProgressController,
} from "./progress";
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
} from "./avatar";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";
export {
  ChartManager,
  createChart,
} from "./chart";
export type {
  ChartType,
  ChartDataPoint,
  ChartDataset,
  ChartOptions,
  ChartInstance,
} from "./chart";
export {
  hexToRgb,
  rgbToHex,
  hslToRgb,
  rgbToHsl,
  hexToHsl,
  hslToHex,
  parseColor,
  lighten,
  darken,
  saturate,
  desaturate,
  mix,
  invert,
  opacity,
  getLuminance,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  contrastingText,
  minAlphaForContrast,
  generatePalette,
  complementaryColor,
  analogousColors,
  triadicColors,
  splitComplementaryColors,
  tetradicColors,
  buildLinearGradient,
  buildRadialGradient,
  getColorTemperature,
  hueCategory,
  generateCSSVariables,
  getNamedColor,
} from "./color-utils";
export type {
  RGB,
  HSL,
  HSV,
  ColorTemperature,
  HueCategory,
  GradientStop,
  LinearGradientOptions,
  RadialGradientOptions,
  PaletteOptions,
  ColorScheme,
} from "./color-utils";
export {
  computeStats,
  percentile,
  zScore,
  normalize,
  scaleToRange,
  linearRegression,
  pearsonCorrelation,
  interpolate,
  easings,
  getEasing,
  createMatrix,
  identityMatrix,
  matAdd,
  matMul,
  matScale,
  matTranspose,
  matDeterminant,
  matInverse,
  matToString,
  distance2D,
  distance3D,
  angleBetween,
  midpoint,
  pointInRect,
  pointInCircle,
  lineCircleIntersection,
  rectsOverlap,
  rectUnion,
  rectIntersection,
  convexHull,
  polygonArea,
  polygonCentroid,
  gcd,
  lcm,
  primeFactors,
  isPrime,
  modPow,
  sieveOfEratosthenes,
  fibonacci,
  factorial,
  combinations,
  permutations,
  SeededRNG,
  randomFromDistribution,
  convertLength,
  convertWeight,
  convertTemperature,
  formatDataSize,
  degToRad,
  radToDeg,
  clamp,
  mapRange,
  roundTo,
  roundToStep,
  approxEqual,
  lerp,
  invLerp,
  smoothStep,
  smootherStep,
  sum,
  product,
  mean,
  geometricMean,
  harmonicMean,
  rms,
  movingAverage,
  ema,
  lengthUnits,
  weightUnits,
  dataUnits,
} from "./math-advanced";
export type {
  StatisticsResult,
  RegressionResult,
  Matrix,
  Point2D,
  Point3D,
  Rect,
  Circle,
  InterpolationMethod,
  EasingFunction,
  DistributionType,
  DistributionOptions,
} from "./math-advanced";
export {
  createAudioPlayer,
  createAudioRecorder,
  createAudioAnalyzer,
  playBeep,
  playMelody,
} from "./audio";
export type {
  AudioPlayerOptions,
  AudioRecorderOptions,
  AudioVisualizerType,
  AudioEffect,
  AudioAnalyzerNode,
  AudioPlayerInstance,
  AudioRecorderInstance,
} from "./audio";
export {
  createVideoPlayer,
  supportsVideoCodec,
  getOptimalResolution,
  formatVideoDuration,
  estimateBandwidth,
} from "./video";
export type {
  VideoPlayerOptions,
  VideoQuality,
  VideoAspectRatio,
  VideoPlayerInstance,
} from "./video";
export {
  createDrawing,
} from "./canvas-drawing";
export type {
  ToolType,
  StrokeCap,
  StrokeJoin,
  Point as DrawingPoint,
  Stroke,
  DrawingLayer,
  DrawingOptions,
  DrawingInstance,
} from "./canvas-drawing";
export {
  mdToHtml,
  stripMd,
} from "./markdown";
export type {
  MdOptions,
} from "./markdown";
export {
  createRichTextEditor,
  sanitizeHTML,
  stripHTML,
  extractStructuredText,
} from "./richtext";
export type {
  RichTextOptions,
  RichTextInstance,
  BlockType,
  TextAlign,
} from "./richtext";
export {
  createPDFViewer,
  generateSimplePDF,
  createPrintableView,
} from "./pdf-viewer";
export type {
  PDFViewerOptions,
  PDFViewerInstance,
  FitMode,
  ZoomMode,
  ScrollMode,
} from "./pdf-viewer";
export {
  TreeView,
} from "./tree-view";
export type {
  TreeNodeData,
  TreeNode,
  CheckMode,
  TreeViewConfig,
} from "./tree-view";
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabItem,
  TabsOptions,
  TabsInstance,
  TabOrientation,
  TabVariant,
} from "./tabs";
export {
  AccordionManager,
  createAccordion,
} from "./accordion";
export type {
  AccordionItem,
  AccordionOptions,
  AccordionInstance,
  AccordionMode,
} from "./accordion";
export {
  CarouselManager,
  createCarousel,
} from "./carousel";
export type {
  CarouselSlide,
  CarouselOptions,
  CarouselInstance,
} from "./carousel";
export {
  BreadcrumbManager,
  createBreadcrumb,
} from "./breadcrumb";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb";
export {
  createPaginationNav,
  formatPaginationInfo,
  getOptimalPageSize,
} from "./pagination-nav";
export type {
  PaginationNavOptions,
  PaginationNavInstance,
  PaginationSize,
  PaginationVariant,
} from "./pagination-nav";
export {
  TimelineManager,
  createTimeline,
} from "./timeline";
export type {
  TimelineItem,
  TimelineOptions,
  TimelineInstance,
  TimelineItemStatus,
} from "./timeline";
export {
  StepperManager,
  createStepper,
} from "./stepper";
export type {
  StepConfig,
  StepperOptions,
  StepperInstance,
  StepStatus,
} from "./stepper";
export {
  RatingManager,
  createRating,
} from "./rating";
export type {
  RatingOptions,
  RatingInstance,
  StarIconType,
} from "./rating";
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeOptions,
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  StatusDotOptions,
} from "./badge";
export {
  TagManager,
  createTag,
  createTagGroup,
} from "./tag";
export type {
  TagOptions,
  TagInstance,
  TagVariant,
  TagSize,
  TagShape,
  TagGroupOptions,
  TagGroupInstance,
} from "./tag";
export {
  AvatarGroupManager,
  createAvatarGroup,
} from "./avatar-group";
export type {
  AvatarItem,
  AvatarGroupOptions,
  AvatarGroupInstance,
  StackDirection,
} from "./avatar-group";
export {
  createSkeleton,
} from "./skeleton-loader";
export type {
  SkeletonOptions,
  SkeletonInstance,
  SkeletonShape,
  SkeletonAnimation,
  SkeletonItem,
} from "./skeleton-loader";
export {
  EmptyStateManager,
  createEmptyState,
} from "./empty-state";
export type {
  EmptyStateOptions,
  EmptyStateInstance,
  EmptyStateVariant,
} from "./empty-state";
export {
  createBackdrop,
  closeAllBackdrops,
  getActiveBackdropCount,
  showLoadingOverlay,
  showConfirmDialog,
} from "./backdrop";
export type {
  BackdropOptions,
  BackdropInstance,
  BackdropVariant,
  BackdropAnimation,
} from "./backdrop";
export {
  createToastManager,
} from "./toast-notification";
export type {
  ToastOptions,
  ToastManagerOptions,
  ToastInstance,
  ToastType,
  ToastPosition,
} from "./toast-notification";
export {
  AlertManager,
  createAlert,
} from "./alert";
export type {
  AlertOptions,
  AlertInstance,
  AlertVariant,
  AlertSize,
  AlertAction,
} from "./alert";
export {
  createProgressBar,
  createCircleProgress,
} from "./progress-bar";
export type {
  ProgressBarOptions,
  CircleProgressOptions,
  ProgressVariant,
  ProgressSize,
} from "./progress-bar";
export {
  createDivider,
  hDivider,
  vDivider,
  labeledDivider,
  sectionDivider,
} from "./divider";
export type {
  DividerOptions,
  DividerOrientation,
  DividerStyle,
} from "./divider";
export {
  createSwitch,
} from "./switch";
export type {
  SwitchOptions,
  SwitchInstance,
  SwitchSize,
  SwitchVariant,
} from "./switch";
export {
  createTooltip,
  attachTooltip,
  attachClickTooltip,
  attachHtmlTooltip,
} from "./tooltip-lite";
export type {
  TooltipOptions,
  TooltipInstance,
  TooltipPlacement,
  TooltipTrigger,
} from "./tooltip-lite";
export {
  PopoverManager,
  createPopover,
} from "./popover";
export type {
  PopoverOptions,
  PopoverInstance,
  PopoverTrigger,
  PopoverPlacement,
} from "./popover";
export {
  createDropdown,
} from "./dropdown";
export type {
  DropdownOptions,
  DropdownInstance,
  DropdownItem,
  DropdownSeparator,
  DropdownGroup,
  DropdownEntry,
  DropdownPlacement,
} from "./dropdown";
export {
  createContextMenu,
  attachContextMenu,
} from "./context-menu-lite";
export type {
  ContextMenuOptions,
  ContextMenuInstance,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuGroup,
  ContextMenuEntry,
  ContextMenuPlacement,
} from "./context-menu-lite";
export {
  createCombobox,
} from "./combobox";
export type {
  ComboboxOptions,
  ComboboxInstance,
  ComboboxOption,
} from "./combobox";
export {
  createSelect,
} from "./select-lite";
export type {
  SelectOptions,
  SelectInstance,
  SelectOption,
  SelectSize,
  SelectVariant,
} from "./select-lite";
export {
  AutocompleteManager,
  createAutocomplete,
} from "./autocomplete";
export type {
  AutocompleteOptions,
  AutocompleteInstance,
  AutocompleteOption,
} from "./autocomplete";
export {
  CommandPalette,
} from "./command-palette";
export type {
  CommandPaletteConfig,
  CommandPaletteState,
  Command,
} from "./command-palette";
export {
  createDialog,
  alert as dlgAlert,
  confirm as dlgConfirm,
} from "./dialog-lite";
export type {
  DialogOptions,
  DialogInstance,
  DialogType,
  DialogSize,
} from "./dialog-lite";
export {
  createModal,
} from "./modal";
export type {
  ModalOptions,
  ModalInstance,
  ModalSize,
  ModalPosition,
} from "./modal";
export {
  createToast,
  showToast,
  toastSuccess,
  toastError,
  toastWarning,
  toastInfo,
  toastLoading,
} from "./toast-lite";
export type {
  ToastOptions,
  ToastInstance,
  ToastType,
  ToastPosition,
} from "./toast-lite";
export {
  NotificationManager,
  getNotificationManager,
  toast as notificationToast,
} from "./notification";
export type {
  NotificationOptions,
  Notification,
  NotificationType as NotificationNotifType,
  NotificationPosition,
} from "./notification";
export {
  createSnackbar,
  showSnackbar,
  snackbarSuccess,
  snackbarError,
  snackbarWarning,
} from "./snackbar";
export type {
  SnackbarOptions,
  SnackbarInstance,
  SnackbarSeverity,
} from "./snackbar";
export {
  createDrawer,
} from "./drawer";
export type {
  DrawerOptions,
  DrawerInstance,
  DrawerSide,
  DrawerSize,
} from "./drawer";
export {
  createSplitter,
} from "./sheet";
export type {
  SplitterOptions,
  SplitterInstance,
  SplitterPaneOptions,
  SplitterOrientation,
} from "./sheet";
export {
  createOffcanvas,
  bindOffcanvas,
} from "./offcanvas";
export type {
  OffcanvasOptions,
  OffcanvasInstance,
  OffcanvasSide,
  OffcanvasMode,
} from "./offcanvas";
export {
  CarouselManager,
  createCarousel,
} from "./carousel";
export type {
  CarouselOptions,
  CarouselInstance,
  CarouselSlide,
} from "./carousel";
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabsOptions,
  TabsInstance,
  TabItem,
  TabOrientation,
  TabVariant,
} from "./tabs";
export {
  AccordionManager,
  createAccordion,
} from "./accordion";
export type {
  AccordionOptions,
  AccordionInstance,
  AccordionItem,
  AccordionMode,
} from "./accordion";
export {
  StepsManager,
  createSteps,
} from "./steps";
export type {
  StepsOptions,
  StepsInstance,
  StepItem,
  StepStatus,
  StepsOrientation,
  StepsVariant,
} from "./steps";
export {
  BreadcrumbManager,
  createBreadcrumb,
} from "./breadcrumb";
export type {
  BreadcrumbOptions,
  BreadcrumbInstance,
  BreadcrumbItem,
} from "./breadcrumb";
export {
  PaginationManager,
  createPagination,
} from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
} from "./avatar";
export type {
  AvatarOptions,
  AvatarGroupOptions,
  AvatarSize,
  AvatarShape,
} from "./avatar";
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeOptions,
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  StatusDotOptions,
} from "./badge";
export {
  createChip,
  createChipGroup,
} from "./chip";
export type {
  ChipOptions,
  ChipInstance,
  ChipGroupOptions,
  ChipGroupInstance,
  ChipSize,
  ChipVariant,
} from "./chip";
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";
export {
  createSpinner,
  miniSpinner,
  fullPageSpinner,
} from "./spinner";
export type {
  SpinnerOptions,
  SpinnerVariant,
  SpinnerSize,
} from "./spinner";
export {
  EmptyStateManager,
  createEmptyState,
} from "./empty-state";
export type {
  EmptyStateOptions,
  EmptyStateInstance,
  EmptyStateVariant,
} from "./empty-state";
export {
  CollapseManager,
  createCollapse,
  createCollapseGroup,
} from "./collapse";
export type {
  CollapseOptions,
  CollapseInstance,
  CollapseSize,
  CollapseVariant,
  CollapseGroupOptions,
  CollapseGroupInstance,
} from "./collapse";
export {
  TimelineManager,
  createTimeline,
} from "./timeline";
export type {
  TimelineOptions,
  TimelineInstance,
  TimelineItem,
  TimelineItemStatus,
} from "./timeline";
export {
  createList,
} from "./list";
export type {
  ListOptions,
  ListInstance,
  ListItem,
  ListSelectionMode,
  ListVariant,
} from "./list";
export {
  TreeView,
} from "./tree-view";
export type {
  TreeViewConfig,
  TreeNodeData,
  TreeNode,
  CheckMode,
} from "./tree-view";
export {
  createTable,
} from "./table-lite";
export type {
  TableOptions,
  TableInstance,
  TableColumn,
  TableRow,
  TableSortDirection,
  TableVariant,
  TableSize,
} from "./table-lite";
export {
  createCard,
} from "./card";
export type {
  CardOptions,
  CardInstance,
  CardVariant,
  CardSize,
  CardHeaderOptions,
  CardImageOptions,
} from "./card";
export {
  createForm,
} from "./form";
export type {
  FormOptions,
  FormInstance,
  FormField,
  FormGroup,
  FieldType,
  ValidationRule,
} from "./form";
export {
  createInputGroup,
} from "./input-group";
export type {
  InputGroupOptions,
  InputGroupInstance,
  InputSize,
  InputVariant,
  ValidationState,
} from "./input-group";
export {
  createTooltip,
  attachTooltip,
  attachClickTooltip,
  attachHtmlTooltip,
} from "./tooltip-lite";
export type {
  TooltipOptions,
  TooltipInstance,
  TooltipPlacement,
  TooltipTrigger,
} from "./tooltip-lite";
export {
  createSwitch,
} from "./switch";
export type {
  SwitchOptions,
  SwitchInstance,
  SwitchSize,
  SwitchVariant,
} from "./switch";
export {
  createRadioGroup,
} from "./radio-group";
export type {
  RadioGroupOptions,
  RadioGroupInstance,
  RadioOption,
  RadioSize,
  RadioVariant,
} from "./radio-group";
export {
  createCheckboxGroup,
} from "./checkbox-group";
export type {
  CheckboxGroupOptions,
  CheckboxGroupInstance,
  CheckboxOption,
  CheckboxSize,
  CheckboxVariant,
} from "./checkbox-group";
export {
  SliderManager,
  createSlider,
} from "./slider";
export type {
  SliderOptions,
  SliderInstance,
  SliderMark,
} from "./slider";
export {
  createProgressTracker,
  createMultiProgressTracker,
  createStepProgress,
  formatProgress,
} from "./progress";
export type {
  ProgressState,
  ProgressCallback,
  ProgressController,
  MultiProgressController,
  StepProgressController,
} from "./progress";
export {
  RatingManager,
  createRating,
} from "./rating";
export type {
  RatingOptions,
  RatingInstance,
  StarIconType,
} from "./rating";
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type {
  RgbColor,
  HslColor,
  Palette,
} from "./color-picker";
export {
  DatePickerManager,
  createDatePicker,
} from "./date-picker";
export type {
  DatePickerOptions,
  DatePickerInstance,
} from "./date-picker";
export {
  createTimePicker,
} from "./time-picker";
export type {
  TimePickerOptions,
  TimePickerInstance,
  TimeFormat,
  TimePickerMode,
} from "./time-picker";
export {
  createUpload,
} from "./upload";
export type {
  UploadOptions,
  UploadInstance,
  UploadFile,
  UploadStatus,
} from "./upload";
export {
  DropzoneManager,
  createDropzone,
} from "./dropzone";
export type {
  DropzoneOptions,
  DropzoneInstance,
  DropzoneFile,
  FileValidationRule,
  FileValidationError,
} from "./dropzone";
export {
  FilePreviewManager,
  createFilePreview,
} from "./file-preview";
export type {
  FilePreviewOptions,
  FilePreviewInstance,
  FileType,
} from "./file-preview";
export {
  createModal,
} from "./modal";
export type {
  ModalOptions,
  ModalInstance,
  ModalSize,
  ModalPosition,
} from "./modal";
export {
  AlertManager,
  createAlert,
} from "./alert";
export type {
  AlertOptions,
  AlertInstance,
  AlertVariant,
  AlertSize,
  AlertAction,
} from "./alert";
export {
  createConfirmDialog,
} from "./confirm-dialog";
export type {
  ConfirmDialogOptions,
  ConfirmDialogInstance,
  ConfirmDialogVariant,
  ConfirmButtonVariant,
  ConfirmButton,
} from "./confirm-dialog";
export {
  NotificationManager,
  getNotificationManager,
  toast,
} from "./notification";
export type {
  NotificationOptions,
  NotificationType,
  NotificationPosition,
  Notification,
} from "./notification";
export {
  createDotBadge,
  createCountBadge,
  createStatusDot,
  addPositionedBadge,
  addDotBadge,
  addCountBadge,
} from "./badge-lite";
export type {
  DotBadgeOptions,
  CountBadgeOptions,
  StatusDotOptions,
  PositionedBadgeOptions,
  BadgeVariant,
  BadgeSize,
} from "./badge-lite";
export {
  AvatarGroupManager,
  createAvatarGroup,
} from "./avatar-group";
export type {
  AvatarGroupOptions,
  AvatarGroupInstance,
  AvatarItem,
  AvatarSize,
  StackDirection,
} from "./avatar-group";
export {
  createChip,
  createChipGroup,
  shadeColor,
} from "./chip-lite";
export type {
  ChipOptions,
  ChipInstance,
  ChipGroupOptions,
  ChipGroupInstance,
  ChipVariant,
  ChipSize,
} from "./chip-lite";
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton-lite";
export type {
  SkeletonOptions,
  TextSkeletonOptions,
  CardSkeletonOptions,
  TableSkeletonOptions,
  SkeletonVariant,
  SkeletonSize,
} from "./skeleton-lite";
export {
  createSpinner,
  fullPageSpinner,
  miniSpinner,
} from "./spinner-lite";
export type {
  SpinnerOptions,
  FullPageSpinnerOptions,
  SpinnerVariant,
  SpinnerSize,
} from "./spinner-lite";
export {
  createEmptyState,
} from "./empty-state-lite";
export type {
  EmptyStateOptions,
  EmptyStateInstance,
  EmptyStateVariant,
} from "./empty-state-lite";
export {
  createCollapse,
  createCollapseGroup,
} from "./collapse-lite";
export type {
  CollapseOptions,
  CollapseInstance,
  CollapseGroupOptions,
  CollapseGroupInstance,
  CollapseVariant,
  CollapseSize,
} from "./collapse-lite";
export {
  createTimeline,
} from "./timeline-lite";
export type {
  TimelineOptions,
  TimelineInstance,
  TimelineItem,
  TimelineLayout,
  TimelineItemStatus,
} from "./timeline-lite";
export {
  createSteps,
} from "./steps-lite";
export type {
  StepsOptions,
  StepsInstance,
  StepItem,
  StepsVariant,
  StepStatus,
  StepsDirection,
} from "./steps-lite";
export {
  createBreadcrumb,
} from "./breadcrumb-lite";
export type {
  BreadcrumbOptions,
  BreadcrumbInstance,
  BreadcrumbItemData,
  BreadcrumbSize,
} from "./breadcrumb-lite";
export {
  createPagination,
} from "./pagination-lite";
export type {
  PaginationOptions,
  PaginationInstance,
  PaginationSize,
} from "./pagination-lite";
export {
  createSplitButton,
} from "./splitter";
export type {
  SplitButtonOptions,
  SplitButtonInstance,
  SplitButtonItem,
  SplitButtonSize,
  SplitButtonVariant,
} from "./splitter";
export {
  createTabs,
} from "./tabs-lite";
export type {
  TabsOptions,
  TabsInstance,
  TabItem,
  TabsVariant,
  TabsDirection,
} from "./tabs-lite";
export {
  createAccordion,
} from "./accordion-lite";
export type {
  AccordionOptions,
  AccordionInstance,
  AccordionItem,
  AccordionVariant,
  AccordionSize,
} from "./accordion-lite";
export {
  createCarousel,
} from "./carousel-lite";
export type {
  CarouselOptions,
  CarouselInstance,
  CarouselSlide,
  CarouselTransition,
  CarouselAlign,
} from "./carousel-lite";
export {
  CommandPalette,
} from "./command-palette";
export type {
  Command,
  CommandPaletteConfig,
  CommandPaletteState,
  CommandCategory,
} from "./command-palette";
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuOptions,
  ContextMenuInstance,
  ContextMenuPosition,
} from "./context-menu";
export {
  TourManager,
  createTour,
} from "./tour-guide";
export type {
  TourStep,
  TourOptions,
  TourInstance,
} from "./tour-guide";
export {
  createToast,
  showToast,
  toastSuccess,
  toastError,
  toastWarning,
  toastInfo,
  toastLoading,
} from "./toast-lite";
export type {
  ToastOptions,
  ToastInstance,
  ToastType,
  ToastPosition,
} from "./toast-lite";
export {
  createDrawer,
} from "./drawer-lite";
export type {
  DrawerOptions,
  DrawerInstance,
  DrawerPlacement,
  DrawerSize,
} from "./drawer-lite";
export {
  createPopover,
} from "./popover-lite";
export type {
  PopoverOptions,
  PopoverInstance,
  PopoverPlacement,
  PopoverTrigger,
} from "./popover-lite";
export {
  DropdownMenuManager,
  createDropdownMenu,
} from "./dropdown-menu";
export type {
  MenuItem,
  MenuItemType,
  DropdownMenuOptions,
  DropdownMenuInstance,
} from "./dropdown-menu";
export {
  createSelect,
} from "./select-lite";
export type {
  SelectOption,
  SelectOptions,
  SelectInstance,
  SelectSize,
  SelectVariant,
} from "./select-lite";
export {
  createAffix,
} from "./affix";
export type {
  AffixOptions,
  AffixInstance,
} from "./affix";
export {
  createBackTop,
} from "./back-top";
export type {
  BackTopOptions,
  BackTopInstance,
  BackTopShape,
  BackTopPosition,
} from "./back-top";
export {
  createConfigProvider,
  getConfig,
  getToken,
} from "./config-provider";
export type {
  ConfigProviderOptions,
  ConfigProviderInstance,
  DesignTokens,
  ComponentOverrides,
  ConfigSnapshot,
  Direction,
  ThemeMode,
} from "./config-provider";
export {
  createList,
} from "./list-lite";
export type {
  ListOptions,
  ListInstance,
  ListItemData,
  ListSelectionMode,
  ListItemStatus,
} from "./list-lite";
export {
  createVirtualList,
} from "./virtual-list";
export type {
  VirtualListItem,
  VirtualListOptions,
  VirtualListInstance,
} from "./virtual-list";
export {
  TreeSelectManager,
  createTreeSelect,
} from "./tree-select";
export type {
  TreeNodeData,
  TreeSelectOptions,
  TreeSelectInstance,
} from "./tree-select";
export {
  TokenBucketRateLimiter,
  SlidingWindowLogRateLimiter,
  SlidingWindowCounterRateLimiter,
  FixedWindowRateLimiter,
  LeakyBucketRateLimiter,
  AdaptiveRateLimiter,
  CircuitBreaker,
  Bulkhead,
  RequestCoalescer,
  PriorityQueue,
  DistributedRateLimiter,
  StatsCollector,
  createRateLimiter,
} from "./rate-limiter";
export type {
  RateLimitResult,
  BaseRateLimitConfig,
  RateLimiterStats,
  CircuitState,
  AdaptiveLimitResult,
  AdaptiveLimiterOptions,
  CircuitBreakerConfig,
  CircuitBreakerResult,
  BulkheadConfig,
  BulkheadResult,
  Priority,
  PriorityQueueOptions,
  DistributedRateLimiterConfig,
  RateLimitStore,
  StatsTrackable,
} from "./rate-limiter";
export {
  Debounced,
  Throttled,
  debounce,
  throttle,
  debouncePromise,
  rafThrottle,
  idleThrottle,
} from "./debounce-throttle";
export type {
  DebounceOptions,
  ThrottleOptions,
} from "./debounce-throttle";
export {
  EventBus,
  createEventBus,
} from "./event-bus";
export type {
  EventCallback,
  EventMiddleware,
  Subscription,
  EmittedEvent,
  EventBusOptions,
} from "./event-bus";
export {
  Observable,
  Computed,
  ReactiveStore,
} from "./observable";
export {
  createStore as createStateManager,
  combineStores,
} from "./state-manager";
export type {
  StoreOptions as StateManagerOptions,
  StoreInstance as StateManagerInstance,
  ComputedValue,
} from "./state-manager";
export {
  Store as StateStore,
  createStateStore,
  createComputed,
  persistMiddleware,
  connectDevTools,
  registerStore,
  getStore,
  unregisterStore,
} from "./store";
export type {
  StoreApi,
  PersistOptions,
} from "./store";
export {
  t,
  getLocale,
  setLocale,
} from "./i18n";
export type {
  Locale,
} from "./i18n";
export {
  ThemeManager,
  getThemeManager,
  LIGHT_THEME,
  DARK_THEME,
  BUILT_IN_THEMES,
  useTheme,
} from "./theme";
export type {
  ThemeColors,
  ThemeConfig,
} from "./theme";
export {
  injectStyle,
  removeStyle,
  updateStyle,
  setCssVar,
  getCssVar,
  setCssVars,
  getRootVar,
  setRootVar,
  getCurrentBreakpoint,
  isMinWidth,
  isMaxWidth,
  onBreakpointChange,
  isMobile,
  isTablet,
  isDesktop,
  isRetina,
  matchesMedia,
  subscribeMedia,
  isDarkMode,
  toggleDarkMode,
  setDarkMode,
  onDarkModeChange,
  buildKeyframes,
  registerKeyframes,
  animations,
  animate,
  toggleClass,
  classIf,
  setClasses,
  hasAnyClass,
  bringToFront,
  sendToBack,
} from "./css-in-js";
export type {
  Breakpoints,
} from "./css-in-js";
export {
  EASING,
  animateValue,
  springAnimate,
  cssKeyframes,
  KEYFRAMES,
  DURATION,
  transition,
} from "./animation";
export type {
  EasingName,
  SpringConfig as AnimationSpringConfig,
} from "./animation";
export {
  createTransition,
  createTransitionGroup,
} from "./transition";
export type {
  TransitionOptions,
  TransitionInstance,
  TransitionMode,
  TransitionGroupOptions,
  TransitionGroupInstance,
} from "./transition";
export {
  MotionValueImpl,
  motionValue,
  Spring as MotionSpring,
  createSpring,
  inertia,
  lerp,
  interpolate,
  clamp,
  mapRange,
} from "./motion";
export type {
  SpringConfig as MotionSpringConfig,
  SpringState,
  MotionValue,
  MotionTransitionOptions,
  InertiaOptions,
} from "./motion";
export {
  validate,
  validateSync,
  assert,
  throwIfInvalid,
  isString,
  isNumber,
  isInteger,
  isFiniteNumber,
  isBoolean,
  isArray,
  isObject,
  isDate,
  isEmail,
  isUrl,
  isNil,
  isPresent,
  ValidationError,
} from "./validator";
export type {
  ValidationError as ValidatorError,
  ValidationResult,
  ValidationRule,
  ValidationSchema,
} from "./validator";
export {
  formatNumber,
  formatCompact,
  formatCurrency,
  formatDate,
  formatRelative,
  formatDuration,
  capitalize,
  titleCase,
  kebabCase,
  snakeCase,
  camelCase,
  truncate,
  pad,
  pluralize,
  maskString,
  formatBytes,
  formatPercent,
  formatPhone,
  formatId,
  formatTemplate,
  formatList,
} from "./formatter";
export type {
  NumberFormatOptions,
  CurrencyFormatOptions,
  DateFormatOptions,
  ByteFormatOptions,
  PercentFormatOptions,
} from "./formatter";
export {
  runPipeline,
  createTask,
  series,
  parallel,
  race,
} from "./async-pipeline";
export type {
  PipelineTask,
  PipelineResult,
  PipelineReport,
  PipelineMode,
  PipelineOptions,
} from "./async-pipeline";
export {
  sha1,
  sha256,
  sha384,
  sha512,
  hash,
  hashHex,
  hmac,
  hmacHex,
  pbkdf2,
  deriveAesKey,
  generateAesKey,
  aesGcmEncrypt,
  aesGcmDecrypt,
  aesGcmEncryptString,
  aesGcmDecryptString,
  generateRsaOaepKeyPair,
  rsaOaepEncrypt,
  rsaOaepDecrypt,
  generateEcdsaKeyPair,
  ecdsaSign,
  ecdsaVerify,
  generateRsaPssKeyPair,
  rsaPssSign,
  rsaPssVerify,
  exportKey as cryptoExportKey,
  importKey as cryptoImportKey,
  keyFingerprint,
  generateEcdhKeyPair,
  ecdhDeriveSecret,
  ecdhDeriveAesKey,
  randomBytes,
  secureRandomInt,
  secureRandomUuid,
  secureRandomString,
  toBase64,
  fromBase64,
  toBase64Url,
  fromBase64Url,
  toHex,
  fromHex,
  encodeUtf8,
  decodeUtf8,
  estimatePasswordStrength,
  generatePassword,
  generateTokenHex,
  generateTokenBase64Url,
  generateApiKey,
  generateSessionId,
} from "./crypto-utils";
export type {
  HashAlgorithm,
  HmacAlgorithm,
  AesKeyLength,
  EcNamedCurve,
  RsaKeySize,
  KeyFormat,
  Pbkdf2Options,
  AesGcmOptions,
  RsaKeyGenOptions,
  EcdsaKeyGenOptions,
  RsaPssSignOptions,
  PasswordStrengthResult,
  PasswordGeneratorOptions,
  ApiKeyOptions,
  AesGcmEncryptedData,
} from "./crypto-utils";
export {
  $,
  $$,
  byId,
  byTag,
  byClass,
  closest,
  matches,
  text,
  html,
  createElement,
  createFragment,
  div,
  span,
  button,
  input,
  createSvgElement,
  insertAfter,
  insertBefore,
  replaceElement,
  removeElement,
  clearChildren,
  wrapElement,
  unwrapElement,
  moveTo,
  cloneDeep,
  swapElements,
  addClass,
  removeClass,
  toggleClass,
  hasClass,
  replaceClass,
  setStyles,
  getStyle,
  show,
  hide,
  toggleVisibility,
  isVisible,
  getRect,
  getCenter,
  getOffset,
  containsPoint,
  contains,
  distanceBetween,
  positionRelative,
  scrollToElement,
  scrollContainerTo,
  scrollToBottom,
  scrollToTop,
  isScrolledBottom,
  isScrolledTop,
  getScrollProgress,
  disableBodyScroll,
  isInViewport,
  getVisibilityRatio,
  observeViewport,
  observeFullyVisible,
  delegate,
  delegateOnce,
  raf,
  nextFrame,
  afterFrames,
  rafThrottle,
  rafDebounce,
  trapFocus,
  focusElement,
  isFocused,
  saveFocus,
  getSelectionText,
  selectAll,
  clearSelection,
  copyToClipboard,
  readFromClipboard,
  serializeForm,
  populateForm,
  resetForm,
  domReady,
  waitForElement,
  measureText,
  isInIframe,
  getViewportSize,
  getDevicePixelRatio,
} from "./dom-helpers";
export {
  storageGet,
  storageSet,
  storageRemove,
  storageKeys,
  storageClear,
} from "./storage";
export {
  Logger,
  log,
  apiLog,
  dbLog,
  extLog,
  setGlobalLogLevel,
  getGlobalLogLevel,
} from "./logger";
export type {
  LogLevel,
} from "./logger";
export {
  parseColor,
  toRgb,
  toHsl,
  toHsv,
  toHex,
  toCss,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToRgb,
  hslToHex,
  hexToHsl,
  lighten,
  darken,
  saturate,
  desaturate,
  rotateHue,
  setOpacity,
  mix,
  lerpColor,
  invert,
  grayscale,
  complement,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  luminance,
  contrastRatio,
  passesWCAGAA,
  passesWCAGAAA,
  getContrastColor,
  bestContrast,
  stringToColor,
  generatePalette,
  generateGradientPalette,
  shadeScale,
  tailwindPalette,
  getStatusColor,
  STATUS_COLORS,
} from "./color";
export type {
  RgbColor,
  HslColor,
  HsvColor,
  HwbColor,
  ColorInput,
  StatusColor,
} from "./color";
export {
  mean,
  median,
  mode,
  variance,
  stddev,
  covariance,
  correlation,
  linearRegression,
  percentile,
  Vec2,
  Vec3,
  Matrix,
  dist2D,
  dist3D,
  angleBetweenPoints,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  boundingBox,
  lineIntersection,
  lerp as mathLerp,
  clamp as mathClamp,
  mapRange as mathMapRange,
  smoothStep,
  bezierQuad,
  bezierCubic,
  catmullRom,
  gcd,
  lcm,
  isPrime,
  sieveOfEratosthenes,
  factorial,
  fibonacci,
  fibonacciSequence,
  combinations,
  permutations,
  modPow,
  angle,
  temperature,
  length,
  weight,
  randomNormal,
  randomUniform,
  randomInt,
  randomPick,
  shuffle,
  weightedRandom,
} from "./math-utils";
export type {
  Vector2D,
  Vector3D,
} from "./math-utils";
export {
  parseUrl,
  buildUrlFromParts,
  updateSearchParams,
  removeSearchParams,
  getQueryParams,
  isSameOrigin,
  normalizeUrl,
  isAbsoluteUrl,
  makeAbsoluteUrl,
  getDomainFromUrl,
  getPathnameFromUrl,
  joinPathSegments,
  encodeUriComponentSafe,
  decodeUriComponentSafe,
  urlsEqual,
} from "./url-utils";
export type {
  ParsedUrl,
} from "./url-utils";
export {
  chunkArray,
  splitAt,
  partitionArray,
  slidingWindow,
  groupConsecutive,
  deepFlatten,
  uniqueBy,
  intersectArrays,
  differenceArrays,
  symmetricDifference,
  rotateArray,
  sampleArray,
  shuffleArray,
  zipArrays,
  fillArray,
  argMin,
  argMax,
} from "./array-utils";
export {
  deepClone,
  shallowClone,
  pick,
  omit,
  deepMerge,
  get as objGet,
  set as objSet,
  has as objHas,
  unset,
  mapValues,
  mapKeys,
  filterEntries,
  invert,
  deepEqual,
  isEmpty,
  size as objSize,
  deepFreeze,
  groupBy,
  countBy,
  indexBy,
  values as objValues,
  keys as objKeys,
  toPairs,
  fromPairs,
  defaults,
  ensurePath,
} from "./object-utils";
export {
  isBlank,
  isPresent as strIsPresent,
  collapseWhitespace,
  stripDiacritics,
  escapeRegex,
  escapeHtmlEntities,
  unescapeHtmlEntities,
  toCamelCaseString,
  toPascalCaseString,
  toKebabCaseString,
  toSnakeCaseString,
  capitalizeWords,
  smartTruncate,
  repeatWithSeparator,
  centerPad,
  isAscii,
  looksLikeEmail,
  looksLikeUrl,
  extractNumbers,
  replaceMultiple,
  stringToId,
  countOccurrences,
  reverseWords,
  trimLines,
  detectCase,
  slugify,
  levenshtein,
  isSimilar,
  soundex,
  randomString as strRandomString,
  randomHex as strRandomHex,
  generateId,
  wordCount,
  charFrequency,
  mostCommonChars,
  uniqueWords,
  pluralize as strPluralize,
  singularize,
  acronym,
  abbreviate,
  maskString as strMaskString,
  maskEmail,
  detectIndentation,
  indentText,
  simpleDiff,
} from "./string-utils";
export type {
  DiffSegment,
} from "./string-utils";
export {
  parseDuration,
  formatDuration as timeFormatDuration,
  formatDurationCompact,
  CountdownTimer,
  Stopwatch,
  RateLimiter,
  FixedWindowRateLimiter,
  debounce as timeDebounce,
  throttle as timeThrottle,
  addTime,
  diffDates,
  isSameDay,
  isToday,
  isYesterday,
  isTomorrow,
  getDayOfYear,
  getWeekNumber,
  getQuarter,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  daysInMonth,
  isLeapYear,
  getMonthDays,
  formatDateRange,
  getUserTimezone,
  getTimezoneOffset,
  toTimezone,
  TIMEZONE_ALIASES,
  scheduleAt,
  IntervalScheduler,
} from "./time-utils";
export type {
  ParsedDuration,
  StopwatchLap,
  RateLimitResult,
  CountdownOptions,
} from "./time-utils";
export {
  memoize,
  memoizeOne,
  once,
  compose,
  pipe,
  curry,
  partial,
  partialRight,
  retry,
  withTimeout,
  timeoutSync,
  promisify,
  ary,
  unary,
  noop,
  constant,
  identity,
  K,
  flip,
  not,
  guard,
  spread,
  gather,
  tap,
  thru,
  time,
  timeAsync,
} from "./function-utils";
export {
  createCustomEvent,
  dispatchCustomEvent,
  onCustomEvent,
  throttleEvent,
  debounceEvent as eventDebounce,
  once as eventOnce,
  waitForEvent,
  delegateEvent,
  preventDefault,
  stopPropagation,
  stopEvent,
} from "./event-utils";
export {
  detectBrowser,
  isBrowser,
  isMobile,
  isTablet,
  isTouchDevice,
  isInIframe as browserIsInIframe,
  isCrossOriginIframe,
  getScreenInfo,
  getViewportSize,
  getCurrentBreakpoint,
  isAtLeast,
  onResize,
  onOrientationChange,
  detectFeatures,
  supports,
  detectUserPreferences,
  onPreferenceChange,
  getMemoryInfo,
  getCpuCores,
  getMaxConnections,
} from "./browser-detection";
export type {
  BrowserInfo,
  ScreenInfo,
  FeatureSupport,
  UserPreferences,
  BreakpointName,
} from "./browser-detection";
export {
  getNetworkStatus,
  onNetworkChange,
  isSlowConnection,
  isDataSaverEnabled,
  fetchWithRetry,
  RequestQueue,
  syncWhenOnline,
  processOfflineQueue,
  BandwidthEstimator,
  ConnectionHealthChecker,
} from "./network-utils";
export type {
  NetworkStatus,
  RetryOptions as NetworkRetryOptions,
  RequestQueueItem,
} from "./network-utils";
export {
  KeyboardManager,
  createKeyboardManager,
  formatShortcut,
  matchesShortcut,
} from "./keyboard";
export type {
  KeyBinding,
  KeyChord,
  KeyboardManagerOptions,
  KeyboardManagerInstance,
} from "./keyboard";
export {
  GestureRecognizer,
  createSwipeDetector,
  getDirection,
  distance as gestureDistance,
  midpoint,
  angleBetween,
} from "./mouse-gestures";
export type {
  Direction,
  GestureType,
  GestureEvent,
  Point,
  GestureOptions,
  SwipeOptions,
} from "./mouse-gestures";
export {
  getMimeType,
  getExtension,
  getBaseName,
  categorizeFile,
  isFileType,
  FILE_EXTENSIONS,
  MIME_MAP,
  validateFile,
  validateFiles,
  sanitizeFilename,
  uniqueFilename,
  formatBytes as fileFormatBytes,
  formatFileSizeShort,
  getFileIcon,
  parseDropEvent,
  setupDropZone,
  readFileAsText,
  readFileAsDataURL,
  readFileAsArrayBuffer,
  readFileAsBinaryString,
  readFileHeader,
  splitFileIntoChunks,
  UploadTracker,
} from "./file-utils";
export type {
  FileCategory,
  FileValidationOptions,
  FileValidationError,
  DropEvent,
  FileChunk,
  UploadProgress,
} from "./file-utils";

export {
  I18nManager,
  createI18n,
  i18n as i18nInstance,
  t as i18nT,
} from "./i18n-advanced";
export type {
  LocaleCode,
  LocaleConfig,
  PluralRule,
  MessageCatalog,
  I18nOptions,
} from "./i18n-advanced";
export {
  progressBarAttrs,
  switchAttrs,
  liveRegion,
  announce,
  skipLinkAttrs,
  SKIP_LINK_ID,
  prefersReducedMotion,
  animationDuration,
  focusTrap,
  srOnly,
  ROLES,
} from "./accessibility";
export {
  PerfObserver,
  measureSync,
  measureAsync,
  perfMark,
  perfMeasure,
  measureBetween,
  FPSCounter,
  getMemoryUsage,
  getMemoryPercent,
  MemoryMonitor,
  LongTaskDetector,
  getNavigationTiming,
  collectWebVitals,
  getResourceTiming,
  findSlowResources,
  CustomMetric,
} from "./performance-utils";
export type {
  TimingResult,
  MemoryUsage,
  FPSStats,
  WebVitals,
  NavigationTiming,
} from "./performance-utils";
export {
  repeat,
  fixedGrid,
  autoFitGrid,
  autoFillGrid,
  masonryGrid,
  minmax,
  flexible,
  MINMAX,
  normalizeGap,
  uniformGap,
  asymmetricGap,
  defineAreas,
  layout12Area,
  holyGrail,
  generateGridStyles,
  applyGrid,
  responsiveGrid,
  BREAKPOINTS,
  mediaQuery,
  adaptiveGrid,
} from "./css-grid";
export type {
  GridTemplate,
  GridOptions,
  GridStyles,
} from "./css-grid";
export {
  validate,
  validateField,
  createValidator,
} from "./schema";
export type {
  SchemaType,
  SchemaRule,
  FieldSchema,
  ValidationResult,
} from "./schema";
export {
  DomObserverManager,
  takeSnapshot,
  compareSnapshots,
  createRouteChangeDetector,
  createLazyLoader,
} from "./dom-observer";
export type {
  ObserveTarget,
  MutationOptions,
  IntersectionOptions,
  ResizeOptions,
  MutationRecordEx,
  DomSnapshot,
  ObserverCallbacks,
  ObserverStats,
} from "./dom-observer";
export {
  easings,
  getEasing,
  springAnimate,
  AnimationTimeline,
  createScrollAnimation,
  staggerElements,
  animateCounter,
  createParallax,
} from "./animation-engine";
export type {
  EasingFunction,
  SpringConfig,
  SpringState,
  Keyframe,
  AnimationTrack,
  ScrollAnimationConfig,
} from "./animation-engine";
export {
  FSM,
  HSM,
  evaluateChoice,
  evaluateJunction,
  deepHistoryTarget,
  shallowHistoryTarget,
  createMachine,
  interpret,
  match,
  stateEquals,
} from "./state-machine";
export type {
  StateId,
  EventId,
  MachineContext,
  EventPayload,
  GuardFn,
  ActionFn,
  StateListener,
  InvalidEventStrategy,
  TransitionTarget,
  TransitionDef,
  StateConfig,
  HistoryMode,
  MachineConfig,
  ChoiceConfig,
  JunctionConfig,
  StateValue,
  TransitionHistoryEntry,
  Service,
  Machine,
} from "./state-machine";
export {
  VirtualScroller,
} from "./virtual-scroller";
export type {
  ScrollItem,
  VisibleRange,
  ScrollerConfig,
  ScrollerState,
  ScrollToOptions,
} from "./virtual-scroller";
export {
  DragDropManager,
  getDragDropManager,
} from "./drag-and-drop";
export type {
  DragMode,
  DropPosition,
  DragItem,
  DragOptions,
  DropZoneOptions,
  DropResult,
  SortableConfig,
} from "./drag-and-drop";
export {
  UndoHistory,
} from "./undo-redo";
export type {
  UndoItem,
  UndoBranch,
  UndoHistoryOptions,
  UndoState,
  UndoChangeListener,
} from "./undo-redo";
export {
  NotificationCenter,
  PushNotificationManager,
} from "./notification-system";
export type {
  NotificationType,
  NotificationPriority,
  Notification,
  NotificationConfig,
} from "./notification-system";
export {
  ClipboardManager,
  requestClipboardPermission,
  requestReadPermission,
  isClipboardApiAvailable,
  sanitizeHtml,
} from "./clipboard-manager";
export type {
  ClipboardDataType,
  ClipboardData,
  ClipboardPermission,
  CopyOptions,
  PasteOptions,
  ClipboardHistoryEntry,
  ClipboardConfig,
} from "./clipboard-manager";
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip-system";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip-system";
export {
  FormValidator,
  required,
  minLength,
  maxLength,
  pattern,
  email,
  urlValidator,
  range,
  matchesField,
  asyncValidator,
  custom,
} from "./form-validator";
export type {
  FieldValidationResult,
  FormValidationResult,
  ValidatorFn,
  FieldConfig,
  FormValidatorOptions,
} from "./form-validator";
export {
  createProgressBar,
  createCircularProgress,
  createStepProgress,
} from "./progress-indicator";
export type {
  ProgressBarOptions,
  ProgressBarInstance,
  CircularProgressOptions,
  CircularProgressInstance,
  StepProgressOptions,
  StepProgressInstance,
  ProgressVariant,
  ProgressSize,
} from "./progress-indicator";
export {
  createSplitPane,
} from "./split-pane";
export type {
  SplitOrientation,
  SplitCollapseDirection,
  SplitPaneOptions,
  SplitPaneInstance,
} from "./split-pane";
export {
  HotkeyManager,
  parseKeyCombo,
  eventMatchesCombo,
  formatKeyDisplay,
  createAppHotkeys,
  areModifiersDown,
  getModifierString,
} from "./hotkeys";
export type {
  HotkeyBinding,
  HotkeyEvent,
  HotkeyListener,
  ParsedKeyCombo,
} from "./hotkeys";
export {
  ModalManager,
  getModalManager,
} from "./modal-manager";
export type {
  ModalSize,
  ModalAnimation,
  ModalOptions,
  ModalAction,
  ModalInstance,
  ConfirmOptions,
} from "./modal-manager";
export {
  createTabs,
} from "./tabs-system";
export type {
  TabOrientation,
  TabSize,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs-system";
export {
  AutocompleteManager,
  createAutocomplete,
} from "./autocomplete";
export type {
  AutocompleteOption,
  AutocompleteOptions,
  AutocompleteInstance,
} from "./autocomplete";
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";
export {
  InfiniteScroll,
} from "./infinite-scroll";
export type {
  InfiniteScrollItem,
  InfiniteScrollOptions,
  InfiniteScrollState,
} from "./infinite-scroll";
export {
  SelectionManager,
  createSelectionManager,
} from "./selection";
export type {
  SelectionRange,
  CaretPosition,
  SelectionManagerOptions,
  SelectionManagerInstance,
} from "./selection";
export {
  CollapseManager,
  createCollapse,
  createCollapseGroup,
} from "./collapse";
export type {
  CollapseSize,
  CollapseVariant,
  CollapseOptions,
  CollapseInstance,
  CollapseGroupOptions,
  CollapseGroupInstance,
} from "./collapse";
export {
  BreadcrumbManager,
  createBreadcrumb,
} from "./breadcrumb";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb";
export {
  createAffix,
} from "./affix";
export type {
  AffixOptions,
  AffixInstance,
} from "./affix";
export {
  PaginationManager,
  createPagination,
} from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
} from "./avatar";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";
export {
  RatingManager,
  createRating,
} from "./rating";
export type {
  StarIconType,
  RatingOptions,
  RatingInstance,
} from "./rating";
export {
  TagInputManager,
  createTagInput,
} from "./tag-input";
export type {
  TagItem,
  TagInputOptions,
  TagInputInstance,
} from "./tag-input";
export {
  TimelineManager,
  createTimeline,
} from "./timeline";
export type {
  TimelineItemStatus,
  TimelineItem,
  TimelineOptions,
  TimelineInstance,
} from "./timeline";
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type {
  RgbColor,
  HslColor,
  Palette,
} from "./color-picker";
export {
  DatePickerManager,
  createDatePicker,
} from "./date-picker";
export type {
  DatePickerOptions,
  DatePickerInstance,
} from "./date-picker";
export {
  FileUploadManager,
  createFileUpload,
} from "./file-upload";
export type {
  FileUploadOptions,
  UploadFile,
  FileUploadInstance,
} from "./file-upload";
export {
  ChartManager,
  createChart,
} from "./chart";
export type {
  ChartType,
  ChartDataPoint,
  ChartDataset,
  ChartOptions,
  ChartInstance,
} from "./chart";
export {
  DataTableManager,
  createDataTable,
} from "./data-table";
export type {
  Column,
  SortDirection,
  SortState,
  FilterState,
  DataTableOptions,
  DataTableInstance,
} from "./data-table";
export {
  TreeView,
} from "./tree-view";
export type {
  TreeNodeData,
  TreeNode,
  CheckMode,
  TreeViewConfig,
} from "./tree-view";
export {
  KanbanManager,
  createKanban,
} from "./kanban";
export type {
  CardPriority,
  CardSize,
  KanbanLabel,
  KanbanCard,
  KanbanColumn,
  KanbanSwimlane,
  KanbanOptions,
  KanbanInstance,
} from "./kanban";
export {
  GanttManager,
  createGantt,
} from "./gantt";
export type {
  GanttTask,
  GanttMilestone,
  GanttZoom,
  GanttViewMode,
  GanttOptions,
  GanttInstance,
} from "./gantt";
export {
  CircuitBoardManager,
  createCircuitBoard,
} from "./circuit-board";
export type {
  ConnectionStyle,
  PortType,
  NodeShape,
  CircuitPort,
  CircuitNode,
  CircuitConnection,
  CircuitOptions,
  CircuitInstance,
} from "./circuit-board";
export {
  MentionManager,
  createMention,
} from "./mention";
export type {
  MentionOption,
  MentionOptions,
  MentionInstance,
} from "./mention";
export {
  CommandPalette,
} from "./command-palette";
export type {
  Command,
  CommandCategory,
  CommandPaletteConfig,
  CommandPaletteState,
} from "./command-palette";
export {
  SearchHighlightManager,
  createSearchHighlight,
} from "./search-highlight";
export type {
  SearchHighlightOptions,
  SearchHighlightInstance,
} from "./search-highlight";
export {
  computeDiff,
  toUnifiedDiff,
  applyPatch,
  renderInlineDiffHtml,
  renderSideBySideDiffHtml,
  wordDiff,
  renderWordDiffHtml,
  getDiffStyles,
  textSimilarity,
  formatDiffStats,
} from "./diff-viewer";
export type {
  DiffChunk,
  DiffResult,
  FileDiff,
} from "./diff-viewer";
export {
  parseMarkdown,
  renderToHtml,
  generateToc,
  renderToc,
  extractFrontMatter,
  extractText,
  countWords,
  readingTime,
  mdToHtml,
} from "./markdown-renderer";
export type {
  MdNodeType,
  MdNode,
  MdRenderOptions,
  TocEntry,
  FrontMatter,
} from "./markdown-renderer";
export {
  CodeEditorManager,
  createCodeEditor,
} from "./code-editor";
export type {
  CodeEditorOptions,
  CodeEditorInstance,
} from "./code-editor";
export {
  createEmojiPicker,
} from "./emoji-picker";
export type {
  EmojiData,
  EmojiCategory,
  SkinTone,
  EmojiPickerOptions,
  EmojiPickerInstance,
} from "./emoji-picker";
export {
  ColorSchemeManager,
  createColorScheme,
  prefersDarkMode,
  hasForcedColors,
} from "./color-scheme";
export type {
  ColorScheme,
  ContrastMode,
  ColorSchemeState,
  ColorSchemeOptions,
  ColorSchemeInstance,
} from "./color-scheme";
export {
  ScrollSnapManager,
  createScrollSnap,
} from "./scroll-snap";
export type {
  SnapType,
  SnapAxis,
  SnapSection,
  ScrollSnapOptions,
  ScrollSnapInstance,
} from "./scroll-snap";
export {
  makeResizable,
  createSplitPane,
} from "./resizable";
export type {
  ResizeOptions,
  ResizeState,
  ResizableController,
  SplitPaneOptions,
  SplitPaneController,
} from "./resizable";
export {
  createSplitButton,
} from "./splitter";
export type {
  SplitButtonSize,
  SplitButtonVariant,
  SplitButtonItem,
  SplitButtonOptions,
  SplitButtonInstance,
} from "./splitter";
export {
  ContextMenuManager,
} from "./context-menu";
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";
export {
  StepperManager,
  createStepper,
} from "./stepper";
export type {
  StepStatus,
  StepConfig,
  StepperOptions,
  StepperInstance,
} from "./stepper";
export {
  WizardManager,
  createWizard,
} from "./wizard";
export type {
  WizardStepStatus,
  WizardStep,
  WizardOptions,
  WizardInstance,
} from "./wizard";
export {
  createStatCard,
} from "./statistics";
export type {
  TrendDirection,
  SparklineType,
  StatCardOptions,
  StatisticsInstance,
} from "./statistics";
export {
  ToastManager,
  getToastManager,
  showToast,
} from "./toast";
export type {
  ToastType,
  ToastPosition,
  ToastOptions,
  ToastInstance,
  ToastManagerConfig,
} from "./toast";
export {
  createDrawer,
} from "./drawer";
export type {
  DrawerSide,
  DrawerSize,
  DrawerOptions,
  DrawerInstance,
} from "./drawer";
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";
export {
  PopoverManager,
  createPopover,
} from "./popover";
export type {
  PopoverTrigger,
  PopoverPlacement,
  PopoverOptions,
  PopoverInstance,
} from "./popover";
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
} from "./avatar";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";
export {
  BreadcrumbManager,
  createBreadcrumb,
} from "./breadcrumb";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb";
export {
  TabsManager,
  createTabs,
} from "./tabs";
export type {
  TabOrientation,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs";
export {
  AccordionManager,
  createAccordion,
} from "./accordion";
export type {
  AccordionItem,
  AccordionMode,
  AccordionOptions,
  AccordionInstance,
} from "./accordion";
export {
  CarouselManager,
  createCarousel,
} from "./carousel";
export type {
  CarouselSlide,
  CarouselOptions,
  CarouselInstance,
} from "./carousel";
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  BadgeOptions,
  StatusDotOptions,
} from "./badge";
export {
  NotificationManager,
  getNotificationManager,
  toast,
} from "./notification";
export type {
  NotificationType,
  Notification,
  NotificationOptions,
  NotificationPosition,
} from "./notification";
export {
  createProgressTracker,
  createMultiProgressTracker,
  formatProgress,
  createStepProgress,
} from "./progress";
export type {
  ProgressState,
  ProgressCallback,
  ProgressController,
  MultiProgressController,
  StepProgressController,
} from "./progress";
export {
  EmptyStateManager,
  createEmptyState,
} from "./empty-state";
export type {
  EmptyStateVariant,
  EmptyStateOptions,
  EmptyStateInstance,
} from "./empty-state";
export {
  createSwitch,
} from "./switch";
export type {
  SwitchSize,
  SwitchVariant,
  SwitchOptions,
  SwitchInstance,
} from "./switch";
export {
  PaginationManager,
  createPagination,
} from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";
export {
  SelectManager,
  createSelect,
} from "./select";
export type {
  SelectOption,
  SelectOptions,
  SelectInstance,
} from "./select";
export {
  createInputGroup,
} from "./input-group";
export type {
  InputSize,
  InputVariant,
  ValidationState,
  InputGroupOptions,
  InputGroupInstance,
} from "./input-group";
export {
  createForm,
} from "./form";
export type {
  FieldType,
  ValidationRule,
  FormField,
  FormGroup,
  FormOptions,
  FormInstance,
} from "./form";
export {
  createModal,
} from "./modal";
export type {
  ModalSize,
  ModalPosition,
  ModalOptions,
  ModalInstance,
} from "./modal";
export {
  AlertManager,
  createAlert,
} from "./alert";
export type {
  AlertVariant,
  AlertSize,
  AlertAction,
  AlertOptions,
  AlertInstance,
} from "./alert";
export {
  DropzoneManager,
  createDropzone,
} from "./dropzone";
export type {
  FileValidationError,
  FileValidationRule,
  DropzoneFile,
  DropzoneOptions,
  DropzoneInstance,
} from "./dropzone";
export {
  InfiniteScroll,
} from "./infinite-scroll";
export type {
  InfiniteScrollItem,
  InfiniteScrollOptions,
  InfiniteScrollState,
} from "./infinite-scroll";
export {
  createCommentSystem,
} from "./comment";
export type {
  CommentAuthor,
  CommentData,
  CommentOptions,
  CommentInstance,
} from "./comment";
export {
  createAnchorNav,
} from "./anchor-nav";
export type {
  AnchorLink,
  AnchorNavOptions,
  AnchorNavInstance,
} from "./anchor-nav";
export {
  CountdownManager,
  createCountdown,
} from "./countdown";
export type {
  CountdownSize,
  CountdownVariant,
  CountdownOptions,
  CountdownInstance,
} from "./countdown";
export {
  MarqueeManager,
  createMarquee,
} from "./marquee";
export type {
  MarqueeDirection,
  MarqueeStyle,
  MarqueeItem,
  MarqueeOptions,
  MarqueeInstance,
} from "./marquee";
export {
  createVirtualList,
} from "./virtual-list";
export type {
  VirtualListItem,
  VirtualListOptions,
  VirtualListInstance,
} from "./virtual-list";
export {
  ColorPaletteManager,
  createColorPalette,
  contrastRatio,
} from "./color-palette";
export type {
  PaletteScheme,
  ColorShade,
  PaletteColor,
  ColorPalette,
  ColorPaletteOptions,
  ColorPaletteInstance,
} from "./color-palette";
export {
  HotkeyManager,
  createAppHotkeys,
  parseKeyCombo,
  eventMatchesCombo,
  formatKeyDisplay,
  areModifiersDown,
  getModifierString,
} from "./hotkeys";
export type {
  HotkeyBinding,
  HotkeyEvent,
  HotkeyListener,
  ParsedKeyCombo,
} from "./hotkeys";

// --- Tree Select ---
export type {
  TreeNodeData,
  TreeSelectOptions,
  TreeSelectInstance,
} from "./tree-select";
export {
  TreeSelectManager,
  createTreeSelect,
} from "./tree-select";

// --- Slider ---
export type {
  SliderMark,
  SliderOptions,
  SliderInstance,
} from "./slider";
export {
  SliderManager,
  createSlider,
} from "./slider";

// --- Chip ---
export type {
  ChipSize,
  ChipVariant,
  ChipOptions,
  ChipInstance,
  ChipGroupOptions,
  ChipGroupInstance,
} from "./chip";
export {
  createChip,
  createChipGroup,
} from "./chip";

// --- Rating ---
export type {
  StarIconType,
  RatingOptions,
  RatingInstance,
} from "./rating";
export {
  RatingManager,
  createRating,
} from "./rating";

// --- Split Button ---
export type {
  SplitButtonSize,
  SplitButtonVariant,
  SplitButtonItem,
  SplitButtonOptions,
  SplitButtonInstance,
} from "./splitter";
export {
  createSplitButton,
} from "./splitter";

// --- Context Menu ---
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";
export {
  ContextMenuManager,
} from "./context-menu";

// --- Affix ---
export type {
  AffixOptions,
  AffixInstance,
} from "./affix";
export {
  createAffix,
} from "./affix";

// --- Back to Top ---
export type {
  BackTopShape,
  BackTopPosition,
  BackTopOptions,
  BackTopInstance,
} from "./back-top";
export {
  createBackTop,
} from "./back-top";

// --- Image Viewer ---
export type {
  ImageViewerImage,
  ImageViewerTool,
  ImageViewerOptions,
  ImageViewerInstance,
} from "./image-viewer";
export {
  ImageViewerManager,
  createImageViewer,
} from "./image-viewer";

// --- Tour ---
export type {
  TourStep,
  TourOptions,
  TourInstance,
} from "./tour";
export {
  createTour,
} from "./tour";

// --- Segmented Control ---
export type {
  SegmentedOption,
  SegmentedSize,
  SegmentedControlOptions,
  SegmentedControlInstance,
} from "./segmented-control";
export {
  createSegmentedControl,
} from "./segmented-control";

// --- Skeleton Loader ---
export type {
  SkeletonShape,
  SkeletonAnimation,
  SkeletonItem,
  SkeletonOptions,
  SkeletonInstance,
} from "./skeleton-loader";
export {
  createSkeleton,
} from "./skeleton-loader";

// --- Mentions ---
export type {
  MentionItem,
  MentionTrigger,
  MentionsOptions,
  MentionsInstance,
} from "./mentions";
export {
  MentionsManager,
  createMentions,
} from "./mentions";

// --- Tag Input ---
export type {
  TagItem,
  TagInputOptions,
  TagInputInstance,
} from "./tag-input";
export {
  TagInputManager,
  createTagInput,
} from "./tag-input";

// --- Time Picker ---
export type {
  TimeFormat,
  TimePickerMode,
  TimePickerOptions,
  TimePickerInstance,
} from "./time-picker";
export {
  createTimePicker,
} from "./time-picker";

// --- Date Picker ---
export type {
  DatePickerOptions,
  DatePickerInstance,
} from "./date-picker";
export {
  DatePickerManager,
  createDatePicker,
} from "./date-picker";

// --- Cascader ---
export type {
  CascaderOption,
  CascaderColumn,
  CascaderOptions,
  CascaderInstance,
} from "./cascader";
export {
  CascaderManager,
  createCascader,
} from "./cascader";

// --- Transfer ---
export type {
  TransferItem,
  TransferOptions,
  TransferInstance,
} from "./transfer";
export {
  TransferManager,
  createTransfer,
} from "./transfer";

// --- Upload ---
export type {
  UploadStatus,
  UploadFile,
  UploadOptions,
  UploadInstance,
} from "./upload";
export {
  createUpload,
} from "./upload";

// --- QR Code ---
export type {
  QrOptions,
} from "./qr-code";
export {
  generateQrSvg,
  generateQrDataUri,
  generateQrCanvas,
  validateQrInput,
} from "./qr-code";

// --- Signature Pad ---
export type {
  StrokePoint,
  Stroke,
  SignaturePadOptions,
  SignaturePadInstance,
} from "./signature-pad";
export {
  SignaturePadManager,
  createSignaturePad,
} from "./signature-pad";

// --- Statistics Chart ---
export type {
  ChartType,
  ChartDataPoint,
  ChartSeries,
  ChartOptions,
  ChartInstance,
} from "./statistics-chart";
export {
  createChart,
} from "./statistics-chart";

// --- Notification Bell ---
export type {
  NotificationItem,
  NotificationBellOptions,
  NotificationBellInstance,
} from "./notification-bell";
export {
  createNotificationBell,
} from "./notification-bell";

// --- Scroll Progress ---
export type {
  ProgressBarPosition,
  ProgressBarVariant,
  ScrollProgressOptions,
  ScrollProgressInstance,
} from "./scroll-progress";
export {
  createScrollProgress,
} from "./scroll-progress";

// --- Float Label ---
export type {
  FloatLabelVariant,
  FloatLabelSize,
  FloatLabelOptions,
  FloatLabelInstance,
} from "./float-label";
export {
  createFloatLabel,
} from "./float-label";

// --- Ellipsis Text ---
export type {
  EllipsisPosition,
  EllipsisTextOptions,
  EllipsisTextInstance,
} from "./ellipsis-text";
export {
  createEllipsisText,
} from "./ellipsis-text";

// --- Countdown Timer ---
export type {
  CountdownDisplayMode,
  CountdownUnit,
  CountdownTimerOptions,
  CountdownTimerInstance,
} from "./countdown-timer";
export {
  createCountdownTimer,
} from "./countdown-timer";

// --- Keyboard Navigation ---
export type {
  NavItem,
  KeyboardNavOptions,
  KeyboardNavInstance,
} from "./keyboard-nav";
export {
  createKeyboardNav,
} from "./keyboard-nav";

// --- Side Panel ---
export type {
  SidePanelPosition,
  SidePanelSize,
  SidePanelOptions,
  SidePanelInstance,
} from "./side-panel";
export {
  createSidePanel,
} from "./side-panel";

// --- Rating Group ---
export type {
  RatingEntry,
  RatingGroupOptions,
  RatingGroupInstance,
} from "./rating-group";
export {
  createRatingGroup,
} from "./rating-group";

// --- Color Picker ---
export type {
  RgbColor,
  HslColor,
  Palette,
} from "./color-picker";
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";

// --- Avatar Group ---
export type {
  AvatarSize,
  StackDirection,
  AvatarItem,
  AvatarGroupOptions,
  AvatarGroupInstance,
} from "./avatar-group";
export {
  createAvatarGroup,
} from "./avatar-group";

// --- Empty State ---
export type {
  EmptyStateVariant,
  EmptyStateOptions,
  EmptyStateInstance,
} from "./empty-state";
export {
  createEmptyState,
} from "./empty-state";

// --- Progress Steps ---
export type {
  StepStatus,
  StepItem,
  ProgressStepsOptions,
  ProgressStepsInstance,
} from "./progress-steps";
export {
  createProgressSteps,
} from "./progress-steps";

// --- Breadcrumb ---
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb";
export {
  createBreadcrumb,
} from "./breadcrumb";

// --- Timeline ---
export type {
  TimelineItemStatus,
  TimelineItem,
  TimelineOptions,
  TimelineInstance,
} from "./timeline";
export {
  createTimeline,
} from "./timeline";

// --- Comment Thread ---
export type {
  CommentAuthor,
  Comment,
  CommentThreadOptions,
  CommentThreadInstance,
} from "./comment-thread";
export {
  createCommentThread,
} from "./comment-thread";

// --- Action Sheet ---
export type {
  ActionSheetActionStyle,
  ActionSheetAction,
  ActionSheetOptions,
  ActionSheetInstance,
} from "./action-sheet";
export {
  createActionSheet,
} from "./action-sheet";

// --- Stat Card ---
export type {
  TrendDirection,
  StatCardVariant,
  StatCardOptions,
} from "./stat-card";
export {
  createStatCard,
} from "./stat-card";

// --- Accordion ---
export type {
  AccordionItem,
  AccordionMode,
  AccordionOptions,
  AccordionInstance,
} from "./accordion";
export {
  createAccordion,
} from "./accordion";

// --- Tabs ---
export type {
  TabOrientation,
  TabVariant,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs";
export {
  createTabs,
} from "./tabs";

// --- Tooltip ---
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip";
export {
  getTooltipManager,
  tooltip,
} from "./tooltip";

// --- Modal ---
export type {
  ModalSize,
  ModalPosition,
  ModalOptions,
  ModalInstance,
} from "./modal";
export {
  createModal,
} from "./modal";

// --- Toast ---
export type {
  ToastType,
  ToastPosition,
  ToastOptions,
  ToastInstance,
  ToastManagerConfig,
} from "./toast";
export {
  ToastManager,
  getToastManager,
  showToast,
} from "./toast";

// --- Alert ---
export type {
  AlertVariant,
  AlertSize,
  AlertAction,
  AlertOptions,
  AlertInstance,
} from "./alert";
export {
  createAlert,
} from "./alert";

// --- Switch ---
export type {
  SwitchSize,
  SwitchVariant,
  SwitchOptions,
  SwitchInstance,
} from "./switch";
export {
  createSwitch,
} from "./switch";

// --- Checkbox Group ---
export type {
  CheckboxSize,
  CheckboxVariant,
  CheckboxOption,
  CheckboxGroupOptions,
  CheckboxGroupInstance,
} from "./checkbox-group";
export {
  createCheckboxGroup,
} from "./checkbox-group";

// --- Radio Group ---
export type {
  RadioSize,
  RadioVariant,
  RadioOption,
  RadioGroupOptions,
  RadioGroupInstance,
} from "./radio-group";
export {
  createRadioGroup,
} from "./radio-group";

// --- Input ---
export type {
  InputSize,
  InputVariant,
  InputState,
  InputOptions,
  InputInstance,
} from "./input";
export {
  createInput,
} from "./input";

// --- Textarea ---
export type {
  TextareaSize,
  TextareaState,
  TextareaOptions,
  TextareaInstance,
} from "./textarea";
export {
  createTextarea,
} from "./textarea";

// --- Select ---
export type {
  SelectOption,
  SelectOptions,
  SelectInstance,
} from "./select";
export {
  SelectManager,
  createSelect,
} from "./select";

// --- Badge ---
export type {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  BadgeOptions,
  StatusDotOptions,
} from "./badge";
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";

// --- Divider ---
export type {
  DividerOrientation,
  DividerStyle,
  DividerOptions,
} from "./divider";
export {
  createDivider,
  hDivider,
  vDivider,
  labeledDivider,
  sectionDivider,
} from "./divider";

// --- Card ---
export type {
  CardVariant,
  CardSize,
  CardHeaderOptions,
  CardImageOptions,
  CardOptions,
  CardInstance,
} from "./card";
export {
  createCard,
} from "./card";

// --- Button ---
export type {
  ButtonVariant,
  ButtonSize,
  ButtonOptions,
  ButtonGroupOptions,
  ButtonGroupInstance,
} from "./button";
export {
  createButton,
  createButtonGroup,
} from "./button";

// --- Spinner ---
export type {
  SpinnerVariant,
  SpinnerSize,
  SpinnerOptions,
} from "./spinner";
export {
  createSpinner,
  miniSpinner,
  fullPageSpinner,
} from "./spinner";

// --- Avatar ---
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar";
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
} from "./avatar";

// --- List ---
export type {
  ListSelectionMode,
  ListVariant,
  ListItem,
  ListOptions,
  ListInstance,
} from "./list";
export {
  createList,
} from "./list";

// --- Table ---
export type {
  Column,
  TableState,
  SortState,
  FilterState,
  FilterOperator,
  PaginationState,
  SelectionState,
} from "./table";
export {
  createTableState,
  getSortedData,
  getFilteredData,
  getPaginatedData,
  getCellValue,
  applyFilterOperator,
  toggleSort,
  setSearchTerm,
  toggleFilter,
  goToPage,
  setPageSize,
  toggleRowSelection,
  toggleSelectAll,
  toggleRowExpand,
  resetTable,
  exportTableAsCsv,
} from "./table";

// --- Form ---
export type {
  FieldType,
  ValidationRule,
  FormField,
  FormGroup,
  FormOptions,
  FormInstance,
} from "./form";
export {
  createForm,
} from "./form";

// --- Carousel ---
export type {
  CarouselSlide,
  CarouselOptions,
  CarouselInstance,
} from "./carousel";
export {
  createCarousel,
} from "./carousel";

// --- Collapse ---
export type {
  CollapseSize,
  CollapseVariant,
  CollapseOptions,
  CollapseInstance,
  CollapseGroupOptions,
  CollapseGroupInstance,
} from "./collapse";
export {
  CollapseManager,
  createCollapse,
  createCollapseGroup,
} from "./collapse";

// --- Drawer ---
export type {
  DrawerSide,
  DrawerSize,
  DrawerOptions,
  DrawerInstance,
} from "./drawer";
export {
  createDrawer,
} from "./drawer";

// --- Tree View ---
export type {
  TreeNodeData,
  TreeNode,
  CheckMode,
  TreeViewConfig,
} from "./tree-view";
export {
  TreeView,
} from "./tree-view";

// --- Pagination ---
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";
export {
  PaginationManager,
  createPagination,
} from "./pagination";

// --- Skeleton ---
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";

// --- Context Menu ---
export type {
  ContextMenuItem,
  ContextMenuPosition,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu";
export {
  ContextMenuManager,
} from "./context-menu";

// --- File Upload ---
export type {
  FileUploadOptions,
  UploadFile,
  FileUploadInstance,
} from "./file-upload";
export {
  FileUploadManager,
  createFileUpload,
} from "./file-upload";

// --- Image Gallery ---
export type {
  GalleryImage,
  ImageGalleryOptions,
  ImageGalleryInstance,
} from "./image-gallery";
export {
  ImageGalleryManager,
  createImageGallery,
} from "./image-gallery";

// --- Command Palette ---
export type {
  Command,
  CommandCategory,
  CommandPaletteConfig,
  CommandPaletteState,
} from "./command-palette";
export {
  CommandPalette,
} from "./command-palette";

// --- Notification Center ---
export type {
  NotificationType,
  NotificationItem,
  NotificationCenterOptions,
  NotificationCenterInstance,
} from "./notification-center";
export {
  NotificationCenterManager,
  createNotificationCenter,
} from "./notification-center";

// --- Resizable ---
export type {
  ResizeOptions,
  ResizeState,
  SplitPaneOptions,
} from "./resizable";
export {
  makeResizable,
  createSplitPane,
} from "./resizable";

// --- Date Picker ---
export type {
  DatePickerOptions,
  DatePickerInstance,
} from "./date-picker";
export {
  DatePickerManager,
  createDatePicker,
} from "./date-picker";

// --- Slider ---
export type {
  SliderMark,
  SliderOptions,
  SliderInstance,
} from "./slider";
export {
  SliderManager,
  createSlider,
} from "./slider";

// --- Popover ---
export type {
  PopoverTrigger,
  PopoverPlacement,
  PopoverOptions,
  PopoverInstance,
} from "./popover";
export {
  PopoverManager,
  createPopover,
} from "./popover";

// --- Dropdown Menu ---
export type {
  MenuItemType,
  MenuItem,
  DropdownMenuOptions,
  DropdownMenuInstance,
} from "./dropdown-menu";
export {
  DropdownMenuManager,
  createDropdownMenu,
} from "./dropdown-menu";

// --- Tour Guide ---
export type {
  TourStep,
  TourOptions,
  TourInstance,
} from "./tour-guide";
export {
  TourManager,
  createTour,
} from "./tour-guide";

// --- Search Input ---
export type {
  SuggestionItem,
  SearchHistoryEntry,
  SearchInputOptions,
  SearchInputInstance,
} from "./search-input";
export {
  SearchInputManager,
  createSearchInput,
} from "./search-input";

// --- Anchor ---
export type {
  AnchorLink,
  AnchorOptions,
  AnchorInstance,
} from "./anchor";
export {
  createAnchor,
} from "./anchor";

// --- Affix ---
export type {
  AffixOptions,
  AffixInstance,
} from "./affix";
export {
  createAffix,
} from "./affix";

// --- Back to Top ---
export type {
  BttPosition,
  BttSize,
  BttShape,
  BackToTopOptions,
  BackToTopInstance,
} from "./back-to-top";
export {
  createBackToTop,
} from "./back-to-top";

// --- Countdown ---
export type {
  CountdownSize,
  CountdownVariant,
  CountdownOptions,
  CountdownInstance,
} from "./countdown";
export {
  CountdownManager,
  createCountdown,
} from "./countdown";

// --- Ripple ---
export type {
  RippleOptions,
  RippleInstance,
} from "./ripple";
export {
  createRipple,
  initRipples,
} from "./ripple";

// --- Virtual List ---
export type {
  VirtualListItem,
  VirtualListOptions,
  VirtualListInstance,
} from "./virtual-list";
export {
  createVirtualList,
} from "./virtual-list";

// --- Infinite Scroll ---
export type {
  InfiniteScrollItem,
  InfiniteScrollOptions,
  InfiniteScrollState,
} from "./infinite-scroll";
export {
  InfiniteScroll,
} from "./infinite-scroll";

// --- Lazy Load ---
export type {
  LazyLoadOptions,
  LazyLoadInstance,
  BatchLazyOptions,
} from "./lazy-load";
export {
  createLazyLoad,
  initBatchLazy,
} from "./lazy-load";

// --- Scroll Spy ---
export type {
  SpyTarget,
  ScrollSpyOptions,
  ScrollSpyInstance,
  NavSpyOptions,
} from "./scroll-spy";
export {
  createScrollSpy,
  createNavSpy,
} from "./scroll-spy";

// --- Mask ---
export type {
  MaskMode,
  MaskOptions,
  CutoutOptions,
  MaskInstance,
} from "./mask";
export {
  createMask,
  createSpotlight,
} from "./mask";

// --- Waterfall ---
export type {
  PipelineStep,
  PipelineContext,
  PipelineResult,
} from "./waterfall";
export {
  runPipeline,
  parallel,
  waterfall,
  raceWithCleanup,
} from "./waterfall";

// --- Steps ---
export type {
  StepStatus,
  StepItem,
  StepsOrientation,
  StepsVariant,
  StepsOptions,
  StepsInstance,
} from "./steps";
export {
  StepsManager,
  createSteps,
} from "./steps";

// --- copy-to-clipboard ---
export {
  ClipboardManager,
  createClipboardManager,
  copyToClipboard,
  copyElementText,
  copyElementHtml,
  bindCopyShortcut,
} from "./copy-to-clipboard";
export type { ClipboardOptions, ClipboardInstance } from "./copy-to-clipboard";

// --- hotkeys ---
export {
  HotkeyManager,
  parseKeyCombo,
  eventMatchesCombo,
  formatKeyDisplay,
  createAppHotkeys,
  areModifiersDown,
  getModifierString,
} from "./hotkeys";
export type {
  HotkeyBinding,
  HotkeyEvent,
  HotkeyListener,
  ParsedKeyCombo,
} from "./hotkeys";

// --- print ---
export {
  PrintManager,
  createPrintManager,
  quickPrint,
  addPageBreakBefore,
  addPageBreakAfter,
  avoidBreakInside,
} from "./print";
export type { PrintOptions, PrintManagerInstance } from "./print";

// --- color-picker ---
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type { RgbColor, HslColor, Palette } from "./color-picker";

// --- tooltip ---
export { TooltipManager, getTooltipManager, tooltip } from "./tooltip";
export type { TooltipOptions, TooltipInstance, TooltipPlacement, TooltipTrigger } from "./tooltip";

// --- progress ---
export {
  createProgressTracker,
  createMultiProgressTracker,
  formatProgress,
  createStepProgress,
} from "./progress";
export type { ProgressState, ProgressCallback, ProgressController, MultiProgressController, StepProgressController } from "./progress";

// --- form-validator ---
export {
  FormValidator,
  required,
  minLength,
  maxLength,
  pattern,
  email,
  urlValidator,
  range,
  matchesField,
  asyncValidator,
  custom,
} from "./form-validator";
export type { FieldValidationResult, FormValidationResult, ValidatorFn, FieldConfig, FormValidatorOptions } from "./form-validator";

// --- debounce-throttle ---
export {
  Debounced,
  Throttled,
  debounce,
  throttle,
  debouncePromise,
  rafThrottle,
  idleThrottle,
} from "./debounce-throttle";
export type { DebounceOptions, ThrottleOptions, RateLimitStats } from "./debounce-throttle";

// --- local-storage ---
export {
  LocalStorageManager,
  createLocalStorage,
  lsSet,
  lsGet,
  lsRemove,
  lsHas,
  SessionStorageManager,
  createSessionStorage,
} from "./local-storage";
export type { StorageItem, StorageOptions, StorageInstance } from "./local-storage";

// --- drag-and-drop ---
export { DragDropManager, getDragDropManager } from "./drag-and-drop";
export type { DragItem, DragOptions, DropZoneOptions, DropResult, SortableConfig, DragMode, DropPosition } from "./drag-and-drop";

// --- keyboard-nav ---
export { createKeyboardNav } from "./keyboard-nav";
export type { NavItem, KeyboardNavOptions, KeyboardNavInstance } from "./keyboard-nav";

// --- animate ---
export { Animator, easings, resolveEasing, staggerAnimate, scrollTrigger } from "./animate";
export type { Keyframe, AnimationOptions, AnimationInstance, StaggerOptions, TimelineOptions } from "./animate";

// --- i18n ---
export { t, getLocale, setLocale, LOCALE_CHANGE_EVENT } from "./i18n";
export type { Locale } from "./i18n";

// --- event-bus ---
export { EventBus, createEventBus } from "./event-bus";
export type { EventCallback, EventMiddleware, Subscription, EmittedEvent, EventBusOptions } from "./event-bus";

// --- state-machine ---
export {
  FSM,
  HSM,
  createMachine,
  interpret,
  match,
  stateEquals,
  evaluateChoice,
  evaluateJunction,
  deepHistoryTarget,
  shallowHistoryTarget,
} from "./state-machine";
export type {
  StateId,
  EventId,
  MachineContext,
  EventPayload,
  GuardFn,
  ActionFn,
  StateListener,
  InvalidEventStrategy,
  TransitionTarget,
  TransitionDef,
  HistoryMode,
  StateConfig,
  MachineConfig,
  ChoiceConfig,
  JunctionConfig,
  StateValue,
  TransitionHistoryEntry,
  Service,
} from "./state-machine";

// --- css-in-js ---
export {
  injectStyle,
  removeStyle,
  updateStyle,
  setCssVar,
  getCssVar,
  setCssVars,
  getRootVar,
  setRootVar,
  getCurrentBreakpoint,
  isMinWidth,
  isMaxWidth,
  onBreakpointChange,
  isMobile,
  isTablet,
  isDesktop,
  getDevicePixelRatio,
  isRetina,
  mq,
  mediaQueries,
  matchesMedia,
  subscribeMedia,
  isDarkMode,
  isLightMode,
  toggleDarkMode,
  setDarkMode,
  onDarkModeChange,
  buildKeyframes,
  registerKeyframes,
  animations,
  animate as cssAnimate,
  toggleClass,
  classIf,
  setClasses,
  hasAnyClass,
  bringToFront,
  sendToBack,
} from "./css-in-js";
export type { Breakpoints } from "./css-in-js";

// --- dom-utils ---
export {
  getComputedStyleValue,
  getElementRect,
  isInViewport,
  getVisibilityPercent,
  scrollIntoViewCentered,
  measureText,
  closestAncestor,
  getAncestors,
  insertAfter,
  replaceElement,
  containsOrIs,
  getFocusableElements,
  createFocusTrap,
} from "./dom-utils";

// --- math ---
export {
  mean,
  median,
  stddev,
  percentile,
  linearRegression,
  sum,
  minmax,
  normalize,
  movingAverage,
  ema,
} from "./math";

// --- string-utils ---
export {
  isBlank,
  isPresent,
  collapseWhitespace,
  stripDiacritics,
  escapeRegex,
  escapeHtmlEntities,
  unescapeHtmlEntities,
  toCamelCaseString,
  toPascalCaseString,
  toKebabCaseString,
  toSnakeCaseString,
  capitalizeWords,
  smartTruncate,
  repeatWithSeparator,
  centerPad,
  isAscii,
  looksLikeEmail,
  looksLikeUrl,
  extractNumbers,
  replaceMultiple,
  stringToId,
  countOccurrences,
  reverseWords,
  trimLines,
  detectCase,
  slugify,
  levenshtein,
  isSimilar,
  soundex,
  randomString,
  randomHex,
  generateId,
  wordCount,
  charFrequency,
  mostCommonChars,
  uniqueWords,
  pluralize,
  singularize,
  acronym,
  abbreviate,
  maskString,
  maskEmail,
  detectIndentation,
  indentText,
  simpleDiff,
} from "./string-utils";
export type { DiffSegment, DateFormatOptions as _StrDateFormatOptions, RelativeTimeOptions as _StrRelativeTimeOptions } from "./string-utils";

// --- date-utils ---
export {
  formatDate,
  toISODate,
  toISODatetime,
  formatTime,
  relativeTime,
  shortRelativeTime,
  parseDate,
  formatDuration,
  parseDuration,
  isLeapYear,
  daysInMonth,
  getDayOfWeek,
  getWeekNumber,
  getQuarter,
  isSameDay,
  isToday,
  isYesterday,
  isBetween,
  addTime,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getTimezone,
  getTimezoneOffset,
  convertToTimezone,
} from "./date-utils";
export type { DateFormatOptions, RelativeTimeOptions } from "./date-utils";

// --- array-utils ---
export {
  chunkArray,
  splitAt,
  partitionArray,
  slidingWindow,
  groupConsecutive,
  deepFlatten,
  uniqueBy,
  intersectArrays,
  differenceArrays,
  symmetricDifference,
  rotateArray,
  sampleArray,
  shuffleArray,
  zipArrays,
  fillArray,
  argMin,
  argMax,
} from "./array-utils";

// --- number-utils ---
export {
  clampNumber,
  lerpNumber,
  mapRangeNumber,
  roundTo,
  roundToMultiple,
  floorToMultiple,
  ceilToMultiple,
  formatBytesAuto,
  formatCompactNumber,
  formatWithSeparators,
  percentChange,
  approximatelyEqual,
  randomIntInRange,
  randomFloatInRange,
  normalizeAngleDeg,
  normalizeAngleRad,
  degToRad,
  radToDeg,
  gcd,
  lcm,
  isInRange,
  wrapNumber,
} from "./number-utils";

// --- object-utils ---
export {
  deepClone,
  shallowClone,
  pick,
  omit,
  deepMerge,
  get as objGet,
  set as objSet,
  has as objHas,
  unset,
  mapValues,
  mapKeys,
  filterEntries,
  invert,
  deepEqual,
  allKeys,
  isEmpty as objIsEmpty,
  size as objSize,
  deepFreeze,
  groupBy,
  countBy,
  indexBy,
  values as objValues,
  keys as objKeys,
  toPairs,
  fromPairs,
  defaults,
  ensurePath,
} from "./object-utils";

// --- url-utils ---
export {
  parseUrl,
  buildUrlFromParts,
  updateSearchParams,
  removeSearchParams,
  getQueryParams,
  isSameOrigin,
  normalizeUrl,
  isAbsoluteUrl,
  makeAbsoluteUrl,
  getDomainFromUrl,
  getPathnameFromUrl,
  joinPathSegments,
  encodeUriComponentSafe,
  decodeUriComponentSafe,
  urlsEqual,
} from "./url-utils";
export type { ParsedUrl } from "./url-utils";

// --- async-utils ---
export {
  retry,
  withTimeoutPromise,
  poll,
  runWithConcurrency,
  memoizeAsync,
  memoize,
  createDeferred,
  asyncIterate,
  batchProcess,
  allSuccessful,
  allOrThrow,
} from "./async-utils";
export type { RetryOptions, PollOptions, ConcurrencyOptions, MemoizeOptions } from "./async-utils";

// --- validation ---
export {
  GenerateDiffSchema,
  CreateFrictionSchema,
  CreatePRSchema,
  VoteSchema,
  validateBody,
} from "./validation";
export type { GenerateDiffInput, CreateFrictionInput, CreatePRInput, VoteInput } from "./validation";

// --- logger ---
export { Logger, log, apiLog, dbLog, extLog, setGlobalLogLevel, getGlobalLogLevel } from "./logger";
export type { LogLevel } from "./logger";

// --- id-generator ---
export {
  uuid,
  uuidShort,
  uuidPrefixed,
  nanoid,
  nanoIdShort,
  createSequentialGenerator,
  snowflake,
  cuid,
  ulid,
  objectId,
  hashId,
  slugId,
} from "./id-generator";

// --- crypto-utils ---
export {
  sha1,
  sha256,
  sha384,
  sha512,
  hash as cryptoHash,
  hashHex,
  hmac,
  hmacHex,
  pbkdf2,
  deriveAesKey,
  generateAesKey,
  aesGcmEncrypt,
  aesGcmDecrypt,
  aesGcmEncryptString,
  aesGcmDecryptString,
  generateRsaOaepKeyPair,
  rsaOaepEncrypt,
  rsaOaepDecrypt,
  generateEcdsaKeyPair,
  ecdsaSign,
  ecdsaVerify,
  generateRsaPssKeyPair,
  rsaPssSign,
  rsaPssVerify,
  exportKey as exportCryptoKey,
  importKey as importCryptoKey,
  keyFingerprint,
  generateEcdhKeyPair,
  ecdhDeriveSecret,
  ecdhDeriveAesKey,
  randomBytes,
  secureRandomInt,
  secureRandomUuid,
  secureRandomString,
  toBase64,
  fromBase64,
  toBase64Url,
  fromBase64Url,
  toHex,
  fromHex,
  encodeUtf8,
  decodeUtf8,
  estimatePasswordStrength,
  generatePassword,
  generateTokenHex,
  generateTokenBase64Url,
  generateApiKey,
  generateSessionId,
} from "./crypto-utils";
export type {
  HashAlgorithm,
  HmacAlgorithm,
  AesKeyLength,
  EcNamedCurve,
  RsaKeySize,
  KeyFormat,
  Pbkdf2Options,
  AesGcmOptions,
  RsaKeyGenOptions,
  EcdsaKeyGenOptions,
  RsaPssSignOptions,
  PasswordStrengthResult,
  PasswordGeneratorOptions,
  ApiKeyOptions,
  AesGcmEncryptedData,
} from "./crypto-utils";

// --- encoding ---
export {
  base64Encode,
  base64Decode,
  safeEncode,
  safeDecode,
  unicodeEscape,
  unicodeUnescape,
  encodeQuery,
  xorCipher,
  xorDecipher,
  simpleHash,
  truncateMiddle,
} from "./encoding";

// --- type-guards ---
export {
  isNil,
  isNotNil,
  isString,
  isNonEmptyString,
  isNumber,
  isInteger,
  isFiniteNumber,
  isFloat,
  isBoolean,
  isSymbol,
  isBigInt,
  isFunction,
  isPlainObject,
  isObject,
  isArray,
  isNonEmptyArray,
  isDate,
  isValidDate,
  isRegExp,
  isError,
  isMap,
  isSet,
  isWeakMap,
  isWeakSet,
  isArrayBuffer,
  isArrayBufferView,
  isPromise,
  isPositive,
  isNegative,
  isZero,
  isInRange,
  isEven,
  isOdd,
  isEmailLike,
  isUrlLike,
  isJsonString,
  isBlankString,
  isHexColor,
  isRgbColorString,
  isEmpty as typeIsEmpty,
  hasContent,
  hasProperty,
  isInstanceOf,
  isArrayOfStrings,
  isArrayOfNumbers,
  isArrayOfObjects,
  isCompactArray,
  assertType,
  expectType,
} from "./type-guards";

// --- function-utils ---
export {
  memoize,
  memoizeOne,
  once,
  compose,
  pipe,
  curry,
  partial,
  partialRight,
  retry as fnRetry,
  withTimeout,
  timeoutSync,
  promisify,
  ary,
  unary,
  noop,
  constant,
  identity,
  K,
  flip,
  not,
  guard,
  spread,
  gather,
  tap,
  thru,
  time,
  timeAsync,
} from "./function-utils";
export type { RetryOptions as FnRetryOptions } from "./function-utils";

// --- regex-utils ---
export {
  RegexBuilder,
  PATTERNS,
  testRegex,
  matchesPattern,
  extractAll,
  extractFirst,
  replaceWith,
  replaceTemplate,
  analyzePerformance,
  escapeRegexChars,
  unescapeRegexChars,
} from "./regex-utils";
export type { RegexTestResult, RegexPerformance } from "./regex-utils";

// --- observer ---
export {
  Observable,
  ComputedValue,
  ReactiveStore,
  watch,
  type Unsubscribe as ObserverUnsubscribe,
  type Subscriber,
  type StoreState,
  type StoreOptions,
  type WatchOptions,
} from "./observer";

// --- pub-sub ---
export {
  PubSub,
  createPubSub,
  type MessageHandler,
  type TopicPattern,
  type Message,
  type Subscription,
  type PubSubOptions,
  type PubSubStats,
} from "./pub-sub";

// --- queue ---
export {
  AsyncQueue,
  RateLimiter,
  BatchingQueue,
  type QueueTask,
} from "./queue";

// --- cache ---
export {
  Cache,
  defaultCache,
  memoize as cacheMemoize,
  type CacheOptions,
} from "./cache";

// --- scheduler ---
export {
  Scheduler,
  parseCronExpression,
  cronMatches,
  getNextCronRun,
  type ScheduledJob,
  type JobStatus,
  type CronExpression,
} from "./scheduler";

// --- stream ---
export {
  Stream,
  Subject,
  BehaviorSubject,
  ReplaySubject,
  type Observer as StreamObserver,
  type Subscription as StreamSubscription,
  type StreamSubscriber,
  type OperatorFunction,
  type TeardownLogic,
} from "./stream";

// --- virtual-list ---
export {
  createVirtualList,
  type VirtualListItem,
  type VirtualListOptions,
  type VirtualListInstance,
} from "./virtual-list";

// --- tree ---
export {
  createTreeNode,
  buildTree,
  flattenTree,
  flattenTreeWithDepth,
  findNodeById,
  findNodes,
  getPathToNode,
  getTreeDepth,
  countNodes,
  mapTree,
  filterTree,
  type TreeNode,
} from "./tree";

// --- graph ---
export {
  Graph,
  type GraphNode,
  type GraphEdge,
} from "./graph";

// --- permission ---
export {
  hasPermission,
  hasRoleLevel,
  getPermissions,
  ACL,
  appACL,
  type Role,
  type Permission,
} from "./permission";

// --- rate-limit ---
export {
  TokenBucket,
  SlidingWindowLimiter,
  FixedWindowLimiter,
  AdaptiveLimiter,
  createRateLimiter,
  type RateLimitResult,
  type RateLimitOptions,
  type AdaptiveOptions,
  type CreateRateLimiterOptions,
  type RateLimiterType,
} from "./rate-limit";

// --- circuit-breaker ---
export {
  CircuitBreaker,
  createCircuitBreaker,
  type CircuitState,
  type CircuitBreakerConfig,
  type CircuitBreakerStats,
} from "./circuit-breaker";

// --- feature-flags ---
export {
  FeatureFlagStore,
  featureFlags,
  isFeatureEnabled,
  DEFAULT_FLAGS,
  type FeatureFlag,
  type FlagContext,
} from "./feature-flags";

// --- metrics ---
export {
  MetricsCollector,
  PerformanceObserver,
  measureWebVitals,
  perfMark,
  perfMeasure,
  type MetricValue,
  type HistogramBucket,
} from "./metrics";

// --- lock ---
export {
  Mutex,
  Semaphore,
  ReadWriteLock,
  SpinLock,
  type LockOptions,
} from "./lock";

// --- diff-engine ---
export {
  computeDiff,
  parseUnifiedDiff,
  applyDiff,
  applyJsonPatch,
  threeWayMerge,
  type DiffHunk,
  type DiffLine,
  type UnifiedDiff,
  type TextDiffResult,
  type JsonPatchOp,
  type MergeResult,
} from "./diff-engine";

// --- template-engine ---
export {
  TemplateEngine,
  registerBuiltinHelpers,
  createTemplateEngine,
  renderTemplate,
  unescapeHtml,
  type TemplateContext,
  type TemplateOptions,
  type TemplateError,
  type PartialTemplate,
  type HelperFunction,
} from "./template-engine";

// --- markdown ---
export {
  mdToHtml,
  stripMd,
} from "./markdown";

// --- notification ---
export {
  NotificationManager,
  getNotificationManager,
  toast,
  type Notification,
  type NotificationType,
  type NotificationOptions,
  type NotificationPosition,
} from "./notification";

// --- websocket ---
export {
  WebSocketManager,
  WsRoomManager,
  isWebSocketSupported,
  getWebSocketUrl,
  createWebSocketUrl,
  parseWsUrl,
  type WsEvent,
  type WebSocketData,
  type WebSocketState,
  type WebSocketStats,
  type ReconnectConfig,
  type HeartbeatConfig,
  type WebSocketOptions,
} from "./websocket";

// --- worker ---
export {
  createInlineWorker,
  runInWorker,
  TaskQueue,
  BatchingProcessor,
  requestIdleCallback,
  cancelIdleCallback,
} from "./worker";

// --- undo-redo ---
export {
  UndoHistory,
  type UndoItem,
  type UndoBranch,
  type UndoState,
  type UndoHistoryOptions,
  type UndoChangeListener,
} from "./undo-redo";

// --- clipboard-api ---
export {
  ClipboardAPI,
  requestClipboardPermission,
  copyToClipboard,
  readFromClipboard,
  copyElement,
  copyElementRich,
  type ClipboardFormat,
  type ClipboardItemData,
  type ClipboardResult,
  type ClipboardOptions,
  type ClipboardPermissionState,
  type ClipboardHistoryEntry,
} from "./clipboard-api";

// --- file-system ---
export {
  VirtualFileSystem,
  type VfsEntry,
  type FileType,
  type WatchEventType,
  type WatchEvent,
  type FileSystemOptions,
  type FileSystemStats,
  type SearchResult,
  type TreeViewNode,
} from "./file-system";

// --- theme ---
export {
  ThemeManager,
  getThemeManager,
  useTheme,
  LIGHT_THEME,
  DARK_THEME,
  BUILT_IN_THEMES,
  type ThemeConfig,
  type ThemeColors,
} from "./theme";

// --- accessibility ---
export {
  progressBarAttrs,
  switchAttrs,
  liveRegion,
  announce,
  skipLinkAttrs,
  SKIP_LINK_ID,
  prefersReducedMotion,
  animationDuration,
  focusTrap,
  srOnly,
  ROLES,
} from "./accessibility";

// --- gesture ---
export {
  GestureManager,
  createGesture,
  swipeGestures,
  tapGesture,
  type GestureType,
  type SwipeDirection,
  type GestureConfig,
  type GestureHandlerConfig,
  type GestureEvent,
  type GestureInstance,
  type Point,
} from "./gesture";

// --- form-builder ---
export {
  FormBuilder,
  createForm,
  validations,
  type FieldType,
  type FormField,
  type FormSchema,
  type FormSection,
  type FieldValidation,
  type SelectOption,
  type FieldError,
  type FormState,
} from "./form-builder";

// --- table ---
export {
  createTableState,
  getSortedData,
  getFilteredData,
  getPaginatedData,
  getCellValue,
  applyFilterOperator,
  toggleSort,
  setSearchTerm,
  toggleFilter,
  goToPage,
  setPageSize,
  toggleRowSelection,
  toggleSelectAll,
  toggleRowExpand,
  resetTable,
  exportTableAsCsv,
  type Column,
  type TableState,
  type SortState,
  type FilterState,
  type PaginationState,
  type SelectionState,
  type FilterOperator,
} from "./table";

// --- chart ---
export {
  ChartManager,
  createChart,
  type ChartType,
  type ChartDataPoint,
  type ChartDataset,
  type ChartOptions,
  type ChartInstance,
} from "./chart";

// --- command-palette ---
export {
  CommandPalette,
  type Command,
  type CommandCategory,
  type CommandPaletteConfig,
  type CommandPaletteState,
} from "./command-palette";

// --- search ---
export {
  searchText,
  searchArray,
  highlightMatches,
  SearchIndex,
  type SearchOptions,
  type SearchResult,
  type SearchMatch,
} from "./search";

// --- drag-resize ---
export {
  DragResizeManager,
  makeDragResizable,
  type DragResizeOptions,
  type DragResizeInstance,
  type Point as DragPoint,
  type Bounds,
} from "./drag-resize";

// --- i18n-advanced ---
export {
  I18nManager,
  createI18n,
  i18n,
  t,
  type LocaleCode,
  type LocaleConfig,
  type PluralRule,
  type MessageCatalog,
  type I18nOptions,
} from "./i18n-advanced";

// --- css-grid ---
export {
  repeat,
  fixedGrid,
  autoFitGrid,
  autoFillGrid,
  masonryGrid,
  minmax,
  flexible,
  MINMAX,
  normalizeGap,
  uniformGap,
  asymmetricGap,
  defineAreas,
  layout12Area,
  holyGrail,
  generateGridStyles,
  applyGrid,
  responsiveGrid,
  BREAKPOINTS,
  mediaQuery,
  adaptiveGrid,
  type GridTemplate,
  type GridOptions,
  type GridStyles,
} from "./css-grid";

// --- animation-library ---
export {
  // Easing functions
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
  // Core engine
  animate,
  springAnimate,
  staggerAnimate,
  Timeline,
  animatePath,
  // Keyframes & utilities
  KEYFRAMES,
  playAnimation,
  type EasingFunction,
  type AnimationOptions,
  type SpringOptions,
  type StaggerOptions,
  type StaggerPattern,
  type KeyframeDefinition,
  type KeyframesMap,
  type PlayAnimationOptions,
} from "./animation-library";

// --- color-utils ---
export {
  parseColor,
  requireColor,
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToHsl,
  toHexString,
  toRgbString,
  toHslString,
  lighten,
  darken,
  saturate,
  desaturate,
  rotateHue,
  setOpacity,
  mix,
  invert,
  luminance,
  contrastRatio,
  meetsAA,
  meetsAAA,
  contrastingText,
  minAlphaForContrast,
  generatePalette,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  generateScheme,
  linearGradient,
  radialGradient,
  gradientBetween,
  shimmerGradient,
  colorTemperature,
  isWarmColor,
  hueCategory,
  cssVariablesFromPalette,
  generateDesignTokens,
  type RGB,
  type HSL,
  type HSV,
  type ColorStop,
  type ColorPalette,
} from "./color-utils";

// --- dom-utils ---
export {
  getComputedStyleValue,
  getElementRect,
  isInViewport,
  getVisibilityPercent,
  scrollIntoViewCentered,
  measureText,
  closestAncestor,
  getAncestors,
  insertAfter,
  replaceElement,
  containsOrIs,
  getFocusableElements,
  createFocusTrap,
} from "./dom-utils";

// --- math-helpers ---
export {
  clamp,
  lerp,
  inverseLerp,
  mapRange,
  roundTo,
  roundToStep,
  snapToGrid,
  approxEqual,
  isInRange,
  sign,
  randomFloat,
  randomInt,
  randomPick,
  shuffle,
  shuffled,
  weightedRandom,
  uniqueRandomInts,
  createSeededRandom,
  mean,
  median,
  mode,
  stdDev,
  variance,
  percentile,
  sum,
  product,
  minMax,
  normalize,
  distance2D,
  distance3D,
  angleBetween,
  midpoint2D,
  rotatePoint,
  pointInRect,
  pointInCircle,
  polygonArea,
  polygonCentroid,
  boundingBox,
  formatNumber,
  abbreviateNumber,
  parseFormattedNumber,
  formatBytes,
  formatDuration,
  smoothstep,
  smootherstep,
  catmullRomSpline,
  cubicBezier,
  quadraticBezier,
  linearBezier,
  mat2Multiply,
  mat3Multiply,
  mat3Identity,
  mat3Translate,
  mat3Scale,
  mat3Rotate,
  transformPoint,
  det2,
  det3,
  invert2,
  TAU,
  PHI,
  EPSILON,
  DEG_TO_RAD,
  RAD_TO_DEG,
  degToRad,
  radToDeg,
  type Point2D,
  type Point3D,
  type Matrix2x2,
  type Matrix3x3,
} from "./math-helpers";

// --- string-utils ---
export {
  isBlank,
  isPresent,
  collapseWhitespace,
  stripDiacritics,
  escapeRegex,
  escapeHtmlEntities,
  unescapeHtmlEntities,
  toCamelCaseString,
  toPascalCaseString,
  toKebabCaseString,
  toSnakeCaseString,
  capitalizeWords,
  smartTruncate,
  repeatWithSeparator,
  centerPad,
  isAscii,
  looksLikeEmail,
  looksLikeUrl,
  extractNumbers,
  replaceMultiple,
  stringToId,
  countOccurrences,
  reverseWords,
  trimLines,
  detectCase,
  slugify,
  levenshtein,
  isSimilar,
  soundex,
  randomString,
  randomHex,
  generateId,
  wordCount,
  charFrequency,
  mostCommonChars,
  uniqueWords,
  pluralize,
  singularize,
  acronym,
  abbreviate,
  maskString,
  maskEmail,
  detectIndentation,
  indentText,
  simpleDiff,
  type DiffSegment,
} from "./string-utils";

// --- date-utils ---
export {
  formatDate,
  toISODate,
  toISODatetime,
  formatTime,
  relativeTime,
  shortRelativeTime,
  parseDate,
  formatDuration as formatDateDuration,
  parseDuration,
  isLeapYear,
  daysInMonth,
  getDayOfWeek,
  getWeekNumber,
  getQuarter,
  isSameDay,
  isToday,
  isYesterday,
  isBetween,
  addTime,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getTimezone,
  getTimezoneOffset,
  convertToTimezone,
  type DateFormatOptions,
  type RelativeTimeOptions,
} from "./date-utils";

// --- url-utils ---
export {
  parseUrl,
  buildUrlFromParts,
  updateSearchParams,
  removeSearchParams,
  getQueryParams,
  isSameOrigin,
  normalizeUrl,
  isAbsoluteUrl,
  makeAbsoluteUrl,
  getDomainFromUrl,
  getPathnameFromUrl,
  joinPathSegments,
  encodeUriComponentSafe,
  decodeUriComponentSafe,
  urlsEqual,
  type ParsedUrl,
} from "./url-utils";

// --- storage-utils ---
export {
  StorageManager,
  createLocalStorage,
  createSessionStorage,
  createMemoryStore,
  type StorageBackend,
  type StorageEntry,
  type StorageOptions,
  type StorageStats,
  type StorageMigration,
} from "./storage-utils";

// --- event-bus ---
export {
  EventBus,
  createEventBus,
  type EventCallback,
  type EventMiddleware,
  type Subscription,
  type EmittedEvent,
  type EventBusOptions,
} from "./event-bus";

// --- state-machine ---
export {
  FSM,
  HSM,
  createMachine,
  interpret,
  match,
  stateEquals,
  evaluateChoice,
  evaluateJunction,
  deepHistoryTarget,
  shallowHistoryTarget,
  type StateId,
  type EventId,
  type MachineContext,
  type EventPayload,
  type GuardFn,
  type ActionFn,
  type StateListener,
  type InvalidEventStrategy,
  type TransitionTarget,
  type TransitionDef,
  type StateConfig,
  type HistoryMode,
  type MachineConfig,
  type ChoiceConfig,
  type JunctionConfig,
  type StateValue,
  type TransitionHistoryEntry,
  type Service,
  type Machine,
  type StateConfigAlias,
  type TransitionAlias,
} from "./state-machine";

// --- validation ---
export {
  GenerateDiffSchema,
  CreateFrictionSchema,
  CreatePRSchema,
  VoteSchema,
  validateBody,
  type GenerateDiffInput,
  type CreateFrictionInput,
  type CreatePRInput,
  type VoteInput,
} from "./validation";

// --- keyboard ---
export {
  KeyboardManager,
  createKeyboardManager,
  formatShortcut,
  matchesShortcut,
  type KeyBinding,
  type KeyChord,
  type KeyboardManagerOptions,
  type KeyboardManagerInstance,
} from "./keyboard";

// --- cursor ---
export {
  trackCursor,
  getCursorPosition,
  setCustomCursor,
  setCursorStyle,
  hideCursor,
  createCursorTrail,
  hideCursorOnIdle,
  isNearCursor,
  getCursorRelativeTo,
  constrainToElement,
  type CursorPosition,
  type CursorTrailOptions,
  type CustomCursorOptions,
  type CursorTrackerOptions,
} from "./cursor";

// --- scroll-utils ---
export {
  getScrollPosition,
  setScrollPosition,
  scrollTo,
  scrollToElement,
  scrollToTop,
  scrollToBottom,
  trackScroll,
  createScrollSpy,
  createInfiniteScroll,
  createParallax,
  lockScroll,
  createProgressBar,
  isAtTop,
  isAtBottom,
  getScrollPercent,
  type ScrollPosition,
  type ScrollSpyOptions,
  type InfiniteScrollOptions,
  type ParallaxOptions,
  type ScrollLockOptions,
} from "./scroll-utils";

// --- resize-observer ---
export {
  ResizeWatcher,
  createResizeObserver,
  matchParentSize,
  whenSizeExceeds,
  type ResizeBox,
  type ResizeObserverOptions as ResizeObsOptions,
  type ResizeObserverEntry as ResizeObsEntry,
  type ResizeObserverInstance as ResizeObsInstance,
} from "./resize-observer";

// --- intersection ---
export {
  IntersectionManager,
  createIntersectionObserver,
  whenVisible,
  whenHidden,
  isInViewport as isElementInViewport,
  getVisibilityPercent as getElementVisibilityPercent,
  type IntersectionObserverOptions as IntersectionObsOptions,
  type IntersectionObserverEntry as IntersectionObsEntry,
  type IntersectionObserverInstance as IntersectionObsInstance,
} from "./intersection";

// --- mutation-observer ---
export {
  MutationWatcher,
  createMutationObserver,
  waitForElement,
  waitForRemoval,
  type MutationFilter,
  type MutationObserverOptions as MutationObsOptions,
  type SimplifiedMutationRecord,
  type MutationObserverInstance as MutationObsInstance,
} from "./mutation-observer";

// --- performance ---
export {
  reportMetric,
  getSessionMetrics,
  observeWebVitals,
  markRender,
  type PerformanceMetric,
} from "./performance";

// --- device ---
export {
  detectOS,
  detectBrowser,
  isTouchDevice,
  getDeviceType,
  getDeviceInfo,
  isIOS,
  isAndroid,
  isMobileDevice,
  isTabletDevice,
  isDesktopDevice,
  isSafari,
  isFirefox,
  isChrome,
  isEdge,
  getDeviceMemory,
  getCPUCores,
  isDataSaver,
  getConnectionQuality,
  isHiDPI,
  getSafeAreaInsets,
  type OSType,
  type BrowserType,
  type DeviceType,
  type DeviceInfo,
} from "./device";

// --- hotkeys ---
export {
  HotkeyManager,
  createAppHotkeys,
  parseKeyCombo,
  eventMatchesCombo,
  formatKeyDisplay,
  areModifiersDown,
  getModifierString,
  type HotkeyBinding,
  type HotkeyEvent,
  type HotkeyListener,
  type ParsedKeyCombo,
} from "./hotkeys";

// --- context-menu ---
export {
  ContextMenuManager,
  type ContextMenuItem,
  type ContextMenuPosition,
  type ContextMenuOptions,
  type ContextMenuInstance,
} from "./context-menu";

// --- toast ---
export {
  ToastManager,
  getToastManager,
  showToast,
  type ToastType,
  type ToastPosition,
  type ToastOptions,
  type ToastInstance,
  type ToastManagerConfig,
} from "./toast";

// --- tooltip ---
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
  type TooltipPlacement,
  type TooltipTrigger,
  type TooltipOptions,
  type TooltipInstance,
} from "./tooltip";

// --- modal ---
export {
  createModal,
  type ModalSize,
  type ModalPosition,
  type ModalOptions,
  type ModalInstance,
} from "./modal";

// --- drawer ---
export {
  createDrawer,
  type DrawerSide,
  type DrawerSize,
  type DrawerOptions,
  type DrawerInstance,
} from "./drawer";

// --- drag-drop ---
export {
  createDropZone,
  readFileAsText,
  readFileAsDataURL,
  readFileAsArrayBuffer,
  getFileInfo,
  createSortableList as createDndSortableList,
  type DragItem,
  type DropZoneConfig,
  type DndState,
  type DropZoneController,
  type SortableItem as DndSortableItem,
  type SortableConfig as DndSortableConfig,
  type SortableController as DndSortableController,
  type FileInfo,
} from "./drag-drop";

// --- sortable ---
export {
  SortableList,
  createSortable,
  type SortableOptions,
  type SortableInstance,
} from "./sortable";

// --- copy-paste ---
export {
  copyText,
  copyHtml,
  copyImage,
  copyElementContent,
  copy,
  readClipboardText,
  extractPasteData,
  pushToHistory,
  getClipboardHistory,
  searchHistory,
  clearHistory,
  checkClipboardPermission,
  requestClipboardPermission,
  type CopyOptions,
  type PasteEvent,
  type ClipboardHistoryEntry,
} from "./copy-paste";

// --- print ---
export {
  PrintManager,
  createPrintManager,
  quickPrint,
  addPageBreakBefore,
  addPageBreakAfter,
  avoidBreakInside,
  type PrintOptions,
  type PrintManagerInstance,
} from "./print";

// --- pdf-utils ---
export {
  generatePdfFromHtml,
  elementToPdf,
  estimatePrintPages,
  downloadBlob,
  blobToDataUrl,
  dataUrlToBlob,
  printElement,
  type PdfGenerationOptions,
  type PdfPageInfo,
  type TextMetrics,
} from "./pdf-utils";

// --- csv ---
export {
  parseCsv,
  generateCsv,
  csvToHtmlTable,
  type CsvOptions,
} from "./csv";

// --- overlay ---
export {
  OverlayProvider,
  openModal,
  openDrawer,
  openConfirm,
  openAlert,
  closeAllOverlays,
} from "./overlay";
export type {
  OverlayOptions,
  OverlayInstance,
  OverlayType,
} from "./overlay";

// --- split-view ---
export {
  createSplitView,
  createHorizontalSplit,
  createVerticalSplit,
} from "./split-view";
export type {
  SplitDirection,
  PaneConfig,
  SplitViewOptions,
  SplitViewState,
  SplitViewInstance,
} from "./split-view";

// --- skeleton ---
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
} from "./skeleton";
export type {
  SkeletonOptions,
  SkeletonTextOptions,
  SkeletonAvatarOptions,
  SkeletonCardOptions,
  SkeletonTableOptions,
} from "./skeleton";

// --- form-utils ---
export {
  createForm,
  serializeForm,
  populateForm,
  clearForm,
  createMultiStepForm,
  evaluateConditionals,
  linkErrorToField,
  unlinkErrorFromField,
  createFormAnnouncer,
} from "./form-utils";
export type {
  FormFieldConfig,
  FormValidationRule,
  FormFieldState,
  FormOptions,
  FormInstance,
  StepConfig,
  MultiStepFormOptions,
  MultiStepFormInstance,
  ConditionRule,
  ConditionalField,
} from "./form-utils";

// --- virtual-list ---
export { createVirtualList } from "./virtual-list";
export type {
  VirtualListItem,
  VirtualListOptions,
  VirtualListInstance,
} from "./virtual-list";

// --- tree-view ---
export { TreeView } from "./tree-view";
export type {
  TreeNodeData,
  TreeNode,
  CheckMode,
  TreeViewConfig,
} from "./tree-view";

// --- chart-utils ---
export {
  calculateAxisScale,
  formatAxisLabel,
  valueToPixel,
  pixelToValue,
  aggregateByInterval,
  movingAverage,
  calculatePercentChanges,
  findExtrema,
  generateChartColors,
  interpolateColor,
  getDataStats,
} from "./chart-utils";
export type {
  DataPoint,
  DataSeries,
  ChartConfig,
  AxisScale,
  DataStats,
  ColorPaletteName,
} from "./chart-utils";

// --- markdown ---
export { mdToHtml, stripMd } from "./markdown";
export type { MdOptions } from "./markdown";

// --- syntax-highlight ---
export {
  highlightCode,
  highlightToHtml,
  registerLanguage,
  registerTheme,
  getAvailableLanguages,
  getAvailableThemes,
} from "./syntax-highlight";
export type {
  HighlightOptions,
  HighlightTheme,
  Token,
  TokenType,
} from "./syntax-highlight";

// --- undo-redo ---
export { UndoHistory } from "./undo-redo";
export type {
  UndoItem,
  UndoBranch,
  UndoHistoryOptions,
  UndoState,
  UndoChangeListener,
} from "./undo-redo";

// --- debounce-throttle ---
export {
  Debounced,
  Throttled,
  debounce,
  throttle,
  debouncePromise,
  rafThrottle,
  idleThrottle,
} from "./debounce-throttle";
export type {
  DebounceOptions,
  ThrottleOptions,
  RateLimitStats,
} from "./debounce-throttle";

// --- promise-utils ---
export {
  retry,
  withTimeout,
  sleep,
  runConcurrent,
  processInBatches,
  raceSuccess,
  firstN,
  makeCancellable,
  collectAsync,
  mapAsyncIterable,
  filterAsyncIterable,
  reduceAsyncIterable,
  memoizeAsync,
  createDeferred,
  createOnceEvent,
  poll,
  TaskQueue,
} from "./promise-utils";
export type {
  RetryOptions,
  TimeoutOptions,
  ConcurrencyOptions,
  BatchOptions,
  MemoizeOptions,
  PollOptions,
  TaskQueueOptions,
} from "./promise-utils";

// --- i18n ---
export {
  t,
  getLocale,
  setLocale,
  LOCALE_CHANGE_EVENT,
} from "./i18n";
export type { Locale } from "./i18n";

// --- logger ---
export {
  Logger,
  log,
  apiLog,
  dbLog,
  extLog,
  setGlobalLogLevel,
  getGlobalLogLevel,
} from "./logger";
export type { LogLevel } from "./logger";

// --- cache ---
export {
  Cache,
  defaultCache,
  memoize as cacheMemoize,
} from "./cache";
export type { CacheOptions } from "./cache";

// --- image-utils ---
export {
  getImageDimensions,
  loadImage,
  imageToCanvas,
  resizeImage,
  cropImage,
  applyFilters,
  convertFormat,
  generateThumbnail,
  compressImage,
  getDominantColor,
  getAverageColor,
  createCollage,
  addWatermark,
  detectOrientation,
  getAspectRatio,
  fileToDataUrl,
  fileToArrayBuffer,
  downloadImage,
  formatFileSize as imageFormatSize,
  isValidImageType,
  getExifOrientation,
} from "./image-utils";
export type {
  ImageDimensions,
  ImageProcessingOptions,
  CropRegion,
  FilterOptions,
} from "./image-utils";

// --- file-utils ---
export {
  MIME_MAP,
  getMimeType,
  getExtension,
  getBaseName,
  categorizeFile,
  isFileType,
  FILE_EXTENSIONS,
  validateFile,
  validateFiles,
  sanitizeFilename,
  uniqueFilename,
  formatBytes,
  formatFileSizeShort,
  getFileIcon,
  parseDropEvent,
  setupDropZone,
  readFileAsText,
  readFileAsDataURL,
  readFileAsArrayBuffer,
  readFileAsBinaryString,
  readFileHeader,
  splitFileIntoChunks,
  UploadTracker,
} from "./file-utils";
export type {
  FileCategory,
  FileValidationOptions,
  FileValidationError,
  DropEvent,
  FileChunk,
  UploadProgress,
} from "./file-utils";

// --- network-utils ---
export {
  getNetworkStatus,
  onNetworkChange,
  isSlowConnection,
  isDataSaverEnabled,
  fetchWithRetry,
  RequestQueue,
  syncWhenOnline,
  processOfflineQueue,
  BandwidthEstimator,
  ConnectionHealthChecker,
} from "./network-utils";
export type {
  NetworkStatus,
  RetryOptions as NetworkRetryOptions,
  RequestQueueItem,
} from "./network-utils";

// --- accessibility ---
export {
  progressBarAttrs,
  switchAttrs,
  liveRegion,
  announce,
  SKIP_LINK_ID,
  skipLinkAttrs,
  prefersReducedMotion,
  animationDuration as a11yAnimationDuration,
  focusTrap,
  srOnly,
  ROLES,
} from "./accessibility";

// --- motion ---
export {
  MotionValueImpl,
  motionValue,
  Spring,
  createSpring,
  inertia,
  lerp,
  interpolate,
  clamp as motionClamp,
  mapRange,
} from "./motion";
export type {
  SpringConfig,
  SpringState,
  MotionValue,
  MotionTransitionOptions,
  InertiaOptions,
} from "./motion";

// --- theme-engine ---
export {
  ThemeEngine,
  getThemeEngine,
  setTheme,
  toggleTheme,
  getCurrentTheme,
  isDarkMode,
} from "./theme-engine";
export type {
  ThemeMode,
  DesignToken,
  TokenCategory,
  ThemeDefinition,
  ThemeEngineOptions,
} from "./theme-engine";

// --- dom-observer ---
export {
  DomObserverManager,
  takeSnapshot,
  compareSnapshots,
  createRouteChangeDetector,
  createLazyLoader,
} from "./dom-observer";
export type {
  ObserveTarget,
  MutationOptions,
  IntersectionOptions,
  ResizeOptions,
  MutationRecordEx,
  DomSnapshot,
  ObserverCallbacks,
  ObserverStats,
} from "./dom-observer";

// --- layout-utils ---
export {
  getRect,
  getPositionInDocument,
  getOffsetPosition,
  getLayoutMetrics,
  positionElement,
  centerElement,
  alignChildren,
  getViewportSize,
  getVisualViewport,
  isInViewport as layoutIsInViewport,
  findScrollParent,
  scrollIntoViewIfNeeded,
  gridTemplateColumns,
  applyMasonryLayout,
  constrainToContainer,
  fillRemainingSpace,
  getElementBreakpoint,
  setResponsiveDisplay,
} from "./layout-utils";
export type { Rect, Position, Alignment, LayoutMetrics } from "./layout-utils";

// --- css-in-js ---
export {
  injectStyle,
  removeStyle,
  updateStyle,
  setCssVar,
  getCssVar,
  setCssVars,
  getRootVar,
  setRootVar,
  getCurrentBreakpoint,
  isMinWidth,
  isMaxWidth,
  onBreakpointChange,
  isMobile,
  isTablet,
  isDesktop,
  getDevicePixelRatio,
  isRetina,
  mq,
  mediaQueries,
  matchesMedia,
  subscribeMedia,
  isDarkMode as cssIsDarkMode,
  isLightMode,
  toggleDarkMode,
  setDarkMode as cssSetDarkMode,
  onDarkModeChange,
  buildKeyframes,
  registerKeyframes,
  animations,
  animate,
  toggleClass,
  classIf,
  setClasses,
  hasAnyClass,
  bringToFront,
  sendToBack,
} from "./css-in-js";
export type { Breakpoints } from "./css-in-js";

// --- notification ---
export {
  NotificationManager,
  getNotificationManager,
  toast,
} from "./notification";
export type {
  Notification,
  NotificationOptions,
  NotificationType,
  NotificationPosition,
} from "./notification";

// --- badge ---
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";
export type {
  BadgeOptions,
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  StatusDotOptions,
} from "./badge";

// --- avatar ---
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
} from "./avatar";
export type {
  AvatarOptions,
  AvatarSize,
  AvatarShape,
  AvatarGroupOptions,
} from "./avatar";

// --- progress ---
export {
  createProgressTracker,
  createMultiProgressTracker,
  formatProgress,
  createStepProgress,
} from "./progress";
export type {
  ProgressState,
  ProgressCallback,
  ProgressController,
  MultiProgressController,
  StepProgressController,
} from "./progress";

// --- skeleton-screen ---
export { createSkeletonScreen } from "./skeleton-screen";
export type { SkeletonScreenOptions, SkeletonScreenInstance, SkeletonLayout } from "./skeleton-screen";

// --- empty-state ---
export { EmptyStateManager, createEmptyState } from "./empty-state";
export type { EmptyStateOptions, EmptyStateInstance, EmptyStateVariant } from "./empty-state";

// --- command-palette ---
export { CommandPalette } from "./command-palette";

// --- quick-switcher ---
export { createQuickSwitcher } from "./quick-switcher";
export type { SwitcherItem, QuickSwitcherOptions, QuickSwitcherInstance } from "./quick-switcher";

// --- search-dialog ---
export { createSearchDialog } from "./search-dialog";
export type { SearchResult, SearchCategory, SearchDialogOptions, SearchDialogInstance } from "./search-dialog";

// --- autocomplete ---
export { AutocompleteManager, createAutocomplete } from "./autocomplete";
export type { AutocompleteOption, AutocompleteOptions, AutocompleteInstance } from "./autocomplete";

// --- typeahead ---
export { TypeaheadManager, createTypeahead } from "./typeahead";
export type { TypeaheadItem, TypeaheadOptions, TypeaheadInstance } from "./typeahead";

// --- tag-input ---
export { TagInputManager, createTagInput } from "./tag-input";
export type { TagItem, TagInputOptions, TagInputInstance } from "./tag-input";

// --- mention ---
export { MentionManager, createMention } from "./mention";
export type { MentionOption, MentionOptions, MentionInstance } from "./mention";

// --- color-picker ---
export { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, parseColor, getLuminance, getContrastRatio, getWcagLevel, getContrastingText, complementary, analogous, triadic, splitComplementary, tetradic, monochromatic, blendColors, lighten, darken, saturate, desaturate, invertColor, withOpacity, generatePaletteAdvanced } from "./color-picker";
export type { RgbColor, HslColor, Palette } from "./color-picker";

// --- date-picker ---
export { DatePickerManager, createDatePicker } from "./date-picker";
export type { DatePickerOptions, DatePickerInstance } from "./date-picker";

// --- time-picker ---
export { createTimePicker } from "./time-picker";
export type { TimeFormat, TimePickerMode, TimePickerOptions, TimePickerInstance } from "./time-picker";

// --- range-slider ---
export { createRangeSlider } from "./range-slider";
export type { RangeSliderOptions, RangeSliderInstance } from "./range-slider";

// --- rating ---
export { RatingManager, createRating } from "./rating";
export type { StarIconType, RatingOptions, RatingInstance } from "./rating";

// --- toggle ---
export { ToggleManager, createToggle } from "./toggle";
export type { ToggleSize, ToggleVariant, ToggleOptions, ToggleInstance } from "./toggle";

// --- switch ---
export { createSwitch } from "./switch";
export type { SwitchSize, SwitchVariant, SwitchOptions, SwitchInstance } from "./switch";

// --- checkbox-group ---
export { createCheckboxGroup } from "./checkbox-group";
export type { CheckboxSize, CheckboxVariant, CheckboxOption, CheckboxGroupOptions, CheckboxGroupInstance } from "./checkbox-group";

// --- radio-group ---
export { createRadioGroup } from "./radio-group";
export type { RadioSize, RadioVariant, RadioOption, RadioGroupOptions, RadioGroupInstance } from "./radio-group";

// --- select-menu ---
export { createSelectMenu } from "./select-menu";
export type { SelectOption, SelectGroup, SelectMode, SelectMenuOptions, SelectMenuInstance } from "./select-menu";

// --- input-mask ---
export { InputMaskManager, createInputMask } from "./input-mask";
export type { MaskType, MaskOptions, MaskInstance } from "./input-mask";

// --- textarea-autosize ---
export { createTextareaAutosize } from "./textarea-autosize";
export type { TextareaAutosizeOptions, TextareaAutosizeInstance } from "./textarea-autosize";

// --- password-strength ---
export { createPasswordStrength } from "./password-strength";
export type { StrengthLevel, StrengthScore, PasswordStrengthOptions, PasswordStrengthInstance } from "./password-strength";

// --- file-upload ---
export { FileUploadManager, createFileUpload } from "./file-upload";
export type { FileUploadOptions, UploadFile, FileUploadInstance } from "./file-upload";

// --- context-menu ---
export { ContextMenuManager } from "./context-menu";
export type { ContextMenuItem, ContextMenuPosition, ContextMenuOptions, ContextMenuInstance } from "./context-menu";

// --- tooltip ---
export { TooltipManager, getTooltipManager, tooltip } from "./tooltip";
export type { TooltipPlacement, TooltipTrigger, TooltipOptions, TooltipInstance } from "./tooltip";

// --- popover ---
export { PopoverManager, createPopover } from "./popover";
export type { PopoverTrigger, PopoverPlacement, PopoverOptions, PopoverInstance } from "./popover";

// --- modal ---
export { createModal } from "./modal";
export type { ModalSize, ModalPosition, ModalOptions, ModalInstance } from "./modal";

// --- dialog ---
export { createDialog, alertDialog, confirmDialog, dangerDialog } from "./dialog";
export type { DialogVariant, DialogOptions, DialogInstance } from "./dialog";

// --- alert ---
export { AlertManager, createAlert } from "./alert";
export type { AlertVariant, AlertSize, AlertAction, AlertOptions, AlertInstance } from "./alert";

// --- drawer ---
export { createDrawer } from "./drawer";
export type { DrawerSide, DrawerSize, DrawerOptions, DrawerInstance } from "./drawer";

// --- sheet ---
export { createSheet } from "./sheet";
export type { SheetSnapPoint, SheetOptions, SheetInstance } from "./sheet";

// --- offcanvas ---
export { createOffcanvas, bindOffcanvas } from "./offcanvas";
export type { OffcanvasSide, OffcanvasMode, OffcanvasOptions, OffcanvasInstance } from "./offcanvas";

// --- accordion ---
export { AccordionManager, createAccordion } from "./accordion";
export type { AccordionItem, AccordionMode, AccordionOptions, AccordionInstance } from "./accordion";

// --- tabs ---
export { TabsManager, createTabs } from "./tabs";
export type { TabItem, TabOrientation, TabVariant, TabsOptions, TabsInstance } from "./tabs";

// --- collapse ---
export { CollapseManager, createCollapse, createCollapseGroup } from "./collapse";
export type { CollapseSize, CollapseVariant, CollapseOptions, CollapseInstance, CollapseGroupOptions, CollapseGroupInstance } from "./collapse";

// --- Breadcrumb ---
export {
  BreadcrumbManager,
  createBreadcrumb,
  type BreadcrumbItem,
  type BreadcrumbOptions,
  type BreadcrumbInstance,
} from "./breadcrumb";

// --- Pagination ---
export {
  PaginationManager,
  createPagination,
  type PaginationOptions,
  type PaginationInstance,
} from "./pagination";

// --- Skeleton Loader ---
export {
  createSkeleton,
  type SkeletonShape,
  type SkeletonAnimation,
  type SkeletonItem,
  type SkeletonOptions,
  type SkeletonInstance,
} from "./skeleton-loader";

// --- Progress Bar ---
export {
  createProgressBar,
  createCircleProgress,
  type ProgressBarOptions,
  type CircleProgressOptions,
  type ProgressVariant,
  type ProgressSize,
} from "./progress-bar";

// --- Spinner ---
export {
  createSpinner,
  miniSpinner,
  fullPageSpinner,
  type SpinnerOptions,
  type SpinnerVariant,
  type SpinnerSize,
} from "./spinner";

// --- Skeleton Screen ---
export {
  createSkeletonScreen,
  type SkeletonLayout,
  type SkeletonScreenOptions,
  type SkeletonScreenInstance,
} from "./skeleton-screen";

// --- Empty State ---
export {
  EmptyStateManager,
  createEmptyState,
  type EmptyStateOptions,
  type EmptyStateInstance,
  type EmptyStateVariant,
} from "./empty-state";

// --- Error Boundary ---
export {
  ErrorBoundaryManager,
  createErrorBoundary,
  type ErrorBoundaryOptions,
  type ErrorBoundaryInstance,
  type ErrorBoundaryError,
} from "./error-boundary";

// --- Infinite Scroll ---
export {
  InfiniteScroll,
  type InfiniteScrollOptions,
  type InfiniteScrollItem,
  type InfiniteScrollState,
} from "./infinite-scroll";

// --- Avatar ---
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
  type AvatarOptions,
  type AvatarGroupOptions,
  type AvatarSize,
  type AvatarShape,
} from "./avatar";

// --- Badge ---
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
  type BadgeOptions,
  type StatusDotOptions,
  type BadgeVariant,
  type BadgePosition,
  type BadgeSize,
} from "./badge";

// --- Chip ---
export {
  createChip,
  createChipGroup,
  type ChipOptions,
  type ChipInstance,
  type ChipGroupOptions,
  type ChipGroupInstance,
  type ChipSize,
  type ChipVariant,
} from "./chip";

// --- Divider ---
export {
  createDivider,
  hDivider,
  vDivider,
  labeledDivider,
  sectionDivider,
  type DividerOptions,
  type DividerOrientation,
  type DividerStyle,
} from "./divider";

// --- List ---
export {
  createList,
  type ListOptions,
  type ListInstance,
  type ListItem,
  type ListSelectionMode,
  type ListVariant,
} from "./list";

// --- Card ---
export {
  createCard,
  type CardOptions,
  type CardInstance,
  type CardVariant,
  type CardSize,
  type CardHeaderOptions,
  type CardImageOptions,
} from "./card";

// --- Statistic ---
export {
  StatManager,
  createStat,
  type StatOptions,
  type StatInstance,
  type TrendDirection,
  type StatVariant,
} from "./statistic";

// --- Hero Section ---
export {
  createHeroSection,
  type HeroOptions,
  type HeroInstance,
  type HeroLayout,
  type HeroHeight,
  type HeroButton,
} from "./hero-section";

// --- Footer ---
export {
  createFooter,
  type FooterOptions,
  type FooterInstance,
  type FooterLink,
  type FooterColumn,
  type SocialLink,
} from "./footer";

// --- Navbar ---
export {
  NavbarManager,
  createNavbar,
  type NavbarOptions,
  type NavbarInstance,
  type NavItem,
  type UserMenuConfig,
} from "./navbar";

// --- Sidebar ---
export {
  SidebarManager,
  createSidebar,
  type SidebarOptions,
  type SidebarInstance,
  type SidebarItem,
  type SidebarGroup,
} from "./sidebar";

// --- Aside ---
export {
  createAside,
  type AsideOptions,
  type AsideInstance,
  type AsidePosition,
  type AsideSize,
} from "./aside";

// --- Stepper ---
export {
  StepperManager,
  createStepper,
  type StepperOptions,
  type StepperInstance,
  type StepConfig,
  type StepStatus,
} from "./stepper";

// --- Timeline ---
export {
  TimelineManager,
  createTimeline,
  type TimelineOptions,
  type TimelineInstance,
  type TimelineItem,
  type TimelineItemStatus,
} from "./timeline";

// --- Wizard ---
export {
  WizardManager,
  createWizard,
  type WizardOptions,
  type WizardInstance,
  type WizardStep,
  type WizardStepStatus,
} from "./wizard";

// --- Notification ---
export {
  NotificationManager,
  getNotificationManager,
  toast as toastNotify,
  type Notification,
  type NotificationOptions,
  type NotificationType,
  type NotificationPosition,
} from "./notification";

// --- Toast ---
export {
  ToastManager,
  getToastManager,
  showToast,
  type ToastOptions,
  type ToastInstance,
  type ToastType,
  type ToastPosition,
  type ToastManagerConfig,
} from "./toast";

// --- Alert Banner ---
export {
  AlertManager,
  createAlert,
  type AlertOptions,
  type AlertInstance,
  type AlertSeverity,
} from "./alert-banner";

// --- Drawer Layout ---
export {
  createDrawerLayout,
  type DrawerLayoutOptions,
  type DrawerLayoutInstance,
  type DrawerPosition,
  type DrawerSize,
} from "./drawer-layout";

// --- Resizable ---
export {
  makeResizable,
  createSplitPane,
  type ResizeOptions,
  type ResizeState,
  type ResizableController,
  type SplitPaneOptions,
  type SplitPaneController,
} from "./resizable";

// --- Split View ---
export {
  createSplitView,
  createHorizontalSplit,
  createVerticalSplit,
  type SplitViewOptions,
  type SplitViewState,
  type SplitViewInstance,
  type PaneConfig,
  type SplitDirection,
} from "./split-view";

// --- Carousel ---
export {
  CarouselManager,
  createCarousel,
  type CarouselOptions,
  type CarouselInstance,
  type CarouselSlide,
} from "./carousel";

// --- Image Gallery ---
export {
  ImageGalleryManager,
  createImageGallery,
  type ImageGalleryOptions,
  type ImageGalleryInstance,
  type GalleryImage,
} from "./image-gallery";

// --- Lightbox ---
export {
  LightboxManager,
  createLightbox,
  type LightboxOptions,
  type LightboxInstance,
  type LightboxImage,
} from "./lightbox";

// --- Tooltip Group ---
export { createTooltipGroup, TooltipGroupManager, type TooltipGroupOptions, type TooltipItemOptions, type TooltipGroupInstance } from "./tooltip-group";

// --- Context Provider ---
export { createContext, ThemeContext, AuthContext, I18nContext, ResponsiveContext, createResponsiveProvider, type Context, type ContextOptions, type ProviderInstance, type ConsumerHandle, type ThemeContextValue, type AuthContextValue, type I18nContextValue, type ResponsiveContextValue } from "./context-provider";

// --- Masonry Layout ---
export { createMasonry, MasonryManager, type MasonryOptions, type MasonryItem, type MasonryInstance } from "./masonry";

// --- Accordion ---
export { createAccordion, AccordionManager, type AccordionOptions, type AccordionItem, type AccordionMode, type AccordionInstance } from "./accordion";

// --- Collapse ---
export { createCollapse, createCollapseGroup, CollapseManager, type CollapseOptions, type CollapseSize, type CollapseVariant, type CollapseInstance, type CollapseGroupOptions, type CollapseGroupInstance } from "./collapse";

// --- Tabs ---
export { createTabs, TabsManager, type TabsOptions, type TabItem, type TabsInstance, type TabOrientation, type TabVariant } from "./tabs";

// --- Modal ---
export { createModal, type ModalOptions, type ModalSize, type ModalPosition, type ModalInstance } from "./modal";

// --- Dialog ---
export { createDialog, alertDialog, confirmDialog, dangerDialog, type DialogOptions, type DialogVariant, type DialogInstance } from "./dialog";

// --- Popover ---
export { createPopover, PopoverManager, type PopoverOptions, type PopoverTrigger, type PopoverPlacement, type PopoverInstance } from "./popover";

// --- Dropdown ---
export { createDropdown, type DropdownOptions, type DropdownItem, type DropdownEntry, type DropdownSeparator, type DropdownGroup, type DropdownInstance, type DropdownPlacement } from "./dropdown";

// --- Select Menu ---
export { createSelectMenu, type SelectMenuOptions, type SelectOption, type SelectGroup, type SelectMode, type SelectMenuInstance } from "./select-menu";

// --- Autocomplete ---
export { createAutocomplete, AutocompleteManager, type AutocompleteOptions, type AutocompleteOption, type AutocompleteInstance } from "./autocomplete";

// --- Form Builder ---
export { FormBuilder, createForm, validations, type FieldType, type FormField, type FormSection, type FormSchema, type FieldValidation, type SelectOption as FormSelectOption, type FormState, type FieldError } from "./form-builder";

// --- Form Validator ---
export { FormValidator, required, minLength, maxLength, pattern, email as emailValidator, urlValidator, range, matchesField, asyncValidator, custom as customValidator, type ValidatorFn, type FieldConfig, type FieldValidationResult, type FormValidationResult, type FormValidatorOptions } from "./form-validator";

// --- Form Field ---
export { createTextField, createTextArea, createSelectField, createCheckbox, createSwitch, createRadioGroup, createFileUpload, createRangeSlider, createRating, createColorPicker, type TextFieldOptions, type TextAreaOptions, type SelectFieldOptions, type CheckboxFieldOptions, type SwitchFieldOptions, type RadioGroupOptions, type FileUploadOptions, type RangeSliderOptions, type RatingFieldOptions, type ColorPickerOptions, type TextFieldInstance, type TextAreaInstance, type SelectFieldInstance, type CheckboxInstance, type SwitchInstance, type RadioGroupInstance, type FileUploadInstance, type RangeSliderInstance, type RatingInstance, type ColorPickerInstance } from "./form-field";

// --- Data Table ---
export { createDataTable, DataTableManager, type DataTableOptions, type Column, type SortState, type FilterState, type DataTableInstance } from "./data-table";

// --- Virtual Table ---
export { createVirtualTable, VirtualTableManager, type VirtualTableOptions, type VirtualColumn, type VirtualTableInstance } from "./virtual-table";

// --- Tree Table ---
export { createTreeTable, TreeTableManager, type TreeTableOptions, type TreeNode, type TreeColumn, type TreeTableInstance } from "./tree-table";

// --- Chart ---
export { createChart, ChartManager, type ChartOptions, type ChartType, type ChartDataPoint, type ChartDataset, type ChartInstance } from "./chart";

// --- Graph ---
export { Graph, type GraphNode, type GraphEdge } from "./graph";

// --- Kanban ---
export { createKanban, KanbanManager, type KanbanOptions, type KanbanCard, type KanbanColumn, type KanbanSwimlane, type KanbanLabel, type KanbanInstance, type CardPriority, type CardSize } from "./kanban";

// --- Calendar ---
export { createCalendar, CalendarManager, type CalendarOptions, type CalendarEvent, type CalendarView, type WeekStartDay, type CalendarInstance } from "./calendar";

// --- Date Picker ---
export { createDatePicker, DatePickerManager, type DatePickerOptions, type DatePickerInstance } from "./date-picker";

// --- Time Picker ---
export { createTimePicker, type TimePickerOptions, type TimePickerInstance, type TimeFormat, type TimePickerMode } from "./time-picker";

// --- Notification Hub ---
export { createNotificationHub, NotificationHubManager, type NotificationHubOptions, type NotificationItem, type NotificationLevel, type NotificationType, type NotificationHubInstance } from "./notification-hub";

// --- Action Sheet ---
export { createActionSheet, type ActionSheetOptions, type ActionSheetAction, type ActionSheetActionStyle, type ActionSheetInstance } from "./action-sheet";

// --- Bottom Sheet ---
export { createBottomSheet, type BottomSheetOptions, type BottomSheetInstance, type SheetSize, type SnapPoint } from "./bottom-sheet";

// --- Skeleton Screen ---
export { createSkeletonScreen, SkeletonScreenManager } from "./skeleton-screen";
export type { SkeletonScreenOptions, SkeletonScreenInstance, SkeletonLayoutVariant } from "./skeleton-screen";

// --- Empty State ---
export { createEmptyState, EmptyStateManager } from "./empty-state";
export type { EmptyStateOptions, EmptyStateInstance, EmptyStateVariant } from "./empty-state";

// --- Error Boundary ---
export { createErrorBoundary, ErrorBoundaryManager } from "./error-boundary";
export type { ErrorBoundaryOptions, ErrorBoundaryInstance, ErrorBoundaryError } from "./error-boundary";

// --- Progress Indicator ---
export { createProgressBar, createCircularProgress, createStepProgress } from "./progress-indicator";
export type { ProgressBarOptions, ProgressBarInstance, CircularProgressOptions, CircularProgressInstance, StepProgressOptions, StepProgressInstance, ProgressVariant, ProgressSize } from "./progress-indicator";

// --- Badge ---
export { createBadge, createPositionedBadge, createStatusDot, addDotBadge, addCountBadge } from "./badge";
export type { BadgeOptions, BadgeVariant, BadgePosition, BadgeSize, StatusDotOptions } from "./badge";

// --- Avatar ---
export { createAvatar, createAvatarGroup, getInitials } from "./avatar";
export type { AvatarOptions, AvatarGroupOptions, AvatarSize, AvatarShape } from "./avatar";

// --- Divider ---
export { createDivider, hDivider, vDivider, labeledDivider, sectionDivider } from "./divider";
export type { DividerOptions, DividerOrientation, DividerStyle } from "./divider";

// --- Card ---
export { createCard } from "./card";
export type { CardOptions, CardInstance, CardVariant, CardSize, CardHeaderOptions, CardImageOptions } from "./card";

// --- List ---
export { createList } from "./list";
export type { ListOptions, ListInstance, ListItem, ListSelectionMode, ListVariant } from "./list";

// --- Breadcrumb ---
export { createBreadcrumb, BreadcrumbManager } from "./breadcrumb";
export type { BreadcrumbOptions, BreadcrumbInstance, BreadcrumbItem } from "./breadcrumb";

// --- Pagination ---
export { createPagination, PaginationManager } from "./pagination";
export type { PaginationOptions, PaginationInstance } from "./pagination";

// --- Tag ---
export { createTag, createTagGroup, TagManager } from "./tag";
export type { TagOptions, TagInstance, TagVariant, TagSize, TagShape, TagGroupOptions, TagGroupInstance } from "./tag";

// --- Alert ---
export { createAlert, AlertManager } from "./alert";
export type { AlertOptions, AlertInstance, AlertVariant, AlertSize, AlertAction } from "./alert";

// --- Callout ---
export { createCallout } from "./callout";
export type { CalloutOptions, CalloutInstance, CalloutVariant } from "./callout";

// --- Toast ---
export { showToast, getToastManager, ToastManager } from "./toast";
export type { ToastOptions, ToastInstance, ToastManagerConfig, ToastType, ToastPosition } from "./toast";

// --- Chips Input ---
export { createChipsInput } from "./chips-input";
export type { ChipsInputOptions, ChipsInputInstance, ChipData } from "./chips-input";

// --- Mentionable ---
export { createMentionable } from "./mentionable";
export type { MentionableOptions, MentionableInstance, MentionItem, MentionSearchFn } from "./mentionable";

// --- Rich Text Toolbar ---
export { createRichTextToolbar } from "./rich-text-toolbar";
export type { RichTextToolbarOptions, RichTextToolbarInstance, ToolbarButton, ToolbarButtonId } from "./rich-text-toolbar";

// --- Command Palette ---
export { CommandPalette } from "./command-palette";
export type { Command, CommandCategory, CommandPaletteConfig, CommandPaletteState } from "./command-palette";

// --- Search Dialog ---
export { createSearchDialog } from "./search-dialog";
export type { SearchDialogOptions, SearchDialogInstance, SearchResult, SearchCategory } from "./search-dialog";

// --- Quick Switcher ---
export { createQuickSwitcher } from "./quick-switcher";
export type { QuickSwitcherOptions, QuickSwitcherInstance, SwitcherItem } from "./quick-switcher";

// --- Color Picker (Advanced) ---
export { createColorPicker } from "./color-picker-advanced";
export type { ColorPickerOptions, ColorPickerInstance, ColorMode, PickerPlacement, RgbColor, HslColor, HsvColor, ColorSwatch } from "./color-picker-advanced";

// --- Date Range Picker ---
export { createDateRangePicker } from "./date-range-picker";
export type { DateRangePickerOptions, DateRangePickerInstance, DateRangePreset } from "./date-range-picker";

// --- Time Range Picker ---
export { createTimeRangePicker } from "./time-range-picker";
export type { TimeRangePickerOptions, TimeRangePickerInstance, TimeValue, TimeFormat, TimeStep, TimeRangePreset } from "./time-range-picker";

// --- File Explorer ---
export { createFileExplorer } from "./file-explorer";
export type { FileExplorerOptions, FileExplorerInstance, FileEntry, ViewMode, SortField } from "./file-explorer";

// --- File Tree ---
export { createFileTree, FileManager } from "./file-tree";
export type { FileTreeOptions, FileTreeInstance, FileTreeNode, FileType } from "./file-tree";

// --- Media Gallery ---
export { createMediaGallery } from "./media-gallery";
export type { MediaGalleryOptions, MediaGalleryInstance, MediaItem, MediaType, GalleryLayout } from "./media-gallery";
// --- code-editor ---
export { CodeEditorManager, createCodeEditor } from "./code-editor";
export type { CodeEditorOptions, CodeEditorInstance } from "./code-editor";

// --- terminal-emulator ---
export { AnsiParser, TerminalBuffer, TerminalEmulator, createTerminalEmulator } from "./terminal-emulator";
export type { AnsiParserOptions, TerminalBufferOptions, TerminalEmulatorOptions, TerminalEmulatorInstance, Cell, SgrAttributes } from "./terminal-emulator";

// --- markdown-renderer ---
export { parseMarkdown, renderToHtml, mdToHtml, generateToc, renderToc, extractFrontMatter, extractText, countWords, readingTime } from "./markdown-renderer";
export type { MdNode, MdNodeType, MdRenderOptions, TocEntry, FrontMatter } from "./markdown-renderer";
// --- chart-renderer ---
export { createChart } from "./chart-renderer";
export type { ChartOptions, ChartInstance, ChartType, ChartSeries, ChartDataPoint } from "./chart-renderer";

// --- kanban-board ---
export { createKanbanBoard } from "./kanban-board";
export type { KanbanBoardOptions, KanbanBoardInstance, KanbanCard, KanbanColumn } from "./kanban-board";

// --- calendar-view ---
export { createCalendar } from "./calendar-view";
export type { CalendarOptions, CalendarInstance, CalendarEvent, CalendarView } from "./calendar-view";
// --- timeline-viewer ---
export { createTimeline } from "./timeline-viewer";
export type { TimelineOptions, TimelineInstance, TimelineEvent, TimelineGroup } from "./timeline-viewer";

// --- gantt-chart ---
export { createGanttChart } from "./gantt-chart";
export type { GanttChartOptions, GanttChartInstance, GanttTask } from "./gantt-chart";

// --- mind-map ---
export { createMindMap } from "./mind-map";
export type { MindMapOptions, MindMapInstance, MindMapNode } from "./mind-map";
// --- form-builder ---
export { FormBuilder, createForm, validations } from "./form-builder";
export type { FormSchema, FormField, FormSection, FormState, FieldValidation, FieldError, SelectOption, FieldType } from "./form-builder";

// --- data-table-advanced ---
export { createDataTable } from "./data-table-advanced";
export type { DataTableOptions, DataTableInstance, ColumnDef, TableRow, SortDirection, AlignType } from "./data-table-advanced";

// --- notification-center ---
export { NotificationCenterManager, createNotificationCenter } from "./notification-center";
export type { NotificationCenterOptions, NotificationCenterInstance, NotificationItem, NotificationType } from "./notification-center";
// --- comment-system ---
export { createCommentSystem } from "./comment-system";
export type { CommentSystemOptions, CommentSystemInstance, Comment, CommentAuthor } from "./comment-system";

// --- rating-review ---
export { createRatingReview } from "./rating-review";
export type { RatingReviewOptions, RatingReviewInstance, Review, ReviewAuthor, RatingSummary, RatingType, SortReviews } from "./rating-review";

// --- activity-feed ---
export { ActivityFeedManager, createActivityFeed } from "./activity-feed";
export type { ActivityFeedOptions, ActivityFeedInstance, ActivityItem, ActivityType, ActivityGroupBy, FeedDensity } from "./activity-feed";
// --- chat-widget ---
export { createChatWidget } from "./chat-widget";
export type { ChatWidgetOptions, ChatWidgetInstance, ChatMessage, ChatParticipant } from "./chat-widget";

// --- help-center ---
export { createHelpCenter } from "./help-center";
export type { HelpCenterOptions, HelpCenterInstance, HelpArticle, HelpCategory } from "./help-center";

// --- onboarding-wizard ---
export { createOnboarding } from "./onboarding-wizard";
export type { OnboardingOptions, OnboardingInstance, OnboardingStep } from "./onboarding-wizard";
// --- keyboard-shortcuts ---
export { ShortcutManager, ShortcutRecorder, ShortcutOverlay, eventToCombo, normalizeKey, comboToString, parseCombo, comboMatches, comboHash, commonShortcuts } from "./keyboard-shortcuts";
export type { KeyCombo, ShortcutBinding, ShortcutScope, RecordedSequence } from "./keyboard-shortcuts";

// --- context-menu ---
export { ContextMenuManager } from "./context-menu";
export type { ContextMenuOptions, ContextMenuInstance, ContextMenuItem } from "./context-menu";

// --- drag-and-drop ---
export { DragDropManager, getDragDropManager } from "./drag-and-drop";
export type { DragItem, DragOptions, DropZoneOptions, DropResult, SortableConfig, DragMode, DropPosition } from "./drag-and-drop";

// --- Virtual Scroller ---
export { VirtualScroller } from "./virtual-scroller";
export type { ScrollItem, VisibleRange, ScrollerConfig, ScrollerState, ScrollToOptions } from "./virtual-scroller";

// --- Infinite Scroll ---
export { InfiniteScroll } from "./infinite-scroll";
export type { InfiniteScrollItem, InfiniteScrollOptions, InfiniteScrollState } from "./infinite-scroll";

// --- Split Pane ---
export { createSplitPane } from "./split-pane";
export type { SplitPaneOptions, SplitPaneInstance, SplitOrientation, SplitCollapseDirection } from "./split-pane";

// --- Color Picker ---
export { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, parseColor, getLuminance, getContrastRatio, getWcagLevel, getContrastingText, complementary, analogous, triadic, splitComplementary, tetradic, monochromatic, blendColors, lighten, darken, saturate, desaturate, invertColor, withOpacity, generatePaletteAdvanced } from "./color-picker";
export type { RgbColor, HslColor, Palette } from "./color-picker";

// --- Date Range Picker ---
export { createDateRangePicker } from "./date-range-picker";
export type { DateRangePickerOptions, DateRangePickerInstance, DateRangePreset } from "./date-range-picker";

// --- File Manager ---
export { createFileManager } from "./file-manager";
export type { FileManagerFile, FileManagerOptions, FileManagerInstance } from "./file-manager";

// --- Image Cropper ---
export { ImageCropperManager, createImageCropper } from "./image-cropper";
export type { AspectRatio, CropRegion, ImageCropperOptions, ImageCropperInstance } from "./image-cropper";

// --- Audio Player ---
export { createAudioPlayer } from "./audio-player";
export type { AudioTrack, AudioPlayerOptions, AudioPlayerInstance } from "./audio-player";

// --- Video Player ---
export { createVideoPlayer } from "./video-player";
export type { VideoTrack, QualityOption, Chapter, PlaylistItem, VideoPlayerOptions, VideoPlayerInstance } from "./video-player";

// --- Signature Pad ---
export { SignaturePadManager, createSignaturePad } from "./signature-pad";
export type { StrokePoint, Stroke, SignaturePadOptions, SignaturePadInstance } from "./signature-pad";

// --- QR Code ---
export { generateQrSvg, generateQrDataUri, generateQrCanvas, validateQrInput } from "./qr-code";
export type { QrOptions } from "./qr-code";

// --- Avatar Generator ---
export { AvatarGenerator, generateAvatar, avatarDataUri, userAvatar } from "./avatar-generator";
export type { AvatarShape, AvatarStyle, AvatarOptions, GradientStop, PatternConfig, AvatarResult } from "./avatar-generator";

// --- Toast Notification ---
export { createToastManager } from "./toast-notification";
export type { ToastOptions, ToastManagerOptions, ToastInstance, ToastType, ToastPosition } from "./toast-notification";

// --- Skeleton Loader ---
export { createSkeleton } from "./skeleton-loader";
export type { SkeletonItem, SkeletonOptions, SkeletonInstance, SkeletonShape, SkeletonAnimation } from "./skeleton-loader";

// --- Progress Indicator ---
export { createProgressBar, createCircularProgress, createStepProgress } from "./progress-indicator";
export type { ProgressBarOptions, ProgressBarInstance, CircularProgressOptions, CircularProgressInstance, StepProgressOptions, StepProgressInstance, ProgressVariant, ProgressSize } from "./progress-indicator";

// --- Badge ---
export { createBadge, createPositionedBadge, createStatusDot, addDotBadge, addCountBadge } from "./badge";
export type { BadgeOptions, StatusDotOptions, BadgeVariant, BadgePosition, BadgeSize } from "./badge";

// --- Chip ---
export { createChip, createChipGroup } from "./chip";
export type { ChipOptions, ChipInstance, ChipGroupOptions, ChipGroupInstance, ChipSize, ChipVariant } from "./chip";

// --- Tag Input ---
export { TagInputManager, createTagInput } from "./tag-input";
export type { TagItem, TagInputOptions, TagInputInstance } from "./tag-input";

// --- Tooltip ---
export { TooltipManager, getTooltipManager, tooltip } from "./tooltip";
export type { TooltipOptions, TooltipInstance, TooltipPlacement, TooltipTrigger } from "./tooltip";

// --- Popover ---
export { PopoverManager, createPopover } from "./popover";
export type { PopoverOptions, PopoverInstance, PopoverTrigger, PopoverPlacement } from "./popover";

// --- Modal Dialog ---
export { createModal } from "./modal-dialog";
export type { ModalOptions, ModalInstance, ModalSize, ModalVariant } from "./modal-dialog";

// --- Accordion ---
export { AccordionManager, createAccordion } from "./accordion";
export type { AccordionItem, AccordionOptions, AccordionInstance, AccordionMode } from "./accordion";

// --- Tabs ---
export { TabsManager, createTabs } from "./tabs";
export type { TabItem, TabsOptions, TabsInstance, TabOrientation, TabVariant } from "./tabs";

// --- Carousel ---
export { CarouselManager, createCarousel } from "./carousel";
export type { CarouselSlide, CarouselOptions, CarouselInstance } from "./carousel";

// --- Command Palette ---
export { CommandPalette } from "./command-palette";
export type { Command, CommandPaletteConfig, CommandPaletteState } from "./command-palette";

// --- Notification Bell ---
export { createNotificationBell } from "./notification-bell";
export type { NotificationItem, NotificationBellOptions, NotificationBellInstance } from "./notification-bell";

// --- Empty State ---
export { EmptyStateManager, createEmptyState } from "./empty-state";
export type { EmptyStateOptions, EmptyStateInstance, EmptyStateVariant } from "./empty-state";

// --- Rating ---
export type { StarIconType, RatingOptions, RatingInstance } from "./rating";
export { RatingManager, createRating } from "./rating";

// --- Slider ---
export type { SliderMark, SliderOptions, SliderInstance } from "./slider";
export { SliderManager, createSlider } from "./slider";

// --- Toggle Switch ---
export type { ToggleVariant, ToggleSize, ToggleOptions, ToggleInstance } from "./toggle-switch";
export { ToggleManager, createToggle } from "./toggle-switch";

// --- Checkbox Group ---
export type { CheckboxSize, CheckboxVariant, CheckboxOption, CheckboxGroupOptions, CheckboxGroupInstance } from "./checkbox-group";
export { createCheckboxGroup } from "./checkbox-group";

// --- Radio Group ---
export type { RadioSize, RadioVariant, RadioOption, RadioGroupOptions, RadioGroupInstance } from "./radio-group";
export { createRadioGroup } from "./radio-group";

// --- Select Menu ---
export type { SelectOption, SelectGroup, SelectMode, SelectMenuOptions, SelectMenuInstance } from "./select-menu";
export { createSelectMenu } from "./select-menu";

// --- Text Input ---
export type { InputSize, InputState, TextInputOptions, TextInputInstance } from "./text-input";
export { createTextInput } from "./text-input";

// --- Textarea ---
export type { TextareaSize, TextareaState, TextareaOptions, TextareaInstance } from "./textarea";
export { createTextarea } from "./textarea";

// --- Form Field ---
export type {
  FieldSize, InputType,
  BaseFieldOptions, TextFieldOptions, TextAreaOptions, SelectFieldOptions,
  CheckboxFieldOptions, SwitchFieldOptions, RadioGroupOptions as FormRadioGroupOptions,
  FileUploadOptions, RangeSliderOptions, RatingFieldOptions, ColorPickerOptions,
  TextFieldInstance, TextAreaInstance, SelectFieldInstance, CheckboxInstance,
  SwitchInstance, RadioGroupInstance as FormRadioGroupInstance,
  FileUploadInstance, RangeSliderInstance, RatingInstance, ColorPickerInstance
} from "./form-field";
export {
  createTextField, createTextArea, createSelectField,
  createCheckbox, createSwitch, createRadioGroup as createFormRadioGroup,
  createFileUpload, createRangeSlider, createRating as createRatingField,
  createColorPicker
} from "./form-field";

// --- Data Table ---
export type { Column, SortDirection, SortState, FilterState, DataTableOptions, DataTableInstance } from "./data-table";
export { DataTableManager, createDataTable } from "./data-table";

// --- Virtual Table ---
export type { VirtualColumn, VirtualTableOptions, VirtualTableInstance } from "./virtual-table";
export { VirtualTableManager, createVirtualTable } from "./virtual-table";

// --- Tree View ---
export type { TreeNodeData, TreeNode, CheckMode, TreeViewConfig } from "./tree-view";
export { TreeView } from "./tree-view";

// --- Kanban Board ---
export type { KanbanCard, KanbanColumn, KanbanBoardOptions, KanbanBoardInstance } from "./kanban-board";
export { createKanbanBoard } from "./kanban-board";

// --- Timeline ---
export type { TimelineItemStatus, TimelineItem, TimelineOptions, TimelineInstance } from "./timeline";
export { TimelineManager, createTimeline } from "./timeline";

// --- Gantt Chart ---
export type { GanttTask, GanttChartOptions, GanttChartInstance } from "./gantt-chart";
export { createGanttChart } from "./gantt-chart";

// --- Calendar ---
export type { CalendarView, WeekStartDay, CalendarEvent, CalendarOptions, CalendarInstance } from "./calendar";
export { CalendarManager, createCalendar } from "./calendar";

// --- Scheduler ---
export type { ScheduledJob, JobStatus, CronExpression } from "./scheduler";
export { Scheduler, parseCronExpression, cronMatches, getNextCronRun } from "./scheduler";

// --- Color Palette ---
export type { PaletteScheme, ColorShade, PaletteColor, ColorPalette, ColorPaletteOptions, ColorPaletteInstance } from "./color-palette";
export { contrastRatio, ColorPaletteManager, createColorPalette } from "./color-palette";

// --- Statistics Chart ---
export type { ChartType, ChartDataPoint, ChartSeries, ChartOptions, ChartInstance } from "./statistics-chart";
export { createChart } from "./statistics-chart";

// --- Heatmap ---
export type { HeatmapType, ColorScale, HeatmapCell, HeatmapOptions, HeatmapInstance } from "./heatmap";
export { createHeatmap } from "./heatmap";

// --- Sparkline ---
export type { SparklineType, SparklineOptions, SparklineInstance } from "./sparkline";
export { createSparkline } from "./sparkline";

// --- Mention ---
export type { MentionOption, MentionOptions, MentionInstance } from "./mention";
export { MentionManager, createMention } from "./mention";

// --- Avatar Group ---
export type { AvatarSize, StackDirection, AvatarItem, AvatarGroupOptions, AvatarGroupInstance } from "./avatar-group";
export { AvatarGroupManager, createAvatarGroup } from "./avatar-group";

// --- Breadcrumb ---
export type { BreadcrumbItem, BreadcrumbOptions, BreadcrumbInstance } from "./breadcrumb";
export { BreadcrumbManager, createBreadcrumb } from "./breadcrumb";

// --- Pagination ---
export {
  PaginationManager,
  createPagination,
  type PaginationOptions,
  type PaginationInstance,
} from "./pagination";

// --- Tabs Navigation ---
export {
  TabsNavManager,
  createTabsNav,
  type TabItem,
  type TabVariant,
  type TabSize,
  type TabsNavOptions,
  type TabsNavInstance,
} from "./tabs-nav";

// --- Stepper ---
export {
  StepperManager,
  createStepper,
  type StepConfig,
  type StepStatus,
  type StepperOptions,
  type StepperInstance,
} from "./stepper";

// --- Progress Bar ---
export {
  createProgressBar,
  createCircleProgress,
  type ProgressBarOptions,
  type CircleProgressOptions,
  type ProgressVariant,
  type ProgressSize,
} from "./progress-bar";

// --- Skeleton ---
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
  type SkeletonOptions,
  type SkeletonTextOptions,
  type SkeletonAvatarOptions,
  type SkeletonCardOptions,
  type SkeletonTableOptions,
} from "./skeleton";

// --- Loading Dots ---
export {
  LoadingDotsManager,
  createLoadingDots,
  type LoadingDotsOptions,
  type LoadingInstance,
  type LoaderType,
  type LoaderSize,
} from "./loading-dots";

// --- Empty State ---
export {
  EmptyStateManager,
  createEmptyState,
  type EmptyStateOptions,
  type EmptyStateInstance,
  type EmptyStateVariant,
} from "./empty-state";

// --- Error Boundary ---
export {
  ErrorBoundaryManager,
  createErrorBoundary,
  type ErrorBoundaryOptions,
  type ErrorBoundaryInstance,
  type ErrorBoundaryError,
} from "./error-boundary";

// --- Toast Container ---
export {
  ToastContainerManager,
  createToastContainer,
  type ToastContainerOptions,
  type ToastInstance,
  type ToastMessage,
  type ToastType,
  type ToastPosition,
  type ToastVariant,
} from "./toast-container";

// --- Command Palette ---
export {
  CommandPalette,
  type Command,
  type CommandPaletteConfig,
  type CommandPaletteState,
  type CommandCategory,
} from "./command-palette";

// --- Notification Bell ---
export {
  createNotificationBell,
  type NotificationBellOptions,
  type NotificationBellInstance,
  type NotificationItem,
} from "./notification-bell";

// --- Rating ---
export {
  RatingManager,
  createRating,
  type RatingOptions,
  type RatingInstance,
  type StarIconType,
} from "./rating";

// --- Slider ---
export {
  SliderManager,
  createSlider,
  type SliderOptions,
  type SliderInstance,
  type SliderMark,
} from "./slider";

// --- Toggle Switch ---
export {
  ToggleManager,
  createToggle,
  type ToggleOptions,
  type ToggleInstance,
  type ToggleVariant,
  type ToggleSize,
} from "./toggle-switch";

// --- Text Input ---
export {
  createTextInput,
  type TextInputOptions,
  type TextInputInstance,
  type InputSize,
  type InputState,
} from "./text-input";

// --- Textarea ---
export {
  createTextarea,
  type TextareaOptions,
  type TextareaInstance,
  type TextareaSize,
  type TextareaState,
} from "./textarea";

// --- Checkbox Group ---
export {
  createCheckboxGroup,
  type CheckboxGroupOptions,
  type CheckboxGroupInstance,
  type CheckboxOption,
  type CheckboxSize,
  type CheckboxVariant,
} from "./checkbox-group";

// --- Radio Group ---
export {
  createRadioGroup,
  type RadioGroupOptions,
  type RadioGroupInstance,
  type RadioOption,
  type RadioSize,
  type RadioVariant,
} from "./radio-group";

// --- Select Menu ---
export {
  createSelectMenu,
  type SelectMenuOptions,
  type SelectMenuInstance,
  type SelectOption,
  type SelectGroup,
  type SelectMode,
} from "./select-menu";

// --- Form Field ---
export {
  createTextField,
  createTextArea,
  createSelectField,
  createCheckbox,
  createSwitch,
  createRadioGroup as createRadioGroupField,
  createFileUpload,
  createRangeSlider,
  createRating as createRatingField,
  createColorPicker,
  type TextFieldOptions,
  type TextAreaOptions,
  type SelectFieldOptions,
  type CheckboxFieldOptions,
  type SwitchFieldOptions,
  type RadioGroupOptions,
  type FileUploadOptions,
  type RangeSliderOptions,
  type RatingFieldOptions,
  type ColorPickerOptions,
  type FieldSize,
} from "./form-field";

// --- Data Table ---
export {
  DataTableManager,
  createDataTable,
  type DataTableOptions,
  type DataTableInstance,
  type Column,
  type SortState,
  type FilterState,
} from "./data-table";

// --- Virtual Table ---
export {
  VirtualTableManager,
  createVirtualTable,
  type VirtualTableOptions,
  type VirtualTableInstance,
  type VirtualColumn,
} from "./virtual-table";

// --- Tree View ---
export {
  TreeView,
  type TreeNodeData,
  type TreeNode,
  type TreeViewConfig,
  type CheckMode,
} from "./tree-view";

// --- Kanban Board ---
export {
  createKanbanBoard,
  type KanbanBoardOptions,
  type KanbanBoardInstance,
  type KanbanCard,
  type KanbanColumn,
} from "./kanban-board";

// --- Timeline ---
export {
  TimelineManager,
  createTimeline,
  type TimelineOptions,
  type TimelineInstance,
  type TimelineItem,
  type TimelineItemStatus,
} from "./timeline";

// --- Gantt Chart ---
export {
  createGanttChart,
  type GanttChartOptions,
  type GanttChartInstance,
  type GanttTask,
} from "./gantt-chart";

// --- Calendar ---
export {
  CalendarManager,
  createCalendar,
  type CalendarOptions,
  type CalendarInstance,
  type CalendarEvent,
  type CalendarView,
} from "./calendar";

// --- statistics-chart ---
export {
  ChartType,
  type StatisticsChartOptions,
  type StatisticsChartInstance,
  createStatisticsChart,
} from "./statistics-chart";

// --- heatmap ---
export {
  HeatmapType,
  ColorScale,
  type HeatmapCell,
  type HeatmapOptions,
  type HeatmapInstance,
  createHeatmap,
} from "./heatmap";

// --- sparkline ---
export {
  SparklineType,
  type SparklineOptions,
  type SparklineInstance,
  createSparkline,
} from "./sparkline";

// --- color-picker ---
export {
  type RgbColor,
  type HslColor,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
  type Palette,
} from "./color-picker";

// --- date-picker ---
export {
  type DatePickerOptions,
  type DatePickerInstance,
  DatePickerManager,
  createDatePicker,
} from "./date-picker";

// --- time-picker ---
export {
  TimeFormat,
  TimePickerMode,
  type TimePickerOptions,
  type TimePickerInstance,
  createTimePicker,
} from "./time-picker";

// --- file-upload ---
export {
  type FileUploadOptions,
  type UploadFile,
  type FileUploadInstance,
  FileUploadManager,
  createFileUpload,
} from "./file-upload";

// --- avatar ---
export {
  AvatarSize,
  AvatarShape,
  type AvatarOptions,
  type AvatarGroupOptions,
  getInitials,
  createAvatar,
  createAvatarGroup,
} from "./avatar";

// --- badge ---
export {
  BadgeVariant,
  BadgePosition,
  BadgeSize,
  type BadgeOptions,
  type StatusDotOptions,
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
} from "./badge";

// --- tooltip ---
export {
  TooltipPlacement,
  TooltipTrigger,
  type TooltipOptions,
  type TooltipInstance,
  TooltipManager,
  getTooltipManager,
  tooltip,
} from "./tooltip";

// --- popover ---
export {
  PopoverTrigger,
  PopoverPlacement,
  type PopoverOptions,
  type PopoverInstance,
  PopoverManager,
  createPopover,
} from "./popover";

// --- dropdown-menu ---
export {
  MenuItemType,
  type MenuItem,
  type DropdownMenuOptions,
  type DropdownMenuInstance,
  DropdownMenuManager,
  createDropdownMenu,
} from "./dropdown-menu";

// --- modal ---
export {
  ModalSize,
  ModalPosition,
  type ModalOptions,
  type ModalInstance,
  createModal,
} from "./modal";

// --- drawer ---
export {
  DrawerSide,
  DrawerSize,
  type DrawerOptions,
  type DrawerInstance,
  createDrawer,
} from "./drawer";

// --- alert ---
export {
  AlertVariant,
  AlertSize,
  type AlertAction,
  type AlertOptions,
  type AlertInstance,
  AlertManager,
  createAlert,
} from "./alert";

// --- accordion ---
export {
  type AccordionItem,
  AccordionMode,
  type AccordionOptions,
  type AccordionInstance,
  AccordionManager,
  createAccordion,
} from "./accordion";

// --- carousel ---
export {
  type CarouselSlide,
  type CarouselOptions,
  type CarouselInstance,
  CarouselManager,
  createCarousel,
} from "./carousel";

// --- tabs ---
export {
  TabOrientation,
  TabVariant,
  type TabItem,
  type TabsOptions,
  type TabsInstance,
  TabsManager,
  createTabs,
} from "./tabs";

// --- split-view ---
export {
  SplitDirection,
  type PaneConfig,
  type SplitViewOptions,
  type SplitViewState,
  type SplitViewInstance,
  createSplitView,
  createHorizontalSplit,
  createVerticalSplit,
} from "./split-view";

// --- resizable ---
export {
  type ResizeOptions,
  type ResizeState,
  makeResizable,
  type ResizableController,
  type SplitPaneOptions,
  createSplitPane,
  type SplitPaneController,
} from "./resizable";

// --- context-menu ---
export {
  type ContextMenuItem,
  ContextMenuPosition,
  type ContextMenuOptions,
  type ContextMenuInstance,
  ContextMenuManager,
} from "./context-menu";

// --- tree-select ---
export {
  type TreeNodeData,
  type TreeSelectOptions,
  type TreeSelectInstance,
  TreeSelectManager,
  createTreeSelect,
} from "./tree-select";

// --- cascader ---
export {
  type CascaderOption,
  type CascaderColumn,
  type CascaderOptions,
  type CascaderInstance,
  CascaderManager,
  createCascader,
} from "./cascader";

// --- transfer ---
export {
  type TransferItem,
  type TransferOptions,
  type TransferInstance,
  TransferManager,
  createTransfer,
} from "./transfer";

// --- mention ---
export {
  type MentionOption,
  type MentionOptions,
  type MentionInstance,
  MentionManager,
  createMention,
} from "./mention";

// --- tag-input ---
export {
  type TagItem,
  type TagInputOptions,
  type TagInputInstance,
  TagInputManager,
  createTagInput,
} from "./tag-input";

// --- rate-limit ---
export {
  type RateLimitResult,
  type RateLimitOptions,
  TokenBucket,
  SlidingWindowLimiter,
  FixedWindowLimiter,
  AdaptiveLimiter,
  type AdaptiveOptions,
  type CreateRateLimiterOptions,
  createRateLimiter,
} from "./rate-limit";

// --- virtual-scroll ---
export {
  type VirtualItem,
  type VirtualScrollOptions,
  type VirtualScrollInstance,
  createVirtualScroll,
} from "./virtual-scroll";

// --- infinite-scroll ---
export {
  type InfiniteScrollItem,
  type InfiniteScrollOptions,
  type InfiniteScrollState,
  InfiniteScroll,
} from "./infinite-scroll";

// --- anchor-position ---
export {
  Placement,
  Alignment,
  type AnchorOptions,
  type PositionResult,
  type ArrowPosition,
  computePosition,
  computeArrowPosition,
  createPositionObserver,
} from "./anchor-position";

// --- notification ---
export type { Notification, NotificationOptions, NotificationPosition } from "./notification";
export { NotificationManager, getNotificationManager, toast } from "./notification";

// --- skeleton-loader ---
export type { SkeletonShape, SkeletonAnimation, SkeletonItem, SkeletonOptions, SkeletonInstance } from "./skeleton-loader";
export { createSkeleton } from "./skeleton-loader";

// --- waterfall ---
export type { PipelineStep, PipelineContext, PipelineResult } from "./waterfall";
export { runPipeline, parallel, waterfall, raceWithCleanup } from "./waterfall";

// --- progress-stepper ---
export type { StepStatus, StepperOrientation, StepperVariant, StepItem, ProgressStepperOptions, ProgressStepperInstance } from "./progress-stepper";
export { createProgressStepper } from "./progress-stepper";

// --- breadcrumb ---
export type { BreadcrumbItem, BreadcrumbOptions, BreadcrumbInstance } from "./breadcrumb";
export { BreadcrumbManager, createBreadcrumb } from "./breadcrumb";

// --- pagination ---
export type { PaginationOptions, PaginationInstance } from "./pagination";
export { PaginationManager, createPagination } from "./pagination";

// --- timeline ---
export type { TimelineItemStatus, TimelineItem, TimelineOptions, TimelineInstance } from "./timeline";
export { TimelineManager, createTimeline } from "./timeline";

// --- rating ---
export type { StarIconType, RatingOptions, RatingInstance } from "./rating";
export { RatingManager, createRating } from "./rating";

// --- empty-state ---
export type { EmptyStateVariant, EmptyStateOptions, EmptyStateInstance } from "./empty-state";
export { EmptyStateManager, createEmptyState } from "./empty-state";

// --- skeleton-screen ---
export type { ScreenTemplate, RevealMode, SkeletonSection, SkeletonBlock, SkeletonScreenOptions, SkeletonScreenInstance } from "./skeleton-screen";
export { createSkeletonScreen } from "./skeleton-screen";

// --- shimmer ---
export type { ShimmerDirection, ShimmerEasing, ShimmerOptions, ShimmerInstance } from "./shimmer";
export { createShimmer } from "./shimmer";

// --- spinner ---
export type { SpinnerVariant, SpinnerSize, SpinnerOptions } from "./spinner";
export { createSpinner, miniSpinner, fullPageSpinner } from "./spinner";

// --- overlay ---
export type { OverlayType, OverlayOptions, OverlayInstance } from "./overlay";
export { OverlayProvider, openModal, openDrawer, openConfirm, openAlert, closeAllOverlays } from "./overlay";

// --- backdrop ---
export type { BackdropVariant, BackdropAnimation, BackdropOptions, BackdropInstance } from "./backdrop";
export { createBackdrop, closeAllBackdrops, getActiveBackdropCount, showLoadingOverlay, showConfirmDialog } from "./backdrop";

// --- mask ---
export type { MaskMode, MaskOptions, CutoutOptions, MaskInstance } from "./mask";
export { createMask, createSpotlight } from "./mask";

// --- tour-guide ---
export type { TourStep, TourOptions, TourInstance } from "./tour-guide";
export { TourManager, createTour } from "./tour-guide";

// --- onboarding ---
export type { OnboardingStepType, OnboardingField, OnboardingStep, OnboardingOptions, OnboardingInstance } from "./onboarding";
export { createOnboarding } from "./onboarding";

// --- feature-flag ---
export type { FlagValueType, FlagConditionOperator, FlagCondition, FlagRule, FeatureFlag, UserContext, FeatureFlagOptions, FeatureFlagInstance } from "./feature-flag";
export { createFeatureFlags, createBooleanFlag, createRolloutFlag } from "./feature-flag";

// --- undo-redo ---
export type { UndoItem, UndoBranch, UndoHistoryOptions, UndoState, UndoChangeListener } from "./undo-redo";
export { UndoHistory } from "./undo-redo";

// --- clipboard ---
export type { ClipboardData, ClipboardOptions } from "./clipboard";
export { copyToClipboard, copyRichToClipboard, readFromClipboard, readRichFromClipboard, isClipboardAvailable, canReadClipboard, watchClipboard } from "./clipboard";

// --- shortcuts ---
export type { ShortcutBinding, ShortcutGroup, ShortcutManagerOptions, ShortcutInstance } from "./shortcuts";
export { createShortcutManager } from "./shortcuts";

// --- drag-and-drop ---
export type { DragMode, DropPosition, DragItem, DragOptions, DropZoneOptions, DropResult, SortableConfig } from "./drag-and-drop";
export { DragDropManager, getDragDropManager } from "./drag-and-drop";

// --- sortable ---
export type { SortableItem, SortableOptions, SortableInstance } from "./sortable";
export { SortableList, createSortable } from "./sortable";

// --- resizable-panels ---
export type { PanelDirection, PanelCollapseMode, PanelConfig, ResizablePanelsOptions, ResizablePanelsInstance } from "./resizable-panels";
export { createResizablePanels } from "./resizable-panels";

// --- scroll-lock ---
export type { ScrollLockOptions, ScrollLockInstance } from "./scroll-lock";
export { ScrollLockManager, getScrollLockManager, lockScroll, withScrollLock, withScrollLockAsync, setupAutoResizeScrollLock } from "./scroll-lock";

// --- focus-trap ---
export type { FocusTrapOptions, FocusTrapInstance } from "./focus-trap";
export { FocusTrapManager, createFocusTrap, FocusTrapStack } from "./focus-trap";

// --- portals ---
export type { PortalOptions, PortalInstance, PortalManagerOptions, PortalManagerInstance } from "./portals";
export { createPortal, createPortalManager, getOrCreateTarget, createModalTarget, createTooltipTarget, createNotificationTarget, createDrawerTarget } from "./portals";

// --- intersection-observer ---
export type { VisibilityState, ObserveMode, IntersectionOptions, IntersectionEntryEx, IntersectionInstance } from "./intersection-observer";
export { IntersectionWatcher, createIntersectionObserver, lazyLoadImages, watchVisibility, createInfiniteScrollSentinel } from "./intersection-observer";

// --- mutation-observer ---
export type { MutationFilter, MutationObserverOptions, SimplifiedMutationRecord, MutationObserverInstance } from "./mutation-observer";
export { MutationWatcher, createMutationObserver, waitForElement, waitForRemoval } from "./mutation-observer";

// --- resize-observer ---
export type { ResizeBox, ResizeObserverOptions as ResizeObsOptions, ResizeObserverEntry as ResizeObsEntry, ResizeObserverInstance as ResizeObsInstance } from "./resize-observer";
export { ResizeWatcher, createResizeObserver, matchParentSize, whenSizeExceeds } from "./resize-observer";

// --- animatable ---
export type { AnimatableProperty, Keyframe, AnimationTimeline, AnimatableOptions, AnimatableInstance } from "./animatable";
export { createAnimatable } from "./animatable";

// --- spring-physics ---
export type { SpringConfig, SpringOptions, SpringInstance, ChainableSpring } from "./spring-physics";
export { createSpring, SpringPresets, createPresetSpring } from "./spring-physics";

// --- easing ---
export type { EasingName, EasingFunction, CubicBezierOptions, ElasticOptions, BackOptions, BounceOptions } from "./easing";
export {
  linear, easeInQuad, easeOutQuad, easeInOutQuad,
  easeInCubic, easeOutCubic, easeInOutCubic,
  easeInQuart, easeOutQuart, easeInOutQuart,
  easeInQuint, easeOutQuint, easeInOutQuint,
  easeInSine, easeOutSine, easeInOutSine,
  easeInExpo, easeOutExpo, easeInOutExpo,
  easeInCirc, easeOutCirc, easeInOutCirc,
  easeInBack, easeOutBack, easeInOutBack,
  easeInElastic, easeOutElastic, easeInOutElastic,
  easeInBounce, easeOutBounce, easeInOutBounce,
  cubicBezier, cubicBezierFromOpts, steps,
  getEasing, toCSS, getCSSEasingMap
} from "./easing";

// --- CSS Variables ---
export {
  createCssVars,
  parseCssValue,
  pxToRem,
  remToPx,
  resolveCssVarChain,
} from "./css-variables";
export type { CssVarOptions, CssVarInstance } from "./css-variables";

// --- Theme Engine ---
export {
  ThemeEngine,
  getThemeEngine,
  setTheme,
  toggleTheme,
  getCurrentTheme,
  isDarkMode,
} from "./theme-engine";
export type {
  ThemeMode,
  DesignToken,
  TokenCategory,
  ThemeDefinition,
  ThemeEngineOptions,
} from "./theme-engine";

// --- Color System ---
export {
  rgbToHex,
  hexToRgb,
  hslToRgb,
  rgbToHsl,
  hsvToRgb,
  rgbToHsv,
  hslToHsv,
  hsvToHsl,
  calcLuminance,
  contrastRatio,
  meetsWcagAA,
  meetsWcagAAA,
  suggestTextColor,
  kelvinToRgb,
  rgbToKelvin,
  generatePalette,
  generateHarmony,
  blendColors,
  parseColor,
  randomColor,
  NAMED_COLORS,
} from "./color-system";
export type { RgbColor, HslColor, HsvColor, BlendMode, HarmonyType } from "./color-system";

// --- Breakpoint Utilities ---
export {
  getActiveBreakpoint,
  isAtLeast,
  isAtMost,
  getMatchingBreakpoints,
  resolveResponsiveValue,
  fluidClamp,
  generateFluidScale,
  minWQuery,
  maxWQuery,
  rangeQuery,
  containerQuery,
  containerDefinition,
  gridColumns,
  gutterSize,
  DEFAULT_BREAKPOINTS as BP_DEFAULTS,
  BREAKPOINT_MAP as BP_MAP,
  BREAKPOINT_ORDER as BP_ORDER,
} from "./breakpoint-utils";
export type { BreakpointKey, BreakpointDefinition, FluidScaleOptions, ResponsiveValue, ContainerQueryConfig } from "./breakpoint-utils";

// --- Responsive Helpers ---
export {
  listenToMedia,
  watchMedia,
  watchHover,
  watchTouch,
  watchReducedMotion,
  watchDarkMode,
  watchPortrait,
  watchLandscape,
  watchHighContrast,
  watchPrint,
  buildSrcset,
  buildPictureHtml,
  pickBestImageSource,
  getSafeAreaInsets,
  applySafeAreaVars,
  listenForPrint,
  generatePrintStyles,
  getVisualViewport,
  hasDisplayNotch,
} from "./responsive-helpers";
export type { MediaListenerOptions, MediaQueryResult, ResponsiveImageSource, ResponsiveImageOptions, SafeAreaInsets, PrintOptions } from "./responsive-helpers";

// --- Media Query Manager ---
export {
  ResponsiveManager,
  createResponsiveManager,
  matchesQuery,
  getCurrentBreakpoint,
} from "./media-query";
export type { BreakpointName, Breakpoint, BreakpointConfig, MediaQueryOptions, MediaQueryInstance, ResponsiveManagerInstance } from "./media-query";

// --- Layout Utilities ---
export {
  flex,
  applyFlex,
  hStack,
  vStack,
  gridLayout,
  applyGrid,
  applyStack,
  parseAspectRatio,
  applyAspectRatio,
  createAspectContainer,
  spacing,
  insertDivider,
  createAppLayout,
  createSidebarLayout,
  createCenteredLayout,
} from "./layout-utils";
export type { FlexConfig, GridConfig, StackConfig, FlexDirection, FlexWrap, JustifyContent, AlignItems, GapSize } from "./layout-utils";

// --- Positioning ---
export {
  getRect,
  getPositionInDocument,
  getOffsetPosition,
  getLayoutMetrics,
  positionElement,
  centerElement,
  alignChildren,
  getViewportSize as getVPSize,
  getVisualViewport as getVVSize,
  isInViewport,
  findScrollParent,
  scrollIntoViewIfNeeded,
  gridTemplateColumns,
  applyMasonryLayout,
  constrainToContainer,
  fillRemainingSpace,
  getElementBreakpoint,
  setResponsiveDisplay,
} from "./positioning";
export type { Rect, Position, Alignment, LayoutMetrics } from "./positioning";

// --- Box Model ---
export {
  getBoxModel,
  getBoxDimensions,
  getOuterSize,
  getInnerSize,
  setContentSize,
  setBorderBoxSize,
  fillParent,
  setPaddingPercent,
  setMargin,
  setPadding,
  resetMargin,
  resetPadding,
  normalizeElement,
  forceBorderBox,
  isBorderBox,
  setOverflow,
  truncateText,
  reserveScrollbarGutter,
  getScrollbarWidth,
  sameBoxSize,
  diffBoxModel,
} from "./box-model";
export type { BoxModelValues, BoxDimensions, BoxSizingOptions } from "./box-model";

// --- DOM Utilities ---
export {
  createEl,
  div,
  span,
  p,
  btn,
  createSvg,
  $,
  $$,
  requireSelector,
  byId,
  byClass,
  byTag,
  walkUp,
  walkDown,
  nextSibling,
  prevSibling,
  siblings,
  siblingIndex,
  isLastChild,
  isFirstChild,
  empty,
  setChildren,
  insertAtIndex,
  moveToIndex,
  swapElements,
  wrap,
  unwrap,
  htmlToFragment,
  appendHtml,
  prependHtml,
  delegate,
  delegateClick,
  renderTemplate,
  renderInto,
} from "./dom-utils";
export type { CreateElementOptions, QueryOptions, DomDiffResult } from "./dom-utils";

// --- Element Utilities ---
export {
  getElementInfo,
  hasClass,
  addClasses,
  removeClasses,
  toggleClass,
  replaceClass,
  getAttr,
  setAttr,
  hasAttr,
  removeAttr,
  toggleAttr,
  getData,
  setData,
  removeData,
  getAllData,
  setAria,
  setBusy,
  setAccessibleName,
  hide,
  show,
  toggleVisibility,
  isVisuallyHidden,
  screenReaderOnly,
  cloneElement,
  duplicateAfter,
  setState,
  getState,
  removeState,
  clearState,
  isScrollable,
  makeInert,
  disable,
  enable,
  scrollToTop,
  scrollToBottom,
} from "./element-utils";
export type { ElementInfo, VisibilityOptions, CloneOptions } from "./element-utils";

// --- Style Utils ---
export {
  getComputedStyleValue,
  getElementRect,
  isInViewport as styleIsInViewport,
  getVisibilityPercent,
  scrollIntoViewCentered,
  measureText,
  closestAncestor,
  getAncestors,
  insertAfter,
  replaceElement,
  containsOrIs,
  getFocusableElements,
  createFocusTrap,
} from "./style-utils";

// --- Event Bus ---
export {
  EventBus,
  createEventBus,
} from "./event-bus";
export type { EventCallback, EventMiddleware, Subscription as ESubscription, EmittedEvent, EventBusOptions } from "./event-bus";

// --- Pub/Sub ---
export {
  PubSub,
  createPubSub,
} from "./pub-sub";
export type { MessageHandler, TopicPattern, Message, Subscription as PSubscription, PubSubOptions, PubSubStats } from "./pub-sub";

// --- Signal / Reactive Primitives ---
export {
  signal,
  readonlySignal,
  computed,
  effect,
  batch,
  isBatching,
  signalArray,
  toggleSignal,
  counterSignal,
  debouncedSignal,
  throttledSignal,
} from "./signal";
export type { Signal, ComputedSignal, EffectOptions, SignalArray } from "./signal";

// --- State Manager ---
export {
  createStore as createStateStore,
  combineStores,
} from "./state-manager";
export type { StoreOptions as SMOptions, StoreInstance, ComputedValue, Listener as SMListener, Middleware as SMMiddleware, Selector as SMSelector } from "./state-manager";

// --- Store (Zustand-inspired) ---
export {
  Store,
  createStore,
  createComputed,
  persistMiddleware,
  connectDevTools,
  registerStore,
  getStore,
  unregisterStore,
} from "./store";
export type { StoreOptions, StoreApi, PersistOptions, Listener, Selector, EqualityFn, Middleware } from "./store";

// --- Atom (Jotai-inspired) ---
export {
  AtomStore,
  atom,
  atomRead,
  atomWrite,
  useAtomValue,
  atomFamily,
  selectAtom,
  mapAtom,
  filterAtom,
  getAtomStore,
  resetGlobalStore,
} from "./atom";
export type { AnyAtom, Atom, ReadAtom, WriteAtom, AtomOptions, AtomInstance } from "./atom";

// --- Formatter ---
export {
  formatNumber,
  formatCompact,
  formatCurrency,
  formatDate,
  formatRelative,
  formatDuration,
  capitalize,
  titleCase,
  kebabCase,
  snakeCase,
  camelCase,
  truncate,
  pad,
  pluralize,
  maskString,
  formatBytes,
  formatPercent,
  formatPhone,
  formatId,
  formatTemplate,
  formatList,
} from "./formatter";
export type { NumberFormatOptions, CurrencyFormatOptions, DateFormatOptions, ByteFormatOptions, PercentFormatOptions } from "./formatter";

// --- Validator ---
export {
  isString,
  isNumber,
  isInteger,
  isFiniteNumber,
  isBoolean,
  isArray,
  isObject,
  isDate,
  isEmail,
  isUrl,
  isNil,
  isPresent,
  validate,
  validateSync,
  assert,
  throwIfInvalid,
} from "./validator";
export type { ValidationError as VError, ValidationResult, ValidationRule, ValidationSchema } from "./validator";

// --- Sanitizer ---
export {
  escapeHtml,
  unescapeHtml,
  sanitizeHtml,
  stripHtml,
  containsXss,
  sanitizeUrl,
  isSafeUrl,
  sanitizeCssIdentifier,
  sanitizeFilename,
  sanitizeSelector,
  sanitizeRegex,
  normalizeWhitespace,
  normalizeUnicode,
  cleanInput,
  generateSafeId,
  generateUniqueId,
  generateSecureId,
  buildCsp,
} from "./sanitizer";
export type { SanitizeHtmlOptions, SanitizeUrlOptions } from "./sanitizer";

// --- i18n ---
export {
  t,
  getLocale as getI18nLocale,
  setLocale,
  LOCALE_CHANGE_EVENT,
} from "./i18n";
export type { Locale } from "./i18n";

// --- Locale ---
export {
  LOCALES,
  getLocale as getLocaleInfo,
  detectBrowserLocale,
  isRtlLocale,
  getDirection,
  formatNumberLocale,
  formatCurrencyLocale,
  formatPercentLocale,
  formatDateLocale,
  formatTimeLocale,
  formatRelativeLocale,
  formatListLocale,
  pluralizeLocale,
  TIMEZONES,
  getTimezone,
  getTimezoneOffset,
} from "./locale";
export type { LocaleInfo, TimeZoneInfo } from "./locale";

// --- Number Format ---
export {
  formatNumberCustom,
  formatWithUnits,
  formatFileSize,
  formatOrdinal,
  numberToWords,
  numberToChinese,
  toRomanNumerals,
  fromRomanNumerals,
  formatRange,
  clamp,
  lerp,
  mapRange,
  parseFormattedNumber,
  parsePercent,
} from "./number-format";
export type { NumberPatternOptions } from "./number-format";

// --- Async Utils ---
export {
  retry,
  withTimeoutPromise,
  poll,
  runWithConcurrency,
  memoizeAsync,
  memoize,
  createDeferred,
  asyncIterate,
  batchProcess,
  allSuccessful,
  allOrThrow,
} from "./async-utils";
export type { RetryOptions, PollOptions, ConcurrencyOptions, MemoizeOptions } from "./async-utils";

// --- Promise Helpers ---
export {
  abortable,
  createCancellable,
  withTimeout,
  raceWithIndex,
  anyResolved,
  waterfall,
  parallelPool,
  mapConcurrent,
  conditional,
  retryPromise,
  sleep,
  sleepUntil,
  debounceAsync,
  throttleAsync,
  using,
  isThenable,
  promiseState,
} from "./promise-helpers";
export type { PromiseOptions, RaceResult } from "./promise-helpers";

// --- Task Queue ---
export {
  TaskQueue,
  createTaskQueue,
} from "./task-queue";
export type { Task, TaskResult, WorkerPoolOptions, QueueStats, TaskPriority, TaskStatus } from "./task-queue";

// --- UUID ---
export {
  uuidv4,
  uuidv7,
  nanoId,
  shortId,
  prefixedId,
  isUuid,
  getUuidVersion,
} from "./uuid";

// --- Hash ---
export {
  sha256 as hashSha256,
  sha384,
  sha512,
  simpleHash,
  hashToInt,
  hashObject,
  combineHashes,
  hashColor,
  hashHexColor,
  fingerprint,
  timingSafeEqual,
} from "./hash";

// --- Crypto Utils ---
export {
  sha1,
  sha256,
  sha384,
  sha512,
  hash,
  hashHex,
  hmac,
  hmacHex,
  pbkdf2,
  deriveAesKey,
  generateAesKey,
  aesGcmEncrypt,
  aesGcmDecrypt,
  aesGcmEncryptString,
  aesGcmDecryptString,
  generateRsaOaepKeyPair,
  rsaOaepEncrypt,
  rsaOaepDecrypt,
  generateEcdsaKeyPair,
  ecdsaSign,
  ecdsaVerify,
  generateRsaPssKeyPair,
  rsaPssSign,
  rsaPssVerify,
  exportKey,
  importKey,
  keyFingerprint,
  generateEcdhKeyPair,
  ecdhDeriveSecret,
  ecdhDeriveAesKey,
  randomBytes,
  secureRandomInt,
  secureRandomUuid,
  secureRandomString,
  toBase64,
  fromBase64,
  toBase64Url,
  fromBase64Url,
  toHex,
  fromHex,
  encodeUtf8,
  decodeUtf8,
  estimatePasswordStrength,
  generatePassword,
  generateTokenHex,
  generateTokenBase64Url,
  generateApiKey,
  generateSessionId,
} from "./crypto-utils";
export type { HashAlgorithm, HmacAlgorithm, AesKeyLength, EcNamedCurve, RsaKeySize, KeyFormat, Pbkdf2Options, AesGcmOptions, RsaKeyGenOptions, EcdsaKeyGenOptions, RsaPssSignOptions, PasswordStrengthResult, PasswordGeneratorOptions, ApiKeyOptions, AesGcmEncryptedData } from "./crypto-utils";

// --- Performance ---
export {
  reportMetric,
  getSessionMetrics,
  observeWebVitals,
  markRender,
} from "./performance";
export type { PerformanceMetric } from "./performance";

// --- Profiling ---
export {
  createProfiler,
  profileFn,
  profileAsyncFn,
  withProfile,
  getMemoryUsage,
  measureMemory,
} from "./profiling";
export type { ProfileEntry, ProfilerOptions, TimerHandle } from "./profiling";

// --- Metrics ---
export {
  MetricsCollector,
  PerformanceObserver,
  measureWebVitals,
  perfMark,
  perfMeasure,
} from "./metrics";
export type { MetricValue, HistogramBucket } from "./metrics";

// --- Logger ---
export {
  Logger,
  setGlobalLogLevel,
  getGlobalLogLevel,
  log,
  apiLog,
  dbLog,
  extLog,
} from "./logger";
export type { LogLevel, LogTransport } from "./logger";

// --- Debug ---
export {
  setDebug,
  isDebug,
  createDebugger,
  assert,
  assertExists,
  assertType,
  devOnly,
  devValue,
  isBrowser,
  isNode,
  isWorker,
  timeStart,
  timeEnd,
  timeAsync,
} from "./debug";

// --- Console Enhancement ---
export {
  interceptConsole,
  stopConsoleCapture,
  getCapturedLogs,
  prettyPrint,
  group,
  grouped,
  showTable,
  count,
  resetCounter,
  showCounters,
} from "./console-enhance";
export type { ConsoleGroupOptions, ConsoleFilterOptions } from "./console-enhance";

// --- Network Utilities ---
export {
  getNetworkStatus,
  onNetworkChange,
  isSlowConnection,
  isDataSaverEnabled,
  fetchWithRetry,
  RequestQueue,
  syncWhenOnline,
  processOfflineQueue,
  BandwidthEstimator,
  ConnectionHealthChecker,
} from "./network-utils";
export type {
  NetworkStatus,
  RetryOptions,
  RequestQueueItem,
} from "./network-utils";

// --- Fetch Wrapper ---
export {
  getEnhancedFetch,
  httpGet,
  httpPost,
} from "./fetch-wrapper";
export type {
  FetchOptions,
  FetchInterceptor,
  CacheEntry,
} from "./fetch-wrapper";

// --- HTTP Client ---
export {
  HttpClient,
  createHttpClient,
  HttpError,
} from "./http-client";
export type {
  HttpClientConfig,
  HttpRequestOptions,
  HttpResponse,
  HttpMiddleware,
} from "./http-client";

// --- REST API Client ---
export {
  RestClient,
  RestResourceHandler,
  RestError,
  createRestClient,
} from "./rest-api";
export type {
  RestResourceConfig,
  RestEndpointDefinition,
  PaginatedResponse,
  PaginationOptions,
  RestClientConfig,
} from "./rest-api";

// --- SSE (Server-Sent Events) ---
export {
  SseClient,
  SseAggregator,
  createSseClient,
} from "./sse";
export type {
  SseConfig,
  SseMessage,
  SseConnectionState,
  SseEventHandler,
  SseStateHandler,
  SseErrorHandler,
} from "./sse";

// --- WebSocket Protocol ---
export {
  WsClient,
  createWsClient,
} from "./ws-protocol";
export type {
  WsConfig,
  WsMessage,
  WsConnectionState,
  WsMessageHandler,
  WsRawHandler,
  WsStateHandler,
  WsErrorHandler,
} from "./ws-protocol";

// --- API Gateway ---
export {
  ApiGateway,
  createApiGateway,
} from "./api-gateway";
export type {
  ServiceConfig,
  GatewayRequest,
  GatewayResponse,
  RouteConfig,
  GatewayMetrics,
} from "./api-gateway";

// --- Request Batcher ---
export {
  RequestBatcher,
  createRequestBatcher,
} from "./request-batcher";
export type {
  BatchConfig,
  BatchableRequest,
  BatchResponse,
  BatchStats,
} from "./request-batcher";

// --- Polling ---
export {
  Poller,
  createPoller,
  poll,
} from "./polling";
export type {
  PollingConfig,
  PollingState,
  PollingStatusHandler,
} from "./polling";

// --- Cookie Manager ---
export {
  CookieManager,
  CookieConsentManager,
  getCookieManager,
  getCookie,
  setCookie,
  removeCookie,
} from "./cookie-manager";
export type {
  CookieOptions,
  CookieInfo,
  CookieConsentConfig,
} from "./cookie-manager";

// --- Session Manager ---
export {
  SessionManager,
  createSessionManager,
} from "./session-manager";
export type {
  SessionConfig,
  SessionData,
  SessionState,
  SessionEventHandler,
  SessionExpireHandler,
} from "./session-manager";

// --- Auth Token ---
export {
  AuthTokenManager,
  createAuthTokenManager,
  parseJwt,
  isJwt,
  decodeToken,
  validateJwt,
} from "./auth-token";
export type {
  TokenPair,
  TokenInfo,
  AuthTokenConfig,
  TokenInterceptorConfig,
} from "./auth-token";

// --- RBAC ---
export {
  RBACEngine,
  createRBAC,
  BUILT_IN_ROLES,
} from "./rbac";
export type {
  RoleDefinition,
  RoleAssignment,
  PermissionCheckResult,
  RbacConfig,
  AuditEntry,
} from "./rbac";

// --- ACL ---
export {
  ACLEngine,
  createACL,
} from "./acl";
export type {
  AclResource,
  AclEntry,
  AclCondition,
  AclCheckContext,
  AclDecision,
  AclConfig,
} from "./acl";

// --- OIDC ---
export {
  OidcClient,
  createOidcClient,
} from "./oidc";
export type {
  OidcDiscovery,
  OidcConfig,
  IdTokenClaims,
  IdTokenValidationResult,
  OidcSessionState,
  OidcEventHandler,
} from "./oidc";

// --- SSO ---
export {
  SSOManager,
  createSSOManager,
} from "./sso";
export type {
  SsoProvider,
  SsoAuthResult,
  SsoUser,
  SsoSession,
  SsoConfig,
  SsoError,
  SsoState,
  SsoStateHandler,
} from "./sso";

// --- Feature Flag (pre-written) ---
export {
  createFeatureFlags,
  createBooleanFlag,
  createRolloutFlag,
} from "./feature-flag";
export type {
  FeatureFlag,
  FeatureFlagOptions,
  FeatureFlagInstance,
  FlagRule,
  FlagCondition,
  UserContext,
} from "./feature-flag";

// --- Experiment Framework ---
export {
  ExperimentEngine,
  createExperimentEngine,
} from "./experiment";
export type {
  ExperimentConfig,
  Variant,
  ExperimentMetric,
  ExperimentTargeting,
  ExposureEvent,
  MetricEvent,
  ExperimentResult,
  ExperimentInstance,
  ExperimentStatus,
} from "./experiment";

// --- A/B Testing ---
export {
  zTest,
  chiSquaredTest,
  calculateSampleSize,
  multiVariantTest,
  SequentialABTest,
  evaluateAB,
} from "./ab-test";
export type {
  ABTestVariant,
  ABTestResult,
  MultiVariantResult,
  SampleSizeResult,
  SequentialTestState,
  PowerAnalysisInput,
} from "./ab-test";

// --- Analytics Core ---
export {
  AnalyticsCore,
  createAnalytics,
} from "./analytics-core";
export type {
  AnalyticsEvent,
  AnalyticsContext,
  AnalyticsConfig,
  EventSchema,
  AnalyticsStats,
} from "./analytics-core";

// --- Event Tracker ---
export {
  EventTracker,
  createEventTracker,
} from "./event-tracker";
export type {
  TrackerConfig,
  PageViewInfo,
  ScrollDepthEvent,
  ClickEvent,
  FormInteractionEvent,
  PerformanceSnapshot,
} from "./event-tracker";

// --- Funnel ---
export {
  FunnelEngine,
  createFunnelEngine,
} from "./funnel";
export type {
  FunnelDefinition,
  FunnelStep,
  FunnelUserJourney,
  FunnelResult,
  FunnelOptions,
} from "./funnel";

// --- Heatmap (pre-written) ---
export { createHeatmap } from "./heatmap";
export type { HeatmapCell, HeatmapOptions, HeatmapInstance, HeatmapType, ColorScale } from "./heatmap";

// --- User Journey ---
export { JourneyTracker, createJourneyTracker } from "./user-journey";
export type { UserJourney, JourneyConfig, JourneyEvent, JourneyPage, JourneyStats, PathAnalysis } from "./user-journey";

// --- Cohort Analysis ---
export { CohortAnalyzer, createCohortAnalyzer } from "./cohort-analysis";
export type { CohortDefinition, CohortMember, RetentionCell, RetentionTable, CohortComparison, SurvivalData, LTVCalculation } from "./cohort-analysis";
// notification-system.ts
export { NotificationCenter, PushNotificationManager } from "./notification-system";
export type { Notification, NotificationConfig, NotificationType, NotificationPriority } from "./notification-system";

// toast-container.ts
export { ToastContainerManager, createToastContainer } from "./toast-container";
export type { ToastMessage, ToastContainerOptions, ToastInstance, ToastType, ToastPosition, ToastVariant } from "./toast-container";

// modal-manager.ts
export { ModalManager, getModalManager } from "./modal-manager";
export type { ModalOptions, ModalInstance, ModalAction, ConfirmOptions, ModalSize, ModalAnimation } from "./modal-manager";
// drawer-manager.ts
export { DrawerManager, createDrawerManager } from "./drawer-manager";
export type { DrawerOptions, DrawerInstance, DrawerAction, DrawerPosition, DrawerSize, DrawerAnimation } from "./drawer-manager";

// popover.ts
export { PopoverManager, createPopover } from "./popover";
export type { PopoverOptions, PopoverInstance, PopoverTrigger, PopoverPlacement } from "./popover";

// tooltip.ts
export { TooltipManager, getTooltipManager, tooltip } from "./tooltip";
export type { TooltipOptions, TooltipInstance, TooltipPlacement, TooltipTrigger } from "./tooltip";
// dropdown.ts
export { createDropdown } from "./dropdown";
export type { DropdownOptions, DropdownInstance, DropdownItem, DropdownSeparator, DropdownGroup, DropdownEntry, DropdownPlacement } from "./dropdown";

// context-menu.ts
export { ContextMenuManager } from "./context-menu";
export type { ContextMenuOptions, ContextMenuInstance, ContextMenuItem, ContextMenuPosition } from "./context-menu";

// sheet-manager.ts
export { SheetManager, createSheetManager } from "./sheet-manager";
export type { SheetOptions, SheetInstance, SheetAction, SheetSize, SheetSnapPoint } from "./sheet-manager";
// skeleton.ts
export { createSkeleton, createTextSkeleton, createHeadingSkeleton, createAvatarSkeleton, createCardSkeleton, createTableSkeleton, wrapWithSkeleton } from "./skeleton";
export type { SkeletonOptions, SkeletonTextOptions, SkeletonAvatarOptions, SkeletonCardOptions, SkeletonTableOptions } from "./skeleton";

// spinner.ts
export { createSpinner, miniSpinner, fullPageSpinner } from "./spinner";
export type { SpinnerOptions, SpinnerVariant, SpinnerSize } from "./spinner";

// progress.ts
export { createProgressTracker, createMultiProgressTracker, createStepProgress, formatProgress } from "./progress";
export type { ProgressState, ProgressCallback, ProgressController, MultiProgressController, StepProgressController } from "./progress";
// empty-state.ts
export { EmptyStateManager, createEmptyState } from "./empty-state";
export type { EmptyStateOptions, EmptyStateInstance, EmptyStateVariant } from "./empty-state";

// badge.ts
export { createBadge, createPositionedBadge, createStatusDot, addDotBadge, addCountBadge } from "./badge";
export type { BadgeOptions, BadgeVariant, BadgeSize, BadgePosition, StatusDotOptions } from "./badge";

// avatar.ts
export { createAvatar, createAvatarGroup, getInitials } from "./avatar";
export type { AvatarOptions, AvatarGroupOptions, AvatarSize, AvatarShape } from "./avatar";
// collapse.ts
export { CollapseManager, createCollapse, createCollapseGroup } from "./collapse";
export type { CollapseOptions, CollapseInstance, CollapseGroupOptions, CollapseGroupInstance, CollapseSize, CollapseVariant } from "./collapse";

// tabs.ts
export { TabsManager, createTabs } from "./tabs";
export type { TabsOptions, TabsInstance, TabItem, TabOrientation, TabVariant } from "./tabs";

// accordion.ts
export { AccordionManager, createAccordion } from "./accordion";
export type { AccordionOptions, AccordionInstance, AccordionItem, AccordionMode } from "./accordion";
// carousel.ts
export { CarouselManager, createCarousel } from "./carousel";
export type { CarouselOptions, CarouselInstance, CarouselSlide } from "./carousel";

// pagination.ts
export { PaginationManager, createPagination } from "./pagination";
export type { PaginationOptions, PaginationInstance } from "./pagination";

// breadcrumb.ts
export { BreadcrumbManager, createBreadcrumb } from "./breadcrumb";
export type { BreadcrumbOptions, BreadcrumbInstance, BreadcrumbItem } from "./breadcrumb";
// stepper.ts
export { StepperManager, createStepper } from "./stepper";
export type { StepperOptions, StepperInstance, StepConfig, StepStatus } from "./stepper";

// timeline.ts
export { TimelineManager, createTimeline } from "./timeline";
export type { TimelineOptions, TimelineInstance, TimelineItem, TimelineItemStatus } from "./timeline";

// rating.ts
export { RatingManager, createRating } from "./rating";
export type { RatingOptions, RatingInstance, StarIconType } from "./rating";
// chip.ts
export { createChip, createChipGroup } from "./chip";
export type { ChipOptions, ChipInstance, ChipGroupOptions, ChipGroupInstance, ChipSize, ChipVariant } from "./chip";

// tag-input.ts
export { TagInputManager, createTagInput } from "./tag-input";
export type { TagInputOptions, TagInputInstance, TagItem } from "./tag-input";

// switch.ts
export { createSwitch } from "./switch";
export type { SwitchOptions, SwitchInstance, SwitchSize, SwitchVariant } from "./switch";
// checkbox.ts
export { createCheckbox, createCheckboxGroup } from "./checkbox";
export type { CheckboxOptions, CheckboxInstance, CheckboxGroupOptions, CheckboxGroupInstance, CheckboxSize, CheckboxVariant } from "./checkbox";

// radio.ts
export { createRadio, RadioGroupManager, createRadioGroup } from "./radio";
export type { RadioOptions, RadioOption, RadioGroupOptions, RadioGroupInstance, RadioSize, RadioVariant } from "./radio";

// input.ts
export { createInput } from "./input";
export type { InputOptions, InputInstance, InputSize, InputVariant, InputState } from "./input";

// --- Select ---
export { SelectManager, createSelect } from "./select";
export type { SelectOption, SelectOptions, SelectInstance } from "./select";

// --- Textarea ---
export { createTextarea } from "./textarea";
export type { TextareaOptions, TextareaInstance, TextareaSize, TextareaState } from "./textarea";

// --- Form ---
export { createForm } from "./form";
export type { FormOptions, FormInstance, FormField, FormGroup, FieldType, ValidationRule } from "./form";

// --- Table ---
export {
  createTableState, getSortedData, getFilteredData, getPaginatedData,
  getCellValue, applyFilterOperator, toggleSort, setSearchTerm,
  toggleFilter, goToPage, setPageSize, toggleRowSelection,
  toggleSelectAll, toggleRowExpand, resetTable, exportTableAsCsv,
} from "./table";
export type { Column, TableState, SortState, FilterState, FilterOperator, PaginationState, SelectionState } from "./table";

// --- List ---
export { createList } from "./list";
export type { ListOptions, ListInstance, ListItem, ListSelectionMode, ListVariant } from "./list";

// --- Tree ---
export {
  createTreeNode, buildTree, flattenTree, flattenTreeWithDepth,
  findNodeById, findNodes, getPathToNode, getTreeDepth, countNodes,
  mapTree, filterTree,
} from "./tree";
export type { TreeNode } from "./tree";

// --- Calendar ---
export { CalendarManager, createCalendar } from "./calendar";
export type { CalendarOptions, CalendarInstance, CalendarEvent, CalendarView, WeekStartDay } from "./calendar";

// --- Color Picker ---
export {
  hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, parseColor,
  getLuminance, getContrastRatio, getWcagLevel, getContrastingText,
  complementary, analogous, triadic, splitComplementary, tetradic,
  monochromatic, blendColors, lighten, darken, saturate, desaturate,
  invertColor, withOpacity, generatePaletteAdvanced,
} from "./color-picker";
export type { RgbColor, HslColor, Palette } from "./color-picker";

// --- Slider ---
export { SliderManager, createSlider } from "./slider";
export type { SliderOptions, SliderInstance, SliderMark } from "./slider";

// --- Upload ---
export { createUpload } from "./upload";
export type { UploadOptions, UploadInstance, UploadFile, UploadStatus } from "./upload";

// --- Image Viewer ---
export { ImageViewerManager, createImageViewer } from "./image-viewer";
export type { ImageViewerOptions, ImageViewerInstance, ImageViewerImage, ImageViewerTool } from "./image-viewer";

// --- Code Editor ---
export { CodeEditorManager, createCodeEditor } from "./code-editor";
export type { CodeEditorOptions, CodeEditorInstance } from "./code-editor";

// --- Markdown Editor ---
export { createMarkdownEditor } from "./markdown-editor";
export type { MarkdownEditorOptions, MarkdownEditorInstance } from "./markdown-editor";

// --- Chart ---
export { ChartManager, createChart } from "./chart";
export type { ChartOptions, ChartInstance, ChartType, ChartDataset, ChartDataPoint } from "./chart";

// --- Command Palette ---
export { CommandPalette } from "./command-palette";
export type { Command, CommandPaletteConfig, CommandPaletteState, CommandCategory } from "./command-palette";

// --- Split View ---
export { createSplitView, createHorizontalSplit, createVerticalSplit } from "./split-view";
export type { SplitViewOptions, SplitViewInstance, SplitViewState, PaneConfig, SplitDirection } from "./split-view";

// --- Infinite Scroll ---
export { InfiniteScroll } from "./infinite-scroll";
export type { InfiniteScrollOptions, InfiniteScrollState, InfiniteScrollItem } from "./infinite-scroll";

// --- Virtual Scroller ---
export { VirtualScroller } from "./virtual-scroller";
export type { ScrollerConfig, ScrollerState, ScrollItem, VisibleRange, ScrollToOptions } from "./virtual-scroller";

// --- Anchor ---
export { createAnchor } from "./anchor";
export type { AnchorOptions, AnchorInstance, AnchorLink } from "./anchor";

// --- Copy Button ---
export { createCopyButton } from "./copy-button";
export type { CopyButtonOptions, CopyButtonInstance, CopyVariant, CopySize } from "./copy-button";

// --- Resizable ---
export { makeResizable, createSplitPane } from "./resizable";
export type { ResizeOptions, ResizeState, ResizableController, SplitPaneOptions, SplitPaneController } from "./resizable";

// --- Affix ---
export { createAffix } from "./affix";
export type { AffixOptions, AffixInstance } from "./affix";

// --- Back Top ---
export { createBackTop } from "./back-top";
export type { BackTopOptions, BackTopInstance, BackTopShape, BackTopPosition } from "./back-top";

// --- Watermark ---
export { createWatermark } from "./watermark";
export type { WatermarkOptions, WatermarkInstance } from "./watermark";

// --- Tour ---
export { createTour } from "./tour";
export type { TourOptions, TourInstance, TourStep } from "./tour";

// --- Hotkey ---
export { createHotkeyDisplay, createHotkeyManager, parseHotkey, formatHotkey, normalizeKeyName, matchesKeyEvent, combosEqual } from "./hotkey";
export type { HotkeyDisplayOptions, HotkeyDisplayInstance, HotkeyBinding, HotkeyManagerOptions, HotkeyManagerInstance, KeyCombo, HotkeyVariant } from "./hotkey";

// --- Segmented Control ---
export { createSegmentedControl } from "./segmented-control";
export type { SegmentedControlOptions, SegmentedControlInstance, SegmentedOption, SegmentedSize } from "./segmented-control";
// --- Statistics ---
export {
  createStatCard,
  type StatCardOptions,
  type StatisticsInstance,
  type TrendDirection,
  type SparklineType,
} from "./statistics";

// --- QR Code ---
export {
  createQR,
  type QROptions,
  type QRInstance,
  type QRLogLevel,
  encodeQR,
  generateQRMatrix,
} from "./qrcode";

// --- Signature Pad ---
export {
  createSignaturePad,
  SignaturePadManager,
  type SignaturePadOptions,
  type SignaturePadInstance,
  type StrokePoint,
  type Stroke,
} from "./signature-pad";
// --- Notification ---
export {
  NotificationManager,
  getNotificationManager,
  toast,
  type Notification,
  type NotificationOptions,
  type NotificationType,
  type NotificationPosition,
} from "./notification";

// --- Modal / Dialog ---
export {
  createModal,
  type ModalOptions,
  type ModalInstance,
  type ModalSize,
  type ModalPosition,
} from "./modal";

// --- Tooltip ---
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
  type TooltipOptions,
  type TooltipInstance,
  type TooltipPlacement,
  type TooltipTrigger,
} from "./tooltip";
// --- Avatar ---
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
  type AvatarOptions,
  type AvatarGroupOptions,
  type AvatarSize,
  type AvatarShape,
} from "./avatar";

// --- Rating ---
export {
  createRating,
  RatingManager,
  type RatingOptions,
  type RatingInstance,
  type StarIconType,
} from "./rating";

// --- Badge ---
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
  type BadgeOptions,
  type BadgeVariant,
  type BadgePosition,
  type BadgeSize,
  type StatusDotOptions,
} from "./badge";
// --- Skeleton ---
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
  type SkeletonOptions,
  type SkeletonTextOptions,
  type SkeletonAvatarOptions,
  type SkeletonCardOptions,
  type SkeletonTableOptions,
} from "./skeleton";

// --- Empty State ---
export {
  EmptyStateManager,
  createEmptyState,
  type EmptyStateOptions,
  type EmptyStateInstance,
  type EmptyStateVariant,
} from "./empty-state";

// --- Progress ---
export {
  createProgressTracker,
  createMultiProgressTracker,
  formatProgress,
  createStepProgress,
  type ProgressState,
  type ProgressCallback,
  type ProgressController,
  type MultiProgressController,
  type StepProgressController,
} from "./progress";
// --- Drawer ---
export {
  createDrawer,
  type DrawerOptions,
  type DrawerInstance,
  type DrawerSide,
  type DrawerSize,
} from "./drawer";

// --- Popover ---
export {
  PopoverManager,
  createPopover,
  type PopoverOptions,
  type PopoverInstance,
  type PopoverTrigger,
  type PopoverPlacement,
} from "./popover";

// --- Collapse ---
export {
  CollapseManager,
  createCollapse,
  createCollapseGroup,
  type CollapseOptions,
  type CollapseInstance,
  type CollapseSize,
  type CollapseVariant,
  type CollapseGroupOptions,
  type CollapseGroupInstance,
} from "./collapse";
// --- Tabs ---
export {
  TabsManager,
  createTabs,
  type TabsOptions,
  type TabsInstance,
  type TabItem,
  type TabOrientation,
  type TabVariant,
} from "./tabs";

// --- Breadcrumb ---
export {
  BreadcrumbManager,
  createBreadcrumb,
  type BreadcrumbOptions,
  type BreadcrumbInstance,
  type BreadcrumbItem,
} from "./breadcrumb";

// --- Pagination ---
export {
  PaginationManager,
  createPagination,
  type PaginationOptions,
  type PaginationInstance,
} from "./pagination";
// --- Switch ---
export {
  createSwitch,
  type SwitchOptions,
  type SwitchInstance,
  type SwitchSize,
  type SwitchVariant,
} from "./switch";

// --- Checkbox ---
export {
  createCheckbox,
  createCheckboxGroup,
  type CheckboxOptions,
  type CheckboxInstance,
  type CheckboxGroupOptions,
  type CheckboxGroupInstance,
  type CheckboxSize,
  type CheckboxVariant,
} from "./checkbox";

// --- Radio ---
export {
  RadioGroupManager,
  createRadio,
  createRadioGroup,
  type RadioGroupOptions,
  type RadioGroupInstance,
  type RadioOption,
  type RadioSize,
  type RadioVariant,
  type RadioOptions,
  type RadioInstance,
} from "./radio";
// --- Input ---
export {
  createInput,
  type InputOptions,
  type InputInstance,
  type InputSize,
  type InputVariant,
  type InputState,
} from "./input";

// --- Button ---
export {
  createButton,
  createButtonGroup,
  type ButtonOptions,
  type ButtonVariant,
  type ButtonSize,
  type ButtonGroupOptions,
  type ButtonGroupInstance,
} from "./button";

// --- Alert ---
export {
  AlertManager,
  createAlert,
  type AlertOptions,
  type AlertInstance,
  type AlertVariant,
  type AlertSize,
  type AlertAction,
} from "./alert";
// --- Dropdown ---
export {
  createDropdown,
  type DropdownOptions,
  type DropdownInstance,
  type DropdownItem,
  type DropdownEntry,
  type DropdownSeparator,
  type DropdownGroup,
  type DropdownPlacement,
} from "./dropdown";

// --- Context Menu ---
export {
  ContextMenuManager,
  type ContextMenuOptions,
  type ContextMenuInstance,
  type ContextMenuItem,
  type ContextMenuPosition,
} from "./context-menu";

// --- Navigation Menu ---
export {
  createMenu,
  type MenuOptions,
  type MenuInstance,
  type MenuItem,
  type MenuMode,
  type MenuVariant,
} from "./menu";
// --- Carousel ---
export {
  CarouselManager,
  createCarousel,
  type CarouselOptions,
  type CarouselInstance,
  type CarouselSlide,
} from "./carousel";

// --- Timeline ---
export {
  TimelineManager,
  createTimeline,
  type TimelineOptions,
  type TimelineInstance,
  type TimelineItem,
  type TimelineItemStatus,
} from "./timeline";

// --- Stepper ---
export {
  StepperManager,
  createStepper,
  type StepperOptions,
  type StepperInstance,
  type StepConfig,
  type StepStatus,
} from "./stepper";
// --- Tree View ---
export {
  TreeView,
  type TreeViewConfig,
  type TreeNodeData,
  type TreeNode,
  type CheckMode,
} from "./tree-view";

// --- Accordion ---
export {
  AccordionManager,
  createAccordion,
  type AccordionOptions,
  type AccordionInstance,
  type AccordionItem,
  type AccordionMode,
} from "./accordion";

// --- Card ---
export {
  createCard,
  type CardOptions,
  type CardInstance,
  type CardVariant,
  type CardSize,
  type CardHeaderOptions,
  type CardImageOptions,
} from "./card";
// --- Spinner ---
export {
  createSpinner,
  miniSpinner,
  fullPageSpinner,
  type SpinnerOptions,
  type SpinnerVariant,
  type SpinnerSize,
} from "./spinner";

// --- Chip ---
export {
  createChip,
  createChipGroup,
  type ChipOptions,
  type ChipInstance,
  type ChipGroupOptions,
  type ChipGroupInstance,
  type ChipSize,
  type ChipVariant,
} from "./chip";

// --- Divider ---
export {
  createDivider,
  hDivider,
  vDivider,
  labeledDivider,
  sectionDivider,
  type DividerOptions,
  type DividerOrientation,
  type DividerStyle,
} from "./divider";

// --- scroll-progress ---
export { createScrollProgress } from "./scroll-progress.js";
export type { ScrollProgressOptions, ScrollProgressInstance, ProgressBarPosition, ProgressBarVariant } from "./scroll-progress.js";

// --- countdown ---
export { createCountdown, CountdownManager } from "./countdown.js";
export type { CountdownOptions, CountdownInstance, CountdownSize, CountdownVariant } from "./countdown.js";

// --- typewriter ---
export { createTypewriter, TypewriterManager } from "./typewriter.js";
export type { TypewriterOptions, TypewriterInstance } from "./typewriter.js";

// --- marquee ---
export { createMarquee, MarqueeManager } from "./marquee.js";
export type { MarqueeOptions, MarqueeInstance, MarqueeItem, MarqueeDirection, MarqueeStyle } from "./marquee.js";

// --- parallax ---
export { createParallax, ParallaxManager } from "./parallax.js";
export type { ParallaxOptions, ParallaxInstance, ParallaxLayer, ParallaxMode, ParallaxDirection } from "./parallax.js";

// --- lightbox ---
export { createLightbox, LightboxManager } from "./lightbox.js";
export type { LightboxOptions, LightboxInstance, LightboxImage } from "./lightbox.js";

// --- color-picker ---
export { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, parseColor, getLuminance, getContrastRatio, getWcagLevel, getContrastingText, complementary, analogous, triadic, splitComplementary, tetradic, monochromatic, blendColors, lighten, darken, saturate, desaturate, invertColor, withOpacity, generatePaletteAdvanced } from "./color-picker.js";
export type { RgbColor, HslColor, Palette } from "./color-picker.js";

// --- slider ---
export { createSlider, SliderManager } from "./slider.js";
export type { SliderOptions, SliderInstance, SliderMark } from "./slider.js";

// --- file-upload ---
export { createFileUpload, FileUploadManager } from "./file-upload.js";
export type { FileUploadOptions, FileUploadInstance, UploadFile } from "./file-upload.js";

// --- calendar ---
export { createCalendar, CalendarManager } from "./calendar.js";
export type { CalendarOptions, CalendarInstance, CalendarEvent, CalendarView, WeekStartDay } from "./calendar.js";

// --- data-table ---
export { createDataTable, DataTableManager } from "./data-table.js";
export type { DataTableOptions, DataTableInstance, Column, SortState, FilterState, SortDirection } from "./data-table.js";

// --- virtual-list ---
export { createVirtualList } from "./virtual-list.js";
export type { VirtualListOptions, VirtualListInstance, VirtualListItem } from "./virtual-list.js";

// --- image-cropper ---
export { createImageCropper, ImageCropperManager } from "./image-cropper.js";
export type { ImageCropperOptions, ImageCropperInstance, CropRegion, AspectRatio } from "./image-cropper.js";

// --- form-builder ---
export { createForm, FormBuilder, validations } from "./form-builder.js";
export type { FormSchema, FormField, FormSection, FormState, FieldError, FieldValidation, SelectOption, FieldType } from "./form-builder.js";

// --- time-picker ---
export { createTimePicker } from "./time-picker.js";
export type { TimePickerOptions, TimePickerInstance, TimeFormat, TimePickerMode } from "./time-picker.js";

// --- command-palette ---
export { CommandPalette } from "./command-palette.js";
export type { Command, CommandPaletteConfig, CommandPaletteState, CommandCategory } from "./command-palette.js";

// --- mention-autocomplete ---
export { createMentionAutocomplete } from "./mention-autocomplete.js";
export type { MentionAutocompleteOptions, MentionAutocompleteInstance, MentionItem } from "./mention-autocomplete.js";

// --- rich-text-editor ---
export { createRichTextEditor } from "./rich-text-editor.js";
export type { RichTextEditorOptions, RichTextEditorInstance, EditorCommand, ToolbarButton } from "./rich-text-editor.js";

// --- code-highlight ---
export { highlightCode } from "./code-highlight.js";
export type { HighlightOptions, HighlightResult, SupportedLang } from "./code-highlight.js";

// --- image-gallery ---
export { createImageGallery, ImageGalleryManager } from "./image-gallery.js";
export type { ImageGalleryOptions, ImageGalleryInstance, GalleryImage } from "./image-gallery.js";

// --- tour ---
export { createTour } from "./tour.js";
export type { TourOptions, TourInstance, TourStep } from "./tour.js";

// --- confetti ---
export { createConfetti, confetti, confettiFromElement } from "./confetti.js";
export type { ConfettiOptions, ConfettiInstance, ParticleShape, ConfettiColors, ConfettiPhysics } from "./confetti.js";

// --- audio-player ---
export { createAudioPlayer } from "./audio-player.js";
export type { AudioPlayerOptions, AudioPlayerInstance, AudioTrack } from "./audio-player.js";

// --- video-player ---
export { createVideoPlayer } from "./video-player.js";
export type { VideoPlayerOptions, VideoPlayerInstance, VideoTrack, QualityOption, Chapter, PlaylistItem } from "./video-player.js";

// --- sticky-notes ---
export {
  StickyNotesManager,
  type StickyNote,
  type StickyNotesOptions,
  type StickyNotesState,
} from "./sticky-notes";

// --- scroll-spy ---
export {
  createScrollSpy,
  createNavSpy,
  type SpyTarget,
  type ScrollSpyOptions,
  type ScrollSpyInstance,
  type NavSpyOptions,
} from "./scroll-spy";

// --- infinite-scroll ---
export {
  InfiniteScroll,
  type InfiniteScrollItem,
  type InfiniteScrollOptions,
  type InfiniteScrollState,
} from "./infinite-scroll";

// --- toast ---
export {
  ToastManager,
  showToast,
  getToastManager,
  type ToastOptions,
  type ToastInstance,
  type ToastManagerConfig,
  type ToastType,
  type ToastPosition,
} from "./toast";

// --- modal ---
export {
  createModal,
  type ModalOptions,
  type ModalInstance,
  type ModalSize,
  type ModalPosition,
} from "./modal";

// --- tooltip ---
export {
  TooltipManager,
  tooltip,
  getTooltipManager,
  type TooltipOptions,
  type TooltipInstance,
  type TooltipPlacement,
  type TooltipTrigger,
} from "./tooltip";

// --- drawer ---
export {
  createDrawer,
  type DrawerOptions,
  type DrawerInstance,
  type DrawerSide,
  type DrawerSize,
} from "./drawer";

// --- popover ---
export {
  PopoverManager,
  createPopover,
  type PopoverOptions,
  type PopoverInstance,
  type PopoverTrigger,
  type PopoverPlacement,
} from "./popover";

// --- dropdown ---
export {
  createDropdown,
  type DropdownOptions,
  type DropdownInstance,
  type DropdownItem,
  type DropdownSeparator,
  type DropdownGroup,
  type DropdownEntry,
  type DropdownPlacement,
} from "./dropdown";

// --- context-menu ---
export {
  ContextMenuManager,
  type ContextMenuItem,
  type ContextMenuOptions,
  type ContextMenuInstance,
  type ContextMenuPosition,
} from "./context-menu";

// --- skeleton ---
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
  type SkeletonOptions,
  type SkeletonTextOptions,
  type SkeletonAvatarOptions,
  type SkeletonCardOptions,
  type SkeletonTableOptions,
} from "./skeleton";

// --- avatar ---
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
  type AvatarOptions,
  type AvatarGroupOptions,
  type AvatarSize,
  type AvatarShape,
} from "./avatar";

// --- badge ---
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
  type BadgeOptions,
  type BadgeVariant,
  type BadgePosition,
  type BadgeSize,
  type StatusDotOptions,
} from "./badge";

// --- progress ---
export {
  createProgressTracker,
  createMultiProgressTracker,
  createStepProgress,
  formatProgress,
  type ProgressState,
  type ProgressCallback,
  type ProgressController,
  type MultiProgressController,
  type StepProgressController,
} from "./progress";

// --- rating ---
export {
  RatingManager,
  createRating,
  type RatingOptions,
  type RatingInstance,
  type StarIconType,
} from "./rating";

// --- switch ---
export {
  createSwitch,
  type SwitchOptions,
  type SwitchInstance,
  type SwitchSize,
  type SwitchVariant,
} from "./switch";

// --- checkbox ---
export {
  createCheckbox,
  createRadio,
  createCheckboxGroup,
  type CheckboxOptions,
  type CheckboxInstance,
  type RadioOptions,
  type RadioInstance,
  type CheckboxGroupOptions,
  type CheckboxGroupInstance,
  type CheckboxSize,
  type CheckboxVariant,
} from "./checkbox";

// --- radio ---
export {
  RadioGroupManager,
  createRadioGroup,
  type RadioGroupOptions,
  type RadioGroupInstance,
  type RadioOption,
  type RadioSize,
  type RadioVariant,
} from "./radio";

// --- input ---
export {
  createInput,
  type InputOptions,
  type InputInstance,
  type InputSize,
  type InputVariant,
  type InputState,
} from "./input";

// --- textarea ---
export {
  createTextarea,
  type TextareaOptions,
  type TextareaInstance,
  type TextareaSize,
  type TextareaState,
} from "./textarea";

// --- select ---
export {
  SelectManager,
  createSelect,
  type SelectOptions,
  type SelectInstance,
  type SelectOption,
} from "./select";

// --- tabs ---
export {
  TabsManager,
  createTabs,
  type TabsOptions,
  type TabsInstance,
  type TabItem,
  type TabOrientation,
  type TabVariant,
} from "./tabs";

// --- accordion ---
export {
  AccordionManager,
  createAccordion,
  type AccordionOptions,
  type AccordionInstance,
  type AccordionItem,
  type AccordionMode,
} from "./accordion";

// --- carousel ---
export {
  CarouselManager,
  createCarousel,
  type CarouselOptions,
  type CarouselInstance,
  type CarouselSlide,
} from "./carousel";

// --- splitter ---
export {
  createSplitButton,
  type SplitButtonOptions,
  type SplitButtonInstance,
  type SplitButtonItem,
  type SplitButtonSize,
  type SplitButtonVariant,
} from "./splitter";

// --- resizable ---
export {
  makeResizable,
  createSplitPane,
  type ResizeOptions,
  type ResizeState,
  type ResizableController,
  type SplitPaneOptions,
  type SplitPaneController,
} from "./resizable";

// --- dnd ---
export {
  createSortable,
  createDropZone,
  makeDraggable,
  configureDnD,
  getDnDConfig,
  type SortableOptions,
  type SortableInstance,
  type DropZoneOptions,
  type DragData,
  type DraggableOptions,
  type DnDManagerConfig,
  type DnDMode,
} from "./dnd";

// --- notification ---
export {
  NotificationManager,
  getNotificationManager,
  toast,
  type Notification,
  type NotificationOptions,
  type NotificationType,
  type NotificationPosition,
} from "./notification";

// --- empty-state ---
export {
  EmptyStateManager,
  createEmptyState,
  type EmptyStateOptions,
  type EmptyStateInstance,
  type EmptyStateVariant,
} from "./empty-state";

// --- breadcrumb ---
export {
  BreadcrumbManager,
  createBreadcrumb,
  type BreadcrumbOptions,
  type BreadcrumbInstance,
  type BreadcrumbItem,
} from "./breadcrumb";

// --- stepper ---
export {
  StepperManager,
  createStepper,
  type StepperOptions,
  type StepperInstance,
  type StepConfig,
  type StepStatus,
} from "./stepper";

// --- timeline ---
export {
  TimelineManager,
  createTimeline,
  type TimelineOptions,
  type TimelineInstance,
  type TimelineItem,
  type TimelineItemStatus,
} from "./timeline";

// --- tree-view ---
export {
  TreeView,
  type TreeViewConfig,
  type TreeNodeData,
  type TreeNode,
  type CheckMode,
} from "./tree-view";

// --- Batch 874: Pagination, Alert, Card ---
export { PaginationManager, createPagination } from "./pagination";
export type { PaginationOptions, PaginationInstance } from "./pagination";
export { AlertManager, createAlert } from "./alert";
export type { AlertOptions, AlertInstance, AlertVariant, AlertSize, AlertAction } from "./alert";
export { createCard } from "./card";
export type { CardOptions, CardInstance, CardVariant, CardSize, CardHeaderOptions, CardImageOptions } from "./card";

// --- Batch 875: Comment, File Upload, Color Picker ---
export { createCommentSystem } from "./comment";
export type { CommentOptions, CommentInstance, CommentData, CommentAuthor } from "./comment";
export { FileUploadManager, createFileUpload } from "./file-upload";
export type { FileUploadOptions, FileUploadInstance, UploadFile } from "./file-upload";
export {
  hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, parseColor,
  getLuminance, getContrastRatio, getWcagLevel, getContrastingText,
  complementary, analogous, triadic, splitComplementary, tetradic, monochromatic,
  blendColors, lighten, darken, saturate, desaturate, invertColor, withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type { RgbColor, HslColor, Palette } from "./color-picker";

// --- Batch 876: Chart, Kanban, Markdown ---
export { ChartManager, createChart } from "./chart";
export type { ChartOptions, ChartInstance, ChartType, ChartDataset, ChartDataPoint } from "./chart";
export { KanbanManager, createKanban } from "./kanban";
export type { KanbanOptions, KanbanInstance, KanbanCard, KanbanColumn, KanbanSwimlane, KanbanLabel, CardPriority as KanbanCardPriority } from "./kanban";
export { mdToHtml, stripMd } from "./markdown";

// --- Batch 877: Calendar Picker, Slider, Notification Bell ---
export { CalendarPickerManager, createCalendarPicker } from "./calendar-picker";
export type { CalendarPickerOptions, CalendarPickerInstance, CalendarMode, CalendarDay, WeekStart } from "./calendar-picker";
export { SliderManager, createSlider } from "./slider";
export type { SliderOptions, SliderInstance, SliderMark } from "./slider";
export { createNotificationBell } from "./notification-bell";
export type { NotificationBellOptions, NotificationBellInstance, NotificationItem } from "./notification-bell";

// --- Batch 878: Avatar Group, Chip Input, Stat Card ---
export { AvatarGroupManager, createAvatarGroup } from "./avatar-group";
export type { AvatarGroupOptions, AvatarGroupInstance, AvatarItem, AvatarSize, StackDirection } from "./avatar-group";
export { ChipInputManager, createChipInput } from "./chip-input";
export type { ChipInputOptions, ChipInputInstance, ChipData, ChipSuggestion } from "./chip-input";
export { createStatCard } from "./stat-card";
export type { StatCardOptions, TrendDirection, StatCardVariant } from "./stat-card";

// --- Batch 879: Data Grid, Form Wizard, Search Input ---
export { DataGridManager, createDataGrid } from "./data-grid";
export type { GridOptions, DataGridInstance, GridColumn, GridRow, GridGrouping } from "./data-grid";
export { FormWizardManager, createFormWizard } from "./form-wizard";
export type { WizardOptions, WizardInstance, WizardStep } from "./form-wizard";
export { SearchInputManager, createSearchInput } from "./search-input";
export type { SearchInputOptions, SearchInputInstance, SuggestionItem, SearchHistoryEntry } from "./search-input";

// --- Batch 880: QR Code, Signature Pad, Color Swatches ---
export { generateQrSvg, generateQrDataUri, generateQrCanvas, validateQrInput } from "./qr-code";
export { SignaturePadManager, createSignaturePad } from "./signature-pad";
export type { SignaturePadOptions, SignaturePadInstance, Stroke, StrokePoint } from "./signature-pad";
export { ColorSwatchesManager, createColorSwatches } from "./color-swatches";
export type { ColorSwatchesOptions, ColorSwatchesInstance, ColorPalette, ColorSwatch } from "./color-swatches";

// --- Batch 881: Context Provider, Event Bus, Virtual List ---
export { createContext, ThemeContext, AuthContext, I18nContext, ResponsiveContext, createResponsiveProvider } from "./context-provider";
export type { ContextOptions, ProviderInstance, ConsumerHandle, Context, ThemeContextValue, AuthContextValue, I18nContextValue, ResponsiveContextValue } from "./context-provider";
export { EventBus, createEventBus } from "./event-bus";
export type { EventBusOptions, Subscription, EmittedEvent, EventCallback, EventMiddleware } from "./event-bus";
export { createVirtualList } from "./virtual-list";
export type { VirtualListOptions, VirtualListInstance, VirtualListItem } from "./virtual-list";

// --- Batch 882: Toast Stack, Hotkeys Manager, I18n Manager ---
export { ToastStackManager, createToastStack } from "./toast-stack";
export type { ToastStackOptions, ToastStackInstance, ToastOptions as ToastStackToastOptions, ToastType, ToastPosition } from "./toast-stack";
export { HotkeysManager, createHotkeysManager } from "./hotkeys-manager";
export type { HotkeysManagerOptions, HotkeysInstance, HotkeyBinding, HotkeyCombo, HotkeyHintOptions, ParsedCombo } from "./hotkeys-manager";
export { I18nManager, createI18n } from "./i18n-manager";
export type { I18nConfig, I18nStats, LocaleData, LocaleFormats, PluralRuleSet, InterpolationOptions } from "./i18n-manager";

// --- Batch 883: Clipboard API, Print Utils, DOM Observer ---
export { ClipboardAPI, copyToClipboard, readFromClipboard, copyElement, copyElementRich } from "./clipboard-api";
export type { ClipboardOptions, ClipboardResult, ClipboardItemData, ClipboardFormat, ClipboardPermissionState, ClipboardHistoryEntry } from "./clipboard-api";
export { printContent, printPreview, printElement, generateReceiptText, generateLabel, injectPrintStyles, PRINT_STYLES, getPrintableArea, estimatePageCount, paginateContent, generatePDF } from "./print-utils";
export type { PrintOptions, ReceiptOptions, PageSettings } from "./print-utils";
export { DomObserverManager, takeSnapshot, compareSnapshots, createRouteChangeDetector, createLazyLoader } from "./dom-observer";
export type { ObserveTarget, MutationOptions, IntersectionOptions, ResizeOptions, MutationRecordEx, DomSnapshot, ObserverCallbacks, ObserverStats } from "./dom-observer";

// --- Drag and Drop ---
export { DragDropManager, getDragDropManager } from "./drag-and-drop";
export type { DragMode, DropPosition, DragItem, DragOptions, DropZoneOptions, DropResult, SortableConfig } from "./drag-and-drop";

// --- Tooltip Manager ---
export { TooltipManager } from "./tooltip-manager";
export type { Placement, TriggerMode, TooltipOptions, VirtualElement, TooltipInstance } from "./tooltip-manager";

// --- Modal Dialog ---
export { createModal } from "./modal-dialog";
export type { ModalSize, ModalVariant, ModalOptions, ModalInstance } from "./modal-dialog";

// --- Form Validator ---
export { FormValidator, required, minLength, maxLength, pattern, email, urlValidator, range, matchesField, asyncValidator, custom } from "./form-validator";
export type { FieldValidationResult, FormValidationResult, ValidatorFn, FieldConfig, FormValidatorOptions } from "./form-validator";

// --- Accordion Manager ---
export { createAccordion } from "./accordion-manager";
export type { AccordionMode, ExpandDirection, AccordionPanel, AccordionOptions, AccordionInstance } from "./accordion-manager";

// --- Tabs Manager ---
export { createTabs } from "./tabs-manager";
export type { TabVariant, TabPosition, TabOverflowMode, TabPanel, TabsOptions, TabsInstance } from "./tabs-manager";

// --- Progress Stepper ---
export { createProgressStepper } from "./progress-stepper";
export type { StepStatus, StepperOrientation, StepperVariant, StepItem, ProgressStepperOptions, ProgressStepperInstance } from "./progress-stepper";

// --- Skeleton Loader ---
export { createSkeleton } from "./skeleton-loader";
export type { SkeletonShape, SkeletonAnimation, SkeletonItem, SkeletonOptions, SkeletonInstance } from "./skeleton-loader";

// --- Context Menu ---
export { ContextMenuManager } from "./context-menu";
export type { ContextMenuItem, ContextMenuPosition, ContextMenuOptions, ContextMenuInstance } from "./context-menu";

// --- Rating Input ---
export { createRatingInput } from "./rating-input";
export type { RatingIcon, RatingSize, RatingInputOptions, RatingInputInstance } from "./rating-input";

// --- Badge Manager ---
export { createBadge, createDotBadge, createStatusBadge } from "./badge-manager";
export type { BadgeVariant, BadgePosition, BadgeSize, DotSize, BadgeOptions, DotBadgeOptions, StatusBadgeOptions, BadgeInstance, DotBadgeInstance, StatusBadgeInstance } from "./badge-manager";

// --- Anchor Navigation ---
export { createAnchorNav } from "./anchor-nav";
export type { AnchorLink, AnchorNavOptions, AnchorNavInstance } from "./anchor-nav";

// --- Scroll Spy ---
export { createScrollSpy, createNavSpy } from "./scroll-spy";
export type { SpyTarget, ScrollSpyOptions, ScrollSpyInstance, NavSpyOptions } from "./scroll-spy";

// --- Image Zoom ---
export { createImageZoom } from "./image-zoom";
export type { ZoomMode, ZoomLensShape, ImageZoomOptions, ImageZoomInstance } from "./image-zoom";

// --- Lightbox ---
export { LightboxManager, createLightbox } from "./lightbox";
export type { LightboxImage, LightboxOptions, LightboxInstance } from "./lightbox";

// --- Carousel ---
export { CarouselManager, createCarousel } from "./carousel";
export type { CarouselSlide, CarouselOptions, CarouselInstance } from "./carousel";

// --- Countdown Timer ---
export { createCountdownTimer } from "./countdown-timer";
export type { CountdownDisplayMode, CountdownUnit, CountdownTimerOptions, CountdownTimerInstance } from "./countdown-timer";

// --- Infinite Scroll ---
export { InfiniteScroll } from "./infinite-scroll";
export type { InfiniteScrollItem, InfiniteScrollOptions, InfiniteScrollState } from "./infinite-scroll";

// --- Resizable ---
export { makeResizable, createSplitPane } from "./resizable";
export type { ResizeOptions, ResizeState, SplitPaneOptions, ResizableController, SplitPaneController } from "./resizable";

// --- Split View ---
export { createSplitView, createHorizontalSplit, createVerticalSplit } from "./split-view";
export type { SplitDirection, PaneConfig, SplitViewOptions, SplitViewState, SplitViewInstance } from "./split-view";

// --- Tree View ---
export { TreeView } from "./tree-view";
export type { TreeNodeData, TreeNode, CheckMode, TreeViewConfig } from "./tree-view";

// --- Command Palette ---
export { CommandPalette } from "./command-palette";
export type { Command, CommandCategory, CommandPaletteConfig, CommandPaletteState } from "./command-palette";

// --- Notification Manager ---
export { createNotificationCenter } from "./notification-manager";
export type { NotificationType, NotificationPriority, NotificationItem, NotificationAction, NotificationCenterOptions, NotificationCenterInstance } from "./notification-manager";

// --- Overlay Manager ---
export { OverlayManager } from "./overlay-manager";
export type { OverlayId, OverlayRole, OverlayOptions, OverlayInstance } from "./overlay-manager";
// --- Selection Utils ---
export { getSelection, setSelection, clearSelection, getSelectedText, getCaretPosition, setCaretPosition, moveCaret, getCaretCoordinates, makeContentEditable, insertAtCaret, insertHtmlAtCaret, wrapSelection, unwrapSelection, highlightRange, removeHighlights, highlightAll, selectAll, selectBetween, createSelectionDetector } from "./selection-utils";

// --- Undo/Redo ---
export { UndoHistory } from "./undo-redo";
export type { UndoItem, UndoBranch, UndoHistoryOptions, UndoState, UndoChangeListener } from "./undo-redo";

// --- Shortcuts Guide ---
export { createShortcutsGuide, createShortcutHint } from "./shortcuts-guide";
export type { ShortcutItem, ShortcutCategory, ShortcutsGuideOptions, ShortcutsGuideInstance } from "./shortcuts-guide";
// --- Clipboard Manager ---
export { ClipboardManager, requestClipboardPermission, requestReadPermission, isClipboardApiAvailable, sanitizeHtml } from "./clipboard-manager";
export type { ClipboardData, ClipboardDataType, ClipboardPermission, ClipboardHistoryEntry, ClipboardConfig, CopyOptions, PasteOptions } from "./clipboard-manager";

// --- Color Picker ---
export { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, parseColor, getLuminance, getContrastRatio, getWcagLevel, getContrastingText, complementary, analogous, triadic, splitComplementary, tetradic, monochromatic, blendColors, lighten, darken, saturate, desaturate, invertColor, withOpacity, generatePaletteAdvanced } from "./color-picker";
export type { RgbColor, HslColor, Palette } from "./color-picker";

// --- Date Picker ---
export { DatePickerManager, createDatePicker } from "./date-picker";
export type { DatePickerOptions, DatePickerInstance } from "./date-picker";
// --- File Upload ---
export { FileUploadManager, createFileUpload } from "./file-upload";
export type { FileUploadOptions, UploadFile, FileUploadInstance } from "./file-upload";

// --- Virtual List ---
export { createVirtualList } from "./virtual-list";
export type { VirtualListItem, VirtualListOptions, VirtualListInstance } from "./virtual-list";

// --- Markdown Renderer ---
export { parseMarkdown, renderToHtml, generateToc, renderToc, extractFrontMatter, extractText, countWords, readingTime, mdToHtml } from "./markdown-renderer";
export type { MdNode, MdNodeType, MdRenderOptions, TocEntry, FrontMatter } from "./markdown-renderer";
// --- Chart Utils ---
export { calculateAxisScale, formatAxisLabel, valueToPixel, pixelToValue, aggregateByInterval, movingAverage, calculatePercentChanges, findExtrema, generateChartColors, interpolateColor, getDataStats } from "./chart-utils";
export type { DataPoint, DataSeries, ChartConfig, AxisScale, ColorPaletteName, DataStats } from "./chart-utils";

// --- Animation Engine ---
export { easings, getEasing, springAnimate, AnimationTimeline, createScrollAnimation, staggerElements, animateCounter, createParallax } from "./animation-engine";
export type { EasingFunction, SpringConfig, SpringState, Keyframe, AnimationTrack, ScrollAnimationConfig } from "./animation-engine";

// --- I18n Manager ---
export { I18nManager, createI18n } from "./i18n-manager";
export type { Locale, MessageKey, Namespace, LocaleData, MessageCatalog, PluralRuleSet, LocaleFormats, I18nConfig, InterpolationOptions, I18nStats } from "./i18n-manager";
// --- Storage Manager ---
export { StorageManager } from "./storage-manager";
export type { StorageBackend, StorageEntry, StorageOptions, StorageStats, MigrationPlan } from "./storage-manager";

// --- Event Bus ---
export { EventBus, createEventBus } from "./event-bus";
export type { EventCallback, EventMiddleware, Subscription, EmittedEvent, EventBusOptions } from "./event-bus";

// --- State Machine ---
export { FSM, HSM, createMachine, interpret, match, stateEquals, evaluateChoice, evaluateJunction, deepHistoryTarget, shallowHistoryTarget } from "./state-machine";
export type { StateId, EventId, MachineContext, EventPayload, GuardFn, ActionFn, StateListener, InvalidEventStrategy, TransitionTarget, TransitionDef, StateConfig, HistoryMode, MachineConfig, ChoiceConfig, JunctionConfig, StateValue, TransitionHistoryEntry, Service } from "./state-machine";
// --- CSS-in-JS ---
export { injectStyle, removeStyle, updateStyle, setCssVar, getCssVar, setCssVars, getRootVar, setRootVar, getCurrentBreakpoint, isMinWidth, isMaxWidth, onBreakpointChange, isMobile, isTablet, isDesktop, getDevicePixelRatio, isRetina, mq, mediaQueries, matchesMedia, subscribeMedia, isDarkMode, isLightMode, toggleDarkMode, setDarkMode, onDarkModeChange, buildKeyframes, registerKeyframes, animations, animate, toggleClass, classIf, setClasses, hasAnyClass, bringToFront, sendToBack } from "./css-in-js";
export type { Breakpoints } from "./css-in-js";

// --- DOM Diff ---
export { diff, patch, syncDOM, renderDOM, domToTree } from "./dom-diff";
export type { PatchOp, DomNode, DiffOptions, DiffResult, PatchResult } from "./dom-diff";

// --- Router ---
export { Router, createRouter, getRouter } from "./router";
export type { RouteMode, RouteParams, QueryParams, RouteDefinition, RouterConfig, RouteInfo, NavigationResult } from "./router";
// --- Form Builder ---
export { FormBuilder, createForm, validations } from "./form-builder";
export type { FieldType, FieldValidation, SelectOption, FormField, FormSection, FormSchema, FieldError, FormState } from "./form-builder";

// --- Table Manager ---
export { createTable } from "./table-manager";
export type { ColumnDef, SortDirection, SortState, FilterState, PaginationState, SelectionState, TableOptions, TableInstance } from "./table-manager";

// --- Toast Notification ---
export { createToastManager } from "./toast-notification";
export type { ToastType, ToastPosition, ToastOptions, ToastManagerOptions, ToastInstance } from "./toast-notification";
// --- Drag-Drop List ---
export { createDndList } from "./drag-drop-list";
export type { DndListItem, DndListOptions, DndListInstance } from "./drag-drop-list";

// --- Kanban Board ---
export { createKanbanBoard } from "./kanban-board";
export type { KanbanCard, KanbanColumn, KanbanBoardOptions, KanbanBoardInstance } from "./kanban-board";

// --- Split Buttons ---
export { createSplitButtons, createToggleGroup, createIconButtonBar } from "./split-buttons";
export type { SplitButtonOption, SplitButtonOptions, SplitButtonInstance, ButtonVariant, ButtonSize, ToggleGroupOptions, IconButtonBarOptions } from "./split-buttons";
// --- Hotkeys ---
export { HotkeyManager, parseKeyCombo, eventMatchesCombo, formatKeyDisplay, createAppHotkeys, areModifiersDown, getModifierString } from "./hotkeys";
export type { HotkeyBinding, HotkeyEvent, ParsedKeyCombo } from "./hotkeys";

// --- Logger ---
export { Logger, setGlobalLogLevel, getGlobalLogLevel, log, apiLog, dbLog, extLog } from "./logger";
export type { LogLevel, LogTransport, LogEntry } from "./logger";

// --- Perf Monitor ---
export { PerfMonitor, createPerfMonitor } from "./perf-monitor";
export type { FpsMetrics, MemoryInfo, PerfEntry, PerfReport, WebVitals, PerfMonitorOptions } from "./perf-monitor";
// --- Accessibility ---
export { focusTrap, announce, liveRegion, skipLinkAttrs, prefersReducedMotion, animationDuration } from "./accessibility";
export const SKIP_LINK_ID = "skip-to-main-content";
export const srOnly = "absolute w-[1px] h-[1px] p-0 -m-[1px] overflow-hidden whitespace-nowrap border-0 clip-[rect(0)]";
export const ROLES = {
  main: "main",
  navigation: "navigation",
  banner: "banner",
  complementary: "complementary",
  contentinfo: "contentinfo",
  search: "search",
  form: "form",
  alert: "alert",
  dialog: "dialog",
  alertdialog: "alertdialog",
} as const;

// --- Theme Engine ---
export { ThemeEngine, getThemeEngine, setTheme, toggleTheme, getCurrentTheme, isDarkMode } from "./theme-engine";
export type { ThemeMode, DesignToken, TokenCategory, ThemeDefinition, ThemeEngineOptions } from "./theme-engine";

// --- Notification Center ---
export { NotificationCenterManager, createNotificationCenter } from "./notification-center";
export type { NotificationItem, NotificationCenterOptions, NotificationCenterInstance, NotificationType } from "./notification-center";
// --- Command Palette ---
export { CommandPalette } from "./command-palette";
export type { Command, CommandCategory, CommandPaletteConfig, CommandPaletteState } from "./command-palette";

// --- Tooltip ---
export { TooltipManager, getTooltipManager, tooltip } from "./tooltip";
export type { TooltipOptions, TooltipInstance, TooltipPlacement, TooltipTrigger } from "./tooltip";

// --- Context Menu ---
export { ContextMenuManager } from "./context-menu";
export type { ContextMenuItem, ContextMenuOptions, ContextMenuInstance, ContextMenuPosition } from "./context-menu";
// --- Modal ---
export { createModal } from "./modal";
export type { ModalOptions, ModalInstance, ModalSize, ModalPosition } from "./modal";

// --- Drawer ---
export { createDrawer } from "./drawer";
export type { DrawerOptions, DrawerInstance, DrawerSide, DrawerSize } from "./drawer";

// --- Popover ---
export { PopoverManager, createPopover } from "./popover";
export type { PopoverOptions, PopoverInstance, PopoverTrigger, PopoverPlacement } from "./popover";
// --- Skeleton ---
export { createSkeleton, createTextSkeleton, createHeadingSkeleton, createAvatarSkeleton, createCardSkeleton, createTableSkeleton, wrapWithSkeleton } from "./skeleton";
export type { SkeletonOptions, SkeletonTextOptions, SkeletonAvatarOptions, SkeletonCardOptions, SkeletonTableOptions } from "./skeleton";

// --- Avatar ---
export { createAvatar, createAvatarGroup, getInitials } from "./avatar";
export type { AvatarOptions, AvatarGroupOptions, AvatarSize, AvatarShape } from "./avatar";

// --- Badge ---
export { createBadge, createPositionedBadge, createStatusDot, addDotBadge, addCountBadge } from "./badge";
export type { BadgeOptions, BadgeVariant, BadgePosition, BadgeSize, StatusDotOptions } from "./badge";
// --- Progress ---
export { createProgressTracker, createMultiProgressTracker, createStepProgress, formatProgress } from "./progress";
export type { ProgressState, ProgressCallback, ProgressController, MultiProgressController, StepProgressController } from "./progress";

// --- Tabs ---
export { TabsManager, createTabs } from "./tabs";
export type { TabItem, TabOrientation, TabVariant, TabsOptions, TabsInstance } from "./tabs";

// --- Accordion ---
export { AccordionManager, createAccordion } from "./accordion";
export type { AccordionItem, AccordionMode, AccordionOptions, AccordionInstance } from "./accordion";
// --- Carousel ---
export { CarouselManager, createCarousel } from "./carousel";
export type { CarouselSlide, CarouselOptions, CarouselInstance } from "./carousel";

// --- Rating ---
export { RatingManager, createRating } from "./rating";
export type { RatingOptions, RatingInstance, StarIconType } from "./rating";

// --- Pagination ---
export { PaginationManager, createPagination } from "./pagination";
export type { PaginationOptions, PaginationInstance } from "./pagination";
// --- Breadcrumb ---
export { BreadcrumbManager, createBreadcrumb } from "./breadcrumb";
export type { BreadcrumbItem, BreadcrumbOptions, BreadcrumbInstance } from "./breadcrumb";

// --- Stepper ---
export { StepperManager, createStepper } from "./stepper";
export type { StepConfig, StepStatus, StepperOptions, StepperInstance } from "./stepper";

// --- Timeline ---
export { TimelineManager, createTimeline } from "./timeline";
export type { TimelineItem, TimelineItemStatus, TimelineOptions, TimelineInstance } from "./timeline";
// --- Empty State ---
export { EmptyStateManager, createEmptyState } from "./empty-state";
export type { EmptyStateOptions, EmptyStateInstance, EmptyStateVariant } from "./empty-state";

// --- Spinner ---
export { createSpinner, miniSpinner, fullPageSpinner } from "./spinner";
export type { SpinnerOptions, SpinnerVariant, SpinnerSize } from "./spinner";

// --- Collapse ---
export { CollapseManager, createCollapse, createCollapseGroup } from "./collapse";
export type { CollapseOptions, CollapseInstance, CollapseSize, CollapseVariant, CollapseGroupOptions, CollapseGroupInstance } from "./collapse";
// --- Tree View ---
export { TreeView } from "./tree-view";
export type { TreeNodeData, TreeNode, TreeViewConfig, CheckMode } from "./tree-view";

// --- Resizable ---
export { makeResizable } from "./resizable";
export type { ResizeOptions, ResizeState, ResizableController } from "./resizable";

// --- Split Pane ---
export { createSplitPane as createSplitPaneAdvanced } from "./resizable";
export { createSplitPane as createSplitPaneLayout } from "./split-pane";
export type { SplitPaneOptions as AdvancedSplitPaneOptions, SplitPaneController } from "./resizable";
export type { SplitPaneOptions, SplitPaneInstance, SplitOrientation, SplitCollapseDirection } from "./split-pane";
// --- Alert ---
export { AlertManager, createAlert } from "./alert";
export type { AlertOptions, AlertInstance, AlertVariant, AlertSize, AlertAction } from "./alert";

// --- Chip ---
export { createChip, createChipGroup } from "./chip";
export type { ChipOptions, ChipInstance, ChipSize, ChipVariant, ChipGroupOptions, ChipGroupInstance } from "./chip";

// --- Switch ---
export { createSwitch } from "./switch";
export type { SwitchOptions, SwitchInstance, SwitchSize, SwitchVariant } from "./switch";

// --- Input Mask ---
export { InputMaskManager, createInputMask } from "./input-mask";
export type { MaskOptions, MaskInstance, MaskType } from "./input-mask";

// --- Typeahead ---
export { TypeaheadManager, createTypeahead } from "./typeahead";
export type { TypeaheadOptions, TypeaheadInstance, TypeaheadItem } from "./typeahead";

// --- Color Picker Advanced ---
export { createColorPicker } from "./color-picker-advanced";
export type { ColorPickerOptions, ColorPickerInstance, ColorMode, PickerPlacement, RgbColor, HslColor, HsvColor, ColorSwatch } from "./color-picker-advanced";

// --- Date Picker ---
export { DatePickerManager, createDatePicker } from "./date-picker";
export type { DatePickerOptions, DatePickerInstance } from "./date-picker";

// --- Rich Text Editor ---
export { createRichTextEditor } from "./rich-text-editor";
export type { RichTextEditorOptions, RichTextEditorInstance, EditorCommand, ToolbarButton } from "./rich-text-editor";

// --- File Upload ---
export { FileUploadManager, createFileUpload } from "./file-upload";
export type { FileUploadOptions, FileUploadInstance, UploadFile } from "./file-upload";

// --- Form Validator ---
export { FormValidator, required, minLength, maxLength, pattern, email, urlValidator, range, matchesField, asyncValidator, custom } from "./form-validator";
export type { FieldValidationResult, FormValidationResult, ValidatorFn, FieldConfig, FormValidatorOptions } from "./form-validator";

// --- Virtual Scroll ---
export { createVirtualScroll } from "./virtual-scroll";
export type { VirtualScrollOptions, VirtualScrollInstance, VirtualItem } from "./virtual-scroll";

// --- Infinite Scroll ---
export { InfiniteScroll } from "./infinite-scroll";
export type { InfiniteScrollOptions, InfiniteScrollState, InfiniteScrollItem } from "./infinite-scroll";

// --- Data Table ---
export { DataTableManager, createDataTable } from "./data-table";
export type { DataTableOptions, DataTableInstance, Column, SortState, FilterState } from "./data-table";

// --- Chart Base ---
export { ChartManager, createChart } from "./chart-base";
export type { ChartOptions, ChartInstance, ChartType, ChartDataset, ChartDataPoint, ChartAxisOptions, ChartLegendOptions, ChartTooltipOptions, TooltipData, ChartAnimationOptions } from "./chart-base";

// --- Kanban Board ---
export { createKanbanBoard } from "./kanban-board";
export type { KanbanBoardOptions, KanbanBoardInstance, KanbanCard, KanbanColumn } from "./kanban-board";

// --- Sortable List ---
export { createSortableList } from "./sortable-list";
export type { SortableListOptions, SortableListInstance, SortableItem } from "./sortable-list";

// --- Anchor Nav ---
export { createAnchorNav } from "./anchor-nav";
export type { AnchorNavOptions, AnchorNavInstance, AnchorLink } from "./anchor-nav";

// --- Undo/Redo ---
export { UndoHistory } from "./undo-redo";
export type { UndoHistoryOptions, UndoState, UndoItem, UndoBranch, UndoChangeListener } from "./undo-redo";

// --- Clipboard ---
export { copyToClipboard, copyRichToClipboard, readFromClipboard, readRichFromClipboard, isClipboardAvailable, canReadClipboard, watchClipboard } from "./clipboard";
export type { ClipboardData, ClipboardOptions } from "./clipboard";

// --- Search Highlight ---
export { SearchHighlightManager, createSearchHighlight } from "./search-highlight";
export type { SearchHighlightOptions, SearchHighlightInstance } from "./search-highlight";

// --- Marquee ---
export { MarqueeManager, createMarquee } from "./marquee";
export type { MarqueeOptions, MarqueeInstance, MarqueeItem, MarqueeDirection, MarqueeStyle } from "./marquee";

// --- Countdown Timer ---
export { createCountdownTimer } from "./countdown-timer";
export type { CountdownTimerOptions, CountdownTimerInstance, CountdownDisplayMode, CountdownUnit } from "./countdown-timer";

// --- Stopwatch ---
export { createStopwatch } from "./stopwatch";
export type { StopwatchOptions, StopwatchInstance, LapRecord } from "./stopwatch";

// --- Clock ---
export { createClock } from "./clock";
export type { ClockOptions, ClockInstance, ClockStyle, ClockSize, SecondHandStyle, TimeZoneInfo } from "./clock";

// --- Rating Summary ---
export { createRatingSummary } from "./rating-summary";
export type { RatingSummaryOptions, RatingSummaryInstance, RatingEntry } from "./rating-summary";

// --- Mention ---
export { MentionManager, createMention } from "./mention";
export type { MentionOptions, MentionInstance, MentionOption } from "./mention";

// --- Signature Pad ---
export { SignaturePadManager, createSignaturePad } from "./signature-pad";
export type { SignaturePadOptions, SignaturePadInstance, Stroke, StrokePoint } from "./signature-pad";

// --- Color Contrast ---
export { contrastRatio, analyzeContrast, generatePalette, simulateColorBlindness, findContrastingColor, passesAA, passesAAA, getGrade } from "./color-contrast";
export type { RgbColor as RgbColorType, HslColor as HslColorType, ContrastResult, ColorPaletteOptions, ColorPaletteResult, ColorBlindnessType } from "./color-contrast";

// --- CSS-in-JS ---
export { injectStyle, removeStyle, updateStyle, setCssVar, getCssVar, setCssVars, getRootVar, setRootVar, getCurrentBreakpoint, isMinWidth, isMaxWidth, onBreakpointChange, isMobile, isTablet, isDesktop, getDevicePixelRatio, isRetina, mq, mediaQueries, matchesMedia, subscribeMedia, isDarkMode, isLightMode, toggleDarkMode, setDarkMode, onDarkModeChange, buildKeyframes, registerKeyframes, animations, animate, toggleClass, classIf, setClasses, hasAnyClass, bringToFront, sendToBack } from "./css-in-js";
export type { Breakpoints } from "./css-in-js";

// --- Shortcuts ---
export { createShortcutManager } from "./shortcuts";
export type { ShortcutManagerOptions, ShortcutInstance, ShortcutBinding, ShortcutGroup } from "./shortcuts";

// --- QR Code ---
export { generateQrSvg, generateQrDataUri, generateQrCanvas, validateQrInput } from "./qr-code";

// --- Barcode ---
export { createBarcode } from "./barcode";
export type { BarcodeOptions, BarcodeInstance, BarcodeType } from "./barcode";

// --- PDF Preview ---
export { createPdfPreview } from "./pdf-preview";
export type { PdfPreviewOptions, PdfPreviewInstance } from "./pdf-preview";

// --- OCR Engine ---
export { createOcrEngine } from "./ocr-engine";
export type { OcrOptions, OcrInstance, OcrResult, OcrWord, OcrRegion } from "./ocr-engine";

// --- Image Compressor ---
export { compressImage, batchCompressImages, resizeImage, imageToDataUri, getImageInfo } from "./image-compressor";
export type { CompressOptions, CompressResult, BatchCompressOptions, BatchCompressResult, ImageFormat } from "./image-compressor";

// --- EXIF Reader ---
export { readExif, hasExifData, getExifOrientation as getExifOrientationFromExif, formatGpsCoordinates, generateMapsLink } from "./exif-reader";
export type { ExifData, ExifCameraData, ExifPhotoData, ExifGpsData, ExifDateTime, ExifThumbnailData, ExifOrientation } from "./exif-reader";

// --- Audio Recorder ---
export { createAudioRecorder } from "./audio-recorder";
export type { AudioRecorderOptions, AudioRecorderInstance, AudioRecordingResult, AudioFormat } from "./audio-recorder";

// --- Video Player ---
export { createVideoPlayer } from "./video-player";
export type { VideoPlayerOptions, VideoPlayerInstance, PlaylistItem, Chapter, QualityOption, VideoTrack } from "./video-player";

// --- Media Editor ---
export { createMediaEditor } from "./media-editor";
export type { MediaEditorInstance, FilterType, FilterConfig, CropRegion, AnnotationLine, AnnotationRect, TextOverlay, WatermarkOptions, AdjustmentParams, ExportOptions } from "./media-editor";

// --- Animation Engine ---
export { easings, getEasing, springAnimate, AnimationTimeline, createScrollAnimation, staggerElements, animateCounter, createParallax } from "./animation-engine";
export type { EasingFunction, SpringConfig as AnimSpringConfig, SpringState, Keyframe, AnimationTrack, ScrollAnimationConfig } from "./animation-engine";

// --- Spring Physics ---
export { createSpring, createPresetSpring, SpringPresets } from "./spring-physics";
export type { SpringConfig, SpringOptions, SpringInstance, ChainableSpring } from "./spring-physics";

// --- Tween Engine ---
export { createTween, tweenAll, tweenSequence, fadeIn, fadeOut, slideIn } from "./tween-engine";
export type { TweenProps, TweenInstance, Tweenable, TweenValue, TweenProp } from "./tween-engine";

// --- Drag and Drop ---
export { DragDropManager, getDragDropManager } from "./drag-and-drop";
export type { DragItem, DragOptions, DropZoneOptions, DropResult, SortableConfig, DragMode, DropPosition } from "./drag-and-drop";

// --- Sortable ---
export { SortableList, createSortable } from "./sortable";
export type { SortableOptions, SortableInstance, SortableItem } from "./sortable";

// --- Resize Handle ---
export { createResizeHandle, makeResizable } from "./resize-handle";
export type { ResizeHandleOptions, ResizeInstance, ResizeState, HandlePosition } from "./resize-handle";

// --- Split View ---
export { createSplitView, createHorizontalSplit, createVerticalSplit } from "./split-view";
export type { SplitViewOptions, SplitViewInstance, SplitViewState, PaneConfig, SplitDirection } from "./split-view";

// --- Stack Layout ---
export { createStackLayout } from "./stack-layout";
export type { StackLayoutOptions, StackLayoutInstance, StackItem, StackAnimation, SwipeDirection } from "./stack-layout";

// --- Masonry ---
export { MasonryManager, createMasonry } from "./masonry";
export type { MasonryOptions, MasonryInstance, MasonryItem } from "./masonry";

// --- Notification System ---
export { NotificationCenter, PushNotificationManager } from "./notification-system";
export type { Notification, NotificationConfig, NotificationType, NotificationPriority } from "./notification-system";

// --- Toast Manager ---
export { ToastManagerClass, createToastManager, getToastManager } from "./toast-manager";
export type { ToastManagerOptions, ToastManagerInstance, Toast, ToastOptions, ToastType, ToastPosition, ToastAction } from "./toast-manager";

// --- Alert Dialog ---
export { createAlertDialog, alert, confirm as confirmDialog, prompt as promptDialog } from "./alert-dialog";
export type { AlertDialogOptions, AlertDialogInstance, DialogType, DialogSize } from "./alert-dialog";

// --- Tooltip ---
export { TooltipManager, getTooltipManager, tooltip } from "./tooltip";
export type { TooltipOptions, TooltipInstance, TooltipPlacement, TooltipTrigger } from "./tooltip";

// --- Popover ---
export { PopoverManager, createPopover } from "./popover";
export type { PopoverOptions, PopoverInstance, PopoverTrigger, PopoverPlacement } from "./popover";

// --- Dropdown Menu ---
export { DropdownMenuManager, createDropdownMenu } from "./dropdown-menu";
export type { DropdownMenuOptions, DropdownMenuInstance, MenuItem, MenuItemType } from "./dropdown-menu";

// --- Skeleton ---
export { createSkeleton, createTextSkeleton, createHeadingSkeleton, createAvatarSkeleton, createCardSkeleton, createTableSkeleton, wrapWithSkeleton } from "./skeleton";
export type { SkeletonOptions, SkeletonTextOptions, SkeletonAvatarOptions, SkeletonCardOptions, SkeletonTableOptions } from "./skeleton";

// --- Avatar ---
export { createAvatar, createAvatarGroup, getInitials } from "./avatar";
export type { AvatarOptions, AvatarGroupOptions, AvatarSize, AvatarShape } from "./avatar";

// --- Badge ---
export { createBadge, createPositionedBadge, createStatusDot, addDotBadge, addCountBadge } from "./badge";
export type { BadgeOptions, BadgeVariant, BadgeSize, BadgePosition, StatusDotOptions } from "./badge";

// --- Batch 929: Progress Bar, Rating, Chip Input ---
export {
  createProgressBar,
  createCircleProgress,
  type ProgressBarOptions,
  type CircleProgressOptions,
  type ProgressVariant,
  type ProgressSize,
} from "./progress-bar";
export {
  createRating,
  RatingManager,
  type RatingOptions,
  type RatingInstance,
  type StarIconType,
} from "./rating";
export {
  createChipInput,
  ChipInputManager,
  type ChipInputOptions,
  type ChipInputInstance,
  type ChipData,
  type ChipSuggestion,
} from "./chip-input";

// --- Batch 930: Tabs, Accordion, Carousel ---
export {
  createTabs,
  TabsManager,
  type TabsOptions,
  type TabsInstance,
  type TabItem,
  type TabOrientation,
  type TabVariant,
} from "./tabs";
export {
  createAccordion,
  AccordionManager,
  type AccordionOptions,
  type AccordionInstance,
  type AccordionItem,
  type AccordionMode,
} from "./accordion";
export {
  createCarousel,
  CarouselManager,
  type CarouselOptions,
  type CarouselInstance,
  type CarouselSlide,
} from "./carousel";

// --- Batch 931: Slider, Switch, Radio Group ---
export {
  createSlider,
  SliderManager,
  type SliderOptions,
  type SliderInstance,
  type SliderMark,
} from "./slider";
export {
  createSwitch,
  type SwitchOptions,
  type SwitchInstance,
  type SwitchSize,
  type SwitchVariant,
} from "./switch";
export {
  createRadioGroup,
  type RadioGroupOptions,
  type RadioGroupInstance,
  type RadioOption,
  type RadioSize,
  type RadioVariant,
} from "./radio-group";

// --- Batch 932: Checkbox, Text Input, Select ---
export {
  createCheckbox,
  createRadio,
  createCheckboxGroup,
  type CheckboxOptions,
  type RadioOptions,
  type CheckboxInstance,
  type RadioInstance,
  type CheckboxGroupOptions,
  type CheckboxGroupInstance,
  type CheckboxSize,
  type CheckboxVariant,
} from "./checkbox";
export {
  createTextInput,
  type TextInputOptions,
  type TextInputInstance,
  type InputSize,
  type InputState,
} from "./text-input";
export {
  createSelect,
  SelectManager,
  type SelectOptions,
  type SelectInstance,
  type SelectOption,
} from "./select";

// --- Batch 933: Textarea, Button, Form Builder ---
export {
  createTextarea,
  type TextareaOptions,
  type TextareaInstance,
  type TextareaSize,
  type TextareaState,
} from "./textarea";
export {
  createButton,
  createButtonGroup,
  type ButtonOptions,
  type ButtonGroupOptions,
  type ButtonGroupInstance,
  type ButtonVariant,
  type ButtonSize,
} from "./button";
export {
  FormBuilder,
  createForm,
  validations,
  type FormSchema,
  type FormField,
  type FormSection,
  type FormState,
  type FieldValidation,
  type FieldError,
  type FieldType,
} from "./form-builder";

// --- Batch 934: Data Table, Date Picker, Color Picker ---
export {
  createDataTable,
  DataTableManager,
  type DataTableOptions,
  type DataTableInstance,
  type Column,
  type SortState,
  type SortDirection,
} from "./data-table";
export {
  createDatePicker,
  DatePickerManager,
  type DatePickerOptions,
  type DatePickerInstance,
} from "./date-picker";
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
  type RgbColor,
  type HslColor,
  type Palette,
} from "./color-picker";

// --- Batch 935: Tree View, File Upload, Context Menu ---
export {
  TreeView,
  type TreeNodeData,
  type TreeNode,
  type CheckMode,
  type TreeViewConfig,
} from "./tree-view";
export {
  createFileUpload,
  FileUploadManager,
  type FileUploadOptions,
  type FileUploadInstance,
  type UploadFile,
} from "./file-upload";
export {
  ContextMenuManager,
  type ContextMenuOptions,
  type ContextMenuInstance,
  type ContextMenuItem,
} from "./context-menu";

// --- Batch 936: Command Palette, Markdown Renderer, Syntax Highlight ---
export {
  CommandPalette,
  type Command,
  type CommandPaletteConfig,
  type CommandPaletteState,
  type CommandCategory,
} from "./command-palette";
export {
  parseMarkdown,
  renderToHtml,
  mdToHtml,
  generateToc,
  renderToc,
  extractFrontMatter,
  countWords,
  readingTime,
  type MdNode,
  type MdNodeType,
  type MdRenderOptions,
  type TocEntry,
  type FrontMatter,
} from "./markdown-renderer";
export {
  highlightCode,
  highlightToHtml,
  registerLanguage,
  registerTheme,
  getAvailableLanguages,
  getAvailableThemes,
  type HighlightOptions,
  type HighlightTheme,
  type Token,
  type TokenType,
} from "./syntax-highlight";

// --- Batch 937: Virtual Scroller, Infinite Scroll, Pagination ---
export {
  VirtualScroller,
  type ScrollerConfig,
  type ScrollerState,
  type VisibleRange,
  type ScrollItem,
  type ScrollToOptions,
} from "./virtual-scroller";
export {
  InfiniteScroll,
  type InfiniteScrollOptions,
  type InfiniteScrollState,
  type InfiniteScrollItem,
} from "./infinite-scroll";
export {
  createPagination,
  PaginationManager,
  type PaginationOptions,
  type PaginationInstance,
} from "./pagination";

// --- Breadcrumb ---
export { BreadcrumbManager, createBreadcrumb } from "./breadcrumb";
export type { BreadcrumbItem, BreadcrumbOptions, BreadcrumbInstance } from "./breadcrumb";

// --- Stepper ---
export { StepperManager, createStepper } from "./stepper";
export type { StepConfig, StepperOptions, StepperInstance, StepStatus } from "./stepper";

// --- Timeline ---
export { TimelineManager, createTimeline } from "./timeline";
export type { TimelineItem, TimelineOptions, TimelineInstance, TimelineItemStatus } from "./timeline";

// --- Notification / Toast ---
export { NotificationManager, getNotificationManager, toast } from "./notification";
export type { Notification, NotificationOptions, NotificationType, NotificationPosition } from "./notification";

// --- Modal / Dialog ---
export { createModal } from "./modal";
export type { ModalOptions, ModalInstance, ModalSize, ModalPosition } from "./modal";

// --- Tooltip ---
export { TooltipManager, getTooltipManager, tooltip } from "./tooltip";
export type { TooltipOptions, TooltipInstance, TooltipPlacement, TooltipTrigger } from "./tooltip";

// --- Popover ---
export { PopoverManager, createPopover } from "./popover";
export type { PopoverOptions, PopoverInstance, PopoverTrigger, PopoverPlacement } from "./popover";

// --- Dropdown Menu ---
export { createDropdown } from "./dropdown";
export type { DropdownOptions, DropdownInstance, DropdownItem, DropdownEntry, DropdownSeparator, DropdownGroup, DropdownPlacement } from "./dropdown";

// --- Drawer ---
export { createDrawer } from "./drawer";
export type { DrawerOptions, DrawerInstance, DrawerSide, DrawerSize } from "./drawer";

// --- Alert Banner ---
export { AlertManager, createAlert } from "./alert";
export type { AlertOptions, AlertInstance, AlertVariant, AlertSize, AlertAction } from "./alert";

// --- Confirm Dialog ---
export { createConfirmDialog } from "./confirm-dialog";
export type { ConfirmDialogOptions, ConfirmDialogInstance, ConfirmDialogVariant, ConfirmButton, ConfirmButtonVariant } from "./confirm-dialog";

// --- Skeleton Loading ---
export { createSkeleton, createTextSkeleton, createHeadingSkeleton, createAvatarSkeleton, createCardSkeleton, createTableSkeleton, wrapWithSkeleton } from "./skeleton";
export type { SkeletonOptions, SkeletonTextOptions, SkeletonAvatarOptions, SkeletonCardOptions, SkeletonTableOptions } from "./skeleton";

// --- Avatar ---
export { createAvatar, createAvatarGroup, getInitials } from "./avatar";
export type { AvatarOptions, AvatarGroupOptions, AvatarSize, AvatarShape } from "./avatar";

// --- Badge ---
export { createBadge, createPositionedBadge, createStatusDot, addDotBadge, addCountBadge } from "./badge";
export type { BadgeOptions, StatusDotOptions, BadgeVariant, BadgePosition, BadgeSize } from "./badge";

// --- Empty State ---
export { EmptyStateManager, createEmptyState } from "./empty-state";
export type { EmptyStateOptions, EmptyStateInstance, EmptyStateVariant } from "./empty-state";

// --- Spinner / Loading ---
export { createSpinner, miniSpinner, fullPageSpinner } from "./spinner";
export type { SpinnerOptions, SpinnerVariant, SpinnerSize } from "./spinner";

// --- Progress Indicator ---
export { createProgressBar, createCircularProgress, createStepProgress } from "./progress-indicator";
export type { ProgressBarOptions, ProgressBarInstance, CircularProgressOptions, CircularProgressInstance, StepProgressOptions, StepProgressInstance, ProgressVariant, ProgressSize } from "./progress-indicator";

// --- Back to Top ---
export { createBackToTop } from "./back-to-top";
export type { BackToTopOptions, BackToTopInstance, BttPosition, BttSize, BttShape } from "./back-to-top";

// --- Divider ---
export { createDivider, hDivider, vDivider, labeledDivider, sectionDivider } from "./divider";
export type { DividerOptions, DividerOrientation, DividerStyle } from "./divider";

// --- Card ---
export { createCard } from "./card";
export type { CardOptions, CardInstance, CardVariant, CardSize, CardHeaderOptions, CardImageOptions } from "./card";

// --- Collapse ---
export { CollapseManager, createCollapse, createCollapseGroup } from "./collapse";
export type { CollapseOptions, CollapseInstance, CollapseSize, CollapseVariant, CollapseGroupOptions, CollapseGroupInstance } from "./collapse";

// --- List ---
export { createList } from "./list";
export type { ListOptions, ListInstance, ListItem, ListSelectionMode, ListVariant } from "./list";

// --- Grid Layout ---
export { GridLayoutManager, createGridLayout } from "./grid-layout";
export type { GridLayoutOptions, GridLayoutInstance, GridAutoFit, GridJustify, GridAlign } from "./grid-layout";

// --- Masonry Layout ---
export { MasonryManager, createMasonry } from "./masonry";
export type { MasonryOptions, MasonryInstance, MasonryItem } from "./masonry";

// --- Anchor Link Navigation ---
export { createAnchorGroup, createBackToTop } from "./anchor-link";
export type { AnchorLink, AnchorGroupOptions, AnchorGroupInstance, BackToTopOptions, BackToTopInstance } from "./anchor-link";

// --- Custom Scrollbar ---
export { createScrollbar, thinScrollbar, hideScrollbar, overlayScrollbar } from "./scrollbar";
export type { ScrollbarOptions, ScrollbarInstance, ScrollbarVariant, ScrollbarAxis } from "./scrollbar";

// --- Scroll Snap ---
export { ScrollSnapManager, createScrollSnap } from "./scroll-snap";
export type { ScrollSnapOptions, ScrollSnapInstance, SnapSection, SnapType, SnapAxis } from "./scroll-snap";

// --- Tour / Guide ---
export { createTour } from "./tour";
export type { TourOptions, TourInstance, TourStep } from "./tour";

// --- Hotkeys ---
export { HotkeyManager, createAppHotkeys, parseKeyCombo, eventMatchesCombo, formatKeyDisplay, areModifiersDown, getModifierString } from "./hotkeys";
export type { HotkeyBinding, HotkeyEvent, ParsedKeyCombo } from "./hotkeys";

// --- Context Provider ---
export { createContext, ThemeContext, AuthContext, I18nContext, ResponsiveContext, createResponsiveProvider } from "./context-provider";
export type { ContextOptions, ProviderInstance, ConsumerHandle, Context, ThemeContextValue, AuthContextValue, I18nContextValue, ResponsiveContextValue } from "./context-provider";

// --- Resizable ---
export { makeResizable, createSplitPane } from "./resizable";
export type { ResizeOptions, ResizeState, ResizableController, SplitPaneOptions, SplitPaneController } from "./resizable";

// --- Drag and Drop ---
export { DragDropManager, getDragDropManager } from "./drag-and-drop";
export type { DragOptions, DropZoneOptions, DropResult, DragItem, DragMode, DropPosition, SortableConfig } from "./drag-and-drop";

// --- Sortable List ---
export { SortableList, createSortable } from "./sortable";
export type { SortableOptions, SortableInstance, SortableItem } from "./sortable";

// --- i18n ---
export { t, getLocale, setLocale, LOCALE_CHANGE_EVENT } from "./i18n";
export type { Locale } from "./i18n";

// --- Theme ---
export { ThemeManager, getThemeManager, LIGHT_THEME, DARK_THEME, BUILT_IN_THEMES } from "./theme";
export type { ThemeConfig, ThemeColors } from "./theme";

// --- Logger ---
export { Logger, log, apiLog, dbLog, extLog, setGlobalLogLevel, getGlobalLogLevel } from "./logger";
export type { LogLevel } from "./logger";

// --- clipboard ---
export {
  copyToClipboard,
  copyRichToClipboard,
  readFromClipboard,
  readRichFromClipboard,
  isClipboardAvailable,
  canReadClipboard,
  watchClipboard,
} from "./clipboard";
export type { ClipboardData, ClipboardOptions } from "./clipboard";

// --- print ---
export {
  PrintManager,
  createPrintManager,
  quickPrint,
  addPageBreakBefore,
  addPageBreakAfter,
  avoidBreakInside,
} from "./print";
export type { PrintOptions, PrintManagerInstance } from "./print";

// --- watermark ---
export { createWatermark } from "./watermark";
export type { WatermarkOptions, WatermarkInstance } from "./watermark";

// --- page-visibility ---
export { createVisibilityTracker, getPageVisibility, isPageVisible, runWhenVisible, waitForVisibility } from "./page-visibility";
export type { VisibilityOptions, VisibilityInstance, VisibilityState } from "./page-visibility";

// --- network-status ---
export { createNetworkStatus, isOnline, getConnectionInfo, isSlowConnection, runWhenOnline, retryWhenOnline } from "./network-status";
export type { NetworkInfo, NetworkOptions as NetworkStatusOptions, NetworkStatusInstance, EffectiveConnectionType } from "./network-status";

// --- battery-api ---
export { createBatteryMonitor, getBatteryInfo, isBatteryApiSupported, formatBatteryPercent, formatRemainingTime, runWithPowerAwareness } from "./battery-api";
export type { BatteryInfo, BatteryOptions, BatteryInstance } from "./battery-api";

// --- device-orientation ---
export { createDeviceOrientation, isDeviceOrientationSupported, isDeviceMotionSupported } from "./device-orientation";
export type { OrientationData, MotionData, DeviceOrientationOptions, DeviceOrientationInstance } from "./device-orientation";

// --- gamepad ---
export { createGamepadManager, isGamepadSupported, getGamepadsSnapshot } from "./gamepad";
export type { GamepadState, GamepadButtonState, GamepadAxisState, GamepadOptions, GamepadInstance } from "./gamepad";

// --- pointer-lock ---
export { createPointerLock, isPointerLockSupported, isPointerLocked, requestPointerLock, exitPointerLock } from "./pointer-lock";
export type { PointerLockOptions, PointerLockInstance } from "./pointer-lock";

// --- media-session ---
export { createMediaSession, isMediaSessionSupported } from "./media-session";
export type { MediaMetadata, MediaSessionAction, MediaSessionOptions, MediaSessionInstance } from "./media-session";

// --- screen-wake-lock ---
export { createWakeLock, isWakeLockSupported, keepScreenAwake } from "./screen-wake-lock";
export type { WakeLockOptions, WakeLockInstance } from "./screen-wake-lock";

// --- share-api ---
export { createShareApi, shareContent, isShareSupported, generateShareTarget, parseShareTargetFromUrl } from "./share-api";
export type { ShareData, ShareOptions, ShareTargetRegistration, ShareInstance } from "./share-api";

// --- notification-permissions ---
export { NotificationPermissionManager, createNotificationManager, quickNotify, requestNotificationPermission, isSupported as isNotificationSupported } from "./notification-permissions";
export type { PermissionStatus, NotificationOptions, ScheduledNotification, NotificationManagerOptions, NotificationManagerInstance } from "./notification-permissions";

// --- push-api ---
export { createPushApi, isPushSupported, isNotificationGranted as isPushNotificationGranted } from "./push-api";
export type { PushSubscriptionInfo, PushApiOptions, PushInstance } from "./push-api";

// --- broadcast-channel ---
export { createBroadcast, isBroadcastSupported, quickBroadcast } from "./broadcast-channel";
export type { ChannelMessage, BroadcastOptions, BroadcastInstance } from "./broadcast-channel";

// --- web-animations ---
export { animate, createOrchestrator, isWebAnimationsSupported, animateOrTransition } from "./web-animations";
export type { KeyframeProps, AnimationKeyframe, AnimationOptions, AnimationInstance, OrchestratorInstance } from "./web-animations";

// --- intersection-observer-v2 ---
export { createIntersectionObserverV2, onceInViewport, lazyLoadImages } from "./intersection-observer-v2";
export type { VisibilityDirection as IntersectionV2Direction, IntersectionV2Entry, IntersectionObserverV2Options, IntersectionObserverV2Instance } from "./intersection-observer-v2";

// --- resize-observer-v2 ---
export { createResizeObserverV2, watchSize, useResponsiveSize } from "./resize-observer-v2";
export type { ResizeV2Entry, Breakpoint as ResizeBreakpoint, ResizeObserverV2Options, ResizeObserverV2Instance } from "./resize-observer-v2";

// --- css-containment ---
export { createContainmentManager, contain, isContainmentSupported } from "./css-containment";
export type { ContainmentType, ContainmentConfig, ContainmentResult, ContainmentManagerOptions, ContainmentManagerInstance } from "./css-containment";

// --- content-visibility ---
export { setContentVisibility, applyContentVisibilityToList, isContentVisibilitySupported, skipWhenOffscreen } from "./content-visibility";
export type { ContentVisibilityValue, ContentVisibilityOptions, ContentVisibilityInstance } from "./content-visibility";

// --- will-change-manager ---
export { createWillChangeManager, gpuPromote, isWillChangeSupported } from "./will-change-manager";
export type { WillChangeProperty, WillChangeRule, WillChangeManagerOptions, WillChangeManagerInstance } from "./will-change-manager";

// --- form-associations ---
export { createFormAssociations, linkLabelToControl, getFormControls } from "./form-associations";
export type { FormAssociation, FormGroupOptions, FormAssociationInstance } from "./form-associations";

// --- label-helper ---
export { createLabel, createFloatingLabel, createCharacterCounter, createSrOnlyLabel } from "./label-helper";
export type { LabelConfig, FloatingLabelOptions, CharacterCounterOptions } from "./label-helper";

// --- validation-feedback ---
export { createValidationFeedback, showError, showSuccess } from "./validation-feedback";
export type { ValidationSeverity, ValidationResult, ValidationFeedbackOptions, ValidationFeedbackInstance } from "./validation-feedback";

// --- css-modules-helper ---
export { createCssModules, scopeClassName, unscopeClassName } from "./css-modules-helper";
export type { CssModuleClassMap, CssModulesOptions, CssModulesInstance } from "./css-modules-helper";

// --- style-injection ---
export { createStyleInjection, injectStyles, injectStylesheet, ejectStyles } from "./style-injection";
export type { InjectedStyle, StyleInjectionOptions, StyleInjectionInstance } from "./style-injection";

// --- css-custom-properties ---
export { createCssCustomProperties, getCssVar, setCssVar, getAllCssVars } from "./css-custom-properties";
export type { CssVarDefinition, CssVarAnimationOptions, CssCustomPropertiesOptions, CssCustomPropertiesInstance } from "./css-custom-properties";

// --- dom-fragment ---
export { createFragment, createFragmentFromNodes, insertFragment, batchInsert, extractRange, extractFromSelection, moveChildren, replaceContent, createTemplate, buildElement, measureDomOperation } from "./dom-fragment";
export type { FragmentOptions, BatchInsertOptions, RangeSelection } from "./dom-fragment";

// --- template-engine ---
export { TemplateEngine, createTemplateEngine, renderTemplate, registerBuiltinHelpers, unescapeHtml } from "./template-engine";
export type { TemplateContext, TemplateOptions, TemplateError, PartialTemplate, HelperFunction } from "./template-engine";

// --- html-sanitizer ---
export { sanitizeHtml, sanitize, stripHtml, escapeHtmlEntities, scanForXss } from "./html-sanitizer";
export type { SanitizeLevel, SanitizeOptions } from "./html-sanitizer";

// --- url-pattern-router ---
export { createRouter, matchUrl } from "./url-pattern-router";
export type { RouteParams, RouteMatch, RouteHandler, RouteGuard, RouteMiddleware, RouteDefinition, RouterOptions, RouterInstance } from "./url-pattern-router";

// --- hash-history ---
export { createHashHistory } from "./hash-history";
export type { HashHistoryEntry, HashHistoryOptions, HashHistoryInstance } from "./hash-history";

// --- state-machine-viz ---
export { visualizeStateMachine, renderMachine } from "./state-machine-viz";
export type { StateId as VizStateId, EventLabel as VizEventLabel, StateNode as VizStateNode, TransitionEdge as VizTransitionEdge, MachineDefinition as VizMachineDefinition, VizOptions, VizColorTheme, VizInstance } from "./state-machine-viz";

// --- dom-diff-patcher ---
export { diffDom, applyPatches } from "./dom-diff-patcher";
export type { PatchOp, Patch, DiffResult, DomDiffOptions } from "./dom-diff-patcher";

// --- virtual-dom-lite ---
export { h, text, render, createDom, diff as vdiff, patch as vpatch } from "./virtual-dom-lite";
export type { VNode, VNodeProps, VChild, Patch as VPatch, VDomOptions } from "./virtual-dom-lite";

// --- morphdom-engine ---
export { createMorphEngine, morph, morphBetween } from "./morphdom-engine";
export type { MorphOptions, MorphStats, MorphInstance } from "./morphdom-engine";

// --- event-bus-v2 ---
export { EventBusV2, createEventBusV2 } from "./event-bus-v2";
export type { ChannelName as EventBusChannelName, EventName as V2EventName, EventId as V2EventId, SubscriberId as V2SubscriberId, BaseEvent, TypedEvent as V2TypedEvent, EventHandler as V2EventHandler, SubscriptionOptions as V2SubscriptionOptions, SubscriptionHandle as V2SubscriptionHandle, MiddlewareContext as V2MiddlewareContext, EventMiddleware as V2EventMiddleware, BusMetrics as V2BusMetrics, EventBusConfig as V2EventBusConfig } from "./event-bus-v2";

// --- signal-store ---
export { createStore, createCounterStore } from "./signal-store";
export type { StoreOptions, StoreInstance, SelectorFn, Listener } from "./signal-store";

// --- reactive-signals ---
export { signal, computed, effect, batch, isSignal, isComputed, untrack, peek, not as sigNot, mapSignal, filterSignal, asyncEffect, getDependencyGraph, getPendingCount, getBatchDepth, shallowEqual, deepEqual } from "./reactive-signals";
export type { SignalOptions, ComputedOptions, EffectOptions, ReactionNode, EffectContext } from "./reactive-signals";
// --- Batch 963: Web Worker Pool, Task Scheduler v2, Request Batcher ---

export {
  WebWorkerPool,
  createWorkerPool,
  type WorkerPoolConfig,
  type PoolTask,
  type PoolTaskResult,
  type WorkerStats,
  type PoolEvent,
} from "./web-worker-pool.js";

export {
  TaskSchedulerV2,
  createTaskSchedulerV2,
  type SchedulerConfig,
  type ScheduledTask,
  type TaskResult as SchedulerTaskResult,
  type SchedulerStats,
  type SchedulerEvent,
} from "./task-scheduler-v2.js";

export {
  RequestBatcher,
  createRequestBatcher,
  type BatchConfig,
  type BatchableRequest,
  type BatchResponse,
  type BatchStats,
} from "./request-batcher.js";
// --- Batch 964: Virtual Scroller, Infinite Scroll, Drag and Drop v2 ---

export {
  VirtualScroller,
  type ScrollItem,
  type VisibleRange,
  type ScrollerConfig,
  type ScrollerState,
  type ScrollToOptions,
} from "./virtual-scroller.js";

export {
  InfiniteScroll,
  type InfiniteScrollItem,
  type InfiniteScrollOptions,
  type InfiniteScrollState,
} from "./infinite-scroll.js";

export {
  DragAndDropV2,
  type DnDConfig,
  type DragContext,
  type DropTargetInfo,
  type DropResult,
} from "./drag-and-drop-v2.js";
// --- Batch 965: Form Validator, Data Table, Toast Notification ---

export {
  FormValidator,
  required,
  minLength,
  maxLength,
  pattern,
  email,
  urlValidator as url,
  range,
  matchesField,
  asyncValidator,
  custom as customValidator,
  type FieldValidationResult,
  type FormValidationResult,
  type FieldConfig,
  type ValidatorFn,
} from "./form-validator.js";

export {
  DataTableManager,
  createDataTable,
  type Column,
  type SortDirection,
  type SortState,
  type FilterState,
  type DataTableOptions,
  type DataTableInstance,
} from "./data-table.js";

export {
  createToastManager,
  type ToastOptions,
  type ToastManagerOptions,
  type ToastInstance,
  type ToastType,
  type ToastPosition,
} from "./toast-notification.js";
// --- Batch 966: Modal Dialog, Tooltip/Popover, Context Menu ---

export {
  createModal,
  type ModalOptions,
  type ModalInstance,
  type ModalSize,
  type ModalVariant,
} from "./modal-dialog.js";

export {
  createTooltip,
  createPopover,
  type TooltipOptions,
  type PopoverOptions,
  type TooltipInstance,
  type Placement,
  type TriggerMode,
} from "./tooltip-popover.js";

export {
  ContextMenuManager,
  type ContextMenuItem,
  type ContextMenuOptions,
  type ContextMenuInstance,
} from "./context-menu.js";
// --- Batch 967: Color Utils, Theme Engine, Animation Timeline ---

export {
  parseColor,
  requireColor,
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToHsl,
  toHexString,
  toRgbString,
  toHslString,
  lighten,
  darken,
  saturate,
  desaturate,
  rotateHue,
  setOpacity,
  mix,
  invert,
  luminance,
  contrastRatio,
  meetsAA,
  meetsAAA,
  contrastingText,
  minAlphaForContrast,
  generatePalette,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  generateScheme,
  linearGradient,
  radialGradient,
  gradientBetween,
  shimmerGradient,
  colorTemperature,
  isWarmColor,
  hueCategory,
  cssVariablesFromPalette,
  generateDesignTokens,
  type RGB,
  type HSL,
  type HSV,
  type ColorStop,
  type ColorPalette,
} from "./color-utils.js";

export {
  ThemeEngine,
  getThemeEngine,
  setTheme,
  toggleTheme,
  getCurrentTheme,
  isDarkMode,
  type DesignToken,
  type TokenCategory,
  type ThemeDefinition,
  type ThemeMode,
  type ThemeEngineOptions,
} from "./theme-engine.js";

export {
  AnimationTimeline,
  createTimeline,
  easings,
  type Keyframe,
  type AnimationTrack,
  type TimelineLabel,
  type TimelineEvent,
  type TimelineOptions,
  type TimelineState,
  type EasingFn,
} from "./animation-timeline.js";
// --- Batch 968: I18n Manager, Markdown Renderer, Code Editor ---

export {
  I18nManager,
  createI18n,
  type Locale,
  type MessageKey,
  type Namespace,
  type MessageCatalog,
  type LocaleData,
  type PluralRuleSet,
  type LocaleFormats,
  type I18nConfig,
  type InterpolationOptions,
  type I18nStats,
} from "./i18n-manager.js";

export {
  parseMarkdown,
  renderToHtml,
  generateToc,
  renderToc,
  extractFrontMatter,
  extractText,
  countWords,
  readingTime,
  mdToHtml,
  type MdNode,
  type MdNodeType,
  type MdRenderOptions,
  type TocEntry,
  type FrontMatter,
} from "./markdown-renderer.js";

export {
  CodeEditorManager,
  createCodeEditor,
  type CodeEditorOptions,
  type CodeEditorInstance,
} from "./code-editor.js";
// --- Batch 969: File System Access, Clipboard Advanced, Shortcuts Manager ---

export {
  FileSystemAccess,
  type FilePickerOptions,
  type SavePickerOptions,
  type DirPickerOptions,
  type FileSystemEntry,
  type ReadOptions,
  type WriteOptions,
  type CopyMoveOptions,
  type OpfsOptions,
  type FileSystemStats,
} from "./file-system-access.js";

export {
  ClipboardAdvanced,
  createClipboardManager,
  copyToClipboard,
  readFromClipboard,
  copyHtmlToClipboard,
  stripHtml,
  readImageFromClipboard,
  clipboardHasImage,
  blobToDataURL,
  type ClipboardCopyOptions,
  type ClipboardPasteOptions,
  type ClipboardData,
  type ClipboardPermissionState,
  type ClipboardHistoryEntry,
  type ClipboardMonitorOptions,
  type ClipboardMonitorInstance,
} from "./clipboard-advanced.js";

export {
  ShortcutsManager,
  createShortcutsManager,
  type ShortcutBinding,
  type ShortcutConflict,
  type ShortcutsManagerOptions,
  type ShortcutsState,
} from "./shortcuts-manager.js";
// --- Batch 970: Undo/Redo Manager, Search Highlight, Split Pane ---

export {
  UndoRedoManager,
  createUndoRedoManager,
  type UndoState,
  type UndoRedoOptions,
  type UndoGroupHandle,
  type UndoRedoStats,
} from "./undo-redo-manager.js";

export {
  SearchHighlightManager,
  createSearchHighlight,
  type SearchHighlightOptions,
  type SearchHighlightInstance,
} from "./search-highlight.js";

export {
  createSplitPane,
  type SplitPaneOptions,
  type SplitPaneInstance,
  type SplitOrientation,
} from "./split-pane.js";

// --- Progress Stepper (Batch 971) ---
export type { StepStatus, StepperOrientation, StepperVariant, StepItem, ProgressStepperOptions, ProgressStepperInstance } from "./progress-stepper.js";
export { createProgressStepper } from "./progress-stepper.js";

// --- Skeleton Loader (Batch 971) ---
export type { SkeletonShape, SkeletonAnimation, SkeletonItem, SkeletonOptions, SkeletonInstance } from "./skeleton-loader.js";
export { createSkeleton } from "./skeleton-loader.js";

// --- Empty State (Batch 971) ---
export type { EmptyStateVariant, EmptyStateOptions, EmptyStateInstance } from "./empty-state.js";
export { EmptyStateManager, createEmptyState } from "./empty-state.js";

// --- Accordion (Batch 972) ---
export type { AccordionItem, AccordionMode, AccordionOptions, AccordionInstance } from "./accordion.js";
export { AccordionManager, createAccordion } from "./accordion.js";

// --- Tabs Manager (Batch 972) ---
export type { TabVariant, TabPosition, TabOverflowMode, TabPanel, TabsOptions, TabsInstance } from "./tabs-manager.js";
export { createTabs } from "./tabs-manager.js";

// --- Carousel (Batch 972) ---
export type { CarouselSlide, CarouselOptions, CarouselInstance } from "./carousel.js";
export { CarouselManager, createCarousel } from "./carousel.js";

// --- Image Gallery (Batch 973) ---
export type { GalleryImage, ImageGalleryOptions, ImageGalleryInstance } from "./image-gallery.js";
export { ImageGalleryManager, createImageGallery } from "./image-gallery.js";

// --- Lightbox (Batch 973) ---
export type { LightboxImage, LightboxOptions, LightboxInstance } from "./lightbox.js";
export { LightboxManager, createLightbox } from "./lightbox.js";

// --- Rating Input (Batch 973) ---
export type { RatingIcon, RatingSize, RatingInputOptions, RatingInputInstance } from "./rating-input.js";
export { createRatingInput } from "./rating-input.js";

// --- Avatar Group (Batch 974) ---
export type { AvatarSize, StackDirection, AvatarItem, AvatarGroupOptions, AvatarGroupInstance } from "./avatar-group.js";
export { AvatarGroupManager, createAvatarGroup } from "./avatar-group.js";

// --- Badge Manager (Batch 974) ---
export type { BadgeVariant, BadgePosition, BadgeSize, DotSize, BadgeOptions, DotBadgeOptions, StatusBadgeOptions, BadgeInstance, DotBadgeInstance, StatusBadgeInstance } from "./badge-manager.js";
export { createBadge, createDotBadge, createStatusBadge } from "./badge-manager.js";

// --- Chip Input (Batch 974) ---
export type { ChipData, ChipSuggestion, ChipInputOptions, ChipInputInstance } from "./chip-input.js";
export { ChipInputManager, createChipInput } from "./chip-input.js";

// --- Notify Banner (Batch 975) ---
export type { NotifyBannerType, NotifyBannerSize, NotifyBannerOptions, NotifyBannerInstance } from "./notify-banner.js";
export { createNotifyBanner } from "./notify-banner.js";

// --- Countdown Timer (Batch 975) ---
export type { CountdownDisplayMode, CountdownUnit, CountdownTimerOptions, CountdownTimerInstance } from "./countdown-timer.js";
export { createCountdownTimer } from "./countdown-timer.js";

// --- File Dropzone (Batch 975) ---
export type { DropZoneState, DropZoneVariant, FileValidationRule, DropZoneOptions, DropZoneInstance } from "./file-dropzone.js";
export { createDropZone } from "./file-dropzone.js";

// --- QR Code Generator (Batch 976) ---
export type { QRErrorCorrectionLevel, QRRenderFormat, QROptions, QRResult } from "./qr-code-generator.js";
export { generateQR, generateQRSVG } from "./qr-code-generator.js";

// --- Color Picker (Batch 976) ---
export type { RgbColor, HslColor, Palette } from "./color-picker.js";
export { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, parseColor, getLuminance, getContrastRatio, getWcagLevel, getContrastingText, complementary, analogous, triadic, splitComplementary, tetradic, monochromatic, blendColors, lighten, darken, saturate, desaturate, invertColor, withOpacity, generatePaletteAdvanced } from "./color-picker.js";

// --- Date Picker (Batch 976) ---
export type { DatePickerOptions, DatePickerInstance } from "./date-picker.js";
export { DatePickerManager, createDatePicker } from "./date-picker.js";

// --- Select Menu (Batch 977) ---
export type { SelectOption, SelectGroup, SelectMode, SelectMenuOptions, SelectMenuInstance } from "./select-menu.js";
export { createSelectMenu } from "./select-menu.js";

// --- Slider Input (Batch 977) ---
export type { SliderOrientation, SliderVariant, SliderOptions, SliderInstance } from "./slider-input.js";
export { createSlider } from "./slider-input.js";

// --- Toggle Switch (Batch 977) ---
export type { ToggleVariant, ToggleSize, ToggleOptions, ToggleInstance } from "./toggle-switch.js";
export { ToggleManager, createToggle } from "./toggle-switch.js";

// --- Pagination (Batch 978) ---
export type { PaginationOptions, PaginationInstance } from "./pagination.js";
export { PaginationManager, createPagination } from "./pagination.js";

// --- Breadcrumb Nav (Batch 978) ---
export type { BreadcrumbItem, BreadcrumbOptions, BreadcrumbInstance } from "./breadcrumb-nav.js";
export { createBreadcrumb } from "./breadcrumb-nav.js";

// --- Command Palette (Batch 978) ---
export type { Command, CommandCategory, CommandPaletteConfig, CommandPaletteState } from "./command-palette.js";
export { CommandPalette } from "./command-palette.js";

// --- Tree View (Batch 979) ---
export type { TreeNodeData, TreeNode, CheckMode, TreeViewConfig } from "./tree-view.js";
export { TreeView } from "./tree-view.js";

// --- Context Menu V2 (Batch 979) ---
export type { ContextMenuItemType, ContextMenuItem, ContextMenuV2Options, ContextMenuV2Instance } from "./context-menu-v2.js";
export { createContextMenuV2 } from "./context-menu-v2.js";

// --- Number Input (Batch 979) ---
export type { NumberInputVariant, NumberInputOptions, NumberInputInstance } from "./number-input.js";
export { createNumberInput } from "./number-input.js";
// --- Batch 980: Stat Card, Timeline V2, Scoreboard ---
export { createStatCard } from "./stat-card.js";
export type { StatCardOptions } from "./stat-card.js";
export { createTimelineV2 } from "./timeline-v2.js";
export type {
  TimelineV2Options,
  TimelineV2Instance,
  TimelineEvent,
  TimelineOrientation,
  TimelineVariant,
  TimelineAlign,
} from "./timeline-v2.js";
export { createScoreboard } from "./scoreboard.js";
export type {
  ScoreboardOptions,
  ScoreboardInstance,
  TeamScore,
  ScoreboardSport,
  ScoreboardStatus,
  ScoreboardVariant,
  ScoreboardSize,
} from "./scoreboard.js";
// --- Batch 981: Progress Ring, Odometer, Donut Chart ---
export { createProgressRing } from "./progress-ring.js";
export type { ProgressRingOptions, ProgressRingInstance, ProgressRingVariant, ProgressRingSize } from "./progress-ring.js";
export { createOdometer } from "./odometer.js";
export type { OdometerOptions, OdometerInstance, OdometerEasing } from "./odometer.js";
export { createDonutChart } from "./donut-chart.js";
export type {
  DonutChartOptions,
  DonutChartInstance,
  DonutChartDataPoint,
  DonutChartInteractionMode,
  DonutChartLegendPosition,
} from "./donut-chart.js";
// --- Batch 982: Radar Chart, Treemap, Waterfall Chart ---
export { createRadarChart } from "./radar-chart.js";
export type { RadarChartOptions, RadarChartInstance, RadarAxis, RadarDataset } from "./radar-chart.js";
export { createTreemap } from "./treemap.js";
export type { TreemapOptions, TreemapInstance, TreemapNode, TreemapColorScale } from "./treemap.js";
export { createWaterfallChart } from "./waterfall-chart.js";
export type { WaterfallChartOptions, WaterfallChartInstance, WaterfallDataPoint, WaterfallBarStyle } from "./waterfall-chart.js";
// --- Batch 983: Funnel Chart, Sankey, Network Graph ---
export { createFunnelChart } from "./funnel-chart.js";
export type { FunnelChartOptions, FunnelChartInstance, FunnelDataPoint, FunnelOrientation, FunnelStyle } from "./funnel-chart.js";
export { createSankey } from "./sankey.js";
export type { SankeyOptions, SankeyInstance, SankeyNode, SankeyLink } from "./sankey.js";
export { createNetworkGraph } from "./network-graph.js";
export type {
  NetworkGraphOptions,
  NetworkGraphInstance,
  GraphNode,
  GraphEdge,
  GraphLayoutMode,
} from "./network-graph.js";
// --- Batch 984: Word Cloud, Tag Cloud, Masonry Layout ---
export { createWordCloud } from "./word-cloud.js";
export type { WordCloudOptions, WordCloudInstance, WordCloudItem, WordCloudShape, WordCloudSpiral } from "./word-cloud.js";
export { createTagCloud } from "./tag-cloud.js";
export type { TagCloudOptions, TagCloudInstance, TagCloudTag, TagCloudLayout, TagCloudSort } from "./tag-cloud.js";
export { createMasonry } from "./masonry-layout.js";
export type { MasonryOptions, MasonryInstance, MasonryItem } from "./masonry-layout.js";
// --- Batch 985: Resizable Panel, Dock Layout, Action Bar ---
export { createResizablePanel } from "./resizable-panel.js";
export type { ResizablePanelOptions, ResizablePanelInstance, PanelDirection, PanelCollapseMode } from "./resizable-panel.js";
export { createDockLayout } from "./dock-layout.js";
export type { DockLayoutOptions, DockLayoutInstance, DockPanel, DockLocation, DockTabPosition } from "./dock-layout.js";
export { createActionBar } from "./action-bar.js";
export type {
  ActionBarOptions,
  ActionBarInstance,
  ActionBarAction,
  ActionType,
  ActionBarVariant,
  ActionBarSize,
} from "./action-bar.js";
// --- Batch 986: Ribbon, Stepper Horizontal, Tooltip V2 ---
export { createRibbon } from "./ribbon.js";
export type { RibbonOptions, RibbonInstance, RibbonPosition, RibbonVariant, RibbonSize } from "./ribbon.js";
export { createStepperHorizontal } from "./stepper-horizontal.js";
export type {
  StepperHorizontalOptions,
  StepperHorizontalInstance,
  StepConfig,
  StepStatus,
  StepperVariant,
  StepperSize,
} from "./stepper-horizontal.js";
export { createTooltipV2 } from "./tooltip-v2.js";
export type {
  TooltipV2Options,
  TooltipV2Instance,
  TooltipPlacement,
  TooltipTrigger,
} from "./tooltip-v2.js";
// --- Batch 987: Popover V2, Dialog V2, Drawer V2 ---
export { createPopoverV2 } from "./popover-v2.js";
export type {
  PopoverV2Options,
  PopoverV2Instance,
  PopoverPlacement,
  PopoverTrigger,
} from "./popover-v2.js";
export { createDialogV2 } from "./dialog-v2.js";
export type {
  DialogV2Options,
  DialogV2Instance,
  DialogSize,
  DialogVariant,
} from "./dialog-v2.js";
export { createDrawerV2 } from "./drawer-v2.js";
export type {
  DrawerV2Options,
  DrawerV2Instance,
  DrawerSide,
  DrawerSize,
} from "./drawer-v2.js";
// --- Batch 988: Flow Chart, Spreadsheet, Calendar Grid ---
export { createFlowChart } from "./flow-chart.js";
export type {
  FlowChartOptions,
  FlowChartInstance,
  FlowNode,
  FlowEdge,
  NodeShape,
  EdgeType,
  FlowLayout,
} from "./flow-chart.js";
export { createSpreadsheet } from "./spreadsheet.js";
export type {
  SpreadsheetOptions,
  SpreadsheetInstance,
  SpreadsheetCell,
  SpreadsheetColumn,
} from "./spreadsheet.js";
export { createCalendarGrid } from "./calendar-grid.js";
export type {
  CalendarGridOptions,
  CalendarGridInstance,
  CalendarEvent,
  CalendarSelectionMode,
  CalendarWeekStart,
} from "./calendar-grid.js";

// --- data-table-v2 ---
export { createDataTableV2 } from "./data-table-v2";
export type { DataTableColumn, DataTableOptions, DataTableInstance, SortDirection, FilterOperator, RowSelectionType } from "./data-table-v2";

// --- pivot-table ---
export { createPivotTable } from "./pivot-table";
export type { PivotTableOptions, PivotTableInstance, PivotDimension, PivotMeasure, PivotValue, AggregationFn } from "./pivot-table";

// --- fireworks ---
export { createFireworks } from "./fireworks";
export type { FireworksOptions, FireworksInstance, FireworkType, Particle, BurstConfig } from "./fireworks";

// --- sunburst-chart ---
export { createSunburstChart } from "./sunburst-chart";
export type { SunburstOptions, SunburstInstance, SunburstNode } from "./sunburst-chart";

// --- scatter-plot ---
export { createScatterPlot } from "./scatter-plot";
export type { ScatterOptions, ScatterInstance, ScatterPoint, ScatterSeries } from "./scatter-plot";

// --- gauge-meter ---
export { createGaugeMeter } from "./gauge-meter";
export type { GaugeOptions, GaugeInstance, ThresholdZone, GaugeVariant } from "./gauge-meter";

// --- box-plot ---
export { createBoxPlot } from "./box-plot";
export type { BoxPlotOptions, BoxPlotInstance, BoxData } from "./box-plot";

// --- violin-plot ---
export { createViolinPlot } from "./violin-plot";
export type { ViolinOptions, ViolinInstance, ViolinData } from "./violin-plot";

// --- area-chart ---
export { createAreaChart } from "./area-chart";
export type { AreaChartOptions, AreaChartInstance, AreaSeries, DataPoint } from "./area-chart";

// --- bubble-chart ---
export { createBubbleChart } from "./bubble-chart";
export type { BubbleChartOptions, BubbleChartInstance, Bubble, BubbleSeries } from "./bubble-chart";

// --- bullet-chart ---
export { createBulletChart } from "./bullet-chart";
export type { BulletChartOptions, BulletChartInstance, BulletMeasure, RangeType } from "./bullet-chart";

// --- radial-bar-chart ---
export { createRadialBarChart } from "./radial-bar-chart";
export type { RadialBarOptions, RadialBarInstance, RadialBarData } from "./radial-bar-chart";

// --- candlestick-chart ---
export { createCandlestickChart } from "./candlestick-chart";
export type { CandlestickOptions, CandlestickInstance, OHLCData, MovingAverageConfig } from "./candlestick-chart";

// --- histogram-chart ---
export { createHistogramChart } from "./histogram-chart";
export type { HistogramOptions, HistogramInstance, Bin } from "./histogram-chart";

// --- parallel-coordinates ---
export { createParallelCoordinates } from "./parallel-coordinates";
export type { ParallelCoordinatesOptions, PCInstance, PCDimension, PCRow } from "./parallel-coordinates";

// --- chord-diagram ---
export { createChordDiagram } from "./chord-diagram";
export type { ChordDiagramOptions, ChordInstance, ChordNode, ChordLink } from "./chord-diagram";

// --- venn-diagram ---
export { createVennDiagram } from "./venn-diagram";
export type { VennDiagramOptions, VennInstance, VennSet, VennOverlap, VennSetType } from "./venn-diagram";

// --- mosaic-plot ---
export { createMosaicPlot } from "./mosaic-plot";
export type { MosaicPlotOptions, MosaicInstance, MosaicCell, MosaicCategory } from "./mosaic-plot";

// --- led-matrix ---
export { createLEDMatrix } from "./led-matrix";
export type { LEDMatrixOptions, LEDMatrixInstance, LEDColor } from "./led-matrix";

// --- spectrum-analyzer ---
export { createSpectrumAnalyzer } from "./spectrum-analyzer";
export type { SpectrumAnalyzerOptions, SpectrumInstance, BarStyle, GradientType } from "./spectrum-analyzer";

// --- waveform-display ---
export { createWaveformDisplay } from "./waveform-display";
export type { WaveformDisplayOptions, WaveformDisplayInstance, WaveformChannel, WaveformPoint, WaveformSelection } from "./waveform-display";
// --- analog-clock ---
export { createAnalogClock } from "./analog-clock";
export type { AnalogClockOptions, AnalogClockInstance, ClockStyle, HandShape } from "./analog-clock";

// --- digital-clock ---
export { createDigitalClock } from "./digital-clock";
export type { DigitalClockOptions, DigitalClockInstance, DigitStyle, SizeVariant } from "./digital-clock";

// --- countdown-timer-v2 ---
export { createCountdownTimerV2 } from "./countdown-timer-v2";
export type { CountdownOptions, CountdownInstance, CountdownPreset, CountdownState, CountdownSegment } from "./countdown-timer-v2";
// --- pomodoro-timer ---
export { createPomodoroTimer } from "./pomodoro-timer";
export type { PomodoroOptions, PomodoroInstance, PomodoroPhase, PomodoroState, PomodoroSession } from "./pomodoro-timer";

// --- calendar-heatmap ---
export { createCalendarHeatmap } from "./calendar-heatmap";
export type { HeatmapOptions, HeatmapInstance, HeatmapDataPoint, HeatmapColorScheme } from "./calendar-heatmap";

// --- timeline ---
export { createTimeline, TimelineManager } from "./timeline";
export type { TimelineOptions, TimelineInstance, TimelineItem, TimelineItemStatus } from "./timeline";
// --- kanban-board ---
export { createKanbanBoard } from "./kanban-board";
export type { KanbanBoardOptions, KanbanBoardInstance, KanbanCard, KanbanColumn } from "./kanban-board";

// --- gantt-chart ---
export { createGanttChart } from "./gantt-chart";
export type { GanttChartOptions, GanttChartInstance, GanttTask } from "./gantt-chart";

// --- mind-map ---
export { createMindMap } from "./mind-map";
export type { MindMapOptions, MindMapInstance, MindMapNode } from "./mind-map";
// --- org-chart ---
export { createOrgChart } from "./org-chart";
export type { OrgChartOptions, OrgChartInstance, OrgNode } from "./org-chart";

// --- tree-view ---
export { TreeView } from "./tree-view";
export type { TreeNodeData, TreeNode, TreeViewConfig, CheckMode } from "./tree-view";

// --- file-explorer ---
export { createFileExplorer } from "./file-explorer";
export type { FileExplorerOptions, FileExplorerInstance, FileEntry, ViewMode, SortField } from "./file-explorer";
// --- notification-center ---
export { createNotificationCenter, NotificationCenterManager } from "./notification-center";
export type { NotificationCenterOptions, NotificationCenterInstance, NotificationItem, NotificationType } from "./notification-center";

// --- chat-widget ---
export { createChatWidget } from "./chat-widget";
export type { ChatWidgetOptions, ChatWidgetInstance, ChatMessage, ChatParticipant } from "./chat-widget";

// --- comment-thread ---
export { createCommentThread, CommentThreadManager } from "./comment-thread";
export type { CommentThreadOptions, CommentThreadInstance, Comment, CommentAuthor } from "./comment-thread";
// --- rating-stars ---
export { createRatingStars } from "./rating-stars";
export type { RatingStarsOptions, RatingStarsInstance, StarIcon, RatingSize } from "./rating-stars";

// --- progress-stepper ---
export { createProgressStepper } from "./progress-stepper";
export type { ProgressStepperOptions, ProgressStepperInstance, StepItem, StepStatus, StepperOrientation, StepperVariant } from "./progress-stepper";

// --- badge-list ---
export { createBadgeList } from "./badge-list";
export type { BadgeListOptions, BadgeListInstance, BadgeItem, BadgeColor, BadgeSize } from "./badge-list";
// --- avatar-group ---
export { createAvatarGroup, AvatarGroupManager } from "./avatar-group";
export type { AvatarGroupOptions, AvatarGroupInstance, AvatarItem, AvatarSize, StackDirection } from "./avatar-group";

// --- user-card ---
export { createUserCard } from "./user-card";
export type { UserCardOptions, UserCardInstance, UserStats, SocialLink, UserCardVariant, UserCardSize } from "./user-card";

// --- empty-state ---
export { createEmptyState, EmptyStateManager } from "./empty-state";
export type { EmptyStateOptions, EmptyStateInstance, EmptyStateVariant } from "./empty-state";
// --- code-block ---
export { createCodeBlock, CodeBlockManager } from "./code-block";
export type { CodeBlockOptions, CodeBlockInstance, CodeTheme } from "./code-block";

// --- markdown-renderer ---
export { createMarkdownRenderer } from "./markdown-renderer";
export type { MdRenderOptions, MdRendererInstance, TocEntry } from "./markdown-renderer";

// --- syntax-highlighter ---
export { createSyntaxHighlight } from "./syntax-highlighter";
export type { SyntaxHighlightOptions, SyntaxHighlightInstance, HighlightTheme } from "./syntax-highlighter";
// --- color-picker ---
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hslToHex,
  parseColor,
  getLuminance,
  getContrastRatio,
  getWcagLevel,
  getContrastingText,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  monochromatic,
  blendColors,
  lighten,
  darken,
  saturate,
  desaturate,
  invertColor,
  withOpacity,
  generatePaletteAdvanced,
} from "./color-picker";
export type { RgbColor, HslColor, Palette } from "./color-picker";

// --- date-picker ---
export { DatePickerManager } from "./date-picker";
export type {
  DatePickerOptions,
  DatePickerInstance,
  DateRange,
  DayCellState,
  DatePickerMode,
} from "./date-picker";

// --- time-picker ---
export { createTimePicker } from "./time-picker";
export type { TimePickerOptions, TimePickerInstance, TimeFormat, TimePickerMode } from "./time-picker";
// --- slider ---
export { SliderManager, createSlider } from "./slider";
export type { SliderOptions, SliderInstance, SliderMark } from "./slider";

// --- select ---
export { SelectManager, createSelect } from "./select";
export type { SelectOptions, SelectInstance, SelectOption } from "./select";

// --- tabs ---
export { TabsManager, createTabs } from "./tabs";
export type { TabsOptions, TabsInstance, TabItem, TabOrientation, TabVariant } from "./tabs";
// --- modal ---
export { createModal } from "./modal";
export type { ModalOptions, ModalInstance, ModalSize, ModalPosition } from "./modal";

// --- accordion ---
export { AccordionManager, createAccordion } from "./accordion";
export type { AccordionOptions, AccordionInstance, AccordionItem, AccordionMode } from "./accordion";

// --- tooltip ---
export { TooltipManager, getTooltipManager, tooltip } from "./tooltip";
export type { TooltipOptions, TooltipInstance, TooltipPlacement, TooltipTrigger } from "./tooltip";
// --- carousel ---
export { CarouselManager, createCarousel } from "./carousel";
export type { CarouselOptions, CarouselInstance, CarouselSlide } from "./carousel";

// --- upload ---
export { createUpload } from "./upload";
export type { UploadOptions, UploadInstance, UploadFile, UploadStatus } from "./upload";

// --- pagination ---
export { PaginationManager, createPagination } from "./pagination";
export type { PaginationOptions, PaginationInstance } from "./pagination";
// --- context-menu ---
export { ContextMenuManager } from "./context-menu";
export type { ContextMenuOptions, ContextMenuInstance, ContextMenuItem, ContextMenuPosition } from "./context-menu";

// --- split-view ---
export { createSplitView, createHorizontalSplit, createVerticalSplit } from "./split-view";
export type { SplitViewOptions, SplitViewInstance, SplitViewState, PaneConfig, SplitDirection } from "./split-view";

// --- breadcrumb ---
export { BreadcrumbManager, createBreadcrumb } from "./breadcrumb";
export type { BreadcrumbOptions, BreadcrumbInstance, BreadcrumbItem } from "./breadcrumb";
// --- toast ---
export { ToastManager, getToastManager, showToast } from "./toast";
export type { ToastOptions, ToastInstance, ToastManagerConfig, ToastType, ToastPosition } from "./toast";

// --- form-validator ---
export { FormValidator, required, minLength, maxLength, pattern, email, urlValidator, range, matchesField, asyncValidator, custom } from "./form-validator";
export type { FieldValidationResult, FormValidationResult, ValidatorFn, FieldConfig, FormValidatorOptions } from "./form-validator";

// --- virtual-scroll ---
export { createVirtualScroll } from "./virtual-scroll";
export type { VirtualScrollOptions, VirtualScrollInstance, VirtualItem } from "./virtual-scroll";
// --- audio-player ---
export { createAudioPlayer } from "./audio-player";
export type { AudioPlayerOptions, AudioPlayerInstance, AudioTrack } from "./audio-player";

// --- video-player ---
export { createVideoPlayer } from "./video-player";
export type { VideoPlayerOptions, VideoPlayerInstance, VideoTrack, QualityOption, Chapter, PlaylistItem } from "./video-player";

// --- image-viewer ---
export { ImageViewerManager, createImageViewer } from "./image-viewer";
export type { ImageViewerOptions, ImageViewerInstance, ImageViewerImage, ImageViewerTool } from "./image-viewer";
// --- infinite-scroll ---
export { InfiniteScroll } from "./infinite-scroll";
export type { InfiniteScrollOptions, InfiniteScrollState, InfiniteScrollItem } from "./infinite-scroll";

// --- command-palette ---
export { CommandPalette } from "./command-palette";
export type { CommandPaletteConfig, CommandPaletteState, Command, CommandCategory } from "./command-palette";

// --- search-highlight ---
export { SearchHighlightManager, createSearchHighlight } from "./search-highlight";
export type { SearchHighlightOptions, SearchHighlightInstance } from "./search-highlight";
// --- data-table ---
export { DataTableManager, createDataTable } from "./data-table";
export type { DataTableOptions, DataTableInstance, Column, SortState, FilterState } from "./data-table";

// --- chart ---
export { ChartManager, createChart } from "./chart";
export type { ChartOptions, ChartInstance, ChartDataset, ChartDataPoint, ChartType } from "./chart";

// --- drag-drop ---
export { createDropZone, createSortableList, readFileAsText, readFileAsDataURL, readFileAsArrayBuffer, getFileInfo } from "./drag-drop";
export type { DropZoneConfig, DropZoneController, DragItem, DndState, SortableConfig, SortableController, SortableItem, FileInfo } from "./drag-drop";

// --- clipboard ---
export {
  copyToClipboard,
  copyRichToClipboard,
  readFromClipboard,
  readRichFromClipboard,
  isClipboardAvailable,
  canReadClipboard,
  watchClipboard,
} from "./clipboard";
export type { ClipboardData, ClipboardOptions } from "./clipboard";

// --- shortcuts ---
export { createShortcutManager } from "./shortcuts";
export type {
  ShortcutBinding,
  ShortcutGroup,
  ShortcutManagerOptions,
  ShortcutInstance,
} from "./shortcuts";

// --- print ---
export { createPrintManager, quickPrint, addPageBreakBefore, addPageBreakAfter, avoidBreakInside } from "./print";
export type { PrintOptions, PrintManagerInstance } from "./print";

// --- notification ---
export { NotificationManager, getNotificationManager, toast } from "./notification";
export type {
  Notification,
  NotificationOptions,
  NotificationPosition,
  NotificationType,
} from "./notification";

// --- geolocation ---
export { GeoLocationManager, createGeoLocationManager, getCurrentLocation, geoDistance } from "./geolocation";
export type { GeoPosition, GeoOptions, GeoWatchOptions, GeoError, GeoState, GeoListener } from "./geolocation";

// --- local-storage ---
export {
  LocalStorageManager,
  SessionStorageManager,
  createLocalStorage,
  createSessionStorage,
  lsSet,
  lsGet,
  lsRemove,
  lsHas,
} from "./local-storage";
export type { StorageItem, StorageOptions, StorageInstance } from "./local-storage";

// --- text-selection ---
export {
  getSelection,
  setSelection,
  clearSelection,
  collapseSelection,
  selectAll,
  selectText,
  getSelectedText,
  getSelectedHtml,
  saveSelection,
  restoreSelection,
  clearSavedSelection,
  getCursorPosition,
  setCursorPosition as setCursorPos,
  moveCursor,
  selectWord,
  selectLine,
  selectSentence,
  selectAllOccurrences,
  highlightSelection,
  removeHighlights,
  highlightText,
  observeSelection,
} from "./text-selection";
export type { SelectionRange, CursorPosition, TextBoundaryOptions } from "./text-selection";

// --- scroll-utilities ---
export {
  scrollTo,
  scrollToTop,
  scrollToBottom,
  scrollIntoView,
  onScroll,
  isInViewport,
  getVisibilityRatio,
  getScrollProgress,
  createScrollSpy,
  addParallax,
  makeSticky,
  showScrollProgressBar,
  hideScrollProgressBar,
} from "./scroll-utilities";
export type { ScrollPosition, ScrollToOptions, ScrollSpyOptions, ParallaxConfig, ScrollSpyInstance } from "./scroll-utilities";

// --- dom-utils ---
export {
  createEl,
  div,
  span,
  p,
  btn,
  createSvg,
  $,
  $$,
  requireSelector,
  byId,
  byClass,
  byTag,
  walkUp,
  walkDown,
  nextSibling,
  prevSibling,
  siblings,
  siblingIndex,
  isLastChild,
  isFirstChild,
  empty,
  setChildren,
  insertAtIndex,
  moveToIndex,
  swapElements,
  wrap,
  unwrap,
  htmlToFragment,
  appendHtml,
  prependHtml,
  delegate,
  delegateClick,
  renderTemplate,
  renderInto,
} from "./dom-utils";
export type { CreateElementOptions, QueryOptions, DomDiffResult } from "./dom-utils";

// --- event-bus ---
export { EventBus, createEventBus } from "./event-bus";
export type {
  EventCallback,
  EventMiddleware,
  Subscription,
  EmittedEvent,
  EventBusOptions,
} from "./event-bus";

// --- state-store ---
export { StateStore, createStore, createCounter } from "./state-store";
export type { StoreOptions, StoreInstance, Middleware, Selector } from "./state-store";

// --- animation ---
export { EASING, KEYFRAMES, DURATION, animateValue, springAnimate, cssKeyframes, transition } from "./animation";
export type { EasingName, SpringConfig } from "./animation";

// --- i18n ---
export { t, getLocale, setLocale, LOCALE_CHANGE_EVENT } from "./i18n";
export type { Locale } from "./i18n";

// --- theme-manager ---
export { ThemeManager, createThemeManager, toggleTheme, isDarkMode } from "./theme-manager";
export type { ThemeMode, DesignToken, ThemeDefinition, ThemeManagerInstance } from "./theme-manager";

// --- a11y-utils ---
export {
  getFocusableElements,
  createFocusTrap,
  focusElement,
  setTabOrder,
  announce,
  createLiveRegion,
  prefersReducedMotion,
  onReducedMotionChange,
  getSafeDuration,
  setAria,
  removeAria,
  srOnlyHide,
  srOnlyShow,
  setupDialog,
  contrastRatio,
  suggestForegroundColor,
  createSkipLink,
} from "./a11y-utils";
export type { A11yFocusableElements, ContrastResult } from "./a11y-utils";

// --- resize-observer ---
export { ResizeWatcher, createResizeObserver, matchParentSize, whenSizeExceeds } from "./resize-observer";
export type { ResizeBox, ResizeObserverOptions, ResizeObserverEntry, ResizeObserverInstance } from "./resize-observer";

// --- mutation-observer ---
export { MutationWatcher, createMutationObserver, waitForElement, waitForRemoval } from "./mutation-observer";
export type {
  MutationFilter,
  MutationObserverOptions,
  SimplifiedMutationRecord,
  MutationObserverInstance,
} from "./mutation-observer";

// --- intersection-helper ---
export {
  IntersectionHelper,
  createIntersectionHelper,
  createLazyLoader,
  createScrollReveal,
  trackVisibility,
} from "./intersection-helper";
export type { IntersectionOptions, IntersectionEntry, IntersectionHelperInstance } from "./intersection-helper";

// --- file-system-access ---
export { FileSystemAccess } from "./file-system-access";
export type {
  FilePickerOptions,
  SavePickerOptions,
  DirPickerOptions,
  FileSystemEntry,
  ReadOptions,
  WriteOptions,
  CopyMoveOptions,
  OpfsOptions,
  FileSystemStats,
} from "./file-system-access";

// --- web-socket ---
export { WebSocketManager, createWebSocket, quickConnect } from "./web-socket";
export type { WSOptions, WSMessage, WSSendOptions, WSChannel, WSInstance, WSStats, WSReadyState } from "./web-socket";

// --- performance-utils ---
export {
  PerfObserver,
  measureSync,
  measureAsync,
  perfMark,
  perfMeasure,
  measureBetween,
  FPSCounter,
  getMemoryUsage,
  getMemoryPercent,
  MemoryMonitor,
  LongTaskDetector,
  getNavigationTiming,
  collectWebVitals,
  getResourceTiming,
  findSlowResources,
  CustomMetric,
} from "./performance-utils";
export type {
  TimingResult,
  MemoryUsage,
  FPSStats,
  WebVitals,
  NavigationTiming,
} from "./performance-utils";

// --- color-thief ---
export {
  getDominantColor,
  getPalette,
  getPaletteWithCounts,
  getColorAnalysis,
  generateScheme,
  colorToCss,
  colorToHex,
  parseColor as parseColorStr,
} from "./color-thief";
export type { Color, ColorWithCount, ColorThiefOptions } from "./color-thief";

// --- css-in-js ---
export {
  injectStyle,
  removeStyle,
  updateStyle,
  setCssVar,
  getCssVar,
  setCssVars,
  getRootVar,
  setRootVar,
  getCurrentBreakpoint,
  isMinWidth,
  isMaxWidth,
  onBreakpointChange,
  isMobile,
  isTablet,
  isDesktop,
  getDevicePixelRatio,
  isRetina,
  mq,
  mediaQueries,
  matchesMedia,
  subscribeMedia,
  isDarkMode: isDarkModeCSS,
  isLightMode,
  toggleDarkMode,
  setDarkMode,
  onDarkModeChange,
  buildKeyframes,
  registerKeyframes,
  animations,
  animate,
  toggleClass,
  classIf,
  setClasses,
  hasAnyClass,
  bringToFront,
  sendToBack,
} from "./css-in-js";
export type { Breakpoints } from "./css-in-js";

// --- html-sanitizer ---
export { sanitizeHtml, sanitize, stripHtml, escapeHtmlEntities, scanForXss } from "./html-sanitizer";
export type { SanitizeOptions, SanitizeLevel } from "./html-sanitizer";

// --- password-strength ---
export { createPasswordStrength } from "./password-strength";
export type { StrengthScore, StrengthLevel, PasswordStrengthOptions, PasswordStrengthInstance } from "./password-strength";

// --- mask-input ---
export {
  createInputMask,
  applyMask,
  dateMask,
  phoneMask,
  creditCardMask,
  currencyMask,
  timeMask,
} from "./mask-input";
export type { MaskConfig, MaskInstance } from "./mask-input";

// --- formatting ---
export {
  formatNumber,
  formatCurrency,
  formatPercent,
  compactNumber,
  formatDate,
  formatTime,
  formatRelativeTime,
  formatISO,
  formatDateTime,
  formatFileSize,
  formatBitSize,
  formatDuration,
  pluralize,
  ordinal,
  bytesForHuman,
  parseSizeString,
  maskString,
  maskEmail,
  maskPhone,
} from "./formatting";
export type { RelativeTimeStyle } from "./formatting";

// --- debounce-throttle ---
export {
  Debounced,
  Throttled,
  debounce,
  throttle,
  debouncePromise,
  rafThrottle,
  idleThrottle,
} from "./debounce-throttle";
export type { DebounceOptions, ThrottleOptions, RateLimitStats } from "./debounce-throttle";

// --- id-generator ---
export {
  uuid as uuidGen,
  uuidShort,
  uuidPrefixed,
  nanoid,
  nanoIdShort,
  createSequentialGenerator,
  snowflake,
  cuid,
  ulid,
  objectId,
  hashId,
  slugId,
} from "./id-generator";
export type { NanoidOptions, SnowflakeOptions } from "./id-generator";

// --- uuid ---
export { uuidv4, uuidv7, nanoId as nanoIdUtil, shortId, prefixedId, isUuid, getUuidVersion } from "./uuid";

// --- logger ---
export { Logger, log, apiLog, dbLog, extLog, setGlobalLogLevel, getGlobalLogLevel } from "./logger";
export type { LogLevel, LogEntry } from "./logger";

// --- validator ---
export {
  isString,
  isNumber,
  isInteger,
  isFiniteNumber,
  isBoolean,
  isArray,
  isObject,
  isDate,
  isEmail,
  isUrl,
  isNil,
  isPresent,
  validate,
  validateSync,
  assert,
  ValidationError,
  throwIfInvalid,
} from "./validator";
export type { ValidationRule, ValidationResult, ValidationSchema } from "./validator";

// --- crypto-utils ---
export {
  sha1,
  sha256,
  sha384,
  sha512,
  hash,
  hashHex,
  hmac,
  hmacHex,
  pbkdf2,
  deriveAesKey,
  generateAesKey,
  aesGcmEncrypt,
  aesGcmDecrypt,
  aesGcmEncryptString,
  aesGcmDecryptString,
  generateRsaOaepKeyPair,
  rsaOaepEncrypt,
  rsaOaepDecrypt,
  generateEcdsaKeyPair,
  ecdsaSign,
  ecdsaVerify,
  generateRsaPssKeyPair,
  rsaPssSign,
  rsaPssVerify,
  exportKey as exportCryptoKey,
  importKey as importCryptoKey,
  keyFingerprint,
  generateEcdhKeyPair,
  ecdhDeriveSecret,
  ecdhDeriveAesKey,
  randomBytes,
  secureRandomInt,
  secureRandomUuid,
  secureRandomString,
  toBase64,
  fromBase64,
  toBase64Url,
  fromBase64Url,
  toHex,
  fromHex,
  encodeUtf8,
  decodeUtf8,
  estimatePasswordStrength,
  generatePassword,
  generateTokenHex,
  generateTokenBase64Url,
  generateApiKey,
  generateSessionId,
} from "./crypto-utils";
export type {
  HashAlgorithm,
  HmacAlgorithm,
  AesKeyLength,
  EcNamedCurve,
  RsaKeySize,
  KeyFormat,
  Pbkdf2Options,
  AesGcmOptions,
  AesGcmEncryptedData,
  RsaKeyGenOptions,
  EcdsaKeyGenOptions,
  RsaPssSignOptions,
  PasswordStrengthResult,
  PasswordGeneratorOptions,
  ApiKeyOptions,
} from "./crypto-utils";

// --- Rate Limiting ---
export {
  TokenBucketRateLimiter,
  SlidingWindowLogRateLimiter,
  SlidingWindowCounterRateLimiter,
  FixedWindowRateLimiter,
  LeakyBucketRateLimiter,
  AdaptiveRateLimiter,
  CircuitBreaker,
  Bulkhead,
  RequestCoalescer,
  PriorityQueue,
  DistributedRateLimiter,
  StatsCollector,
  createRateLimiter,
  debounce as rateDebounce,
  throttle as rateThrottle,
} from "./rate-limiter";

// --- Cache ---
export { Cache, defaultCache, memoize } from "./cache";
export type { CacheOptions } from "./cache";

// --- Queue ---
export { AsyncQueue, RateLimiter, BatchingQueue } from "./queue";
export type { QueueTask } from "./queue";

// --- Scheduler ---
export { Scheduler, parseCronExpression, cronMatches, getNextCronRun } from "./scheduler";
export type { ScheduledJob, JobStatus, CronExpression } from "./scheduler";

// --- Promise Utilities ---
export {
  retry,
  withTimeout,
  sleep,
  runConcurrent,
  processInBatches,
  raceSuccess,
  firstN,
  makeCancellable,
  collectAsync,
  mapAsyncIterable,
  filterAsyncIterable,
  reduceAsyncIterable,
  memoizeAsync,
  createDeferred,
  createOnceEvent,
  poll,
  TaskQueue,
} from "./promise-utils";
export type {
  RetryOptions as PromiseRetryOptions,
  TimeoutOptions,
  ConcurrencyOptions,
  BatchOptions,
  MemoizeOptions,
  PollOptions,
  TaskQueueOptions,
} from "./promise-utils";

// --- Retry ---
export { retryWithBackoff, CircuitBreaker } from "./retry";
export type { RetryOptions as BackoffRetryOptions, CircuitBreakerOptions } from "./retry";

// --- Worker Utilities ---
export {
  createInlineWorker,
  createInlineModuleWorker,
  WorkerChannel,
  WorkerPool,
  isWorkerAvailable,
  isWorkerContext,
  getWorkerConcurrency,
} from "./worker-utils";
export type { WorkerMessage, WorkerResponse, WorkerPoolOptions, PooledTask } from "./worker-utils";

// --- Stream Utilities ---
export {
  readableFromAsync,
  readableFromArray,
  writableToArray,
  mapStream,
  filterStream,
  batchStream,
  flattenStream,
  throttleStream,
  dedupStream,
  pipeThrough,
  consumeStream,
  streamToIterable,
  iterableToStream,
  pipeToPromise,
  teeStream,
  textToStream,
  collectText,
  streamToArrayBuffer,
  streamToBlob,
  mergeStreams,
  concatStreams,
} from "./stream-utils";
export type { StreamOptions, TransformOptions } from "./stream-utils";

// --- Blob Utilities ---
export {
  createBlob,
  stringToBlob,
  jsonToBlob,
  createFile,
  readAsText,
  readAsArrayBuffer,
  readAsDataURL,
  readAsBinaryString,
  blobToUint8Array,
  uint8ArrayToBlob,
  base64ToBlob,
  blobToBase64,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  sliceBlob,
  splitBlob,
  createObjectURL,
  revokeObjectURL,
  createTempObjectURL,
  formatFileSize,
  getMimeType,
  isImageMime,
  isAudioMime,
  isVideoMime,
  isTextMime,
  downloadBlob,
  downloadDataUrl,
  compareBlobs,
  hashBlob,
} from "./blob-utils";
export type { BlobParts, BlobReadOptions, FileSliceOptions } from "./blob-utils";

// --- URL Utilities ---
export {
  parseUrl,
  buildUrlFromParts,
  updateSearchParams,
  removeSearchParams,
  getQueryParams,
  isSameOrigin,
  normalizeUrl as normalizeUrlUtil,
  isAbsoluteUrl,
  makeAbsoluteUrl,
  getDomainFromUrl,
  getPathnameFromUrl,
  joinPathSegments,
  encodeUriComponentSafe,
  decodeUriComponentSafe,
  urlsEqual,
} from "./url-utils";
export type { ParsedUrl } from "./url-utils";

// --- Query String ---
export {
  parse as parseQueryString,
  parseUrlQuery,
  stringify as stringifyQuery,
  getParam,
  setParam,
  removeParam,
  toggleParam,
  mergeParams,
  pickParams,
  omitParams,
} from "./query-string";
export type { QueryStringOptions, StringifyOptions } from "./query-string";

// --- Router Utilities ---
export {
  compileRoute,
  matchRoute,
  matchRoutes,
  generatePath,
  SimpleRouter,
  pathMatchesGlob,
  splitPath,
  joinPath,
  getParentPath,
  normalizePath,
} from "./router-utils";
export type { RouteDefinition, RouteMatch, NavigationGuard, RouterOptions } from "./router-utils";

// --- Number Utilities ---
export {
  clampNumber,
  lerpNumber,
  mapRangeNumber,
  roundTo,
  roundToMultiple,
  floorToMultiple,
  ceilToMultiple,
  formatBytesAuto,
  formatCompactNumber,
  formatWithSeparators,
  percentChange,
  approximatelyEqual,
  randomIntInRange,
  randomFloatInRange,
  normalizeAngleDeg,
  normalizeAngleRad,
  degToRad as numberDegToRad,
  radToDeg as numberRadToDeg,
  gcd as numberGcd,
  lcm as numberLcm,
  isInRange,
  wrapNumber,
} from "./number-utils";

// --- Math Utilities ---
export {
  mean, median, mode, variance, stddev, covariance, correlation,
  linearRegression, percentile,
  Vec2, Vec3, Matrix,
  dist2D, dist3D, angleBetweenPoints, pointInPolygon, polygonArea,
  polygonCentroid, boundingBox, lineIntersection,
  lerp, clamp, mapRange, smoothStep, bezierQuad, bezierCubic, catmullRom,
  gcd, lcm, isPrime, sieveOfEratosthenes, factorial, fibonacci,
  fibonacciSequence, combinations, permutations, modPow,
  angle, temperature, length as lengthUnits, weight,
  randomNormal, randomUniform, randomInt, randomPick, shuffle, weightedRandom,
} from "./math-utils";
export type { Vector2D, Vector3D } from "./math-utils";

// --- Statistics Cards ---
export { createStatCard } from "./statistics";
export type { StatCardOptions, StatisticsInstance, TrendDirection, SparklineType } from "./statistics";

// --- Array Utilities ---
export {
  chunkArray,
  splitAt,
  partitionArray,
  slidingWindow,
  groupConsecutive,
  deepFlatten,
  uniqueBy,
  intersectArrays,
  differenceArrays,
  symmetricDifference,
  rotateArray,
  sampleArray,
  shuffleArray,
  zipArrays,
  fillArray,
  argMin,
  argMax,
} from "./array-utils";

// --- Object Utilities ---
export {
  deepClone,
  shallowClone,
  pick,
  omit,
  deepMerge,
  get as objGet,
  set as objSet,
  has as objHas,
  unset,
  mapValues,
  mapKeys,
  filterEntries,
  invert,
  deepEqual,
  allKeys,
  isEmpty as objIsEmpty,
  size as objSize,
  deepFreeze,
  groupBy,
  countBy,
  indexBy,
  values as objValues,
  keys as objKeys,
  toPairs,
  fromPairs,
  defaults,
  ensurePath,
} from "./object-utils";

// --- String Utilities ---
export {
  isBlank,
  isPresent as strIsPresent,
  collapseWhitespace,
  stripDiacritics,
  escapeRegex,
  escapeHtmlEntities,
  unescapeHtmlEntities,
  toCamelCaseString,
  toPascalCaseString,
  toKebabCaseString,
  toSnakeCaseString,
  capitalizeWords,
  smartTruncate,
  repeatWithSeparator,
  centerPad,
  isAscii,
  looksLikeEmail,
  looksLikeUrl,
  extractNumbers,
  replaceMultiple,
  stringToId,
  countOccurrences,
  reverseWords,
  trimLines,
  detectCase,
  slugify,
  levenshtein,
  isSimilar,
  soundex,
  randomString,
  randomHex,
  generateId as stringGenerateId,
  wordCount,
  charFrequency,
  mostCommonChars,
  uniqueWords,
  pluralize,
  singularize,
  acronym,
  abbreviate,
  maskString,
  maskEmail,
  detectIndentation,
  indentText,
  simpleDiff,
} from "./string-utils";
export type { DiffSegment } from "./string-utils";

// --- Date Utilities ---
export {
  formatDate,
  toISODate,
  toISODatetime,
  formatTime,
  relativeTime,
  shortRelativeTime,
  parseDate as dateParseDate,
  formatDuration as dateFormatDuration,
  parseDuration as dateParseDuration,
  isLeapYear as dateIsLeapYear,
  daysInMonth as dateDaysInMonth,
  getDayOfWeek,
  getWeekNumber as dateGetWeekNumber,
  getQuarter as dateGetQuarter,
  isSameDay as dateIsSameDay,
  isToday as dateIsToday,
  isYesterday as dateIsYesterday,
  isBetween,
  addTime as dateAddTime,
  startOfDay as dateStartOfDay,
  endOfDay as dateEndOfDay,
  startOfWeek as dateStartOfWeek,
  endOfWeek as dateEndOfWeek,
  startOfMonth as dateStartOfMonth,
  endOfMonth as dateEndOfMonth,
  getTimezone,
  getTimezoneOffset,
  convertToTimezone,
} from "./date-utils";
export type { DateFormatOptions, RelativeTimeOptions } from "./date-utils";

// --- Time Utilities ---
export {
  parseDuration as timeParseDuration,
  formatDuration as timeFormatDuration,
  formatDurationCompact,
  CountdownTimer,
  Stopwatch,
  RateLimiter as TimeRateLimiter,
  FixedWindowRateLimiter,
  debounce as timeDebounce,
  throttle as timeThrottle,
  addTime as timeAddTime,
  diffDates,
  isSameDay as timeIsSameDay,
  isToday as timeIsToday,
  isYesterday as timeIsYesterday,
  isTomorrow,
  getDayOfYear,
  getWeekNumber as timeGetWeekNumber,
  getQuarter as timeGetQuarter,
  startOfDay as timeStartOfDay,
  endOfDay as timeEndOfDay,
  startOfWeek as timeStartOfWeek,
  endOfWeek as timeEndOfWeek,
  startOfMonth as timeStartOfMonth,
  endOfMonth as timeEndOfMonth,
  daysInMonth as timeDaysInMonth,
  isLeapYear as timeIsLeapYear,
  getMonthDays,
  formatDateRange,
  getUserTimezone,
  getTimezoneOffset as timeGetTimezoneOffset,
  toTimezone,
  TIMEZONE_ALIASES,
  scheduleAt,
  IntervalScheduler,
} from "./time-utils";
export type { ParsedDuration, CountdownOptions, StopwatchLap, RateLimitResult } from "./time-utils";

// --- Duration ---
export { Duration } from "./duration";
export type { DurationInput, HumanizeOptions } from "./duration";

// --- Encoding ---
export {
  base64Encode as encBase64Encode,
  base64Decode as encBase64Decode,
  safeEncode,
  safeDecode,
  unicodeEscape,
  unicodeUnescape,
  encodeQuery,
  xorCipher,
  xorDecipher,
  simpleHash,
  truncateMiddle,
} from "./encoding";

// --- Base64 ---
export {
  base64Encode,
  base64Decode,
  base64UrlEncode,
  base64UrlDecode,
  dataUriEncode,
  dataUriDecode,
  isValidBase64,
  base64EncodeObject,
  base64DecodeObject,
} from "./base64";

// --- Hashing ---
export {
  djb2,
  fnv1a,
  murmur3,
  sdbm,
  sha256,
  sha1,
  sha384,
  sha512,
  crc32,
  adler32,
  fingerprint,
  shortFingerprint,
  consistentId,
  stringToColor,
  serializeForHash,
  objectHash,
} from "./hashing";

// --- Functional ---
export {
  compose,
  pipe,
  curry2,
  curry3,
  partial,
  partialRight,
  just,
  nothing,
  fromNullable,
  left,
  right,
  tryCatch,
  tryCatchAsync,
  Lazy,
  lazy,
  trampoline,
  cont,
  done,
  identity,
  constant,
  noop,
  tap,
  also,
  when,
  defaultTo,
  alwaysTrue,
  alwaysFalse,
  not,
  flip,
} from "./functional";
export type { Maybe, Either, TrampolineResult } from "./functional";

// --- Patterns ---
export { createSingleton, Observable, EventBus, StrategyRunner, CommandInvoker, Mediator, FiniteStateMachine, createIterator, range, cycle, repeat, take, skip, zipIterators } from "./patterns";
export type { Observer, Subscription, ObservableLike, EventHandler, StrategyContext, Strategy, Command, MediatorHandler, StateTransition, StateMachineConfig } from "./patterns";

// --- Comparators ---
export {
  asc,
  desc,
  nullSafe,
  naturalCompare,
  naturalSort,
  localeCompare as localeCompareFn,
  caseInsensitive,
  multiKeyComparator,
  sortBy,
  sortByMultiple,
  byProperty,
  rankValues,
  percentileRank,
  topN,
  bottomN,
  partitionBy,
  insertionPoint,
  binarySearch,
} from "./comparators";
export type { Comparator, SortDirection, SortSpec } from "./comparators";

// --- DOM Observer ---
export { DomObserverManager, takeSnapshot, compareSnapshots, createRouteChangeDetector, createLazyLoader } from "./dom-observer";
export type { ObserveTarget, MutationOptions, IntersectionOptions, ResizeOptions, MutationRecordEx, DomSnapshot, ObserverCallbacks, ObserverStats } from "./dom-observer";

// --- CSS Utilities ---
export {
  cssVar,
  setCssVar,
  getCssVar,
  setCssVars,
  removeCssVar,
  getAllCssVars,
  injectCSS,
  removeInjectedCSS,
  addCSSRule,
  clearDynamicStyles,
  styleObjectToString,
  cssStringToObject,
  applyStyles as applyCSSStyles,
  bem,
  createBem,
  cn,
  mergeClasses,
  mediaQuery,
  matchesMedia,
  isAtLeast,
  isBelow,
  subscribeMedia,
  subscribeBreakpoint,
  getCurrentBreakpoint,
  media,
  cssTransition,
  EASING_CSS,
  keyframes,
  ANIMATIONS,
  animateOnce,
  hexToRgb,
  rgbToHex,
  mixColors,
  transparentize,
  lightenColor,
  darkenColor,
  parseCssColor,
  pxToRem,
  remToPx,
  ensureUnit,
  cssClamp,
  fluidFontSize,
} from "./css-utils";
export type { BreakpointName } from "./css-utils";

// --- HTML Builder ---
export { tag, html, htmlString, applyAttributes, appendChildren, fragment, repeat, when, switchOn, $, $$ } from "./html-builder";
export type { Child, AttrValue, BuildOptions } from "./html-builder";

// --- Event Emitter ---
export { EventEmitter, createEmitter } from "./event-emitter";
export type { Listener, AsyncListener, EmitterOptions, Subscription, EmitResult, EmitterStats } from "./event-emitter";

// --- Signal / Reactive ---
export {
  signal,
  readonlySignal,
  computed,
  effect,
  batch,
  isBatching,
  signalArray,
  toggleSignal,
  counterSignal,
  debouncedSignal,
  throttledSignal,
} from "./signal";
export type { Signal, ComputedSignal, SignalArray, EffectOptions } from "./signal";

// --- Pub/Sub ---
export { MessageBroker } from "./pubsub";
export type { Message, MessageContext, MessageHandler, SubscriptionOptions as PubSubSubscriptionOptions } from "./pubsub";

// --- Structs ---
export { Struct, defineStruct, lens, composeLens } from "./structs";
export type { FieldDef, StructSchema, StructOptions, PickStruct, OmitStruct } from "./structs";

// --- Tuple ---
export {
  tuple2,
  tuple3,
  tuple4,
  fromArray as tupleFromArray,
  singleton,
  empty as tupleEmpty,
  first,
  last,
  head,
  tail,
  at as tupleAt,
  match as matchTuple,
  mapTuple,
  zipMap,
  reverse as tupleReverse,
  flatten as tupleFlatten,
  sortTuple,
  concat as tupleConcat,
  prepend,
  append as tupleAppend,
  zip as tupleZip,
  unzip,
  splitAt,
  take as tupleTake,
  drop,
  includes as tupleIncludes,
  indexOf as tupleIndexOf,
  every as tupleEvery,
  some as tupleSome,
  find as tupleFind,
  countIf,
  reduce as tupleReduce,
  reduce1,
} from "./tuple";

// --- Either ---
export { Left, Right, fromNullable, tryEither, tryEitherAsync, validate, sequence, race, chain, cond, isEither } from "./either";

// --- Result (UI) ---
export { createResult } from "./result";
export type { ResultStatus, ResultVariant, ResultOptions, ResultInstance } from "./result";

// --- Option ---
export {
  Some,
  None,
  fromNullable as optionFromNullable,
  fromPredicate,
  tryOption,
  tryOptionAsync,
  liftA2,
  sequence as optionSequence,
  firstSome,
  lastSome,
  at as optionAt,
  prop,
  coalesce,
} from "./option";
export type { Option } from "./option";

// --- Box ---
export {
  box,
  lazyBox,
  ensureBox,
  unbox,
  mapBox,
  chainBox,
  tupleBox,
  flattenBox,
  nAry,
  zipBoxes,
  unzipBoxes,
  foldBox,
} from "./box";
export type { Box } from "./box";
// --- Async Iterator ---
export {
  collect,
  toAsyncIterable,
  mapAsync,
  filterAsync,
  takeAsync,
  skipAsync,
  takeWhileAsync,
  dropWhileAsync,
  reduceAsync,
  findAsync,
  everyAsync,
  someAsync,
  countAsync,
  batchAsync,
  mergeAsync,
  delayAsync,
  timeoutAsync,
  retryAsync,
} from "./async-iterator";

// --- Collection Utils ---
export {
  groupBy,
  partition as collectionPartition,
  groupConsecutive as collectionGroupConsecutive,
  frequencyMap,
  mode as collectionMode,
  antiMode,
  countOccurrences,
  unique as collectionUnique,
  uniqueBy as collectionUniqueBy,
  symmetricDifference as collectionSymmetricDifference,
  intersection as collectionIntersection,
  union as collectionUnion,
  binarySearch as collectionBinarySearch,
  indexOf as collectionIndexOf,
  lastIndexOf as collectionLastIndexOf,
  findAllIndices,
  chunk as collectionChunk,
  splitWhen,
  flat as collectionFlat,
  deepFlat,
  rotateLeft,
  rotateRight,
  shuffle as collectionShuffle,
  sample,
  keysOf,
  valuesOf,
  entriesOf,
  invertObject,
  pickKeys,
  omitKeys,
} from "./collection-utils";
export type { TreeNode } from "./collection-utils";
export { buildTree, traverseDF, traverseBF, flattenTree } from "./collection-utils";

// --- Type Guards ---
export {
  isNil,
  isNotNil,
  isString,
  isNonEmptyString,
  isNumber,
  isInteger,
  isFiniteNumber,
  isFloat,
  isBoolean,
  isSymbol,
  isBigInt,
  isFunction,
  isPlainObject,
  isObject,
  isArray,
  isNonEmptyArray,
  isDate,
  isValidDate,
  isRegExp,
  isError,
  isMap,
  isSet,
  isWeakMap,
  isWeakSet,
  isArrayBuffer,
  isArrayBufferView,
  isPromise,
  isPositive,
  isNegative,
  isZero,
  isInRange,
  isEven,
  isOdd,
  isEmailLike,
  isUrlLike,
  isJsonString,
  isBlankString,
  isHexColor,
  isRgbColorString,
  isEmpty,
  hasContent,
  hasProperty,
  isInstanceOf,
  isArrayOfStrings,
  isArrayOfNumbers,
  isArrayOfObjects,
  isCompactArray,
  assertType,
  expectType,
} from "./type-guards";
// --- Logger ---
export { Logger, log, apiLog, dbLog, extLog, setGlobalLogLevel, getGlobalLogLevel } from "./logger";
export type { LogLevel } from "./logger";

// --- Validation ---
export {
  GenerateDiffSchema,
  CreateFrictionSchema,
  CreatePRSchema,
  VoteSchema,
  validateBody,
} from "./validation";
export type {
  GenerateDiffInput,
  CreateFrictionInput,
  CreatePRInput,
  VoteInput,
} from "./validation";

// --- i18n ---
export {
  t,
  getLocale,
  setLocale,
  LOCALE_CHANGE_EVENT,
} from "./i18n";
export type { Locale } from "./i18n";
// --- Config ---
export { ConfigManager, createConfig } from "./config";
export type {
  ConfigValue,
  ConfigSchema,
  ConfigSchemaEntry,
  Environment,
  ConfigOptions,
  ConfigSource,
  ConfigValidationResult,
} from "./config";

// --- Env ---
export { env, envNumber, envBool, requireEnv } from "./env";

// --- Constants ---
export {
  APP_NAME,
  APP_VERSION,
  APP_URL,
  GITHUB_URL,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_DEFAULT_MAX,
  RATE_LIMIT_AI_MAX,
  CACHE_SHORT,
  CACHE_MEDIUM,
  CACHE_LONG,
  CACHE_STATIC,
  TIMEOUT_API,
  TIMEOUT_AI,
  TIMEOUT_UPLOAD,
  MAX_DESCRIPTION_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  DEBOUNCE_SEARCH_MS,
  STATUS_COLORS,
  VOTE_LABELS,
  WEBHOOK_EVENTS,
} from "./constants";
// --- Permissions (RBAC) ---
export { RBAC, createRBAC, COMMON_ROLES } from "./permissions";
export type {
  Permission,
  RoleName,
  Role,
  User,
  Policy,
  CheckResult,
  AuditEntry,
} from "./permissions";

// --- Storage ---
export { storageGet, storageSet, storageRemove, storageKeys, storageClear } from "./storage";

// --- State ---
export { UndoableStore, EventBus, globalEvents } from "./state";
export type { HistoryState } from "./state";
// --- HTTP Client ---
export { HttpClient, createHttpClient, HttpError } from "./http-client";
export type {
  HttpClientConfig,
  HttpRequestOptions,
  HttpResponse,
  HttpMiddleware,
} from "./http-client";

// --- API Utils ---
export {
  buildApiUrl,
  appendPagination,
  isOkResponse,
  extractApiError,
  wrapPaginated,
  createApiHeaders,
  apiGet,
  apiPost,
  withRetry as apiWithRetry,
  createDebouncedFetcher,
  RequestQueue,
} from "./api-utils";
export type { ApiPagination, PaginatedResponse, ApiError, ApiRequestConfig } from "./api-utils";

// --- Error Handler ---
export {
  ErrorHandler,
  classifyError,
  getUserMessage,
  isRetryable,
  isRecoverable,
  getErrorCategory,
  createNoopHandler,
} from "./error-handler";
export type {
  ErrorCategory,
  ClassifiedError,
  ErrorHandlerOptions,
  ErrorLogEntry,
  RecoveryAction,
} from "./error-handler";
// --- Theme ---
export { ThemeManager, getThemeManager, useTheme, LIGHT_THEME, DARK_THEME, BUILT_IN_THEMES } from "./theme";
export type { ThemeColors, ThemeConfig } from "./theme";

// --- CSS-in-JS ---
export {
  injectStyle,
  removeStyle,
  updateStyle,
  setCssVar as cssSetVar,
  getCssVar as cssGetVar,
  setCssVars,
  getRootVar,
  setRootVar,
  getCurrentBreakpoint,
  isMinWidth,
  isMaxWidth,
  onBreakpointChange,
  isMobile,
  isTablet,
  isDesktop,
  getDevicePixelRatio,
  isRetina,
  mq,
  mediaQueries,
  matchesMedia,
  subscribeMedia,
  isDarkMode,
  isLightMode,
  toggleDarkMode,
  setDarkMode,
  onDarkModeChange,
  buildKeyframes,
  registerKeyframes,
  animations as cssAnimations,
  animate as cssAnimate,
  toggleClass,
  classIf,
  setClasses,
  hasAnyClass,
  bringToFront,
  sendToBack,
} from "./css-in-js";
export type { Breakpoints, KeyframeRule } from "./css-in-js";

// --- Animation ---
export { EASING, DURATION, KEYFRAMES, animateValue, springAnimate, cssKeyframes, transition } from "./animation";
export type { EasingName, SpringConfig } from "./animation";
// --- Virtual DOM ---
export {
  h,
  createTextVNode,
  Fragment,
  createComponentVNode,
  createElement,
  applyProps,
  diff,
  patch,
  computePropsDiff,
  mount,
  updateTree,
  unmount,
  enqueueUpdate,
  startBatch,
  endBatch,
  renderWithErrorBoundary,
  scheduler,
  beginFiberWork,
  memo,
  shallowEqual,
  createContext,
  readContext,
  subscribeToContext,
  createDevToolsHook,
  registerRendererWithDevTools,
  createRenderer,
} from "./virtual-dom";
export type {
  VNodeType,
  VNode,
  VNodeProps,
  ComponentFunction,
  ComponentLifecycle,
  ComponentInstance,
  ErrorInfo,
  Patch,
  PropsDiff,
  SyntheticEvent,
  Context,
  MemoCompareFunction,
  MemoizedComponent,
  DevToolsHook,
  VNodeWork,
  ScheduledWork,
  RendererConfig,
  VDOMRendererOptions,
} from "./virtual-dom";
export { Priority, PatchType, PROPERTY_ATTRIBUTES, EVENT_HANDLER_RE } from "./virtual-dom";

// --- Component Utils ---
export { BaseComponent, Portal, SuspenseBoundary, ComponentRegistry, SlotManager } from "./component-utils";
export { createPortal, createFragment, createRef, createCallbackRef, mergeRefs, diffProps, propsChanged } from "./component-utils";
export type { ComponentProps, ComponentInstance as CompInstance, PropDiffResult } from "./component-utils";

// --- Form Utils ---
export { createForm, serializeForm, populateForm, clearForm, createMultiStepForm, evaluateConditionals, linkErrorToField, unlinkErrorFromField, createFormAnnouncer } from "./form-utils";
export type {
  FormFieldConfig,
  FormValidationRule,
  FormFieldState,
  FormOptions,
  FormInstance,
  StepConfig,
  MultiStepFormOptions,
  MultiStepFormInstance,
  ConditionRule,
  ConditionalField,
} from "./form-utils";
// --- Keyboard ---
export { KeyboardManager, createKeyboardManager, formatShortcut, matchesShortcut } from "./keyboard";
export type {
  KeyBinding,
  KeyChord,
  KeyboardManagerOptions,
  KeyboardManagerInstance,
} from "./keyboard";

// --- Mouse ---
export {
  getPointerPosition,
  createPositionTracker,
  onClickOutside,
  makeDraggable,
  onLongPress,
  trackScrollDirection,
  requestPointerLock,
  exitPointerLock,
  isPointerLocked,
  pointDistance,
  pointAngle,
  pointInRect,
} from "./mouse";
export type {
  Point as MousePoint,
  MousePosition,
  ClickOutsideOptions,
  DragOptions,
  DragInstance,
  LongPressOptions,
  ScrollDirectionInfo,
} from "./mouse";

// --- Gesture ---
export { GestureManager, createGesture, swipeGestures, tapGesture } from "./gesture";
export type {
  GestureType,
  SwipeDirection,
  GestureConfig,
  GestureHandlerConfig,
  GestureEvent,
  GestureInstance,
} from "./gesture";
// --- Clipboard ---
export { copyToClipboard, copyRichToClipboard, readFromClipboard, readRichFromClipboard, isClipboardAvailable, canReadClipboard, watchClipboard } from "./clipboard";
export type { ClipboardData, ClipboardOptions } from "./clipboard";

// --- Drag & Drop ---
export { createDropZone, readFileAsText as dndReadFileAsText, readFileAsDataURL as dndReadFileAsDataURL, readFileAsArrayBuffer as dndReadFileAsArrayBuffer, getFileInfo, createSortableList } from "./drag-drop";
export type { DragItem, DropZoneConfig, DndState, FileInfo, SortableItem, SortableConfig, DropZoneController, SortableController } from "./drag-drop";

// --- File Utils ---
export {
  MIME_MAP,
  getMimeType,
  getExtension,
  getBaseName,
  categorizeFile,
  isFileType,
  FILE_EXTENSIONS,
  validateFile as fileValidateFile,
  validateFiles,
  sanitizeFilename,
  uniqueFilename,
  formatBytes as fileFormatBytes,
  formatFileSizeShort,
  getFileIcon,
  parseDropEvent,
  setupDropZone,
  readFileAsText as fileReadText,
  readFileAsDataURL as fileReadDataURL,
  readFileAsArrayBuffer as fileReadArrayBuffer,
  readFileAsBinaryString,
  readFileHeader,
  splitFileIntoChunks,
  UploadTracker,
} from "./file-utils";
export type {
  FileCategory,
  FileValidationOptions,
  FileValidationError,
  DropEvent,
  FileChunk,
  UploadProgress,
} from "./file-utils";
// --- Notification ---
export { NotificationManager, getNotificationManager, toast } from "./notification";
export type { Notification, NotificationOptions, NotificationType, NotificationPosition } from "./notification";

// --- Toast ---
export { ToastManager, getToastManager, showToast } from "./toast";
export type { ToastOptions, ToastInstance, ToastManagerConfig, ToastType, ToastPosition } from "./toast";

// --- Modal ---
export { createModal } from "./modal";
export type { ModalOptions, ModalInstance, ModalSize, ModalPosition } from "./modal";
// --- Tooltip ---
export { TooltipManager, getTooltipManager, tooltip } from "./tooltip";
export type { TooltipOptions, TooltipInstance, TooltipPlacement, TooltipTrigger } from "./tooltip";

// --- Popover ---
export { PopoverManager, createPopover } from "./popover";
export type { PopoverOptions, PopoverInstance, PopoverTrigger, PopoverPlacement } from "./popover";

// --- Dropdown ---
export { createDropdown } from "./dropdown";
export type { DropdownItem, DropdownSeparator, DropdownGroup, DropdownEntry, DropdownOptions, DropdownInstance, DropdownPlacement } from "./dropdown";

// --- Context Menu ---
export { ContextMenuManager } from "./context-menu";
export type { ContextMenuItem, ContextMenuPosition, ContextMenuOptions, ContextMenuInstance } from "./context-menu";

// --- Command Palette ---
export { CommandPalette } from "./command-palette";
export type { Command, CommandCategory, CommandPaletteConfig, CommandPaletteState } from "./command-palette";

// --- Hotkeys ---
export { HotkeyManager, createAppHotkeys, parseKeyCombo, eventMatchesCombo, formatKeyDisplay, areModifiersDown, getModifierString } from "./hotkeys";
export type { HotkeyBinding, HotkeyEvent, ParsedKeyCombo } from "./hotkeys";

// --- Scheduler ---
export { Scheduler, parseCronExpression, cronMatches, getNextCronRun } from "./scheduler";
export type { ScheduledJob, JobStatus, CronExpression } from "./scheduler";

// --- Event Bus v2 ---
export { EventBusV2, createEventBusV2 } from "./event-bus-v2";
export type {
  BaseEvent,
  TypedEvent,
  EventHandler,
  SubscriptionOptions,
  SubscriptionHandle,
  MiddlewareContext,
  EventMiddleware,
  BusMetrics,
  EventBusConfig,
} from "./event-bus-v2";

// --- Observable ---
export { Observable, Computed, ReactiveStore } from "./observable";
export type { Unsubscribe, SubscriberFn } from "./observable";

// --- Virtual Scroller ---
export { VirtualScroller } from "./virtual-scroller";
export type { ScrollItem, VisibleRange, ScrollerConfig, ScrollerState, ScrollToOptions } from "./virtual-scroller";

// --- Infinite Scroll ---
export { InfiniteScroll } from "./infinite-scroll";
export type { InfiniteScrollItem, InfiniteScrollOptions, InfiniteScrollState } from "./infinite-scroll";

// --- Tree View ---
export { TreeView } from "./tree-view";
export type { TreeNodeData, TreeNode, CheckMode, TreeViewConfig } from "./tree-view";

// --- Data Table ---
export { DataTableManager, createDataTable } from "./data-table";
export type { Column, SortDirection, SortState, FilterState, DataTableOptions, DataTableInstance } from "./data-table";

// --- Tabs ---
export { TabsManager, createTabs } from "./tabs";
export type { TabItem, TabOrientation, TabVariant, TabsOptions, TabsInstance } from "./tabs";

// --- Accordion ---
export { AccordionManager, createAccordion } from "./accordion";
export type { AccordionItem, AccordionMode, AccordionOptions, AccordionInstance } from "./accordion";

// --- Carousel ---
export { CarouselManager, createCarousel } from "./carousel";
export type { CarouselSlide, CarouselOptions, CarouselInstance } from "./carousel";

// --- Rating ---
export { RatingManager, createRating } from "./rating";
export type { StarIconType, RatingOptions, RatingInstance } from "./rating";

// --- Avatar ---
export { createAvatar, createAvatarGroup, getInitials } from "./avatar";
export type { AvatarSize, AvatarShape, AvatarOptions, AvatarGroupOptions } from "./avatar";

// --- Progress ---
export { createProgressTracker, createMultiProgressTracker, createStepProgress, formatProgress } from "./progress";
export type { ProgressState, ProgressCallback, ProgressController, MultiProgressController, StepProgressController } from "./progress";

// --- Skeleton ---
export { createSkeleton, createTextSkeleton, createHeadingSkeleton, createAvatarSkeleton, createCardSkeleton, createTableSkeleton, wrapWithSkeleton } from "./skeleton";
export type { SkeletonOptions, SkeletonTextOptions, SkeletonAvatarOptions, SkeletonCardOptions, SkeletonTableOptions } from "./skeleton";

// --- Badge ---
export { createBadge, createPositionedBadge, createStatusDot, addDotBadge, addCountBadge } from "./badge";
export type { BadgeVariant, BadgePosition, BadgeSize, BadgeOptions, StatusDotOptions } from "./badge";

// --- Color Picker ---
export { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, parseColor, getLuminance, getContrastRatio, getWcagLevel, getContrastingText, complementary, analogous, triadic, splitComplementary, tetradic, monochromatic, blendColors, lighten, darken, saturate, desaturate, invertColor, withOpacity, generatePaletteAdvanced } from "./color-picker";
export type { RgbColor, HslColor, Palette } from "./color-picker";

// --- Date Picker ---
export { DatePickerManager, createDatePicker } from "./date-picker";
export type { DatePickerOptions, DatePickerInstance } from "./date-picker";

// --- Input Mask ---
export { InputMaskManager, createInputMask } from "./input-mask";
export type { MaskType, MaskOptions, MaskInstance } from "./input-mask";

// --- Resize Observer ---
export { ResizeWatcher, createResizeObserver, matchParentSize, whenSizeExceeds } from "./resize-observer";
export type { ResizeBox, ResizeObserverOptions, ResizeObserverEntry, ResizeObserverInstance } from "./resize-observer";

// --- Mutation Observer ---
export { MutationWatcher, createMutationObserver, waitForElement, waitForRemoval } from "./mutation-observer";
export type { MutationFilter, MutationObserverOptions, SimplifiedMutationRecord, MutationObserverInstance } from "./mutation-observer";

// --- Intersection Observer ---
export { IntersectionWatcher, createIntersectionObserver, lazyLoadImages, watchVisibility, createInfiniteScrollSentinel } from "./intersection-observer";
export type { VisibilityState, ObserveMode, IntersectionOptions, IntersectionEntryEx, IntersectionInstance } from "./intersection-observer";

// --- Anchored Position ---
export { AnchoredPositioner, createAnchoredPosition } from "./anchored-position";
export type { AnchorPlacement, AnchorAlignment, AnchorOptions, ComputedPosition } from "./anchored-position";

// --- Floating UI ---
export { FloatingEngine, createFloating, flip, shift, size as floatingSize, arrow } from "./floating-ui";
export type { FloatingPlacement, MiddlewareFn, FloatingData, FloatingOptions, FloatingInstance } from "./floating-ui";

// --- Sortable ---
export { SortableList, createSortable } from "./sortable";
export type { SortableItem, SortableOptions, SortableInstance } from "./sortable";

// --- Overlay ---
export { OverlayProvider, openModal, openDrawer, openConfirm, openAlert, closeAllOverlays } from "./overlay";
export type { OverlayType, OverlayOptions, OverlayInstance } from "./overlay";

// --- Portal ---
export { createPortal, PortalManager, getPortalManager } from "./portal";
export type { PortalTarget, PortalOptions, PortalInstance } from "./portal";

// --- Focus Trap ---
export { FocusTrapManager, createFocusTrap, FocusTrapStack } from "./focus-trap";
export type { FocusTrapOptions, FocusTrapInstance } from "./focus-trap";

// --- Scroll Lock ---
export { ScrollLockManager, getScrollLockManager, lockScroll, withScrollLock, withScrollLockAsync, setupAutoResizeScrollLock } from "./scroll-lock";
export type { ScrollLockOptions, ScrollLockInstance } from "./scroll-lock";

// --- Scroll Into View ---
export { Scroller, scrollIntoView, scrollToElement } from "./scroll-into-view";
export type { ScrollAlignment, ScrollBehavior, ScrollIntoViewOptions, ScrollIntoViewInstance } from "./scroll-into-view";

// --- Smooth Scroll ---
export { SmoothScroller, createSmoothScroller, scrollToTop, scrollToBottom, scrollToY, scrollToElementCenter } from "./smooth-scroll";
export type { EasingFn, SmoothScrollOptions, SmoothScrollInstance } from "./smooth-scroll";

// --- Batch 1059: Tooltip V2, Select, Combo Box ---

export { createTooltipV2 } from "./tooltip-v2";
export type {
  TooltipV2Options,
  TooltipV2Instance,
  TooltipPlacement,
  TooltipTrigger,
} from "./tooltip-v2";

export { SelectManager, createSelect } from "./select";
export type {
  SelectOptions,
  SelectInstance,
  SelectOption,
} from "./select";

export { ComboBoxManager, createComboBox } from "./combo-box";
export type {
  ComboBoxOptions,
  ComboBoxInstance,
  ComboBoxOption,
} from "./combo-box";

// --- Batch 1060: Switch, Slider, Radio Group ---

export { createSwitch } from "./switch";
export type {
  SwitchOptions,
  SwitchInstance,
  SwitchSize,
  SwitchVariant,
} from "./switch";

export { SliderManager, createSlider } from "./slider";
export type {
  SliderOptions,
  SliderInstance,
  SliderMark,
} from "./slider";

export { createRadioGroup } from "./radio-group";
export type {
  RadioGroupOptions,
  RadioGroupInstance,
  RadioOption,
  RadioSize,
  RadioVariant,
} from "./radio-group";

// --- Batch 1061: Checkbox Group, Textarea, File Upload ---

export { createCheckboxGroup } from "./checkbox-group";
export type {
  CheckboxGroupOptions,
  CheckboxGroupInstance,
  CheckboxOption,
  CheckboxSize,
  CheckboxVariant,
} from "./checkbox-group";

export { createTextarea } from "./textarea";
export type {
  TextareaOptions,
  TextareaInstance,
  TextareaSize,
  TextareaState,
} from "./textarea";

export { FileUploadManager, createFileUpload } from "./file-upload";
export type {
  FileUploadOptions,
  FileUploadInstance,
  UploadFile,
} from "./file-upload";

// --- Batch 1062: Notification, Stepper, Form Builder ---

export { NotificationManager, getNotificationManager, toast } from "./notification";
export type {
  NotificationOptions,
  Notification,
  NotificationType,
  NotificationPosition,
} from "./notification";

export { StepperManager, createStepper } from "./stepper";
export type {
  StepperOptions,
  StepperInstance,
  StepConfig,
  StepStatus,
} from "./stepper";

export { FormBuilder, createForm, validations } from "./form-builder";
export type {
  FormSchema,
  FormField,
  FormSection,
  FormState,
  FieldError,
  FieldValidation,
  FieldType,
  SelectOption as FormSelectOption,
} from "./form-builder";

// --- Batch 1063: Split Button, Breadcrumbs, Pagination ---

export { createSplitButton } from "./splitter";
export type {
  SplitButtonOptions,
  SplitButtonInstance,
  SplitButtonItem,
  SplitButtonSize,
  SplitButtonVariant,
} from "./splitter";

export { createBreadcrumbs } from "./breadcrumbs";
export type {
  BreadcrumbOptions,
  BreadcrumbInstance,
  BreadcrumbItem,
  BreadcrumbSeparator,
} from "./breadcrumbs";

export { PaginationManager, createPagination } from "./pagination";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination";

// --- Batch 1064: Chip Input, Time Picker, Calendar View ---

export { ChipInputManager, createChipInput } from "./chip-input";
export type {
  ChipInputOptions,
  ChipInputInstance,
  ChipData,
  ChipSuggestion,
} from "./chip-input";

export { createTimePicker } from "./time-picker";
export type {
  TimePickerOptions,
  TimePickerInstance,
  TimeFormat,
  TimePickerMode,
} from "./time-picker";

export { createCalendar } from "./calendar-view";
export type {
  CalendarOptions,
  CalendarInstance,
  CalendarEvent,
  CalendarView,
  WeekStart,
} from "./calendar-view";

// --- Batch 1065: Mention, Color Swatch, Signature Pad ---

export { MentionManager, createMention } from "./mention";
export type {
  MentionOptions,
  MentionInstance,
  MentionOption,
} from "./mention";

export { ColorSwatchManager, createColorSwatch } from "./color-swatch";
export type {
  ColorSwatchOptions,
  ColorSwatchInstance,
  SwatchColor,
  ColorPalette,
} from "./color-swatch";

export { SignaturePadManager, createSignaturePad } from "./signature-pad";
export type {
  SignaturePadOptions,
  SignaturePadInstance,
  Stroke,
  StrokePoint,
} from "./signature-pad";

// --- Batch 1066: Code Editor, Markdown Preview, Rich Text ---

export { CodeEditorManager, createCodeEditor } from "./code-editor";
export type {
  CodeEditorOptions,
  CodeEditorInstance,
} from "./code-editor";

export { createMarkdownPreview } from "./markdown-preview";
export type {
  MarkdownOptions,
  MarkdownInstance,
  MarkdownHeading,
} from "./markdown-preview";

export { RichTextManager, createRichText } from "./rich-text";
export type {
  RichTextOptions,
  RichTextInstance,
  FormatCommand,
  ToolbarButton,
} from "./rich-text";

// --- Batch 1067: Tour, Empty State, Stats Card ---

export { createTour } from "./tour";
export type {
  TourOptions,
  TourInstance,
  TourStep,
} from "./tour";

export { EmptyStateManager, createEmptyState } from "./empty-state";
export type {
  EmptyStateOptions,
  EmptyStateInstance,
  EmptyStateVariant,
} from "./empty-state";

export { StatsCardManager, createStatsCard } from "./stats-card";
export type {
  StatsCardOptions,
  StatsCardInstance,
  TrendDirection,
  StatsVariant,
  SparklinePoint,
} from "./stats-card";

// --- Dropzone ---
export {
  DropzoneManager,
  createDropzone,
  type DropzoneOptions,
  type DropzoneInstance,
  type DropzoneFile,
  type FileValidationRule,
  type FileValidationError,
} from "./dropzone";

// --- Image Gallery ---
export {
  ImageGalleryManager,
  createImageGallery,
  type ImageGalleryOptions,
  type ImageGalleryInstance,
  type GalleryImage,
} from "./image-gallery";

// --- Countdown ---
export {
  CountdownManager,
  createCountdown,
  type CountdownOptions,
  type CountdownInstance,
  type CountdownSize,
  type CountdownVariant,
} from "./countdown";

// --- Kanban Board ---
export {
  createKanbanBoard,
  type KanbanBoardOptions,
  type KanbanBoardInstance,
  type KanbanCard,
  type KanbanColumn,
} from "./kanban-board";

// --- Gantt Chart ---
export {
  createGanttChart,
  type GanttChartOptions,
  type GanttChartInstance,
  type GanttTask,
} from "./gantt-chart";

// --- Timeline ---
export {
  TimelineManager,
  createTimeline,
  type TimelineOptions,
  type TimelineInstance,
  type TimelineItem,
  type TimelineItemStatus,
} from "./timeline";

// --- Tree View ---
export {
  TreeView,
  type TreeViewConfig,
  type TreeNodeData,
  type TreeNode,
  type CheckMode,
} from "./tree-view";

// --- Data Table ---
export {
  DataTableManager,
  createDataTable,
  type DataTableOptions,
  type DataTableInstance,
  type Column,
  type SortState,
  type FilterState,
} from "./data-table";

// --- Virtual Scroll ---
export {
  createVirtualScroll,
  type VirtualScrollOptions,
  type VirtualScrollInstance,
  type VirtualItem,
} from "./virtual-scroll";

// --- Accordion ---
export {
  AccordionManager,
  createAccordion,
  type AccordionOptions,
  type AccordionInstance,
  type AccordionItem,
  type AccordionMode,
} from "./accordion";

// --- Tabs ---
export {
  TabsManager,
  createTabs,
  type TabsOptions,
  type TabsInstance,
  type TabItem,
  type TabOrientation,
  type TabVariant,
} from "./tabs";

// --- Collapse ---
export {
  CollapseManager,
  createCollapse,
  createCollapseGroup,
  type CollapseOptions,
  type CollapseInstance,
  type CollapseSize,
  type CollapseVariant,
  type CollapseGroupOptions,
  type CollapseGroupInstance,
} from "./collapse";

// --- Modal ---
export {
  createModal,
  type ModalOptions,
  type ModalInstance,
  type ModalSize,
  type ModalPosition,
} from "./modal";

// --- Drawer ---
export {
  createDrawer,
  type DrawerOptions,
  type DrawerInstance,
  type DrawerSide,
  type DrawerSize,
} from "./drawer";

// --- Popover ---
export {
  PopoverManager,
  createPopover,
  type PopoverOptions,
  type PopoverInstance,
  type PopoverTrigger,
  type PopoverPlacement,
} from "./popover";

// --- Skeleton ---
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
  type SkeletonOptions,
  type SkeletonTextOptions,
  type SkeletonAvatarOptions,
  type SkeletonCardOptions,
  type SkeletonTableOptions,
} from "./skeleton";

// --- Avatar ---
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
  type AvatarOptions,
  type AvatarGroupOptions,
  type AvatarSize,
  type AvatarShape,
} from "./avatar";

// --- Badge ---
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
  type BadgeOptions,
  type BadgeVariant,
  type BadgePosition,
  type BadgeSize,
  type StatusDotOptions,
} from "./badge";

// --- Progress ---
export {
  createProgressTracker,
  createMultiProgressTracker,
  createStepProgress,
  formatProgress,
  type ProgressState,
  type ProgressCallback,
  type ProgressController,
  type MultiProgressController,
  type StepProgressController,
} from "./progress";

// --- Spinner ---
export {
  createSpinner,
  miniSpinner,
  fullPageSpinner,
  type SpinnerOptions,
  type SpinnerVariant,
  type SpinnerSize,
} from "./spinner";

// --- Toast ---
export {
  ToastManager,
  getToastManager,
  showToast,
  type ToastOptions,
  type ToastInstance,
  type ToastManagerConfig,
  type ToastType,
  type ToastPosition,
} from "./toast";

// --- Context Menu ---
export {
  ContextMenuManager,
  type ContextMenuOptions,
  type ContextMenuInstance,
  type ContextMenuItem,
  type ContextMenuPosition,
} from "./context-menu";

// --- Command Palette ---
export {
  CommandPalette,
  type CommandPaletteConfig,
  type CommandPaletteState,
  type Command,
} from "./command-palette";

// --- Quick Switcher ---
export {
  createQuickSwitcher,
  type QuickSwitcherOptions,
  type QuickSwitcherInstance,
  type SwitcherItem,
} from "./quick-switcher";

// --- Tooltip ---
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
  type TooltipOptions,
  type TooltipInstance,
  type TooltipPlacement,
  type TooltipTrigger,
} from "./tooltip";

// --- Popconfirm ---
export {
  createPopconfirm,
  type PopconfirmOptions,
  type PopconfirmInstance,
  type PopconfirmPlacement,
} from "./popconfirm";

// --- Split Button ---
export {
  SplitButtonManager,
  createSplitButton,
  type SplitButtonOptions,
  type SplitButtonInstance,
  type SplitAction,
  type SplitButtonSize,
  type SplitButtonVariant,
} from "./split-button";

// --- Breadcrumb ---
export {
  BreadcrumbManager,
  createBreadcrumb,
  type BreadcrumbOptions,
  type BreadcrumbInstance,
  type BreadcrumbItem,
} from "./breadcrumb";

// --- Pagination ---
export {
  PaginationManager,
  createPagination,
  type PaginationOptions,
  type PaginationInstance,
} from "./pagination";

// --- Chip Input ---
export {
  ChipInputManager,
  createChipInput,
  type ChipInputOptions,
  type ChipInputInstance,
  type ChipData,
  type ChipSuggestion,
} from "./chip-input";

// --- time-picker ---
export { createTimePicker } from "./time-picker";
export type { TimePickerOptions, TimePickerInstance, TimeFormat, TimePickerMode } from "./time-picker";

// --- calendar-view ---
export { createCalendarView } from "./calendar-view";
export type { CalendarViewOptions, CalendarViewInstance, CalendarEvent, CalendarViewMode, CalendarI18n } from "./calendar-view";

// --- mention ---
export { createMention, MentionManager } from "./mention";
export type { MentionOptions, MentionInstance, MentionOption } from "./mention";

// --- rating ---
export { createRating, RatingManager } from "./rating";
export type { RatingOptions, RatingInstance, StarIconType } from "./rating";

// --- slider ---
export { createSlider, SliderManager } from "./slider";
export type { SliderOptions, SliderInstance, SliderMark } from "./slider";

// --- color-picker ---
export { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, parseColor, getLuminance, getContrastRatio, getWcagLevel, getContrastingText, complementary, analogous, triadic, splitComplementary, tetradic, monochromatic, blendColors, lighten, darken, saturate, desaturate, invertColor, withOpacity, generatePaletteAdvanced } from "./color-picker";
export type { RgbColor, HslColor, Palette } from "./color-picker";

// --- switch ---
export { createSwitch } from "./switch";
export type { SwitchOptions, SwitchInstance, SwitchSize, SwitchVariant } from "./switch";

// --- checkbox ---
export { createCheckbox, createCheckboxGroup } from "./checkbox";
export type { CheckboxOptions, CheckboxInstance, CheckboxGroupOptions, CheckboxGroupInstance, CheckboxSize, CheckboxVariant, RadioOptions, RadioInstance } from "./checkbox";

// --- radio ---
export { createRadioGroup, RadioGroupManager } from "./radio";
export type { RadioGroupOptions, RadioGroupInstance, RadioOption, RadioSize, RadioVariant } from "./radio";

// --- select ---
export { createSelect, SelectManager } from "./select";
export type { SelectOptions, SelectInstance, SelectOption } from "./select";

// --- input-mask ---
export { createInputMask, InputMaskManager } from "./input-mask";
export type { MaskOptions, MaskInstance, MaskType } from "./input-mask";

// --- form ---
export { createForm } from "./form";
export type { FormOptions, FormInstance, FormField, FormGroup, FieldType, ValidationRule } from "./form";

// --- notification ---
export { NotificationManager, getNotificationManager, toast } from "./notification";
export type { Notification, NotificationOptions, NotificationType, NotificationPosition } from "./notification";

// --- empty-state ---
export { createEmptyState, EmptyStateManager } from "./empty-state";
export type { EmptyStateOptions, EmptyStateInstance, EmptyStateVariant } from "./empty-state";

// --- stat-card ---
export { createStatCard } from "./stat-card";
export type { StatCardOptions, TrendDirection, StatCardVariant } from "./stat-card";

// --- file-tree ---
export { createFileTree, FileManager } from "./file-tree";
export type { FileTreeOptions, FileTreeInstance, FileTreeNode, FileType } from "./file-tree";

// --- code-editor ---
export { createCodeEditor, CodeEditorManager } from "./code-editor";
export type { CodeEditorOptions, CodeEditorInstance } from "./code-editor";

// --- terminal ---
export { createTerminal } from "./terminal";
export type { TerminalOptions, TerminalInstance, TerminalLine, TerminalTheme, TerminalCommand } from "./terminal";

// --- markdown-preview ---
export { createMarkdownPreview } from "./markdown-preview";
export type { MarkdownOptions, MarkdownInstance, MarkdownHeading } from "./markdown-preview";

// --- diff-viewer ---
export { computeDiff, toUnifiedDiff, applyPatch, renderInlineDiffHtml, renderSideBySideDiffHtml, wordDiff, renderWordDiffHtml, getDiffStyles, textSimilarity, formatDiffStats } from "./diff-viewer";
export type { DiffResult, DiffChunk, FileDiff } from "./diff-viewer";

// --- log-viewer ---
export { createLogViewer } from "./log-viewer";
export type { LogViewerOptions, LogViewerInstance, LogEntry, LogLevel } from "./log-viewer";

// --- resizable ---
export { makeResizable, createSplitPane } from "./resizable";
export type { ResizeOptions, ResizeState, ResizableController, SplitPaneOptions, SplitPaneController } from "./resizable";

// --- drag-list ---
export { createDragList } from "./drag-list";
export type { DragListOptions, DragListInstance, DragListItem } from "./drag-list";

// --- tour ---
export { createTour } from "./tour";
export type { TourOptions, TourInstance, TourStep } from "./tour";

// --- hotkeys ---
export { HotkeyManager, createAppHotkeys, parseKeyCombo, eventMatchesCombo, formatKeyDisplay, areModifiersDown, getModifierString } from "./hotkeys";
export type { HotkeyBinding, HotkeyEvent, ParsedKeyCombo } from "./hotkeys";

// --- clipboard ---
export { copyToClipboard, copyRichToClipboard, readFromClipboard, readRichFromClipboard, isClipboardAvailable, canReadClipboard, watchClipboard } from "./clipboard";
export type { ClipboardData, ClipboardOptions } from "./clipboard";

// --- undo-redo ---
export { UndoHistory } from "./undo-redo";
export type { UndoItem, UndoBranch, UndoHistoryOptions, UndoState, UndoChangeListener } from "./undo-redo";

// --- scroll-lock ---
export { ScrollLockManager, getScrollLockManager, lockScroll, withScrollLock, withScrollLockAsync, setupAutoResizeScrollLock } from "./scroll-lock";
export type { ScrollLockOptions, ScrollLockInstance } from "./scroll-lock";

// --- measure ---
export { getRect, getSize, getPosition, getOffset, getViewport, getElementInfo, isElementVisible, isElementFullyVisible, isOverlapping, containsPoint, containsElement, findScrollParent, scrollIntoView, rectsIntersect, getIntersection, distance, getCenter, getAspectRatio, sizeSimilarity, getCurrentBreakpoint, isMinBreakpoint, isMaxBreakpoint, onBreakpointChange, observeSize, observeVisibility } from "./measure";
export type { Rect, Size, Position, Offset, ViewportInfo, ElementInfo, BreakpointName, BreakpointConfig } from "./measure";

// --- focus-trap ---
export { FocusTrapManager, createFocusTrap, FocusTrapStack } from "./focus-trap";
export type { FocusTrapOptions, FocusTrapInstance } from "./focus-trap";

// --- animate ---
export {
  Animator,
  staggerAnimate,
  scrollTrigger,
  easings,
  resolveEasing,
  type Keyframe,
  type AnimationOptions,
  type AnimationInstance,
  type StaggerOptions,
  type TimelineOptions,
} from "./animate";

// --- debounce-throttle ---
export {
  Debounced,
  Throttled,
  debounce,
  throttle,
  debouncePromise,
  rafThrottle,
  idleThrottle,
  type DebounceOptions,
  type ThrottleOptions,
  type RateLimitStats,
} from "./debounce-throttle";

// --- event-bus ---
export {
  EventBus,
  createEventBus,
  type EventCallback,
  type EventMiddleware,
  type Subscription,
  type EmittedEvent,
  type EventBusOptions,
} from "./event-bus";

// --- virtual-list ---
export {
  createVirtualList,
  type VirtualListItem,
  type VirtualListOptions,
  type VirtualListInstance,
} from "./virtual-list";

// --- tooltip ---
export {
  TooltipManager,
  getTooltipManager,
  tooltip,
  type TooltipPlacement,
  type TooltipTrigger,
  type TooltipOptions,
  type TooltipInstance,
} from "./tooltip";

// --- context-menu ---
export {
  ContextMenuManager,
  type ContextMenuItem,
  type ContextMenuPosition,
  type ContextMenuOptions,
  type ContextMenuInstance,
} from "./context-menu";

// --- modal ---
export {
  createModal,
  type ModalSize,
  type ModalPosition,
  type ModalOptions,
  type ModalInstance,
} from "./modal";

// --- popover ---
export {
  PopoverManager,
  createPopover,
  type PopoverTrigger,
  type PopoverPlacement,
  type PopoverOptions,
  type PopoverInstance,
} from "./popover";

// --- drawer ---
export {
  createDrawer,
  type DrawerSide,
  type DrawerSize,
  type DrawerOptions,
  type DrawerInstance,
} from "./drawer";

// --- carousel ---
export {
  CarouselManager,
  createCarousel,
  type CarouselSlide,
  type CarouselOptions,
  type CarouselInstance,
} from "./carousel";

// --- accordion ---
export {
  AccordionManager,
  createAccordion,
  type AccordionItem,
  type AccordionMode,
  type AccordionOptions,
  type AccordionInstance,
} from "./accordion";

// --- tabs ---
export {
  TabsManager,
  createTabs,
  type TabItem,
  type TabOrientation,
  type TabVariant,
  type TabsOptions,
  type TabsInstance,
} from "./tabs";

// --- avatar ---
export {
  createAvatar,
  createAvatarGroup,
  getInitials,
  type AvatarSize,
  type AvatarShape,
  type AvatarOptions,
  type AvatarGroupOptions,
} from "./avatar";

// --- badge ---
export {
  createBadge,
  createPositionedBadge,
  createStatusDot,
  addDotBadge,
  addCountBadge,
  type BadgeVariant,
  type BadgePosition,
  type BadgeSize,
  type BadgeOptions,
  type StatusDotOptions,
} from "./badge";

// --- skeleton ---
export {
  createSkeleton,
  createTextSkeleton,
  createHeadingSkeleton,
  createAvatarSkeleton,
  createCardSkeleton,
  createTableSkeleton,
  wrapWithSkeleton,
  type SkeletonOptions,
  type SkeletonTextOptions,
  type SkeletonAvatarOptions,
  type SkeletonCardOptions,
  type SkeletonTableOptions,
} from "./skeleton";

// --- progress ---
export {
  createProgressTracker,
  createMultiProgressTracker,
  createStepProgress,
  formatProgress,
  type ProgressState,
  type ProgressCallback,
  type ProgressController,
  type MultiProgressController,
  type StepProgressController,
} from "./progress";

// --- spinner ---
export {
  createSpinner,
  miniSpinner,
  fullPageSpinner,
  type SpinnerVariant,
  type SpinnerSize,
  type SpinnerOptions,
} from "./spinner";

// --- breadcrumb ---
export {
  BreadcrumbManager,
  createBreadcrumb,
  type BreadcrumbItem,
  type BreadcrumbOptions,
  type BreadcrumbInstance,
} from "./breadcrumb";

// --- infinite-scroll ---
export {
  InfiniteScroll,
  type InfiniteScrollItem,
  type InfiniteScrollOptions,
  type InfiniteScrollState,
} from "./infinite-scroll";

// --- command-palette ---
export {
  CommandPalette,
  type Command,
  type CommandCategory,
  type CommandPaletteConfig,
  type CommandPaletteState,
} from "./command-palette";

// --- search-highlight ---
export {
  SearchHighlightManager,
  createSearchHighlight,
  type SearchHighlightOptions,
  type SearchHighlightInstance,
} from "./search-highlight";

// --- i18n ---
export {
  t,
  getLocale,
  setLocale,
  LOCALE_CHANGE_EVENT,
  type Locale,
} from "./i18n";

// --- theme ---
export {
  ThemeManager,
  getThemeManager,
  LIGHT_THEME,
  DARK_THEME,
  BUILT_IN_THEMES,
  useTheme,
  type ThemeColors,
  type ThemeConfig,
} from "./theme";

// --- store ---
export {
  Store,
  createStore,
  createComputed,
  persistMiddleware,
  connectDevTools,
  registerStore,
  getStore,
  unregisterStore,
  type StoreApi,
  type StoreOptions,
  type PersistOptions,
  type Listener,
  type Selector,
  type Middleware,
} from "./store";

// --- http-client ---
export {
  HttpClient,
  createHttpClient,
  HttpError,
  type HttpClientConfig,
  type HttpRequestOptions,
  type HttpResponse,
  type HttpMiddleware,
} from "./http-client";

// --- websocket ---
export {
  WebSocketManager,
  WsRoomManager,
  isWebSocketSupported,
  getWebSocketUrl,
  createWebSocketUrl,
  parseWsUrl,
  type WebSocketOptions,
  type WebSocketState,
  type WebSocketStats,
  type ReconnectConfig,
  type HeartbeatConfig,
  type WsEvent,
} from "./websocket";

// --- router ---
export {
  Router,
  createRouter,
  getRouter,
  type RouteMode,
  type RouteParams,
  type QueryParams,
  type RouteDefinition,
  type RouterConfig,
  type RouteInfo,
  type NavigationResult,
} from "./router";

// --- dom-diff ---
export {
  diff,
  patch,
  syncDOM,
  renderDOM,
  domToTree,
  type DomNode,
  type PatchOp,
  type DiffOptions,
  type DiffResult,
  type PatchResult,
} from "./dom-diff";

// --- style-injector ---
export {
  injectStyle,
  injectLink,
  buildStyleSheet,
  injectStyleSheet,
  createScope,
  setCSSVars,
  getCSSVars,
  createTokenMap,
  DynamicStyleManager,
  extractCriticalCSS,
  type StyleRule,
  type StyleSheet,
  type InjectOptions,
  type StyleElement,
} from "./style-injector";

// --- css-reset ---
export {
  injectReset,
  getResetCSS,
  generateReset,
  type ResetVariant,
  type ResetOptions,
  type ResetInstance,
} from "./css-reset";

// --- string-utils ---
export {
  isBlank,
  isPresent,
  collapseWhitespace,
  stripDiacritics,
  escapeRegex,
  escapeHtmlEntities,
  unescapeHtmlEntities,
  toCamelCaseString,
  toPascalCaseString,
  toKebabCaseString,
  toSnakeCaseString,
  capitalizeWords,
  smartTruncate,
  repeatWithSeparator,
  centerPad,
  isAscii,
  looksLikeEmail,
  looksLikeUrl,
  extractNumbers,
  replaceMultiple,
  stringToId,
  countOccurrences,
  reverseWords,
  trimLines,
  detectCase,
  slugify,
  levenshtein,
  isSimilar,
  soundex,
  randomString,
  randomHex,
  generateId,
  wordCount,
  charFrequency,
  mostCommonChars,
  uniqueWords,
  pluralize,
  singularize,
  acronym,
  abbreviate,
  maskString,
  maskEmail,
  detectIndentation,
  indentText,
  simpleDiff,
  type DiffSegment,
} from "./string-utils";

// --- array-utils ---
export {
  chunkArray,
  splitAt,
  partitionArray,
  slidingWindow,
  groupConsecutive,
  deepFlatten,
  uniqueBy,
  intersectArrays,
  differenceArrays,
  symmetricDifference,
  rotateArray,
  sampleArray,
  shuffleArray,
  zipArrays,
  fillArray,
  argMin,
  argMax,
} from "./array-utils";

// --- object-utils ---
export {
  deepClone,
  shallowClone,
  pick,
  omit,
  deepMerge,
  get,
  set,
  has,
  unset,
  mapValues,
  mapKeys,
  filterEntries,
  invert,
  deepEqual,
  allKeys,
  isEmpty,
  size,
  deepFreeze,
  groupBy,
  countBy,
  indexBy,
  values,
  keys,
  toPairs,
  fromPairs,
  defaults,
  ensurePath,
} from "./object-utils";

// --- date-utils ---
export {
  formatDate,
  toISODate,
  toISODatetime,
  formatTime,
  relativeTime,
  shortRelativeTime,
  parseDate,
  formatDuration,
  parseDuration,
  isLeapYear,
  daysInMonth,
  getDayOfWeek,
  getWeekNumber,
  getQuarter,
  isSameDay,
  isToday,
  isYesterday,
  isBetween,
  addTime,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getTimezone,
  getTimezoneOffset,
  convertToTimezone,
} from "./date-utils";
export type { DateFormatOptions, RelativeTimeOptions } from "./date-utils";

// --- number-utils ---
export {
  clampNumber,
  lerpNumber,
  mapRangeNumber,
  roundTo,
  roundToMultiple,
  floorToMultiple,
  ceilToMultiple,
  formatBytesAuto,
  formatCompactNumber,
  formatWithSeparators,
  percentChange,
  approximatelyEqual,
  randomIntInRange,
  randomFloatInRange,
  normalizeAngleDeg,
  normalizeAngleRad,
  degToRad,
  radToDeg,
  gcd,
  lcm,
  isInRange,
  wrapNumber,
} from "./number-utils";

// --- color-utils ---
export {
  parseColor,
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToHsl,
  formatColor,
  lighten,
  darken,
  saturate,
  desaturate,
  rotateHue,
  setOpacity,
  mixColors,
  invertColor,
  luminance,
  contrastRatio,
  meetsAA,
  meetsAAA,
  contrastingText,
  minAlphaForContrast,
  generatePalette,
  complementaryColor,
  analogousColors,
  triadicColors,
  splitComplementaryColors,
  tetradicColors,
  linearGradientCSS,
  radialGradientCSS,
  gradientBetween,
  shimmerGradient,
  estimateColorTemperature,
  hueCategory,
  paletteToCSSVars,
  namedColors,
} from "./color-utils";

// --- validation-utils ---
export {
  isString,
  isNumber,
  isInteger,
  isFiniteNumber,
  isObject,
  isArray,
  isValidDate,
  isBoolean,
  isFunction,
  isNil,
  isNotNil,
  isEmpty,
  isMap,
  isSet,
  isPromise,
  isEmail,
  isURL,
  isUUID,
  isUUIDv4,
  isHexColor,
  isIPv4,
  isIPv6,
  isIP,
  isMACAddress,
  isCreditCard,
  detectCardBrand,
  isPhoneNumber,
  isISODate,
  isISODateTime,
  isJSON,
  matchesPattern,
  isLength,
  isArraySize,
  inRange,
  isOneOf,
  every,
  some,
  validate,
  validateAsync,
  assert,
  assertType,
} from "./validation-utils";
export { rules } from "./validation-utils";
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationRule,
  FieldSchema,
  ObjectSchema,
} from "./validation-utils";

// --- crypto-utils ---
export {
  sha1,
  sha256,
  sha384,
  sha512,
  hash,
  hashHex,
  hmac,
  hmacHex,
  pbkdf2,
  deriveAesKey,
  generateAesKey,
  aesGcmEncrypt,
  aesGcmDecrypt,
  aesGcmEncryptString,
  aesGcmDecryptString,
  generateRsaOaepKeyPair,
  rsaOaepEncrypt,
  rsaOaepDecrypt,
  generateEcdsaKeyPair,
  ecdsaSign,
  ecdsaVerify,
  generateRsaPssKeyPair,
  rsaPssSign,
  rsaPssVerify,
  exportKey as exportCryptoKey,
  importKey as importCryptoKey,
  keyFingerprint,
  generateEcdhKeyPair,
  ecdhDeriveSecret,
  ecdhDeriveAesKey,
  randomBytes,
  secureRandomInt,
  secureRandomUuid,
  secureRandomString,
  toBase64,
  fromBase64,
  toBase64Url,
  fromBase64Url,
  toHex,
  fromHex,
  encodeUtf8,
  decodeUtf8,
  estimatePasswordStrength,
  generatePassword,
  generateTokenHex,
  generateTokenBase64Url,
  generateApiKey,
  generateSessionId,
} from "./crypto-utils";
export type {
  HashAlgorithm,
  HmacAlgorithm,
  AesKeyLength,
  EcNamedCurve,
  RsaKeySize,
  KeyFormat,
  Pbkdf2Options,
  AesGcmOptions,
  RsaKeyGenOptions,
  EcdsaKeyGenOptions,
  RsaPssSignOptions,
  PasswordGeneratorOptions,
  ApiKeyOptions,
  AesGcmEncryptedData,
  PasswordStrengthResult,
} from "./crypto-utils";

// --- file-utils ---
export {
  MIME_MAP,
  getMimeType,
  getExtension,
  getBaseName,
  categorizeFile,
  isFileType,
  FILE_EXTENSIONS,
  validateFile,
  validateFiles,
  sanitizeFilename,
  uniqueFilename,
  formatBytes,
  formatFileSizeShort,
  getFileIcon,
  parseDropEvent,
  setupDropZone,
  readFileAsText,
  readFileAsDataURL,
  readFileAsArrayBuffer,
  readFileAsBinaryString,
  readFileHeader,
  splitFileIntoChunks,
  UploadTracker,
} from "./file-utils";
export type {
  FileCategory,
  FileValidationOptions,
  FileValidationError,
  DropEvent,
  FileChunk,
  UploadProgress,
} from "./file-utils";

// --- url-utils ---
export {
  parseUrl,
  buildUrlFromParts,
  updateSearchParams,
  removeSearchParams,
  getQueryParams,
  isSameOrigin,
  normalizeUrl,
  isAbsoluteUrl,
  makeAbsoluteUrl,
  getDomainFromUrl,
  getPathnameFromUrl,
  joinPathSegments,
  encodeUriComponentSafe,
  decodeUriComponentSafe,
  urlsEqual,
} from "./url-utils";
export type { ParsedUrl } from "./url-utils";

// --- storage-utils ---
export {
  StorageManager,
  createLocalStorage,
  createSessionStorage,
  createMemoryStore,
} from "./storage-utils";
export type {
  StorageBackend,
  StorageEntry,
  StorageOptions,
  StorageStats,
  StorageMigration,
} from "./storage-utils";

// --- dom-observer ---
export {
  DomObserverManager,
  takeSnapshot,
  compareSnapshots,
  createRouteChangeDetector,
  createLazyLoader,
} from "./dom-observer";
export type {
  ObserveTarget,
  MutationOptions,
  IntersectionOptions,
  ResizeOptions,
  MutationRecordEx,
  DomSnapshot,
  ObserverCallbacks,
  ObserverStats,
} from "./dom-observer";

// --- form-utils ---
export {
  createForm,
  createMultiStepForm,
  evaluateConditionals,
  serializeForm,
  populateForm,
  clearForm,
  linkErrorToField,
  unlinkErrorFromField,
  createFormAnnouncer,
} from "./form-utils";
export type {
  FormFieldConfig,
  FormValidationRule,
  FormFieldState,
  FormOptions,
  FormInstance,
  StepConfig,
  MultiStepFormOptions,
  MultiStepFormInstance,
  ConditionRule,
  ConditionalField,
} from "./form-utils";

// --- accessibility-utils ---
export {
  setAria,
  getAria,
  setRole,
  setAccessibleName,
  hideFromScreenReader,
  showToScreenReader,
  getFocusableElements,
  focusFirst,
  focusLast,
  isFocusable,
  createFocusTrap,
  setupRovingTabindex,
  announce,
  announceAssertive,
  contrastRatio,
  checkContrast,
  suggestTextColor,
  getHeadingHierarchy,
  validateHeadingHierarchy,
  findLandmarks,
  hasProperLandmarks,
  prefersReducedMotion,
  prefersHighContrast,
  prefersDarkMode,
  prefersLightMode,
  onPreferenceChange,
  createSkipLink,
  openAccessibleModal,
} from "./accessibility-utils";
export type {
  ContrastResult,
  FocusableElement,
  HeadingInfo,
  LandmarkInfo,
} from "./accessibility-utils";

// --- performance-utils ---
export {
  PerfObserver,
  measureSync,
  measureAsync,
  perfMark,
  perfMeasure,
  measureBetween,
  FPSCounter,
  getMemoryUsage,
  getMemoryPercent,
  MemoryMonitor,
  LongTaskDetector,
  getNavigationTiming,
  collectWebVitals,
  getResourceTiming,
  findSlowResources,
  CustomMetric,
} from "./performance-utils";
export type {
  TimingResult,
  MemoryUsage,
  FPSStats,
  WebVitals,
  NavigationTiming,
} from "./performance-utils";

// --- animation-utils ---
export {
  Tween,
  tween,
  tweenPromise,
  SpringAnimation,
  springTo,
  stagger,
  staggerFadeIn,
  scrollAnimate,
  parallax,
  mouseParallax,
  animate,
  fadeIn,
  fadeOut,
  slideUp,
  slideDown,
  scaleIn,
  shake,
  pulse,
} from "./animation-utils";
export { easings } from "./animation-utils";
export type {
  TweenOptions,
  SpringConfig,
  AnimationFrame,
  ScrollAnimationOptions,
  EasingName,
} from "./animation-utils";

// --- geometry-utils ---
export {
  pt,
  addPoints,
  subPoints,
  scalePoint,
  distance,
  distanceSq,
  midpoint,
  angleTo,
  lerpPoint,
  rotatePoint,
  reflectPoint,
  rect,
  rectCenter,
  rectCorners,
  pointInRect,
  rectsIntersect,
  rectIntersection,
  rectUnion,
  inflateRect,
  rectArea,
  rectPerimeter,
  rectAspectRatio,
  rectContainsRect,
  circle,
  pointInCircle,
  circlesIntersect,
  circleCircleIntersections,
  circleArea,
  circleCircumference,
  circleRectOverlap,
  pointToLineDistance,
  closestPointOnLine,
  lineSegmentIntersection,
  lineLength,
  lineBoundingBox,
  pointInPolygon,
  polygonArea as geomPolygonArea,
  polygonCentroid,
  polygonBoundingBox,
  convexHull,
  simplifyPolyline,
  aabbOverlap,
  checkCollision,
  identityTransform,
  translateTransform,
  scaleTransform,
  rotateTransform,
  composeTransforms,
  transformPoint,
  invertTransform,
  pointsToPath,
  arcPath,
  roundedRectPath,
  SpatialHash,
} from "./geometry-utils";
export type {
  Point,
  Rect,
  Circle,
  Line,
  Size,
  Transform2D,
} from "./geometry-utils";

// --- math-utils ---
export {
  mean,
  median,
  mode,
  variance,
  stddev,
  covariance,
  correlation,
  linearRegression,
  percentile,
  Vec2,
  Vec3,
  Matrix,
  dist2D,
  dist3D,
  angleBetweenPoints,
  pointInPolygon as mathPointInPolygon,
  polygonArea,
  polygonCentroid as mathPolygonCentroid,
  boundingBox,
  lineIntersection,
  lerp,
  clamp,
  mapRange,
  smoothStep,
  bezierQuad,
  bezierCubic,
  catmullRom,
  gcd,
  lcm,
  isPrime,
  sieveOfEratosthenes,
  factorial,
  fibonacci,
  fibonacciSequence,
  combinations,
  permutations,
  modPow,
  angle,
  temperature,
  length,
  weight,
  randomNormal,
  randomUniform,
  randomInt,
  randomPick,
  shuffle,
  weightedRandom,
} from "./math-utils";
export type { Vector2D, Vector3D } from "./math-utils";

// --- event-utils ---
export {
  createCustomEvent,
  dispatchCustomEvent,
  onCustomEvent,
  throttleEvent,
  debounceEvent,
  once,
  waitForEvent,
  delegateEvent,
  preventDefault,
  stopPropagation,
  stopEvent,
} from "./event-utils";

// --- css-utils ---
export {
  cssVar,
  setCssVar,
  getCssVar,
  setCssVars,
  removeCssVar,
  getAllCssVars,
  createStylesheet,
  injectCSS,
  removeInjectedCSS,
  addCSSRule,
  clearDynamicStyles,
  styleObjectToString,
  cssStringToObject,
  applyStyles,
  bem,
  createBem,
  cn,
  mergeClasses,
  BREAKPOINTS,
  mediaQuery,
  matchesMedia,
  isAtLeast,
  isBelow,
  subscribeMedia,
  subscribeBreakpoint,
  getCurrentBreakpoint,
  media,
  cssTransition,
  EASING_CSS,
  keyframes,
  ANIMATIONS,
  animateOnce,
  hexToRgb as cssHexToRgb,
  rgbToHex as cssRgbToHex,
  mixColors as cssMixColors,
  transparentize,
  lightenColor,
  darkenColor,
  parseCssColor,
  pxToRem,
  remToPx,
  ensureUnit,
  cssClamp,
  fluidFontSize,
} from "./css-utils";
export type { BreakpointName } from "./css-utils";

// --- dom-utils ---
export {
  createEl,
  div,
  span,
  p,
  btn,
  createSvg,
  $,
  $$,
  requireSelector,
  byId,
  byClass,
  byTag,
  walkUp,
  walkDown,
  nextSibling,
  prevSibling,
  siblings,
  siblingIndex,
  isLastChild,
  isFirstChild,
  empty,
  setChildren,
  insertAtIndex,
  moveToIndex,
  swapElements,
  wrap,
  unwrap,
  htmlToFragment,
  appendHtml,
  prependHtml,
  delegate as domDelegate,
  delegateClick,
  renderTemplate,
  renderInto,
} from "./dom-utils";
export type { CreateElementOptions, QueryOptions, DomDiffResult } from "./dom-utils";

// --- logger ---
export {
  Logger,
  log,
  apiLog,
  dbLog,
  extLog,
  setGlobalLogLevel,
  getGlobalLogLevel,
} from "./logger";
export type { LogLevel } from "./logger";

// --- scheduler ---
export {
  Scheduler,
  parseCronExpression,
  cronMatches,
  getNextCronRun,
} from "./scheduler";
export type { ScheduledJob, JobStatus, CronExpression } from "./scheduler";

// --- state-machine ---
export {
  FSM,
  HSM,
  createMachine,
  interpret,
  evaluateChoice,
  evaluateJunction,
  deepHistoryTarget,
  shallowHistoryTarget,
  match as matchState,
  stateEquals,
} from "./state-machine";
export type {
  StateId,
  EventId,
  MachineContext,
  EventPayload,
  GuardFn,
  ActionFn,
  StateListener,
  InvalidEventStrategy,
  TransitionTarget,
  TransitionDef,
  StateConfig,
  HistoryMode,
  MachineConfig,
  ChoiceConfig,
  JunctionConfig,
  StateValue,
  TransitionHistoryEntry,
  Service,
} from "./state-machine";

// --- pattern-utils ---
export {
  escapeRegex,
  matchAnyOf,
  repeatPattern,
  buildPattern,
  globToRegex,
  globMatch,
  multiGlobMatch,
  matchLiteral,
  matchRegex,
  sequence,
  choice,
  zeroOrMore,
  oneOrMore,
  optional,
  PATTERNS,
  testPattern,
  extractPattern,
  findAllOverlapping,
  replaceWithInfo,
  countOccurrences,
} from "./pattern-utils";
export type { MatchResult } from "./pattern-utils";

// --- text-utils ---
export {
  toTitleCase,
  toSentenceCase,
  toCamelCase,
  toKebabCase,
  toSnakeCase,
  toConstantCase,
  detectCase,
  tokenizeWords,
  tokenizeLines,
  tokenizeSentences,
  tokenizeParagraphs,
  truncate,
  truncateMiddle,
  ellipsize,
  detectIndent,
  getIndent,
  setIndent,
  dedent,
  indent,
  textDiff,
  unifiedDiff,
  levenshteinDistance,
  similarity,
  isSimilar,
  findBestMatch,
  mdBold,
  mdItalic,
  mdStrikethrough,
  mdCode,
  mdLink,
  mdImage,
  mdHeading,
  mdBlockquote,
  mdList,
  hr,
  mdCodeBlock,
  mdTable,
  pipe,
  when,
} from "./text-utils";
export type { TextDiff } from "./text-utils";

// --- encoding-utils ---
export {
  base64Encode,
  base64Decode,
  base64UrlEncode,
  base64UrlDecode,
  base64Wrap,
  base32Encode,
  base32Decode,
  base58Encode,
  base58Decode,
  hexEncode,
  hexDecode,
  isHex,
  urlEncode,
  urlDecode,
  queryStringify,
  queryParse,
  parseUrl as encParseUrl,
  normalizeUnicode,
  codePoints,
  isBMP,
  reverseUnicode,
  htmlEncode,
  htmlDecode,
  parseCSV,
  generateCSV,
  decodeBuffer,
  encodeBuffer,
  uint8ToBinaryString,
  binaryStringToUint8,
  decodeJWT,
  isJWTExpired,
  createUnsignedJWT,
  formatBytes as encFormatBytes,
  parseBytes as encParseBytes,
} from "./encoding-utils";
export type { ParsedURL, JWTPayload, DecodedJWT } from "/encoding-utils";

// --- i18n-utils ---
export {
  LOCALES,
  type LocaleCode,
  type LocaleConfig,
  type PluralRule,
  getPluralForm,
  formatLocaleNumber,
  formatCurrency,
  formatRelativeTimeLocale,
  formatList,
  detectLocale,
  TranslationDict,
} from "./i18n-utils";

// --- network-utils ---
export {
  getNetworkStatus,
  onNetworkChange,
  isSlowConnection,
  isDataSaverEnabled,
  fetchWithRetry,
  RequestQueue,
  syncWhenOnline,
  processOfflineQueue,
  BandwidthEstimator,
  ConnectionHealthChecker,
  type NetworkStatus,
  type RetryOptions,
  type RequestQueueItem,
} from "./network-utils";

// --- clipboard-utils ---
export {
  requestClipboardPermission,
  checkClipboardReadPermission,
  isClipboardSupported,
  copyToClipboard,
  copyRich,
  copyImage,
  copyFiles,
  readClipboardText,
  readClipboard,
  cutToClipboard,
  selectAll,
  selectRange,
  clearSelection,
  getSelectedText,
  getSelectionTarget,
  ClipboardHistory,
  detectClipboardFormats,
  hasImageInClipboard,
  hasFilesInClipboard,
  copyWithFeedback,
  copySelection,
  onClipboardChange,
  type ClipboardData,
  type CopyOptions,
  type PasteOptions,
  type PasteResult,
  type ClipboardHistoryEntry,
  type ClipboardHistoryOptions,
} from "./clipboard-utils";

// --- audio-utils ---
export {
  getAudioContext,
  resumeAudioContext,
  suspendAudioContext,
  closeAudioContext,
  getAudioContextState,
  setupAutoResume,
  createAnalyser,
  getFrequencyData,
  getFloatFrequencyData,
  getWaveformData,
  binToFrequency,
  getDominantFrequency,
  detectBeat,
  resetBeatDetection,
  createGainNode,
  setVolume,
  fadeIn,
  fadeOut,
  createEQ,
  createCompressor,
  createReverb,
  createDelay,
  createDistortion,
  buildEffectsChain,
  AudioRecorder,
  blobToWav,
  audioBufferToWav,
  AudioPlayer,
  crossfade,
  generateFrequencyBars,
  generateWaveformPoints,
  generateAnalysisSnapshot,
  analyzeVolume,
  VolumeAnalyzer,
  detectSilenceInBuffer,
  formatTime,
  formatTimeWithMs,
  dbToLinear,
  linearToDb,
  samplesToDuration,
  durationToSamples,
  midiToFreq,
  freqToMidi,
  createTone,
  downloadBlob,
  isWebAudioSupported,
  isRecordingSupported,
  requestMicrophonePermission,
  type EQBand,
  type CompressorOptions,
  type ReverbOptions,
  type DelayOptions,
  type DistortionOptions,
  type RecordingOptions,
  type CrossfadeOptions,
  type LoopPoints,
  type PlaybackState,
  type BeatDetectionResult,
  type VolumeAnalysis,
  type FrequencyBarData,
  type WaveformData,
  type AudioAnalysisSnapshot,
} from "./audio-utils";

// --- video-utils ---
export {
  enumerateVideoDevices,
  getCameraStream,
  getScreenCaptureStream,
  switchCamera,
  checkCameraPermission,
  VideoRecorder,
  extractFrame,
  extractFrames,
  generateThumbnailGrid,
  captureSnapshotFromStream,
  VideoController,
  applyVideoFilter,
  VIDEO_FILTERS,
  mirrorVideo,
  rotateVideoFrame,
  resizeVideoFrame,
  cropVideoFrame,
  getStreamResolution,
  isStreamActive,
  stopStream,
  cloneStream,
  mixStreamsSideBySide,
  stopMixedStream,
  detectVideoFormat,
  isVideoMimeType,
  formatVideoDuration,
  estimateFileSize,
  estimateOptimalBitrate,
  type VideoConstraints,
  type RecordingConfig,
  type ThumbnailOptions,
  type FrameExtractResult,
  type VideoDeviceInfo,
  type StreamStats,
  type PlaybackState as VideoPlaybackState,
} from "./video-utils";

// --- canvas-utils ---
export {
  createCanvas,
  createOffscreenCanvas,
  getContext2D,
  resizeCanvas,
  clearCanvas,
  clearRect,
  applyDrawOptions,
  resetDrawOptions,
  drawRect,
  drawRoundedRect,
  drawCircle,
  drawEllipse,
  drawPolygon,
  drawStar,
  drawLine,
  drawPolyline,
  drawArrow,
  createLinearGradient,
  createRadialGradient,
  createConicGradient,
  GRADIENT_PRESETS,
  applyTextOptions,
  drawText,
  drawWrappedText,
  measureText,
  getTextBounds,
  drawImage,
  drawImageCover,
  drawImageContain,
  loadImage,
  canvasToBlob,
  canvasToDataURL,
  downloadCanvas,
  getPixelData,
  setPixelData,
  getPixel,
  setPixel,
  applyPixelFilter,
  applyImageFilters,
  withSavedContext,
  atPosition,
  atScale,
  rotateAround,
  flipHorizontal,
  flipVertical,
  LayerManager,
  drawCheckerboard,
  drawGrid,
  drawDots,
  drawStripes,
  pointInRect,
  pointInCircle,
  hexToRgb,
  rgbToHex,
  parseColor,
  generateCanvasId,
  type Point2D,
  type Size2D,
  type Rect2D,
  type ColorStop,
  type CanvasLayer,
  type DrawOptions,
  type TextDrawOptions,
  type ImageFilterOptions,
  type PixelData,
} from "./canvas-utils";

// --- gesture-utils ---
export {
  GestureRecognizer,
  detectSwipe,
  distance,
  angleBetween,
  midpoint,
  getDirection,
  isInsideRect,
  isInsideElement,
  createTapDebounce,
  type Point,
  type SwipeGesture,
  type PinchGesture,
  type RotateGesture,
  type TapGesture,
  type LongPressGesture,
  type PanGesture,
  type Gesture,
  type GestureConfig,
  type GestureHandlers,
} from "./gesture-utils";

// --- keyboard-utils ---
export {
  KEY_ALIASES,
  resolveKey,
  normalizeKeyEvent,
  eventMatchesBinding,
  HotkeyManager,
  KeySequenceDetector,
  RovingTabIndex,
  formatHotkey,
  parseHotkeyString,
  isTypingInInput,
  type KeyBinding,
  type KeySequence,
  type NormalizedKeyEvent,
  type KeyboardState,
  type NavigationConfig,
  type ModifierKey,
} from "./keyboard-utils";

// --- pointer-utils ---
export {
  extractPointerData,
  extractMouseData,
  extractTouchData,
  isPointerEventsSupported,
  isTouchDevice,
  isPrecisionInput,
  getPrimaryInputType,
  PointerTracker,
  capturePointer,
  releasePointerCapture,
  hasPointerCapture,
  clientToLocal,
  localToClient,
  transformCoordinates,
  getPageScrollOffset,
  pageToViewport,
  viewportToPage,
  createPointerRegion,
  hitTestRegions,
  hitTestTopmost,
  setCursor,
  hideCursor,
  requestPointerLock,
  exitPointerLock,
  isPointerLocked,
  getPointerLockMovement,
  type PointerData,
  type PointerEventInfo,
  type PointerTrackerConfig,
  type PointerRegion,
} from "./pointer-utils";

// --- animation-frame-utils ---
export {
  linear,
  easeInQuad, easeOutQuad, easeInOutQuad,
  easeInCubic, easeOutCubic, easeInOutCubic,
  easeInQuart, easeOutQuart, easeInOutQuart,
  easeInExpo, easeOutExpo, easeInOutExpo,
  easeInSine, easeOutSine, easeInOutSine,
  easeInCirc, easeOutCirc, easeInOutCirc,
  easeInElastic, easeOutElastic, easeInOutElastic,
  easeInBack, easeOutBack, easeInOutBack,
  easeInBounce, easeOutBounce, easeInOutBounce,
  EASING_FUNCTIONS,
  getEasing,
  TweenEngine,
  animateSpring,
  AnimationLoop,
  lerp,
  lerpColor,
  lerpPoint,
  clamp as animClamp,
  mapRange,
  tweenValue,
  type EasingFunction,
  type TweenOptions,
  type SpringOptions,
  type AnimationFrame,
  type LoopCallbacks,
} from "./animation-frame-utils";

// --- drag-utils ---
export {
  makeDraggable,
  DropZoneManager,
  createSortable,
  type DragData,
  type DragOptions,
  type DropZone,
  type SortableConfig,
} from "./drag-utils";

// --- resize-utils ---
export {
  EnhancedResizeObserver,
  BreakpointTracker,
  DEFAULT_BREAKPOINTS,
  ViewportTracker,
  createResizeHandle,
  isResizeObserverSupported,
  getElementSize,
  hasOverflow,
  matchMedia,
  onMediaChange,
  clamp as resizeClamp,
  type ResizeEntry,
  type ResizeObserverConfig,
  type Breakpoint,
  type ViewportState,
  type ResizeHandleOptions,
} from "./resize-utils";

// --- virtual-scroll-utils ---
export {
  VirtualScroller,
  DynamicHeightEstimator,
  VirtualGridScroller,
  type VirtualItem,
  type VirtualScrollConfig,
  type VisibleRange,
  type ScrollToOptions,
  type VirtualGridConfig,
  type GridVisibleRange,
} from "./virtual-scroll-utils";

// --- infinite-list-utils ---
export {
  InfiniteList,
  createSentinelLoader,
  type FetchPageOptions,
  type FetchResult,
  type InfiniteListConfig,
  type InfiniteListState,
} from "./infinite-list-utils";

// --- scroll-into-view-utils ---
export {
  scrollToElement,
  animateScroll,
  getElementVisibility,
  getElementVisibilityInContainer,
  ScrollProgressTracker,
  ScrollSpy,
  getScrollContainer,
  scrollToTop,
  scrollToBottom,
  preventBodyScroll,
  type ScrollIntoViewOptions,
  type VisibilityResult,
  type ScrollProgress,
  type ScrollSpyConfig,
} from "./scroll-into-view-utils";

// --- notification-utils ---
export {
  NotificationManager,
  type NotificationType,
  type NotificationPosition,
  type NotificationOptions,
  type NotificationInstance,
  type NotificationManagerConfig,
} from "./notification-utils";

// --- tooltip-utils ---
export {
  createTooltip,
  type TooltipPlacement,
  type TooltipTrigger,
  type TooltipOptions,
  type TooltipInstance,
} from "./tooltip-utils";

// --- modal-utils ---
export {
  createModal,
  createFocusTrap,
  type ModalSize,
  type ModalOptions,
  type ModalInstance,
  type FocusTrapConfig,
} from "./modal-utils";

// --- form-validation-utils ---
export {
  FormValidator,
  required,
  minLength,
  maxLength,
  pattern,
  min,
  max,
  oneOf,
  noneOf,
  email as emailValidator,
  url as urlValidator,
  custom,
  matchesField,
  differsFrom,
  asyncValidator,
  type ValidatorFn,
  type FieldRule,
  type FormValidationConfig,
  type FormState,
  type ValidationError,
  type ValidationResult,
} from "./form-validation-utils";

// --- schema-validation-utils ---
export {
  validateSchema,
  checkType,
  objectSchema,
  arraySchema,
  strProp,
  numProp,
  type SchemaDefinition,
  type SchemaProperty,
  type SchemaValidationResult,
  type SchemaValidationError,
  type SchemaType,
} from "./schema-validation-utils";

// --- data-transform-utils ---
export {
  get,
  set,
  has,
  unset,
  parsePath,
  pick,
  omit,
  renameKey,
  deepClone,
  deepMerge,
  mapArray,
  filterArray,
  findArray,
  groupBy,
  countBy,
  sortBy,
  uniq,
  partition,
  flatten,
  chunk,
  zip,
  reverse,
  sample,
  shuffle,
  values as objValues,
  keys as objKeys,
  fromEntries,
  mapKeys,
  mapValues,
  filterEntries,
  invert,
} from "./data-transform-utils";

// --- theme-utils ---
export {
  ThemeManager,
  generateDesignTokens,
  generateDarkTokens,
  createLightDarkTheme,
  getSystemColorScheme,
  onSystemColorSchemeChange,
  prefersReducedMotion,
  prefersHighContrast,
  prefersLightColor,
  type ThemeMode,
  type DesignToken,
  type ThemeDefinition,
  type ThemeManagerConfig,
} from "./theme-utils";

// --- i18n-provider-utils ---
export {
  I18nProvider,
  type TranslationEntry,
  type LocaleData,
  type I18nConfig,
} from "./i18n-provider-utils";

// --- locale-detection-utils ---
export {
  parseLocaleTag,
  buildLocaleTag,
  LOCALE_DB,
  RTL_LANGUAGES,
  detectBrowserLocale,
  detectBrowserLocales,
  negotiateLocale,
  getBestLocale,
  isRTLLocale,
  getLocaleInfo,
  getLanguageCode,
  guessTerritory,
  detectScript,
  type LocaleInfo,
  type LocaleMatchResult,
} from "./locale-detection-utils";

// --- accessibility-utils ---
export {
  setAria,
  getAria,
  setRole,
  setAccessibleName,
  hideFromScreenReader,
  showToScreenReader,
  getFocusableElements,
  focusFirst,
  focusLast,
  isFocusable,
  createFocusTrap as createA11yFocusTrap,
  setupRovingTabindex,
  announce,
  announceAssertive,
  contrastRatio,
  checkContrast,
  suggestTextColor,
  getHeadingHierarchy,
  validateHeadingHierarchy,
  findLandmarks,
  hasProperLandmarks,
  prefersReducedMotion as a11yPrefersReducedMotion,
  prefersHighContrast as a11yPrefersHighContrast,
  prefersDarkMode,
  prefersLightMode,
  onPreferenceChange,
  createSkipLink,
  openAccessibleModal,
  type ContrastResult,
  type FocusableElement,
  type HeadingInfo,
  type LandmarkInfo,
} from "./accessibility-utils";

// --- a11y-announcer-utils ---
export {
  A11yAnnouncer,
  getGlobalAnnouncer,
  destroyGlobalAnnouncer,
  announce as srAnnounce,
  announceAssertive as srAnnounceAssertive,
  announcePolite as srAnnouncePolite,
  isVisuallyHidden,
  isValidLiveRegion,
  type AnnouncementPriority,
  type Announcement,
  type AnnouncerConfig,
  type AnnouncerState,
} from "./a11y-announcer-utils";

// --- focus-trap-utils ---
export {
  FocusTrap,
  FocusTrapStack,
  createFocusTrap as createAdvancedFocusTrap,
  getTabbableElements,
  type AutoFocusStrategy,
  type FocusTrapConfig,
  type FocusTrapState,
  type FocusableInfo,
} from "./focus-trap-utils";

// --- scroll-lock-utils ---
export {
  lockScroll,
  unlockAllScroll,
  getActiveLockCount,
  isScrollLocked,
  getScrollbarWidth,
  clearScrollbarCache,
  saveScrollPosition,
  restoreScrollPosition,
  lockScrollIOS,
  type ScrollLockOptions,
  type ScrollLockInstance,
} from "./scroll-lock-utils";

// --- body-scroll-lock-utils ---
export {
  lockBodyScroll,
  isBodyScrollLocked,
  getBodyScrollLockCount,
  forceUnlockAll,
  type BodyScrollLockOptions,
} from "./body-scroll-lock-utils";

// --- overlay-utils ---
export {
  createOverlay,
  getNextZIndex,
  resetZIndexCounter,
  type OverlayPlacement,
  type OverlayAnimation,
  type OverlayOptions,
  type OverlayInstance,
} from "./overlay-utils";

// --- popover-utils ---
export {
  createPopover,
  type PopoverPlacement,
  type PopoverTrigger,
  type VirtualElement,
  type PopoverOptions,
  type PopoverInstance,
} from "./popover-utils";

// --- dropdown-utils ---
export {
  createDropdown,
  type DropdownItem,
  type DropdownOptions,
  type DropdownInstance,
} from "./dropdown-utils";

// --- context-menu-utils ---
export {
  createContextMenu,
  type ContextMenuItem,
  type ContextMenuContext,
  type ContextMenuOptions,
  type ContextMenuInstance,
} from "./context-menu-utils";

// --- sheet-utils ---
export {
  createSheet,
  type SheetSide,
  type SheetSize,
  type SheetOptions,
  type SheetInstance,
} from "./sheet-utils";

// --- drawer-utils ---
export {
  createDrawer,
  type DrawerSide,
  type DrawerSize,
  type DrawerOptions,
  type DrawerInstance,
} from "./drawer-utils";

// --- offcanvas-utils ---
export {
  createOffCanvas,
  type OffCanvasSide,
  type OffCanvasMode,
  type OffCanvasOptions,
  type OffCanvasInstance,
} from "./offcanvas-utils";

// --- split-view-utils ---
export {
  createSplitView,
  type SplitDirection,
  type SplitPaneConfig,
  type SplitViewOptions,
  type SplitViewInstance,
} from "./split-view-utils";

// --- resizable-utils ---
export {
  createResizable,
  type ResizeEdge,
  type ResizableOptions,
  type ResizableInstance,
} from "./resizable-utils";

// --- panel-utils ---
export {
  createPanel,
  type PanelState,
  type PanelDockPosition,
  type PanelOptions,
  type PanelInstance,
} from "./panel-utils";

// --- tabs-utils ---
export {
  createTabs,
  type TabOrientation,
  type TabActivation,
  type TabItem,
  type TabsOptions,
  type TabsInstance,
} from "./tabs-utils";

// --- accordion-utils ---
export {
  createAccordion,
  type AccordionMode,
  type AccordionItem,
  type AccordionOptions,
  type AccordionInstance,
} from "./accordion-utils";

// --- collapse-utils ---
export {
  createCollapse,
  type CollapseOptions,
  type CollapseInstance,
} from "./collapse-utils";

// --- breadcrumb-utils ---
export {
  createBreadcrumb,
  type BreadcrumbItem,
  type BreadcrumbOptions,
  type BreadcrumbInstance,
} from "./breadcrumb-utils";

// --- pagination-utils ---
export {
  createPagination,
  type PaginationSize,
  type PaginationLayout,
  type PaginationOptions,
  type PaginationInstance,
} from "./pagination-utils";

// --- stepper-utils ---
export {
  createStepper,
  type StepperOrientation,
  type StepStatus,
  type StepItem,
  type StepperOptions,
  type StepperInstance,
} from "./stepper-utils";

// --- avatar-utils ---
export {
  createAvatar,
  createAvatarGroup,
  generateAvatarColor,
  getInitials,
  type AvatarSize,
  type AvatarShape,
  type AvatarOptions,
  type AvatarGroupOptions,
} from "./avatar-utils";

// --- badge-utils ---
export {
  createBadge,
  createDotBadge,
  createTag,
  type BadgeVariant,
  type BadgeSize,
  type DotPosition,
  type BadgeOptions,
  type DotBadgeOptions,
  type TagOptions,
} from "./badge-utils";

// --- chip-utils ---
export {
  createChipGroup,
  createInputChip,
  type ChipVariant,
  type ChipSize,
  type ChipItem,
  type ChipGroupOptions,
  type ChipGroupInstance,
  type InputChipOptions,
} from "./chip-utils";

// --- skeleton-utils ---
export {
  createSkeleton,
  createSkeletonBlock,
  createCardSkeleton,
  createTableSkeleton,
  type SkeletonVariant,
  type SkeletonSize,
  type SkeletonOptions,
  type SkeletonBlockOptions,
} from "./skeleton-utils";

// --- empty-state-utils ---
export {
  createEmptyState,
  type EmptyStateType,
  type EmptyStateOptions,
} from "./empty-state-utils";

// --- spinner-utils ---
export {
  createSpinner,
  type SpinnerType,
  type SpinnerSize,
  type SpinnerOptions,
  type SpinnerInstance,
} from "./spinner-utils";

// --- progress-utils ---
export {
  createProgressBar,
  updateProgressBar,
  createCircularProgress,
  createStepProgress,
  type ProgressBarVariant,
  type ProgressBarSize,
  type ProgressBarOptions,
  type CircularProgressOptions,
  type StepProgressOptions,
} from "./progress-utils";

// --- rating-utils ---
export {
  createRating,
  type RatingIconType,
  type RatingOptions,
  type RatingInstance,
} from "./rating-utils";

// --- toggle-utils ---
export {
  createToggleSwitch,
  createSegmentedControl,
  createToggleButtonGroup,
  type ToggleSize,
  type ToggleVariant,
  type ToggleSwitchOptions,
  type SegmentedControlOptions,
  type ToggleButtonGroupOptions,
} from "./toggle-utils";

// --- alert-utils ---
export {
  createAlert,
  type AlertVariant,
  type AlertSize,
  type AlertOptions,
  type AlertInstance,
} from "./alert-utils";

// --- toast-utils ---
export {
  createToastManager,
  getToastManager,
  destroyToastManager,
  showToast,
  type ToastPosition,
  type ToastType,
  type ToastOptions,
  type ToastManagerConfig,
  type ToastManagerInstance,
} from "./toast-utils";

// --- confirm-dialog-utils ---
export {
  createConfirmDialog,
  type ConfirmDialogVariant,
  type ConfirmButtonConfig,
  type ConfirmDialogOptions,
  type ConfirmDialogInstance,
} from "./confirm-dialog-utils";
// --- list-utils ---
export { createList } from "./list-utils";
export type { ListItem, ListOptions, ListInstance } from "./list-utils";

// --- card-utils ---
export { createCard } from "./card-utils";
export type { CardOptions, CardImageOptions, CardActionConfig, CardVariant, CardSize } from "./card-utils";

// --- table-utils ---
export { createTable } from "./table-utils";
export type { TableOptions, TableInstance, TableColumn, TableRow, TableSize, TableVariant } from "./table-utils";
// --- form-utils ---
export { createForm, serializeForm, populateForm, clearForm, createMultiStepForm, evaluateConditionals, linkErrorToField, unlinkErrorFromField, createFormAnnouncer } from "./form-utils";
export type { FormOptions, FormInstance, FormFieldConfig, FormFieldState, FormValidationRule, StepConfig, MultiStepFormOptions, MultiStepFormInstance, ConditionalField, ConditionRule } from "./form-utils";

// --- input-utils ---
export { createInput, createSearchInput, createPasswordInput, createNumberInput } from "./input-utils";
export type { InputOptions, InputInstance, SearchInputOptions, SearchInputInstance, PasswordInputOptions, PasswordInputInstance, NumberInputOptions, NumberInputInstance, InputSize, InputVariant, InputState } from "./input-utils";

// --- select-utils ---
export { createSelect } from "./select-utils";
export type { SelectOptions, SelectInstance, SelectOption, SelectGroup, SelectSize, SelectVariant } from "./select-utils";
// --- textarea-utils ---
export { createTextarea } from "./textarea-utils";
export type { TextareaOptions, TextareaInstance, TextareaSize, TextareaVariant } from "./textarea-utils";

// --- checkbox-utils ---
export { createCheckbox, createCheckboxGroup } from "./checkbox-utils";
export type { CheckboxOptions, CheckboxInstance, CheckboxGroupOptions, CheckboxGroupInstance, CheckboxOption, CheckboxSize, CheckboxVariant } from "./checkbox-utils";

// --- radio-utils ---
export { createRadioGroup } from "./radio-utils";
export type { RadioGroupOptions, RadioInstance, RadioOption, RadioSize, RadioVariant } from "./radio-utils";
// --- switch-utils ---
export { createSwitch } from "./switch-utils";
export type { SwitchOptions, SwitchInstance, SwitchSize, SwitchVariant } from "./switch-utils";

// --- slider-utils ---
export { createSlider } from "./slider-utils";
export type { SliderOptions, SliderInstance, SliderSize, SliderVariant } from "./slider-utils";

// --- color-picker-utils ---
export { createColorPicker, parseColor, hslToRgb, rgbToHsl, rgbToHex, formatColor } from "./color-picker-utils";
export type { ColorPickerOptions, ColorPickerInstance, ColorValue, ColorFormat, ColorPreset } from "./color-picker-utils";
// --- date-picker-utils ---
export { createDatePicker } from "./date-picker-utils";
export type { DatePickerOptions, DatePickerInstance, DatePickerSize, DatePickerVariant } from "./date-picker-utils";

// --- time-picker-utils ---
export { createTimePicker } from "./time-picker-utils";
export type { TimePickerOptions, TimePickerInstance, TimeValue, TimeFormat, TimePickerSize } from "./time-picker-utils";

// --- datetime-utils ---
export { formatDate, parseDate, getRelativeTime, addDate, subDate, diffDates, isSameDay, isToday, isBetween, startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth, daysInMonth, isLeapYear, getWeekNumber, getQuarter, msToDuration, formatDuration, formatTimeElapsed, formatTime, formatTime12h, generateCalendarMonth, getDayName, getMonthName } from "./datetime-utils";
export type { Duration, DateUnit, DateFormatOptions } from "./datetime-utils";
// --- tooltip-utils ---
export { createTooltip } from "./tooltip-utils";
export type { TooltipOptions, TooltipInstance, TooltipPlacement, TooltipTrigger } from "./tooltip-utils";

// --- popover-tooltip-utils ---
export { createPopoverTooltip } from "./popover-tooltip-utils";
export type { PopoverTooltipOptions, PopoverTooltipInstance, PopoverTooltipContent, PopoverTooltipPlacement, PopoverTooltipTrigger } from "./popover-tooltip-utils";

// --- hover-card-utils ---
export { createHoverCard } from "./hover-card-utils";
export type { HoverCardOptions, HoverCardInstance, HoverCardContent, HoverCardAvatar, HoverCardMeta, HoverCardAction, HoverCardSide, HoverCardAnimation } from "./hover-card-utils";
// --- skeleton-loader-utils ---
export { createSkeletonBlock, createSkeletonText, createSkeletonAvatar, createSkeletonImage, createSkeletonCard, createSkeletonTable, createSkeletonList, injectSkeletonStyles } from "./skeleton-loader-utils";
export type { SkeletonBlockOptions, SkeletonTextOptions, SkeletonAvatarOptions, SkeletonImageOptions, SkeletonCardOptions, SkeletonTableOptions, SkeletonListOptions, SkeletonVariant, SkeletonAnimation } from "./skeleton-loader-utils";

// --- shimmer-utils ---
export { createShimmer, shimmerOnce, createShimmerText } from "./shimmer-utils";
export type { ShimmerOptions, ShimmerInstance, ShimmerDirection, ShimmerSpeed } from "./shimmer-utils";

// --- loading-overlay-utils ---
export { createLoadingOverlay } from "./loading-overlay-utils";
export type { LoadingOverlayOptions, LoadingOverlayInstance, OverlayVariant, SpinnerType } from "./loading-overlay-utils";
// --- infinite-scroll-utils ---
export { createInfiniteScroll } from "./infinite-scroll-utils";
export type { InfiniteScrollOptions, InfiniteScrollInstance } from "./infinite-scroll-utils";

// --- pull-to-refresh-utils ---
export { createPullToRefresh } from "./pull-to-refresh-utils";
export type { PullToRefreshOptions, PullToRefreshInstance, PullState } from "./pull-to-refresh-utils";

// --- virtual-scroller-utils ---
export { createVirtualScroller } from "./virtual-scroller-utils";
export type { VirtualScrollerOptions, VirtualScrollerInstance, VirtualItem } from "./virtual-scroller-utils";
// --- drag-drop-utils ---
export { createDraggable, createDropZone, createSortable } from "./drag-drop-utils";
export type { DraggableOptions, DraggableInstance, DropZoneOptions, DropZoneInstance, SortableOptions, SortableInstance, DragData, DragEvent, DragAxis, DragConstraint } from "./drag-drop-utils";

// --- sortable-utils ---
export { createSortableList } from "./sortable-utils";
export type { SortableListOptions, SortableListInstance, SortableItemConfig, SortAnimation } from "./sortable-utils";

// --- resizable-utils (pre-existing) ---
export { createResizable } from "./resizable-utils";
export type { ResizableOptions, ResizableInstance, ResizeEdge } from "./resizable-utils";
// --- anchor-utils ---
export { createAnchor } from "./anchor-utils";
export type { AnchorOptions, AnchorInstance, AnchorResult, AnchorPlacement, AnchorAlignment } from "./anchor-utils";

// --- portal-utils ---
export { createPortal, createPortalManager } from "./portal-utils";
export type { PortalOptions, PortalInstance, PortalManagerConfig, PortalManagerInstance } from "./portal-utils";

// --- overlay-manager-utils ---
export { createOverlayManager } from "./overlay-manager-utils";
export type { OverlayManagerOptions, OverlayManagerInstance, OverlayEntry, OverlayPriority, OverlayState } from "./overlay-manager-utils";
// --- Batch 1136: Clipboard, Context Menu, Notification ---
export {
  requestClipboardPermission,
  checkClipboardReadPermission,
  isClipboardSupported,
  copyToClipboard,
  copyRich,
  copyImage,
  copyFiles,
  readClipboardText,
  readClipboard,
  cutToClipboard,
  selectAll,
  selectRange,
  clearSelection,
  getSelectedText,
  getSelectionTarget,
  ClipboardHistory,
  detectClipboardFormats,
  hasImageInClipboard,
  hasFilesInClipboard,
  copyWithFeedback,
  copySelection,
  onClipboardChange,
} from "./clipboard-utils";
export type {
  ClipboardData,
  CopyOptions,
  PasteOptions,
  PasteResult,
  ClipboardHistoryEntry,
  ClipboardHistoryOptions,
} from "./clipboard-utils";

export { createContextMenu } from "./context-menu-utils";
export type {
  ContextMenuItem,
  ContextMenuContext,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu-utils";

export { NotificationManager } from "./notification-utils";
export type {
  NotificationType,
  NotificationPosition,
  NotificationOptions,
  NotificationInstance,
  NotificationManagerConfig,
} from "./notification-utils";
// --- Batch 1137: Dialog, Modal, Alert ---
export {
  createDialog,
  confirmDialog,
  alertDialog,
  promptDialog,
  dangerDialog,
  createDialogManager,
} from "./dialog-utils";
export type {
  DialogType,
  DialogOptions,
  DialogResult,
  DialogInstance,
  DialogManagerConfig,
  DialogManagerInstance,
} from "./dialog-utils";

export { createModal, createFocusTrap } from "./modal-utils";
export type {
  ModalSize,
  ModalOptions,
  ModalInstance,
  FocusTrapConfig,
} from "./modal-utils";

export { createAlert } from "./alert-utils";
export type {
  AlertVariant,
  AlertSize,
  AlertOptions,
  AlertInstance,
} from "./alert-utils";
// --- Batch 1138: Drawer, Sheet, Sidebar ---
export { createDrawer } from "./drawer-utils";
export type {
  DrawerSide,
  DrawerSize,
  DrawerOptions,
  DrawerInstance,
} from "./drawer-utils";

export { createSheet } from "./sheet-utils";
export type {
  SheetSide,
  SheetSize,
  SheetOptions,
  SheetInstance,
} from "./sheet-utils";

export { createSidebar } from "./sidebar-utils";
export type {
  SidebarPosition,
  SidebarVariant,
  SidebarCollapseMode,
  SidebarItem,
  SidebarSection,
  SidebarOptions,
  SidebarInstance,
} from "./sidebar-utils";
// --- Batch 1139: Breadcrumb, Tabs, Stepper ---
export { createBreadcrumb } from "./breadcrumb-utils";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb-utils";

export { createTabs } from "./tabs-utils";
export type {
  TabOrientation,
  TabActivation,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs-utils";

export { createStepper } from "./stepper-utils";
export type {
  StepperOrientation,
  StepStatus,
  StepItem,
  StepperOptions,
  StepperInstance,
} from "./stepper-utils";
// --- Batch 1140: Pagination, Progress, Skeleton ---
export { createPagination } from "./pagination-utils";
export type {
  PaginationSize,
  PaginationLayout,
  PaginationOptions,
  PaginationInstance,
} from "./pagination-utils";

export { createProgressBar, updateProgressBar, createCircularProgress, createStepProgress } from "./progress-utils";
export type {
  ProgressBarVariant,
  ProgressBarSize,
  ProgressBarOptions,
  CircularProgressOptions,
  StepProgressOptions,
} from "./progress-utils";

export { createSkeleton, createSkeletonBlock, createCardSkeleton, createTableSkeleton } from "./skeleton-utils";
export type {
  SkeletonVariant,
  SkeletonSize,
  SkeletonOptions,
  SkeletonBlockOptions,
} from "./skeleton-utils";
// --- Batch 1141: Empty State, Avatar, Badge ---
export { createEmptyState } from "./empty-state-utils";
export type {
  EmptyStateType,
  EmptyStateOptions,
} from "./empty-state-utils";

export { createAvatar, createAvatarGroup, generateAvatarColor, getInitials } from "./avatar-utils";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar-utils";

export { createBadge, createDotBadge, createTag } from "./badge-utils";
export type {
  BadgeVariant,
  BadgeSize,
  DotPosition,
  BadgeOptions,
  DotBadgeOptions,
  TagOptions,
} from "./badge-utils";
// --- Batch 1142: Chip, Tag Input, Rating ---
export { createChip, createChipSet } from "./chip-utils";
export type {
  ChipType,
  ChipSize,
  ChipColor,
  ChipConfig,
  ChipSetOptions,
  ChipSetInstance,
} from "./chip-utils";

export { createChipGroup, createInputChip } from "./tag-input-utils";
export type {
  ChipVariant,
  ChipItem,
  ChipGroupOptions,
  ChipGroupInstance,
  InputChipOptions,
} from "./tag-input-utils";

export { createRating } from "./rating-utils";
export type {
  RatingIconType,
  RatingOptions,
  RatingInstance,
} from "./rating-utils";
// --- Batch 1143: Toggle, Switch Group, Button Group ---
export { createToggleButton, createIconToggle, createPressHoldToggle, createLoadingToggle } from "./toggle-utils";
export type {
  ToggleSize,
  ToggleVariant,
  ToggleButtonOptions,
  IconToggleOptions,
  PressHoldToggleOptions,
  LoadingToggleOptions,
} from "./toggle-utils";

export { createSwitchGroup } from "./switch-group-utils";
export type {
  SwitchGroupLayout,
  SwitchItemConfig,
  SwitchGroupOptions,
  SwitchGroupInstance,
} from "./switch-group-utils";

export { createToggleSwitch, createSegmentedControl, createToggleButtonGroup } from "./button-group-utils";
export type {
  ToggleSwitchOptions,
  SegmentedControlOptions,
  ToggleButtonGroupOptions,
} from "./button-group-utils";
// --- Batch 1144: Accordion, Collapse, Expansion Panel ---
export { createAccordion } from "./accordion-utils";
export type {
  AccordionMode,
  AccordionItem,
  AccordionOptions,
  AccordionInstance,
} from "./accordion-utils";

export { createCollapse } from "./collapse-utils";
export type {
  CollapseOptions,
  CollapseInstance,
} from "./collapse-utils";

export { createExpansionPanel } from "./expansion-panel-utils";
export type {
  PanelVariant,
  PanelSize,
  ExpansionPanelOptions,
  ExpansionPanelInstance,
} from "./expansion-panel-utils";
// --- Batch 1145: Divider, Spacer, Stack ---
export { createDivider, createHr, createVr, createDividerGroup } from "./divider-utils";
export type {
  DividerOrientation,
  DividerVariant,
  DividerLabelPosition,
  DividerOptions,
  DividerGroupOptions,
} from "./divider-utils";

export { createSpacer, vSpacer, hSpacer, lineBreak, createSpacerStack } from "./spacer-utils";
export type {
  SpacerSize,
  SpacerOptions,
  SpacerStackOptions,
} from "./spacer-utils";

export { createStack, VStack, HStack, CenterStack, BetweenStack, EvenStack } from "./stack-utils";
export type {
  StackDirection,
  StackAlign,
  StackJustify,
  StackSize,
  StackOptions,
  StackInstance,
} from "./stack-utils";
// --- Batch 1146: Tooltip Anchor, Popover, Dropdown ---
export { createTooltipAnchor } from "./tooltip-anchor-utils";
export type {
  TooltipPlacement,
  TooltipStrategy,
  AnchorOptions,
  AnchorInstance,
} from "./tooltip-anchor-utils";

export { createPopover } from "./popover-utils";
export type {
  PopoverPlacement,
  PopoverTrigger,
  VirtualElement,
  PopoverOptions,
  PopoverInstance,
} from "./popover-utils";

export { createDropdown } from "./dropdown-utils";
export type {
  DropdownItem,
  DropdownOptions,
  DropdownInstance,
} from "./dropdown-utils";

// --- Batch 1147: Carousel, Timeline, Stat ---
export {
  createCarousel,
  type CarouselSlide,
  type CarouselOptions,
  type CarouselInstance,
  type CarouselTransition,
  type CarouselNavStyle,
} from "./carousel-utils";
export {
  createTimeline,
  type TimelineNode,
  type TimelineOptions,
  type TimelineInstance,
  type TimelineVariant,
  type TimelineSide,
} from "./timeline-utils";
export {
  createStat,
  createStatCard,
  createSparkline,
  type StatOptions,
  type StatCardOptions,
  type StatTrend,
  type StatSize,
  type StatFormat,
} from "./stat-utils";

// --- Batch 1148: Chart, Marquee, Countdown ---
export {
  calculateAxisScale,
  formatAxisLabel,
  valueToPixel,
  pixelToValue,
  aggregateByInterval,
  movingAverage,
  calculatePercentChanges,
  findExtrema,
  generateChartColors,
  interpolateColor,
  getDataStats,
  type DataPoint,
  type DataSeries,
  type ChartConfig,
  type AxisScale,
  type ColorPaletteName,
  type DataStats,
} from "./chart-utils";
export {
  createMarquee,
  type MarqueeOptions,
  type MarqueeInstance,
  type MarqueeDirection,
  type MarqueeFillMode,
} from "./marquee-utils";
export {
  createCountdown,
  type CountdownOptions,
  type CountdownInstance,
  type CountdownRemaining,
  type CountdownUnit,
  type CountdownStyle,
  type CountdownSize,
} from "./countdown-utils";

// --- Batch 1149: Confetti, Typing Indicator, Ripple ---
export {
  createConfetti,
  type ConfettiOptions,
  type ConfettiInstance,
  type Particle,
  type ConfettiShape,
  type ConfettiOrigin,
} from "./confetti-utils";
export {
  createTypingIndicator,
  createTextReveal,
  type TypingIndicatorOptions,
  type TextRevealOptions,
  type TextRevealInstance,
  type TypingStyle,
  type TypingSize,
} from "./typing-indicator-utils";
export {
  createRipple,
  type RippleOptions,
  type RippleInstance,
  type RippleColor,
  type RippleStrategy,
} from "./ripple-utils";

// --- Batch 1150: Color, Mask, Highlight ---
export {
  parseColor,
  requireColor,
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToHsl,
  toHexString,
  toRgbString,
  toHslString,
  lighten,
  darken,
  saturate,
  desaturate,
  rotateHue,
  setOpacity,
  mix,
  invert,
  luminance,
  contrastRatio,
  meetsAA,
  meetsAAA,
  contrastingText,
  minAlphaForContrast,
  generatePalette,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  generateScheme,
  linearGradient,
  radialGradient,
  gradientBetween,
  shimmerGradient,
  colorTemperature,
  isWarmColor,
  hueCategory,
  cssVariablesFromPalette,
  generateDesignTokens,
  type RGB,
  type HSL,
  type HSV,
  type ColorStop,
  type ColorPalette,
} from "./color-utils";
export {
  createMask,
  type MaskOptions,
  type MaskInstance,
  type MaskType,
} from "./mask-utils";
export {
  createHighlight,
  createSyntaxHighlight,
  createDiffHighlight,
  type HighlightOptions,
  type HighlightInstance,
  type HighlightRange,
  type SyntaxHighlightOptions,
  type DiffHighlightOptions,
  type SyntaxRule,
} from "./highlight-utils";

// --- Batch 1151: Scroll, Resize, Intersection ---
export {
  getScrollPosition,
  setScrollPosition,
  scrollTo,
  scrollToElement,
  scrollToTop,
  scrollToBottom,
  trackScroll,
  createScrollSpy,
  createInfiniteScroll,
  createParallax,
  lockScroll,
  createProgressBar,
  isAtTop,
  isAtBottom,
  getScrollPercent,
  type ScrollPosition,
  type ScrollSpyOptions,
  type InfiniteScrollOptions,
  type ParallaxOptions,
  type ScrollLockOptions,
} from "./scroll-utils";
export {
  EnhancedResizeObserver,
  BreakpointTracker,
  ViewportTracker,
  createResizeHandle,
  clamp,
  isResizeObserverSupported,
  getElementSize,
  hasOverflow,
  matchMedia,
  onMediaChange,
  type ResizeEntry,
  type ResizeObserverConfig,
  type Breakpoint,
  type ViewportState,
  type ResizeHandleOptions,
} from "./resize-utils";
export {
  EnhancedIntersectionObserver,
  createVisibilityTracker,
  createLazyLoad,
  createScrollTrigger,
  isInViewport,
  getViewportVisibility,
  whenInViewport,
  batchScrollTriggers,
  type IntersectionEntry,
  type ObserverConfig,
  type VisibilityInstance,
  type LazyLoadOptions,
  type ScrollTriggerOptions,
} from "./intersection-utils";

// --- Batch 1152: Gesture, Drag, Swipe ---
export {
  GestureRecognizer,
  distance,
  angleBetween,
  midpoint,
  getDirection,
  isInsideRect,
  isInsideElement,
  createTapDebounce,
  detectSwipe,
  type Point,
  type SwipeGesture,
  type PinchGesture,
  type RotateGesture,
  type TapGesture,
  type LongPressGesture,
  type PanGesture,
  type Gesture,
  type GestureConfig,
  type GestureHandlers,
} from "./gesture-utils";
export {
  makeDraggable,
  DropZoneManager,
  createSortable,
  type DragData,
  type DragOptions,
  type DropZone,
  type SortableConfig,
} from "./drag-utils";
export {
  createSwipeDetector,
  createSwipeToDismiss,
  createSwipeableCards,
  type SwipeConfig,
  type SwipeHandlers,
  type SwipeData,
  type SwipeDirection,
  type SwipeEdge,
  type SwipeToDismissOptions,
  type SwipeToDismissInstance,
  type SwipeableCardOptions,
} from "./swipe-utils";

// --- Batch 1153: Form, Validation, Field ---
export {
  createForm,
  serializeForm,
  populateForm,
  clearForm,
  createMultiStepForm,
  evaluateConditionals,
  linkErrorToField,
  unlinkErrorFromField,
  createFormAnnouncer,
  type FormFieldConfig,
  type FormValidationRule,
  type FormFieldState,
  type FormOptions,
  type FormInstance,
  type StepConfig,
  type MultiStepFormOptions,
  type MultiStepFormInstance,
  type ConditionRule,
  type ConditionalField,
} from "./form-utils";
export {
  isString,
  isNumber,
  isInteger,
  isFiniteNumber,
  isObject,
  isArray,
  isValidDate,
  isBoolean,
  isFunction,
  isNil,
  isNotNil,
  isEmpty,
  isMap,
  isSet,
  isPromise,
  isEmail,
  isURL,
  isUUID,
  isUUIDv4,
  isHexColor,
  isIPv4,
  isIPv6,
  isIP,
  isMACAddress,
  isCreditCard,
  detectCardBrand,
  isPhoneNumber,
  isISODate,
  isISODateTime,
  isJSON,
  matchesPattern,
  isLength,
  isArraySize,
  inRange,
  isOneOf,
  every,
  some,
  validate,
  validateAsync,
  rules,
  assert,
  assertType,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type ValidationRule,
  type FieldSchema,
  type ObjectSchema,
} from "./validation-utils";
export {
  createField,
  createFieldGroup,
  type FieldOptions,
  type FieldInstance,
  type FieldVariant,
  type FieldSize,
  type FieldState,
  type FieldGroupOptions,
} from "./field-utils";

// --- Batch 1154: i18n, A11y, Theme ---
export {
  LOCALES,
  getPluralForm,
  formatLocaleNumber,
  formatCurrency,
  formatRelativeTimeLocale,
  formatList,
  detectLocale,
  TranslationDict,
  type LocaleConfig,
  type LocaleCode,
  type PluralRule,
} from "./i18n-utils";
export {
  getFocusableElements,
  createFocusTrap,
  focusElement,
  setTabOrder,
  announce,
  createLiveRegion,
  prefersReducedMotion,
  onReducedMotionChange,
  getSafeDuration,
  setAria,
  removeAria,
  srOnlyHide,
  srOnlyShow,
  setupDialog,
  contrastRatio,
  suggestForegroundColor,
  createSkipLink,
  type A11yFocusableElements,
  type ContrastResult,
} from "./a11y-utils";
export {
  getSystemColorScheme,
  onSystemColorSchemeChange,
  prefersReducedMotion as prefersReducedMotionA11y,
  prefersHighContrast,
  prefersLightColor,
  ThemeManager,
  generateDesignTokens,
  generateDarkTokens,
  createLightDarkTheme,
  type ThemeMode,
  type DesignToken,
  type ThemeDefinition,
  type ThemeManagerConfig,
} from "./theme-utils";

// --- Batch 1155: Storage, Cache, State ---
export {
  StorageManager,
  createLocalStorage,
  createSessionStorage,
  createMemoryStore,
  type StorageBackend,
  type StorageEntry,
  type StorageOptions,
  type StorageStats,
  type StorageMigration,
} from "./storage-utils";
export {
  LRUCache,
  AsyncLRUCache,
  createTimedCache,
  type CacheEntry,
  type CacheOptions,
  type AsyncCacheOptions,
} from "./cache-utils";
export {
  createState,
  createDerived,
  createMachine,
  diffState,
  statesEqual,
  type StateContainerOptions,
  type StateContainer,
  type MachineConfig,
  type MachineInstance,
  type MachineTransition,
} from "./state-utils";
// --- Event Bus Utilities ---
export {
  EventBus,
  getEventBus,
  destroyGlobalBus,
} from "./event-bus-utils";
export type {
  EventKey,
  EventHandler,
  EventMiddleware,
  Subscription,
  EventBusOptions,
} from "./event-bus-utils";

// --- Scheduler Utilities ---
export {
  debounce,
  throttle,
  rafLoop,
  scheduleIdle,
  RateLimiter,
  createScheduler,
} from "./scheduler-utils";
export type {
  ScheduledJob,
  SchedulerInstance,
} from "./scheduler-utils";

// --- Worker Utilities ---
export {
  createInlineWorker,
  createInlineModuleWorker,
  WorkerChannel,
  WorkerPool,
  isWorkerAvailable,
  isWorkerContext,
  getWorkerConcurrency,
} from "./worker-utils";
export type {
  WorkerMessage,
  WorkerResponse,
  WorkerPoolOptions,
  PooledTask,
} from "./worker-utils";
// --- DOM Utilities ---
export {
  createEl,
  div,
  span,
  p,
  btn,
  createSvg,
  $,
  $$,
  requireSelector,
  byId,
  byClass,
  byTag,
  walkUp,
  walkDown,
  nextSibling,
  prevSibling,
  siblings,
  siblingIndex,
  isLastChild,
  isFirstChild,
  empty,
  setChildren,
  insertAtIndex,
  moveToIndex,
  swapElements,
  wrap,
  unwrap,
  htmlToFragment,
  appendHtml,
  prependHtml,
  delegate,
  delegateClick,
  renderTemplate,
  renderInto,
} from "./dom-utils";
export type {
  CreateElementOptions,
  QueryOptions,
  DomDiffResult,
} from "./dom-utils";

// --- Animation Utilities ---
export {
  Tween,
  tween,
  tweenPromise,
  SpringAnimation,
  springTo,
  stagger,
  staggerFadeIn,
  scrollAnimate,
  parallax,
  mouseParallax,
  animate,
  fadeIn,
  fadeOut,
  slideUp,
  slideDown,
  scaleIn,
  shake,
  pulse,
  easings,
} from "./animation-utils";
export type {
  TweenOptions,
  SpringConfig,
  AnimationFrame,
  ScrollAnimationOptions,
  EasingName,
} from "./animation-utils";

// --- HTTP Utilities ---
export {
  HttpClient,
  createHttpClient,
  quickGet,
  quickPost,
  jsonp,
  buildQueryString,
  parseQueryString,
  getCurrentQueryParams,
} from "./http-utils";
export type {
  HttpRequestConfig,
  HttpResponse,
  HttpError,
  InterceptorContext,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  HttpClientOptions,
} from "./http-utils";
// --- Math Utilities ---
export {
  mean,
  median,
  mode,
  variance,
  stddev,
  covariance,
  correlation,
  linearRegression,
  percentile,
  Vec2,
  Vec3,
  Matrix,
  dist2D,
  dist3D,
  angleBetweenPoints,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  boundingBox,
  lineIntersection,
  lerp,
  clamp,
  mapRange,
  smoothStep,
  bezierQuad,
  bezierCubic,
  catmullRom,
  gcd,
  lcm,
  isPrime,
  sieveOfEratosthenes,
  factorial,
  fibonacci,
  fibonacciSequence,
  combinations,
  permutations,
  modPow,
  angle,
  temperature,
  length as lengthUnits,
  weight,
  randomNormal,
  randomUniform,
  randomInt,
  randomPick,
  shuffle,
  weightedRandom,
} from "./math-utils";
export type { Vector2D, Vector3D } from "./math-utils";

// --- String Utilities ---
export {
  isBlank,
  isPresent,
  collapseWhitespace,
  stripDiacritics,
  escapeRegex,
  escapeHtmlEntities,
  unescapeHtmlEntities,
  toCamelCaseString,
  toPascalCaseString,
  toKebabCaseString,
  toSnakeCaseString,
  capitalizeWords,
  smartTruncate,
  repeatWithSeparator,
  centerPad,
  isAscii,
  looksLikeEmail,
  looksLikeUrl,
  extractNumbers,
  replaceMultiple,
  stringToId,
  countOccurrences,
  reverseWords,
  trimLines,
  detectCase,
  slugify,
  levenshtein,
  isSimilar,
  soundex,
  randomString,
  randomHex,
  generateId,
  wordCount,
  charFrequency,
  mostCommonChars,
  uniqueWords,
  pluralize,
  singularize,
  acronym,
  abbreviate,
  maskString,
  maskEmail,
  detectIndentation,
  indentText,
  simpleDiff,
} from "./string-utils";
export type { DiffSegment } from "./string-utils";

// --- Date Utilities ---
export {
  formatDate,
  toISODate,
  toISODatetime,
  formatTime,
  relativeTime,
  shortRelativeTime,
  parseDate,
  formatDuration,
  parseDuration,
  isLeapYear,
  daysInMonth,
  getDayOfWeek,
  getWeekNumber,
  getQuarter,
  isSameDay,
  isToday,
  isYesterday,
  isBetween,
  addTime,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getTimezone,
  getTimezoneOffset,
  convertToTimezone,
} from "./date-utils";
export type {
  DateFormatOptions,
  RelativeTimeOptions,
} from "./date-utils";
// --- Array Utilities ---
export {
  chunkArray,
  splitAt,
  partitionArray,
  slidingWindow,
  groupConsecutive,
  deepFlatten,
  uniqueBy,
  intersectArrays,
  differenceArrays,
  symmetricDifference,
  rotateArray,
  sampleArray,
  shuffleArray,
  zipArrays,
  fillArray,
  argMin,
  argMax,
} from "./array-utils";

// --- Object Utilities ---
export {
  deepClone,
  shallowClone,
  pick,
  omit,
  deepMerge,
  get,
  set,
  has,
  unset,
  mapValues,
  mapKeys,
  filterEntries,
  invert,
  deepEqual,
  allKeys,
  isEmpty as isObjEmpty,
  size as objSize,
  deepFreeze,
  groupBy,
  countBy,
  indexBy,
  values as objValues,
  keys as objKeys,
  toPairs,
  fromPairs,
  defaults,
  ensurePath,
} from "./object-utils";

// --- Function Utilities ---
export {
  memoize,
  memoizeOne,
  once,
  compose,
  pipe,
  curry,
  partial,
  partialRight,
  retry,
  withTimeout,
  timeoutSync,
  promisify,
  ary,
  unary,
  noop,
  constant,
  identity,
  K,
  flip,
  not as notFn,
  guard,
  spread,
  gather,
  tap,
  thru,
  time,
  timeAsync,
} from "./function-utils";
export type { RetryOptions } from "./function-utils";
// --- Crypto Utilities ---
export {
  sha1,
  sha256,
  sha384,
  sha512,
  hash,
  hashHex,
  hmac,
  hmacHex,
  pbkdf2,
  deriveAesKey,
  generateAesKey,
  aesGcmEncrypt,
  aesGcmDecrypt,
  aesGcmEncryptString,
  aesGcmDecryptString,
  generateRsaOaepKeyPair,
  rsaOaepEncrypt,
  rsaOaepDecrypt,
  generateEcdsaKeyPair,
  ecdsaSign,
  ecdsaVerify,
  generateRsaPssKeyPair,
  rsaPssSign,
  rsaPssVerify,
  exportKey as exportCryptoKey,
  importKey as importCryptoKey,
  keyFingerprint,
  generateEcdhKeyPair,
  ecdhDeriveSecret,
  ecdhDeriveAesKey,
  randomBytes,
  secureRandomInt,
  secureRandomUuid,
  secureRandomString,
  toBase64,
  fromBase64,
  toBase64Url,
  fromBase64Url,
  toHex,
  fromHex,
  encodeUtf8,
  decodeUtf8,
  estimatePasswordStrength,
  generatePassword,
  generateTokenHex,
  generateTokenBase64Url,
  generateApiKey,
  generateSessionId,
} from "./crypto-utils";
export type {
  HashAlgorithm,
  HmacAlgorithm,
  AesKeyLength,
  EcNamedCurve,
  RsaKeySize,
  KeyFormat,
  Pbkdf2Options,
  AesGcmOptions,
  RsaKeyGenOptions,
  EcdsaKeyGenOptions,
  RsaPssSignOptions,
  PasswordStrengthResult,
  PasswordGeneratorOptions,
  ApiKeyOptions,
  AesGcmEncryptedData,
} from "./crypto-utils";

// --- Encoding Utilities ---
export {
  base64Encode,
  base64Decode,
  base64UrlEncode,
  base64UrlDecode,
  base64Wrap,
  base32Encode,
  base32Decode,
  base58Encode,
  base58Decode,
  hexEncode,
  hexDecode,
  isHex,
  urlEncode,
  urlDecode,
  queryStringify,
  queryParse,
  normalizeUnicode,
  codePoints,
  isBMP,
  reverseUnicode,
  htmlEncode,
  htmlDecode,
  parseCSV,
  generateCSV,
  decodeBuffer,
  encodeBuffer,
  uint8ToBinaryString,
  binaryStringToUint8,
  decodeJWT,
  isJWTExpired,
  createUnsignedJWT,
  formatBytes,
  parseBytes,
} from "./encoding-utils";
export type { JWTPayload, DecodedJWT } from "./encoding-utils";

// --- URL Utilities ---
export {
  parseUrl as parseUrlFull,
  buildUrlFromParts,
  updateSearchParams,
  removeSearchParams,
  getQueryParams as getUrlQueryParams,
  isSameOrigin,
  normalizeUrl,
  isAbsoluteUrl,
  makeAbsoluteUrl,
  getDomainFromUrl,
  getPathnameFromUrl,
  joinPathSegments,
  encodeUriComponentSafe,
  decodeUriComponentSafe,
  urlsEqual,
} from "./url-utils";
export type { ParsedUrl as ParsedUrlType } from "./url-utils";
// --- Logger Utilities ---
export {
  Logger,
  getLogger,
  destroyLogger,
  createModuleLogger,
  PerfTracker,
  textFormatter,
  jsonFormatter,
  compactFormatter,
} from "./logger-utils";
export type { LogEntry, LogLevel, LogTransport, LogFormatter, LoggerOptions } from "./logger-utils";

// --- Notification Utilities ---
export {
  NotificationManager,
} from "./notification-utils";
export type {
  NotificationType,
  NotificationPosition,
  NotificationOptions,
  NotificationInstance,
  NotificationManagerConfig,
} from "./notification-utils";

// --- Clipboard Utilities ---
export {
  requestClipboardPermission,
  checkClipboardReadPermission,
  isClipboardSupported,
  copyToClipboard,
  copyRich,
  copyImage,
  copyFiles,
  readClipboardText,
  readClipboard,
  cutToClipboard,
  selectAll,
  selectRange,
  clearSelection,
  getSelectedText,
  getSelectionTarget,
  ClipboardHistory,
  detectClipboardFormats,
  hasImageInClipboard,
  hasFilesInClipboard,
  copyWithFeedback,
  copySelection,
  onClipboardChange,
} from "./clipboard-utils";
export type {
  ClipboardData,
  CopyOptions,
  PasteOptions,
  PasteResult,
  ClipboardHistoryEntry,
  ClipboardHistoryOptions,
} from "./clipboard-utils";
// --- Keyboard Utilities ---
export {
  HotkeyManager,
  KeySequenceDetector,
  RovingTabIndex,
  resolveKey,
  normalizeKeyEvent,
  eventMatchesBinding,
  formatHotkey,
  parseHotkeyString,
  isTypingInInput,
} from "./keyboard-utils";
export type {
  KeyBinding,
  KeySequence,
  NormalizedKeyEvent,
  KeyboardState,
  NavigationConfig,
  ModifierKey,
} from "./keyboard-utils";
export { KEY_ALIASES } from "./keyboard-utils";

// --- Mouse Utilities ---
export {
  trackMouse,
  trackMouseState,
  setupClicks,
  setupHoverDetection,
  createMouseTrail,
  extractPositionFromEvent,
  isInsideElement,
  getElementAtPosition,
  isMouseDown,
  mouseDistance,
} from "./mouse-utils";
export type { MousePosition, MouseState, ClickOptions, HoverOptions, TrailOptions } from "./mouse-utils";

// --- Pointer Utilities ---
export {
  extractPointerData,
  extractMouseData,
  extractTouchData,
  isPointerEventsSupported,
  isTouchDevice,
  isPrecisionInput,
  getPrimaryInputType,
  PointerTracker,
  capturePointer,
  releasePointerCapture,
  hasPointerCapture,
  clientToLocal,
  localToClient,
  transformCoordinates,
  getPageScrollOffset,
  pageToViewport,
  viewportToPage,
  createPointerRegion,
  hitTestRegions,
  hitTestTopmost,
  setCursor,
  hideCursor,
  requestPointerLock,
  exitPointerLock,
  isPointerLocked,
  getPointerLockMovement,
} from "./pointer-utils";
export type { PointerData, PointerEventInfo, PointerTrackerConfig, PointerRegion } from "./pointer-utils";
// --- File Utilities ---
export {
  getMimeType,
  getExtension,
  getBaseName,
  categorizeFile,
  isFileType,
  validateFile,
  validateFiles,
  sanitizeFilename,
  uniqueFilename,
  formatBytes as formatFileSizeBytes,
  formatFileSizeShort,
  getFileIcon,
  parseDropEvent,
  setupDropZone,
  readFileAsText,
  readFileAsDataURL,
  readFileAsArrayBuffer,
  readFileAsBinaryString,
  readFileHeader,
  splitFileIntoChunks,
  UploadTracker,
} from "./file-utils";
export type { FileCategory, FileValidationOptions, FileValidationError, DropEvent, FileChunk, UploadProgress } from "./file-utils";
export { MIME_MAP, FILE_EXTENSIONS } from "./file-utils";

// --- Image Utilities ---
export {
  getImageDimensions,
  loadImage,
  imageToCanvas,
  resizeImage,
  cropImage,
  applyFilters,
  convertFormat,
  generateThumbnail,
  compressImage,
  getDominantColor,
  getAverageColor,
  createCollage,
  addWatermark,
  detectOrientation,
  getAspectRatio,
  fileToDataUrl,
  fileToArrayBuffer,
  downloadImage,
  isValidImageType,
  getExifOrientation,
} from "./image-utils";
export type { ImageDimensions, ImageProcessingOptions, CropRegion, FilterOptions } from "./image-utils";

// --- CSS Utilities ---
export {
  cssVar,
  setCssVar,
  getCssVar,
  setCssVars,
  removeCssVar,
  getAllCssVars,
  createStylesheet,
  injectCSS,
  removeInjectedCSS,
  addCSSRule,
  clearDynamicStyles,
  styleObjectToString,
  cssStringToObject,
  applyStyles,
  bem,
  createBem,
  cn,
  mergeClasses,
  mediaQuery,
  matchesMedia,
  isAtLeast,
  isBelow,
  subscribeMedia,
  subscribeBreakpoint,
  getCurrentBreakpoint,
  media,
  cssTransition,
  EASING_CSS,
  keyframes,
  ANIMATIONS,
  animateOnce,
  hexToRgb,
  rgbToHex,
  mixColors,
  transparentize,
  lightenColor,
  darkenColor,
  parseCssColor,
  pxToRem,
  remToPx,
  ensureUnit,
  cssClamp,
  fluidFontSize,
} from "./css-utils";
export type { BreakpointName } from "./css-utils";
// --- dom-observer-utils ---
export {
  observeMutations,
  observeOnce,
  createDebouncedObserver,
  watchAttributes,
  watchChildren,
  watchTextContent,
  watchSize,
  watchVisibility,
  whenVisible,
  isInViewport,
} from "./dom-observer-utils.js";
export type { MutationRecord as DomObserverMutationRecord, MutationSummary, SizeChange } from "./dom-observer-utils.js";

// --- performance-utils ---
export {
  PerfObserver,
  measureSync,
  measureAsync,
  perfMark,
  perfMeasure,
  measureBetween,
  FPSCounter,
  getMemoryUsage,
  getMemoryPercent,
  MemoryMonitor,
  LongTaskDetector,
  getNavigationTiming,
  collectWebVitals,
  getResourceTiming,
  findSlowResources,
  CustomMetric,
} from "./performance-utils.js";
export type { TimingResult, MemoryUsage, FPSStats, WebVitals, NavigationTiming } from "./performance-utils.js";

// --- permission-utils ---
export {
  isPermissionsAPIAvailable,
  queryPermission,
  queryPermissions,
  requestPermission,
  PermissionManager,
  PermissionDeniedError,
  checkCapabilities,
  hasCapability,
  getCapabilitiesByCategory,
  isMobile,
  isTouchDevice,
  isInIframe,
  isSecureContextPage,
  getBrowserInfo,
  prefersDarkMode,
  prefersReducedMotion,
  prefersHighContrast,
  watchMediaPreference,
} from "./permission-utils.js";
export type {
  PermissionName,
  PermissionState,
  PermissionResult,
  CapabilityCheck,
} from "./permission-utils.js";
// --- validator-utils ---
export {
  required,
  minLength,
  maxLength,
  minValue,
  maxValue,
  matches,
  isEmail,
  isUrl,
  oneOf,
  custom,
  when,
  SchemaValidator,
  validateField,
  isValid,
  firstError,
  usernameRules,
  passwordRules,
  phoneRules,
  creditCardRules,
  ipRules,
  formatValidationErrors,
  groupErrorsByField,
  errorMessages,
  createDebouncedValidator,
  combineAsyncValidators,
} from "./validator-utils.js";
export type {
  ValidationError,
  ValidationResult,
  ValidationRule,
  ValidationContext,
  FieldSchema,
  SchemaDefinition,
} from "./validator-utils.js";

// --- form-utils ---
export {
  createForm,
  serializeForm,
  populateForm,
  clearForm,
  createMultiStepForm,
  evaluateConditionals,
  linkErrorToField,
  unlinkErrorFromField,
  createFormAnnouncer,
} from "./form-utils.js";
export type {
  FormFieldConfig,
  FormValidationRule,
  FormFieldState,
  FormOptions,
  FormInstance,
  StepConfig,
  MultiStepFormOptions,
  MultiStepFormInstance,
  ConditionRule,
  ConditionalField,
} from "./form-utils.js";

// --- accessibility-utils ---
export {
  setAria,
  getAria,
  setRole,
  setAccessibleName,
  hideFromScreenReader,
  showToScreenReader,
  getFocusableElements,
  focusFirst,
  focusLast,
  isFocusable,
  createFocusTrap,
  setupRovingTabindex,
  announce,
  announceAssertive,
  contrastRatio,
  checkContrast,
  suggestTextColor,
  getHeadingHierarchy,
  validateHeadingHierarchy,
  findLandmarks,
  hasProperLandmarks,
  prefersReducedMotion,
  prefersHighContrast,
  prefersDarkMode,
  prefersLightMode,
  onPreferenceChange,
  createSkipLink,
  openAccessibleModal,
} from "./accessibility-utils.js";
export type {
  ContrastResult,
  FocusableElement,
  HeadingInfo,
  LandmarkInfo,
} from "./accessibility-utils.js";
// --- storage-utils ---
export {
  StorageManager,
  createLocalStorage,
  createSessionStorage,
  createMemoryStore,
} from "./storage-utils.js";
export type {
  StorageBackend,
  StorageEntry as StorageEntryType,
  StorageOptions,
  StorageStats,
  StorageMigration,
} from "./storage-utils.js";

// --- state-utils ---
export {
  createState,
  createDerived,
  createMachine,
  diffState,
  statesEqual,
} from "./state-utils.js";
export type {
  StateListener,
  StateContainerOptions,
  StateContainer,
  MachineState,
  MachineEvent,
  MachineTransition,
  MachineConfig,
  MachineInstance,
} from "./state-utils.js";

// --- event-utils ---
export {
  createCustomEvent,
  dispatchCustomEvent,
  onCustomEvent,
  throttleEvent,
  debounceEvent,
  once,
  waitForEvent,
  delegateEvent,
  preventDefault,
  stopPropagation,
  stopEvent,
} from "./event-utils.js";
// --- virtual-scroller-utils ---
export { createVirtualScroller } from "./virtual-scroller-utils.js";
export type {
  VirtualItem,
  VirtualScrollerOptions,
  VirtualScrollerInstance,
} from "./virtual-scroller-utils.js";

// --- drag-drop-utils ---
export {
  createDraggable,
  createSortable,
} from "./drag-drop-utils.js";
export type {
  DragAxis,
  DragConstraint,
  DragData,
  DropZoneOptions,
  DraggableOptions,
  SortableOptions,
  DragEvent,
  DraggableInstance,
  DropZoneInstance,
  SortableInstance,
} from "./drag-drop-utils.js";

// --- context-menu-utils ---
export { createContextMenu } from "./context-menu-utils.js";
export type {
  ContextMenuItem,
  ContextMenuContext,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu-utils.js";
// --- tooltip-utils ---
export { createTooltip } from "./tooltip-utils.js";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip-utils.js";

// --- popover-utils ---
export { createPopover } from "./popover-utils.js";
export type {
  PopoverPlacement,
  PopoverTrigger,
  VirtualElement,
  PopoverOptions,
  PopoverInstance,
} from "./popover-utils.js";

// --- modal-utils ---
export { createModal, createFocusTrap } from "./modal-utils.js";
export type {
  ModalSize,
  ModalOptions,
  ModalInstance,
  FocusTrapConfig,
} from "./modal-utils.js";
// --- overlay-utils ---
export {
  createOverlay,
  getNextZIndex,
  resetZIndexCounter,
} from "./overlay-utils.js";
export type {
  OverlayPlacement,
  OverlayAnimation,
  OverlayOptions,
  OverlayInstance,
} from "./overlay-utils.js";

// --- notification-toast-utils ---
export {
  createToastManager,
  toast,
  toastSuccess,
  toastError,
  toastWarning,
  destroyGlobalToaster,
} from "./notification-toast-utils.js";
export type {
  ToastType,
  ToastPosition,
  ToastOptions,
  ToastInstance,
  ToastManagerOptions,
} from "./notification-toast-utils.js";

// --- skeleton-utils ---
export {
  createSkeleton,
  createSkeletonBlock,
  createCardSkeleton,
  createTableSkeleton,
} from "./skeleton-utils.js";
export type {
  SkeletonVariant,
  SkeletonSize,
  SkeletonOptions,
  SkeletonBlockOptions,
} from "./skeleton-utils.js";
// --- infinite-scroll-utils ---
export { createInfiniteScroll } from "./infinite-scroll-utils.js";
export type {
  InfiniteScrollOptions,
  InfiniteScrollInstance,
} from "./infinite-scroll-utils.js";

// --- pagination-utils ---
export { createPagination } from "./pagination-utils.js";
export type {
  PaginationSize,
  PaginationLayout,
  PaginationOptions,
  PaginationInstance,
} from "./pagination-utils.js";

// --- filter-utils ---
export {
  applyCriteria,
  getFieldValue,
  filterItems,
  createFilterManager,
  fuzzyScore,
  fuzzySearch,
  bindFilterInput,
} from "./filter-utils.js";
export type {
  FilterCriteria,
  FilterOperator,
  FilterState,
  FilterResult,
  FilterManagerOptions,
} from "./filter-utils.js";
// --- sort-utils ---
export {
  defaultCompare,
  naturalCompare,
  caseInsensitiveCompare,
  dateAwareCompare,
  createComparator,
  stableSort,
  sortByRules,
  createSortManager,
  quickSort,
  getSortIndicator,
} from "./sort-utils.js";
export type {
  SortDirection,
  SortRule,
  SortState,
  ComparatorFn,
} from "./sort-utils.js";

// --- tree-view-utils ---
export { createTreeView } from "./tree-view-utils.js";
export type {
  TreeNode,
  TreeViewOptions,
  TreeViewInstance,
} from "./tree-view-utils.js";

// --- tabs-utils ---
export { createTabs } from "./tabs-utils.js";
export type {
  TabOrientation,
  TabActivation,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs-utils.js";
// --- accordion-utils ---
export { createAccordion } from "./accordion-utils.js";
export type {
  AccordionMode,
  AccordionItem,
  AccordionOptions,
  AccordionInstance,
} from "./accordion-utils.js";

// --- carousel-utils ---
export { createCarousel } from "./carousel-utils.js";
export type {
  CarouselTransition,
  CarouselNavStyle,
  CarouselSlide,
  CarouselOptions,
  CarouselInstance,
} from "./carousel-utils.js";

// --- breadcrumb-utils ---
export { createBreadcrumb } from "./breadcrumb-utils.js";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb-utils.js";
// --- progress-utils ---
export {
  createProgressBar,
  updateProgressBar,
  createCircularProgress,
  createStepProgress,
} from "./progress-utils.js";
export type {
  ProgressBarVariant,
  ProgressBarSize,
  ProgressBarOptions,
  CircularProgressOptions,
  StepProgressOptions,
} from "./progress-utils.js";

// --- rating-utils ---
export { createRating } from "./rating-utils.js";
export type {
  RatingIconType,
  RatingOptions,
  RatingInstance,
} from "./rating-utils.js";

// --- avatar-utils ---
export {
  createAvatar,
  createAvatarGroup,
  generateAvatarColor,
  getInitials,
} from "./avatar-utils.js";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar-utils.js";
// --- badge-utils ---
export {
  createBadge,
  createDotBadge,
  createTag,
} from "./badge-utils.js";
export type {
  BadgeVariant,
  BadgeSize,
  DotPosition,
  BadgeOptions,
  DotBadgeOptions,
  TagOptions,
} from "./badge-utils.js";

// --- chip-utils ---
export { createChip, createChipSet } from "./chip-utils.js";
export type {
  ChipType,
  ChipSize,
  ChipColor,
  ChipConfig,
  ChipSetOptions,
  ChipSetInstance,
} from "./chip-utils.js";

// --- divider-utils ---
export { createDivider, createHr, createVr, createDividerGroup } from "./divider-utils.js";
export type {
  DividerOrientation,
  DividerVariant,
  DividerLabelPosition,
  DividerOptions,
  DividerGroupOptions,
} from "./divider-utils.js";
// --- Batch 1175: Empty State, Stat Display, Number Formatting ---
export {
  createEmptyState,
  type EmptyStateOptions,
  type EmptyStateType,
} from "./empty-state-utils";
export {
  createStat,
  createStatCard,
  createSparkline,
  type StatOptions,
  type StatCardOptions,
  type StatTrend,
  type StatSize,
  type StatFormat,
} from "./stat-utils";
export {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatPercentSigned,
  formatBytes,
  parseBytes,
  formatCompact,
  getOrdinalSuffix,
  formatOrdinal,
  parseNumber,
  roundTo,
  roundUpTo,
  roundDownTo,
  roundNearest,
  formatRange,
  formatDelta,
  getDeltaDirection,
  addThousandSeparators,
  stripNumberFormat,
  isNumeric,
  isEven,
  isOdd,
  isInRange,
  clamp,
  sign,
  randomInt,
  randomFloat,
  randomId,
  mean,
  median,
  standardDeviation,
  percentile,
  type FormatNumberOptions,
  type FormatCurrencyOptions,
  type FormatBytesOptions,
  type FormatCompactOptions,
  type ParseNumberOptions,
  type NumberFormatStyle,
  type CompactDisplay,
  type ByteUnit,
} from "./number-format-utils";
// --- Batch 1176: Color, Date/Time, String Utilities ---
export {
  parseColor,
  requireColor,
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToHsl,
  toHexString,
  toRgbString,
  toHslString,
  lighten,
  darken,
  saturate,
  desaturate,
  rotateHue,
  setOpacity,
  mix,
  invert,
  luminance,
  contrastRatio,
  meetsAA,
  meetsAAA,
  contrastingText,
  minAlphaForContrast,
  generatePalette,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  generateScheme,
  linearGradient,
  radialGradient,
  gradientBetween,
  shimmerGradient,
  colorTemperature,
  isWarmColor,
  hueCategory,
  cssVariablesFromPalette,
  generateDesignTokens,
  type RGB,
  type HSL,
  type HSV,
  type ColorStop,
  type ColorPalette,
} from "./color-utils";
export {
  formatDate,
  toISODate,
  toISODatetime,
  formatTime,
  relativeTime,
  shortRelativeTime,
  parseDate,
  formatDuration,
  parseDuration,
  isLeapYear,
  daysInMonth,
  getDayOfWeek,
  getWeekNumber,
  getQuarter,
  isSameDay,
  isToday,
  isYesterday,
  isBetween,
  addTime,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getTimezone,
  getTimezoneOffset,
  convertToTimezone,
  type DateFormatOptions,
  type RelativeTimeOptions,
} from "./date-utils";
export {
  isBlank,
  isPresent,
  collapseWhitespace,
  stripDiacritics,
  escapeRegex,
  escapeHtmlEntities,
  unescapeHtmlEntities,
  toCamelCaseString,
  toPascalCaseString,
  toKebabCaseString,
  toSnakeCaseString,
  capitalizeWords,
  smartTruncate,
  repeatWithSeparator,
  centerPad,
  isAscii,
  looksLikeEmail,
  looksLikeUrl,
  extractNumbers,
  replaceMultiple,
  stringToId,
  countOccurrences,
  reverseWords,
  trimLines,
  detectCase,
  slugify,
  levenshtein,
  isSimilar,
  soundex,
  randomString,
  randomHex,
  generateId,
  wordCount,
  charFrequency,
  mostCommonChars,
  uniqueWords,
  pluralize,
  singularize,
  acronym,
  abbreviate,
  maskString,
  maskEmail,
  detectIndentation,
  indentText,
  simpleDiff,
  type DiffSegment,
} from "./string-utils";
// --- Batch 1177: CSS, Animation, Keyboard Utilities ---
export {
  cssVar,
  setCssVar,
  getCssVar,
  setCssVars,
  removeCssVar,
  getAllCssVars,
  createStylesheet,
  injectCSS,
  removeInjectedCSS,
  addCSSRule,
  clearDynamicStyles,
  styleObjectToString,
  cssStringToObject,
  applyStyles,
  bem,
  createBem,
  cn,
  mergeClasses,
  BREAKPOINTS,
  mediaQuery,
  matchesMedia,
  isAtLeast,
  isBelow,
  subscribeMedia,
  subscribeBreakpoint,
  getCurrentBreakpoint,
  media,
  cssTransition,
  EASING_CSS,
  keyframes,
  ANIMATIONS,
  animateOnce,
  hexToRgb as cssHexToRgb,
  rgbToHex as cssRgbToHex,
  mixColors,
  transparentize,
  lightenColor,
  darkenColor,
  parseCssColor,
  pxToRem,
  remToPx,
  ensureUnit,
  cssClamp,
  fluidFontSize,
  type BreakpointName,
} from "./css-utils";
export {
  easings,
  Tween,
  tween,
  tweenPromise,
  SpringAnimation,
  springTo,
  stagger,
  staggerFadeIn,
  scrollAnimate,
  parallax,
  mouseParallax,
  animate,
  fadeIn,
  fadeOut,
  slideUp,
  slideDown,
  scaleIn,
  shake,
  pulse,
  type TweenOptions,
  type SpringConfig,
  type AnimationFrame,
  type ScrollAnimationOptions,
  type EasingName,
} from "./animation-utils";
export {
  KEY_ALIASES,
  resolveKey,
  normalizeKeyEvent,
  eventMatchesBinding,
  HotkeyManager,
  KeySequenceDetector,
  RovingTabIndex,
  formatHotkey,
  parseHotkeyString,
  isTypingInInput,
  type ModifierKey,
  type KeyBinding,
  type KeySequence,
  type NormalizedKeyEvent,
  type KeyboardState,
  type NavigationConfig,
} from "./keyboard-utils";
// --- Batch 1178: Clipboard, Print, Image Utilities ---
export {
  requestClipboardPermission,
  checkClipboardReadPermission,
  isClipboardSupported,
  copyToClipboard,
  copyRich,
  copyImage,
  copyFiles,
  readClipboardText,
  readClipboard,
  cutToClipboard,
  selectAll,
  selectRange,
  clearSelection,
  getSelectedText,
  getSelectionTarget,
  ClipboardHistory,
  detectClipboardFormats,
  hasImageInClipboard,
  hasFilesInClipboard,
  copyWithFeedback,
  copySelection,
  onClipboardChange,
  type ClipboardData,
  type CopyOptions,
  type PasteOptions,
  type PasteResult,
  type ClipboardHistoryEntry,
  type ClipboardHistoryOptions,
} from "./clipboard-utils";
export {
  printContent,
  printElement,
  printPreview,
  generateReceiptText,
  generateLabel,
  injectPrintStyles,
  PRINT_STYLES,
  getPrintableArea,
  estimatePageCount,
  paginateContent,
  generatePDF,
  type PrintOptions,
  type PageSettings,
  type ReceiptOptions,
} from "./print-utils";
export {
  getImageDimensions,
  loadImage,
  imageToCanvas,
  resizeImage,
  cropImage,
  applyFilters,
  convertFormat,
  generateThumbnail,
  compressImage,
  getDominantColor,
  getAverageColor,
  createCollage,
  addWatermark,
  detectOrientation,
  getAspectRatio,
  fileToDataUrl,
  fileToArrayBuffer,
  downloadImage,
  formatFileSize,
  isValidImageType,
  getExifOrientation,
  type ImageDimensions,
  type ImageProcessingOptions,
  type CropRegion,
  type FilterOptions,
} from "./image-utils";
// --- Batch 1179: Scroll, Resize, Selection Utilities ---
export {
  getScrollPosition,
  setScrollPosition,
  scrollTo,
  scrollToElement,
  scrollToTop,
  scrollToBottom,
  trackScroll,
  createScrollSpy,
  createInfiniteScroll,
  createParallax as scrollParallax,
  lockScroll,
  createProgressBar,
  isAtTop,
  isAtBottom,
  getScrollPercent,
  type ScrollPosition,
  type ScrollSpyOptions,
  type InfiniteScrollOptions,
  type ParallaxOptions,
  type ScrollLockOptions,
} from "./scroll-utils";
export {
  EnhancedResizeObserver,
  BreakpointTracker,
  ViewportTracker,
  createResizeHandle,
  clamp as resizeClamp,
  isResizeObserverSupported,
  getElementSize,
  hasOverflow,
  matchMedia as resizeMatchMedia,
  onMediaChange,
  DEFAULT_BREAKPOINTS,
  type ResizeEntry,
  type ResizeObserverConfig,
  type Breakpoint,
  type ViewportState,
  type ResizeHandleOptions,
} from "./resize-utils";
export {
  getSelection as getSelectionRange,
  setSelection as setSelectionRange,
  clearSelection as selectionClear,
  getSelectedText as selectionGetText,
  getCaretPosition,
  setCaretPosition,
  moveCaret,
  getCaretCoordinates,
  makeContentEditable,
  insertAtCaret,
  insertHtmlAtCaret,
  wrapSelection,
  unwrapSelection,
  highlightRange,
  removeHighlights,
  highlightAll,
  getRangeRect,
  isPointInSelection,
  selectAll as selectAllText,
  selectBetween,
  createSelectionDetector,
  type SelectionRange,
  type CaretPosition,
  type Rect,
} from "./selection-utils";
// --- Batch 1180: URL, DOM, Table Utilities ---
export {
  parseUrl,
  buildUrlFromParts,
  updateSearchParams,
  removeSearchParams,
  getQueryParams,
  isSameOrigin,
  normalizeUrl,
  isAbsoluteUrl,
  makeAbsoluteUrl,
  getDomainFromUrl,
  getPathnameFromUrl,
  joinPathSegments,
  encodeUriComponentSafe,
  decodeUriComponentSafe,
  urlsEqual,
  type ParsedUrl,
} from "./url-utils";
export {
  createEl,
  div,
  span,
  p,
  btn,
  createSvg,
  $,
  $$,
  requireSelector,
  byId,
  byClass,
  byTag,
  walkUp,
  walkDown,
  nextSibling,
  prevSibling,
  siblings,
  siblingIndex,
  isLastChild,
  isFirstChild,
  empty,
  setChildren,
  insertAtIndex,
  moveToIndex,
  swapElements,
  wrap as domWrap,
  unwrap,
  htmlToFragment,
  appendHtml,
  prependHtml,
  delegate,
  delegateClick,
  renderTemplate,
  renderInto,
  type CreateElementOptions,
  type QueryOptions,
  type DomDiffResult,
} from "./dom-utils";
export {
  createTable,
  type TableColumn,
  type TableRow,
  type TableOptions,
  type TableInstance,
  type TableSize,
  type TableVariant,
} from "./table-utils";
// --- Batch 1181: Grid, List, Layout Utilities ---
export {
  createGridSystem,
  createResponsiveGrid,
  autoFitGrid,
  autoFillGrid,
  createAreaGrid,
  placeInArea,
  createMasonry,
  applyGridItem,
  gridSpan,
  gridFull,
  gridCenter,
  showGridLines,
  type GridSystemOptions,
  type GridItemOptions,
  type ResponsiveGridOptions,
  type GridLayout,
  type GridColumns,
  type GridGap,
} from "./grid-utils";
export {
  createList,
  type ListItem,
  type ListOptions,
  type ListInstance,
} from "./list-utils";
export {
  flex,
  applyFlex,
  hStack,
  vStack,
  gridLayout,
  applyGrid,
  applyStack,
  parseAspectRatio,
  applyAspectRatio,
  createAspectContainer,
  spacing,
  insertDivider as layoutDivider,
  createAppLayout,
  createSidebarLayout,
  createCenteredLayout,
  type FlexConfig,
  type GridConfig,
  type StackConfig,
  type FlexDirection,
  type FlexWrap,
  type JustifyContent,
  type AlignItems,
  type AlignSelf,
  type GapSize,
} from "./layout-utils";
// --- Batch 1182: i18n, Theme, Logger Utilities ---
export {
  LOCALES,
  getPluralForm,
  formatLocaleNumber,
  formatCurrency as i18nFormatCurrency,
  formatRelativeTimeLocale,
  formatList,
  detectLocale,
  TranslationDict,
  type LocaleConfig,
  type LocaleCode,
  type PluralRule,
} from "./i18n-utils";
export {
  getSystemColorScheme,
  onSystemColorSchemeChange,
  prefersReducedMotion,
  prefersHighContrast,
  prefersLightColor,
  ThemeManager,
  generateDesignTokens as generateThemeTokens,
  generateDarkTokens,
  createLightDarkTheme,
  type ThemeMode,
  type DesignToken,
  type ThemeDefinition,
  type ThemeManagerConfig,
} from "./theme-utils";
export {
  Logger,
  getLogger,
  destroyLogger,
  createModuleLogger,
  PerfTracker,
  textFormatter,
  jsonFormatter,
  compactFormatter,
  type LogLevel,
  type LogEntry,
  type LogTransport,
  type LogFormatter,
  type LoggerOptions,
} from "./logger-utils";

// --- pointer-utils ---
export {
  hasPointerEvents,
  hasTouch,
  hasPenSupport,
  getPrimaryInput,
  hasMouse,
  clientToPage,
  pageToClient,
  clientToLocal,
  localToClient,
  transformBetween,
  getScrollOffset,
  extractPointerState,
  extractMouseState,
  extractTouchState,
  createPointerListener,
  setPointerCapture,
  releasePointerCapture,
  requestPointerLock,
  exitPointerLock,
  isPointerLocked,
  getMovementDelta,
  normalizePressure,
  classifyPressure,
} from "./pointer-utils";
export type { PointerState, PointerConfig, PointerHandler } from "./pointer-utils";

// --- gesture-utils ---
export {
  GestureRecognizer,
  distance,
  angleBetween,
  midpoint,
  getDirection,
  isInsideRect,
  isInsideElement,
  createTapDebounce,
  detectSwipe,
} from "./gesture-utils";
export type {
  Point,
  SwipeGesture,
  PinchGesture,
  RotateGesture,
  TapGesture,
  LongPressGesture,
  PanGesture,
  Gesture,
  GestureConfig,
  GestureHandlers,
} from "./gesture-utils";

// --- touch-utils ---
export {
  isTouchDevice,
  getMaxTouchPoints,
  hasForceTouch,
  hasRotationTouch,
  getTouchCount,
  extractTouches,
  extractChangedTouches,
  createTouchListener,
  disablePinchZoom,
  preventContextMenu,
  getTouchCentroid,
  touchDistance,
  initialTouchDistance,
  currentTouchDistance,
  getPinchScale,
} from "./touch-utils";
export type { TouchPoint, TouchConfig, TouchHandler } from "./touch-utils";

// --- form-utils ---
export {
  createForm,
  serializeForm,
  populateForm,
  clearForm,
  createMultiStepForm,
  evaluateConditionals,
  linkErrorToField,
  unlinkErrorFromField,
  createFormAnnouncer,
} from "./form-utils";
export type {
  FormFieldConfig,
  FormValidationRule,
  FormFieldState,
  FormOptions,
  FormInstance,
  StepConfig,
  MultiStepFormOptions,
  MultiStepFormInstance,
  ConditionRule,
  ConditionalField,
} from "./form-utils";

// --- validation-utils ---
export {
  isString,
  isNumber,
  isInteger,
  isFiniteNumber,
  isObject,
  isArray,
  isValidDate,
  isBoolean,
  isFunction,
  isNil,
  isNotNil,
  isEmpty,
  isMap,
  isSet,
  isPromise,
  isEmail,
  isURL,
  isUUID,
  isUUIDv4,
  isHexColor,
  isIPv4,
  isIPv6,
  isIP,
  isMACAddress,
  isCreditCard,
  detectCardBrand,
  isPhoneNumber,
  isISODate,
  isISODateTime,
  isJSON,
  matchesPattern,
  isLength,
  isArraySize,
  inRange,
  isOneOf,
  every,
  some,
  validate,
  validateAsync,
  rules,
  assert,
  assertType,
} from "./validation-utils";
export type { ValidationResult, ValidationError, ValidationWarning, ValidationRule, FieldSchema, ObjectSchema } from "./validation-utils";

// --- notification-utils ---
export { NotificationManager } from "./notification-utils";
export type {
  NotificationType,
  NotificationPosition,
  NotificationOptions,
  NotificationInstance,
  NotificationManagerConfig,
} from "./notification-utils";

// --- modal-utils ---
export { createModal, createFocusTrap } from "./modal-utils";
export type { ModalOptions, ModalInstance, ModalSize, FocusTrapConfig } from "./modal-utils";

// --- tooltip-utils ---
export { createTooltip } from "./tooltip-utils";
export type { TooltipOptions, TooltipInstance, TooltipPlacement, TooltipTrigger } from "./tooltip-utils";

// --- dropdown-utils ---
export { createDropdown } from "./dropdown-utils";
export type { DropdownItem, DropdownOptions, DropdownInstance } from "./dropdown-utils";

// --- tab-utils ---
export { createTabs } from "./tab-utils";
export type { TabItem, TabOptions, TabInstance, TabOrientation, TabActivation } from "./tab-utils";

// --- accordion-utils ---
export { createAccordion } from "./accordion-utils";
export type { AccordionItem, AccordionOptions, AccordionInstance, AccordionMode } from "./accordion-utils";

// --- carousel-utils ---
export { createCarousel } from "./carousel-utils";
export type { CarouselSlide, CarouselOptions, CarouselInstance, CarouselTransition, CarouselNavStyle } from "./carousel-utils";

// --- tree-utils ---
export { createTree } from "./tree-utils";
export type { TreeNode, TreeOptions, TreeInstance, TreeSelectionMode, TreeCheckboxMode, TreeExpandMode } from "./tree-utils";

// --- avatar-utils ---
export { createAvatar, createAvatarGroup, generateAvatarColor, getInitials } from "./avatar-utils";
export type { AvatarOptions, AvatarGroupOptions, AvatarSize, AvatarShape } from "./avatar-utils";

// --- badge-utils ---
export { createBadge, createDotBadge, createTag } from "./badge-utils";
export type { BadgeOptions, DotBadgeOptions, TagOptions, BadgeVariant, BadgeSize, DotPosition } from "./badge-utils";

// --- skeleton-utils ---
export { createSkeleton, createSkeletonBlock, createCardSkeleton, createTableSkeleton } from "./skeleton-utils";
export type { SkeletonOptions, SkeletonBlockOptions, SkeletonVariant, SkeletonSize } from "./skeleton-utils";

// --- progress-utils ---
export { createProgressBar, updateProgressBar, createCircularProgress, createStepProgress } from "./progress-utils";
export type { ProgressBarOptions, CircularProgressOptions, StepProgressOptions, ProgressBarVariant, ProgressBarSize } from "./progress-utils";

// --- rating-utils ---
export { createRating } from "./rating-utils";
export type { RatingOptions, RatingInstance, RatingIconType } from "./rating-utils";

// --- chart-utils ---
export {
  calculateAxisScale,
  formatAxisLabel,
  valueToPixel,
  pixelToValue,
  aggregateByInterval,
  movingAverage,
  calculatePercentChanges,
  findExtrema,
  generateChartColors,
  interpolateColor,
  getDataStats,
} from "./chart-utils";
export type { DataPoint, DataSeries, ChartConfig, AxisScale, DataStats, ColorPaletteName } from "./chart-utils";

// --- markdown-utils ---
export { parseMarkdown, renderMarkdown, extractHeadings, generateToc, extractCodeBlocks, extractNamedBlock } from "./markdown-utils";
export type { MarkdownOptions, HeadingInfo } from "./markdown-utils";

// --- code-utils ---
export { createCodeBlock, createDiffView, detectLanguage } from "./code-utils";
export type { CodeBlockOptions, DiffOptions, Language } from "./code-utils";

// --- context-menu-utils ---
export { createContextMenu } from "./context-menu-utils";
export type { ContextMenuItem, ContextMenuOptions, ContextMenuInstance, ContextMenuContext } from "./context-menu-utils";

// --- hotkey-utils ---
export { createHotkeyManager, normalizeKeyEvent, parseBinding, formatHotkey } from "./hotkey-utils";
export type { KeyBinding, HotkeyManagerOptions, HotkeyManagerInstance } from "./hotkey-utils";

// --- command-palette-utils ---
export { createCommandPalette } from "./command-palette-utils";
export type { PaletteItem, CommandPaletteOptions, CommandPaletteInstance } from "./command-palette-utils";

// --- virtual-list-utils ---
export { createVirtualList } from "./virtual-list-utils";
export type { VirtualListItem, VirtualListOptions, VirtualListInstance } from "./virtual-list-utils";

// --- infinite-scroll-utils ---
export { createInfiniteScroll } from "./infinite-scroll-utils";
export type { InfiniteScrollOptions, InfiniteScrollInstance } from "./infinite-scroll-utils";

// --- drag-drop-utils ---
export { createDraggable, createDropZone, createSortable } from "./drag-drop-utils";
export type { DragData, DropZoneOptions, DraggableOptions, SortableOptions, DragEvent, DraggableInstance, DropZoneInstance, SortableInstance, DragAxis, DragConstraint } from "./drag-drop-utils";

// --- split-pane-utils ---
export { createSplitPane } from "./split-pane-utils";
export type { PaneOptions, SplitPaneOptions, SplitPaneInstance, SplitDirection, SplitBehavior } from "./split-pane-utils";

// --- resizable-utils ---
export { createResizable } from "./resizable-utils";
export type { ResizableOptions, ResizableInstance, ResizeEdge } from "./resizable-utils";

// --- context-view-utils ---
export { createContextView } from "./context-view-utils";
export type { ViewContext, ContextViewOptions, ContextViewInstance } from "./context-view-utils";
// --- Batch 1193: Overlay, Drawer, Tour ---
export {
  createOverlay,
  getNextZIndex,
  resetZIndexCounter,
  type OverlayOptions,
  type OverlayInstance,
  type OverlayPlacement,
  type OverlayAnimation,
} from "./overlay-utils.js";
export {
  createDrawer,
  type DrawerOptions,
  type DrawerInstance,
  type DrawerSide,
  type DrawerSize,
} from "./drawer-utils.js";
export {
  createTour,
  type TourOptions,
  type TourInstance,
  type TourStep,
} from "./tour-utils.js";
// --- Batch 1194: Dialog, Popconfirm, Alert ---
export {
  createDialog,
  confirmDialog,
  alertDialog,
  promptDialog,
  dangerDialog,
  createDialogManager,
  type DialogOptions,
  type DialogResult,
  type DialogInstance,
  type DialogManagerConfig,
  type DialogManagerInstance,
  type DialogType,
} from "./dialog-utils.js";
export {
  createPopconfirm,
  type PopconfirmOptions,
  type PopconfirmInstance,
  type PopconfirmPlacement,
  type PopconfirmTrigger,
  type PopconfirmIconType,
} from "./popconfirm-utils.js";
export {
  createAlert,
  type AlertOptions,
  type AlertInstance,
  type AlertVariant,
  type AlertSize,
} from "./alert-utils.js";
// --- Batch 1195: Anchor, Affix, BackToTop ---
export {
  createAnchor,
  type AnchorOptions,
  type AnchorResult,
  type AnchorInstance,
  type AnchorPlacement,
  type AnchorAlignment,
} from "./anchor-utils.js";
export {
  createAffix,
  type AffixOptions,
  type AffixInstance,
  type AffixPosition,
} from "./affix-utils.js";
export {
  createBackToTop,
  type BackToTopOptions,
  type BackToTopInstance,
  type BackToTopPosition,
  type BackToTopShape,
} from "./back-to-top-utils.js";
// --- Batch 1196: ScrollSpy, LazyLoad, AnimateOnScroll ---
export {
  createScrollSpy,
  type ScrollSpyOptions,
  type ScrollSpyInstance,
  type SpySection,
} from "./scroll-spy-utils.js";
export {
  createLazyLoad,
  type LazyLoadOptions,
  type LazyLoadInstance,
  type LazyLoadTarget,
  type LazyLoadState,
} from "./lazy-load-utils.js";
export {
  createAnimateOnScroll,
  type AnimateOnScrollOptions,
  type AnimateOnScrollInstance,
  type AnimateTarget,
  type AnimationDirection,
  type AnimationEasing,
} from "./animate-on-scroll-utils.js";
// --- Batch 1197: InputMask, Clipboard, Color ---
export {
  createInputMask,
  formatPhone,
  formatDate,
  formatSSN,
  formatCreditCard,
  formatCurrencyStandalone,
  applyPatternMask,
  type MaskOptions,
  type MaskInstance,
  type MaskType,
} from "./input-mask-utils.js";
export {
  copyToClipboard,
  copyRich,
  copyImage,
  copyFiles,
  readClipboardText,
  readClipboard,
  cutToClipboard,
  selectAll,
  selectRange,
  clearSelection,
  getSelectedText,
  getSelectionTarget,
  ClipboardHistory,
  detectClipboardFormats,
  hasImageInClipboard,
  hasFilesInClipboard,
  copyWithFeedback,
  copySelection,
  onClipboardChange,
  requestClipboardPermission,
  checkClipboardReadPermission,
  isClipboardSupported,
  type ClipboardData,
  type CopyOptions,
  type PasteOptions,
  type PasteResult,
  type ClipboardHistoryEntry,
  type ClipboardHistoryOptions,
} from "./clipboard-utils.js";
export {
  parseColor,
  requireColor,
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToHsl,
  toHexString,
  toRgbString,
  toHslString,
  lighten,
  darken,
  saturate,
  desaturate,
  rotateHue,
  setOpacity,
  mix,
  invert,
  luminance,
  contrastRatio,
  meetsAA,
  meetsAAA,
  contrastingText,
  minAlphaForContrast,
  generatePalette,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  generateScheme,
  linearGradient,
  radialGradient,
  gradientBetween,
  shimmerGradient,
  colorTemperature,
  isWarmColor,
  hueCategory,
  cssVariablesFromPalette,
  generateDesignTokens,
  type RGB,
  type HSL,
  type HSV,
  type ColorStop,
  type ColorPalette,
} from "./color-utils.js";
// --- Batch 1198: Date, Number, String ---
export {
  formatDate,
  toISODate,
  toISODatetime,
  formatTime,
  relativeTime,
  shortRelativeTime,
  parseDate,
  formatDuration,
  parseDuration,
  isLeapYear,
  daysInMonth,
  getDayOfWeek,
  getWeekNumber,
  getQuarter,
  isSameDay,
  isToday,
  isYesterday,
  isBetween,
  addTime,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getTimezone,
  getTimezoneOffset,
  convertToTimezone,
  type DateFormatOptions,
  type RelativeTimeOptions,
} from "./date-utils.js";
export {
  clampNumber,
  lerpNumber,
  mapRangeNumber,
  roundTo,
  roundToMultiple,
  floorToMultiple,
  ceilToMultiple,
  formatBytesAuto,
  formatCompactNumber,
  formatWithSeparators,
  percentChange,
  approximatelyEqual,
  randomIntInRange,
  randomFloatInRange,
  normalizeAngleDeg,
  normalizeAngleRad,
  degToRad,
  radToDeg,
  gcd,
  lcm,
  isInRange,
  wrapNumber,
} from "./number-utils.js";
export {
  isBlank,
  isPresent,
  collapseWhitespace,
  stripDiacritics,
  escapeRegex,
  escapeHtmlEntities,
  unescapeHtmlEntities,
  toCamelCaseString,
  toPascalCaseString,
  toKebabCaseString,
  toSnakeCaseString,
  capitalizeWords,
  smartTruncate,
  repeatWithSeparator,
  centerPad,
  isAscii,
  looksLikeEmail,
  looksLikeUrl,
  extractNumbers,
  replaceMultiple,
  stringToId,
  countOccurrences,
  reverseWords,
  trimLines,
  detectCase,
  slugify,
  levenshtein,
  isSimilar,
  soundex,
  randomString,
  randomHex,
  generateId,
  wordCount,
  charFrequency,
  mostCommonChars,
  uniqueWords,
  pluralize,
  singularize,
  acronym,
  abbreviate,
  maskString,
  maskEmail,
  detectIndentation,
  indentText,
  simpleDiff,
  type DiffSegment,
} from "./string-utils.js";
// --- Batch 1199: DOM, CSS, Event ---
export {
  createEl,
  div,
  span,
  p,
  btn,
  createSvg,
  $,
  $$,
  requireSelector,
  byId,
  byClass,
  byTag,
  walkUp,
  walkDown,
  nextSibling,
  prevSibling,
  siblings,
  siblingIndex,
  isLastChild,
  isFirstChild,
  empty,
  setChildren,
  insertAtIndex,
  moveToIndex,
  swapElements,
  wrap,
  unwrap,
  htmlToFragment,
  appendHtml,
  prependHtml,
  delegate,
  delegateClick,
  renderTemplate,
  renderInto,
  type CreateElementOptions,
  type QueryOptions,
  type DomDiffResult,
} from "./dom-utils.js";
export {
  cssVar,
  setCssVar,
  getCssVar,
  setCssVars,
  removeCssVar,
  getAllCssVars,
  createStylesheet,
  injectCSS,
  removeInjectedCSS,
  addCSSRule,
  clearDynamicStyles,
  styleObjectToString,
  cssStringToObject,
  applyStyles,
  bem,
  createBem,
  cn,
  mergeClasses,
  BREAKPOINTS,
  mediaQuery,
  matchesMedia,
  isAtLeast,
  isBelow,
  subscribeMedia,
  subscribeBreakpoint,
  getCurrentBreakpoint,
  media,
  cssTransition,
  EASING_CSS,
  keyframes,
  ANIMATIONS,
  animateOnce,
  hexToRgb as cssHexToRgb,
  rgbToHex as cssRgbToHex,
  mixColors,
  transparentize,
  lightenColor,
  darkenColor,
  parseCssColor,
  pxToRem,
  remToPx,
  ensureUnit,
  cssClamp,
  fluidFontSize,
  type BreakpointName,
} from "./css-utils.js";
export {
  createCustomEvent,
  dispatchCustomEvent,
  onCustomEvent,
  throttleEvent,
  debounceEvent,
  once,
  waitForEvent,
  delegateEvent,
  preventDefault,
  stopPropagation,
  stopEvent,
} from "./event-utils.js";
// --- Batch 1200: Storage, Network, URL ---
export {
  StorageManager,
  createLocalStorage,
  createSessionStorage,
  createMemoryStore,
  type StorageBackend,
  type StorageOptions,
  type StorageEntry,
  type StorageStats,
  type StorageMigration,
} from "./storage-utils.js";
export {
  getNetworkStatus,
  onNetworkChange,
  isSlowConnection,
  isDataSaverEnabled,
  fetchWithRetry,
  RequestQueue,
  syncWhenOnline,
  processOfflineQueue,
  BandwidthEstimator,
  ConnectionHealthChecker,
  type NetworkStatus,
  type RetryOptions,
  type RequestQueueItem,
} from "./network-utils.js";
export {
  parseUrl,
  buildUrlFromParts,
  updateSearchParams,
  removeSearchParams,
  getQueryParams,
  isSameOrigin,
  normalizeUrl,
  isAbsoluteUrl,
  makeAbsoluteUrl,
  getDomainFromUrl,
  getPathnameFromUrl,
  joinPathSegments,
  encodeUriComponentSafe,
  decodeUriComponentSafe,
  urlsEqual,
  type ParsedUrl,
} from "./url-utils.js";
// --- Batch 1201: I18n, Logger, Perf ---
export {
  LOCALES,
  getPluralForm,
  formatLocaleNumber,
  formatCurrency,
  formatRelativeTimeLocale,
  formatList,
  detectLocale,
  TranslationDict,
  type LocaleConfig,
  type LocaleCode,
  type PluralRule,
} from "./i18n-utils.js";
export {
  Logger,
  getLogger,
  destroyLogger,
  createModuleLogger,
  PerfTracker,
  textFormatter,
  jsonFormatter,
  compactFormatter,
  type LogLevel,
  type LogEntry,
  type LogTransport,
  type LogFormatter,
  type LoggerOptions,
} from "./logger-utils.js";
export {
  mark,
  measure,
  endMark,
  clearMarks,
  perfTimer,
  perfTimerAsync,
  createFPSMonitor,
  getMemoryInfo,
  formatBytes,
  formatMemoryInfo,
  getResourceTimings,
  getResourcesByType,
  getSlowestResources,
  getLargestResources,
  getNavigationTiming,
  observeLongTasks,
  observeLayoutShift,
  FrameBudgetTracker,
  type PerformanceMark,
  type FrameStats,
  type MemoryInfo,
  type ResourceTimingEntry,
  type FPSMonitorOptions,
  type FPSMonitorInstance,
} from "./perf-utils.js";
// --- Batch 1202: State, Reactive, Async ---
export {
  createState,
  createDerived,
  createMachine,
  diffState,
  statesEqual,
  type StateContainerOptions,
  type StateContainer,
  type StateListener,
  type MachineConfig,
  type MachineInstance,
  type MachineTransition,
} from "./state-utils.js";
export {
  createSignal,
  createComputed,
  createEffect,
  batch,
  watch,
  watchDebounced,
  watchThrottled,
  withHistory,
  type Signal,
  type Computed,
  type EffectInstance,
  type SignalHistory,
} from "./reactive-utils.js";
export {
  retry,
  withTimeoutPromise,
  poll,
  runWithConcurrency,
  memoizeAsync,
  memoize,
  createDeferred,
  asyncIterate,
  batchProcess,
  allSuccessful,
  allOrThrow,
  type RetryOptions,
  type PollOptions,
  type ConcurrencyOptions,
  type MemoizeOptions,
} from "./async-utils.js";

// --- type-utils ---
export {
  isNil, isNotNil, isPlainObject, isNonEmptyString, isNumber, isInteger,
  isFinite as isFiniteType, isBoolean, isFunction, isArray, isDate,
  isValidDate, isRegExp, isError, isPromise, isAsyncIterable, isIterable,
  toString, toNumber, toInt, toFloat, toBoolean, toArray,
  validateType, getConstructorName, typeOf, deepClone, deepFreeze, deepMerge,
} from "./type-utils";
export type { SchemaValidationResult, TypeSchema } from "./type-utils";

// --- math-utils ---
export {
  mean, median, mode, variance, stddev, covariance, correlation, linearRegression, percentile,
  Vec2, Vec3, Matrix,
  lerp, clamp, mapRange, smoothStep, bezierQuad, bezierCubic, catmullRom,
  gcd, lcm, isPrime, sieveOfEratosthenes, factorial, fibonacci, fibonacciSequence,
  combinations, permutations, modPow,
  degToRad as mathDegToRad, radToDeg as mathRadToDeg, normalizeDeg, normalizeRad,
  celsiusToFahrenheit, fahrenheitToCelsius, celsiusToKelvin, kelvinToCelsius,
  metersToFeet, feetToMeters, milesToKilometers, kilometersToMiles, cmToInches, inchesToCm,
  kgToLbs, lbsToKg, ouncesToKg, kgToOunces,
  randomNormal, randomUniform, randomInt as mathRandomInt, randomPick, shuffle, weightedRandom,
} from "./math-utils";

// --- geom-utils ---
export {
  pt2, pt3,
  dist2D, dist3D, distSq2D, midpoint, angleOf, angleBetween,
  rotatePoint, translatePoint, scalePoint, lerpPoint,
  rectFromCenter, rectCenter, rectArea, rectContains, rectsIntersect,
  rectUnion, rectIntersection, inflateRect, deflateRect, rectContainsRect,
  circleContains, circlesIntersect, circleArea, circumference,
  circleContainsRect, rectContainsCircle,
  collideCircleCircle, collideRectRect, collideCircleRect,
  collidePointCircle, collidePointRect, collideLineCircle,
  pathLength, sampleAlongPath, simplifyPolyline,
  boundingBox, boundingCircle,
  identityTransform, transformPoint, composeTransform,
  translationTransform, scaleTransform, rotationTransform,
  SpatialGrid,
} from "./geom-utils";
export type { Point2D, Point3D, Rect, Circle, LineSegment, Polygon, Transform2D, SpatialGridOptions } from "./geom-utils";

// --- canvas-utils ---
export {
  createCanvas, createOffscreenCanvas, getContext2D,
  resizeCanvas, clearCanvas, clearRect,
  applyDrawOptions, resetDrawOptions,
  drawRect, drawRoundedRect, drawCircle, drawEllipse,
  drawPolygon, drawStar, drawLine, drawPolyline, drawArrow,
  createLinearGradient, createRadialGradient, createConicGradient,
  GRADIENT_PRESETS,
  applyTextOptions, drawText, drawWrappedText, measureText, getTextBounds,
  drawImage, drawImageCover, drawImageContain,
  loadImage, canvasToBlob, canvasToDataURL, downloadCanvas,
  getPixelData, setPixelData, getPixel, setPixel,
  applyPixelFilter, applyImageFilters,
  withSavedContext, atPosition, atScale, rotateAround,
  flipHorizontal, flipVertical,
  LayerManager,
  drawCheckerboard, drawGrid, drawDots, drawStripes,
  pointInRect as canvasPointInRect, pointInCircle as canvasPointInCircle,
  hexToRgb as canvasHexToRgb, rgbToHex as canvasRgbToHex,
  parseColor as canvasParseColor, generateCanvasId,
} from "./canvas-utils";
export type {
  Point2D as CanvasPoint2D, Size2D, Rect2D as CanvasRect2D,
  ColorStop, CanvasLayer, DrawOptions, TextDrawOptions,
  ImageFilterOptions, PixelData,
} from "./canvas-utils";

// --- svg-utils ---
export {
  getSvgNs, createSvgElement, createSvg, createSvgWithViewBox,
  setSvgAttrs, getSvgAttr, removeSvgAttr, toggleSvgAttr,
  rect as svgRect, circle as svgCircle, ellipse as svgEllipse,
  line as svgLine, polyline, polygon, path,
  PathBuilder,
  roundedRectPath, regularPolygonPath, starPath,
  smoothCurvePath, arcPath, pieSlicePath,
  text as svgText, tspan, multilineText,
  getOrCreateDefs, addLinearGradient, addRadialGradient,
  addPattern, addClipPath, addMask, addFilter,
  createDropShadowFilter, createBlurFilter,
  parseViewBox, getViewBox, setViewBox,
  zoomViewBox, panViewBox,
  screenToSvg, svgToScreen,
  appendChildren, insertBefore, removeElement,
  replaceElement, clearChildren, wrapSvgElement, cloneSvg,
  findByTag, findById,
  serializeSvg, svgToDataUrl, svgToBlob, downloadSvg,
  svgToPng, embedImages,
  getBBox, getBoundingClientRect as svgGetBoundingClientRect,
  getPathLength, getPointAtLength,
  isPointInFill, isPointInStroke,
} from "./svg-utils";
export type {
  SvgPoint, SvgSize, SvgRect, GradientStop,
  LinearGradientDef, RadialGradientDef, ViewBox,
} from "./svg-utils";

// --- animation-utils ---
export {
  easings, Tween, tween, tweenPromise,
  SpringAnimation, springTo,
  stagger, staggerFadeIn,
  scrollAnimate, parallax, mouseParallax,
  animate, fadeIn, fadeOut, slideUp, slideDown,
  scaleIn, shake, pulse,
} from "./animation-utils";
export type { TweenOptions, SpringConfig, AnimationFrame, ScrollAnimationOptions, EasingName } from "./animation-utils";

// --- form-utils ---
export {
  createForm,
  serializeForm, populateForm, clearForm,
  createMultiStepForm,
  evaluateConditionals,
  linkErrorToField, unlinkErrorFromField, createFormAnnouncer,
} from "./form-utils";
export type {
  FormFieldConfig, FormValidationRule, FormFieldState,
  FormOptions, FormInstance,
  StepConfig, MultiStepFormOptions, MultiStepFormInstance,
  ConditionRule, ConditionalField,
} from "./form-utils";

// --- validation-utils ---
export {
  isString as vIsString, isNumber as vIsNumber, isInteger as vIsInteger,
  isFiniteNumber, isObject as vIsObject, isArray as vIsArray,
  isValidDate as vIsValidDate, isBoolean as vIsBoolean,
  isFunction as vIsFunction, isNil as vIsNil, isNotNil as vIsNotNil,
  isEmpty, isMap, isSet, isPromise as vIsPromise,
  isEmail, isURL, isUUID, isUUIDv4, isHexColor,
  isIPv4, isIPv6, isIP, isMACAddress,
  isCreditCard, detectCardBrand, isPhoneNumber,
  isISODate, isISODateTime, isJSON,
  matchesPattern, isLength, isArraySize, inRange, isOneOf, every, some,
  validate as validateSchemaObj, validateAsync,
  rules, assert, assertType,
} from "./validation-utils";
export type {
  ValidationResult, ValidationError, ValidationWarning,
  ValidationRule, FieldSchema, ObjectSchema as VObjectSchema,
} from "./validation-utils";

// --- schema-utils ---
export {
  validateSchema, inferSchema, inferSchemaFromSamples,
  mergeSchemas, diffSchemas,
  schemaToTypeScript,
  SchemaRegistry,
  isAcceptedBySchema, atLeastOneRequired, conditionalSchema,
  extractPaths, getDefault,
} from "./schema-utils";
export type {
  JsonSchema, StringSchema, NumberSchema, BooleanSchema,
  NullSchema, ArraySchema, ObjectSchema as SObjectSchema,
  AnyOfSchema, OneOfSchema, AllOfSchema, NotSchema, RefSchema,
  SchemaType, SchemaValidationError, SchemaValidationResult as SValidationResult,
  SchemaDiff,
} from "./schema-utils";

// --- keyboard-utils ---
export {
  KEY_ALIASES, resolveKey,
  normalizeKeyEvent, eventMatchesBinding,
  HotkeyManager, KeySequenceDetector, RovingTabIndex,
  formatHotkey, parseHotkeyString, isTypingInInput,
} from "./keyboard-utils";
export type {
  ModifierKey, KeyBinding, KeySequence, NormalizedKeyEvent,
  KeyboardState, NavigationConfig,
} from "./keyboard-utils";

// --- gesture-utils ---
export {
  GestureRecognizer,
  distance as gestureDistance, angleBetween as gestureAngleBetween,
  midpoint as gestureMidpoint, getDirection,
  isInsideRect, isInsideElement,
  createTapDebounce, detectSwipe,
} from "./gesture-utils";
export type {
  Point, SwipeGesture, PinchGesture, RotateGesture,
  TapGesture, LongPressGesture, PanGesture, Gesture,
  GestureConfig, GestureHandlers,
} from "./gesture-utils";

// --- drag-utils ---
export {
  makeDraggable, DropZoneManager, createSortable,
} from "./drag-utils";
export type {
  DragData, DragOptions, DropZone, SortableConfig,
} from "./drag-utils";

// --- resize-utils ---
export {
  EnhancedResizeObserver,
  DEFAULT_BREAKPOINTS as RESIZE_DEFAULT_BREAKPOINTS,
  BreakpointTracker, ViewportTracker,
  createResizeHandle,
  clamp as resizeClamp, isResizeObserverSupported,
  getElementSize, hasOverflow,
  matchMedia as resizeMatchMedia, onMediaChange,
} from "./resize-utils";
export type {
  ResizeEntry, ResizeObserverConfig, Breakpoint as RBreakpoint,
  ViewportState, ResizeHandleOptions,
} from "./resize-utils";

// --- responsive-utils ---
export {
  BREAKPOINTS, BREAKPOINT_ORDER,
  subscribeMediaQuery, matchesMediaQuery, getBreakpointQuery,
  isAtLeast, isAtMost, getCurrentBreakpoint,
  resolveResponsive, createResponsiveValue,
  fluidFontSize, responsiveFontSize, applyResponsiveTypography,
  generateSrcSet, generateSizes, pickBestImageSource,
  createContainerQuery, applyContainerClasses,
  getDeviceInfo, isMobile, isTouch, canHover,
  prefersReducedMotion, prefersDarkMode, prefersLightMode, prefersHighContrast,
  watchColorScheme,
  getOrientation, watchOrientation, lockOrientation, unlockOrientation,
  responsiveVisibility, responsiveSwap, responsiveColumns,
} from "./responsive-utils";
export type {
  BreakpointName, BreakpointDefinition, ResponsiveValue,
  MediaQueryOptions, DeviceInfo,
} from "./responsive-utils";

// --- layout-utils ---
export {
  flex, applyFlex, hStack, vStack,
  gridLayout, applyGrid, applyStack,
  parseAspectRatio, applyAspectRatio, createAspectContainer,
  spacing, insertDivider,
  createAppLayout, createSidebarLayout, createCenteredLayout,
} from "./layout-utils";
export type {
  FlexDirection, FlexWrap, JustifyContent, AlignItems, AlignSelf, GapSize,
  FlexConfig, GridConfig, StackConfig,
} from "./layout-utils";

// --- virtual-list-utils ---
export { createVirtualList } from "./virtual-list-utils";
export type { VirtualListItem, VirtualListOptions, VirtualListInstance } from "./virtual-list-utils";

// --- infinite-scroll-utils ---
export { createInfiniteScroll } from "./infinite-scroll-utils";
export type { InfiniteScrollOptions, InfiniteScrollInstance } from "./infinite-scroll-utils";

// --- pagination-utils ---
export { createPagination } from "./pagination-utils";
export type { PaginationSize, PaginationLayout, PaginationOptions, PaginationInstance } from "./pagination-utils";

// --- transition-utils ---
export {
  easings as transitionEasings,
  cssTransition, fadeTo, fadeIn, fadeOut, slideBy,
  runClassTransition, runLeaveTransition,
  flip, staggerEnter, staggerLeave,
  createTransitionGroup, layoutTransition,
} from "./transition-utils";
export type { EasingFunction, TransitionOptions, ClassTransitionConfig, TransitionGroupOptions } from "./transition-utils";

// --- motion-utils ---
export {
  createMotion, createSpringMotion,
  injectKeyframes, PRESET_KEYFRAMES, animateWithKeyframes,
  animateAlongPath,
} from "./motion-utils";
export type { MotionOptions, MotionInstance, SpringMotionConfig } from "./motion-utils";

// --- physics-utils ---
export {
  Vec2, createBody, createStaticBody,
  gravityForce, windForce, dragForce, springForce,
  integrateSemiImplicitEuler, integrateVerlet,
  detectCircleCircle, detectAABB, detectPointPlane,
  resolveCollision,
  PhysicsWorld, ParticleEmitter,
} from "./physics-utils";
export type { Vector2, BodyState, Force, CollisionPair, PhysicsWorldOptions, ParticleEmitterConfig } from "./physics-utils";
// --- Observer Utilities ---
export {
  Observable,
  Computed,
  watch,
  batch,
  reactive,
  combineLatest,
  mergeObservables,
} from "./observer-utils";
export type {
  Subscriber,
  Unsubscriber,
  EqualityFn,
  ObservableOptions,
  ComputedOptions,
  WatchOptions,
} from "./observer-utils";

// --- State Machine Utilities ---
export {
  createStateMachine,
  createHierarchicalStateMachine,
  validateConfig,
  generateMermaidDiagram,
} from "./state-machine-utils";
export type {
  StateId as SmStateId,
  EventId as SmEventId,
  GuardFn,
  ActionFn,
  TransitionDefinition,
  StateDefinition,
  StateMachineConfig,
  StateMachineInstance,
} from "./state-machine-utils";

// --- FSM Utilities ---
export {
  createFsm,
  createToggleFsm,
  createRequestFsm,
  createCountdownFsm,
  createLatchFsm,
  createDebounceFsm,
} from "./fsm-utils";
export type {
  StateId as FsmStateId,
  EventId as FsmEventId,
  FsmTransition,
  FsmState,
  FsmConfig,
  FsmInstance,
} from "./fsm-utils";
// --- Scheduler Utilities ---
export {
  debounce,
  throttle,
  rafLoop,
  scheduleIdle,
  RateLimiter,
  createScheduler,
} from "./scheduler-utils";
export type {
  ScheduledJob,
  SchedulerInstance,
} from "./scheduler-utils";

// --- Cache Utilities ---
export {
  LRUCache,
  AsyncLRUCache,
  createTimedCache,
} from "./cache-utils";
export type {
  CacheEntry,
  CacheOptions,
  AsyncCacheOptions,
} from "./cache-utils";

// --- Event Bus Utilities ---
export {
  EventBus,
  getEventBus,
  destroyGlobalBus,
} from "./event-bus-utils";
export type {
  EventKey,
  EventHandler,
  EventMiddleware,
  Subscription,
  EventBusOptions,
} from "./event-bus-utils";
// --- Promise Utilities ---
export {
  retry,
  withTimeout,
  sleep,
  runConcurrent,
  processInBatches,
  raceSuccess,
  firstN,
  makeCancellable,
  collectAsync,
  mapAsyncIterable,
  filterAsyncIterable,
  reduceAsyncIterable,
  memoizeAsync,
  createDeferred,
  createOnceEvent,
  poll,
  TaskQueue,
} from "./promise-utils";
export type {
  RetryOptions,
  TimeoutOptions,
  ConcurrencyOptions,
  BatchOptions,
  MemoizeOptions,
  PollOptions,
  TaskQueueOptions,
} from "./promise-utils";

// --- Stream Utilities ---
export {
  readableFromAsync,
  readableFromArray,
  writableToArray,
  mapStream,
  filterStream,
  batchStream,
  flattenStream,
  throttleStream,
  dedupStream,
  pipeThrough,
  consumeStream,
  streamToIterable,
  iterableToStream,
  pipeToPromise,
  teeStream,
  textToStream,
  collectText,
  streamToArrayBuffer,
  streamToBlob,
  mergeStreams,
  concatStreams,
} from "./stream-utils";
export type {
  StreamOptions,
  TransformOptions,
} from "./stream-utils";

// --- Worker Utilities ---
export {
  createInlineWorker,
  createInlineModuleWorker,
  WorkerChannel,
  WorkerPool,
  isWorkerAvailable,
  isWorkerContext,
  getWorkerConcurrency,
} from "./worker-utils";
export type {
  WorkerMessage,
  WorkerResponse,
  WorkerPoolOptions,
  PooledTask,
} from "./worker-utils";
// --- Storage Utilities ---
export {
  StorageManager,
  createLocalStorage,
  createSessionStorage,
  createMemoryStore,
} from "./storage-utils";
export type {
  StorageBackend,
  StorageEntry,
  StorageOptions,
  StorageStats,
  StorageMigration,
} from "./storage-utils";

// --- i18n Utilities ---
export {
  LOCALES,
  getPluralForm,
  formatLocaleNumber,
  formatCurrency,
  formatRelativeTimeLocale,
  formatList,
  detectLocale,
  TranslationDict,
} from "./i18n-utils";
export type {
  LocaleConfig,
  LocaleCode,
  PluralRule,
} from "./i18n-utils";

// --- Theme Utilities ---
export {
  getSystemColorScheme,
  onSystemColorSchemeChange,
  prefersReducedMotion,
  prefersHighContrast,
  prefersLightColor,
  ThemeManager,
  generateDesignTokens,
  generateDarkTokens,
  createLightDarkTheme,
} from "./theme-utils";
export type {
  ThemeMode,
  DesignToken,
  ThemeDefinition,
  ThemeManagerConfig,
} from "./theme-utils";
// --- Accessibility Utilities ---
export {
  setAria,
  getAria,
  setRole,
  setAccessibleName,
  hideFromScreenReader,
  showToScreenReader,
  getFocusableElements,
  focusFirst,
  focusLast,
  isFocusable,
  createFocusTrap,
  setupRovingTabindex,
  announce,
  announceAssertive,
  contrastRatio,
  checkContrast,
  suggestTextColor,
  getHeadingHierarchy,
  validateHeadingHierarchy,
  findLandmarks,
  hasProperLandmarks,
  prefersReducedMotion as a11yPrefersReducedMotion,
  prefersHighContrast as a11yPrefersHighContrast,
  prefersDarkMode,
  prefersLightMode,
  onPreferenceChange,
  createSkipLink,
  openAccessibleModal,
} from "./accessibility-utils";
export type {
  ContrastResult,
  FocusableElement,
  HeadingInfo,
  LandmarkInfo,
} from "./accessibility-utils";

// --- DOM Utilities ---
export {
  createEl,
  div,
  span,
  p,
  btn,
  createSvg,
  $,
  $$,
  requireSelector,
  byId,
  byClass,
  byTag,
  walkUp,
  walkDown,
  nextSibling,
  prevSibling,
  siblings,
  siblingIndex,
  isLastChild,
  isFirstChild,
  empty,
  setChildren,
  insertAtIndex,
  moveToIndex,
  swapElements,
  wrap,
  unwrap,
  htmlToFragment,
  appendHtml,
  prependHtml,
  delegate,
  delegateClick,
  renderTemplate,
  renderInto,
} from "./dom-utils";
export type {
  CreateElementOptions,
  QueryOptions,
  DomDiffResult,
} from "./dom-utils";

// --- CSS Utilities ---
export {
  cssVar,
  setCssVar,
  getCssVar,
  setCssVars,
  removeCssVar,
  getAllCssVars,
  createStylesheet,
  injectCSS,
  removeInjectedCSS,
  addCSSRule,
  clearDynamicStyles,
  styleObjectToString,
  cssStringToObject,
  applyStyles,
  bem,
  createBem,
  cn,
  mergeClasses,
  BREAKPOINTS,
  mediaQuery,
  matchesMedia,
  isAtLeast,
  isBelow,
  subscribeMedia,
  subscribeBreakpoint,
  getCurrentBreakpoint,
  media,
  cssTransition,
  EASING_CSS,
  keyframes,
  ANIMATIONS,
  animateOnce,
  hexToRgb,
  rgbToHex,
  mixColors,
  transparentize,
  lightenColor,
  darkenColor,
  parseCssColor,
  pxToRem,
  remToPx,
  ensureUnit,
  cssClamp,
  fluidFontSize,
} from "./css-utils";
export type {
  BreakpointName,
} from "./css-utils";
// --- Network Utilities ---
export {
  getNetworkStatus,
  onNetworkChange,
  isSlowConnection,
  isDataSaverEnabled,
  fetchWithRetry,
  RequestQueue,
  syncWhenOnline,
  processOfflineQueue,
  BandwidthEstimator,
  ConnectionHealthChecker,
} from "./network-utils";
export type {
  NetworkStatus,
  RetryOptions as NetRetryOptions,
  RequestQueueItem,
} from "./network-utils";

// --- URL Utilities ---
export {
  parseUrl,
  buildUrlFromParts,
  updateSearchParams,
  removeSearchParams,
  getQueryParams,
  isSameOrigin,
  normalizeUrl,
  isAbsoluteUrl,
  makeAbsoluteUrl,
  getDomainFromUrl,
  getPathnameFromUrl,
  joinPathSegments,
  encodeUriComponentSafe,
  decodeUriComponentSafe,
  urlsEqual,
} from "./url-utils";
export type {
  ParsedUrl,
} from "./url-utils";

// --- Security Utilities ---
export {
  sanitizeHtml,
  isSafeUrl,
  escapeHtml,
  escapeJsString,
  generateCsrfToken,
  validateCsrfToken,
  setDoubleSubmitCookie,
  getDoubleSubmitCookie,
  validateOrigin,
  getActiveCsrfTokenCount,
  purgeExpiredCsrfTokens,
  buildCspHeader,
  parseCspHeader,
  generateCspNonce,
  formatCspViolationReport,
  reportCspViolation,
  detectSqlInjection,
  detectCommandInjection,
  detectPathTraversal,
  detectLdapInjection,
  validateInput,
  generateSecurityHeaders,
  headersToMetaTags,
  createSession,
  validateSession,
  destroySession,
  getSessionRemainingTime,
  detectConcurrentSessions,
  configureSecureCookie,
  applyFrameBusting,
  isFramed,
  detectUiRedressing,
  generateFrameAncestorsDirective,
  calculateSecurityScore,
  assessPassword,
  generateSecurePassword,
  checkPasswordBreach,
  logSecurityEvent,
  securityEvents,
  getAuditLog,
  exportAuditLog,
  sendAuditLog,
  clearAuditLog,
  getAuditLogSummary,
} from "./security-utils";
export type {
  SanitizeHtmlOptions,
  CsrfToken,
  CspDirectives,
  ValidationResult,
  SecurityHeaders,
  SecurityHeadersOptions,
  SessionInfo,
  SecurityScoreResult,
  SecurityCheckResult,
  PasswordStrengthResult,
  PasswordPolicyConfig,
  SecurityEventSeverity,
  SecurityAuditEvent,
} from "./security-utils";
// --- Logger Utilities ---
export {
  Logger,
  PerfTracker,
  getLogger,
  destroyLogger,
  createModuleLogger,
  textFormatter,
  jsonFormatter,
  compactFormatter,
} from "./logger-utils";
export type {
  LogLevel,
  LogEntry,
  LogTransport,
  LogFormatter,
  LoggerOptions,
} from "./logger-utils";

// --- Error Utilities ---
export {
  classifyError,
  isRetryable,
  enrichError,
  parseStackTrace,
  getAppFrame,
  createErrorBoundary,
  createErrorReporter,
  setupGlobalErrorHandler,
  createError,
  retryOnError,
} from "./error-utils";
export type {
  ErrorCategory,
  ErrorSeverity,
  ClassifiedError,
  ErrorBoundaryOptions,
  ErrorReport,
  ErrorReporterConfig,
  ParsedStackFrame,
} from "./error-utils";

// --- Metrics Utilities ---
export {
  Counter,
  Gauge,
  Histogram,
  Timer,
  MetricsRegistry,
  getMetricsRegistry,
  destroyMetricsRegistry,
  calculatePercentile,
} from "./metrics-utils";
export type {
  MetricBase,
  CounterMetric,
  GaugeMetric,
  HistogramMetric,
  TimerMetric,
  Metric,
  MetricsRegistryConfig,
} from "./metrics-utils";
// --- Testing Utilities ---
export {
  expect,
  doesNotThrow,
  spyOn,
  createMock,
  TestRunner,
  saveSnapshot,
  matchSnapshot,
  clearSnapshots,
  Assert,
  AssertionError,
} from "./testing-utils";
export type {
  TestFn,
  TestCase,
  TestSuite,
  TestResult,
  SuiteResult,
  AssertionContext,
  Spy,
} from "./testing-utils";

// --- Performance Utilities ---
export {
  PerfObserver,
  measureSync,
  measureAsync,
  perfMark,
  perfMeasure,
  measureBetween,
  FPSCounter,
  getMemoryUsage,
  getMemoryPercent,
  MemoryMonitor,
  LongTaskDetector,
  getNavigationTiming,
  collectWebVitals,
  getResourceTiming,
  findSlowResources,
  CustomMetric,
} from "./performance-utils";
export type {
  TimingResult,
  MemoryUsage,
  FPSStats,
  WebVitals,
  NavigationTiming,
} from "./performance-utils";

// --- Clipboard Utilities ---
export {
  copyToClipboard,
  copyRich,
  copyImage,
  copyFiles,
  readClipboardText,
  readClipboard,
  cutToClipboard,
  selectAll,
  selectRange,
  clearSelection,
  getSelectedText,
  getSelectionTarget,
  ClipboardHistory,
  detectClipboardFormats,
  hasImageInClipboard,
  hasFilesInClipboard,
  copyWithFeedback,
  copySelection,
  onClipboardChange,
  requestClipboardPermission,
  checkClipboardReadPermission,
  isClipboardSupported,
} from "./clipboard-utils";
export type {
  ClipboardData,
  CopyOptions,
  PasteOptions,
  PasteResult,
  ClipboardHistoryEntry,
  ClipboardHistoryOptions,
} from "./clipboard-utils";

// --- crypto-utils ---
export {
  sha1, sha256, sha384, sha512,
  hmacSha256, hmacSha384, hmacSha512,
  pbkdf2DeriveKey, pbkdf2DeriveBits,
  aesGcmEncrypt, aesGcmDecrypt,
  generateAesKey, importAesKey, exportAesKey,
  generateRsaKeyPair, rsaOaepEncrypt, rsaOaepDecrypt,
  importRsaPublicKey, importRsaPrivateKey, exportRsaPublicKey, exportRsaPrivateKey,
  generateEcdsaKeyPair, ecdsaSign, ecdsaVerify,
  importEcdsaPublicKey, importEcdsaPrivateKey, exportEcdsaPublicKey, exportEcdsaPrivateKey,
  generateRsaPssKeyPair, rsaPssSign, rsaPssVerify,
  importRsaPssPublicKey, importRsaPssPrivateKey, exportRsaPssPublicKey, exportRsaPssPrivateKey,
  generateEcdhKeyPair, ecdhDeriveKey, ecdhDeriveBits,
  importEcdhPublicKey, importEcdhPrivateKey, exportEcdhPublicKey, exportEcdhPrivateKey,
  importCryptoKey, exportCryptoKey, cryptoKeyFingerprint,
  getRandomBytes, getRandomInt, getRandomUuid, randomString as cryptoRandomString,
  utf8Encode, utf8Decode,
  base64EncodeUrlSafe, base64DecodeUrlSafe,
  hexEncodeBytes, hexDecodeBytes,
  estimatePasswordStrength, generateSecurePassword,
  generateApiKey, generateSessionId, generateToken,
} from "./crypto-utils";

// --- encoding-utils ---
export {
  base64Encode, base64Decode, base64UrlEncode, base64UrlDecode, base64Wrap,
  base32Encode, base32Decode,
  base58Encode, base58Decode,
  hexEncode, hexDecode, isHex,
  urlEncode, urlDecode, queryStringify, queryParse,
  parseUrl, type ParsedURL,
  normalizeUnicode, codePoints, isBMP, reverseUnicode,
  htmlEncode, htmlDecode,
  parseCSV, generateCSV,
  decodeBuffer, encodeBuffer, uint8ToBinaryString, binaryStringToUint8,
  decodeJWT, isJWTExpired, createUnsignedJWT,
  type JWTPayload, type DecodedJWT,
  formatBytes, parseBytes,
} from "./encoding-utils";

// --- string-utils ---
export {
  isBlank, isPresent, collapseWhitespace, stripDiacritics,
  escapeRegex, escapeHtmlEntities, unescapeHtmlEntities,
  toCamelCaseString, toPascalCaseString, toKebabCaseString, toSnakeCaseString,
  capitalizeWords, smartTruncate, repeatWithSeparator, centerPad,
  isAscii, looksLikeEmail, looksLikeUrl,
  extractNumbers, replaceMultiple, stringToId, countOccurrences,
  reverseWords, trimLines,
  detectCase, slugify,
  levenshtein, isSimilar, soundex,
  randomString, randomHex, generateId as stringGenerateId,
  wordCount, charFrequency, mostCommonChars, uniqueWords,
  pluralize, singularize, acronym, abbreviate,
  maskString, maskEmail,
  detectIndentation, indentText,
  simpleDiff, type DiffSegment,
} from "./string-utils";

// --- math-utils ---
export {
  mean, median, mode, variance, stddev, covariance, correlation,
  linearRegression, percentile,
  Vec2, Vec3, type Vector2D, type Vector3D,
  Matrix,
  dist2D, dist3D, angleBetweenPoints, pointInPolygon, polygonArea, polygonCentroid, boundingBox, lineIntersection,
  lerp, clamp, mapRange, smoothStep, bezierQuad, bezierCubic, catmullRom,
  gcd as mathGcd, lcm as mathLcm, isPrime, sieveOfEratosthenes, factorial, fibonacci, fibonacciSequence, combinations, permutations, modPow,
  angle, temperature, length: lengthConv, weight,
  randomNormal, randomUniform, randomInt, randomPick, shuffle, weightedRandom,
} from "./math-utils";

// --- date-utils ---
export {
  formatDate, toISODate, toISODatetime, formatTime,
  relativeTime, shortRelativeTime,
  parseDate,
  formatDuration, parseDuration,
  isLeapYear, daysInMonth, getDayOfWeek, getWeekNumber, getQuarter,
  isSameDay, isToday, isYesterday, isBetween,
  addTime, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  getTimezone, getTimezoneOffset, convertToTimezone,
  type DateFormatOptions, type RelativeTimeOptions,
} from "./date-utils";

// --- number-utils ---
export {
  clampNumber, lerpNumber, mapRangeNumber,
  roundTo, roundToMultiple, floorToMultiple, ceilToMultiple,
  formatBytesAuto, formatCompactNumber, formatWithSeparators,
  percentChange, approximatelyEqual,
  randomIntInRange, randomFloatInRange,
  normalizeAngleDeg, normalizeAngleRad, degToRad, radToDeg,
  gcd as numGcd, lcm as numLcm,
  isInRange, wrapNumber,
} from "./number-utils";

// --- array-utils ---
export {
  chunkArray, splitAt, partitionArray, slidingWindow,
  groupConsecutive, deepFlatten, uniqueBy,
  intersectArrays, differenceArrays, symmetricDifference,
  rotateArray, sampleArray, shuffleArray,
  zipArrays, fillArray, argMin, argMax,
} from "./array-utils";

// --- object-utils ---
export {
  deepClone as objDeepClone, shallowClone,
  pick, omit,
  deepMerge as objDeepMerge,
  get, set, has, unset,
  mapValues, mapKeys, filterEntries, invert,
  deepEqual as objDeepEqual,
  allKeys, isEmpty as objIsEmpty, size: objSize,
  deepFreeze as objDeepFreeze,
  groupBy, countBy, indexBy,
  values: objValues, keys: objKeys, toPairs, fromPairs,
  defaults, ensurePath,
} from "./object-utils";

// --- type-utils ---
export {
  isNil, isNotNil, isPlainObject, isNonEmptyString, isNumber, isInteger, isFinite as typeIsFinite,
  isBoolean, isFunction, isArray, isDate, isValidDate, isRegExp, isError, isPromise, isAsyncIterable, isIterable,
  toString, toNumber, toInt, toFloat, toBoolean, toArray,
  validateType, type SchemaValidationResult, type TypeSchema,
  getConstructorName, typeOf,
  deepClone as typeDeepClone, deepFreeze as typeDeepFreeze, deepMerge as typeDeepMerge,
} from "./type-utils";

// --- color-utils ---
export {
  parseColor as colorParseColor, requireColor,
  rgbToHex, hexToRgb, rgbToHsl, hslToRgb, rgbToHsv, hsvToHsl,
  toHexString, toRgbString, toHslString,
  lighten, darken, saturate, desaturate, rotateHue, setOpacity, mix, invert,
  luminance, contrastRatio, meetsAA, meetsAAA, contrastingText, minAlphaForContrast,
  generatePalette, complementary, analogous, triadic, splitComplementary, tetradic, generateScheme,
  linearGradient as cssLinearGradient, radialGradient as cssRadialGradient, gradientBetween, shimmerGradient,
  colorTemperature, isWarmColor, hueCategory,
  cssVariablesFromPalette, generateDesignTokens,
  type RGB, type HSL, type HSV, type ColorStop, type ColorPalette,
} from "./color-utils";

// --- svg-utils ---
export {
  getSvgNs, createSvgElement, createSvg, createSvgWithViewBox,
  setSvgAttrs, getSvgAttr, removeSvgAttr, toggleSvgAttr,
  rect: svgRect, circle: svgCircle, ellipse: svgEllipse, line: svgLine, polyline, polygon, path,
  PathBuilder, roundedRectPath, regularPolygonPath, starPath, smoothCurvePath, arcPath, pieSlicePath,
  text: svgText, tspan, multilineText,
  getOrCreateDefs, addLinearGradient, addRadialGradient, addPattern, addClipPath, addMask, addFilter,
  createDropShadowFilter, createBlurFilter,
  parseViewBox, getViewBox, setViewBox, zoomViewBox, panViewBox, screenToSvg, svgToScreen,
  appendChildren, insertBefore, removeElement, replaceElement, clearChildren, wrapSvgElement, cloneSvg, findByTag, findById,
  serializeSvg, svgToDataUrl, svgToBlob, downloadSvg, svgToPng, embedImages,
  getBBox, getBoundingClientRect: svgGetBoundingClientRect, getPathLength, getPointAtLength, isPointInFill, isPointInStroke,
  type SvgPoint, type SvgSize, type SvgRect, type GradientStop, type LinearGradientDef, type RadialGradientDef, type ViewBox,
} from "./svg-utils";

// --- canvas-utils ---
export {
  createCanvas, createOffscreenCanvas, getContext2D, resizeCanvas, clearCanvas, clearRect,
  applyDrawOptions, resetDrawOptions,
  drawRect, drawRoundedRect, drawCircle, drawEllipse, drawPolygon, drawStar, drawLine, drawPolyline, drawArrow,
  createLinearGradient, createRadialGradient, createConicGradient, GRADIENT_PRESETS,
  applyTextOptions, drawText, drawWrappedText, measureText, getTextBounds,
  drawImage, drawImageCover, drawImageContain, loadImage, canvasToBlob, canvasToDataURL, downloadCanvas,
  getPixelData, setPixelData, getPixel, setPixel, applyPixelFilter, applyImageFilters,
  withSavedContext, atPosition, atScale, rotateAround, flipHorizontal, flipVertical,
  LayerManager,
  drawCheckerboard, drawGrid, drawDots, drawStripes,
  pointInRect: canvasPointInRect, pointInCircle: canvasPointInCircle,
  hexToRgb: canvasHexToRgb, rgbToHex: canvasRgbToHex, parseColor as canvasParseColor, generateCanvasId,
  type Point2D, type Size2D, type Rect2D, type ColorStop as CanvasColorStop, type CanvasLayer, type DrawOptions, type TextDrawOptions, type ImageFilterOptions, type PixelData,
} from "./canvas-utils";

// --- animation-utils ---
export {
  easings, type EasingName,
  Tween, tween, tweenPromise,
  SpringAnimation, springTo,
  stagger, staggerFadeIn,
  scrollAnimate,
  parallax, mouseParallax,
  animate, fadeIn, fadeOut, slideUp, slideDown, scaleIn, shake, pulse,
  type TweenOptions, type SpringConfig, type AnimationFrame, type ScrollAnimationOptions,
} from "./animation-utils";

// --- geometry-utils ---
export {
  pt, addPoints, subPoints, scalePoint, distance, distanceSq, midpoint, angleTo, lerpPoint, rotatePoint, reflectPoint,
  rect: geomRect, rectCenter, rectCorners, pointInRect, rectsIntersect, rectIntersection, rectUnion, inflateRect, rectArea, rectPerimeter, rectAspectRatio, rectContainsRect,
  circle: geomCircle, pointInCircle, circlesIntersect, circleCircleIntersections, circleArea, circleCircumference, circleRectOverlap,
  pointToLineDistance, closestPointOnLine, lineSegmentIntersection, lineLength, lineBoundingBox,
  pointInPolygon, polygonArea, polygonCentroid, polygonBoundingBox, convexHull, simplifyPolyline,
  aabbOverlap, checkCollision,
  identityTransform, translateTransform, scaleTransform, rotateTransform, composeTransforms, transformPoint, invertTransform,
  pointsToPath, arcPath: geomArcPath, roundedRectPath: geomRoundedRectPath,
  SpatialHash,
  type Point, type Rect, type Circle, type Line, type Size, type Transform2D,
} from "./geometry-utils";

// --- physics-utils ---
export {
  Vec2,
  createBody, createStaticBody,
  gravityForce, windForce, dragForce, springForce,
  integrateSemiImplicitEuler, integrateVerlet,
  detectCircleCircle, detectAABB, detectPointPlane,
  resolveCollision,
  PhysicsWorld,
  ParticleEmitter,
  type Vector2 as PhysVector2, type BodyState, type Force, type CollisionPair, type PhysicsWorldOptions, type ParticleEmitterConfig,
} from "./physics-utils";

// --- form-utils ---
export {
  createForm, serializeForm, populateForm, clearForm,
  createMultiStepForm, evaluateConditionals,
  linkErrorToField, unlinkErrorFromField, createFormAnnouncer,
  type FormFieldConfig, type FormValidationRule, type FormFieldState, type FormOptions, type FormInstance,
  type StepConfig, type MultiStepFormOptions, type MultiStepFormInstance, type ConditionRule, type ConditionalField,
} from "./form-utils";

// --- validation-utils ---
export {
  isString as valIsString, isNumber as valIsNumber, isInteger as valIsInteger, isFiniteNumber, isObject as valIsObject, isArray as valIsArray, isValidDate, isBoolean, isFunction as valIsFunction, isNil, isNotNil, isEmpty, isMap, isSet, isPromise,
  isEmail, isURL, isUUID, isUUIDv4, isHexColor, isIPv4, isIPv6, isIP, isMACAddress, isCreditCard, detectCardBrand, isPhoneNumber, isISODate, isISODateTime, isJSON, matchesPattern, isLength, isArraySize, inRange, isOneOf, every: valEvery, some: valSome,
  validate, validateAsync,
  rules, assert, assertType,
  type ValidationResult, type ValidationError, type ValidationWarning, type ValidationRule, type FieldSchema, type ObjectSchema,
} from "./validation-utils";

// --- schema-utils ---
export {
  validateSchema, inferSchema, inferSchemaFromSamples, mergeSchemas, diffSchemas, schemaToTypeScript,
  SchemaRegistry, isAcceptedBySchema, atLeastOneRequired, conditionalSchema, extractPaths, getDefault,
  type SchemaType, type BaseSchema, type StringSchema, type NumberSchema, type BooleanSchema, type NullSchema, type ArraySchema, type ObjectSchema, type AnyOfSchema, type OneOfSchema, type AllOfSchema, type NotSchema, type RefSchema, type JsonSchema, type SchemaValidationError, type SchemaValidationResult, type SchemaDiff,
} from "./schema-utils";

// --- i18n-utils ---
export {
  I18nManager,
  getUserLanguage, getUserLanguages, matchLocale, resolveLocale,
  getPluralForm as i18nGetPluralForm,
  isRTL as i18nIsRtl, getDirection, applyDirection,
  formatNumber as i18nFormatNumber, formatCurrency as i18nFormatCurrency, formatPercent, formatCompactNumber,
  formatDateI18n, formatRelativeTime as i18nFormatRelativeTime,
  formatList as i18nFormatList,
  type I18nConfig, type TranslationEntry, type PluralForms,
} from "./i18n-utils";

// --- locale-utils ---
export {
  LOCALES, getLocale, getLocaleCodes, getRTLLocales, isLocaleRTL, getLocaleDisplayName,
  getTimezoneId, getTimezoneOffsetMinutes, getTimezoneAbbreviation, observesDST, COMMON_TIMEZONES,
  compareStrings, sortLocale, searchLocale,
  type LocaleInfo,
} from "./locale-utils";

// --- format-utils ---
export {
  // Re-export from the pre-written format-utils (already has i18n/locale helpers)
} from "./format-utils";
// --- event-utils ---
export {
  createCustomEvent,
  dispatchCustomEvent,
  onCustomEvent,
  throttleEvent,
  debounceEvent,
  once,
  waitForEvent,
  delegateEvent,
  preventDefault,
  stopPropagation,
  stopEvent,
} from "./event-utils";

// --- keyboard-utils ---
export {
  KEY_ALIASES,
  resolveKey,
  normalizeKeyEvent,
  eventMatchesBinding,
  HotkeyManager,
  KeySequenceDetector,
  RovingTabIndex,
  formatHotkey,
  parseHotkeyString,
  isTypingInInput,
} from "./keyboard-utils";
export type {
  ModifierKey,
  KeyBinding,
  KeySequence,
  NormalizedKeyEvent,
  KeyboardState,
  NavigationConfig,
} from "./keyboard-utils";

// --- gesture-utils ---
export {
  distance as gestureDistance,
  angleBetween,
  midpoint,
  getDirection,
  isInsideRect,
  isInsideElement,
  createTapDebounce,
  detectSwipe,
  GestureRecognizer,
} from "./gesture-utils";
export type {
  Point,
  SwipeGesture,
  PinchGesture,
  RotateGesture,
  TapGesture,
  LongPressGesture,
  PanGesture,
  Gesture,
  GestureConfig,
  GestureHandlers,
} from "./gesture-utils";
// --- dom-utils ---
export {
  createEl,
  div,
  span,
  p,
  btn,
  createSvg,
  $,
  $$,
  requireSelector,
  byId,
  byClass,
  byTag,
  walkUp,
  walkDown,
  nextSibling,
  prevSibling,
  siblings,
  siblingIndex,
  isLastChild,
  isFirstChild,
  empty,
  setChildren,
  insertAtIndex,
  moveToIndex,
  swapElements,
  wrap,
  unwrap,
  htmlToFragment,
  appendHtml,
  prependHtml,
  delegate,
  delegateClick,
  renderTemplate,
  renderInto,
} from "./dom-utils";
export type {
  CreateElementOptions,
  QueryOptions,
  DomDiffResult,
} from "./dom-utils";

// --- css-utils ---
export {
  cssVar,
  setCssVar,
  getCssVar,
  setCssVars,
  removeCssVar,
  getAllCssVars,
  createStylesheet,
  injectCSS,
  removeInjectedCSS,
  addCSSRule,
  clearDynamicStyles,
  styleObjectToString,
  cssStringToObject,
  applyStyles,
  bem,
  createBem,
  cn,
  mergeClasses,
  BREAKPOINTS,
  mediaQuery,
  matchesMedia,
  isAtLeast,
  isBelow,
  subscribeMedia,
  subscribeBreakpoint,
  getCurrentBreakpoint,
  media,
  cssTransition,
  EASING_CSS,
  keyframes,
  ANIMATIONS,
  animateOnce,
  hexToRgb,
  rgbToHex,
  mixColors,
  transparentize,
  lightenColor as cssLighten,
  darkenColor as cssDarken,
  parseCssColor,
  pxToRem,
  remToPx,
  ensureUnit,
  cssClamp,
  fluidFontSize,
} from "./css-utils";
export type { BreakpointName } from "./css-utils";

// --- storage-utils ---
export {
  StorageManager,
  createLocalStorage,
  createSessionStorage,
  createMemoryStore,
} from "./storage-utils";
export type {
  StorageBackend,
  StorageEntry,
  StorageOptions,
  StorageStats,
  StorageMigration,
} from "./storage-utils";
// --- network-utils ---
export {
  getNetworkStatus,
  onNetworkChange,
  isSlowConnection as netIsSlow,
  isDataSaverEnabled,
  fetchWithRetry,
  RequestQueue,
  syncWhenOnline,
  processOfflineQueue,
  BandwidthEstimator,
  ConnectionHealthChecker,
} from "./network-utils";
export type {
  NetworkStatus,
  RetryOptions as NetRetryOptions,
  RequestQueueItem,
} from "./network-utils";

// --- async-utils ---
export {
  retry,
  withTimeoutPromise,
  poll,
  runWithConcurrency,
  memoizeAsync,
  memoize,
  createDeferred,
  asyncIterate,
  batchProcess,
  allSuccessful,
  allOrThrow,
} from "./async-utils";
export type {
  RetryOptions as AsyncRetryOptions,
  PollOptions,
  ConcurrencyOptions,
  MemoizeOptions,
} from "./async-utils";

// --- browser-utils ---
export {
  detectBrowser,
  supportsFeature,
  getViewportSize,
  getDevicePixelRatio,
  isDarkMode,
  isLightMode,
  onColorSchemeChange,
  isPageVisible,
  onVisibilityChange,
  getConnectionInfo,
  isSlowConnection as browserIsSlow,
  getMemoryInfo,
} from "./browser-utils";
export type { BrowserInfo } from "./browser-utils";
// --- scroll-utils ---
export {
  getScrollPosition,
  setScrollPosition,
  scrollTo,
  scrollToElement,
  scrollToTop,
  scrollToBottom,
  trackScroll,
  createScrollSpy,
  createInfiniteScroll,
  createParallax,
  lockScroll,
  createProgressBar,
  isAtTop,
  isAtBottom,
  getScrollPercent,
} from "./scroll-utils";
export type {
  ScrollPosition,
  ScrollSpyOptions,
  InfiniteScrollOptions,
  ParallaxOptions,
  ScrollLockOptions,
} from "./scroll-utils";

// --- clipboard-utils ---
export {
  requestClipboardPermission,
  checkClipboardReadPermission,
  isClipboardSupported,
  copyToClipboard,
  copyRich,
  copyImage,
  copyFiles,
  readClipboardText,
  readClipboard,
  cutToClipboard,
  selectAll,
  selectRange,
  clearSelection,
  getSelectedText,
  getSelectionTarget,
  ClipboardHistory,
  detectClipboardFormats,
  hasImageInClipboard,
  hasFilesInClipboard,
  copyWithFeedback,
  copySelection,
  onClipboardChange,
} from "./clipboard-utils";
export type {
  ClipboardData,
  CopyOptions,
  PasteOptions,
  PasteResult,
  ClipboardHistoryEntry,
  ClipboardHistoryOptions,
} from "./clipboard-utils";

// --- drag-utils ---
export {
  makeDraggable,
  DropZoneManager,
  createSortable,
} from "./drag-utils";
export type {
  DragData,
  DragOptions,
  DropZone,
  SortableConfig,
} from "./drag-utils";
// --- modal-utils ---
export {
  createModal,
  createFocusTrap,
} from "./modal-utils";
export type {
  ModalSize,
  ModalOptions,
  ModalInstance,
  FocusTrapConfig,
} from "./modal-utils";

// --- tooltip-utils ---
export {
  createTooltip,
} from "./tooltip-utils";
export type {
  TooltipPlacement,
  TooltipTrigger,
  TooltipOptions,
  TooltipInstance,
} from "./tooltip-utils";

// --- transition-utils ---
export {
  easings,
  cssTransition as transCssTransition,
  fadeTo,
  fadeIn,
  fadeOut,
  slideBy,
  runClassTransition,
  runLeaveTransition,
  flip,
  staggerEnter,
  staggerLeave,
  createTransitionGroup,
  layoutTransition,
} from "./transition-utils";
export type {
  EasingFunction,
  TransitionOptions as TransOptions,
  ClassTransitionConfig,
  TransitionGroupOptions,
} from "./transition-utils";
// --- notification-utils ---
export {
  NotificationManager,
} from "./notification-utils";
export type {
  NotificationType,
  NotificationPosition,
  NotificationOptions,
  NotificationInstance,
  NotificationManagerConfig,
} from "./notification-utils";

// --- table-utils ---
export {
  createTable,
} from "./table-utils";
export type {
  TableSize,
  TableVariant,
  TableColumn,
  TableRow,
  TableOptions,
  TableInstance,
} from "./table-utils";

// --- tree-utils ---
export {
  createTree,
} from "./tree-utils";
export type {
  TreeNode,
  TreeSelectionMode,
  TreeCheckboxMode,
  TreeExpandMode,
  TreeOptions,
  TreeInstance,
} from "./tree-utils";
// --- virtual-list-utils ---
export {
  createVirtualList,
} from "./virtual-list-utils";
export type {
  VirtualListItem,
  VirtualListOptions,
  VirtualListInstance,
} from "./virtual-list-utils";

// --- splitter-utils ---
export {
  createSplitter,
} from "./splitter-utils";
export type {
  SplitterOrientation,
  SplitterUnit,
  SplitterPane,
  SplitterOptions,
  SplitterInstance,
} from "./splitter-utils";

// --- tabs-utils ---
export {
  createTabs,
} from "./tabs-utils";
export type {
  TabOrientation,
  TabActivation,
  TabItem,
  TabsOptions,
  TabsInstance,
} from "./tabs-utils";
// --- command-palette-utils ---
export {
  createCommandPalette,
} from "./command-palette-utils";
export type {
  PaletteItem,
  CommandPaletteOptions,
  CommandPaletteInstance,
} from "./command-palette-utils";

// --- avatar-utils ---
export {
  createAvatar,
  createAvatarGroup,
  generateAvatarColor,
  getInitials,
} from "./avatar-utils";
export type {
  AvatarSize,
  AvatarShape,
  AvatarOptions,
  AvatarGroupOptions,
} from "./avatar-utils";

// --- markdown-utils ---
export {
  parseMarkdown,
  renderMarkdown,
  extractHeadings,
  generateToc,
  extractCodeBlocks,
  extractNamedBlock,
} from "./markdown-utils";
export type {
  MarkdownOptions,
  HeadingInfo,
} from "./markdown-utils";
// --- chart-utils ---
export {
  calculateAxisScale,
  formatAxisLabel,
  valueToPixel,
  pixelToValue,
  aggregateByInterval,
  movingAverage,
  calculatePercentChanges,
  findExtrema,
  generateChartColors,
  interpolateColor,
  getDataStats,
} from "./chart-utils";
export type {
  DataPoint,
  DataSeries,
  ChartConfig,
  AxisScale,
  ColorPaletteName,
  DataStats as ChartDataStats,
} from "./chart-utils";

// --- calendar-utils ---
export {
  createCalendar,
} from "./calendar-utils";
export type {
  CalendarView,
  SelectionMode,
  CalendarEvent,
  CalendarOptions,
  CalendarInstance,
} from "./calendar-utils";

// --- rating-utils ---
export {
  createRating,
} from "./rating-utils";
export type {
  RatingIconType,
  RatingOptions,
  RatingInstance,
} from "./rating-utils";
// --- progress-utils ---
export {
  createProgressBar,
  updateProgressBar,
  createCircularProgress,
  createStepProgress,
} from "./progress-utils";
export type {
  ProgressBarVariant,
  ProgressBarSize,
  ProgressBarOptions,
  CircularProgressOptions,
  StepProgressOptions,
} from "./progress-utils";

// --- badge-utils ---
export {
  createBadge,
  createDotBadge,
  createTag,
} from "./badge-utils";
export type {
  BadgeVariant,
  BadgeSize,
  DotPosition,
  BadgeOptions,
  DotBadgeOptions,
  TagOptions,
} from "./badge-utils";

// --- skeleton-utils ---
export {
  createSkeleton,
  createSkeletonBlock,
  createCardSkeleton,
  createTableSkeleton,
} from "./skeleton-utils";
export type {
  SkeletonVariant,
  SkeletonSize,
  SkeletonOptions,
  SkeletonBlockOptions,
} from "./skeleton-utils";
// --- Batch 1235: Form, Input, Select ---
export {
  createForm,
  serializeForm,
  populateForm,
  clearForm,
  createMultiStepForm,
  evaluateConditionals,
  linkErrorToField,
  unlinkErrorFromField,
  createFormAnnouncer,
} from "./form-utils";
export type {
  FormFieldConfig,
  FormValidationRule,
  FormFieldState,
  FormOptions,
  FormInstance,
  StepConfig,
  MultiStepFormOptions,
  MultiStepFormInstance,
  ConditionRule,
  ConditionalField,
} from "./form-utils";

export {
  createInput,
  createSearchInput,
  createPasswordInput,
  createNumberInput,
} from "./input-utils";
export type {
  InputOptions,
  InputInstance,
  SearchInputOptions,
  SearchInputInstance,
  PasswordInputOptions,
  PasswordInputInstance,
  NumberInputOptions,
  NumberInputInstance,
} from "./input-utils";

export { createSelect } from "./select-utils";
export type {
  SelectOption,
  SelectGroup,
  SelectOptions,
  SelectInstance,
} from "./select-utils";
// --- Batch 1236: Checkbox, Radio, Toggle ---
export { createCheckbox, createCheckboxGroup } from "./checkbox-utils";
export type {
  CheckboxOption,
  CheckboxOptions,
  CheckboxGroupOptions,
  CheckboxInstance,
  CheckboxGroupInstance,
} from "./checkbox-utils";

export { createRadioGroup } from "./radio-utils";
export type {
  RadioOption,
  RadioGroupOptions,
  RadioInstance,
} from "./radio-utils";

export {
  createToggleButton,
  createIconToggle,
  createPressHoldToggle,
  createLoadingToggle,
} from "./toggle-utils";
export type {
  ToggleButtonOptions,
  IconToggleOptions,
  PressHoldToggleOptions,
  LoadingToggleOptions,
} from "./toggle-utils";
// --- Batch 1237: Slider, Color Picker, Date Picker ---
export { createSlider } from "./slider-utils";
export type {
  SliderOptions,
  SliderInstance,
} from "./slider-utils";

export {
  parseColor,
  hslToRgb,
  rgbToHsl,
  rgbToHex,
  formatColor,
  createColorPicker,
} from "./color-picker-utils";
export type {
  ColorValue,
  ColorFormat,
  ColorPreset,
  ColorPickerOptions,
  ColorPickerInstance,
} from "./color-picker-utils";

export { createDatePicker } from "./date-picker-utils";
export type {
  DatePickerOptions,
  DatePickerInstance,
} from "./date-picker-utils";
// --- Batch 1238: Time Picker, Upload, File Tree ---
export { createTimePicker } from "./time-picker-utils";
export type {
  TimeValue,
  TimePickerOptions,
  TimePickerInstance,
} from "./time-picker-utils";

export { createUpload } from "./upload-utils";
export type {
  UploadFileItem,
  UploadOptions,
  UploadInstance,
  FileItemWrapper,
} from "./upload-utils";

export { createFileTree } from "./file-tree-utils";
export type {
  FileTreeNode,
  TreeSelection,
  ContextMenuItem,
  FileTreeOptions,
  FileTreeInstance,
} from "./file-tree-utils";
// --- Batch 1239: Breadcrumb, Pagination, Empty State ---
export { createBreadcrumb } from "./breadcrumb-utils";
export type {
  BreadcrumbItem,
  BreadcrumbOptions,
  BreadcrumbInstance,
} from "./breadcrumb-utils";

export { createPagination } from "./pagination-utils";
export type {
  PaginationOptions,
  PaginationInstance,
} from "./pagination-utils";

export { createEmptyState } from "./empty-state-utils";
export type {
  EmptyStateOptions,
  EmptyStateType,
} from "./empty-state-utils";
// --- Batch 1240: Avatar Group, Statistics, Heatmap ---
export { createAvatarGroup } from "./avatar-group-utils";
export type {
  AvatarGroupItem,
  AvatarGroupOptions,
  AvatarGroupInstance,
} from "./avatar-group-utils";

export {
  createStatCard,
  createComparisonBar,
  createMiniChart,
} from "./statistics-utils";
export type {
  StatCardOptions,
  ComparisonBarOptions,
  MiniChartOptions,
} from "./statistics-utils";

export { createHeatmap } from "./heatmap-utils";
export type {
  HeatmapDataPoint,
  HeatmapOptions,
  HeatmapInstance,
  HeatmapColorScale,
} from "./heatmap-utils";
// --- Batch 1241: Timeline, Comment, Accordion ---
export { createTimeline } from "./timeline-utils";
export type {
  TimelineNode,
  TimelineOptions,
  TimelineInstance,
} from "./timeline-utils";

export { createCommentThread } from "./comment-utils";
export type {
  Comment,
  CommentAuthor,
  CommentAction,
  CommentThreadOptions,
  CommentThreadInstance,
} from "./comment-utils";

export { createAccordion } from "./accordion-utils";
export type {
  AccordionItem,
  AccordionOptions,
  AccordionInstance,
} from "./accordion-utils";
// --- Batch 1242: Drawer, Sheet, Context Menu ---
export { createDrawer } from "./drawer-utils";
export type {
  DrawerOptions,
  DrawerInstance,
} from "./drawer-utils";

export { createSheet } from "./sheet-utils";
export type {
  SheetOptions,
  SheetInstance,
} from "./sheet-utils";

export { createContextMenu } from "./context-menu-utils";
export type {
  ContextMenuItem,
  ContextMenuContext,
  ContextMenuOptions,
  ContextMenuInstance,
} from "./context-menu-utils";
// --- Batch 1243: Tabs, Alert, Toast ---
export { createTabs } from "./tabs-utils";
export type { TabsOptions, TabsInstance, TabItem } from "./tabs-utils";
export { createAlert } from "./alert-utils";
export type { AlertOptions, AlertInstance } from "./alert-utils";
export { createToastManager, showToast, getToastManager, destroyToastManager } from "./toast-utils";
export type { ToastOptions, ToastManagerConfig, ToastManagerInstance } from "./toast-utils";
// --- Batch 1244: Notification, Command Palette, Split View ---
export { NotificationManager } from "./notification-utils";
export type { NotificationOptions, NotificationInstance, NotificationManagerConfig, NotificationType, NotificationPosition } from "./notification-utils";
export { createCommandPalette } from "./command-palette-utils";
export type { CommandPaletteOptions, CommandPaletteInstance, PaletteItem } from "./command-palette-utils";
export { createSplitView } from "./split-view-utils";
export type { SplitViewOptions, SplitViewInstance, SplitPaneConfig, SplitDirection, SplitCollapseMode } from "./split-view-utils";
// --- Batch 1245: Tooltip, Popover, Modal ---
export { createTooltip } from "./tooltip-utils";
export type { TooltipOptions, TooltipInstance, TooltipPlacement, TooltipTrigger } from "./tooltip-utils";
export { createPopover } from "./popover-utils";
export type { PopoverOptions, PopoverInstance, PopoverPlacement, PopoverTrigger, VirtualElement } from "./popover-utils";
export { createModal, createFocusTrap } from "./modal-utils";
export type { ModalOptions, ModalInstance, ModalSize, FocusTrapConfig } from "./modal-utils";
// --- Batch 1246: Stepper, Tour, Skeleton Screen ---
export { createStepper } from "./stepper-utils";
export type { StepperOptions, StepperInstance, StepItem, StepperOrientation, StepStatus } from "./stepper-utils";
export { createTour } from "./tour-utils";
export type { TourOptions, TourInstance, TourStep } from "./tour-utils";
export { createSkeletonScreen } from "./skeleton-screen-utils";
export type { SkeletonScreenOptions, SkeletonScreenInstance, SkeletonLayout, SkeletonBlock } from "./skeleton-screen-utils";
// --- Batch 1247: Carousel, Masonry, Virtual Scroller ---
export { createCarousel } from "./carousel-utils";
export type { CarouselOptions, CarouselInstance, CarouselSlide, CarouselTransition, CarouselNavStyle } from "./carousel-utils";
export { createMasonry } from "./masonry-utils";
export type { MasonryOptions, MasonryInstance, MasonryItem } from "./masonry-utils";
export { createVirtualScroller } from "./virtual-scroller-utils";
export type { VirtualScrollerOptions, VirtualScrollerInstance, VirtualItem } from "./virtual-scroller-utils";
// --- Batch 1248: Infinite Scroll, Lazy Load, Intersection ---
export { createInfiniteScroll } from "./infinite-scroll-utils";
export type { InfiniteScrollOptions, InfiniteScrollInstance } from "./infinite-scroll-utils";
export { createLazyLoad } from "./lazy-load-utils";
export type { LazyLoadOptions, LazyLoadInstance, LazyLoadTarget, LazyLoadState } from "./lazy-load-utils";
export { EnhancedIntersectionObserver, createVisibilityTracker, createLazyLoad as createSimpleLazyLoad, createScrollTrigger, isInViewport, getViewportVisibility, whenInViewport, batchScrollTriggers } from "./intersection-utils";
export type { IntersectionEntry, ObserverConfig, VisibilityInstance, LazyLoadOptions as SimpleLazyLoadOptions, ScrollTriggerOptions } from "./intersection-utils";
// --- Batch 1249: Drag-Drop, Sortable, Resize ---
export { createDraggable, createSortable, createDropZone } from "./drag-drop-utils";
export type { DraggableOptions, DraggableInstance, DropZoneOptions, DropZoneInstance, SortableOptions, SortableInstance, DragData, DragEvent, DragAxis, DragConstraint } from "./drag-drop-utils";
export { createSortableList } from "./sortable-utils";
export type { SortableListOptions, SortableListInstance, SortableItemConfig, SortAnimation } from "./sortable-utils";
export { EnhancedResizeObserver, BreakpointTracker, ViewportTracker, createResizeHandle, clamp, isResizeObserverSupported, getElementSize, hasOverflow, matchMedia, onMediaChange } from "./resize-utils";
export type { ResizeEntry, ResizeObserverConfig, Breakpoint, ViewportState, ResizeHandleOptions } from "./resize-utils";
// --- Batch 1250: Anchor, Scroll Spy, Sticky ---
export { createAnchor } from "./anchor-utils";
export type { AnchorOptions, AnchorInstance, AnchorResult, AnchorPlacement, AnchorAlignment } from "./anchor-utils";
export { createScrollSpy } from "./scroll-spy-utils";
export type { ScrollSpyOptions, ScrollSpyInstance, SpySection } from "./scroll-spy-utils";
export { createSticky, createStickyStack } from "./sticky-utils";
export type { StickyOptions, StickyInstance, StickyPosition, StickyBehavior, StickyStackOptions, StickyStackInstance } from "./sticky-utils";
// --- Batch 1251: Rating, Review, Testimonial ---
export { createRating } from "./rating-utils";
export type { RatingOptions, RatingInstance, RatingIconType } from "./rating-utils";
export { createReviewCard, createReviewList } from "./review-utils";
export type { ReviewCardOptions, ReviewCardInstance, Review, ReviewAuthor, ReviewMedia, ReviewListOptions, ReviewListInstance } from "./review-utils";
export { createTestimonials } from "./testimonial-utils";
export type { TestimonialOptions, TestimonialInstance, Testimonial, TestimonialAuthor, TestimonialLayout } from "./testimonial-utils";
// --- Batch 1252: Countdown, Count-Up, Timer ---
export { createCountdown } from "./countdown-utils";
export type { CountdownOptions, CountdownInstance, CountdownRemaining, CountdownUnit, CountdownStyle, CountdownSize } from "./countdown-utils";
export { createCountUp } from "./countup-utils";
export type { CountUpOptions, CountUpInstance, LapTime, CountUpUnit, CountUpPrecision } from "./countup-utils";
export { createTimer } from "./timer-utils";
export type { TimerOptions, TimerInstance, TimerMode, TimerState, TimerSession } from "./timer-utils";
// --- Batch 1253: Confetti, Marquee, Typing Indicator ---
export { createConfetti } from "./confetti-utils";
export type { ConfettiOptions, ConfettiInstance, Particle, ConfettiShape, ConfettiOrigin } from "./confetti-utils";
export { createMarquee } from "./marquee-utils";
export type { MarqueeOptions, MarqueeInstance, MarqueeDirection, MarqueeFillMode } from "./marquee-utils";
export { createTypingIndicator, createTextReveal } from "./typing-indicator-utils";
export type { TypingIndicatorOptions, TextRevealOptions, TextRevealInstance, TypingStyle, TypingSize } from "./typing-indicator-utils";
// --- Badge/Card Utilities ---
export {
  createCard,
  createBadge,
  type BadgeOptions,
  type BadgePosition,
  type BadgeVariant,
  type CardLayout,
  type CardSize,
  type CardAction,
  type CardMedia,
  type CardStatsItem,
  type CardOptions,
  type CardInstance,
} from "./badge-card-utils";

// --- Price Tag Utilities ---
export {
  createPriceTag,
  createTieredPricing,
  formatCurrency,
  calculateSavings,
  type CurrencyCode,
  type CurrencyConfig,
  type PriceStyle,
  type DiscountType,
  type PeriodUnit,
  type PriceTagOptions,
  type PriceTagInstance,
  type TieredPrice,
  type TieredPricingOptions,
  type TieredPricingInstance,
} from "./price-tag-utils";

// --- Status Dot Utilities ---
export {
  createStatusDot,
  createStatusList,
  type StatusDotVariant,
  type StatusDotSize,
  type StatusDotShape,
  type StatusDotPosition,
  type StatusDotOptions,
  type StatusDotInstance,
  type StatusListItem,
  type StatusListOptions,
  type StatusListInstance,
} from "./status-dot-utils";
// --- Avatar Utilities ---
export {
  createAvatar,
  createAvatarGroup,
  generateAvatarColor,
  getInitials as getAvatarInitials,
  type AvatarOptions,
  type AvatarGroupOptions,
  type AvatarSize,
  type AvatarShape,
} from "./avatar-utils";

// --- Initials Utilities ---
export {
  createInitials,
  createInitialsGroup,
  getInitials,
  getFullInitials,
  getAbbreviation,
  hashString,
  getColorForString,
  getContrastColor,
  type InitialsOptions,
  type InitialsGroupOptions,
  type InitialsStyle,
  type InitialsSize,
} from "./initials-utils";

// --- Chip Utilities ---
export {
  createChip,
  createChipSet,
  type ChipConfig,
  type ChipSetOptions,
  type ChipSetInstance,
  type ChipType,
  type ChipSize,
  type ChipColor,
} from "./chip-utils";
// --- Tag Utilities ---
export {
  createTag,
  createTagInput,
  createTagCloud,
  type TagOptions,
  type TagInputOptions,
  type TagInputInstance,
  type TagCloudOptions,
  type TagVariant,
  type TagSize,
  type TagShape,
} from "./tag-utils";

// --- Label Utilities ---
export {
  // (re-exported from label-utils.ts — pre-written)
} from "./label-utils";

// --- Badge Utilities ---
export {
  createBasicBadge,
  createNotificationBadge,
  createProgressBadge,
  createVerificationBadge,
  createMilestoneBadge,
  type BaseBadgeOptions,
  type NotificationBadgeOptions,
  type ProgressBadgeOptions,
  type VerificationBadgeOptions,
  type MilestoneBadgeOptions,
} from "./badge-utils";
// --- Progress Utilities ---
export {
  createProgressBar,
  updateProgressBar,
  createCircularProgress,
  createStepProgress,
  type ProgressBarOptions,
  type CircularProgressOptions,
  type StepProgressOptions,
  type ProgressBarVariant,
  type ProgressBarSize,
} from "./progress-utils";

// --- Skeleton Utilities ---
export {
  createSkeleton,
  createSkeletonBlock,
  createCardSkeleton,
  createTableSkeleton,
  type SkeletonOptions,
  type SkeletonBlockOptions,
  type SkeletonVariant,
  type SkeletonSize,
} from "./skeleton-utils";

// --- Empty State Utilities ---
export {
  createEmptyState,
  type EmptyStateOptions,
  type EmptyStateType,
} from "./empty-state-utils";
// --- Accordion Utilities ---
export {
  createAccordion,
  type AccordionOptions,
  type AccordionInstance,
  type AccordionItem,
  type AccordionMode,
} from "./accordion-utils";

// --- Collapse Utilities ---
export {
  createCollapse,
  createCollapseGroup,
  type CollapseOptions,
  type CollapseInstance,
  type CollapseGroupOptions,
  type CollapseGroupInstance,
  type CollapseEasing,
  type CollapseState,
} from "./collapse-utils";

// --- Disclosure Utilities ---
export {
  // (re-exported from disclosure-utils.ts — pre-written)
} from "./disclosure-utils";
// --- Tab Bar Utilities ---
export {
  createTabBar,
  type TabBarOptions,
  type TabBarInstance,
  type TabBarItem,
  type TabBarPosition,
  type TabBarStyle,
  type TabBarSize,
} from "./tab-bar-utils";

// --- Pills Utilities ---
export {
  createPills,
  type PillsOptions,
  type PillsInstance,
  type PillItem,
  type PillVariant,
  type PillSize,
  type PillMode,
} from "./pills-utils";
// --- Breadcrumb Utilities ---
export {
  createBreadcrumb,
  type BreadcrumbOptions,
  type BreadcrumbInstance,
  type BreadcrumbItem,
} from "./breadcrumb-utils";

// --- Pagination Utilities ---
export {
  createPagination,
  type PaginationOptions,
  type PaginationInstance,
  type PaginationSize,
  type PaginationLayout,
} from "./pagination-utils";

// --- Page Navigation Utilities ---
export {
  createPageNav,
  createTableOfContents,
  type PageNavOptions,
  type PageNavInstance,
  type PageNavItem,
  type TableOfContentsOptions,
  type TableOfContentsInstance,
  type TocItem,
  type PageNavStyle,
  type PageNavSize,
} from "./page-nav-utils";
// --- Navbar Utilities ---
export {
  createNavbar,
  type NavbarOptions,
  type NavbarInstance,
  type NavItem,
  type UserMenuConfig,
  type SearchConfig,
  type NavbarStyle,
  type NavbarSize,
} from "./navbar-utils";

// --- Sidebar Utilities ---
export {
  createSidebar,
  type SidebarOptions,
  type SidebarInstance,
  type SidebarItem,
  type SidebarSection,
  type SidebarPosition,
  type SidebarVariant,
  type SidebarCollapseMode,
} from "./sidebar-utils";

// --- Footer Utilities ---
export {
  createFooter,
  type FooterOptions,
  type FooterInstance,
  type FooterColumn,
  type SocialLink,
  type NewsletterOptions,
  type FooterLayout,
  type FooterSize,
} from "./footer-utils";
// --- Dropdown Menu Utilities ---
export {
  createDropdown,
  type DropdownOptions,
  type DropdownInstance,
  type DropdownItem,
  type DropdownPlacement,
  type TriggerMode,
} from "./dropdown-menu-utils";

// --- Context Menu Utilities ---
export {
  createContextMenu,
  type ContextMenuOptions,
  type ContextMenuInstance,
  type ContextMenuItem,
  type ContextMenuContext,
} from "./context-menu-utils";

// --- Command Menu Utilities ---
export {
  createCommandMenu,
  type CommandMenuOptions,
  type CommandMenuInstance,
  type CommandMenuItem as CmdMenuItem,
} from "./command-menu-utils";
// --- Alert Dialog ---
export {
  createAlertDialog,
  type AlertDialogOptions,
  type AlertDialogInstance,
  type AlertDialogType,
  type AlertDialogSize,
  type AlertDialogButton,
} from "./alert-dialog-utils";

// --- Modal Dialog ---
export {
  createModal,
  type ModalOptions,
  type ModalInstance,
  type ModalSize,
  type ModalVariant,
  type ModalHeaderOptions,
  type ModalFooterButton,
} from "./modal-dialog-utils";

// --- Drawer ---
export {
  createDrawer,
  type DrawerOptions,
  type DrawerInstance,
  type DrawerSide,
  type DrawerSize,
} from "./drawer-utils";
// --- Toast ---
export {
  createToastManager,
  getToastManager,
  destroyToastManager,
  showToast,
  type ToastOptions,
  type ToastManagerConfig,
  type ToastManagerInstance,
  type ToastPosition,
  type ToastType,
} from "./toast-utils";

// --- Tooltip ---
export {
  createTooltip,
  type TooltipOptions,
  type TooltipInstance,
  type TooltipPlacement,
  type TooltipTrigger,
} from "./tooltip-utils";

// --- Popover ---
export {
  createPopover,
  type PopoverOptions,
  type PopoverInstance,
  type PopoverPlacement,
  type PopoverTrigger,
  type VirtualElement,
} from "./popover-utils";
// --- Sheet ---
export {
  createSheet,
  type SheetOptions,
  type SheetInstance,
  type SheetSide,
  type SheetSize,
} from "./sheet-utils";

// --- Lightbox ---
export {
  createLightbox,
  type LightboxOptions,
  type LightboxInstance,
  type LightboxImage,
  type LightboxZoomMode,
} from "./lightbox-utils";

// --- Tour ---
export {
  createTour,
  type TourOptions,
  type TourInstance,
  type TourStep,
} from "./tour-utils";
// --- Notification Center ---
export {
  createNotificationCenter,
  type NotificationCenterOptions,
  type NotificationCenterInstance,
  type NotificationItem,
  type NotificationType,
  type NotificationPriority,
} from "./notification-center-utils";

// --- Loading Overlay ---
export {
  createLoadingOverlay,
  type LoadingOverlayOptions,
  type LoadingOverlayInstance,
  type OverlayVariant,
  type SpinnerType,
} from "./loading-overlay-utils";

// --- Split View ---
export {
  createSplitView,
  type SplitViewOptions,
  type SplitViewInstance,
  type SplitDirection,
  type SplitCollapseMode,
  type SplitPaneConfig,
} from "./split-view-utils";
// --- Carousel ---
export {
  createCarousel,
  type CarouselOptions,
  type CarouselInstance,
  type CarouselSlide,
  type CarouselTransition,
  type CarouselNavStyle,
} from "./carousel-utils";

// --- Timeline ---
export {
  createTimeline,
  type TimelineOptions,
  type TimelineInstance,
  type TimelineNode,
  type TimelineVariant,
  type TimelineSide,
} from "./timeline-utils";

// --- Tree View ---
export {
  createTreeView,
  type TreeViewOptions,
  type TreeViewInstance,
  type TreeNode,
} from "./tree-view-utils";
// --- Masonry ---
export {
  createMasonry,
  type MasonryOptions,
  type MasonryInstance,
  type MasonryItem,
} from "./masonry-utils";

// --- Color Picker ---
export {
  createColorPicker,
  parseColor,
  hslToRgb,
  rgbToHsl,
  rgbToHex,
  formatColor,
  type ColorPickerOptions,
  type ColorPickerInstance,
  type ColorValue,
  type ColorPreset,
  type ColorFormat,
} from "./color-picker-utils";

// --- Date Picker ---
export {
  createDatePicker,
  type DatePickerOptions,
  type DatePickerInstance,
  type DatePickerSize,
  type DatePickerVariant,
} from "./date-picker-utils";
// --- Dropzone ---
export {
  createDropzone,
  type DropzoneOptions,
  type DropzoneInstance,
  type DropzoneFile,
  type DropzoneVariant,
  type FileValidationError,
} from "./dropzone-utils";

// --- Rating ---
export {
  createRating,
  type RatingOptions,
  type RatingInstance,
  type RatingIconType,
} from "./rating-utils";

// --- Slider Input ---
export {
  createSlider,
  type SliderOptions,
  type SliderInstance,
  type SliderOrientation,
  type SliderTrackStyle,
} from "./slider-input-utils";
// --- Signature Pad ---
export {
  createSignaturePad,
  type SignaturePadOptions,
  type SignaturePadInstance,
  type SignatureStroke,
  type StrokePoint,
  type PenColor,
  type PenWidth,
} from "./signature-pad-utils";

// --- Cropper ---
export {
  createCropper,
  type CropperOptions,
  type CropperInstance,
  type CropRect,
  type CropAspectRatio,
} from "./cropper-utils";

// --- Avatar Crop ---
export {
  createAvatarCrop,
  type AvatarCropOptions,
  type AvatarCropInstance,
} from "./avatar-crop-utils";
// --- Form Validator ---
export {
  createFormValidator,
  type FormValidatorOptions,
  type FormValidatorInstance,
  type FieldConfig,
  type FieldRule,
  type ValidationResult,
} from "./form-validator-utils";

// --- Markdown Editor ---
export {
  createMarkdownEditor,
  type MarkdownEditorOptions,
  type MarkdownEditorInstance,
} from "./markdown-editor-utils";

// --- Chart Utilities ---
export {
  calculateAxisScale,
  formatAxisLabel,
  valueToPixel,
  pixelToValue,
  aggregateByInterval,
  movingAverage,
  calculatePercentChanges,
  findExtrema,
  generateChartColors,
  interpolateColor,
  getDataStats,
  type DataPoint,
  type DataSeries,
  type ChartConfig,
  type AxisScale,
  type ColorPaletteName,
  type DataStats,
} from "./chart-utils";
// --- Data Grid ---
export { createDataGrid } from "./data-grid-utils";
export type { ColumnDef, DataGridOptions, DataGridInstance, SortDirection, ColumnAlign } from "./data-grid-utils";

// --- Virtual List ---
export { createVirtualList } from "./virtual-list-utils";
export type { VirtualListItem, VirtualListOptions, VirtualListInstance } from "./virtual-list-utils";

// --- Keyboard Shortcuts ---
export { createKeyboardShortcuts } from "./keyboard-shortcuts-utils";
export type { ShortcutBinding, ShortcutGroup, KeyboardShortcutsOptions, KeyboardShortcutsInstance, ModifierKey, ShortcutScope } from "./keyboard-shortcuts-utils";
// --- Context Menu ---
export { createContextMenu } from "./context-menu-utils";
export type { ContextMenuItem, ContextMenuOptions, ContextMenuInstance, ContextMenuContext } from "./context-menu-utils";

// --- Command Palette ---
export { createCommandPalette } from "./command-palette-utils";
export type { PaletteItem, CommandPaletteOptions, CommandPaletteInstance } from "./command-palette-utils";

// --- Autocomplete ---
export { createAutocomplete } from "./autocomplete-utils";
export type { AutocompleteItem, AutocompleteOptions, AutocompleteInstance } from "./autocomplete-utils";
// --- Resizable ---
export { createResizable } from "./resizable-utils";
export type { ResizableOptions, ResizableInstance, ResizeEdge } from "./resizable-utils";

// --- Draggable ---
export { createDraggable } from "./draggable-utils";
export type { DraggableOptions, DraggableInstance, DragAxis, DragConstraints, SnapConfig, DropZone } from "./draggable-utils";

// --- Sortable ---
export { createSortableList } from "./sortable-utils";
export type { SortableListOptions, SortableListInstance, SortableItemConfig, SortAnimation } from "./sortable-utils";
// --- Anchor Positioning ---
export { createAnchorPosition } from "./anchor-positioning-utils";
export type { AnchorOptions, AnchorInstance, AnchorPlacement, AnchorComputeData, AutoFlipStrategy, OverflowBoundary } from "./anchor-positioning-utils";

// --- Flipper ---
export { createFlipper } from "./flipper-utils";
export type { FlipperOptions, FlipperInstance, FlipSide, FlipDirection, FlipEasing } from "./flipper-utils";

// --- Marquee ---
export { createMarquee } from "./marquee-utils";
export type { MarqueeOptions, MarqueeInstance, MarqueeDirection, MarqueeFillMode } from "./marquee-utils";
// --- Scroll Spy ---
export { createScrollSpy } from "./scroll-spy-utils";
export type { ScrollSpyOptions, ScrollSpyInstance, SpySection } from "./scroll-spy-utils";

// --- Scroll Progress ---
export { createScrollProgress } from "./scroll-progress-utils";
export type { ScrollProgressOptions, ScrollProgressInstance, ProgressShape, ProgressPosition } from "./scroll-progress-utils";

// --- Smooth Scroll ---
export { createSmoothScroll } from "./smooth-scroll-utils";
export type { SmoothScrollOptions, SmoothScrollInstance, ScrollToOptions, ParallaxOptions, ParallaxInstance, ParallaxLayer, EasingFn, EasingName } from "./smooth-scroll-utils";
// --- Intersection Observer ---
export { EnhancedIntersectionObserver, createVisibilityTracker, createLazyLoad, createScrollTrigger, isInViewport, getViewportVisibility, whenInViewport, batchScrollTriggers } from "./intersection-utils";
export type { IntersectionEntry, ObserverConfig, VisibilityInstance, LazyLoadOptions, ScrollTriggerOptions } from "./intersection-utils";

// --- Resize Observer ---
export { createEnhancedResizeObserver } from "./resize-observer-utils";
export type { ResizeObserverOptions, ResizeObserverInstance, SizeInfo, SizeDiff, Breakpoint } from "./resize-observer-utils";

// --- Mutation Observer ---
export { createEnhancedMutationObserver } from "./mutation-observer-utils";
export type { MutationObserverOptions, MutationObserverInstance, MutationRecordEx, ChangeSummary, MutationFilter, MutationAction } from "./mutation-observer-utils";
// --- CSS-in-JS ---
export { createStyleSheet, injectCSS, removeCSS, fontFace, createBreakpointClasses, injectBreakpointStyles, varsToCSS } from "./css-in-js-utils";
export type { CssInJsOptions, StyleSheetInstance, StyleRule, KeyframeConfig, ThemeVars, MediaQueryConditions } from "./css-in-js-utils";

// --- DOM Utilities ---
export { createEl, div, span, p, btn, createSvg, $, $$, requireSelector, byId, byClass, byTag, walkUp, walkDown, nextSibling, prevSibling, siblings, siblingIndex, isLastChild, isFirstChild, empty, setChildren, insertAtIndex, moveToIndex, swapElements, wrap, unwrap, htmlToFragment, appendHtml, prependHtml, delegate, delegateClick, renderTemplate, renderInto } from "./dom-utils";
export type { CreateElementOptions, QueryOptions, DomDiffResult } from "./dom-utils";

// --- Event Bus ---
export { EventBus, getEventBus, destroyGlobalBus } from "./event-bus-utils";
export type { EventBusOptions, Subscription, EventHandler, EventMiddleware, EventKey } from "./event-bus-utils";
// --- Storage ---
export { StorageManager, createLocalStorage, createSessionStorage, createMemoryStore } from "./storage-utils";
export type { StorageOptions, StorageEntry, StorageStats, StorageMigration, StorageBackend } from "./storage-utils";

// --- Clipboard ---
export { copyToClipboard, copyRich, copyImage, copyFiles, readClipboard, readClipboardText, cutToClipboard, requestClipboardPermission, checkClipboardReadPermission, isClipboardSupported, selectAll, selectRange, clearSelection, getSelectedText, getSelectionTarget, ClipboardHistory, detectClipboardFormats, hasImageInClipboard, hasFilesInClipboard, copyWithFeedback, copySelection, onClipboardChange } from "./clipboard-utils";
export type { ClipboardData, CopyOptions, PasteOptions, PasteResult, ClipboardHistoryEntry, ClipboardHistoryOptions } from "./clipboard-utils";

// --- Notification (Toast) ---
export { NotificationManager } from "./notification-utils";
export type { NotificationOptions, NotificationInstance, NotificationManagerConfig, NotificationType, NotificationPosition } from "./notification-utils";
// --- i18n ---
export { I18nManager, getUserLanguage, getUserLanguages, matchLocale, resolveLocale, getPluralForm, isRTL, getDirection, applyDirection, formatNumber, formatCurrency, formatPercent, formatCompactNumber, formatDateI18n, formatRelativeTime, formatList } from "./i18n-utils";
export type { I18nConfig, TranslationEntry, PluralForms } from "./i18n-utils";

// --- Logger ---
export { Logger, getLogger, destroyLogger, createModuleLogger, textFormatter, jsonFormatter, compactFormatter, PerfTracker } from "./logger-utils";
export type { LoggerOptions, LogEntry, LogTransport, LogFormatter, LogLevel } from "./logger-utils";

// --- Performance ---
export { mark, measure, endMark, clearMarks, perfTimer, perfTimerAsync, createFPSMonitor, getMemoryInfo, formatBytes, formatMemoryInfo, getResourceTimings, getResourcesByType, getSlowestResources, getLargestResources, getNavigationTiming, observeLongTasks, observeLayoutShift, FrameBudgetTracker } from "./perf-utils";
export type { PerformanceMark, FrameStats, MemoryInfo, ResourceTimingEntry, FPSMonitorOptions, FPSMonitorInstance } from "./perf-utils";
// --- animation-utils ---
export {
  Tween,
  SpringAnimation,
  StaggerAnimation,
  ScrollAnimation,
  ParallaxHelper,
  MouseParallax,
  fadeIn,
  fadeOut,
  slideUp,
  slideDown,
  scaleIn,
  shake,
  pulse,
} from "./animation-utils";

// --- gesture-utils ---
export {
  GestureRecognizer,
  distance,
  angleBetween,
  midpoint,
  getDirection,
  isInsideRect,
  isInsideElement,
  createTapDebounce,
  detectSwipe,
} from "./gesture-utils";
export type {
  Point,
  SwipeGesture,
  PinchGesture,
  RotateGesture,
  TapGesture,
  LongPressGesture,
  PanGesture,
  Gesture,
  GestureConfig,
  GestureHandlers,
} from "./gesture-utils";

// --- hotkey-parser-utils ---
export {
  parseHotkey,
  hotkeysMatch,
  eventMatchesHotkey,
  formatHotkey,
  parseHotkeys,
  findConflicts,
  eventToHotkey,
  hotkeyHash,
} from "./hotkey-parser-utils";
export type {
  ParsedHotkey,
  ModifierKey,
  HotkeyParseOptions,
  HotkeyCompareOptions,
} from "./hotkey-parser-utils";
// --- color-utils ---
export {
  parseColor,
  requireColor,
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToHsl,
  toHexString,
  toRgbString,
  toHslString,
  lighten,
  darken,
  saturate,
  desaturate,
  rotateHue,
  setOpacity,
  mix,
  invert,
  luminance,
  contrastRatio,
  meetsAA,
  meetsAAA,
  contrastingText,
  minAlphaForContrast,
  generatePalette,
  complementary,
  analogous,
  triadic,
  splitComplementary,
  tetradic,
  generateScheme,
  linearGradient,
  radialGradient,
  gradientBetween,
  shimmerGradient,
  colorTemperature,
  isWarmColor,
  hueCategory,
  cssVariablesFromPalette,
  generateDesignTokens,
} from "./color-utils";
export type { RGB, HSL, HSV, ColorStop, ColorPalette } from "./color-utils";

// --- math-utils ---
export {
  mean,
  median,
  mode,
  variance,
  stddev,
  covariance,
  correlation,
  linearRegression,
  percentile,
  Vec2,
  Vec3,
  Matrix,
  dist2D,
  dist3D,
  angleBetweenPoints,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  boundingBox,
  lineIntersection,
  lerp,
  clamp,
  mapRange,
  smoothStep,
  bezierQuad,
  bezierCubic,
  catmullRom,
  gcd as mathGcd,
  lcm as mathLcm,
  isPrime,
  sieveOfEratosthenes,
  factorial,
  fibonacci,
  fibonacciSequence,
  combinations,
  permutations,
  modPow,
  angle,
  temperature,
  length as lengthConv,
  weight,
  randomNormal,
  randomUniform,
  randomInt,
  randomPick,
  shuffle,
  weightedRandom,
} from "./math-utils";
export type { Vector2D, Vector3D } from "./math-utils";

// --- number-utils ---
export {
  clampNumber,
  lerpNumber,
  mapRangeNumber,
  roundTo,
  roundToMultiple,
  floorToMultiple,
  ceilToMultiple,
  formatBytesAuto,
  formatCompactNumber,
  formatWithSeparators,
  percentChange,
  approximatelyEqual,
  randomIntInRange,
  randomFloatInRange,
  normalizeAngleDeg,
  normalizeAngleRad,
  degToRad,
  radToDeg,
  gcd,
  lcm,
  isInRange,
  wrapNumber,
} from "./number-utils";
// --- string-utils ---
export {
  isBlank,
  isPresent,
  collapseWhitespace,
  stripDiacritics,
  escapeRegex,
  escapeHtmlEntities,
  unescapeHtmlEntities,
  toCamelCaseString,
  toPascalCaseString,
  toKebabCaseString,
  toSnakeCaseString,
  capitalizeWords,
  smartTruncate,
  repeatWithSeparator,
  centerPad,
  isAscii,
  looksLikeEmail,
  looksLikeUrl,
  extractNumbers,
  replaceMultiple,
  stringToId,
  countOccurrences,
  reverseWords,
  trimLines,
  detectCase,
  slugify,
  levenshtein,
  isSimilar,
  soundex,
  randomString as strRandomString,
  randomHex,
  generateId,
  wordCount,
  charFrequency,
  mostCommonChars,
  uniqueWords,
  pluralize,
  singularize,
  acronym,
  abbreviate,
  maskString,
  maskEmail,
  detectIndentation,
  indentText,
  simpleDiff,
} from "./string-utils";
export type { DiffSegment } from "./string-utils";

// --- date-utils ---
export {
  formatDate,
  toISODate,
  toISODatetime,
  formatTime,
  relativeTime,
  shortRelativeTime,
  parseDate,
  formatDuration,
  parseDuration,
  isLeapYear,
  daysInMonth,
  getDayOfWeek,
  getWeekNumber,
  getQuarter,
  isSameDay,
  isToday,
  isYesterday,
  isBetween,
  addTime,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getTimezone,
  getTimezoneOffset,
  convertToTimezone,
} from "./date-utils";
export type { DateFormatOptions, RelativeTimeOptions } from "./date-utils";

// --- url-utils ---
export {
  parseUrl,
  buildUrlFromParts,
  updateSearchParams,
  removeSearchParams,
  getQueryParams,
  isSameOrigin,
  normalizeUrl,
  isAbsoluteUrl,
  makeAbsoluteUrl,
  getDomainFromUrl,
  getPathnameFromUrl,
  joinPathSegments,
  encodeUriComponentSafe,
  decodeUriComponentSafe,
  urlsEqual,
} from "./url-utils";
export type { ParsedUrl } from "./url-utils";
// --- array-utils ---
export {
  chunkArray,
  splitAt,
  partitionArray,
  slidingWindow,
  groupConsecutive,
  deepFlatten,
  uniqueBy,
  intersectArrays,
  differenceArrays,
  symmetricDifference,
  rotateArray,
  sampleArray,
  shuffleArray,
  zipArrays,
  fillArray,
  argMin,
  argMax,
} from "./array-utils";

// --- object-utils ---
export {
  deepClone,
  shallowClone,
  pick,
  omit,
  deepMerge,
  get,
  set,
  has,
  unset,
  mapValues,
  mapKeys,
  filterEntries,
  invert,
  deepEqual,
  allKeys,
  isEmpty as objIsEmpty,
  size as objSize,
  deepFreeze,
  groupBy,
  countBy,
  indexBy,
  values,
  keys as objKeys,
  toPairs,
  fromPairs,
  defaults,
  ensurePath,
} from "./object-utils";

// --- function-utils ---
export {
  memoize,
  memoizeOne,
  once,
  compose,
  pipe,
  curry,
  partial,
  partialRight,
  retry,
  withTimeout,
  timeoutSync,
  promisify,
  ary,
  unary,
  noop,
  constant,
  identity,
  K,
  flip,
  not,
  guard,
  spread,
  gather,
  tap,
  thru,
  time,
  timeAsync,
} from "./function-utils";
export type { RetryOptions } from "./function-utils";
// --- regex-utils ---
export {
  RegexBuilder,
  PATTERNS,
  testRegex,
  matchesPattern,
  extractAll,
  extractFirst,
  replaceWith,
  replaceTemplate,
  analyzePerformance,
  escapeRegexChars,
  unescapeRegexChars,
} from "./regex-utils";
export type { RegexTestResult, RegexPerformance } from "./regex-utils";

// --- validation-utils ---
export {
  isString,
  isNumber,
  isInteger,
  isFiniteNumber,
  isObject,
  isArray,
  isValidDate,
  isBoolean,
  isFunction,
  isNil,
  isNotNil,
  isEmpty as valIsEmpty,
  isMap,
  isSet,
  isPromise,
  isEmail,
  isURL,
  isUUID,
  isUUIDv4,
  isHexColor,
  isIPv4,
  isIPv6,
  isIP,
  isMACAddress,
  isCreditCard,
  detectCardBrand,
  isPhoneNumber,
  isISODate as valIsISODate,
  isISODateTime,
  isJSON,
  matchesPattern as valMatchesPattern,
  isLength,
  isArraySize,
  inRange,
  isOneOf,
  every,
  some,
  validate,
  validateAsync,
  rules,
  assert,
  assertType,
} from "./validation-utils";
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationRule,
  FieldSchema,
  ObjectSchema as ValObjectSchema,
} from "./validation-utils";

// --- schema-utils ---
export {
  validateSchema,
  inferSchema,
  inferSchemaFromSamples,
  mergeSchemas,
  diffSchemas,
  schemaToTypeScript,
  SchemaRegistry,
  isAcceptedBySchema,
  atLeastOneRequired,
  conditionalSchema,
  extractPaths,
  getDefault,
} from "./schema-utils";
export type {
  SchemaType,
  BaseSchema,
  StringSchema,
  NumberSchema,
  BooleanSchema,
  NullSchema,
  ArraySchema,
  ObjectSchema as SchObjectSchema,
  AnyOfSchema,
  OneOfSchema,
  AllOfSchema,
  NotSchema,
  RefSchema,
  JsonSchema,
  SchemaValidationError,
  SchemaValidationResult,
  SchemaDiff,
} from "./schema-utils";
// --- encoding-utils ---
export {
  base64Encode,
  base64Decode,
  base64UrlEncode,
  base64UrlDecode,
  base64Wrap,
  base32Encode,
  base32Decode,
  base58Encode,
  base58Decode,
  hexEncode as encHexEncode,
  hexDecode as encHexDecode,
  isHex as encIsHex,
  urlEncode,
  urlDecode,
  queryStringify,
  queryParse,
  parseUrl as encParseUrl,
  normalizeUnicode,
  codePoints,
  isBMP,
  reverseUnicode,
  htmlEncode,
  htmlDecode,
  parseCSV,
  generateCSV,
  decodeBuffer,
  encodeBuffer,
  uint8ToBinaryString,
  binaryStringToUint8,
  decodeJWT,
  isJWTExpired,
  createUnsignedJWT,
  formatBytes as encFormatBytes,
  parseBytes,
} from "./encoding-utils";
export type { ParsedURL, JWTPayload, DecodedJWT } from "./encoding-utils";

// --- crypto-utils ---
export {
  sha1 as cryptoSha1,
  sha256 as cryptoSha256,
  sha384,
  sha512 as cryptoSha512,
  hash as cryptoHash,
  hashHex,
  hmac,
  hmacHex,
  pbkdf2,
  deriveAesKey,
  generateAesKey,
  aesGcmEncrypt,
  aesGcmDecrypt,
  aesGcmEncryptString,
  aesGcmDecryptString,
  generateRsaOaepKeyPair,
  rsaOaepEncrypt,
  rsaOaepDecrypt,
  generateEcdsaKeyPair,
  ecdsaSign,
  ecdsaVerify,
  generateRsaPssKeyPair,
  rsaPssSign,
  rsaPssVerify,
  exportKey as cryptoExportKey,
  importKey as cryptoImportKey,
  keyFingerprint,
  generateEcdhKeyPair,
  ecdhDeriveSecret,
  ecdhDeriveAesKey,
  randomBytes,
  secureRandomInt,
  secureRandomUuid,
  secureRandomString,
  toBase64,
  fromBase64,
  toBase64Url,
  fromBase64Url,
  toHex as cryptoToHex,
  fromHex as cryptoFromHex,
  encodeUtf8,
  decodeUtf8,
  estimatePasswordStrength,
  generatePassword,
  generateTokenHex,
  generateTokenBase64Url,
  generateApiKey,
  generateSessionId,
} from "./crypto-utils";
export type {
  HashAlgorithm,
  HmacAlgorithm,
  AesKeyLength,
  EcNamedCurve,
  RsaKeySize,
  KeyFormat,
  Pbkdf2Options,
  AesGcmOptions,
  RsaKeyGenOptions,
  EcdsaKeyGenOptions,
  RsaPssSignOptions,
  PasswordStrengthResult,
  PasswordGeneratorOptions,
  ApiKeyOptions,
  AesGcmEncryptedData,
} from "./crypto-utils";

// --- hash-utils ---
export {
  fnv1a32,
  fnv1a64,
  murmur3_32,
  djb2,
  sdbm,
  jenkinsOaat,
  crc32,
  sha256,
  sha1 as hashSha1,
  sha512 as hashSha512,
  ConsistentHashRing,
  BloomFilter,
  HashTable,
  simpleChecksum,
  adler32,
  fingerprint,
  contentAddress,
  combineHashes,
  hashToHex,
} from "./hash-utils";
export type { HashFunction, HashTableEntry } from "./hash-utils";
// --- event-utils ---
export {
  createCustomEvent,
  dispatchCustomEvent,
  onCustomEvent,
  throttleEvent,
  debounceEvent,
  once as eventOnce,
  waitForEvent,
  delegateEvent,
  preventDefault,
  stopPropagation,
  stopEvent,
} from "./event-utils";

// --- promise-utils ---
export {
  retry as promiseRetry,
  withTimeout,
  sleep,
  runConcurrent,
  processInBatches,
  raceSuccess,
  firstN,
  makeCancellable,
  collectAsync,
  mapAsyncIterable,
  filterAsyncIterable,
  reduceAsyncIterable,
  memoizeAsync as promiseMemoizeAsync,
  createDeferred,
  createOnceEvent,
  poll as promisePoll,
  TaskQueue,
} from "./promise-utils";
export type {
  RetryOptions as PromiseRetryOptions,
  TimeoutOptions,
  ConcurrencyOptions as PromiseConcurrencyOptions,
  BatchOptions,
  MemoizeOptions as PromiseMemoizeOptions,
  PollOptions as PromisePollOptions,
  TaskQueueOptions,
} from "./promise-utils";

// --- async-utils ---
export {
  retry as asyncRetry,
  withTimeoutPromise,
  poll as asyncPoll,
  runWithConcurrency,
  memoizeAsync,
  memoize,
  createDeferred as asyncCreateDeferred,
  asyncIterate,
  batchProcess,
  allSuccessful,
  allOrThrow,
} from "./async-utils";
export type { RetryOptions as AsyncRetryOptions, PollOptions as AsyncPollOptions, ConcurrencyOptions as AsyncConcurrencyOptions, MemoizeOptions as AsyncMemoizeOptions } from "./async-utils";
// --- dom-observer-utils ---
export {
  observeMutations,
  observeOnce,
  createDebouncedObserver,
  watchAttributes,
  watchChildren,
  watchTextContent,
  watchSize as domWatchSize,
  getElementSize as domGetElementSize,
  hasSize,
  watchVisibility as domWatchVisibility,
  whenVisible as domWhenVisible,
  isInViewport as domIsInViewport,
} from "./dom-observer-utils";
export type { MutationRecord as DomMutationRecord, MutationSummary, SizeChange } from "./dom-observer-utils";

// --- intersection-utils ---
export {
  EnhancedIntersectionObserver,
  createVisibilityTracker,
  createLazyLoad,
  createScrollTrigger,
  isInViewport,
  getViewportVisibility,
  whenInViewport,
  batchScrollTriggers,
} from "./intersection-utils";
export type { IntersectionEntry as IntIntersectionEntry, ObserverConfig, VisibilityInstance, LazyLoadOptions, ScrollTriggerOptions } from "./intersection-utils";

// --- resize-utils ---
export {
  EnhancedResizeObserver,
  BreakpointTracker,
  ViewportTracker,
  createResizeHandle,
  clamp as resizeClamp,
  isResizeObserverSupported,
  getElementSize as resizeGetElementSize,
  hasOverflow,
  matchMedia,
  onMediaChange,
} from "./resize-utils";
export type { ResizeEntry, ResizeObserverConfig, Breakpoint, ViewportState, ResizeHandleOptions } from "./resize-utils";

// --- css-utils ---
export {
  getCSSVar,
  setCSSVar,
  removeCSSVar,
  getAllCSSVars,
  createStyleSheet,
  injectStylesheet,
  removeStylesheet,
  styleObjectToCSS,
  cssToStyleObject,
  bem,
  cn,
  getBreakpoint,
  isBreakpointActive,
  getMediaQuery,
  matchMediaQuery,
  CSS_TRANSITIONS,
  CSS_EASINGS,
  generateKeyframes,
  injectKeyframes,
  BUILT_IN_KEYFRAMES,
  parseHexColor,
  parseRGBColor,
  mixColors,
  lightenColor,
  darkenColor,
  transparentizeColor,
  pxToRem as cssPxToRem,
  remToPx as cssRemToPx,
  fluidFontSize,
} from "./css-utils";

// --- style-utils ---
export {
  getComputedStyleValue,
  getComputedStyles,
  hasComputedStyle,
  setStyles,
  getInlineStyles,
  removeStyles,
  withTemporaryStyles,
  diffStyles,
  styleToCSS,
  cssToStyle,
  camelToKebab,
  kebabToCamel,
  expandShorthand,
  collapseShorthand,
  parseCSSValue,
  pxToRem as stylePxToRem,
  remToPx as styleRemToPx,
  pxToEm,
  withUnit,
  stripUnit,
  responsiveStyle,
  injectResponsiveStyles,
  createStyleSheet as createStyleManagerSheet,
  insertRule,
  removeRule,
  findRules,
  clearSheet,
  isInheritedProperty,
  getStyleOrigin,
  copyComputedStyles,
  extractVisualStyles,
  StyleManager,
} from "./style-utils";

// --- theme-utils ---
export type { ThemeMode, DesignToken, ThemeDefinition, ThemeManagerConfig } from "./theme-utils";
export {
  getSystemColorScheme,
  onSystemColorSchemeChange,
  prefersReducedMotion,
  prefersHighContrast,
  prefersLightColor,
  ThemeManager,
  generateDesignTokens,
  generateDarkTokens,
  createLightDarkTheme,
} from "./theme-utils";

// --- accessibility-utils ---
export type { ContrastResult, FocusableElement, HeadingInfo, LandmarkInfo } from "./accessibility-utils";
export {
  setAria,
  getAria,
  setRole,
  setAccessibleName,
  hideFromScreenReader,
  showToScreenReader,
  getFocusableElements,
  focusFirst,
  focusLast,
  isFocusable,
  createFocusTrap,
  setupRovingTabindex,
  announce,
  announceAssertive,
  contrastRatio,
  checkContrast,
  suggestTextColor,
  getHeadingHierarchy,
  validateHeadingHierarchy,
  findLandmarks,
  hasProperLandmarks,
  prefersReducedMotion as a11yPrefersReducedMotion,
  prefersHighContrast as a11yPrefersHighContrast,
  prefersDarkMode,
  prefersLightMode,
  onPreferenceChange,
  createSkipLink,
  openAccessibleModal,
} from "./accessibility-utils";

// --- form-utils ---
export type { FormFieldConfig, FormValidationRule, FormFieldState, FormOptions, FormInstance, StepConfig, MultiStepFormOptions, MultiStepFormInstance, ConditionRule, ConditionalField } from "./form-utils";
export {
  createForm,
  serializeForm,
  populateForm,
  clearForm,
  createMultiStepForm,
  evaluateConditionals,
  linkErrorToField,
  unlinkErrorFromField,
  createFormAnnouncer,
} from "./form-utils";

// --- storage-utils ---
export type { StorageBackend, StorageEntry, StorageOptions, StorageStats, StorageMigration } from "./storage-utils";
export {
  StorageManager,
  createLocalStorage,
  createSessionStorage,
  createMemoryStore,
} from "./storage-utils";
