export async function shutdownWithTimeout(
  shutdown: () => Promise<void>,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<void> {
  let timeoutHandle: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      shutdown(),
      new Promise<void>((resolve) => {
        timeoutHandle = setTimeout(() => {
          onTimeout();
          resolve();
        }, timeoutMs);
      }),
    ]);
  } catch {
    onTimeout();
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}
