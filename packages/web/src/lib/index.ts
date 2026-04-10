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
