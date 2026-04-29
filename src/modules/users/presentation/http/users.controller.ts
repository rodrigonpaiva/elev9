import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import {
  CREATE_USER_PROFILE_ERROR_CODES,
  CreateUserProfileError,
} from "../../application/use-cases/create-user-profile/create-user-profile.errors";
import { CreateUserProfileUseCase } from "../../application/use-cases/create-user-profile/create-user-profile.use-case";
import { CreateUserProfileRequestDto } from "./dto/create-user-profile.request.dto";
import { CreateUserProfileResponseDto } from "./dto/create-user-profile.response.dto";
import { AuthSessionGuard } from "./guards/auth-session.guard";

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

@Controller("users")
export class UsersController {
  constructor(
    private readonly createUserProfileUseCase: CreateUserProfileUseCase,
  ) {}

  @Post("profile")
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async createProfile(
    @Req() request: RequestWithAuthUser,
    @Body() body: CreateUserProfileRequestDto,
  ): Promise<CreateUserProfileResponseDto> {
    try {
      const result = await this.createUserProfileUseCase.execute({
        authUserId: request.authUser?.id ?? "",
        name: body.name,
        birthDate: body.birthDate,
        gender: body.gender,
      });

      return {
        userProfile: {
          id: result.userProfile.id,
          authUserId: result.userProfile.authUserId,
          name: result.userProfile.name,
          birthDate: result.userProfile.birthDate?.toISOString(),
          gender: result.userProfile.gender,
          language: result.userProfile.language,
          timezone: result.userProfile.timezone,
          status: result.userProfile.status,
          createdAt: result.userProfile.createdAt.toISOString(),
        },
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (!(error instanceof CreateUserProfileError)) {
      throw new InternalServerErrorException("An unexpected error occurred.");
    }

    switch (error.code) {
      case CREATE_USER_PROFILE_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_USER_PROFILE_ERROR_CODES.ALREADY_EXISTS:
        throw new ConflictException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_USER_PROFILE_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_USER_PROFILE_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: CREATE_USER_PROFILE_ERROR_CODES.INTERNAL_ERROR,
          message: "An unexpected error occurred.",
        });
    }
  }
}
