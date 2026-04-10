/**
 * Biometrics / WebAuthn: Web Authentication API wrapper for passwordless
 * authentication using platform authenticators (fingerprint, face, PIN),
 * credential registration (attestation), authentication assertion,
 * cross-platform authenticators (YubiKey, security keys), and
 * user-friendly error handling.
 */

// --- Types ---

export type AuthenticatorTransport = "usb" | "nfc" | "ble" | "internal" | "hybrid";
export type UserVerification = "required" | "preferred" | "discouraged";
export type AttestationConveyance = "none" | "indirect" | "direct" | "enterprise";
export type ResidentKeyRequirement = "discouraged" | "preferred" | "required";

export interface WebAuthnOptions {
  /** Relying party (your app) info */
  rp: {
    id?: string;       // Domain (e.g., "example.com")
    name: string;      // Human-readable name
  };
  /** User info */
  user: {
    id: string;        // Base64URL-encoded user ID
    name: string;      // Username/handle
    displayName: string;
  };
  /** Challenge from server (base64url) */
  challenge: string;
  /** List of excluded credential IDs (prevent re-registration) */
  excludeCredentials?: Array<{ id: string; type: "public-key"; transports?: AuthenticatorTransport[] }>;
  /** Authenticator attachment preference */
  authenticatorSelection?: {
    authenticatorAttachment?: "platform" | "cross-platform";
    residentKey?: ResidentKeyRequirement;
    requireResidentKey?: boolean;
    userVerification?: UserVerification;
  };
  /** Attestation conveyance */
  attestation?: AttestationConveyance;
  /** Timeout in ms (default: 60000) */
  timeout?: number;
}

export interface AssertionOptions {
  /** Challenge from server (base64url) */
  challenge: string;
  /** Relying party ID */
  rpId?: string;
  /** Allow only specific credentials? */
  allowCredentials?: Array<{ id: string; type: "public-key"; transports?: AuthenticatorTransport[] }>;
  /** User verification requirement */
  userVerification?: UserVerification;
  /** Timeout in ms */
  timeout?: number;
}

export interface CredentialResult {
  /** Raw credential ID (base64url) */
  id: string;
  /** Base64url-encoded raw attestation object */
  rawId: string;
  /** Type — always "public-key" */
  type: string;
  /** Client data JSON (base64url) */
  clientDataJSON: string;
  /** Attestation object (base64url) — for registration */
  attestationObject?: string;
  /** Authenticator response data (base64url) — for authentication */
  authData?: string;
  /** Signature (base64url) — for authentication */
  signature?: string;
  /** User handle (base64url) — for authentication with resident key */
  userHandle?: string;
}

export interface BiometricManagerOptions {
  /** Fallback when WebAuthn is not supported */
  onNotSupported?: () => void;
  /** Callback on successful registration */
  onRegisterSuccess?: (result: CredentialResult) => void;
  /** Callback on successful authentication */
  onAuthSuccess?: (result: CredentialResult) => void;
  /** Callback on error */
  onError?: (error: BiometricError) => void;
}

export interface BiometricError {
  code: string;
  message: string;
  cause?: Error;
  recoverable: boolean;
}

export interface BiometricManagerInstance {
  /** Check if WebAuthn is available */
  isAvailable: () => Promise<boolean>;
  /** Check if platform authenticator (fingerprint/face) is available */
  hasPlatformAuthenticator: () => Promise<boolean>;
  /** Register a new credential (create/passkey) */
  register: (options: WebAuthnOptions) => Promise<CredentialResult>;
  /** Authenticate with existing credential */
  authenticate: (options: AssertionOptions) => Promise<CredentialResult>;
  /** Auto-detect and use the best available method */
  quickAuthenticate: (challenge: string, rpId?: string) => Promise<CredentialResult>;
  /** Convert ArrayBuffer to base64url string */
  toBase64Url: (buffer: ArrayBuffer) => string;
  /** Convert base64url string to ArrayBuffer */
  fromBase64Url: (str: string) => ArrayBuffer;
  /** Destroy */
  destroy: () => void;
}

// --- Helpers ---

/** Convert Uint8Array to base64url (no padding) */
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Convert base64url string to ArrayBuffer */
function base64UrlToBuffer(str: string): ArrayBuffer {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)!;
  return bytes.buffer as ArrayBuffer;
}

function createError(code: string, message: string, cause?: Error): BiometricError {
  const unrecoverableCodes = ["NotAllowedError", "NotSupportedError", "SecurityError", "TypeError"];
  return {
    code,
    message,
    cause,
    recoverable: !unrecoverableCodes.includes(code),
  };
}

// --- Main Class ---

export class BiometricManager {
  create(options: BiometricManagerOptions = {}): BiometricManagerInstance {
    let destroyed = false;

    async function checkAvailability(): Promise<boolean> {
      if (destroyed || typeof window === "undefined") return false;

      // Check basic API availability
      if (!window.PublicKeyCredential) {
        options.onNotSupported?.();
        return false;
      }

      // Check if WebAuthn is usable (not just polyfilled)
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
      } catch {
        // Some browsers don't support this method but still support WebAuthn
        return PublicKeyCredential !== undefined;
      }
    }

