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
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import { NutritionLog } from '../../domain/entities/nutrition-log.entity';
import { NutritionPlan } from '../../domain/entities/nutrition-plan.entity';
import { NutritionRecommendation } from '../../domain/entities/nutrition-recommendation.entity';
import {
  CALCULATE_MACRO_TARGETS_ERROR_CODES,
  CalculateMacroTargetsError,
} from '../../application/use-cases/calculate-macro-targets/calculate-macro-targets.errors';
import { CalculateMacroTargetsUseCase } from '../../application/use-cases/calculate-macro-targets/calculate-macro-targets.use-case';
import {
  CREATE_NUTRITION_PLAN_ERROR_CODES,
  CreateNutritionPlanError,
} from '../../application/use-cases/create-nutrition-plan/create-nutrition-plan.errors';
import { CreateNutritionPlanUseCase } from '../../application/use-cases/create-nutrition-plan/create-nutrition-plan.use-case';
import {
  CREATE_NUTRITION_PROFILE_ERROR_CODES,
  CreateNutritionProfileError,
} from '../../application/use-cases/create-nutrition-profile/create-nutrition-profile.errors';
import { CreateNutritionProfileUseCase } from '../../application/use-cases/create-nutrition-profile/create-nutrition-profile.use-case';
import {
  GET_CURRENT_NUTRITION_PLAN_ERROR_CODES,
  GetCurrentNutritionPlanError,
} from '../../application/use-cases/get-current-nutrition-plan/get-current-nutrition-plan.errors';
import { GetCurrentNutritionPlanUseCase } from '../../application/use-cases/get-current-nutrition-plan/get-current-nutrition-plan.use-case';
import {
  GET_NUTRITION_PROFILE_ERROR_CODES,
  GetNutritionProfileError,
} from '../../application/use-cases/get-nutrition-profile/get-nutrition-profile.errors';
import { GetNutritionProfileUseCase } from '../../application/use-cases/get-nutrition-profile/get-nutrition-profile.use-case';
import {
  GET_NUTRITION_RECOMMENDATIONS_ERROR_CODES,
  GetNutritionRecommendationsError,
} from '../../application/use-cases/get-nutrition-recommendations/get-nutrition-recommendations.errors';
import { GetNutritionRecommendationsUseCase } from '../../application/use-cases/get-nutrition-recommendations/get-nutrition-recommendations.use-case';
import {
  GET_TODAY_NUTRITION_ERROR_CODES,
  GetTodayNutritionError,
} from '../../application/use-cases/get-today-nutrition/get-today-nutrition.errors';
import { GetTodayNutritionUseCase } from '../../application/use-cases/get-today-nutrition/get-today-nutrition.use-case';
import {
  GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES,
  GenerateNutritionRecommendationError,
} from '../../application/use-cases/generate-nutrition-recommendation/generate-nutrition-recommendation.errors';
import { GenerateNutritionRecommendationUseCase } from '../../application/use-cases/generate-nutrition-recommendation/generate-nutrition-recommendation.use-case';
import {
  LOG_MEAL_ERROR_CODES,
  LogMealError,
} from '../../application/use-cases/log-meal/log-meal.errors';
import { LogMealUseCase } from '../../application/use-cases/log-meal/log-meal.use-case';
import {
  REPLACE_MEAL_ERROR_CODES,
  ReplaceMealError,
} from '../../application/use-cases/replace-meal/replace-meal.errors';
import { ReplaceMealUseCase } from '../../application/use-cases/replace-meal/replace-meal.use-case';
import { CreateNutritionProfileRequestDto } from './dto/create-nutrition-profile.request.dto';
import { CreateNutritionProfileResponseDto } from './dto/create-nutrition-profile.response.dto';
import { CalculateMacroTargetsResponseDto } from './dto/calculate-macro-targets.response.dto';
import { CreateNutritionPlanResponseDto } from './dto/create-nutrition-plan.response.dto';
import { GetCurrentNutritionPlanResponseDto } from './dto/get-current-nutrition-plan.response.dto';
import { GetNutritionProfileResponseDto } from './dto/get-nutrition-profile.response.dto';
import { GetTodayNutritionResponseDto } from './dto/get-today-nutrition.response.dto';
import { LogMealRequestDto } from './dto/log-meal.request.dto';
import { LogMealResponseDto } from './dto/log-meal.response.dto';
import { GetNutritionRecommendationsQueryDto } from './dto/get-nutrition-recommendations.query.dto';
import {
  GenerateNutritionRecommendationResponseDto,
  GetNutritionRecommendationsResponseDto,
} from './dto/nutrition-recommendation.response.dto';
import { ReplaceMealRequestDto } from './dto/replace-meal.request.dto';
import { ReplaceMealResponseDto } from './dto/replace-meal.response.dto';

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

