// Tenant Contracts
export interface TenantBranding {
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  customDomain?: string;
  customEmailDomain?: string;
}

export interface TenantSettings {
  branding: TenantBranding;
  allowedChannels: string[];
  confidenceThreshold: number; // For AI response generation
  escalationTimeoutMinutes: number;
}

// Conversation Contracts
export type ConversationStatus =
  | 'OPEN'
  | 'PENDING'
  | 'ASSIGNED'
  | 'RESOLVED'
  | 'CLOSED';
export type MessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'AUDIO'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'LOCATION'
  | 'SYSTEM';

export interface MessageContract {
  id: string;
  conversationId: string;
  senderType: 'AGENT' | 'CUSTOMER' | 'BOT' | 'SYSTEM';
  senderId: string;
  content: string;
  mediaUrls?: string[];
  createdAt: Date;
}

export interface ConversationContract {
  id: string;
  customerId: string;
  channelId: string;
  assigneeId?: string;
  status: ConversationStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  lastMessageAt: Date;
}

// Ticket Contracts
export type TicketStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_CUSTOMER'
  | 'RESOLVED'
  | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TicketContract {
  id: string;
  title: string;
  conversationId?: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: string; // Complaint, Refund, Billing, Technical, Sales, Custom
  dueDate?: Date;
  createdAt: Date;
}

// Connector & AI Contracts
export interface ConnectorConfigContract {
  id: string;
  type: string; // SHOPIFY, HUBSPOT, etc.
  isActive: boolean;
  capabilities: string[];
}

export interface AiResponseContract {
  intent: string;
  confidence: number;
  suggestedResponse?: string;
  shouldEscalate: boolean;
  entities?: Record<string, any>;
}
