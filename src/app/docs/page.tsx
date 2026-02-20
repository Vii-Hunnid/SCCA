'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  Database,
  Key,
  FileCode,
  BookOpen,
  Hash,
  ChevronRight,
  Copy,
  Check,
  ArrowLeft,
  Menu,
  X,
  Code,
  Server,
  Paperclip,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type Section =
  | 'overview'
  | 'quickstart'
  | 'sdk'
  | 'vault'
  | 'integration'
  | 'api'
  | 'media'
  | 'crypto'
  | 'binary'
  | 'vocabulary';

const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'quickstart', label: 'Quick Start', icon: ChevronRight },
  { id: 'sdk', label: 'SDK Setup', icon: Code },
  { id: 'vault', label: 'Vault API', icon: Server },
  { id: 'integration', label: 'Chat Integration', icon: Code },
  { id: 'api', label: 'API Reference', icon: FileCode },
  { id: 'media', label: 'Media Pipeline', icon: Paperclip },
  { id: 'crypto', label: 'Crypto Engine', icon: Key },
  { id: 'binary', label: 'Binary Format', icon: Database },
  { id: 'vocabulary', label: 'Vocabulary', icon: Hash },
];

function CodeBlock({
  children,
  language,
}: {
  children: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      {language && (
        <div className="absolute top-0 left-0 px-3 py-1 text-[10px] text-terminal-dim tracking-wider uppercase bg-cyber-darker rounded-tl border-b border-r border-cyber-light/20">
          {language}
        </div>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-cyber-mid/50 text-terminal-dim hover:text-neon-cyan opacity-0 group-hover:opacity-100 transition-all"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
      <pre className="bg-cyber-darker border border-cyber-light/20 rounded p-4 pt-8 overflow-x-auto text-sm leading-relaxed">
        <code className="text-terminal-text">{children}</code>
      </pre>
    </div>
  );
}

function Endpoint({
  method,
  path,
  description,
  children,
}: {
  method: string;
  path: string;
  description: string;
  children?: React.ReactNode;
}) {
  const methodColor =
    method === 'GET'
      ? 'text-neon-green bg-neon-green/10 border-neon-green/30'
      : method === 'POST'
        ? 'text-neon-cyan bg-neon-cyan/10 border-neon-cyan/30'
        : method === 'PATCH'
          ? 'text-neon-yellow bg-neon-yellow/10 border-neon-yellow/30'
          : 'text-neon-red bg-neon-red/10 border-neon-red/30';

  return (
    <div className="cyber-card p-5 mb-4">
      <div className="flex items-center gap-3 mb-2">
        <span
          className={`px-2 py-0.5 text-[11px] font-bold tracking-wider rounded border ${methodColor}`}
        >
          {method}
        </span>
        <code className="text-sm text-neon-cyan">{path}</code>
      </div>
      <p className="text-xs text-terminal-dim mb-3">{description}</p>
      {children}
    </div>
  );
}

function SectionTitle({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="text-lg font-display font-semibold text-terminal-text tracking-wide mb-4 mt-10 first:mt-0 flex items-center gap-2"
    >
      <span className="text-neon-cyan">#</span> {children}
    </h2>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-terminal-text tracking-wide mb-3 mt-6 flex items-center gap-2">
      <span className="text-neon-green/60">&gt;</span> {children}
    </h3>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [mobileNav, setMobileNav] = useState(false);

  const scrollToSection = (id: Section) => {
    setActiveSection(id);
    setMobileNav(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-cyber-light/10 bg-cyber-black/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-terminal-dim hover:text-neon-cyan transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <Image
                src="/logo.jpg"
                alt="SCCA logo"
                width={100}
                height={100}
                priority
                className="object-contain"
              />
            </Link>
            <span className="text-cyber-light/40">|</span>
            <span className="text-xs text-terminal-dim tracking-wider uppercase">
              Documentation
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="hidden sm:inline text-xs text-terminal-dim hover:text-neon-cyan transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="hidden sm:inline cyber-btn text-[10px] py-1.5 px-3"
            >
              Get Started
            </Link>
            <button
              onClick={() => setMobileNav(!mobileNav)}
              className="md:hidden p-1 text-terminal-dim hover:text-neon-cyan"
            >
              {mobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <nav
          className={`${
            mobileNav ? 'block' : 'hidden'
          } md:block w-full md:w-56 flex-shrink-0 border-r border-cyber-light/10 bg-cyber-black/80 md:bg-transparent`}
        >
          <div className="sticky top-14 p-4 space-y-1">
            {navItems.map((nav) => (
              <button
                key={nav.id}
                onClick={() => scrollToSection(nav.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs tracking-wider transition-all ${
                  activeSection === nav.id
                    ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
                    : 'text-terminal-dim hover:text-terminal-text hover:bg-cyber-mid/30'
                }`}
              >
                <nav.icon className="w-3.5 h-3.5" />
                {nav.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-6 sm:p-8 md:p-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Overview */}
            <SectionTitle id="overview">Overview</SectionTitle>
            <p className="text-sm text-terminal-dim leading-relaxed mb-4">
              SCCA (Secure Compact Chat Architecture) is an open-source protocol for building
              privacy-first AI chat applications. Every message is encrypted with AES-256-GCM
              using per-conversation keys derived via HKDF-SHA256. Conversations are stored
              as a single database row containing an encrypted token array, verified by a
              Merkle-HMAC integrity chain.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {[
                {
                  icon: Lock,
                  title: 'AES-256-GCM Encryption',
                  desc: 'Every message encrypted with unique per-conversation keys. Server cannot read content without the master key.',
                },
                {
                  icon: Database,
                  title: 'Single-Row Storage',
                  desc: '~24 bytes overhead per message vs 200-300 bytes traditional. 1,000 messages in ~85 KB.',
                },
                {
                  icon: Key,
                  title: 'HKDF Key Hierarchy',
                  desc: 'Master Key → User Key → Conversation Key + Integrity Key. Keys never stored, always derived.',
                },
                {
                  icon: Hash,
                  title: 'Merkle Integrity',
                  desc: 'HMAC-SHA256 chain across all tokens. Any modification invalidates the entire root.',
                },
              ].map((f) => (
                <div key={f.title} className="cyber-card p-4">
                  <f.icon className="w-4 h-4 text-neon-cyan mb-2" />
                  <h4 className="text-xs font-semibold text-terminal-text mb-1">{f.title}</h4>
                  <p className="text-[11px] text-terminal-dim leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>

            <SubTitle>Design Principles</SubTitle>
            <div className="space-y-3 mb-6">
              {[
                {
                  name: 'Destructive Editing',
                  desc: 'Editing message #5 in a 10-message conversation permanently deletes messages 6-10. No versioning, no branches. Linear timeline only.',
                },
                {
                  name: 'Minimal Storage',
                  desc: 'Compact binary format with zlib compression. Every byte counts.',
                },
                {
                  name: 'User-Controlled Encryption',
                  desc: 'The server cannot read message content. A database breach yields only encrypted blobs.',
                },
                {
                  name: 'Linear Timeline',
                  desc: 'No branches, no edit history. Only the current state exists. Radical simplicity.',
                },
                {
                  name: 'Real-Time Sync',
                  desc: 'Multiple clients see updates simultaneously via SSE streaming.',
                },
              ].map((p) => (
                <div key={p.name} className="flex gap-3">
                  <span className="text-neon-green mt-0.5 text-xs">&#9656;</span>
                  <div>
                    <span className="text-xs font-semibold text-terminal-text">{p.name}</span>
                    <span className="text-xs text-terminal-dim ml-2">{p.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Start */}
            <SectionTitle id="quickstart">Quick Start</SectionTitle>
            <p className="text-sm text-terminal-dim leading-relaxed mb-4">
              Get SCCA running locally in minutes.
            </p>

            <SubTitle>1. Clone and Install</SubTitle>
            <CodeBlock language="bash">{`git clone https://github.com/Vii-Hunnid/SCCA.git
cd SCCA
npm install`}</CodeBlock>

            <SubTitle>2. Environment Variables</SubTitle>
            <CodeBlock language="env">{`# .env
DATABASE_URL="postgresql://user:pass@host:5432/scca"
DIRECT_URL="postgresql://user:pass@host:5432/scca"
MASTER_KEY_SECRET="your-32-byte-hex-secret"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
GROQ_API_KEY="your-groq-api-key"

# Optional: OAuth providers
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."`}</CodeBlock>

            <SubTitle>3. Database Setup</SubTitle>
            <CodeBlock language="bash">{`npx prisma generate
npx prisma db push`}</CodeBlock>

            <SubTitle>4. Run</SubTitle>
            <CodeBlock language="bash">{`npm run dev`}</CodeBlock>
            <p className="text-xs text-terminal-dim mb-6">
              Open{' '}
              <code className="text-neon-cyan bg-cyber-darker px-1.5 py-0.5 rounded">
                http://localhost:3000
              </code>{' '}
              and register an account to start.
            </p>

            {/* SDK Setup */}
            <SectionTitle id="sdk">SDK Setup</SectionTitle>
            <p className="text-sm text-terminal-dim leading-relaxed mb-4">
              Integrate SCCA into your applications with our official SDKs and client libraries. 
              Whether you&apos;re building a web app with Next.js or Nuxt.js, or mobile apps with 
              React Native or Flutter, we&apos;ve got you covered.
            </p>

            <SubTitle>Next.js (App Router)</SubTitle>
            <p className="text-xs text-terminal-dim leading-relaxed mb-3">
              For Next.js applications, create a reusable SCCA client that handles authentication 
              and API calls. Install dependencies and set up the client:
            </p>
            <CodeBlock language="bash">{`# Install dependencies
npm install @tanstack/react-query # Optional: for data fetching`}</CodeBlock>
            <CodeBlock language="typescript">{`// lib/scca-client.ts
const SCCA_BASE_URL = process.env.NEXT_PUBLIC_SCCA_API_URL || 
  "https://your-scca-instance.com";

export interface SCCAConfig {
  baseUrl: string;
  apiKey?: string; // For Vault API access
}

export class SCCAClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: SCCAConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  // Vault API: Encrypt data
  async encrypt(data: string | string[], context: string) {
    const res = await fetch(\`\${this.baseUrl}/api/scca/vault/encrypt\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { Authorization: \`Bearer \${this.apiKey}\` }),
      },
      credentials: "include",
      body: JSON.stringify({ data, context }),
    });
    if (!res.ok) throw new Error(\`Encrypt failed: \${res.status}\`);
    return res.json();
  }

  // Vault API: Decrypt data
  async decrypt(tokens: string[], context: string) {
    const res = await fetch(\`\${this.baseUrl}/api/scca/vault/decrypt\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { Authorization: \`Bearer \${this.apiKey}\` }),
      },
      credentials: "include",
      body: JSON.stringify({ tokens, context }),
    });
    if (!res.ok) throw new Error(\`Decrypt failed: \${res.status}\`);
    return res.json();
  }

  // Chat: Create conversation
  async createConversation(title?: string) {
    const res = await fetch(\`\${this.baseUrl}/api/scca/conversations\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: title || "New Chat" }),
    });
    if (!res.ok) throw new Error(\`Create conversation failed: \${res.status}\`);
    return res.json();
  }

  // Chat: Send message with streaming
  async *sendMessageStream(
    conversationId: string,
    content: string,
    options?: { temperature?: number; max_tokens?: number }
  ): AsyncGenerator<{ token?: string; done?: boolean; error?: string }> {
    const res = await fetch(
      \`\${this.baseUrl}/api/scca/conversations/\${conversationId}/messages\`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.max_tokens ?? 4096,
        }),
      }
    );

    if (!res.ok) {
      yield { error: \`HTTP \${res.status}\` };
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          yield data;
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

// Singleton instance
export const scca = new SCCAClient({
  baseUrl: SCCA_BASE_URL,
});`}</CodeBlock>
            <CodeBlock language="typescript">{`// app/chat/page.tsx - Example usage in a Next.js page
"use client";

import { useState } from "react";
import { scca } from "@/lib/scca-client";

export default function ChatPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, \`You: \${input}\`]);
    setInput("");
    setStreaming(true);

    try {
      // Create conversation (or use existing)
      const conv = await scca.createConversation("My Chat");

      // Stream AI response
      let response = "";
      for await (const event of scca.sendMessageStream(conv.id, input)) {
        if (event.token) {
          response += event.token;
          // Update UI with streaming content
          setMessages((prev) => [
            ...prev.slice(0, -1),
            \`AI: \${response}\`,
          ]);
        }
        if (event.done) {
          setStreaming(false);
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setStreaming(false);
    }
  }

  return (
    <div className="p-4">
      <div className="space-y-2 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className="p-2 bg-gray-100 rounded">{msg}</div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 p-2 border rounded"
          placeholder="Type a message..."
          disabled={streaming}
        />
        <button
          onClick={handleSend}
          disabled={streaming}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {streaming ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}`}</CodeBlock>

            <SubTitle>Nuxt.js 3</SubTitle>
            <p className="text-xs text-terminal-dim leading-relaxed mb-3">
              For Nuxt.js applications, create a composable that handles SCCA integration:
            </p>
            <CodeBlock language="bash">{`# Install dependencies
npm install @vueuse/core # Optional: for utilities`}</CodeBlock>
            <CodeBlock language="typescript">{`// composables/useSCCA.ts
const SCCA_BASE_URL = useRuntimeConfig().public.sccaApiUrl || 
  "https://your-scca-instance.com";

export interface SCCAClient {
  baseUrl: string;
  apiKey?: string;
}

export function useSCCA() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.sccaApiUrl || "https://your-scca-instance.com";

  // Vault API: Encrypt data
  async function encrypt(data: string | string[], context: string) {
    const res = await $fetch(\`/api/scca/vault/encrypt\`, {
      baseURL: baseUrl,
      method: "POST",
      body: { data, context },
      credentials: "include",
    });
    return res;
  }

  // Vault API: Decrypt data
  async function decrypt(tokens: string[], context: string) {
    const res = await $fetch(\`/api/scca/vault/decrypt\`, {
      baseURL: baseUrl,
      method: "POST",
      body: { tokens, context },
      credentials: "include",
    });
    return res;
  }

  // Chat: Create conversation
  async function createConversation(title?: string) {
    const res = await $fetch(\`/api/scca/conversations\`, {
      baseURL: baseUrl,
      method: "POST",
      body: { title: title || "New Chat" },
      credentials: "include",
    });
    return res as { id: string; title: string; messageCount: number };
  }

  // Chat: Send message with streaming
  async function* sendMessageStream(
    conversationId: string,
    content: string,
    options?: { temperature?: number; max_tokens?: number }
  ): AsyncGenerator<{ token?: string; done?: boolean; error?: string }> {
    const res = await fetch(
      \`\${baseUrl}/api/scca/conversations/\${conversationId}/messages\`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.max_tokens ?? 4096,
        }),
      }
    );

    if (!res.ok) {
      yield { error: \`HTTP \${res.status}\` };
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          yield data;
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  return {
    encrypt,
    decrypt,
    createConversation,
    sendMessageStream,
  };
}`}</CodeBlock>
            <CodeBlock language="vue">{`<!-- pages/chat.vue - Example Nuxt page -->
<template>
  <div class="p-4 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">SCCA Chat</h1>
    
    <div class="space-y-2 mb-4 h-96 overflow-y-auto border rounded p-4">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        :class="[
          'p-2 rounded',
          msg.role === 'user' ? 'bg-blue-100 ml-auto max-w-[80%]' : 'bg-gray-100 mr-auto max-w-[80%]'
        ]"
      >
        {{ msg.content }}
      </div>
      <div v-if="streaming" class="text-gray-400">AI is typing...</div>
    </div>

    <div class="flex gap-2">
      <input
        v-model="input"
        @keydown.enter="handleSend"
        :disabled="streaming"
        class="flex-1 p-2 border rounded"
        placeholder="Type a message..."
      />
      <button
        @click="handleSend"
        :disabled="streaming || !input.trim()"
        class="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {{ streaming ? '...' : 'Send' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { createConversation, sendMessageStream } = useSCCA();

const messages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
const input = ref('');
const streaming = ref(false);
const conversationId = ref<string | null>(null);

async function handleSend() {
  if (!input.value.trim()) return;

  // Add user message
  messages.value.push({ role: 'user', content: input.value });
  const userMessage = input.value;
  input.value = '';
  streaming.value = true;

  try {
    // Create conversation if needed
    if (!conversationId.value) {
      const conv = await createConversation('My Chat');
      conversationId.value = conv.id;
    }

    // Stream AI response
    let response = '';
    for await (const event of sendMessageStream(conversationId.value, userMessage)) {
      if (event.token) {
        response += event.token;
        // Update last message or add new one
        const lastMsg = messages.value[messages.value.length - 1];
        if (lastMsg.role === 'assistant') {
          lastMsg.content = response;
        } else {
          messages.value.push({ role: 'assistant', content: response });
        }
      }
      if (event.done) {
        streaming.value = false;
      }
    }
  } catch (err) {
    console.error('Chat error:', err);
    streaming.value = false;
  }
}
</script>`}</CodeBlock>

            <SubTitle>React Native</SubTitle>
            <p className="text-xs text-terminal-dim leading-relaxed mb-3">
              For mobile apps with React Native, use the Fetch API with AsyncStorage for session management:
            </p>
            <CodeBlock language="bash">{`# Install dependencies
npm install @react-native-async-storage/async-storage`}</CodeBlock>
            <CodeBlock language="typescript">{`// lib/scca-native.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCCA_BASE_URL = 'https://your-scca-instance.com';

export class SCCANativeClient {
  private baseUrl: string;

  constructor(baseUrl: string = SCCA_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Store session cookie after login
  async setSessionCookie(cookie: string) {
    await AsyncStorage.setItem('@scca_session', cookie);
  }

  // Get stored session
  async getSessionCookie(): Promise<string | null> {
    return await AsyncStorage.getItem('@scca_session');
  }

  // Clear session on logout
  async clearSession() {
    await AsyncStorage.removeItem('@scca_session');
  }

  // Authenticate user
  async login(email: string, password: string): Promise<boolean> {
    try {
      // Get CSRF token
      const csrfRes = await fetch(\`\${this.baseUrl}/api/auth/csrf\`);
      const { csrfToken } = await csrfRes.json();

      // Extract cookie from response
      const setCookie = csrfRes.headers.get('set-cookie');

      // Sign in
      const loginRes = await fetch(
        \`\${this.baseUrl}/api/auth/callback/credentials\`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: setCookie || '',
          },
          body: \`email=\${encodeURIComponent(email)}&password=\${encodeURIComponent(
            password
          )}&csrfToken=\${csrfToken}\`,
        }
      );

      if (loginRes.ok) {
        const sessionCookie = loginRes.headers.get('set-cookie');
        if (sessionCookie) {
          await this.setSessionCookie(sessionCookie);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  }

  // Make authenticated request
  private async authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const sessionCookie = await this.getSessionCookie();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(sessionCookie && { Cookie: sessionCookie }),
      },
    });
  }

  // Vault API: Encrypt data
  async encrypt(data: string | string[], context: string) {
    const res = await this.authenticatedFetch(
      \`\${this.baseUrl}/api/scca/vault/encrypt\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, context }),
      }
    );
    if (!res.ok) throw new Error(\`Encrypt failed: \${res.status}\`);
    return res.json();
  }

  // Chat: Create conversation
  async createConversation(title?: string) {
    const res = await this.authenticatedFetch(
      \`\${this.baseUrl}/api/scca/conversations\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || 'New Chat' }),
      }
    );
    if (!res.ok) throw new Error(\`Create failed: \${res.status}\`);
    return res.json();
  }

  // Chat: Send message (returns async iterator for streaming)
  async *sendMessageStream(
    conversationId: string,
    content: string
  ): AsyncGenerator<{ token?: string; done?: boolean }> {
    const res = await this.authenticatedFetch(
      \`\${this.baseUrl}/api/scca/conversations/\${conversationId}/messages\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, temperature: 0.7 }),
      }
    );

    if (!res.ok) throw new Error(\`Send failed: \${res.status}\`);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          yield data;
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

export const sccaNative = new SCCANativeClient();`}</CodeBlock>
            <CodeBlock language="typescript">{`// components/ChatScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { sccaNative } from '../lib/scca-native';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    try {
      // Create conversation if needed
      let convId = conversationId;
      if (!convId) {
        const conv = await sccaNative.createConversation('Mobile Chat');
        convId = conv.id;
        setConversationId(convId);
      }

      // Add placeholder for AI response
      const aiMsgId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: aiMsgId, role: 'assistant', content: '' },
      ]);

      // Stream response
      for await (const event of sccaNative.sendMessageStream(convId, userMsg.content)) {
        if (event.token) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId
                ? { ...msg, content: msg.content + event.token }
                : msg
            )
          );
        }
        if (event.done) {
          setStreaming(false);
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setStreaming(false);
    }
  }, [input, streaming, conversationId]);

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.message,
              item.role === 'user' ? styles.userMsg : styles.aiMsg,
            ]}
          >
            <Text>{item.content}</Text>
          </View>
        )}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          onSubmitEditing={sendMessage}
          editable={!streaming}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={streaming || !input.trim()}
          style={[styles.sendBtn, streaming && styles.disabled]}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  message: { padding: 12, marginVertical: 4, borderRadius: 8 },
  userMsg: { backgroundColor: '#e3f2fd', alignSelf: 'flex-end' },
  aiMsg: { backgroundColor: '#f5f5f5', alignSelf: 'flex-start' },
  inputContainer: { flexDirection: 'row', gap: 8, paddingTop: 8 },
  input: { flex: 1, borderWidth: 1, padding: 12, borderRadius: 8 },
  sendBtn: { backgroundColor: '#2196f3', padding: 12, borderRadius: 8 },
  sendText: { color: 'white' },
  disabled: { opacity: 0.5 },
});`}</CodeBlock>

            <SubTitle>Flutter</SubTitle>
            <p className="text-xs text-terminal-dim leading-relaxed mb-3">
              For Flutter apps, use the http package with shared_preferences for session storage:
            </p>
            <CodeBlock language="yaml">{`# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.2.0
  shared_preferences: ^2.2.2
  uuid: ^4.3.3`}</CodeBlock>
            <CodeBlock language="dart">{`// lib/services/scca_service.dart
import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class SCCAService {
  final String baseUrl;
  late final SharedPreferences _prefs;

  SCCAService({required this.baseUrl});

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  // Session management
  Future<void> setSessionCookie(String cookie) async {
    await _prefs.setString('scca_session', cookie);
  }

  String? getSessionCookie() {
    return _prefs.getString('scca_session');
  }

  Future<void> clearSession() async {
    await _prefs.remove('scca_session');
  }

  // Authenticated HTTP request
  Future<http.Response> _authenticatedRequest(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final url = Uri.parse('$baseUrl$path');
    final headers = {
      'Content-Type': 'application/json',
      if (getSessionCookie() != null) 'Cookie': getSessionCookie()!,
    };

    switch (method) {
      case 'GET':
        return await http.get(url, headers: headers);
      case 'POST':
        return await http.post(url, headers: headers, body: jsonEncode(body));
      case 'DELETE':
        return await http.delete(url, headers: headers);
      default:
        throw Exception('Unsupported method: $method');
    }
  }

  // Login
  Future<bool> login(String email, String password) async {
    try {
      // Get CSRF token
      final csrfRes = await http.get(Uri.parse('$baseUrl/api/auth/csrf'));
      final csrfData = jsonDecode(csrfRes.body);
      final csrfToken = csrfData['csrfToken'];

      // Get cookies from response
      final setCookie = csrfRes.headers['set-cookie'];

      // Sign in
      final loginRes = await http.post(
        Uri.parse('$baseUrl/api/auth/callback/credentials'),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          if (setCookie != null) 'Cookie': setCookie,
        },
        body:
            'email=\${Uri.encodeComponent(email)}&password=\${Uri.encodeComponent(password)}&csrfToken=\$csrfToken',
      );

      if (loginRes.statusCode == 200 || loginRes.statusCode == 302) {
        final sessionCookie = loginRes.headers['set-cookie'];
        if (sessionCookie != null) {
          await setSessionCookie(sessionCookie);
          return true;
        }
      }
      return false;
    } catch (e) {
      print('Login error: $e');
      return false;
    }
  }

  // Vault API: Encrypt
  Future<Map<String, dynamic>> encrypt(
    dynamic data,
    String context,
  ) async {
    final res = await _authenticatedRequest(
      'POST',
      '/api/scca/vault/encrypt',
      body: {'data': data, 'context': context},
    );
    if (res.statusCode != 200) throw Exception('Encrypt failed: \${res.statusCode}');
    return jsonDecode(res.body);
  }

  // Vault API: Decrypt
  Future<Map<String, dynamic>> decrypt(
    List<String> tokens,
    String context,
  ) async {
    final res = await _authenticatedRequest(
      'POST',
      '/api/scca/vault/decrypt',
      body: {'tokens': tokens, 'context': context},
    );
    if (res.statusCode != 200) throw Exception('Decrypt failed: \${res.statusCode}');
    return jsonDecode(res.body);
  }

  // Chat: Create conversation
  Future<Map<String, dynamic>> createConversation({String? title}) async {
    final res = await _authenticatedRequest(
      'POST',
      '/api/scca/conversations',
      body: {'title': title ?? 'New Chat'},
    );
    if (res.statusCode != 201) throw Exception('Create failed: \${res.statusCode}');
    return jsonDecode(res.body);
  }

  // Chat: Send message with streaming
  Stream<Map<String, dynamic>> sendMessageStream(
    String conversationId,
    String content,
  ) async* {
    final url = Uri.parse(
      '$baseUrl/api/scca/conversations/$conversationId/messages',
    );
    final request = http.Request('POST', url);
    request.headers['Content-Type'] = 'application/json';
    if (getSessionCookie() != null) {
      request.headers['Cookie'] = getSessionCookie()!;
    }
    request.body = jsonEncode({
      'content': content,
      'temperature': 0.7,
      'max_tokens': 4096,
    });

    final streamedRes = await request.send();

    await for (final chunk in streamedRes.stream.transform(utf8.decoder)) {
      final lines = chunk.split('\\n');
      for (final line in lines) {
        if (line.startsWith('data: ')) {
          try {
            final data = jsonDecode(line.substring(6));
            yield data;
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }
}`}</CodeBlock>
            <CodeBlock language="dart">{`// lib/screens/chat_screen.dart
import 'package:flutter/material.dart';
import '../services/scca_service.dart';

class ChatScreen extends StatefulWidget {
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final SCCAService _scca = SCCAService(baseUrl: 'https://your-scca-instance.com');
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, dynamic>> _messages = [];
  String? _conversationId;
  bool _streaming = false;
  StreamSubscription? _streamSubscription;

  @override
  void initState() {
    super.initState();
    _scca.init();
  }

  Future<void> _sendMessage() async {
    final content = _controller.text.trim();
    if (content.isEmpty || _streaming) return;

    setState(() {
      _messages.add({'role': 'user', 'content': content});
      _controller.clear();
      _streaming = true;
    });

    try {
      // Create conversation if needed
      if (_conversationId == null) {
        final conv = await _scca.createConversation(title: 'Flutter Chat');
        _conversationId = conv['id'];
      }

      // Add placeholder for AI response
      setState(() {
        _messages.add({'role': 'assistant', 'content': ''});
      });

      // Stream response
      _streamSubscription = _scca
          .sendMessageStream(_conversationId!, content)
          .listen(
            (event) {
              if (event['token'] != null) {
                setState(() {
                  _messages.last['content'] += event['token'];
                });
              }
              if (event['done'] == true) {
                setState(() => _streaming = false);
              }
            },
            onError: (e) {
              print('Stream error: $e');
              setState(() => _streaming = false);
            },
          );
    } catch (e) {
      print('Send error: $e');
      setState(() => _streaming = false);
    }
  }

  @override
  void dispose() {
    _streamSubscription?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('SCCA Chat')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (ctx, i) {
                final msg = _messages[i];
                final isUser = msg['role'] == 'user';
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: EdgeInsets.symmetric(vertical: 4),
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isUser ? Colors.blue[100] : Colors.grey[200],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.8,
                    ),
                    child: Text(msg['content']),
                  ),
                );
              },
            ),
          ),
          if (_streaming) LinearProgressIndicator(),
          Padding(
            padding: EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                    enabled: !_streaming,
                  ),
                ),
                SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _streaming ? null : _sendMessage,
                  child: Text('Send'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}`}</CodeBlock>

            <SubTitle>iOS (Swift)</SubTitle>
            <p className="text-xs text-terminal-dim leading-relaxed mb-3">
              For native iOS apps using Swift and URLSession:
            </p>
            <CodeBlock language="swift">{`// SCCAClient.swift
import Foundation

class SCCAClient {
    let baseURL: URL
    private var sessionCookie: String?
    
    init(baseURL: String) {
        self.baseURL = URL(string: baseURL)!
    }
    
    // Store session in UserDefaults
    func setSessionCookie(_ cookie: String) {
        sessionCookie = cookie
        UserDefaults.standard.set(cookie, forKey: "scca_session")
    }
    
    func loadSessionCookie() {
        sessionCookie = UserDefaults.standard.string(forKey: "scca_session")
    }
    
    func clearSession() {
        sessionCookie = nil
        UserDefaults.standard.removeObject(forKey: "scca_session")
    }
    
    // MARK: - Authentication
    
    func login(email: String, password: String) async throws -> Bool {
        // Get CSRF token
        let csrfURL = baseURL.appendingPathComponent("/api/auth/csrf")
        let (csrfData, csrfResponse) = try await URLSession.shared.data(from: csrfURL)
        
        guard let csrfJson = try? JSONSerialization.jsonObject(with: csrfData) as? [String: Any],
              let csrfToken = csrfJson["csrfToken"] as? String else {
            return false
        }
        
        // Extract cookie from response
        if let headers = csrfResponse as? HTTPURLResponse,
           let setCookie = headers.allHeaderFields["Set-Cookie"] as? String {
            // Store initial cookie
        }
        
        // Sign in
        let loginURL = baseURL.appendingPathComponent("/api/auth/callback/credentials")
        var request = URLRequest(url: loginURL)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        
        let body = "email=\\(email.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)&password=\\(password.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)&csrfToken=\\(csrfToken)"
        request.httpBody = body.data(using: .utf8)
        
        let (_, loginResponse) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = loginResponse as? HTTPURLResponse,
              (200...302).contains(httpResponse.statusCode),
              let sessionCookie = httpResponse.allHeaderFields["Set-Cookie"] as? String else {
            return false
        }
        
        setSessionCookie(sessionCookie)
        return true
    }
    
    // MARK: - Vault API
    
    func encrypt(data: [String], context: String) async throws -> [String: Any] {
        let url = baseURL.appendingPathComponent("/api/scca/vault/encrypt")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let cookie = sessionCookie {
            request.setValue(cookie, forHTTPHeaderField: "Cookie")
        }
        
        let body: [String: Any] = ["data": data, "context": context]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw SCCAError.invalidResponse
        }
        return json
    }
    
    func decrypt(tokens: [String], context: String) async throws -> [String: Any] {
        let url = baseURL.appendingPathComponent("/api/scca/vault/decrypt")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let cookie = sessionCookie {
            request.setValue(cookie, forHTTPHeaderField: "Cookie")
        }
        
        let body: [String: Any] = ["tokens": tokens, "context": context]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw SCCAError.invalidResponse
        }
        return json
    }
    
    // MARK: - Chat API
    
    func createConversation(title: String = "New Chat") async throws -> [String: Any] {
        let url = baseURL.appendingPathComponent("/api/scca/conversations")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let cookie = sessionCookie {
            request.setValue(cookie, forHTTPHeaderField: "Cookie")
        }
        
        let body: [String: Any] = ["title": title]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw SCCAError.invalidResponse
        }
        return json
    }
    
    func sendMessageStream(
        conversationId: String,
        content: String,
        onToken: @escaping (String) -> Void,
        onComplete: @escaping ([String: Any]) -> Void,
        onError: @escaping (Error) -> Void
    ) {
        let url = baseURL.appendingPathComponent("/api/scca/conversations/\\(conversationId)/messages")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let cookie = sessionCookie {
            request.setValue(cookie, forHTTPHeaderField: "Cookie")
        }
        
        let body: [String: Any] = [
            "content": content,
            "temperature": 0.7,
            "max_tokens": 4096
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                onError(error)
                return
            }
            
            guard let data = data else {
                onError(SCCAError.noData)
                return
            }
            
            // Parse SSE stream
            let text = String(data: data, encoding: .utf8) ?? ""
            let lines = text.components(separatedBy: "\\n")
            
            for line in lines {
                if line.hasPrefix("data: ") {
                    let jsonStr = String(line.dropFirst(6))
                    if let jsonData = jsonStr.data(using: .utf8),
                       let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                        if let token = json["token"] as? String {
                            DispatchQueue.main.async {
                                onToken(token)
                            }
                        } else if json["done"] as? Bool == true {
                            DispatchQueue.main.async {
                                onComplete(json)
                            }
                        }
                    }
                }
            }
        }
        
        task.resume()
    }
}

enum SCCAError: Error {
    case invalidResponse
    case noData
    case authenticationFailed
}`}</CodeBlock>

            <SubTitle>Android (Kotlin)</SubTitle>
            <p className="text-xs text-terminal-dim leading-relaxed mb-3">
              For native Android apps using Kotlin and OkHttp:
            </p>
            <CodeBlock language="kotlin">{`// build.gradle.kts
dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:okhttp-eventsource:4.12.0")
    implementation("org.json:json:20231013")
}`}</CodeBlock>
            <CodeBlock language="kotlin">{`// SCCAClient.kt
package com.example.scca

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import okhttp3.*
import okhttp3.EventSource
import okhttp3.EventSourceListener
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException

class SCCAClient(
    private val context: Context,
    private val baseUrl: String
) {
    private val client = OkHttpClient()
    private val prefs: SharedPreferences = 
        context.getSharedPreferences("scca", Context.MODE_PRIVATE)
    
    companion object {
        private const val SESSION_COOKIE_KEY = "scca_session"
        private val JSON = "application/json; charset=utf-8".toMediaType()
    }
    
    // Session management
    fun setSessionCookie(cookie: String) {
        prefs.edit().putString(SESSION_COOKIE_KEY, cookie).apply()
    }
    
    fun getSessionCookie(): String? {
        return prefs.getString(SESSION_COOKIE_KEY, null)
    }
    
    fun clearSession() {
        prefs.edit().remove(SESSION_COOKIE_KEY).apply()
    }
    
    // Authentication
    suspend fun login(email: String, password: String): Boolean {
        return try {
            // Get CSRF token
            val csrfRequest = Request.Builder()
                .url("$baseUrl/api/auth/csrf")
                .build()
            
            val csrfResponse = client.newCall(csrfRequest).execute()
            val csrfJson = JSONObject(csrfResponse.body?.string() ?: "{}")
            val csrfToken = csrfJson.getString("csrfToken")
            val initialCookie = csrfResponse.headers("Set-Cookie").firstOrNull()
            
            // Sign in
            val formBody = FormBody.Builder()
                .add("email", email)
                .add("password", password)
                .add("csrfToken", csrfToken)
                .build()
            
            val loginRequest = Request.Builder()
                .url("$baseUrl/api/auth/callback/credentials")
                .post(formBody)
                .apply { 
                    initialCookie?.let { addHeader("Cookie", it) }
                }
                .build()
            
            val loginResponse = client.newCall(loginRequest).execute()
            
            if (loginResponse.isSuccessful || loginResponse.code == 302) {
                val sessionCookie = loginResponse.headers("Set-Cookie").firstOrNull()
                sessionCookie?.let { setSessionCookie(it) }
                sessionCookie != null
            } else {
                false
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
    
    // Vault API: Encrypt
    fun encrypt(data: List<String>, context: String): Result<JSONObject> {
        return try {
            val body = JSONObject().apply {
                put("data", JSONArray(data))
                put("context", context)
            }
            
            val request = Request.Builder()
                .url("$baseUrl/api/scca/vault/encrypt")
                .post(body.toString().toRequestBody(JSON))
                .addHeader("Content-Type", "application/json")
                .apply { getSessionCookie()?.let { addHeader("Cookie", it) } }
                .build()
            
            val response = client.newCall(request).execute()
            
            if (response.isSuccessful) {
                Result.success(JSONObject(response.body?.string() ?: "{}"))
            } else {
                Result.failure(IOException("Encrypt failed: \${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // Vault API: Decrypt
    fun decrypt(tokens: List<String>, context: String): Result<JSONObject> {
        return try {
            val body = JSONObject().apply {
                put("tokens", JSONArray(tokens))
                put("context", context)
            }
            
            val request = Request.Builder()
                .url("$baseUrl/api/scca/vault/decrypt")
                .post(body.toString().toRequestBody(JSON))
                .addHeader("Content-Type", "application/json")
                .apply { getSessionCookie()?.let { addHeader("Cookie", it) } }
                .build()
            
            val response = client.newCall(request).execute()
            
            if (response.isSuccessful) {
                Result.success(JSONObject(response.body?.string() ?: "{}"))
            } else {
                Result.failure(IOException("Decrypt failed: \${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // Chat: Create conversation
    fun createConversation(title: String = "New Chat"): Result<JSONObject> {
        return try {
            val body = JSONObject().put("title", title)
            
            val request = Request.Builder()
                .url("$baseUrl/api/scca/conversations")
                .post(body.toString().toRequestBody(JSON))
                .addHeader("Content-Type", "application/json")
                .apply { getSessionCookie()?.let { addHeader("Cookie", it) } }
                .build()
            
            val response = client.newCall(request).execute()
            
            if (response.isSuccessful) {
                Result.success(JSONObject(response.body?.string() ?: "{}"))
            } else {
                Result.failure(IOException("Create failed: \${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // Chat: Send message with streaming
    fun sendMessageStream(conversationId: String, content: String): Flow<SSEEvent> = flow {
        val body = JSONObject().apply {
            put("content", content)
            put("temperature", 0.7)
            put("max_tokens", 4096)
        }
        
        val request = Request.Builder()
            .url("$baseUrl/api/scca/conversations/$conversationId/messages")
            .post(body.toString().toRequestBody(JSON))
            .addHeader("Content-Type", "application/json")
            .apply { getSessionCookie()?.let { addHeader("Cookie", it) } }
            .build()
        
        val response = client.newCall(request).execute()
        
        if (!response.isSuccessful) {
            emit(SSEEvent.Error("HTTP \${response.code}"))
            return@flow
        }
        
        val source = response.body?.source()
        val buffer = okio.Buffer()
        
        while (!source!!.exhausted()) {
            source.read(buffer, 8192)
            val chunk = buffer.readUtf8()
            val lines = chunk.split("\\n")
            
            for (line in lines) {
                if (line.startsWith("data: ")) {
                    val jsonStr = line.substring(6)
                    try {
                        val json = JSONObject(jsonStr)
                        when {
                            json.has("token") -> emit(SSEEvent.Token(json.getString("token")))
                            json.optBoolean("done") -> emit(SSEEvent.Done(json))
                            json.has("error") -> emit(SSEEvent.Error(json.getString("error")))
                        }
                    } catch (e: Exception) {
                        // Ignore parse errors
                    }
                }
            }
        }
    }.flowOn(Dispatchers.IO)
}

sealed class SSEEvent {
    data class Token(val content: String) : SSEEvent()
    data class Done(val data: JSONObject) : SSEEvent()
    data class Error(val message: String) : SSEEvent()
}`}</CodeBlock>

            <div className="cyber-card p-5 mb-6 border-neon-cyan/20">
              <div className="flex items-start gap-3">
                <span className="text-neon-cyan text-sm mt-0.5">&#9881;</span>
                <div>
                  <span className="text-xs font-semibold text-neon-cyan">API Key Authentication</span>
                  <p className="text-[11px] text-terminal-dim mt-1 leading-relaxed">
                    For Vault API access (encrypt/decrypt), you can use API key authentication instead 
                    of session cookies. Generate an API key from your Dashboard, then pass it in the 
                    <code className="text-neon-cyan">Authorization: Bearer scca_k_...</code> header. 
                    This is recommended for backend services and mobile apps that don&apos;t need full 
                    session management.
                  </p>
                </div>
              </div>
            </div>

            {/* Vault API */}
            <SectionTitle id="vault">Vault API</SectionTitle>
            <p className="text-sm text-terminal-dim leading-relaxed mb-4">
              Use SCCA&apos;s encryption engine directly — encrypt, decrypt, and verify
              any data through the Vault API. No chat required. Store the
              encrypted tokens in your own database, pass them between services,
              or use them anywhere you need AES-256-GCM + zlib compression
              with Merkle integrity.
            </p>

            <SubTitle>Authentication with API Keys</SubTitle>
            <p className="text-xs text-terminal-dim leading-relaxed mb-3">
              Generate an API key from your{' '}
              <code className="text-neon-cyan bg-cyber-darker px-1 py-0.5 rounded">
                Dashboard &gt; API Keys
              </code>{' '}
              page. Use it in the <code className="text-neon-cyan bg-cyber-darker px-1 py-0.5 rounded">Authorization</code> header
              for all Vault API requests.
            </p>
            <CodeBlock language="bash">{`# All Vault API requests use Bearer auth:
curl -X POST https://your-scca-instance.com/api/scca/vault/encrypt \\
  -H "Authorization: Bearer scca_k_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"data": "hello world", "context": "my-project"}'`}</CodeBlock>

            <div className="cyber-card overflow-hidden mb-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-cyber-light/20 bg-cyber-darker">
                    <th className="text-left p-3 text-terminal-dim tracking-wider uppercase">Endpoint</th>
                    <th className="text-left p-3 text-terminal-dim tracking-wider uppercase">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['POST /api/scca/keys', 'Generate a new API key (session auth only)'],
                    ['GET /api/scca/keys', 'List your active keys (session auth only)'],
                    ['DELETE /api/scca/keys/[id]', 'Revoke an API key (session auth only)'],
                  ].map(([ep, desc]) => (
                    <tr key={ep} className="border-b border-cyber-light/10">
                      <td className="p-3"><code className="text-neon-green">{ep}</code></td>
                      <td className="p-3 text-terminal-dim">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <CodeBlock language="json">{`// POST /api/scca/keys — Generate a new key
// Request (requires session cookie auth)
{ "name": "Production Backend", "expiresInDays": 90 }

// Response (key shown ONCE, save it immediately)
{
  "id": "clx...",
  "name": "Production Backend",
  "key": "scca_k_a1b2c3d4e5f6...",
  "keyPrefix": "scca_k_a1b2...",
  "expiresAt": "2026-05-10T00:00:00.000Z",
  "warning": "Save this key now. It will not be shown again."
}`}</CodeBlock>

            <div className="cyber-card p-5 mb-6 border-neon-green/20">
              <div className="flex items-start gap-3">
                <span className="text-neon-green text-sm mt-0.5">&#9656;</span>
                <div>
                  <span className="text-xs font-semibold text-neon-green">How it works</span>
                  <p className="text-[11px] text-terminal-dim mt-1 leading-relaxed">
                    Every authenticated user gets their own derived encryption keys.
                    The <code className="text-neon-cyan">context</code> parameter isolates keys
                    per project/use case — data encrypted under <code className="text-neon-cyan">&quot;billing&quot;</code> cannot
                    be decrypted with <code className="text-neon-cyan">&quot;user-data&quot;</code>, even by the same user.
                    The server handles all crypto. You send plaintext in, get encrypted tokens out.
                  </p>
                </div>
              </div>
            </div>

            <SubTitle>Encrypt Data</SubTitle>
            <Endpoint
              method="POST"
              path="/api/scca/vault/encrypt"
              description="Encrypt one or more strings. Returns encrypted tokens and a Merkle integrity root."
            >
              <CodeBlock language="json">{`// Request
{
  "data": "sensitive user data to encrypt",
  "context": "my-app-billing"
}

// Or encrypt multiple items at once
{
  "data": [
    "first item to encrypt",
    "second item to encrypt",
    "third item to encrypt"
  ],
  "context": "my-app-billing"
}

// Response: 200 OK
{
  "tokens": [
    "AQAAAAAn..."
  ],
  "merkleRoot": "a1b2c3d4e5f6...",
  "context": "my-app-billing",
  "metadata": {
    "itemCount": 1,
    "originalBytes": 30,
    "encryptedBytes": 1098,
    "compressionRatio": 0.365,
    "cipher": "AES-256-GCM",
    "kdf": "HKDF-SHA256",
    "integrity": "HMAC-SHA256-chain"
  }
}`}</CodeBlock>
            </Endpoint>

            <SubTitle>Decrypt Data</SubTitle>
            <Endpoint
              method="POST"
              path="/api/scca/vault/decrypt"
              description="Decrypt tokens back to plaintext. Must use the same context as encryption."
            >
              <CodeBlock language="json">{`// Request
{
  "tokens": ["AQAAAAAn..."],
  "context": "my-app-billing"
}

// Response: 200 OK
{
  "data": [
    {
      "content": "sensitive user data to encrypt",
      "sequence": 0,
      "timestamp": "2026-02-09T12:00:00.000Z",
      "contentHash": "a1b2c3d4e5f67890"
    }
  ],
  "context": "my-app-billing"
}`}</CodeBlock>
            </Endpoint>

            <SubTitle>Verify Integrity</SubTitle>
            <Endpoint
              method="POST"
              path="/api/scca/vault/verify"
              description="Verify that tokens haven't been tampered with using the Merkle-HMAC chain."
            >
              <CodeBlock language="json">{`// Request
{
  "tokens": ["AQAAAAAn...", "AQEAAAAn..."],
  "merkleRoot": "a1b2c3d4e5f6...",
  "context": "my-app-billing"
}

// Response: 200 OK
{
  "valid": true,
  "merkleRootMatch": true,
  "computedRoot": "a1b2c3d4e5f6...",
  "tokenCount": 2,
  "errors": [],
  "lastValidSequence": 1
}`}</CodeBlock>
            </Endpoint>

            <SubTitle>Usage: Encrypt Data in Your System (cURL)</SubTitle>
            <CodeBlock language="bash">{`# Authenticate first (see Authentication section below)

# Encrypt sensitive data
curl -s -b cookies.txt \\
  -X POST https://your-scca-instance.com/api/scca/vault/encrypt \\
  -H "Content-Type: application/json" \\
  -d '{
    "data": ["user SSN: 123-45-6789", "credit card: 4111-1111-1111-1111"],
    "context": "pii-vault"
  }' | jq .

# Store the tokens and merkleRoot in your own database
# Later, decrypt when needed:
curl -s -b cookies.txt \\
  -X POST https://your-scca-instance.com/api/scca/vault/decrypt \\
  -H "Content-Type: application/json" \\
  -d '{
    "tokens": ["<token-from-encrypt>", "<token-from-encrypt>"],
    "context": "pii-vault"
  }' | jq .data

# Verify nothing was tampered with:
curl -s -b cookies.txt \\
  -X POST https://your-scca-instance.com/api/scca/vault/verify \\
  -H "Content-Type: application/json" \\
  -d '{
    "tokens": ["<token-from-encrypt>", "<token-from-encrypt>"],
    "merkleRoot": "<root-from-encrypt>",
    "context": "pii-vault"
  }' | jq .valid`}</CodeBlock>

            <SubTitle>Usage: JavaScript / TypeScript</SubTitle>
            <CodeBlock language="typescript">{`const SCCA = "https://your-scca-instance.com";

// Encrypt data for storage
async function encryptData(data: string | string[], context: string) {
  const res = await fetch(\`\${SCCA}/api/scca/vault/encrypt\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ data, context }),
  });
  return res.json();
  // { tokens: [...], merkleRoot: "...", metadata: {...} }
}

// Decrypt tokens back to plaintext
async function decryptData(tokens: string[], context: string) {
  const res = await fetch(\`\${SCCA}/api/scca/vault/decrypt\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ tokens, context }),
  });
  return res.json();
  // { data: [{ content, sequence, timestamp, contentHash }] }
}

// Verify integrity
async function verifyData(
  tokens: string[],
  merkleRoot: string,
  context: string
) {
  const res = await fetch(\`\${SCCA}/api/scca/vault/verify\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ tokens, merkleRoot, context }),
  });
  return res.json();
  // { valid: true/false, errors: [...] }
}

// ── Example: Encrypt user PII before storing in your DB ──

async function storeUserData(userId: string, sensitiveFields: string[]) {
  // Encrypt with SCCA — each user gets a unique context
  const result = await encryptData(sensitiveFields, \`user-\${userId}-pii\`);

  // Store encrypted tokens in YOUR database
  await yourDB.users.update({
    where: { id: userId },
    data: {
      encryptedPII: result.tokens,       // string[]
      piiMerkleRoot: result.merkleRoot,  // for verification
    },
  });
}

async function readUserData(userId: string) {
  const user = await yourDB.users.findUnique({ where: { id: userId } });

  // Verify integrity first
  const check = await verifyData(
    user.encryptedPII,
    user.piiMerkleRoot,
    \`user-\${userId}-pii\`
  );
  if (!check.valid) throw new Error("Data tampered with!");

  // Decrypt
  const result = await decryptData(
    user.encryptedPII,
    \`user-\${userId}-pii\`
  );
  return result.data.map((d: any) => d.content);
}`}</CodeBlock>

            <SubTitle>Usage: Python</SubTitle>
            <CodeBlock language="python">{`import requests, json

class SCCAVault:
    def __init__(self, base_url: str, session: requests.Session):
        self.base = base_url
        self.session = session

    def encrypt(self, data, context: str) -> dict:
        """Encrypt a string or list of strings."""
        res = self.session.post(
            f"{self.base}/api/scca/vault/encrypt",
            json={"data": data, "context": context},
        )
        res.raise_for_status()
        return res.json()

    def decrypt(self, tokens: list, context: str) -> list:
        """Decrypt tokens back to plaintext."""
        res = self.session.post(
            f"{self.base}/api/scca/vault/decrypt",
            json={"tokens": tokens, "context": context},
        )
        res.raise_for_status()
        return res.json()["data"]

    def verify(self, tokens: list, merkle_root: str, context: str) -> dict:
        """Verify token integrity."""
        res = self.session.post(
            f"{self.base}/api/scca/vault/verify",
            json={
                "tokens": tokens,
                "merkleRoot": merkle_root,
                "context": context,
            },
        )
        res.raise_for_status()
        return res.json()


# ── Example: Encrypt logs before storage ──

vault = SCCAVault("https://your-scca-instance.com", authenticated_session)

# Encrypt sensitive log entries
result = vault.encrypt(
    data=[
        "User john@example.com logged in from 192.168.1.1",
        "Payment of $499.99 processed for order #12345",
        "API key sk_live_abc123 was rotated",
    ],
    context="audit-logs-2026"
)

# Store result["tokens"] and result["merkleRoot"] in your system
print(f"Encrypted {result['metadata']['itemCount']} items")
print(f"Compression ratio: {result['metadata']['compressionRatio']}")

# Later — verify and decrypt
check = vault.verify(stored_tokens, stored_merkle_root, "audit-logs-2026")
assert check["valid"], f"Integrity check failed: {check['errors']}"

entries = vault.decrypt(stored_tokens, "audit-logs-2026")
for entry in entries:
    print(f"[{entry['timestamp']}] {entry['content']}")`}</CodeBlock>

            <div className="cyber-card p-5 mb-6 border-neon-cyan/20">
              <div className="flex items-start gap-3">
                <span className="text-neon-cyan text-sm mt-0.5">&#9881;</span>
                <div>
                  <span className="text-xs font-semibold text-neon-cyan">Use Cases</span>
                  <ul className="text-[11px] text-terminal-dim mt-2 space-y-1.5 list-none">
                    <li className="flex gap-2">
                      <span className="text-neon-green">&#8226;</span>
                      <span><strong className="text-terminal-text">PII Storage</strong> — Encrypt user data (SSN, addresses, payment info) before storing in your database</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-neon-green">&#8226;</span>
                      <span><strong className="text-terminal-text">Audit Logs</strong> — Encrypt sensitive log entries with tamper-proof Merkle verification</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-neon-green">&#8226;</span>
                      <span><strong className="text-terminal-text">Internal Chat</strong> — Add encryption to your existing chat system without rebuilding it</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-neon-green">&#8226;</span>
                      <span><strong className="text-terminal-text">Config Secrets</strong> — Encrypt API keys and credentials at rest with per-project isolation</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-neon-green">&#8226;</span>
                      <span><strong className="text-terminal-text">File Metadata</strong> — Encrypt file descriptions, tags, or annotations before cloud storage</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-neon-green">&#8226;</span>
                      <span><strong className="text-terminal-text">AI Pipelines</strong> — Encrypt prompts and responses in your AI workflow, verify they weren&apos;t modified in transit</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Integration Guide */}
            <SectionTitle id="integration">Integration Guide</SectionTitle>
            <p className="text-sm text-terminal-dim leading-relaxed mb-4">
              Use SCCA as the encrypted chat backend for your own application.
              Authenticate, create conversations, send messages, and handle
              streaming responses — all through the REST API.
            </p>

            <SubTitle>Authentication</SubTitle>
            <p className="text-xs text-terminal-dim leading-relaxed mb-3">
              SCCA uses NextAuth for session management. To call the API from an external
              client, first obtain a session by signing in via the credentials endpoint.
              The session cookie is used for all subsequent requests.
            </p>
            <CodeBlock language="bash">{`# 1. Get CSRF token
CSRF=$(curl -s -c cookies.txt https://your-scca-instance.com/api/auth/csrf \\
  | jq -r '.csrfToken')

# 2. Sign in with credentials
curl -s -b cookies.txt -c cookies.txt \\
  -X POST https://your-scca-instance.com/api/auth/callback/credentials \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "email=user@example.com&password=yourpassword&csrfToken=$CSRF"

# 3. Now use cookies.txt for all API calls
curl -b cookies.txt https://your-scca-instance.com/api/scca/conversations`}</CodeBlock>

            <SubTitle>Full Conversation Lifecycle (cURL)</SubTitle>
            <p className="text-xs text-terminal-dim leading-relaxed mb-3">
              Create a conversation, send a message, receive the streamed AI response,
              then edit a message with destructive editing.
            </p>
            <CodeBlock language="bash">{`# Create a new conversation
CONV=$(curl -s -b cookies.txt \\
  -X POST https://your-scca-instance.com/api/scca/conversations \\
  -H "Content-Type: application/json" \\
  -d '{"title": "My Integration Test"}')

CONV_ID=$(echo $CONV | jq -r '.id')
echo "Created conversation: $CONV_ID"

# Send a message (SSE streaming response)
curl -N -b cookies.txt \\
  -X POST "https://your-scca-instance.com/api/scca/conversations/$CONV_ID/messages" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "What is SCCA?",
    "temperature": 0.7,
    "max_tokens": 4096
  }'
# Each line: data: {"token":"..."} ... data: {"done":true}

# Retrieve the full conversation with decrypted messages
curl -s -b cookies.txt \\
  "https://your-scca-instance.com/api/scca/conversations/$CONV_ID"

# Destructive edit: rewrite message at sequence 0, regenerate AI response
curl -N -b cookies.txt \\
  -X POST "https://your-scca-instance.com/api/scca/conversations/$CONV_ID/edit" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sequence": 0,
    "content": "Explain SCCA encryption in detail",
    "regenerate": true
  }'`}</CodeBlock>

            <SubTitle>JavaScript / TypeScript Client</SubTitle>
            <p className="text-xs text-terminal-dim leading-relaxed mb-3">
              Integrate SCCA into a Node.js backend or browser app. This example
              shows the full flow: auth, create, send, and stream.
            </p>
            <CodeBlock language="typescript">{`const SCCA_BASE = "https://your-scca-instance.com";

// Helper: authenticated fetch (browser — cookies are sent automatically)
// For server-side, pass the session cookie from your auth flow.

async function createConversation(title?: string) {
  const res = await fetch(\`\${SCCA_BASE}/api/scca/conversations\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title: title || "New Chat" }),
  });
  return res.json(); // { id, title, model, messageCount, ... }
}

async function sendMessage(
  conversationId: string,
  content: string,
  onToken: (token: string) => void,
  onDone: (data: { messageCount: number; title: string }) => void
) {
  const res = await fetch(
    \`\${SCCA_BASE}/api/scca/conversations/\${conversationId}/messages\`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        content,
        temperature: 0.7,
        max_tokens: 8192,
      }),
    }
  );

  // Parse the SSE stream
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = JSON.parse(line.slice(6));
      if (data.done) {
        onDone(data);
      } else if (data.token) {
        onToken(data.token);
      }
    }
  }
}

async function getMessages(conversationId: string) {
  const res = await fetch(
    \`\${SCCA_BASE}/api/scca/conversations/\${conversationId}\`,
    { credentials: "include" }
  );
  return res.json(); // { id, messages: [...], messageCount, ... }
}

async function destructiveEdit(
  conversationId: string,
  sequence: number,
  newContent: string,
  onToken: (token: string) => void,
  onDone: (data: any) => void
) {
  const res = await fetch(
    \`\${SCCA_BASE}/api/scca/conversations/\${conversationId}/edit\`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sequence,
        content: newContent,
        regenerate: true,
      }),
    }
  );

  // Same SSE parsing as sendMessage
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = JSON.parse(line.slice(6));
      if (data.done) onDone(data);
      else if (data.token) onToken(data.token);
    }
  }
}

// ── Usage Example ──

async function main() {
  // 1. Create conversation
  const conv = await createConversation("Security Review");
  console.log("Created:", conv.id);

  // 2. Send a message, stream the response
  let response = "";
  await sendMessage(
    conv.id,
    "How does AES-256-GCM work?",
    (token) => {
      response += token;
      process.stdout.write(token); // stream to console
    },
    (data) => console.log("\\nDone. Messages:", data.messageCount)
  );

  // 3. Edit message 0 and regenerate
  response = "";
  await destructiveEdit(
    conv.id,
    0,
    "Explain AES-256-GCM for a beginner",
    (token) => { response += token; },
    (data) => console.log("Edited. Messages:", data.messageCount)
  );
}`}</CodeBlock>

            <SubTitle>Python Client</SubTitle>
            <p className="text-xs text-terminal-dim leading-relaxed mb-3">
              Integrate SCCA from a Python backend using{' '}
              <code className="text-neon-cyan bg-cyber-darker px-1 py-0.5 rounded">requests</code>.
            </p>
            <CodeBlock language="python">{`import requests
import json

SCCA_BASE = "https://your-scca-instance.com"

class SCCAClient:
    def __init__(self, base_url: str):
        self.base = base_url
        self.session = requests.Session()

    def login(self, email: str, password: str):
        # Get CSRF token
        csrf = self.session.get(f"{self.base}/api/auth/csrf").json()["csrfToken"]
        # Sign in
        self.session.post(
            f"{self.base}/api/auth/callback/credentials",
            data={"email": email, "password": password, "csrfToken": csrf},
            allow_redirects=False,
        )

    def create_conversation(self, title: str = "New Chat") -> dict:
        res = self.session.post(
            f"{self.base}/api/scca/conversations",
            json={"title": title},
        )
        return res.json()

    def send_message(self, conv_id: str, content: str):
        """Send a message and yield streamed tokens."""
        res = self.session.post(
            f"{self.base}/api/scca/conversations/{conv_id}/messages",
            json={"content": content, "temperature": 0.7, "max_tokens": 8192},
            stream=True,
        )
        for line in res.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            data = json.loads(line[6:])
            if data.get("done"):
                yield {"done": True, **data}
                break
            elif "token" in data:
                yield {"token": data["token"]}

    def get_messages(self, conv_id: str) -> dict:
        return self.session.get(
            f"{self.base}/api/scca/conversations/{conv_id}"
        ).json()

    def destructive_edit(self, conv_id: str, sequence: int, content: str):
        """Edit a message and yield regenerated tokens."""
        res = self.session.post(
            f"{self.base}/api/scca/conversations/{conv_id}/edit",
            json={"sequence": sequence, "content": content, "regenerate": True},
            stream=True,
        )
        for line in res.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            data = json.loads(line[6:])
            if data.get("done"):
                yield {"done": True, **data}
                break
            elif "token" in data:
                yield {"token": data["token"]}


# ── Usage ──

client = SCCAClient(SCCA_BASE)
client.login("user@example.com", "yourpassword")

conv = client.create_conversation("Python Integration")
print(f"Created: {conv['id']}")

# Stream the AI response
for event in client.send_message(conv["id"], "What is SCCA?"):
    if "token" in event:
        print(event["token"], end="", flush=True)
    elif event.get("done"):
        print(f"\\nDone. Messages: {event['messageCount']}")

# Retrieve full conversation
messages = client.get_messages(conv["id"])
for msg in messages["messages"]:
    print(f"[{msg['role']}] {msg['content'][:80]}")`}</CodeBlock>

            <SubTitle>Handling SSE Streams</SubTitle>
            <p className="text-xs text-terminal-dim leading-relaxed mb-3">
              Both the <code className="text-neon-cyan bg-cyber-darker px-1 py-0.5 rounded">/messages</code> and{' '}
              <code className="text-neon-cyan bg-cyber-darker px-1 py-0.5 rounded">/edit</code> endpoints
              return Server-Sent Events. The format is simple:
            </p>
            <CodeBlock language="text">{`data: {"token":"Hello"}         ← AI token (append to response)
data: {"token":" there"}        ← another token
data: {"token":"!"}             ← another token
data: {"done":true,"messageCount":4,"title":"Chat Title"}  ← stream complete

Error events:
data: {"error":"Unauthorized"}  ← auth failed
data: {"error":"Not found"}     ← conversation doesn't exist`}</CodeBlock>

            <div className="cyber-card p-5 mb-6 border-neon-yellow/20">
              <div className="flex items-start gap-3">
                <span className="text-neon-yellow text-sm mt-0.5">&#9888;</span>
                <div>
                  <span className="text-xs font-semibold text-neon-yellow">Important Notes</span>
                  <ul className="text-[11px] text-terminal-dim mt-2 space-y-1.5 list-none">
                    <li className="flex gap-2">
                      <span className="text-neon-cyan">&#8226;</span>
                      <span>All encryption/decryption happens server-side. The API returns plaintext messages — you don&apos;t need to handle encryption in your client.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-neon-cyan">&#8226;</span>
                      <span>Destructive edits are irreversible. Messages after the edit point are permanently deleted before the response is regenerated.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-neon-cyan">&#8226;</span>
                      <span>The session cookie expires based on your NextAuth configuration. Re-authenticate if you receive 401 responses.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-neon-cyan">&#8226;</span>
                      <span>Rate limiting is not enforced by default. If deploying publicly, add rate limiting middleware.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* API Reference */}
            <SectionTitle id="api">API Reference</SectionTitle>
            <p className="text-sm text-terminal-dim leading-relaxed mb-4">
              All endpoints require NextAuth session authentication. The user ID is extracted
              from the JWT session token.
            </p>

            <SubTitle>List Conversations</SubTitle>
            <Endpoint
              method="GET"
              path="/api/scca/conversations"
              description="Returns all conversations for the authenticated user."
            >
              <CodeBlock language="json">{`// Response: 200 OK
[
  {
    "id": "clx1234...",
    "title": "New Chat",
    "model": "llama-3.3-70b-versatile",
    "messageCount": 12,
    "createdAt": "2026-02-01T00:00:00.000Z",
    "updatedAt": "2026-02-01T12:00:00.000Z"
  }
]`}</CodeBlock>
            </Endpoint>

            <SubTitle>Create Conversation</SubTitle>
            <Endpoint
              method="POST"
              path="/api/scca/conversations"
              description="Create a new encrypted conversation."
            >
              <CodeBlock language="json">{`// Request Body
{
  "title": "Optional title",
  "model": "llama-3.3-70b-versatile"
}

// Response: 201 Created
{
  "id": "clx1234...",
  "title": "New Chat",
  "model": "llama-3.3-70b-versatile",
  "messageCount": 0,
  "createdAt": "2026-02-01T00:00:00.000Z",
  "updatedAt": "2026-02-01T00:00:00.000Z"
}`}</CodeBlock>
            </Endpoint>

            <SubTitle>Get Conversation</SubTitle>
            <Endpoint
              method="GET"
              path="/api/scca/conversations/[id]?offset=0&limit=50"
              description="Retrieve conversation with decrypted messages. Supports viewport loading."
            >
              <div className="mb-3">
                <span className="text-[10px] text-terminal-dim tracking-wider uppercase">Query Parameters</span>
                <div className="mt-1 space-y-1">
                  <div className="flex gap-2 text-xs">
                    <code className="text-neon-cyan">offset</code>
                    <span className="text-terminal-dim">Starting message index (optional)</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <code className="text-neon-cyan">limit</code>
                    <span className="text-terminal-dim">Number of messages to return (optional)</span>
                  </div>
                </div>
              </div>
              <CodeBlock language="json">{`// Response: 200 OK
{
  "id": "clx1234...",
  "title": "My Chat",
  "model": "llama-3.3-70b-versatile",
  "messageCount": 12,
  "messages": [
    {
      "id": "msg-0",
      "role": "user",
      "content": "Hello!",
      "sequence": 0,
      "timestamp": 1706745600
    },
    {
      "id": "msg-1",
      "role": "assistant",
      "content": "Hi there! How can I help?",
      "sequence": 1,
      "timestamp": 1706745601
    }
  ]
}`}</CodeBlock>
            </Endpoint>

            <SubTitle>Update Conversation</SubTitle>
            <Endpoint
              method="PATCH"
              path="/api/scca/conversations/[id]"
              description="Rename conversation or change model."
            >
              <CodeBlock language="json">{`// Request Body
{
  "title": "New Title",
  "model": "llama-3.1-8b-instant"
}

// Response: 200 OK`}</CodeBlock>
            </Endpoint>

            <SubTitle>Delete Conversation</SubTitle>
            <Endpoint
              method="DELETE"
              path="/api/scca/conversations/[id]"
              description="Soft delete a conversation. Sets deletedAt timestamp."
            >
              <CodeBlock language="json">{`// Response: 200 OK`}</CodeBlock>
            </Endpoint>

            <SubTitle>Send Message (Streaming)</SubTitle>
            <Endpoint
              method="POST"
              path="/api/scca/conversations/[id]/messages"
              description="Send a message and receive AI response via Server-Sent Events stream."
            >
              <CodeBlock language="json">{`// Request Body
{
  "content": "Explain quantum computing",
  "temperature": 0.7,
  "top_p": 1,
  "max_tokens": 8192,
  "model": "llama-3.3-70b-versatile",
  "systemPrompt": "You are a helpful AI assistant."
}

// Response: 200 OK (SSE Stream)
data: {"token":"Quantum"}
data: {"token":" computing"}
data: {"token":" is"}
...
data: {"done":true,"messageCount":4,"title":"Quantum Computing"}`}</CodeBlock>
            </Endpoint>

            <SubTitle>Destructive Edit</SubTitle>
            <Endpoint
              method="POST"
              path="/api/scca/conversations/[id]/edit"
              description="Edit a message. All subsequent messages are permanently deleted. Optionally triggers AI regeneration."
            >
              <CodeBlock language="json">{`// Edit with regeneration
{
  "sequence": 2,
  "content": "Updated message content",
  "regenerate": true,
  "temperature": 0.7,
  "systemPrompt": "You are a helpful assistant."
}

// Delete a message (and all after it)
{
  "action": "delete",
  "sequence": 4
}

// Response: SSE stream if regenerating, JSON otherwise`}</CodeBlock>
            </Endpoint>

            {/* Media Pipeline */}
            <SectionTitle id="media">Media Pipeline</SectionTitle>
            <p className="text-sm text-terminal-dim leading-relaxed mb-4">
              SCCA v2 extends encryption to media files — images, video, audio, and documents.
              Each file passes through a format-aware pipeline: type detection, selective compression,
              AES-256-GCM encryption, and SCCA packet encapsulation with SHA-256 integrity verification.
            </p>

            <SubTitle>Format Support Matrix</SubTitle>
            <p className="text-xs text-terminal-dim leading-relaxed mb-3">
              Already-compressed formats (PNG, JPEG, MP4, MP3) are encrypted directly with no re-compression.
              Text-based formats (SVG, JSON, Markdown) get zlib level 9 compression before encryption for significant savings.
            </p>
            <div className="cyber-card overflow-hidden mb-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-cyber-light/20 bg-cyber-darker">
                    <th className="text-left p-3 text-terminal-dim tracking-wider uppercase">Category</th>
                    <th className="text-left p-3 text-terminal-dim tracking-wider uppercase">Formats</th>
                    <th className="text-left p-3 text-terminal-dim tracking-wider uppercase">Strategy</th>
                    <th className="text-left p-3 text-terminal-dim tracking-wider uppercase">Max Size</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Image', 'PNG, JPEG, WebP, HEIC', 'Encrypt only', '25 MB'],
                    ['Image', 'SVG, GIF', 'zlib + encrypt', '25 MB'],
                    ['Video', 'MP4, WebM, MOV', 'Encrypt only', '100 MB'],
                    ['Audio', 'MP3, WAV, OGG, M4A, FLAC', 'Encrypt only', '50 MB'],
                    ['Document', 'PDF, TXT, Markdown, JSON', 'zlib-9 + encrypt', '10 MB'],
                  ].map(([cat, formats, strategy, max]) => (
                    <tr key={`${cat}-${formats}`} className="border-b border-cyber-light/10">
                      <td className="p-3 text-neon-cyan font-semibold">{cat}</td>
                      <td className="p-3 text-terminal-text">{formats}</td>
                      <td className="p-3">
                        <span className={strategy === 'Encrypt only' ? 'text-neon-yellow' : 'text-neon-green'}>
                          {strategy}
                        </span>
                      </td>
                      <td className="p-3 text-terminal-dim font-mono">{max}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubTitle>SCCA Media Packet Format</SubTitle>
            <p className="text-xs text-terminal-dim leading-relaxed mb-3">
              Every media file is wrapped in a 70-byte-header SCCA v2 packet. The header is readable
              without decryption for routing and verification purposes.
            </p>
            <CodeBlock language="text">{`SCCA Media Packet (v2):
┌──────────────────────────────────────────────────────┐
│ Magic Bytes (4 bytes)     "SCCA"                     │
│ Version (1 byte)          0x02                       │
│ Type Code (1 byte)        e.g. 0x01=PNG, 0x10=MP4   │
├──────────────────────────────────────────────────────┤
│ IV / Nonce (16 bytes)     Random, unique per file    │
│ Auth Tag (16 bytes)       AES-GCM authentication     │
│ Checksum (32 bytes)       SHA-256 of original data   │
├──────────────────────────────────────────────────────┤
│ Encrypted Payload         [compressed?] + encrypted  │
└──────────────────────────────────────────────────────┘

Type Codes:
  0x01 PNG   0x02 JPEG  0x03 WebP   0x04 GIF    0x05 SVG
  0x10 MP4   0x11 WebM  0x12 MOV
  0x20 MP3   0x21 WAV   0x22 OGG    0x23 M4A    0x24 FLAC
  0x30 PDF   0x40 TXT   0x41 MD     0x42 JSON`}</CodeBlock>

            <SubTitle>Media Processing Pipeline</SubTitle>
            <p className="text-xs text-terminal-dim leading-relaxed mb-3">
              The pipeline detects format, applies selective compression, encrypts with the
              conversation key, and verifies integrity via SHA-256 checksum.
            </p>
            <CodeBlock language="text">{`Input File
    │
    ▼
┌─────────────┐
│ Type Detect  │  Determine MIME type from extension / magic bytes
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│ Already compressed?          │
│  YES (PNG, JPEG, MP4, MP3)  │──▶ Skip compression
│  NO  (SVG, JSON, TXT, PDF)  │──▶ zlib level 9 deflate
└──────────────┬──────────────┘
               │
               ▼
┌──────────────────────┐
│ SHA-256 Checksum     │  Hash of original data for integrity
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ AES-256-GCM Encrypt  │  Random 16-byte IV, conversation key
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ SCCA Packet Build    │  70-byte header + encrypted payload
└──────────────────────┘`}</CodeBlock>

            <SubTitle>Media API Endpoints</SubTitle>
            <Endpoint
              method="POST"
              path="/api/scca/media"
              description="Upload a file. The server encrypts it through the SCCA media pipeline and stores the encrypted blob."
            >
              <CodeBlock language="bash">{`# Upload a file (uses FormData)
curl -b cookies.txt \\
  -X POST https://your-scca-instance.com/api/scca/media \\
  -F "file=@photo.png" \\
  -F "conversationId=clx1234..." \\
  -F "messageSequence=2"

# Response:
{
  "id": "att_abc123",
  "originalName": "photo.png",
  "mimeType": "image/png",
  "originalSize": 485000,
  "encryptedSize": 485070,
  "compressionRatio": 1.0001,
  "compressionMethod": "none",
  "category": "image",
  "checksum": "a1b2c3..."
}`}</CodeBlock>
            </Endpoint>

            <Endpoint
              method="GET"
              path="/api/scca/media?conversationId=xxx"
              description="List all media attachments for a conversation with aggregate statistics."
            >
              <CodeBlock language="json">{`// Response: 200 OK
{
  "attachments": [
    {
      "id": "att_abc123",
      "originalName": "photo.png",
      "mimeType": "image/png",
      "originalSize": 485000,
      "encryptedSize": 485070,
      "category": "image",
      "createdAt": "2026-02-15T12:00:00.000Z"
    }
  ],
  "totals": {
    "count": 1,
    "originalBytes": 485000,
    "encryptedBytes": 485070,
    "avgCompressionRatio": 1.0001
  }
}`}</CodeBlock>
            </Endpoint>

            <Endpoint
              method="GET"
              path="/api/scca/media/[id]"
              description="Decrypt and return the original file with its original Content-Type."
            >
              <CodeBlock language="bash">{`# Download a decrypted file
curl -b cookies.txt \\
  https://your-scca-instance.com/api/scca/media/att_abc123 \\
  --output photo.png`}</CodeBlock>
            </Endpoint>

            <Endpoint
              method="DELETE"
              path="/api/scca/media/[id]"
              description="Permanently delete an encrypted media attachment."
            >
              <CodeBlock language="json">{`// Response: 200 OK
{ "deleted": true }`}</CodeBlock>
            </Endpoint>

            <SubTitle>JavaScript: Upload Media</SubTitle>
            <CodeBlock language="typescript">{`async function uploadMedia(
  file: File,
  conversationId: string,
  messageSequence: number
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("conversationId", conversationId);
  formData.append("messageSequence", String(messageSequence));

  const res = await fetch("/api/scca/media", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return res.json();
  // { id, originalName, mimeType, compressionRatio, ... }
}`}</CodeBlock>

            <div className="cyber-card p-5 mb-6 border-neon-purple/20">
              <div className="flex items-start gap-3">
                <span className="text-neon-purple text-sm mt-0.5">&#9656;</span>
                <div>
                  <span className="text-xs font-semibold text-neon-purple">Compression Strategy</span>
                  <p className="text-[11px] text-terminal-dim mt-1 leading-relaxed">
                    Already-compressed formats (PNG, JPEG, MP4, MP3) use <strong className="text-terminal-text">encrypt-only</strong> mode
                    with ~70 bytes overhead for the SCCA header. Attempting to re-compress these formats
                    would waste CPU cycles for zero savings. Text-based formats (SVG, JSON, Markdown, PDF)
                    use <strong className="text-terminal-text">zlib level 9</strong> before encryption, achieving 50-90% compression.
                    The pipeline automatically selects the right strategy based on MIME type.
                  </p>
                </div>
              </div>
            </div>

            {/* Crypto Engine */}
            <SectionTitle id="crypto">Crypto Engine</SectionTitle>
            <p className="text-sm text-terminal-dim leading-relaxed mb-4">
              All encryption is server-side. The master key never leaves server memory.
              Keys are derived on-demand via HKDF-SHA256 and never stored.
            </p>

            <SubTitle>Key Hierarchy</SubTitle>
            <CodeBlock language="text">{`MASTER_KEY_SECRET (env var, 32 bytes)
    │
    ├── HKDF("user-key", masterKey + userSalt) → User Key
    │       │
    │       ├── HKDF("conv-key", userKey + conversationId) → Conversation Key
    │       │       └── Used for AES-256-GCM encrypt/decrypt
    │       │
    │       └── HKDF("integrity", userKey + conversationId) → Integrity Key
    │               └── Used for Merkle tree HMAC
    │
    └── Never stored. Only in server memory.`}</CodeBlock>

            <SubTitle>Key Functions</SubTitle>
            <div className="space-y-3 mb-6">
              {[
                {
                  fn: 'getServerMasterKey(): Buffer',
                  desc: 'Returns the 32-byte master key from MASTER_KEY_SECRET env var.',
                },
                {
                  fn: 'deriveUserKey(masterKey, userSalt): Buffer',
                  desc: 'HKDF-SHA256: masterKey + userSalt → 32-byte user key.',
                },
                {
                  fn: 'deriveConversationKey(userKey, conversationId): Buffer',
                  desc: 'HKDF-SHA256: userKey + conversationId → 32-byte conversation key.',
                },
                {
                  fn: 'deriveIntegrityKey(userKey, conversationId): Buffer',
                  desc: 'HKDF-SHA256: userKey + conversationId + "integrity" → 32-byte integrity key.',
                },
              ].map((k) => (
                <div key={k.fn} className="cyber-card p-4">
                  <code className="text-xs text-neon-green">{k.fn}</code>
                  <p className="text-[11px] text-terminal-dim mt-1">{k.desc}</p>
                </div>
              ))}
            </div>

            <SubTitle>Merkle Tree Verification</SubTitle>
            <CodeBlock language="text">{`hash[0] = HMAC(integrityKey, token[0])
hash[1] = HMAC(integrityKey, hash[0] + token[1])
hash[2] = HMAC(integrityKey, hash[1] + token[2])
...
merkleRoot = hash[N-1]`}</CodeBlock>
            <p className="text-xs text-terminal-dim mb-4">
              If any token is modified, the entire Merkle root changes, detecting tampering.
            </p>

            <SubTitle>Security Properties</SubTitle>
            <div className="cyber-card overflow-hidden mb-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-cyber-light/20 bg-cyber-darker">
                    <th className="text-left p-3 text-terminal-dim tracking-wider uppercase">Property</th>
                    <th className="text-left p-3 text-terminal-dim tracking-wider uppercase">Guarantee</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Confidentiality', 'AES-256-GCM — computationally infeasible without key'],
                    ['Authenticity', 'GCM auth tag — tampering detected'],
                    ['Integrity', 'Merkle root — any modification detected'],
                    ['Key Isolation', 'Per-conversation keys via HKDF'],
                    ['Nonce Safety', 'Random 12-byte nonce per encryption'],
                  ].map(([prop, guarantee]) => (
                    <tr key={prop} className="border-b border-cyber-light/10">
                      <td className="p-3 text-neon-cyan font-semibold">{prop}</td>
                      <td className="p-3 text-terminal-dim">{guarantee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Binary Format */}
            <SectionTitle id="binary">Binary Message Format</SectionTitle>
            <p className="text-sm text-terminal-dim leading-relaxed mb-4">
              Each message is packed into a compact binary format before encryption.
              The 10-byte header can be read without decrypting (via{' '}
              <code className="text-neon-cyan">peekMessageHeader</code>).
            </p>

            <CodeBlock language="text">{`Binary layout of a packed message:
┌────────────────────────────────────────────────┐
│ Header (10 bytes)                              │
│  [version:1][role:1][sequence:2][timestamp:4]  │
│  [flags:2]                                     │
├────────────────────────────────────────────────┤
│ Nonce (12 bytes) - random, never reused        │
├────────────────────────────────────────────────┤
│ Ciphertext (variable)                          │
│  AES-256-GCM(conversationKey, nonce,           │
│    zlib.deflate(content))                      │
├────────────────────────────────────────────────┤
│ Auth Tag (16 bytes) - GCM authentication       │
└────────────────────────────────────────────────┘`}</CodeBlock>

            <SubTitle>Operations</SubTitle>
            <div className="cyber-card overflow-hidden mb-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-cyber-light/20 bg-cyber-darker">
                    <th className="text-left p-3 text-terminal-dim tracking-wider uppercase">Operation</th>
                    <th className="text-left p-3 text-terminal-dim tracking-wider uppercase">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['pack', 'Plaintext → binary header + zlib compress + AES encrypt → base64 token'],
                    ['unpack', 'Base64 token → AES decrypt + decompress → plaintext + metadata'],
                    ['append', 'Pack a new message and add to the conversation token array'],
                    ['truncate', 'Remove all tokens after a given sequence number'],
                    ['peek', 'Read the 10-byte header without decrypting content'],
                  ].map(([op, desc]) => (
                    <tr key={op} className="border-b border-cyber-light/10">
                      <td className="p-3">
                        <code className="text-neon-green">{op}</code>
                      </td>
                      <td className="p-3 text-terminal-dim">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubTitle>Role Values</SubTitle>
            <div className="cyber-card overflow-hidden mb-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-cyber-light/20 bg-cyber-darker">
                    <th className="text-left p-3 text-terminal-dim tracking-wider uppercase">Role</th>
                    <th className="text-left p-3 text-terminal-dim tracking-wider uppercase">Byte</th>
                    <th className="text-left p-3 text-terminal-dim tracking-wider uppercase">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['system', '0x00', 'System prompt / context message'],
                    ['user', '0x01', 'User-authored message'],
                    ['assistant', '0x02', 'AI-generated response'],
                  ].map(([role, byte, desc]) => (
                    <tr key={role} className="border-b border-cyber-light/10">
                      <td className="p-3 text-neon-cyan font-semibold">{role}</td>
                      <td className="p-3">
                        <code className="text-neon-green">{byte}</code>
                      </td>
                      <td className="p-3 text-terminal-dim">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vocabulary */}
            <SectionTitle id="vocabulary">Vocabulary</SectionTitle>
            <p className="text-sm text-terminal-dim leading-relaxed mb-4">
              These terms have exact, unambiguous meanings within SCCA.
            </p>

            <div className="space-y-3 mb-8">
              {[
                {
                  term: 'Destructive Edit',
                  def: 'Edit operation that permanently deletes all messages after the edit point and replaces the target message. Not reversible. Not a branch.',
                },
                {
                  term: 'Conversation Row',
                  def: 'A single PostgreSQL row containing the entire conversation: encrypted token array, metadata, and integrity hash. Not a collection of message rows.',
                },
                {
                  term: 'Master Key',
                  def: '32-byte server-side secret (MASTER_KEY_SECRET env var). Root of all key derivation. Never stored in the database.',
                },
                {
                  term: 'User Key',
                  def: 'Derived from master key + user salt via HKDF. Unique per user. Never stored anywhere.',
                },
                {
                  term: 'Conversation Key',
                  def: 'Derived from user key + conversation ID via HKDF. Used for AES-256-GCM encrypt/decrypt. Unique per conversation.',
                },
                {
                  term: 'Integrity Key',
                  def: 'Derived from user key + conversation ID + "integrity" context. Used only for Merkle tree HMAC, not encryption.',
                },
                {
                  term: 'Message Token',
                  def: 'Base64-encoded encrypted blob in the messageTokens array. Contains: header + compressed ciphertext + nonce + auth tag. Not a JWT.',
                },
                {
                  term: 'Binary Header',
                  def: 'First 10 bytes of a packed message: version, role, sequence, timestamp, flags. Readable without decryption.',
                },
                {
                  term: 'Merkle Root',
                  def: 'HMAC-SHA256 chain hash across all message tokens. One value for the entire conversation. Detects any tampering.',
                },
                {
                  term: 'Viewport',
                  def: 'A windowed subset of messages loaded by the client (e.g., messages 40-60 of 100). Enables efficient loading.',
                },
              ].map((v) => (
                <div key={v.term} className="cyber-card p-4">
                  <span className="text-xs font-semibold text-neon-cyan">{v.term}</span>
                  <p className="text-[11px] text-terminal-dim mt-1 leading-relaxed">{v.def}</p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-cyber-light/10 pt-6 mt-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="status-dot-active" />
                <span className="text-[10px] text-terminal-dim tracking-wider">
                  SCCA v1.0 — Open Source
                </span>
              </div>
              <Link
                href="/"
                className="text-xs text-terminal-dim hover:text-neon-cyan transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