class GetNutritionProfileQueryDto {}

class GetNutritionProfileBodyDto {}

@Controller('nutrition')
export class NutritionController {
  constructor(
    private readonly createNutritionProfileUseCase: CreateNutritionProfileUseCase,
    private readonly getNutritionProfileUseCase: GetNutritionProfileUseCase,
    private readonly calculateMacroTargetsUseCase: CalculateMacroTargetsUseCase,
    private readonly createNutritionPlanUseCase: CreateNutritionPlanUseCase,
    private readonly getCurrentNutritionPlanUseCase: GetCurrentNutritionPlanUseCase,
    private readonly getTodayNutritionUseCase: GetTodayNutritionUseCase,
    private readonly logMealUseCase: LogMealUseCase,
    private readonly replaceMealUseCase: ReplaceMealUseCase,
    private readonly generateNutritionRecommendationUseCase: GenerateNutritionRecommendationUseCase,
    private readonly getNutritionRecommendationsUseCase: GetNutritionRecommendationsUseCase,
  ) {}

  @Post('profile')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async createProfile(
    @Req() request: RequestWithAuthUser,
    @Body() body: CreateNutritionProfileRequestDto,
  ): Promise<CreateNutritionProfileResponseDto> {
    try {
      const result = await this.createNutritionProfileUseCase.execute({
        authUserId: request.authUser?.id ?? '',
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

  @Get('profile')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(
    @Req() request: RequestWithAuthUser,
    @Query() _query: GetNutritionProfileQueryDto,
    @Body() _body: GetNutritionProfileBodyDto,
  ): Promise<GetNutritionProfileResponseDto> {
    try {
      const result = await this.getNutritionProfileUseCase.execute({
        authUserId: request.authUser?.id ?? '',
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

  @Post('macro-targets/calculate')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async calculateMacroTargets(
    @Req() request: RequestWithAuthUser,
  ): Promise<CalculateMacroTargetsResponseDto> {
    try {
      return await this.calculateMacroTargetsUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });
    } catch (error) {
      this.handleCalculateMacroTargetsError(error);
    }
  }

  @Post('plans')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async createNutritionPlan(
    @Req() request: RequestWithAuthUser,
  ): Promise<CreateNutritionPlanResponseDto> {
    try {
      const result = await this.createNutritionPlanUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        nutritionPlan: mapNutritionPlan(result.nutritionPlan),
      };
    } catch (error) {
      this.handleCreateNutritionPlanError(error);
    }
  }

  @Get('plans/current')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCurrentNutritionPlan(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetCurrentNutritionPlanResponseDto> {
    try {
      const result = await this.getCurrentNutritionPlanUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        nutritionPlan: mapNutritionPlan(result.nutritionPlan),
      };
    } catch (error) {
      this.handleGetCurrentNutritionPlanError(error);
    }
  }

  @Get('today')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getTodayNutrition(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetTodayNutritionResponseDto> {
    try {
      const result = await this.getTodayNutritionUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        todayNutrition: {
          availability: result.todayNutrition.availability,
          freshness: result.todayNutrition.freshness,
          lastUpdatedAt: result.todayNutrition.lastUpdatedAt,
          timezone: result.todayNutrition.timezone,
          date: result.todayNutrition.date,
          macroTargets: result.todayNutrition.macroTargets,
          meals: result.todayNutrition.meals.map(mapMeal),
          progress: result.todayNutrition.progress,
          mealProgress: result.todayNutrition.mealProgress,
          nextMeal: result.todayNutrition.nextMeal
            ? mapMeal(result.todayNutrition.nextMeal)
            : null,
          nutritionFocus: result.todayNutrition.nutritionFocus,
        },
      };
    } catch (error) {
      this.handleGetTodayNutritionError(error);
    }
  }

  @Post('logs')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async logMeal(
    @Req() request: RequestWithAuthUser,
    @Body() body: LogMealRequestDto,
  ): Promise<LogMealResponseDto> {
    try {
      const result = await this.logMealUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        mealId: body.mealId,
        date: body.date,
        status: body.status,
        actualMacros: body.actualMacros,
      });

      return {
        nutritionLog: mapNutritionLog(result.nutritionLog),
      };
    } catch (error) {
      this.handleLogMealError(error);
    }
  }

  @Post('meals/:mealId/replace')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async replaceMeal(
    @Req() request: RequestWithAuthUser,
    @Param('mealId') mealId: string,
    @Body() body: ReplaceMealRequestDto,
  ): Promise<ReplaceMealResponseDto> {
    try {
      const result = await this.replaceMealUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        mealId,
        reason: body.reason,
      });

      return {
        meal: mapMeal(result.meal),
        replacement: {
          previousMeal: mapMeal(result.replacement.previousMeal),
          reason: result.replacement.reason,
          replacedAt: result.replacement.replacedAt,
        },
      };
    } catch (error) {
      this.handleReplaceMealError(error);
    }
  }

  @Post('recommendations')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async generateNutritionRecommendation(
    @Req() request: RequestWithAuthUser,
  ): Promise<GenerateNutritionRecommendationResponseDto> {
    try {
      const result = await this.generateNutritionRecommendationUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        nutritionRecommendation: mapNutritionRecommendation(
          result.nutritionRecommendation,
        ),
      };
    } catch (error) {
      this.handleGenerateNutritionRecommendationError(error);
    }
  }

