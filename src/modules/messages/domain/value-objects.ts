import { ValueObject } from '@easydev/shared-kernel';
import { validate as uuidValidate } from 'uuid';

export class MessageId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid MessageId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): MessageId {
    return new MessageId(value);
  }
}

export class MessageContent extends ValueObject<{ value: string }> {
  constructor(value: string) {
    const cleaned = (value ?? '').toString();
    if (cleaned.length > 100000) {
      throw new Error('Message content exceeds maximum length of 100000');
    }
    super({ value: cleaned });
  }

  get value(): string {
    return this.props.value;
  }

  get isEmpty(): boolean {
    return this.props.value.trim().length === 0;
  }

  public static create(value: string): MessageContent {
    return new MessageContent(value);
  }
}

export enum MessageTypeEnum {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  LOCATION = 'LOCATION',
  CONTACT = 'CONTACT',
  STICKER = 'STICKER',
  SYSTEM = 'SYSTEM',
  AI_RESPONSE = 'AI_RESPONSE',
  INTERNAL_NOTE = 'INTERNAL_NOTE',
}

export class MessageType extends ValueObject<{ value: MessageTypeEnum }> {
  constructor(value: MessageTypeEnum) {
    if (!Object.values(MessageTypeEnum).includes(value)) {
      throw new Error(`Invalid message type: ${value}`);
    }
    super({ value });
  }

  get value(): MessageTypeEnum {
    return this.props.value;
  }

  public isMedia(): boolean {
    return (
      this.props.value === MessageTypeEnum.IMAGE ||
      this.props.value === MessageTypeEnum.AUDIO ||
      this.props.value === MessageTypeEnum.VIDEO ||
      this.props.value === MessageTypeEnum.DOCUMENT ||
      this.props.value === MessageTypeEnum.STICKER
    );
  }

  public isInternal(): boolean {
    return this.props.value === MessageTypeEnum.INTERNAL_NOTE;
  }

  public static create(value: MessageTypeEnum): MessageType {
    return new MessageType(value);
  }
}

export enum MessageDirectionEnum {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export class MessageDirection extends ValueObject<{
  value: MessageDirectionEnum;
}> {
  constructor(value: MessageDirectionEnum) {
    if (!Object.values(MessageDirectionEnum).includes(value)) {
      throw new Error(`Invalid message direction: ${value}`);
    }
    super({ value });
  }

  get value(): MessageDirectionEnum {
    return this.props.value;
  }

  public isInbound(): boolean {
    return this.props.value === MessageDirectionEnum.INBOUND;
  }

  public isOutbound(): boolean {
    return this.props.value === MessageDirectionEnum.OUTBOUND;
  }

  public static create(value: MessageDirectionEnum): MessageDirection {
    return new MessageDirection(value);
  }
}

export enum MessageStatusEnum {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  ARCHIVED = 'ARCHIVED',
}

const STATUS_RANK: Record<MessageStatusEnum, number> = {
  [MessageStatusEnum.QUEUED]: 0,
  [MessageStatusEnum.PROCESSING]: 1,
  [MessageStatusEnum.SENT]: 2,
  [MessageStatusEnum.DELIVERED]: 3,
  [MessageStatusEnum.READ]: 4,
  [MessageStatusEnum.FAILED]: 1,
  [MessageStatusEnum.RETRYING]: 1,
  [MessageStatusEnum.ARCHIVED]: 5,
};

export class MessageStatus extends ValueObject<{ value: MessageStatusEnum }> {
  constructor(value: MessageStatusEnum) {
    if (!Object.values(MessageStatusEnum).includes(value)) {
      throw new Error(`Invalid message status: ${value}`);
    }
    super({ value });
  }

  get value(): MessageStatusEnum {
    return this.props.value;
  }

  get rank(): number {
    return STATUS_RANK[this.props.value];
  }

  public isTerminal(): boolean {
    return (
      this.props.value === MessageStatusEnum.READ ||
      this.props.value === MessageStatusEnum.ARCHIVED
    );
  }

  public canRetry(): boolean {
    return (
      this.props.value === MessageStatusEnum.FAILED ||
      this.props.value === MessageStatusEnum.RETRYING
    );
  }

  public static create(value: MessageStatusEnum): MessageStatus {
    return new MessageStatus(value);
  }
}

export class ExternalMessageId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    const cleaned = value.trim();
    if (!cleaned || cleaned.length > 255) {
      throw new Error(`Invalid external message id: ${value}`);
    }
    super({ value: cleaned });
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): ExternalMessageId {
    return new ExternalMessageId(value);
  }
}
