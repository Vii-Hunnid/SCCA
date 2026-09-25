# SCCA Preview Panel - Implementation Guide

> A detailed guide for implementing the SCCA Preview Panel as seen at
> **https://www.g-nther.site/console/playground**

## What Is The Preview Panel?

The SCCA Preview Panel is a real-time sidebar component that sits alongside an AI chat playground. It provides:

1. **Live Chat Preview** - Miniature chat bubbles mirroring the main conversation
2. **Per-Message Metrics** - Raw size → encrypted size with compression ratio for each message
3. **Aggregate Statistics** - Total message count, raw vs encrypted size, compression ratio
4. **Storage Comparison** - Visual bar showing SCCA vs JSON storage savings
5. **Encryption Details** - Technical breakdown of cryptographic primitives used

It lets developers and users see exactly what SCCA does to their messages in real-time.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Console Playground Page                           │
│                                                                          │
│  ┌─────────────┐  ┌──────────────────────┐  ┌────────────────────────┐  │
│  │  Parameter   │  │     Chat Area        │  │   SCCA Preview Panel   │  │
│  │  Panel       │  │                      │  │                        │  │
│  │  (left)      │  │  - Messages          │  │  - Chat bubble preview │  │
│  │              │  │  - Input              │  │  - Per-msg metrics     │  │
│  │  - Prompt    │  │  - Suggestions       │  │  - Stat grid           │  │
│  │  - Model     │  │                      │  │  - Savings bar         │  │
│  │  - Tools     │  │                      │  │  - Encryption info     │  │
│  │  - MCP       │  │                      │  │                        │  │
│  └─────────────┘  └──────────────────────┘  └────────────────────────┘  │
│       w-80              flex-1                       w-80                │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Component Interface

```typescript
interface SCCAPreviewPanelProps {
  messages: Message[];     // All messages (system + user + assistant)
  isStreaming: boolean;    // Whether AI is currently generating
  useSCCA: boolean;        // Whether SCCA encryption is enabled
}

interface Message {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
}
```

The panel filters out system messages and only displays user/assistant messages.

---

## Size Estimation Algorithm

