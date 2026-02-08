export type MessageRole = "system" | "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  sequence?: number;
  timestamp?: string;
  isStreaming?: boolean;
  isPending?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
  merkleRoot?: string;
}

export interface SCCAMessage {
  id: string;
  role: MessageRole;
  content: string;
  sequence: number;
  timestamp: string;
  contentHash?: string;
}
