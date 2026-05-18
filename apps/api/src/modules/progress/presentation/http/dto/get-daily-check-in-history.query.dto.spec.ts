import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { GetDailyCheckInHistoryQueryDto } from './get-daily-check-in-history.query.dto';

describe('GetDailyCheckInHistoryQueryDto', () => {
  it('accepts a valid limit', async () => {
    const dto = plainToInstance(GetDailyCheckInHistoryQueryDto, {
      limit: '10',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(10);
  });

  it('rejects a limit greater than 100', async () => {
    const dto = plainToInstance(GetDailyCheckInHistoryQueryDto, {
      limit: '101',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });

  it('rejects a non-integer limit', async () => {
    const dto = plainToInstance(GetDailyCheckInHistoryQueryDto, {
      limit: 'abc',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });
});
