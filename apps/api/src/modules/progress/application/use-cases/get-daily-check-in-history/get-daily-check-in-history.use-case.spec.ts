import { DailyCheckIn } from "../../../domain/entities/daily-check-in.entity";
import { DailyCheckInRepository } from "../../../domain/repositories/daily-check-in.repository";
import { UserProfileRepository } from "../../../../users/domain/repositories/user-profile.repository";
import {
  GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES,
  GetDailyCheckInHistoryError,
} from "./get-daily-check-in-history.errors";
import { GetDailyCheckInHistoryUseCase } from "./get-daily-check-in-history.use-case";

describe("GetDailyCheckInHistoryUseCase", () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let dailyCheckInRepository: jest.Mocked<DailyCheckInRepository>;
  let useCase: GetDailyCheckInHistoryUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
    dailyCheckInRepository = {
      create: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn(),
    } as unknown as jest.Mocked<DailyCheckInRepository>;

    useCase = new GetDailyCheckInHistoryUseCase(
      userProfileRepository,
      dailyCheckInRepository,
    );
  });

  it("returns the authenticated user's daily check-in history", async () => {
    mockUserProfile(userProfileRepository);
    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue([
      buildDailyCheckIn("checkin_1", "2026-05-13T10:00:00.000Z"),
      buildDailyCheckIn("checkin_2", "2026-05-14T10:00:00.000Z"),
    ]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(dailyCheckInRepository.findManyByUserProfileId).toHaveBeenCalledWith(
      "profile_123",
    );
    expect(result.dailyCheckIns).toEqual([
      {
        id: "checkin_2",
        energyLevel: 4,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 5,
        createdAt: "2026-05-14T10:00:00.000Z",
      },
      {
        id: "checkin_1",
        energyLevel: 4,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 5,
        createdAt: "2026-05-13T10:00:00.000Z",
      },
    ]);
  });

  it("applies limit to the daily check-in history", async () => {
    mockUserProfile(userProfileRepository);
    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue([
      buildDailyCheckIn("checkin_1", "2026-05-12T10:00:00.000Z"),
      buildDailyCheckIn("checkin_2", "2026-05-13T10:00:00.000Z"),
      buildDailyCheckIn("checkin_3", "2026-05-14T10:00:00.000Z"),
    ]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
      limit: 2,
    });

    expect(result.dailyCheckIns).toHaveLength(2);
    expect(result.dailyCheckIns.map((item) => item.id)).toEqual([
      "checkin_3",
      "checkin_2",
    ]);
  });

  it("returns an empty array when there are no daily check-ins", async () => {
    mockUserProfile(userProfileRepository);
    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue([]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result).toEqual({ dailyCheckIns: [] });
  });

  it("keeps user isolation by querying only the authenticated user's profile id", async () => {
    mockUserProfile(userProfileRepository);
    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue([]);

    await useCase.execute({
      authUserId: "auth_user_123",
      limit: 10,
    });

    expect(dailyCheckInRepository.findManyByUserProfileId).toHaveBeenCalledWith(
      "profile_123",
    );
  });

  it("throws USER_PROFILE_NOT_FOUND when user profile does not exist", async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: "auth_user_123" }),
    ).rejects.toMatchObject({
      code: GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it("throws INVALID_INPUT when limit is invalid", async () => {
    await expect(
      useCase.execute({ authUserId: "auth_user_123", limit: 101 }),
    ).rejects.toMatchObject({
      code: GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES.INVALID_INPUT,
    });
  });

  it("maps unexpected repository failures to INTERNAL_ERROR", async () => {
    userProfileRepository.findByAuthUserId.mockRejectedValue(
      new Error("database unavailable"),
    );

    await expect(
      useCase.execute({ authUserId: "auth_user_123" }),
    ).rejects.toEqual(
      new GetDailyCheckInHistoryError(
        GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      ),
    );
  });
});

function mockUserProfile(
  userProfileRepository: jest.Mocked<UserProfileRepository>,
): void {
  userProfileRepository.findByAuthUserId.mockResolvedValue({
    id: "profile_123",
    authUserId: "auth_user_123",
    name: "Rodrigo",
    birthDate: undefined,
    gender: undefined,
    language: "en-US",
    timezone: "UTC",
    status: "active",
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    updatedAt: new Date("2026-05-01T10:00:00.000Z"),
  });
}

function buildDailyCheckIn(id: string, createdAt: string): DailyCheckIn {
  return new DailyCheckIn({
    id,
    userProfileId: "profile_123",
    energyLevel: 4,
    sleepQuality: 3,
    muscleSoreness: 2,
    motivationLevel: 5,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  });
}
