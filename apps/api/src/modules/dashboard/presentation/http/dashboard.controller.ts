import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { AuthSessionGuard } from "../../../users/presentation/http/guards/auth-session.guard";
import {
  GET_HOME_DASHBOARD_ERROR_CODES,
  GetHomeDashboardError,
} from "../../application/use-cases/get-home-dashboard/get-home-dashboard.errors";
import { GetHomeDashboardDebugUseCase } from "../../application/use-cases/get-home-dashboard-debug/get-home-dashboard-debug.use-case";
import { GetHomeDashboardUseCase } from "../../application/use-cases/get-home-dashboard/get-home-dashboard.use-case";
import { GetHomeDashboardDebugResponseDto } from "./dto/get-home-dashboard-debug.response.dto";
import { GetHomeDashboardResponseDto } from "./dto/get-home-dashboard.response.dto";

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

class GetHomeDashboardQueryDto {}

class GetHomeDashboardBodyDto {}

@Controller("dashboard")
export class DashboardController {
  constructor(
    private readonly getHomeDashboardUseCase: GetHomeDashboardUseCase,
    private readonly getHomeDashboardDebugUseCase: GetHomeDashboardDebugUseCase,
  ) {}

  @Get("home")
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getHomeDashboard(
    @Req() request: RequestWithAuthUser,
    @Query() _query: GetHomeDashboardQueryDto,
    @Body() _body: GetHomeDashboardBodyDto,
  ): Promise<GetHomeDashboardResponseDto> {
    try {
      const result = await this.getHomeDashboardUseCase.execute({
        authUserId: request.authUser?.id ?? "",
      });

      return {
        dashboard: result.dashboard,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get("home/debug")
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getHomeDashboardDebug(
    @Req() request: RequestWithAuthUser,
    @Query() _query: GetHomeDashboardQueryDto,
    @Body() _body: GetHomeDashboardBodyDto,
  ): Promise<GetHomeDashboardDebugResponseDto> {
    try {
      return await this.getHomeDashboardDebugUseCase.execute({
        authUserId: request.authUser?.id ?? "",
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (!(error instanceof GetHomeDashboardError)) {
      throw new InternalServerErrorException("An unexpected error occurred.");
    }

    switch (error.code) {
      case GET_HOME_DASHBOARD_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_HOME_DASHBOARD_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_HOME_DASHBOARD_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_HOME_DASHBOARD_ERROR_CODES.INTERNAL_ERROR,
          message: "An unexpected error occurred.",
        });
    }
  }
}
