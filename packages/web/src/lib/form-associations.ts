/**
 * Form Element Association helpers for linking labels, descriptions, error
 * messages, and help text to form controls using ARIA attributes, with
 * automatic ID generation, bidirectional association, and form group management.
 */

// --- Types ---

export interface FormAssociation {
  /** The form control element */
  control: HTMLElement;
  /** Associated label element(s) */
  labels: HTMLLabelElement[];
  /** Description element (aria-describedby target) */
  description?: HTMLElement;
  /** Error message container */
  errorElement?: HTMLElement;
  /** Help text element */
  helpElement?: HTMLElement;
  /** Validation message container */
  validationElement?: HTMLElement;
}

export interface FormGroupOptions {
  /** Generate IDs if not present (default: true) */
  autoGenerateIds?: boolean;
  /** ID prefix for generated IDs (default: "fac-") */
  idPrefix?: string;
  /** Wrap in a fieldset for grouping (default: false) */
  useFieldset?: boolean;
  /** Fieldset legend text */
  legend?: string;
  /** Mark as required */
  required?: boolean;
  /** Add aria-invalid on validation error (default: true) */
  ariaInvalid?: boolean;
}

export interface FormAssociationInstance {
  /** Current associations */
  readonly associations: Map<HTMLElement, FormAssociation>;
  /** Associate a label with a control */
  associateLabel: (control: HTMLElement, label: HTMLLabelElement) => void;
  /** Associate a description with a control */
  associateDescription: (control: HTMLElement, desc: HTMLElement) => void;
  /** Associate an error message with a control */
  associateError: (control: HTMLElement, errorEl: HTMLElement) => void;
  /** Create a complete form group from parts */
  createFormGroup: (
    control: HTMLElement,
    options?: FormGroupOptions & {
      labelText?: string;
      descriptionText?: string;
      helpText?: string;
    },
  ) => HTMLElement;
  /** Find the label for a control */
  findLabel: (control: HTMLElement) => HTMLLabelElement | null;
  /** Find all associated elements for a control */
  getAssociations: (control: HTMLElement) => FormAssociation | null;
  /** Set error state on a control */
  setError: (control: HTMLElement, message: string) => void;
  /** Clear error state */
  clearError: (control: HTMLElement) => void;
  /** Destroy all associations */
  destroy: () => void;
}

// --- Helpers ---

let idCounter = 0;

function generateId(prefix = "fac-"): string {
  return `${prefix}${++idCounter}-${Date.now().toString(36)}`;
}

function ensureId(el: HTMLElement, prefix: string): string {
  if (el.id) return el.id;
  const id = generateId(prefix);
  el.id = id;
  return id;
}

// --- Main ---

