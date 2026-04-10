/**
 * GraphQL query builder and utilities (client-side, no runtime dependency).
 */

export interface GqlVariable {
  [key: string]: unknown;
}

export interface GqlRequest<V extends GqlVariable = GqlVariable> {
  query: string;
  variables?: V;
  operationName?: string;
}

/** Build a GraphQL request object */
export function gql<V extends GqlVariable = GqlVariable>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): GqlRequest<V> {
  let query = "";
  for (let i = 0; i < strings.length; i++) {
    query += strings[i];
    if (i < values.length) {
      query += String(values[i]);
    }
  }

  return { query };
}

/** Parse a simple GraphQL query string into operation type and name */
export function parseGqlOperation(queryString: string): {
  type: "query" | "mutation" | "subscription";
  name: string | null;
} const trimmed = queryString.trim();

  if (trimmed.startsWith("mutation")) {
    const match = trimmed.match(/mutation\s+(\w+)/);
    return { type: "mutation", name: match?.[1] ?? null };
  }
  if (trimmed.startsWith("subscription")) {
    const match = trimmed.match(/subscription\s+(\w+)/);
    return { type: "subscription", name: match?.[1] ?? null };
  }
  // Default to query
  const match = trimmed.match(/(?:query\s+)?(\w*)/);
  return { type: "query", name: match?.[1] || null };
}

/** Extract variable names from a GraphQL query string */
export function extractVariables(queryString: string): string[] {
  const regex = /\$(\w+)/g;
  const vars = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(queryString)) !== null) {
    vars.add(match[1]);
  }

  return [...vars];
}

/** Extract field names from the selection set of a query */
export function extractFields(queryString: string): string[] {
  // Remove query/mutation keyword and name
  const cleaned = queryString
    .replace(/^\s*(query|mutation|subscription)\s+\w*\s*[\({]?/gm, "")
    .replace(/\)\s*\{/g, "{")
    .trim();

  // Simple extraction — find top-level fields in the root selection
  const fieldRegex = /^\s*(?:\w+\s*:)?(\w+)\s*(?:\{|\n)/gm;
  const fields: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = fieldRegex.exec(cleaned)) !== null) {
    if (!["query", "mutation", "subscription", "__typename"].includes(match[1])) {
      fields.push(match[1]);
    }
  }

  return [...new Set(fields)];
}

/** Execute a GraphQL request against an endpoint */
export async function executeGql<T = unknown>(
  endpoint: string,
  request: GqlRequest,
  options?: RequestInit & {
    /** Custom headers */
    headers?: Record<string, string>;
    /** Auth token */
    token?: string;
  },
): Promise<{ data: T | null; errors?: Array<{ message: string; path?: string[] }>; status: number }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  if (options?.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    body: JSON.stringify({
      query: request.query,
      variables: request.variables ?? {},
      operationName: request.operationName,
    }),
    headers,
    ...options,
  });

  const json = await response.json();
  return {
    data: json.data ?? null,
    errors: json.errors,
    status: response.status,
  };
}

/** Build a GraphQL fragment for reuse */
export function fragment(name: string, onType: string, fields: string): string {
  `fragment ${name} on ${onType} {\n${fields}\n}`;
  return `fragment ${name} on ${onType} {\n${fields}\n}`;
}
