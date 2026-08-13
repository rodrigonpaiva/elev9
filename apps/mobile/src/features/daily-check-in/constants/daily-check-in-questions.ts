import type { DailyCheckInField } from '../models/daily-check-in-form-state';

export type DailyCheckInQuestion = {
  field: DailyCheckInField;
  title: string;
  description: string;
  lowLabel: string;
  highLabel: string;
  scaleLabels: readonly [string, string, string, string, string];
};

export const DAILY_CHECK_IN_QUESTIONS: readonly DailyCheckInQuestion[] = [
  {
    field: 'energyLevel',
    title: 'How is your energy today?',
    description: 'Think about how ready you feel to move through your day.',
    lowLabel: 'Very low',
    highLabel: 'Very high',
    scaleLabels: ['Very low', 'Low', 'Moderate', 'High', 'Very high'],
  },
  {
    field: 'sleepQuality',
    title: 'How well did you sleep?',
    description: 'Rate the quality of your sleep, not just the time in bed.',
    lowLabel: 'Poorly',
    highLabel: 'Very well',
    scaleLabels: ['Poorly', 'Not well', 'Okay', 'Well', 'Very well'],
  },
  {
    field: 'muscleSoreness',
    title: 'How sore do your muscles feel?',
    description: 'A higher score means more soreness today.',
    lowLabel: 'Not sore',
    highLabel: 'Very sore',
    scaleLabels: [
      'Not sore',
      'A little sore',
      'Moderately sore',
      'Quite sore',
      'Very sore',
    ],
  },
  {
    field: 'motivationLevel',
    title: 'How motivated do you feel to train?',
    description: 'There is no right answer. Your honest read helps your Coach.',
    lowLabel: 'Not motivated',
    highLabel: 'Very motivated',
    scaleLabels: [
      'Not motivated',
      'A little motivated',
      'Somewhat motivated',
      'Motivated',
      'Very motivated',
    ],
  },
];
