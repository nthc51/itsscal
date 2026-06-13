export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string | null;
}

export interface ApiErrorShape {
  message: string;
  status?: number;
  details?: string | null;
}