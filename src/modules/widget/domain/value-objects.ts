import { ValueObject } from '@easydev/shared-kernel';

export class WidgetId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): WidgetId {
    if (!value) {
      throw new Error('WidgetId cannot be empty');
    }
    return new WidgetId({ value });
  }
}

export class VisitorId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): VisitorId {
    if (!value) {
      throw new Error('VisitorId cannot be empty');
    }
    return new VisitorId({ value });
  }
}

export class SessionId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): SessionId {
    if (!value) {
      throw new Error('SessionId cannot be empty');
    }
    return new SessionId({ value });
  }
}

export class LeadId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): LeadId {
    if (!value) {
      throw new Error('LeadId cannot be empty');
    }
    return new LeadId({ value });
  }
}

export class InstallationId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): InstallationId {
    if (!value) {
      throw new Error('InstallationId cannot be empty');
    }
    return new InstallationId({ value });
  }
}

export class DomainName extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): DomainName {
    if (!value) {
      throw new Error('DomainName cannot be empty');
    }
    // simple regex to check format if domain
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    if (value !== 'localhost' && !domainRegex.test(value)) {
      throw new Error('Invalid DomainName format');
    }
    return new DomainName({ value });
  }
}
