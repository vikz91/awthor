# Hosted Awthor TODO

This checklist applies only to Awthor's optional hosted sync, remote MCP, and
unlisted publishing features. Local-first writing must remain free, private by
default, and fully usable without an account.

## Hosted beta access

- [ ] Make hosted cloud access invite-only at first.
- [ ] Add a Clerk-backed `hostedAccess` entitlement for Sync and remote MCP.
- [ ] Add a separate `publisher` entitlement; signing in or syncing must not
      automatically grant publishing rights.
- [ ] Keep the local app, local exports, imports, and page-scoped WebMCP tools
      available without either entitlement.

## Publishing and content policy

- [ ] Require a per-story content declaration before publishing: `General` or
      `Mature`.
- [ ] Require acceptance of hosted-feature terms and the content policy before
      the first cloud upload or publication; record the policy version and
      acceptance time.
- [ ] Define prohibited content and an abuse/takedown contact path before
      opening access beyond invited users.
- [ ] Add an administrator unpublish/disable control and retain a minimal
      publication audit trail.
- [ ] Keep public stories unlisted and `noindex`; do not add profiles,
      discovery, comments, likes, or a public directory without a separate
      moderation plan.

## Server-enforced resource limits

- [ ] Enforce per-user limits in the server and MongoDB service, not just the
      interface:
  - [ ] Total synced workspace size.
  - [ ] Books and chapters per account.
  - [ ] Maximum manuscript bytes per book and chapter.
  - [ ] Import archive size and remote-MCP request batch size.
  - [ ] Active published stories per user.
- [ ] Return clear, actionable limit errors from Sync, remote MCP, imports, and
      publishing.
- [ ] Track aggregate usage so limits do not require scanning every manuscript
      record on each request.

## Rate limiting and abuse prevention

- [ ] Rate-limit sync pushes, remote-MCP mutations, imports, and account-bound
      writes by both Clerk user ID and IP address.
- [ ] Use a tighter, independent limit for publish, republish, and unpublish
      actions.
- [ ] Add CAPTCHA or equivalent bot protection to hosted account/onboarding
      entry points before public signup is enabled.
- [ ] Log structured security and quota events without storing manuscript text
      in logs.
- [ ] Add operational monitoring and alerts for unexpected MongoDB growth,
      repeated failures, and suspicious publishing patterns.

## Privacy and media boundaries

- [ ] Make author email visibility on a public story an explicit, per-story
      opt-in; never publish it merely because it exists in the author profile.
- [ ] Limit remote cover and Markdown-image URL count and size. Plan a
      server-side image proxy/cache before public publishing scales.
- [ ] Clearly disclose that externally hosted images can receive reader
      requests until a proxy is available.
- [ ] Preserve local export and local-data deletion options regardless of
      hosted-account or publishing status.

## Recommended delivery order

1. Invite-only hosted access and a separate publisher entitlement.
2. Server-side quotas, rate limits, and publication audit controls.
3. Hosted-feature terms, content declaration, and report/takedown process.
4. Admin moderation controls and usage monitoring.
5. Public-media hardening and an image proxy/cache.
