/**
 * Password generation, strength validation, and security utilities.
 */

export interface PasswordStrengthResult {
  score: number;       // 0-4 (very weak to very strong)
  label: string;       // "Very Weak" | "Weak" | "Fair" | "Strong" | "Very Strong"
  color: string;       // CSS color for the strength indicator
  suggestions: string[]; // Improvement suggestions
  crackTime: string;   // Estimated time to crack
  entropy: number;     // Bits of entropy
}

export interface PasswordGeneratorOptions {
  /** Length (default: 16) */
  length?: number;
  /** Include uppercase letters (default: true) */
  uppercase?: boolean;
  /** Include lowercase letters (default: true) */
  lowercase?: boolean;
  /** Include numbers (default: true) */
  numbers?: boolean;
  /** Include symbols (default: true) */
  symbols?: boolean;
  /** Exclude ambiguous characters (0Ool1I) */
  excludeAmbiguous?: boolean;
  /** Exclude similar characters */
  excludeSimilar?: boolean;
  /** Custom character sets */
  customChars?: string;
  /** Minimum count per character type */
  minUppercase?: number;
  minLowercase?: number;
  minNumbers?: number;
  minSymbols?: number;
  /** Require no consecutive repeating characters */
  noRepeat?: boolean;
  /** Maximum consecutive same characters */
  maxConsecutive?: number;
}

/** Generate a secure random password */
export function generatePassword(options: PasswordGeneratorOptions = {}): string {
  const {
    length = 16,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
    excludeAmbiguous = false,
    excludeSimilar = false,
    customChars,
    noRepeat = false,
    maxConsecutive = 2,
  } = options;

  let chars = "";

  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const nums = "0123456789";
  const syms = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  if (customChars) chars += customChars;
  else {
    if (uppercase) chars += upper;
    if (lowercase) chars += lower;
    if (numbers) chars += nums;
    if (symbols) chars += syms;
  }

  if (excludeAmbiguous) {
    chars = chars.replace(/[0Ool1I]/g, "");
  }

  if (excludeSimilar) {
    chars = chars.replace(/[il1Lo0O]/g, "");
  }

  if (chars.length === 0) chars = lower + nums;

  let password = "";
  const array = typeof crypto !== "undefined"
    ? crypto.getRandomValues(new Uint8Array(length))
    : Array.from({ length }, () => Math.floor(Math.random() * 256));

  for (let i = 0; i < length; i++) {
    password += chars[array[i]! % chars.length];
  }

  // Enforce minimum counts by replacing random positions
  const required: Array<{ set: string; min: number }> = [];
  if (uppercase && options.minUppercase) required.push({ set: upper, min: options.minUppercase });
  if (lowercase && options.minLowercase) required.push({ set: lower, min: options.minLowercase });
  if (numbers && options.minNumbers) required.push({ set: nums, min: options.minNumbers });
  if (symbols && options.minSymbols) required.push({ set: syms, min: options.minSymbols });

  for (const req of required) {
    for (let i = 0; i < req.min; i++) {
      const pos = Math.floor(Math.random() * length);
      const char = req.set[Math.floor(Math.random() * req.set.length)]!;
      password = password.slice(0, pos) + char + password.slice(pos + 1);
    }
  }

  // Enforce no repeat / max consecutive
  if (noRepeat || maxConsecutive > 0) {
    password = enforceMaxConsecutive(password, maxConsecutive);
  }

  return password;
}

function enforceMaxConsecutive(password: string, max: number): string {
  const result = password.split("");
  for (let i = max; i < result.length; i++) {
    let allSame = true;
    for (let j = 0; j <= max; j++) {
      if (result[i - j] !== result[i]) { allSame = false; break; }
    }
    if (allSame) {
      // Replace the last one with a different char
      let newChar: string;
      do {
        const idx = Math.floor(Math.random() * result.length);
        newChar = result[idx]!;
      } while (newChar === result[i]);
      result[i] = newChar;
    }
  }
  return result.join("");
}

