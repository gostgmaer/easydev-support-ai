import { ValueObject } from '@easydev/shared-kernel';

export class SettingId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): SettingId {
    if (!value) {
      throw new Error('SettingId cannot be empty');
    }
    return new SettingId({ value });
  }
}

export class FeatureFlagId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): FeatureFlagId {
    if (!value) {
      throw new Error('FeatureFlagId cannot be empty');
    }
    return new FeatureFlagId({ value });
  }
}

export class BusinessHoursId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): BusinessHoursId {
    if (!value) {
      throw new Error('BusinessHoursId cannot be empty');
    }
    return new BusinessHoursId({ value });
  }
}

export class HolidayId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): HolidayId {
    if (!value) {
      throw new Error('HolidayId cannot be empty');
    }
    return new HolidayId({ value });
  }
}
