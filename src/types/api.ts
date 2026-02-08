import type { Conversation, Message } from "./chat";

// API Request Types
export interface CreateConversationRequest {
  title?: string;
  model?: string;
}

export interface SendMessageRequest {
  content: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  model?: string;
  systemPrompt?: string;
}

export interface EditMessageRequest {
  sequence: number;
  content: string;
  regenerate?: boolean;
  temperature?: number;
  systemPrompt?: string;
}

export interface DeleteMessageRequest {
  action: "delete";
  sequence: number;
}

// API Response Types
export interface ConversationListResponse {
  conversations: Conversation[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ConversationDetailResponse extends Conversation {
  messages: Message[];
  merkleRoot?: string;
  integrity?: {
    valid: boolean;
    lastValidSequence?: number;
  };
  viewport?: {
    from: number;
    to: number;
  };
}

export interface SendMessageSSEEvent {
  token?: string;
  done?: boolean;
  messageCount?: number;
  title?: string;
  error?: string;
}

export interface EditResponse {
  success: boolean;
  messageCount: number;
  deletedCount: number;
  needsRegeneration: boolean;
}

export interface ErrorResponse {
  error: string;
}
