/**
 * Advanced form utilities: field-level validation UI, form state machine,
 * auto-save, multi-step forms, file upload progress tracking, and
 * conditional field logic.
 */

// --- Types ---

export interface FieldState<T = unknown> {
  value: T;
  error: string | null;
  touched: boolean;
  dirty: boolean;
  validating: boolean;
}

export interface FormState<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Set<keyof T>;
  dirty: Set<keyof T>;
  submitting: boolean;
  valid: boolean;
}

export interface FormValidator<T> {
  [field: string]: (value: T, allValues: Record<string, unknown>) => string | null;
}

export interface AutoSaveOptions {
  /** Debounce time in ms before saving (default: 1000) */
  debounceMs?: number;
  /** Save function */
  save: (values: Record<string, unknown>) => Promise<void>;
  /** Called on save success */
  onSuccess?: () => void;
  /** Called on save error */
  onError?: (error: Error) => void;
  /** Only save when valid? (default: true) */
  onlyValid?: boolean;
}

export interface MultiStepFormOptions {
  /** Total number of steps */
  steps: number;
  /** Validation per step */
  stepValidators?: FormValidator<unknown>[][];
  /** Allow skipping steps? */
  allowSkip?: boolean;
  /** Callback on step change */
  onStepChange?: (step: number) => void;
  /** Callback on complete */
  onComplete?: (values: Record<string, unknown>) => void;
}

// --- Form State Machine ---

export class FormManager<T extends Record<string, unknown>> {
  private state: FormState<T>;
  private validators: FormValidator<any> = {};
  private listeners = new Set<(state: FormState<T>) => void>();
  private autoSaveCleanup: (() => void) | null = null;

  constructor(initialValues: T) {
    this.state = {
      values: { ...initialValues },
      errors: {},
      touched: new Set(),
      dirty: new Set(),
      submitting: false,
      valid: true,
    };
  }

  /** Get current form state */
  getState(): FormState<T> {
    return { ...this.state };
  }

  /** Subscribe to state changes */
  subscribe(fn: (state: FormState<T>) => void): () => void {
    this.listeners.add(fn);
    fn(this.getState());
    return () => { this.listeners.delete(fn); };
  }

  private notify(): void {
    for (const fn of this.listeners) fn(this.getState());
  }

  /** Update a single field value */
  setField<K extends keyof T>(field: K, value: T[K]): void {
    this.state.values[field] = value;
    this.state.dirty.add(field);
    this.validateField(field);
    this.notify();
  }

  /** Update multiple fields at once */
  setFields(partial: Partial<T>): void {
    for (const [key, value] of Object.entries(partial)) {
      this.state.values[key as keyof T] = value as T[keyof T];
      this.state.dirty.add(key as keyof T);
    }
    this.validate();
    this.notify();
  }

  /** Mark field as touched (typically on blur) */
  touchField(field: keyof T): void {
    this.state.touched.add(field);
    this.notify();
  }

  /** Mark all fields as touched */
  touchAll(): void {
    for (const key of Object.keys(this.state.values) as (keyof T)[]) {
      this.state.touched.add(key);
    }
    this.notify();
  }

  /** Reset form to initial or provided values */
  reset(values?: T): void {
    this.state = {
      values: values ? { ...values } : { ...this.state.values },
      errors: {},
      touched: new Set(),
      dirty: new Set(),
      submitting: false,
      valid: true,
    };
    this.notify();
  }

  /** Set validators */
  setValidators(validators: FormValidator<any>): void {
    this.validators = validators;
  }

  /** Validate a single field */
  validateField(field: keyof T): string | null {
    const validator = this.validators[field as string];
    if (validator) {
      const error = validator(this.state.values[field], this.state.values);
      if (error) {
        this.state.errors[field] = error;
        this.state.valid = false;
        return error;
      } else {
        delete this.state.errors[field];
      }
    }
    this.state.valid = Object.keys(this.state.errors).length === 0;
    return null;
  }

  /** Validate all fields */
  validate(): boolean {
    this.state.errors = {};
    for (const field of Object.keys(this.validators)) {
      const validator = this.validators[field];
      if (validator) {
        const error = validator(this.state.values[field as keyof T], this.state.values);
        if (error) {
          this.state.errors[field as keyof T] = error;
        }
      }
    }
    this.state.valid = Object.keys(this.state.errors).length === 0;
    return this.state.valid;
  }

  /** Submit the form */
  async submit(
    handler: (values: T) => Promise<void>,
  ): Promise<boolean> {
    this.touchAll();
    if (!this.validate()) return false;

    this.state.submitting = true;
    this.notify();

    try {
      await handler(this.state.values);
      return true;
    } catch (error) {
      console.error("[FormManager] Submit error:", error);
      return false;
    } finally {
      this.state.submitting = false;
      this.notify();
    }
  }

