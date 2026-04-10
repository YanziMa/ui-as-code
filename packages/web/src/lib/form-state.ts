/**
 * Form state management utilities.
 */

export type FormField<T = unknown> = {
  value: T;
  error: string | null;
  touched: boolean;
  dirty: boolean;
};

export interface FormState<T extends Record<string, unknown> = {}> {
  fields: { [K in keyof T]: FormField<T[K]> };
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  submitCount: number;
}

export interface FieldValidator<T> {
  (value: T, allValues?: Record<string, unknown>): string | null;
}

/** Create a new form state */
export function createFormState<T extends Record<string, unknown>>(
  initialValues: T,
): FormState<T> {
  const fields = {} as FormState<T>["fields"];

  for (const [key, value] of Object.entries(initialValues)) {
    (fields as Record<string, FormField<unknown>>)[key] = {
      value,
      error: null,
      touched: false,
      dirty: false,
    };
  }

  return {
    fields,
    isValid: true,
    isDirty: false,
    isSubmitting: false,
    submitCount: 0,
  };
}

/** Set a field value */
export function setFieldValue<T extends Record<string, unknown>>(
  form: FormState<T>,
  fieldName: keyof T,
  value: unknown,
): FormState<T> {
  const field = form.fields[fieldName] as FormField<unknown>;
  if (!field) return form;

  return {
    ...form,
    fields: {
      ...form.fields,
      [fieldName]: {
        ...field,
        value: value as never,
        dirty: field.dirty || field.value !== value,
        error: field.touched ? validateFieldValue(value) : null,
      },
    },
    isDirty: Object.values({ ...form.fields, [fieldName]: { dirty: true } }).some((f) => f.dirty),
    isValid: validateForm(form),
  };
}

/** Set multiple field values at once */
export function setFormValues<T extends Record<string, unknown>>(
  form: FormState<T>,
  values: Partial<T>,
): FormState<T> {
  let updated = { ...form };

  for (const [key, value] of Object.entries(values)) {
    updated = setFieldValue(updated, key as keyof T, value);
  }

  return updated;
}

/** Touch a field (mark as interacted with) */
export function touchField<T extends Record<string, unknown>>(
  form: FormState<T>,
  fieldName: keyof T,
): FormState<T> {
  const field = form.fields[fieldName] as FormField<unknown>;
  if (!field || field.touched) return form;

  const error = validateFieldValue(field.value);

  return {
    ...form,
    fields: {
      ...form.fields,
      [fieldName]: { ...field, touched: true, error },
    },
    isValid: error === null && validateOtherFields(form, fieldName),
  };
}

/** Touch all fields */
export function touchAllFields<T extends Record<string, unknown>>(form: FormState<T>): FormState<T> {
  let updated = { ...form };

  for (const key of Object.keys(form.fields)) {
    updated = touchField(updated, key as keyof T);
  }

  return updated;
}

/** Validate a single field */
function validateFieldValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && !value.trim()) return "This field is required";
  return null;
}

/** Validate entire form except a specific field */
function validateOtherFields<T extends Record<string, unknown>>(
  form: FormState<T>,
  excludeKey?: keyof T,
): boolean {
  for (const [key, field] of Object.entries(form.fields)) {
    if (key === excludeKey) continue;

    const f = field as FormField<unknown>;
    if (f.error !== null) return false;
  }

  return true;
}

/** Validate the full form */
export function validateForm<T extends Record<string, unknown>>(form: FormState<T>): boolean {
  for (const field of Object.values(form.fields)) {
    if ((field as FormField<unknown>).error !== null) return false;
  }
  return true;
}

/** Reset form to initial values */
export function resetForm<T extends Record<string, unknown>>(
  form: FormState<T>,
  initialValues: T,
): FormState<T> {
  return createFormState(initialValues);
}

/** Get form data as plain object (values only) */
export function getFormData<T extends Record<string, unknown>>(form: FormState<T>): T {
  const data = {} as T;

  for (const [key, field] of Object.entries(form.fields)) {
    (data as Record<string, unknown>)[key] = (field as FormField<unknown>).value;
  }

  return data;
}

/** Check if form has any errors */
export function hasErrors<T extends Record<string, unknown>>(form: FormState<T>): boolean {
  return Object.values(form.fields).some(
    (f) => (f as FormField<unknown>).error !== null,
  );
}

/** Get all errors from form */
export function getFormErrors<T extends Record<string, unknown>>(
  form: FormState<T>,
): Record<string, string | null> {
  const errors: Record<string, string | null> = {};

  for (const [key, field] of Object.entries(form.fields)) {
    errors[key] = (field as FormField<unknown>).error;
  }

  return errors;
}

/** Mark form as submitting */
export function setSubmitting<T extends Record<string, unknown>>(
  form: FormState<T>,
  isSubmitting: boolean,
): FormState<T> {
  return {
    ...form,
    isSubmitting,
    submitCount: isSubmitting ? form.submitCount + 1 : form.submitCount,
  };
}
