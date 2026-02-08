/**
 * Zustand store for global chat state
 */

import { create } from "zustand";
import type { Conversation, SCCAMessage } from "@/types/chat";

interface ChatState {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Active conversation
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;

  // Settings
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  useSCCA: boolean;
  setUseSCCA: (enabled: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),

  systemPrompt: "You are a helpful AI assistant.",
  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
  temperature: 0.7,
  setTemperature: (temp) => set({ temperature: temp }),
  useSCCA: true,
  setUseSCCA: (enabled) => set({ useSCCA: enabled }),
}));
