export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export type ApiEnvelope<T> =
  | { success: true; message: string; data: T; meta?: PaginationMeta }
  | {
      success: false;
      message: string;
      errors?: Record<string, string[]>;
      traceId?: string;
    };
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string[]>,
    public traceId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
