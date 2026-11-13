/**
 * Debounces a function call by the specified delay in milliseconds.
 * Provides cancel() and flush() methods to clear or immediately execute pending invocations.
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delayMs: number
): ((...args: Parameters<T>) => void) & { cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = (...args: Parameters<T>) => {
    lastArgs = args;
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) {
        const argsToCall = lastArgs;
        lastArgs = null;
        fn(...argsToCall);
      }
    }, delayMs);
  };

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      if (lastArgs) {
        const argsToCall = lastArgs;
        lastArgs = null;
        fn(...argsToCall);
      }
    }
  };

  return debounced;
}

