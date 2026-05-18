import "reflect-metadata";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { CreateNutritionProfileRequestDto } from "./create-nutrition-profile.request.dto";

describe("CreateNutritionProfileRequestDto", () => {
  it("validates goal values", async () => {
    const dto = plainToInstance(CreateNutritionProfileRequestDto, {
      goal: "invalid_goal",
      mealsPerDay: 4,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["goal"]),
    );
  });

  it("validates mealsPerDay lower than 1", async () => {
    const dto = plainToInstance(CreateNutritionProfileRequestDto, {
      goal: "fat_loss",
      mealsPerDay: 0,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["mealsPerDay"]),
    );
  });

  it("validates mealsPerDay greater than 8", async () => {
    const dto = plainToInstance(CreateNutritionProfileRequestDto, {
      goal: "fat_loss",
      mealsPerDay: 9,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["mealsPerDay"]),
    );
  });

  it("validates mealsPerDay as an integer", async () => {
    const dto = plainToInstance(CreateNutritionProfileRequestDto, {
      goal: "fat_loss",
      mealsPerDay: "3.5",
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["mealsPerDay"]),
    );
  });

  it("accepts optional arrays of strings", async () => {
    const dto = plainToInstance(CreateNutritionProfileRequestDto, {
      goal: "muscle_gain",
      mealsPerDay: 4,
      dietaryRestrictions: ["vegetarian"],
      allergies: ["peanut"],
      dislikedFoods: ["broccoli"],
      preferredFoods: ["rice"],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