  /** Enable auto-save */
  enableAutoSave(options: AutoSaveOptions): void {
    this.disableAutoSave();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const { debounceMs = 1000, save, onlyValid = true } = options;

    const debouncedSave = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        if (onlyValid && !this.state.valid) return;
        try {
          await save(this.state.values);
          options.onSuccess?.();
        } catch (err) {
          options.onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      }, debounceMs);
    };

    this.autoSaveCleanup = this.subscribe(() => {
      if (this.state.dirty.size > 0) debouncedSave();
    });
  }

  /** Disable auto-save */
  disableAutoSave(): void {
    if (this.autoSaveCleanup) {
      this.autoSaveCleanup();
      this.autoSaveCleanup = null;
    }
  }
}

// --- Multi-Step Form ---

export class MultiStepForm {
  private currentStep = 0;
  private values: Record<string, unknown> = {};
  private stepData: Record<number, Record<string, unknown>> = {};
  private options: MultiStepFormOptions;

  constructor(options: MultiStepFormOptions) {
    this.options = options;
  }

  get step(): number { return this.currentStep; }
  get totalSteps(): number { return this.options.steps; }
  get isFirstStep(): boolean { return this.currentStep === 0; }
  get isLastStep(): boolean { return this.currentStep >= this.options.steps - 1; }

  /** Go to next step */
  next(): boolean {
    if (this.isLastStep) return false;

    // Validate current step
    const validators = this.options.stepValidators?.[this.currentStep];
    if (validators) {
      for (const v of validators) {
        for (const [field, validator] of Object.entries(v)) {
          const error = validator(this.values[field], this.values);
          if (error) return false; // Block navigation
        }
      }
    }

    // Save current step data
    this.stepData[this.currentStep] = { ...this.values };

    this.currentStep++;
    this.options.onStepChange?.(this.currentStep);
    return true;
  }

  /** Go to previous step */
  prev(): boolean {
    if (this.isFirstStep) return false;
    this.currentStep--;
    this.options.onStepChange?.(this.currentStep);
    return true;
  }

  /** Jump to specific step (if allowed) */
  goTo(step: number): boolean {
    if (step < 0 || step >= this.options.steps) return false;
    if (!this.options.allowSkip && Math.abs(step - this.currentStep) > 1) return false;
    this.currentStep = step;
    this.options.onStepChange?.(this.currentStep);
    return true;
  }

  /** Set a field value for current step */
  setFieldValue(field: string, value: unknown): void {
    this.values[field] = value;
  }

  /** Complete the form */
  complete(): void {
    this.stepData[this.currentStep] = { ...this.values };
    // Merge all step data
    const merged: Record<string, unknown> = {};
    for (const data of Object.values(this.stepData)) {
      Object.assign(merged, data);
    }
    this.options.onComplete?.(merged);
  }
}

// --- File Upload Progress ---

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
  speed: number; // bytes/sec
}

export interface UploadOptions {
  file: File;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  fields?: Record<string, string>;
  onProgress?: (progress: UploadProgress) => void;
  abortSignal?: AbortSignal;
}

/** Upload a file with progress tracking */
export async function uploadFile(options: UploadOptions): Promise<Response> {
  const { file, url, method = "POST", headers = {}, fields = {}, onProgress, abortSignal } = options;

  const formData = new FormData();
  formData.append("file", file);
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);

    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    if (abortSignal) {
      abortSignal.addEventListener("abort", () => xhr.abort());
    }

    let lastTime = Date.now();
    let lastLoaded = 0;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const now = Date.now();
        const dt = now - lastTime || 1;
        const speed = ((e.loaded - lastLoaded) / dt) * 1000;
        lastTime = now;
        lastLoaded = e.loaded;

        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
          speed,
        });
      }
    };

    xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status, statusText: xhr.statusText }));
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.onabort = () => reject(new Error("Upload aborted"));

    xhr.send(formData);
  });
}

// --- Common Validators ---

/** Required field validator */
export function required(msg = "This field is required"): (value: unknown) => string | null {
  return (value) => {
    if (value === null || value === undefined || value === "") return msg;
    if (Array.isArray(value) && value.length === 0) return msg;
    return null;
  };
}

/** Minimum length validator */
export function minLength(min: number, msg?: string): (value: string) => string | null {
  return (value) =>
    value.length < min ? (msg ?? `Must be at least ${min} characters`) : null;
}

/** Maximum length validator */
export function maxLength(max: number, msg?: string): (value: string) => string | null {
  return (value) =>
    value.length > max ? (msg ?? `Must be at most ${max} characters`) : null;
}

/** Email format validator */
export function email(msg = "Invalid email address"): (value: string) => string | null {
  return (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : msg;
}

/** Pattern/regex validator */
export function pattern(regex: RegExp, msg = "Invalid format"): (value: string) => string | null {
  return (value) => regex.test(value) ? null : msg;
}

/** Min value validator for numbers */
export function minVal(min: number, msg?: string): (value: number) => string | null {
  return (value) => value < min ? (msg ?? `Must be at least ${min}`) : null;
}

/** Max value validator for numbers */
export function maxVal(max: number, msg?: string): (value: number) => string | null {
  return (value) => value > max ? (msg ?? `Must be at most ${max}`) : null;
}

/** Compose multiple validators (stops at first error) */
export function compose<T>(
  ...validators: ((value: T) => string | null)[]
): (value: T) => string | null {
  return (value) => {
    for (const v of validators) {
      const err = v(value);
      if (err) return err;
    }
    return null;
  };
}
