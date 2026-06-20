import { ValueObject } from '@easydev/shared-kernel';
import { validate as uuidValidate } from 'uuid';

export class ChannelId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid ChannelId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): ChannelId {
    return new ChannelId(value);
  }
}

export enum ChannelTypeEnum {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  WEBCHAT = 'WEBCHAT',
  TELEGRAM = 'TELEGRAM',
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  SLACK = 'SLACK',
  TEAMS = 'TEAMS',
  VOICE = 'VOICE',
}

export class ChannelType extends ValueObject<{ value: ChannelTypeEnum }> {
  constructor(value: ChannelTypeEnum) {
    if (!Object.values(ChannelTypeEnum).includes(value)) {
      throw new Error(`Invalid ChannelType: ${value}`);
    }
    super({ value });
  }

  get value(): ChannelTypeEnum {
    return this.props.value;
  }

  public static create(value: ChannelTypeEnum): ChannelType {
    return new ChannelType(value);
  }
}

export class ChannelProvider extends ValueObject<{ value: string }> {
  constructor(value: string) {
    const cleaned = value.trim().toUpperCase();
    if (!cleaned) {
      throw new Error('ChannelProvider cannot be empty');
    }
    super({ value: cleaned });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): ChannelProvider {
    return new ChannelProvider(value);
  }
}

export class WebhookSecret extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!value || value.length < 8) {
      throw new Error('WebhookSecret must be at least 8 characters long');
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): WebhookSecret {
    return new WebhookSecret(value);
  }
}

export enum ChannelStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class ChannelStatus extends ValueObject<{ value: ChannelStatusEnum }> {
  constructor(value: ChannelStatusEnum) {
    if (!Object.values(ChannelStatusEnum).includes(value)) {
      throw new Error(`Invalid ChannelStatus: ${value}`);
    }
    super({ value });
  }

  get value(): ChannelStatusEnum {
    return this.props.value;
  }

  public static create(value: ChannelStatusEnum): ChannelStatus {
    return new ChannelStatus(value);
  }
}
