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
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type Section =
  | 'overview'
  | 'quickstart'
  | 'vault'
  | 'integration'
  | 'api'
  | 'crypto'
  | 'binary'
  | 'vocabulary';

const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'quickstart', label: 'Quick Start', icon: ChevronRight },
  { id: 'vault', label: 'Vault API', icon: Server },
  { id: 'integration', label: 'Chat Integration', icon: Code },
  { id: 'api', label: 'API Reference', icon: FileCode },
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
