# /brag plan — SCCA v2.0

## Rubric

- **What is it?** An open-source AI chat platform where every message is AES-256-GCM encrypted at rest and a whole conversation lives in one database row.
- **Who is it for?** Developers building AI chat who don't want a plaintext pile of everyone's private conversations sitting in Postgres.
- **What sets it apart?** Single-row storage (1,000 messages in ~85 KB), per-conversation keys via HKDF-SHA256, a Merkle-HMAC integrity chain, and destructive editing: no branches, no ghost data.
- **Most impressive / funniest claim?** Edit message #5 and messages 6–N are permanently gone. The app literally warns you in red.
- **Visual hook:** A painfully private chat message typing out, then scrambling into the ciphertext the database actually stores.
- **Real UI to show:** The chat bubbles (cyan user / green SCCA), the `░▒▓█▓▒░` streaming wave with "generating...", the protocol badges, the red **Destructive Edit** confirmation card, the boot sequence lines, the logo.
- **Tone:** `default`, dressed in the product's own cyber-terminal identity. Punchy, clean, one dry joke (destructive editing).
- **Share caption:** "Your AI chat logs, as your database sees them: noise."

Honesty guardrail: SCCA is encryption **at rest**, not end-to-end (the README is explicit). No "zero-knowledge" or "E2E" anywhere.

## Visual identity (from `src/styles/globals.css` dark mode + `layout.tsx`)

- Background `#05070d`, cards `#0b0f1a`, elevated `#12172a`, border `rgba(148,163,184,.14)`
- Text `#e7eaf0` / secondary `#9aa3b4`
- Accents: cyan `#22d3ee` (user, keys), green `#34d399` (SCCA, status), red `#f87171` (destructive)
- Fonts: Inter (sans), JetBrains Mono (mono). Logo: `public/logo.jpg`.

## Storyboard — 1920×1080, 30fps, 22s

| # | Time | Scene | On screen | Motion / audio |
|---|---|---|---|---|
| 1 Hook | 0.0–3.5 | Private message → ciphertext | User bubble types "is it normal to cry at the dentist?" Label fades in: **What your database sees:** Bubble text scrambles into hex. | Typing clicks; glitch burst on the scramble (1.4s); bass drops in on the settle |
| 2 Reveal | 3.5–6.5 | Brand | Logo, **SCCA**, mono "SECURE COMPACT CHAT ARCHITECTURE", "Privacy-first AI chat. Encrypted at rest.", green "Encryption active" badge | Stagger-in, soft whoosh; full beat starts |
| 3 Highlight | 6.5–10.5 | The real chat | Chat UI: user asks, SCCA streams reply with the `░▒▓█▓▒░` wave. Caption: **Every message encrypted. Every conversation, its own key.** Protocol badges tick in. | Token ticks under the music |
| 4 Highlight | 10.5–14.5 | Single row | Message bubbles collapse into one Postgres row `conversations · 1 row`. Count-up: **1,000 messages → ~85 KB. One row.** | Riser → impact on "One row." |
| 5 Highlight / joke | 14.5–19.0 | Destructive edit | 8 numbered messages. Cursor clicks edit on #5 → real red **Destructive Edit** card → Confirm → 6–8 glitch out. Caption: **Edit #5. Messages 6–8? Gone.** then **No branches. No ghost data.** | Click, alarm-ish blip, glitch dissolve |
| 6 Outro | 19.0–22.0 | Boot sign-off | `> Merkle integrity chain verified` / `> System ready` then logo, **SCCA v2.0**, "Open source · MIT", `github.com/Vii-Hunnid/SCCA` | Final hit, tail out |

Scene sum: 3.5 + 3.0 + 4.0 + 4.0 + 4.5 + 3.0 = 22s. Every cut lands on a beat of the 120 BPM grid.

## Audio

An original score, synthesized for this video (no bundled track): dark, clean minimal synth at 120 BPM in A minor. Sub bass, soft kick, closed hats, a filtered pad; the SFX (typing ticks, glitch bursts, clicks, whoosh, impact) are pitched to A and put through the same reverb so they sit inside the mix. Beat grid is 0.5s, and scene cuts land on bars (every 2s) where the story allows.