  @Get('recommendations')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getNutritionRecommendations(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetNutritionRecommendationsQueryDto,
  ): Promise<GetNutritionRecommendationsResponseDto> {
    try {
      const result = await this.getNutritionRecommendationsUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        limit: query.limit,
      });

      return {
        recommendations: result.recommendations.map(mapNutritionRecommendation),
      };
    } catch (error) {
      this.handleGetNutritionRecommendationsError(error);
    }
  }

  private handleError(error: unknown): never {
    if (!(error instanceof CreateNutritionProfileError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
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
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleGetProfileError(error: unknown): never {
    if (!(error instanceof GetNutritionProfileError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
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
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleCalculateMacroTargetsError(error: unknown): never {
    if (!(error instanceof CalculateMacroTargetsError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case CALCULATE_MACRO_TARGETS_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CALCULATE_MACRO_TARGETS_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case CALCULATE_MACRO_TARGETS_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND:
      case CALCULATE_MACRO_TARGETS_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CALCULATE_MACRO_TARGETS_ERROR_CODES.HEIGHT_CM_MISSING:
      case CALCULATE_MACRO_TARGETS_ERROR_CODES.WEIGHT_KG_MISSING:
      case CALCULATE_MACRO_TARGETS_ERROR_CODES.INVALID_GOAL:
      case CALCULATE_MACRO_TARGETS_ERROR_CODES.INVALID_ACTIVITY_LEVEL:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CALCULATE_MACRO_TARGETS_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: CALCULATE_MACRO_TARGETS_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleCreateNutritionPlanError(error: unknown): never {
    if (!(error instanceof CreateNutritionPlanError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case CREATE_NUTRITION_PLAN_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_NUTRITION_PLAN_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case CREATE_NUTRITION_PLAN_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND:
      case CREATE_NUTRITION_PLAN_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_NUTRITION_PLAN_ERROR_CODES.HEIGHT_CM_MISSING:
      case CREATE_NUTRITION_PLAN_ERROR_CODES.WEIGHT_KG_MISSING:
      case CREATE_NUTRITION_PLAN_ERROR_CODES.INVALID_GOAL:
      case CREATE_NUTRITION_PLAN_ERROR_CODES.INVALID_ACTIVITY_LEVEL:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_NUTRITION_PLAN_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: CREATE_NUTRITION_PLAN_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleGetCurrentNutritionPlanError(error: unknown): never {
    if (!(error instanceof GetCurrentNutritionPlanError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_CURRENT_NUTRITION_PLAN_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_CURRENT_NUTRITION_PLAN_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case GET_CURRENT_NUTRITION_PLAN_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_CURRENT_NUTRITION_PLAN_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_CURRENT_NUTRITION_PLAN_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleGetTodayNutritionError(error: unknown): never {
    if (!(error instanceof GetTodayNutritionError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_TODAY_NUTRITION_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_TODAY_NUTRITION_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case GET_TODAY_NUTRITION_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND:
      case GET_TODAY_NUTRITION_ERROR_CODES.NUTRITION_DAY_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_TODAY_NUTRITION_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_TODAY_NUTRITION_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleLogMealError(error: unknown): never {
    if (!(error instanceof LogMealError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case LOG_MEAL_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case LOG_MEAL_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case LOG_MEAL_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND:
      case LOG_MEAL_ERROR_CODES.MEAL_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case LOG_MEAL_ERROR_CODES.INVALID_INPUT:
      case LOG_MEAL_ERROR_CODES.MEAL_DATE_MISMATCH:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case LOG_MEAL_ERROR_CODES.DUPLICATE_LOG:
        throw new ConflictException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case LOG_MEAL_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: LOG_MEAL_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleReplaceMealError(error: unknown): never {
    if (!(error instanceof ReplaceMealError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case REPLACE_MEAL_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
        });
      case REPLACE_MEAL_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case REPLACE_MEAL_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND:
      case REPLACE_MEAL_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND:
      case REPLACE_MEAL_ERROR_CODES.MEAL_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
        });
      case REPLACE_MEAL_ERROR_CODES.MEAL_ALREADY_LOGGED:
        throw new ConflictException({
          code: error.code,
          message: error.message,
        });
      case REPLACE_MEAL_ERROR_CODES.NO_COMPATIBLE_ALTERNATIVE:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
        });
      case REPLACE_MEAL_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: REPLACE_MEAL_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleGenerateNutritionRecommendationError(error: unknown): never {
    if (!(error instanceof GenerateNutritionRecommendationError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
        });
      case GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND:
      case GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
        });
      case GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleGetNutritionRecommendationsError(error: unknown): never {
    if (!(error instanceof GetNutritionRecommendationsError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_NUTRITION_RECOMMENDATIONS_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
        });
      case GET_NUTRITION_RECOMMENDATIONS_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
        });
      case GET_NUTRITION_RECOMMENDATIONS_ERROR_CODES.INVALID_LIMIT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
        });
      case GET_NUTRITION_RECOMMENDATIONS_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_NUTRITION_RECOMMENDATIONS_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }
}

function mapNutritionPlan(
  plan: NutritionPlan,
): CreateNutritionPlanResponseDto['nutritionPlan'] {
  return {
    id: plan.id,
    userProfileId: plan.userProfileId,
    nutritionProfileId: plan.nutritionProfileId,
    fitnessProfileId: plan.fitnessProfileId,
    status: plan.status,
    weekStartDate: plan.weekStartDate,
    weekEndDate: plan.weekEndDate,
    macroTargets: plan.macroTargets,
    days: plan.days.map((day) => ({
      date: day.date,
      dayIndex: day.dayIndex,
      dailyMacroTargets: day.dailyMacroTargets,
      meals: day.meals.map(mapMeal),
    })),
    generatedBy: plan.generatedBy,
    sourceContext: plan.sourceContext,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt?.toISOString(),
    replacedAt: plan.replacedAt?.toISOString(),
  };
}

function mapMeal(
  meal: NutritionPlan['days'][number]['meals'][number],
): CreateNutritionPlanResponseDto['nutritionPlan']['days'][number]['meals'][number] {
  return {
    id: meal.id,
    type: meal.type,
    title: meal.title,
    description: meal.description,
    foodItems: meal.foodItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      estimatedMacros: item.estimatedMacros,
      tags: item.tags,
    })),
    estimatedMacros: meal.estimatedMacros,
    alternatives: meal.alternatives.map((alternative) => ({
      id: alternative.id,
      title: alternative.title,
      foodItems: alternative.foodItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        estimatedMacros: item.estimatedMacros,
        tags: item.tags,
      })),
      estimatedMacros: alternative.estimatedMacros,
      reason: alternative.reason,
    })),
    status: meal.status,
  };
}

function mapNutritionLog(
  log: NutritionLog,
): LogMealResponseDto['nutritionLog'] {
  return {
    id: log.id,
    userProfileId: log.userProfileId,
    nutritionPlanId: log.nutritionPlanId,
    mealId: log.mealId,
    date: log.date,
    mealType: log.mealType,
    status: log.status,
    actualMacros: log.actualMacros,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt.toISOString(),
  };
}

function mapNutritionRecommendation(
  recommendation: NutritionRecommendation,
): GenerateNutritionRecommendationResponseDto['nutritionRecommendation'] {
  return {
    id: recommendation.id,
    userProfileId: recommendation.userProfileId,
    message: recommendation.message,
    recommendations: recommendation.recommendations,
    influences: recommendation.influences,
    generatorVersion: recommendation.generatorVersion,
    contextSnapshot: recommendation.contextSnapshot as Record<string, unknown>,
    createdAt: recommendation.createdAt.toISOString(),
  };
}
