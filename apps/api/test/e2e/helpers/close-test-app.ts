import { disconnect } from 'mongoose';

import { TestAppContext } from './create-test-app';

export async function closeTestApp(
  context: Partial<TestAppContext> | undefined,
): Promise<void> {
  if (context?.app) {
    await context.app.close();
  }

  await disconnect();

  if (context?.mongoMemoryServer) {
    await context.mongoMemoryServer.stop();
  }
}
