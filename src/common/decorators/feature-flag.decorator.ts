import { SetMetadata } from '@nestjs/common';

export const REQUIRED_FEATURE_KEY = 'requiredFeature';
export const RequireFeature = (featureKey: string) =>
  SetMetadata(REQUIRED_FEATURE_KEY, featureKey);
