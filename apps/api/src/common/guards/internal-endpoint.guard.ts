import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { areInternalEndpointsEnabled } from '../../config/security.config';

@Injectable()
export class InternalEndpointGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    if (!areInternalEndpointsEnabled()) {
      throw new NotFoundException();
    }

    return true;
  }
}
