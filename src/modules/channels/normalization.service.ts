import { Injectable } from '@nestjs/common';

export interface NormalizedMessage {
  externalMessageId: string;
  senderId: string;
  senderName?: string;
  content: string;
  channelType: string;
  attachments?: any[];
  timestamp: Date;
}

@Injectable()
export class NormalizationService {
  
  normalize(provider: string, payload: any): NormalizedMessage | null {
    switch (provider.toLowerCase()) {
      case 'whatsapp':
        return this.normalizeWhatsApp(payload);
      case 'email':
        return this.normalizeEmail(payload);
      case 'slack':
        return this.normalizeSlack(payload);
      case 'telegram':
        return this.normalizeTelegram(payload);
      case 'facebook':
        return this.normalizeFacebook(payload);
      case 'instagram':
        return this.normalizeInstagram(payload);
      case 'website-chat':
        return this.normalizeWebsiteChat(payload);
      case 'teams':
        return this.normalizeMsTeams(payload);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private normalizeWhatsApp(payload: any): NormalizedMessage {
    // Mock extraction logic for WhatsApp Cloud API
    const entry = payload.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    const contact = entry?.contacts?.[0];

    return {
      externalMessageId: message?.id,
      senderId: message?.from,
      senderName: contact?.profile?.name,
      content: message?.text?.body || '',
      channelType: 'WHATSAPP',
      timestamp: new Date((message?.timestamp || 0) * 1000),
    };
  }

  private normalizeEmail(payload: any): NormalizedMessage {
    return {
      externalMessageId: payload.messageId,
      senderId: payload.from,
      content: payload.text,
      channelType: 'EMAIL',
      timestamp: new Date(),
    };
  }

  private normalizeSlack(payload: any): NormalizedMessage {
    return {
      externalMessageId: payload.event?.client_msg_id,
      senderId: payload.event?.user,
      content: payload.event?.text,
      channelType: 'SLACK',
      timestamp: new Date(Number(payload.event?.ts) * 1000),
    };
  private normalizeTelegram(payload: any): NormalizedMessage {
    return {
      externalMessageId: String(payload.message?.message_id),
      senderId: String(payload.message?.from?.id),
      content: payload.message?.text || '',
      channelType: 'TELEGRAM',
      timestamp: new Date((payload.message?.date || 0) * 1000),
    };
  }

  private normalizeFacebook(payload: any): NormalizedMessage {
    const entry = payload.entry?.[0];
    const messaging = entry?.messaging?.[0];
    return {
      externalMessageId: messaging?.message?.mid,
      senderId: messaging?.sender?.id,
      content: messaging?.message?.text || '',
      channelType: 'FACEBOOK_MESSENGER',
      timestamp: new Date(messaging?.timestamp || Date.now()),
    };
  }

  private normalizeInstagram(payload: any): NormalizedMessage {
    // Similar to Facebook Graph API for Messenger
    const entry = payload.entry?.[0];
    const messaging = entry?.messaging?.[0];
    return {
      externalMessageId: messaging?.message?.mid,
      senderId: messaging?.sender?.id,
      content: messaging?.message?.text || '',
      channelType: 'INSTAGRAM_DM',
      timestamp: new Date(messaging?.timestamp || Date.now()),
    };
  }

  private normalizeWebsiteChat(payload: any): NormalizedMessage {
    return {
      externalMessageId: payload.messageId,
      senderId: payload.sessionId || payload.userId,
      content: payload.text || '',
      channelType: 'WEBSITE_CHAT',
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
    };
  }

  private normalizeMsTeams(payload: any): NormalizedMessage {
    return {
      externalMessageId: payload.id,
      senderId: payload.from?.id,
      senderName: payload.from?.name,
      content: payload.text || '',
      channelType: 'MICROSOFT_TEAMS',
      timestamp: new Date(payload.timestamp || Date.now()),
    };
  }
}
