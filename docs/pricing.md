# Pricing

context-engine-ai is open source (MIT). The library is free forever — self-host it, embed it in your product, modify the source, no restrictions.

For teams that want managed infrastructure, we offer a hosted cloud API.

---

## Plans

| | **Open Source** | **Pro** | **Team** | **Enterprise** |
|---|---|---|---|---|
| **Price** | Free | $29/mo | $99/mo | Custom |
| Library (npm) | Yes | Yes | Yes | Yes |
| Self-hosted | Yes | Yes | Yes | Yes |
| Local TF-IDF embeddings | Yes | Yes | Yes | Yes |
| SQLite storage | Yes | Yes | Yes | Yes |
| PostgreSQL + pgvector | Bring your own | Managed | Managed | Dedicated |
| OpenAI embeddings | Bring your own key | Included | Included | Included |
| **Cloud API** | — | Yes | Yes | Yes |
| Events/month | Unlimited (self-hosted) | 50,000 | 500,000 | Unlimited |
| Context namespaces | 1 | 5 | Unlimited | Unlimited |
| API keys | — | 2 | 10 | Unlimited |
| Dashboard & analytics | — | Yes | Yes | Yes |
| Webhook streaming | — | — | Yes | Yes |
| SSO / SAML | — | — | Yes | Yes |
| Support | GitHub Issues | Email (48h) | Priority (24h) | Dedicated + SLA |
| On-premise deployment | — | — | — | Yes |

---

## FAQ

### Is the open-source version limited?

No. The npm package has every feature — SQLite, PostgreSQL, local embeddings, OpenAI embeddings, HTTP server, CLI, MCP server. Nothing is held back.

### What does the Cloud API give me?

A hosted endpoint (`https://api.context-engine.dev/v1`) so you don't have to run infrastructure. We manage the database, embeddings, scaling, and backups. You get an API key and a dashboard.

### Can I use context-engine-ai in a commercial product?

Yes. MIT license. No attribution required (though appreciated).

### What counts as an "event"?

Each call to `ingest()` or `POST /ingest` counts as one event. Deduplicated events (merges) count as one event total, not per merge.

### Do you offer annual pricing?

Yes — 2 months free on annual plans. Pro: $290/year. Team: $990/year.

### How do I get Enterprise pricing?

Email oneiro-dev@proton.me with your use case and expected event volume.

---

## Getting Started

**Open Source** — start now:
```bash
npm install context-engine-ai
```

**Cloud API** — sign up for early access:

Email **oneiro-dev@proton.me** with subject line "Cloud API Access" to join the waitlist. Early adopters get 3 months free on any paid plan.
