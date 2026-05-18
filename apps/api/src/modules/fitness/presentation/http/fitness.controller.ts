import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import {
  CREATE_FITNESS_PROFILE_ERROR_CODES,
  CreateFitnessProfileError,
} from '../../application/use-cases/create-fitness-profile/create-fitness-profile.errors';
import { CreateFitnessProfileUseCase } from '../../application/use-cases/create-fitness-profile/create-fitness-profile.use-case';
import {
  GET_MY_FITNESS_PROFILE_ERROR_CODES,
  GetMyFitnessProfileError,
} from '../../application/use-cases/get-my-fitness-profile/get-my-fitness-profile.errors';
import { GetMyFitnessProfileUseCase } from '../../application/use-cases/get-my-fitness-profile/get-my-fitness-profile.use-case';
import { CreateFitnessProfileRequestDto } from './dto/create-fitness-profile.request.dto';
import { CreateFitnessProfileResponseDto } from './dto/create-fitness-profile.response.dto';
import { GetMyFitnessProfileResponseDto } from './dto/get-my-fitness-profile.response.dto';
import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

class GetMyFitnessProfileQueryDto {}

class GetMyFitnessProfileBodyDto {}

@Controller('fitness')
export class FitnessController {
  constructor(
    private readonly createFitnessProfileUseCase: CreateFitnessProfileUseCase,
    private readonly getMyFitnessProfileUseCase: GetMyFitnessProfileUseCase,
  ) {}

  @Post('profile')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async createProfile(
    @Req() request: RequestWithAuthUser,
    @Body() body: CreateFitnessProfileRequestDto,
  ): Promise<CreateFitnessProfileResponseDto> {
    try {
      const result = await this.createFitnessProfileUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        heightCm: body.heightCm,
        weightKg: body.weightKg,
        goal: body.goal,
        activityLevel: body.activityLevel,
        trainingAvailability: {
          daysPerWeek: body.trainingAvailability.daysPerWeek,
          minutesPerSession: body.trainingAvailability.minutesPerSession,
        },
        limitations: body.limitations,
      });

      return {
        fitnessProfile: {
          id: result.fitnessProfile.id,
          userProfileId: result.fitnessProfile.userProfileId,
          heightCm: result.fitnessProfile.heightCm,
          weightKg: result.fitnessProfile.weightKg,
          goal: result.fitnessProfile.goal,
          activityLevel: result.fitnessProfile.activityLevel,
          trainingAvailability: result.fitnessProfile.trainingAvailability,
          limitations: result.fitnessProfile.limitations,
          status: result.fitnessProfile.status,
          createdAt: result.fitnessProfile.createdAt.toISOString(),
        },
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('profile')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getMyProfile(
    @Req() request: RequestWithAuthUser,
    @Query() _query: GetMyFitnessProfileQueryDto,
    @Body() _body: GetMyFitnessProfileBodyDto,
  ): Promise<GetMyFitnessProfileResponseDto> {
    try {
      const result = await this.getMyFitnessProfileUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        fitnessProfile: {
          id: result.fitnessProfile.id,
          userProfileId: result.fitnessProfile.userProfileId,
          heightCm: result.fitnessProfile.heightCm,
          weightKg: result.fitnessProfile.weightKg,
          goal: result.fitnessProfile.goal,
          activityLevel: result.fitnessProfile.activityLevel,
          trainingAvailability: result.fitnessProfile.trainingAvailability,
          limitations: result.fitnessProfile.limitations ?? [],
          status: result.fitnessProfile.status,
          createdAt: result.fitnessProfile.createdAt.toISOString(),
        },
      };
    } catch (error) {
      this.handleGetMyProfileError(error);
    }
  }

  private handleError(error: unknown): never {
    if (!(error instanceof CreateFitnessProfileError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case CREATE_FITNESS_PROFILE_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_FITNESS_PROFILE_ERROR_CODES.ALREADY_EXISTS:
        throw new ConflictException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_FITNESS_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_FITNESS_PROFILE_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_FITNESS_PROFILE_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: CREATE_FITNESS_PROFILE_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleGetMyProfileError(error: unknown): never {
    if (!(error instanceof GetMyFitnessProfileError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_MY_FITNESS_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case GET_MY_FITNESS_PROFILE_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_MY_FITNESS_PROFILE_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_MY_FITNESS_PROFILE_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_MY_FITNESS_PROFILE_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }
}