export function createFormAssociations(): FormAssociationInstance {
  let destroyed = false;
  const associations = new Map<HTMLElement, FormAssociation>();

  function getOrCreate(control: HTMLElement): FormAssociation {
    let assoc = associations.get(control);
    if (!assoc) {
      assoc = { control, labels: [] };
      associations.set(control, assoc);
    }
    return assoc;
  }

  function doAssociateLabel(control: HTMLElement, label: HTMLLabelElement): void {
    if (destroyed) return;
    const assoc = getOrCreate(control);

    // Set htmlFor / for attribute
    const controlId = ensureId(control, "fc-");
    label.htmlFor = controlId;

    if (!assoc.labels.includes(label)) {
      assoc.labels.push(label);
    }

    // Also set aria-labelledby if not already
    if (!control.getAttribute("aria-labelledby")) {
      const labelId = ensureId(label, "fl-");
      control.setAttribute("aria-labelledby", labelId);
    }
  }

  function doAssociateDescription(control: HTMLElement, desc: HTMLElement): void {
    if (destroyed) return;
    const assoc = getOrCreate(control);
    const descId = ensureId(desc, "fd-");

    assoc.description = desc;

    // Add to aria-describedby
    const existing = control.getAttribute("aria-describedby") ?? "";
    const ids = existing.split(/\s+/).filter(Boolean);
    if (!ids.includes(descId)) ids.push(descId);
    control.setAttribute("aria-describedby", ids.join(" "));
  }

  function doAssociateError(control: HTMLElement, errorEl: HTMLElement): void {
    if (destroyed) return;
    const assoc = getOrCreate(control);
    const errorId = ensureId(errorEl, "fe-");

    assoc.errorElement = errorEl;
    errorEl.setAttribute("role", "alert");
    errorEl.id = errorId;

    // Add to aria-describedby (errors are also descriptions)
    const existing = control.getAttribute("aria-describedby") ?? "";
    const ids = existing.split(/\s+/).filter(Boolean);
    if (!ids.includes(errorId)) ids.push(errorId);
    control.setAttribute("aria-describedby", ids.join(" "));

    // aria-errormessage
    control.setAttribute("aria-errormessage", errorId);
  }

  function doCreateFormGroup(
    control: HTMLElement,
    options?: FormGroupOptions & { labelText?: string; descriptionText?: string; helpText?: string },
  ): HTMLElement {
    if (destroyed) return control;

    const {
      autoGenerateIds = true,
      idPrefix = "fg-",
      useFieldset = false,
      legend,
      required = false,
      labelText,
      descriptionText,
      helpText,
    } = options ?? {};

    const wrapper = useFieldset
      ? document.createElement("fieldset")
      : document.createElement("div");

    wrapper.className = "form-group";

    if (useFieldset && legend) {
      const legendEl = document.createElement("legend");
      legendEl.textContent = legend;
      wrapper.appendChild(legendEl);
    } else if (labelText) {
      const label = document.createElement("label");
      label.textContent = labelText;
      if (required) {
        label.innerHTML += ' <span class="required" aria-hidden="true">*</span>';
      }
      wrapper.appendChild(label);
      doAssociateLabel(control, label as HTMLLabelElement);
    }

    // Insert control after label/legend
    wrapper.appendChild(control);

    if (autoGenerateIds) ensureId(control, idPrefix);

    if (required) {
      control.setAttribute("aria-required", "true");
      control.required = true; // For native validation
    }

    if (descriptionText) {
      const desc = document.createElement("small");
      desc.className = "form-description";
      desc.textContent = descriptionText;
      wrapper.appendChild(desc);
      doAssociateDescription(control, desc);
    }

    if (helpText) {
      const help = document.createElement("span");
      help.className = "form-help";
      help.textContent = helpText;
      help.setAttribute("role", "note");
      wrapper.appendChild(help);
      const assoc = getOrCreate(control);
      assoc.helpElement = help;
    }

    // Container for dynamic error messages
    const errorContainer = document.createElement("span");
    errorContainer.className = "form-error";
    errorContainer.setAttribute("role", "alert");
    errorContainer.style.display = "none";
    wrapper.appendChild(errorContainer);
    doAssociateError(control, errorContainer);

    return wrapper;
  }

  function doFindLabel(control: HTMLElement): HTMLLabelElement | null {
    // Method 1: aria-labelledby
    const labelledBy = control.getAttribute("aria-labelledby");
    if (labelledBy) {
      const el = document.getElementById(labelledBy);
      if (el instanceof HTMLLabelElement) return el;
    }

    // Method 2: htmlFor matching
    if (control.id) {
      const label = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(control.id)}"]`);
      if (label) return label;
    }

    // Method 3: wrapping label
    const parentLabel = control.closest("label");
    if (parentLabel instanceof HTMLLabelElement) return parentLabel;

    return null;
  }

  function doGetAssociations(control: HTMLElement): FormAssociation | null {
    return associations.get(control) ?? null;
  }

  function doSetError(control: HTMLElement, message: string): void {
    const assoc = getOrCreate(control);
    control.setAttribute("aria-invalid", "true");

    if (assoc.errorElement) {
      assoc.errorElement.textContent = message;
      assoc.errorElement.style.display = "";
    }
  }

  function doClearError(control: HTMLElement): void {
    control.removeAttribute("aria-invalid");
    const assoc = associations.get(control);
    if (assoc?.errorElement) {
      assoc.errorElement.textContent = "";
      assoc.errorElement.style.display = "none";
    }
  }

  const instance: FormAssociationInstance = {
    get associations() { return new Map(associations); },

    associateLabel: doAssociateLabel,
    associateDescription: doAssociateDescription,
    associateError: doAssociateError,
    createFormGroup: doCreateFormGroup,
    findLabel: doFindLabel,
    getAssociations: doGetAssociations,
    setError: doSetError,
    clearError: doClearError,

    destroy() {
      if (destroyed) return;
      destroyed = true;
      associations.clear();
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Quick helper: link a label to a control by ID */
export function linkLabelToControl(label: HTMLLabelElement, control: HTMLElement): void {
  const id = control.id || `ctrl-${Date.now().toString(36)}`;
  control.id = id;
  label.htmlFor = id;
}

/** Get all form controls within an element */
export function getFormControls(container: HTMLElement): HTMLElement[] {
  const selector = [
    "input", "select", "textarea",
    "[role='textbox']", "[role='combobox']",
    "[role='listbox']", "[role='spinbutton']",
    "[contenteditable='true']",
  ].join(", ");
  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}
