import { ValueObject } from '@easydev/shared-kernel';
import { validate as uuidValidate } from 'uuid';

export class CustomerId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid CustomerId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): CustomerId {
    return new CustomerId(value);
  }
}

export class CustomerEmail extends ValueObject<{ value: string }> {
  constructor(value: string) {
    const cleaned = value.trim().toLowerCase();
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      throw new Error(`Invalid email address format: ${value}`);
    }
    super({ value: cleaned });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): CustomerEmail {
    return new CustomerEmail(value);
  }
}

export class CustomerPhone extends ValueObject<{ value: string }> {
  constructor(value: string) {
    const cleaned = value.trim();
    // A simple validation for phone format (digits, spaces, optional leading +, -, parentheses)
    if (cleaned && !/^\+?[0-9\s\-()]{7,20}$/.test(cleaned)) {
      throw new Error(`Invalid phone number format: ${value}`);
    }
    super({ value: cleaned });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): CustomerPhone {
    return new CustomerPhone(value);
  }
}

export enum CustomerStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MERGED = 'MERGED',
}

export class CustomerStatus extends ValueObject<{ value: CustomerStatusEnum }> {
  constructor(value: CustomerStatusEnum) {
    if (!Object.values(CustomerStatusEnum).includes(value)) {
      throw new Error(`Invalid customer status: ${value}`);
    }
    super({ value });
  }

  get value(): CustomerStatusEnum {
    return this.props.value;
  }

  public static create(value: CustomerStatusEnum): CustomerStatus {
    return new CustomerStatus(value);
  }
}

export class CustomerLanguage extends ValueObject<{ value: string }> {
  constructor(value: string) {
    const cleaned = value.trim().toLowerCase();
    if (!cleaned || cleaned.length > 10) {
      throw new Error(`Invalid language code: ${value}`);
    }
    super({ value: cleaned });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): CustomerLanguage {
    return new CustomerLanguage(value);
  }
}

export class CustomerTimezone extends ValueObject<{ value: string }> {
  constructor(value: string) {
    const cleaned = value.trim();
    if (!cleaned || cleaned.length > 50) {
      throw new Error(`Invalid timezone string: ${value}`);
    }
    super({ value: cleaned });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): CustomerTimezone {
    return new CustomerTimezone(value);
  }
}
