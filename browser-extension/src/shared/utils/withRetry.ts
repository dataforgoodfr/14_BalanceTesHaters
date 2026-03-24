export async function withRetry<T>({
  maxAttempts = 3,
  retryOn: shouldRetry = () => true,
  beforeRetry = () => Promise.resolve(),
  retry: retriableFn,
}: {
  maxAttempts?: number;
  retryOn?: (error: unknown) => boolean;
  /**
   * Called after a failure but before retrying
   * @param ctx
   * @returns
   */
  beforeRetry?: (ctx: {
    latestError: unknown;
    failedAttempts: number;
    remainingAttempts: number;
  }) => void | Promise<void>;
  retry: () => Promise<T>;
}): Promise<T> {
  let remainingAttempts = maxAttempts;
  for (;;) {
    try {
      return await retriableFn();
    } catch (error) {
      if (shouldRetry(error)) {
        remainingAttempts--;
        if (remainingAttempts > 0) {
          const failedAttempts = maxAttempts - remainingAttempts;
          await beforeRetry({
            latestError: error,
            remainingAttempts,
            failedAttempts,
          });
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }
}
