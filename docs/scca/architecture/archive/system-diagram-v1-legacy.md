# System Diagram — Legacy (v1, superseded)

> **Archived for comparison.** This is the pre-overhaul architecture, kept so the
> changes in [06-system-diagram.md](06-system-diagram.md) (current, verified
> against the codebase) are easy to see. Do not use this as implementation
> reference — several edges here were found to be inaccurate when checked
> against the source.

![Legacy system diagram](system-diagram-v1-legacy-1.png)

```mermaid
flowchart TD
    User([User])
    Polar["Polar.sh"]
    Groq["Groq AI"]

    subgraph Identity["Identity Access"]
        AuthPages["Auth Pages<br/>[page.tsx]"]
        AuthRoutes["Auth Routes<br/>[route.ts]"]
        AuthService["Auth Service<br/>[auth.ts]"]
    end

    subgraph Billing["Billing Commerce"]
        BillingAPI["Billing API<br/>[route.ts]"]
        PolarWebhook["Polar Webhook<br/>[route.ts]"]
    end

    subgraph Platform["Platform Services"]
        VaultAPI["Vault API<br/>[route.ts]"]
        UsageAPI["Usage Analytics<br/>[route.ts]"]
        APIKeys["API Keys<br/>[route.ts]"]
        AccountAPI["Account API<br/>[route.ts]"]
        MediaAPI["Media API<br/>[route.ts]"]
        RateLimits["Rate Limits<br/>[rate-limit.ts]"]
        MediaProcessor["Media Processor<br/>[processor.ts]"]
        PG[("PostgreSQL<br/>[prisma.ts]")]
    end

    subgraph UX["User Experience"]
        DashboardUI["Dashboard UI<br/>[page.tsx]"]
        ChatUI["Chat UI<br/>[SCCAChatArea.tsx]"]
    end

    subgraph SecureChat["Secure Chat"]
        ConvAPI["Conversation API<br/>[route.ts]"]
        MsgAPI["Message API<br/>[route.ts]"]
        Crypto["Crypto Engine<br/>[engine.ts]"]
        Store[("Conversation Store<br/>[client.ts]")]
        AIClient["AI Client<br/>[client.ts]"]
    end

    %% Identity Access
    User -->|signs in| AuthPages
    AuthPages -->|submits credentials| AuthRoutes
    AuthRoutes -->|uses auth| AuthService
    AuthService -->|reads accounts| PG

    %% User Experience
    User -->|opens workspace| DashboardUI
    DashboardUI -->|renders chat| ChatUI
    ChatUI -->|loads conversation| ConvAPI
    ChatUI -->|sends messages| MsgAPI

    %% Billing Commerce
    BillingAPI -->|starts checkout| Polar
    Polar -.->|sends events| PolarWebhook
    BillingAPI -->|reads billing| PG
    PolarWebhook -->|updates billing| PG

    %% Platform Services
    VaultAPI -->|records usage| UsageAPI
    VaultAPI -->|checks limits| RateLimits
    UsageAPI -->|checks tier| RateLimits
    UsageAPI -->|aggregates records| PG
    APIKeys -->|stores hashes| PG
    AccountAPI -->|updates account| PG
    MediaAPI -->|stores attachments| PG
    MediaAPI -->|encrypts media| MediaProcessor
    VaultAPI -->|encrypts data| Crypto
    VaultAPI -->|derives keys| Crypto

    %% Secure Chat
    ConvAPI -->|decrypts messages| Crypto
    ConvAPI -->|packs messages| Crypto
    ConvAPI -->|reads metadata| Store
    MsgAPI -->|stores tokens| Store
    MsgAPI -->|requests completion| AIClient
    AIClient -->|streams inference| Groq

    classDef identity fill:#ffe9b3,stroke:#d4a017,color:#1a1a1a
    classDef billing fill:#cdd8ff,stroke:#7a7ae8,color:#1a1a1a
    classDef platform fill:#ffd9d9,stroke:#d4577a,color:#1a1a1a
    classDef ui fill:#cde4ff,stroke:#5b8def,color:#1a1a1a
    classDef chat fill:#d2f8d2,stroke:#3aa655,color:#1a1a1a
    classDef external fill:#dbe9ff,stroke:#7aa5e8,color:#1a1a1a

    class AuthPages,AuthRoutes,AuthService identity
    class BillingAPI,PolarWebhook billing
    class VaultAPI,UsageAPI,APIKeys,AccountAPI,MediaAPI,RateLimits,MediaProcessor,PG platform
    class DashboardUI,ChatUI ui
    class ConvAPI,MsgAPI,Crypto,Store,AIClient chat
    class User,Polar,Groq external
```

## What changed in the overhaul (v1 → current)

- **Identity Access dissolved** — the standalone Auth Pages / Auth Routes / Auth
  Service grouping merged into **Access and Metering** (Authentication route +
  `lib/session.ts` Session Checks + `lib/api-key-auth.ts` API Key Auth).
- **Platform Services split** — metering concerns (keys, usage, rate limits) moved
  to **Access and Metering**; vault/media moved to **Extensions and Billing**.
- **Destructive Editing** (`conversations/[id]/edit/route.ts`) appeared as its own
  node in Chat and Encryption; regeneration moved there from the Message API.
- **Conversation Store renamed to Conversation Data Access** and became the only
  path by which encrypted tokens reach PostgreSQL (the v1 "Crypto Engine stores
  tokens" implication was removed).
- **API Client Hook (`useScca.ts`)** added — Chat UI turned out to be
  presentational; all API traffic goes through the hook.
- **Account API** was absorbed into session/account routes and no longer appears
  as a separate Platform Services node.
