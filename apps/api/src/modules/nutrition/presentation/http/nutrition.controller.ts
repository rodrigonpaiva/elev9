import {
  BadRequestException,
  Body,
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
} from "@nestjs/common";

import { AuthSessionGuard } from "../../../users/presentation/http/guards/auth-session.guard";
import {
  CREATE_NUTRITION_PROFILE_ERROR_CODES,
  CreateNutritionProfileError,
} from "../../application/use-cases/create-nutrition-profile/create-nutrition-profile.errors";
import { CreateNutritionProfileUseCase } from "../../application/use-cases/create-nutrition-profile/create-nutrition-profile.use-case";
import {
  GET_NUTRITION_PROFILE_ERROR_CODES,
  GetNutritionProfileError,
} from "../../application/use-cases/get-nutrition-profile/get-nutrition-profile.errors";
import { GetNutritionProfileUseCase } from "../../application/use-cases/get-nutrition-profile/get-nutrition-profile.use-case";
import { CreateNutritionProfileRequestDto } from "./dto/create-nutrition-profile.request.dto";
import { CreateNutritionProfileResponseDto } from "./dto/create-nutrition-profile.response.dto";
import { GetNutritionProfileResponseDto } from "./dto/get-nutrition-profile.response.dto";

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

class GetNutritionProfileQueryDto {}

class GetNutritionProfileBodyDto {}

@Controller("nutrition")
export class NutritionController {
  constructor(
    private readonly createNutritionProfileUseCase: CreateNutritionProfileUseCase,
    private readonly getNutritionProfileUseCase: GetNutritionProfileUseCase,
  ) {}

  @Post("profile")
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async createProfile(
    @Req() request: RequestWithAuthUser,
    @Body() body: CreateNutritionProfileRequestDto,
  ): Promise<CreateNutritionProfileResponseDto> {
    try {
      const result = await this.createNutritionProfileUseCase.execute({
        authUserId: request.authUser?.id ?? "",
        goal: body.goal,
        mealsPerDay: body.mealsPerDay,
        dietaryRestrictions: body.dietaryRestrictions,
        allergies: body.allergies,
        dislikedFoods: body.dislikedFoods,
        preferredFoods: body.preferredFoods,
      });

      return {
        nutritionProfile: {
          id: result.nutritionProfile.id,
          userProfileId: result.nutritionProfile.userProfileId,
          goal: result.nutritionProfile.goal,
          mealsPerDay: result.nutritionProfile.mealsPerDay,
          dietaryRestrictions: result.nutritionProfile.dietaryRestrictions,
          allergies: result.nutritionProfile.allergies,
          dislikedFoods: result.nutritionProfile.dislikedFoods,
          preferredFoods: result.nutritionProfile.preferredFoods,
          status: result.nutritionProfile.status,
          createdAt: result.nutritionProfile.createdAt.toISOString(),
          updatedAt: result.nutritionProfile.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get("profile")
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(
    @Req() request: RequestWithAuthUser,
    @Query() _query: GetNutritionProfileQueryDto,
    @Body() _body: GetNutritionProfileBodyDto,
  ): Promise<GetNutritionProfileResponseDto> {
    try {
      const result = await this.getNutritionProfileUseCase.execute({
        authUserId: request.authUser?.id ?? "",
      });

      return {
        nutritionProfile: {
          id: result.nutritionProfile.id,
          userProfileId: result.nutritionProfile.userProfileId,
          goal: result.nutritionProfile.goal,
          mealsPerDay: result.nutritionProfile.mealsPerDay,
          dietaryRestrictions: result.nutritionProfile.dietaryRestrictions,
          allergies: result.nutritionProfile.allergies,
          dislikedFoods: result.nutritionProfile.dislikedFoods,
          preferredFoods: result.nutritionProfile.preferredFoods,
          status: result.nutritionProfile.status,
          createdAt: result.nutritionProfile.createdAt.toISOString(),
          updatedAt: result.nutritionProfile.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      this.handleGetProfileError(error);
    }
  }

  private handleError(error: unknown): never {
    if (!(error instanceof CreateNutritionProfileError)) {
      throw new InternalServerErrorException("An unexpected error occurred.");
    }

    switch (error.code) {
      case CREATE_NUTRITION_PROFILE_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_NUTRITION_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_NUTRITION_PROFILE_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_NUTRITION_PROFILE_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: CREATE_NUTRITION_PROFILE_ERROR_CODES.INTERNAL_ERROR,
          message: "An unexpected error occurred.",
        });
    }
  }

  private handleGetProfileError(error: unknown): never {
    if (!(error instanceof GetNutritionProfileError)) {
      throw new InternalServerErrorException("An unexpected error occurred.");
    }

    switch (error.code) {
      case GET_NUTRITION_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case GET_NUTRITION_PROFILE_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_NUTRITION_PROFILE_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_NUTRITION_PROFILE_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_NUTRITION_PROFILE_ERROR_CODES.INTERNAL_ERROR,
          message: "An unexpected error occurred.",
        });
    }
  }
}
