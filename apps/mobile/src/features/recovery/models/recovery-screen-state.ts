import type {
  GetCurrentRecoveryExperienceResponse,
  RecoveryExperienceHistoryItem,
  RecoveryExperienceTrend,
} from '@elev9/types';

export type RecoveryScreenAvailableState = {
  status: 'available';
  current: NonNullable<GetCurrentRecoveryExperienceResponse['recovery']>;
  history: RecoveryExperienceHistoryItem[];
  trend: RecoveryExperienceTrend;
  selectedRange: 7;
  isRefreshing: boolean;
  historyStatus: 'loading' | 'available' | 'error';
  historyErrorMessage?: string;
  currentErrorMessage?: string;
};

export type RecoveryScreenState =
  | { status: 'loading' }
  | RecoveryScreenAvailableState
  | { status: 'insufficient_data'; isRefreshing: boolean }
  | { status: 'not_available'; isRefreshing: boolean }
  | { status: 'processing_failed'; isRefreshing: boolean }
  | { status: 'error'; message?: string; isRetrying: boolean };
