import { ValueObject } from '@easydev/shared-kernel';

export class MetricId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): MetricId {
    if (!value) {
      throw new Error('MetricId cannot be empty');
    }
    return new MetricId({ value });
  }
}

export class ReportId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): ReportId {
    if (!value) {
      throw new Error('ReportId cannot be empty');
    }
    return new ReportId({ value });
  }
}

export class ScheduleId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): ScheduleId {
    if (!value) {
      throw new Error('ScheduleId cannot be empty');
    }
    return new ScheduleId({ value });
  }
}

export class MetricType extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): MetricType {
    if (!value) {
      throw new Error('MetricType cannot be empty');
    }
    return new MetricType({ value });
  }
}

export class TimeRange extends ValueObject<{ startDate: Date; endDate: Date }> {
  private constructor(props: { startDate: Date; endDate: Date }) {
    super(props);
  }

  get startDate(): Date {
    return this.props.startDate;
  }

  get endDate(): Date {
    return this.props.endDate;
  }

  public static create(startDate: Date, endDate: Date): TimeRange {
    if (!startDate || !endDate) {
      throw new Error('StartDate and EndDate must be specified');
    }
    if (startDate > endDate) {
      throw new Error('StartDate cannot be after EndDate');
    }
    return new TimeRange({ startDate, endDate });
  }
}
