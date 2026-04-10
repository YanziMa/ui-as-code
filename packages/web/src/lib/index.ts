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
