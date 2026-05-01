import { UserProfile } from "../../../domain/entities/user-profile.entity";
import {
  CreateUserProfileRepositoryInput,
  UserProfileRepository,
} from "../../../domain/repositories/user-profile.repository";
import {
  CREATE_USER_PROFILE_ERROR_CODES,
} from "./create-user-profile.errors";
import { CreateUserProfileUseCase } from "./create-user-profile.use-case";

describe("CreateUserProfileUseCase", () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let useCase: CreateUserProfileUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    };

    useCase = new CreateUserProfileUseCase(userProfileRepository);
  });

  it("creates user profile successfully", async () => {
    const createdAt = new Date("2026-04-28T10:00:00.000Z");

    userProfileRepository.findByAuthUserId.mockResolvedValue(null);
    userProfileRepository.create.mockImplementation(
      async (input: CreateUserProfileRepositoryInput) =>
        new UserProfile({
          id: "profile_123",
          authUserId: input.authUserId,
          name: input.name,
          birthDate: input.birthDate,
          gender: input.gender,
          language: input.language,
          timezone: input.timezone,
          status: input.status,
          createdAt,
          updatedAt: createdAt,
        }),
    );

    const result = await useCase.execute({
      authUserId: "usr_123",
      name: "Rodrigo Paiva",
      birthDate: "1994-06-15",
      gender: "male",
    });

    expect(result).toEqual({
      userProfile: {
        id: "profile_123",
        authUserId: "usr_123",
        name: "Rodrigo Paiva",
        birthDate: new Date("1994-06-15"),
        gender: "male",
        language: "en-US",
        timezone: "UTC",
        status: "active",
        createdAt,
      },
    });
  });

  it("returns already exists when profile is created twice", async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: "profile_123",
        authUserId: "usr_123",
        name: "Rodrigo Paiva",
        language: "en-US",
        timezone: "UTC",
        status: "active",
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      }),
    );

    await expect(
      useCase.execute({
        authUserId: "usr_123",
        name: "Rodrigo Paiva",
      }),
    ).rejects.toMatchObject({
      code: CREATE_USER_PROFILE_ERROR_CODES.ALREADY_EXISTS,
    });
  });

  it("returns invalid session when authUserId is missing", async () => {
    await expect(
      useCase.execute({
        authUserId: "",
        name: "Rodrigo Paiva",
      }),
    ).rejects.toMatchObject({
      code: CREATE_USER_PROFILE_ERROR_CODES.INVALID_SESSION,
    });
  });
});
