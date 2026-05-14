import "reflect-metadata";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { CreateDailyCheckInRequestDto } from "./create-daily-check-in.request.dto";

describe("CreateDailyCheckInRequestDto", () => {
  it("validates integer scores between 1 and 5", async () => {
    const dto = plainToInstance(CreateDailyCheckInRequestDto, {
      energyLevel: 4,
      sleepQuality: 3,
      muscleSoreness: 2,
      motivationLevel: 5,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("fails when scores are outside min/max", async () => {
    const dto = plainToInstance(CreateDailyCheckInRequestDto, {
      energyLevel: 0,
      sleepQuality: 6,
      muscleSoreness: 2,
      motivationLevel: 5,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["energyLevel", "sleepQuality"]),
    );
  });

  it("fails when scores are not integers", async () => {
    const dto = plainToInstance(CreateDailyCheckInRequestDto, {
      energyLevel: 4.2,
      sleepQuality: "3.5",
      muscleSoreness: 2,
      motivationLevel: 5,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["energyLevel", "sleepQuality"]),
    );
  });

  it("fails when required fields are missing", async () => {
    const dto = plainToInstance(CreateDailyCheckInRequestDto, {});

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        "energyLevel",
        "sleepQuality",
        "muscleSoreness",
        "motivationLevel",
      ]),
    );
  });
});