/** Generate a passphrase from word list */
export function generatePassphrase(
  wordCount = 4,
  separator = "-",
  capitalize = false,
): string {
  const words = [
    "apple", "brave", "cloud", "dream", "eagle", "flame", "grace", "heart",
    "ivory", "jolly", "knight", "lemon", "magic", "noble", "ocean", "piano",
    "queen", "river", "storm", "tiger", "unity", "valor", "whisper", "xenon",
    "youth", "zebra", "amber", "blaze", "crisp", "delta", "ember", "frost",
    "glory", "haven", "image", "jewel", "knack", "lunar", "mercy", "nova",
    "orbit", "prism", "quest", "royal", "solar", "torch", "ultra", "vivid",
    "wave", "xenial", "yearn", "zenith", "alpha", "bravo", "charlie", "delta",
  ];

  const selected: string[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < wordCount; i++) {
    let idx: number;
    do {
      idx = typeof crypto !== "undefined"
        ? crypto.getRandomValues(new Uint8Array(1))[0]! % words.length
        : Math.floor(Math.random() * words.length);
    } while (usedIndices.has(idx));
    usedIndices.add(idx);

    let word = words[idx]!;
    if (capitalize) word = word.charAt(0).toUpperCase() + word.slice(1);
    selected.push(word);
  }

  return selected.join(separator);
}

/** Check password strength */
export function checkPasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;
  const suggestions: string[] = [];

  // Length checks
  if (password.length >= 8) score++;
  else suggestions.push("Use at least 8 characters");

  if (password.length >= 12) score++;
  else suggestions.push("Use 12+ characters for better security");

  // Character variety
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const varietyCount = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;

  if (varietyCount >= 3) score++;
  else if (varietyCount < 3) {
    if (!hasUpper) suggestions.push("Add uppercase letters");
    if (!hasLower) suggestions.push("Add lowercase letters");
    if (!hasNumber) suggestions.push("Add numbers");
    if (!hasSymbol) suggestions.push("Add special characters (!@#$%...)");
  }

  // Entropy calculation
  let poolSize = 0;
  if (hasUpper) poolSize += 26;
  if (hasLower) poolSize += 26;
  if (hasNumber) poolSize += 10;
  if (hasSymbol) poolSize += 32;
  poolSize = Math.max(poolSize, 26);

  const entropy = password.length * Math.log2(poolSize);

  // Bonus for length
  if (password.length >= 16 && varietyCount >= 3) score = Math.min(4, score + 1);

  // Common patterns penalty
  if (/^[a-z]+$/.test(password)) { score = Math.max(0, score - 1); suggestions.push("Avoid lowercase-only passwords"); }
  if (/^[0-9]+$/.test(password)) { score = Math.max(0, score - 1); suggestions.push("Avoid numeric-only passwords"); }
  if (/(.)\1{2,}/.test(password)) suggestions.push("Avoid repeated characters");
  if (/(123|234|345|456|567|678|789|abc|bcd|cde|def|efg|fgh|qwe|wer)/i.test(password))
    suggestions.push("Avoid common sequences");

  // Labels and colors
  const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const colors = ["#ef4444", "#f97316", "#f59e0b", "#22c55e", "#10b981"];

  // Crack time estimation (rough)
  const crackTime = estimateCrackTime(entropy);

  return {
    score: Math.min(4, Math.max(0, score)),
    label: labels[score] ?? labels[0],
    color: colors[score] ?? colors[0],
    suggestions,
    crackTime,
    entropy: Math.round(entropy),
  };
}

/** Estimate time to crack based on entropy */
function estimateCrackTime(entropyBits: number): string {
  // Assuming 10 billion guesses per second (high-end GPU)
  const guessesPerSecond = 10_000_000_000;
  const combinations = Math.pow(2, entropyBits);
  const seconds = combinations / guessesPerSecond;

  if (seconds < 1) return "instant";
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 31536000 * 100) return `${Math.round(seconds / 31536000)} years`;
  if (seconds < 31536000 * 1000000) return `${Math.round(seconds / 31536000 / 1000)}k years";
  return "centuries+";
}

/** Check if password is in a list of common/breached passwords */
export function isCommonPassword(password: string): boolean {
  // Top 100 most common passwords (subset for client-side check)
  const common = [
    "password", "123456", "12345678", "qwerty", "abc123", "monkey", "1234567",
    "letmein", "trustno1", "dragon", "baseball", "iloveyou", "master", "sunshine",
    "ashley", "bailey", "shadow", "123123", "654321", "superman", "qazwsx",
    "michael", "football", "password1", "password123", "welcome", "admin", "login",
    "starwars", "hello", "freedom", "whatever", "nicole", "access", "passw0rd",
  ];
  return common.includes(password.toLowerCase());
}

/** Generate a hash of a password (for comparison, NOT for storage — use bcrypt/argon2 server-side) */
export async function hashPasswordSimple(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "uiascode-salt-v1");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Mask password for display (show only last N characters) */
export function maskPassword(password: string, visibleChars = 2): string {
  if (password.length <= visibleChars) return "*".repeat(password.length);
  return "*".repeat(password.length - visibleChars) + password.slice(-visibleChars);
}
