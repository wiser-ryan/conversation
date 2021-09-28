// To learn about settled promises visit https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
export type SettledResult<T> = {
  status: 'fulfilled' | 'rejected';
  value?: T;
  reason?: Error;
};

/**
 * Turn a promise into a settled promise, which means it doesn't throw anymore
 */
export const settle = <T>(val: Promise<T> | T): Promise<SettledResult<T>> =>
  Promise.resolve(val).then(
    (value) => ({
      status: 'fulfilled',
      value,
    }),
    (reason) => ({
      status: 'rejected',
      reason,
    })
  );

/**
 * Wrapper for CLI commands that do async operations, otherwise they would throw unhandled
 * rejections
 */
export const wrapAction = <T>(action: (args: T) => Promise<void>) => (args: T) =>
  action(args).catch((err: Error) => {
    console.error(err);
    process.exit(1);
  });