    async function checkPlatform(): Promise<boolean> {
      if (!window.PublicKeyCredential) return false;

      try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        return false;
      }
    }

    async function doRegister(opts: WebAuthnOptions): Promise<CredentialResult> {
      if (destroyed) throw createError("Destroyed", "Manager destroyed");

      const supported = await checkAvailability();
      if (!supported) {
        const err = createError("NotSupportedError", "WebAuthn is not supported on this device");
        options.onError?.(err);
        throw err;
      }

      // Build credential creation options
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: base64UrlToBuffer(opts.challenge),
        rp: opts.rp,
        user: {
          id: base64UrlToBuffer(opts.user.id),
          name: opts.user.name,
          displayName: opts.user.displayName,
        },
        pubKeyCredParams: [
          { alg: -7 },   // ES256 (P-256)
          { alg: -257 }, // RS256
          { alg: -8 },   // Ed25519
        ],
        timeout: opts.timeout ?? 60000,
        excludeCredentials: opts.excludeCredentials?.map((c) => ({
          ...c,
          id: base64UrlToBuffer(c.id),
        })),
        authenticatorSelection: opts.authenticatorSelection ?? {
          authenticatorAttachment: "platform",
          residentKey: "preferred",
          userVerification: "preferred",
        },
        attestation: opts.attestation ?? "none",
      };

      try {
        const credential = await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions,
        }) as PublicKeyCredential & { response: AuthenticatorAttestationResponse };

        if (!credential) {
          throw new Error("Credential creation returned null");
        }

        const result = extractCredentialResult(credential);
        options.onRegisterSuccess?.(result);
        return result;

      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const wrapped = createError(error.name, error.message, error);
        options.onError?.(wrapped);
        throw wrapped;
      }
    }

    async function doAuthenticate(opts: AssertionOptions): Promise<CredentialResult> {
      if (destroyed) throw createError("Destroyed", "Manager destroyed");

      const supported = await checkAvailability();
      if (!supported) {
        const err = createError("NotSupportedError", "WebAuthn is not supported on this device");
        options.onError?.(err);
        throw err;
      }

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: base64UrlToBuffer(opts.challenge),
        rpId: opts.rpId ?? window.location.hostname,
        timeout: opts.timeout ?? 60000,
        allowCredentials: opts.allowCredentials?.map((c) => ({
          ...c,
          id: base64UrlToBuffer(c.id),
        })),
        userVerification: opts.userVerification ?? "preferred",
      };

      try {
        const credential = await navigator.credentials.get({
          publicKey: publicKeyCredentialRequestOptions,
        }) as PublicKeyCredential & { response: AuthenticatorAssertionResponse };

        if (!credential) {
          throw new Error("Credential assertion returned null");
        }

        const result = extractAssertionResult(credential);
        options.onAuthSuccess?.(result);
        return result;

      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const wrapped = createError(error.name, error.message, error);
        options.onError?.(wrapped);
        throw wrapped;
      }
    }

    async function doQuickAuth(challenge: string, rpId?: string): Promise<CredentialResult> {
      // Try platform authenticator first (fingerprint/face)
      try {
        return await doAuthenticate({
          challenge,
          rpId,
          userVerification: "preferred",
          // Don't specify allowCredentials to allow any (resident key discovery)
        });
      } catch {
        // If that fails, the user may need to select a specific credential
        // This would typically involve fetching allowed credentials from server
        throw createError(
          "AbortError",
          "Authentication was cancelled or no credentials found. Please try again.",
        );
      }
    }

    const instance: BiometricManagerInstance = {

      isAvailable: checkAvailability,

      hasPlatformAuthenticator: checkPlatform,

      register: doRegister,

      authenticate: doAuthenticate,

      quickAuthenticate: doQuickAuth,

      toBase64Url: bufferToBase64Url,

      fromBase64Url: base64UrlToBuffer,

      destroy(): void {
        destroyed = true;
      },
    };

    return instance;
  }
}

/** Convenience: create a biometric manager */
export function createBiometricManager(options?: BiometricManagerOptions): BiometricManagerInstance {
  return new BiometricManager().create(options);
}

// --- Result extraction helpers ---

function extractCredentialResult(
  credential: PublicKeyCredential & { response: AuthenticatorAttestationResponse },
): CredentialResult {
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
    attestationObject: bufferToBase64Url(credential.response.attestationObject),
  };
}

function extractAssertionResult(
  credential: PublicKeyCredential & { response: AuthenticatorAssertionResponse },
): CredentialResult {
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
    authData: bufferToBase64Url(credential.response.authenticatorData),
    signature: bufferToBase64Url(credential.response.signature),
    userHandle: credential.response.userHandle
      ? bufferToBase64Url(credential.response.userHandle)
      : undefined,
  };
}
