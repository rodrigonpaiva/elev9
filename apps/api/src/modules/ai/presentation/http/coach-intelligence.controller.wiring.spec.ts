import { Test } from '@nestjs/testing';

import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import { ValidateSessionUseCase } from '../../../auth/application/use-cases/validate-session/validate-session.use-case';
import { GetCoachIntelligenceUseCase } from '../../application/use-cases/get-coach-intelligence/get-coach-intelligence.use-case';
import { CoachIntelligenceController } from './coach-intelligence.controller';

describe('CoachIntelligenceController wiring', () => {
  it('resolves the controller and its use case dependency', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CoachIntelligenceController],
      providers: [
        AuthSessionGuard,
        {
          provide: ValidateSessionUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: GetCoachIntelligenceUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    expect(moduleRef.get(CoachIntelligenceController)).toBeInstanceOf(
      CoachIntelligenceController,
    );
    expect(moduleRef.get(GetCoachIntelligenceUseCase)).toBeDefined();
  });
});
