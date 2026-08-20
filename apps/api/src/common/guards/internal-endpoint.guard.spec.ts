import { NotFoundException } from '@nestjs/common';

import { InternalEndpointGuard } from './internal-endpoint.guard';

describe('InternalEndpointGuard', () => {
  const context = {} as never;

  it('blocks internal routes outside explicit development', () => {
    process.env.NODE_ENV = 'production';

    expect(() => new InternalEndpointGuard().canActivate(context)).toThrow(
      NotFoundException,
    );
  });

  it('allows the environment gate in explicit development', () => {
    process.env.NODE_ENV = 'development';

    expect(new InternalEndpointGuard().canActivate(context)).toBe(true);
  });
});
