import { applyDecorators, UseGuards } from '@nestjs/common';

import { AuthSessionGuard } from '../../modules/users/presentation/http/guards/auth-session.guard';
import { InternalEndpointGuard } from '../guards/internal-endpoint.guard';

export function InternalEndpoint() {
  return applyDecorators(UseGuards(InternalEndpointGuard, AuthSessionGuard));
}
