export type AsyncContentState = "loading" | "error" | "ready" | "empty";

export function resolveAsyncContentState<T>(input: {
  loading: boolean;
  error?: string | null;
  data: T | null | undefined;
}): AsyncContentState {
  if (input.loading) return "loading";
  if (input.error) return "error";
  if (input.data == null) return "empty";
  return "ready";
}
