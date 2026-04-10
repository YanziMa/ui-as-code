/**
 * Shared TypeScript type definitions used across the app.
 */

/** Generic result type for async operations */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/** Paginated request params */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest" | "votes" | "affected";
}

/** Paginated response */
export interface PaginatedData<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Date range filter */
export interface DateRange {
  from?: string;
  to?: string;
}

/** Select option for dropdowns */
export interface SelectOption<T = string> {
  label: string;
  value: T;
}

/** Color palette token */
export interface ColorToken {
  name: string;
  value: string;
}