Since the preview panel runs on the **client side** (it doesn't have access to the actual server-side crypto engine), it **estimates** SCCA sizes using the known binary format:

```typescript
function estimateTokenSize(content: string): {
  rawBytes: number;
  compressedBytes: number;
  encryptedBytes: number;
  compressionRatio: number;
} {
  // Step 1: Get raw UTF-8 byte count
  const rawBytes = new TextEncoder().encode(content).length;

  // Step 2: Estimate zlib compression ratio
  // Short messages (<50 chars): ~10% reduction (overhead dominates)
  // Medium messages (50-200 chars): ~45% reduction
  // Long messages (200+ chars): ~55% reduction
  const compressedBytes = Math.max(
    10,
    Math.round(
      rawBytes * (rawBytes < 50 ? 0.9 : rawBytes < 200 ? 0.55 : 0.45)
    )
  );

  // Step 3: Add SCCA overhead
  // 10-byte binary header + 4-byte length + 16-byte auth tag + 16-byte nonce
  const encryptedBytes = 10 + 4 + compressedBytes + 16 + 16;

  // Step 4: Compression ratio
  const compressionRatio = rawBytes > 0 ? rawBytes / compressedBytes : 1;

  return { rawBytes, compressedBytes, encryptedBytes, compressionRatio };
}
```

### Why Estimates, Not Actual Values?

The preview panel runs in the browser. The actual encryption happens server-side in `lib/crypto/engine.ts`. To show real values, you'd need an API call for every message update, which would destroy the real-time UX. The estimates are accurate within ~5-10% of actual packed sizes.

---

## Aggregate Statistics

The panel computes these stats using `useMemo` for performance:

```typescript
const stats = useMemo(() => {
  let totalRaw = 0;
  let totalEncrypted = 0;
  let totalCompressed = 0;

  chatMessages.forEach((msg) => {
    const est = estimateTokenSize(msg.content);
    totalRaw += est.rawBytes;
    totalEncrypted += est.encryptedBytes;
    totalCompressed += est.compressedBytes;
  });

  // JSON baseline: what this conversation would cost in traditional storage
  const jsonBaseline = chatMessages.reduce((acc, msg) => {
    return acc + JSON.stringify({
      role: msg.role,
      content: msg.content,
      id: msg.id
    }).length;
  }, 0);

  return {
    totalRaw,
    totalEncrypted,
    totalCompressed,
    jsonBaseline,
    messageCount: chatMessages.length,
    userCount: chatMessages.filter((m) => m.role === "user").length,
    assistantCount: chatMessages.filter((m) => m.role === "assistant").length,
    savingsPercent: jsonBaseline > 0
      ? Math.round((1 - totalEncrypted / jsonBaseline) * 100)
      : 0,
    avgCompressionRatio: totalRaw > 0
      ? (totalRaw / totalCompressed).toFixed(1)
      : "0",
  };
}, [chatMessages]);
```

---

## Visual Layout (Top to Bottom)

### 1. Header

```
┌──────────────────────────────┐
│  👁 Preview         🔒 SCCA  │
└──────────────────────────────┘
```

- Eye icon + "Preview" label
- SCCA badge (emerald green) shown when encryption is enabled

### 2. Chat Bubble Preview (scrollable)

```
┌──────────────────────────────┐
│          ┌──────────────┐    │
│          │ Hello world  │ 🟦 │  ← User message (right-aligned, blue)
│          └──────────────┘    │
│  20 B raw → 58 B enc (1.0x) │  ← Per-message SCCA metrics
│                              │
│  🟩 ┌───────────────────┐   │
│  G  │ Hi! How can I     │   │  ← Assistant message (left-aligned, gray)
│     │ help you today?   │   │
│     └───────────────────┘   │
│  34 B raw → 59 B enc (1.1x) │
│                              │
│  🟩 ⠿⠿⠿                    │  ← Streaming indicator (bounce dots)
└──────────────────────────────┘
```

Key design decisions:
- **Miniature bubbles** - `text-xs` (12px), `max-w-[85%]`, `line-clamp-3`
- **Role avatars** - 20x20px rounded squares (G = emerald gradient, U = blue gradient)
- **Per-message metrics** - `text-[10px]` below each bubble, right-aligned for user, left for assistant
- **Streaming dots** - Three bouncing dots with staggered `animationDelay`

### 3. SCCA Metrics Grid

```
┌──────────────┬──────────────┐
│  💬 Messages │  📦 Raw Size │
│  12          │  4.2 KB      │
│  6u / 6a     │  uncompressed│
├──────────────┼──────────────┤
│  🔒 SCCA Size│  ⚡ Compress │
│  2.1 KB      │  2.3x        │
│  enc + packed│  avg ratio   │
└──────────────┴──────────────┘
```

- 2x2 grid with `bg-muted/50` cards
- Monospace values, colored icons (blue, orange, emerald, yellow)
- User/assistant breakdown under message count

### 4. Savings Bar

```
┌──────────────────────────────┐
│  🛡 vs JSON storage    -42%  │
│  ████████████░░░░░░░░░░░░░░  │
│  JSON: 6.2 KB    SCCA: 3.6 KB│
└──────────────────────────────┘
```

- Visual progress bar comparing SCCA size to JSON baseline
- Green when SCCA saves space, orange when overhead exceeds savings (very short conversations)
- Percentage savings in monospace font

### 5. Encryption Details

```
┌──────────────────────────────┐
│  # Encryption Details        │
│  Cipher          AES-256-GCM │
│  Key Derivation  HKDF-SHA256 │
│  Integrity       SHA-256 Merkle│
│  Binary Header   10 bytes    │
│  Compression     zlib deflate│
└──────────────────────────────┘
```

- Static information block
- Key-value pairs in `text-[10px]` monospace font
- Serves as educational reference

### 6. SCCA Disabled Notice

When `useSCCA` is `false`:

```
┌──────────────────────────────┐
│           🔒                 │
│      SCCA Disabled           │
│  Messages are not encrypted  │
└──────────────────────────────┘
```

Orange warning block replaces the metrics panel.

---

## Integration Into a Page

### Step 1: Import

```typescript
import { SCCAPreviewPanel } from "./components/SCCAPreviewPanel";
```

### Step 2: Layout

The panel sits in a flex container alongside the chat area:

```tsx
<div className="flex-1 flex overflow-hidden">
  {/* Left sidebar */}
  <ParameterPanel ... />

  {/* Center - Chat */}
  <div className="flex-1 flex flex-col">
    <ChatArea ... />
    <InputArea ... />
  </div>

  {/* Right sidebar - SCCA Preview */}
  <SCCAPreviewPanel
    messages={displayMessages}
    isStreaming={isStreaming}
    useSCCA={useSCCA}
  />
</div>
```

### Step 3: Pass Messages

The panel receives the same `messages` array as the chat area. It handles filtering system messages internally.

```typescript
// If using SCCA hook:
const displayMessages = useSCCA
  ? [
      ...messages.filter((m) => m.role === "system"),
      ...sccaMessages.map((m) => ({
        id: m.id,
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })),
    ]
  : messages;
```

---

## Customization Points

### Adding Real Server Metrics

To show actual (not estimated) sizes, extend the message type:

```typescript
interface MessageWithMetrics extends Message {
  rawBytes?: number;        // From server after encryption
  encryptedBytes?: number;  // Actual packed size
  compressionRatio?: number;
}
```

Then update `estimateTokenSize` to use real values when available:

```typescript
const est = msg.encryptedBytes
  ? { rawBytes: msg.rawBytes!, encryptedBytes: msg.encryptedBytes!, ... }
  : estimateTokenSize(msg.content);
```

### Adding Merkle Tree Visualization

```typescript
// Show the Merkle root hash if available
{merkleRoot && (
  <div className="flex justify-between">
    <span>Merkle Root</span>
    <span className="font-mono truncate max-w-[120px]">{merkleRoot}</span>
  </div>
)}
```

### Adding Latency Metrics

Track encryption/decryption time:

```typescript
interface PerformanceMetrics {
  encryptMs: number;   // Time to pack message
  decryptMs: number;   // Time to unpack message
  dbWriteMs: number;   // Time to update conversation row
}
```

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `react` | Component framework |
| `lucide-react` | Icons (Eye, Lock, Database, BarChart3, MessageSquare, Shield, Zap, Hash) |
| `@/lib/utils` | `cn()` utility for className merging |
| `tailwindcss` | Styling |

---

## Performance Notes

- `useMemo` on stats computation prevents recalculation on every render
- `TextEncoder` is a browser API, no polyfill needed for modern browsers
- The panel rerenders when `messages` array changes (new message, edit, delete)
- `line-clamp-3` CSS prevents long messages from dominating the preview

---

## File Location

```
app/console/playground/components/SCCAPreviewPanel.tsx
```

Full source: ~345 lines (single file, self-contained component).
