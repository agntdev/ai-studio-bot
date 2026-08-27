# AI Studio Service Bot — Bot specification

**Archetype:** custom

**Voice:** professional and persuasive — write every user-facing message, button label, error, and empty state in this voice.

Telegram bot for AI Studio to showcase AI content creation services (AI-photos, AI-videos, brand advertising), display pricing, and collect client applications. Submits applications to admin chat for processing.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Small and medium businesses
- Brands
- Marketers

## Success criteria

- Applications collected and forwarded to admin chat
- Correct form submission with all required fields
- Pricing displayed as specified

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu
- **📸 AI-фото** (button, actor: user, callback: service:ai_photo) — Show AI photo service description
- **🎬 AI-видео** (button, actor: user, callback: service:ai_video) — Show AI video service description
- **📢 Реклама для брендов** (button, actor: user, callback: service:advertising) — Show advertising service description
- **💰 Прайс** (button, actor: user, callback: price:show) — Display pricing cards
- **📝 Оставить заявку** (button, actor: user, callback: application:start) — Begin application form
- **📞 Связаться** (button, actor: user, callback: contact:show) — Show company contacts

## Flows

### main_menu
_Trigger:_ /start

1. Show main menu buttons
2. Handle button selections

_Data touched:_ service, price_point

### service_description
_Trigger:_ service:ai_photo|service:ai_video|service:advertising

1. Show service description
2. Display 'Оставить заявку' and 'Назад' buttons

_Data touched:_ service

### price_display
_Trigger:_ price:show

1. Show 6 pricing cards with icons
2. Allow return to menu

_Data touched:_ price_point

### application_form
_Trigger:_ application:start

1. Select service type
2. Enter text requirements
3. Confirm material availability
4. Provide contact info
5. Submit and confirm

_Data touched:_ application

### admin_notification
_Trigger:_ application:submitted

1. Format application data
2. Forward to ADMIN_CHAT_ID with metadata

_Data touched:_ application

## Owner-supplied settings

The OWNER provides these; they are collected in chat and injected into the environment at deploy. Read each one from the environment where it is used (`ctx.env.<KEY>` / `env.<KEY>` on Cloudflare Workers; `process.env.<KEY>` only as a Node/harness fallback — never the sole read). Do NOT invent your own way of learning the value, do NOT ask for it in a bot message, and do NOT hardcode a default.

- **ADMIN_CHAT_ID** — Telegram chat ID for receiving new applications
  - this is the OWNER's own chat id; the platform already knows it. Read `ADMIN_CHAT_ID` via `ctx.env` (prefer toolkit `adminChatId` / `requireOwner`) — never ask a user, never treat whoever writes first as the admin, never invent claim-admin or open manage for everyone.
  - may be UNSET at runtime: the bot must still start, and the feature needing ADMIN_CHAT_ID must say so plainly instead of failing.

Your behavioral specs run WITHOUT these values, so no spec may depend on one.

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

An entity that merely NAMES an owner-supplied setting above (an admin chat, an API account) is not something to store or discover — read it from the environment.

- **service** _(retention: persistent)_ — Available AI content creation services
  - fields: name, icon, description
- **price_point** _(retention: persistent)_ — Pricing information for services
  - fields: service, title, description, price_range
- **application** _(retention: persistent)_ — Client application with requirements and contact info
  - fields: service_type, requirements_text, has_materials, contact_info, timestamp, chat_id, attachments

## Integrations

- **Telegram** (required) — Bot API messaging and admin notifications
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- ADMIN_CHAT_ID

## Notifications

- Forward complete applications to ADMIN_CHAT_ID with metadata

## Permissions & privacy

- Collect only necessary contact info (phone or @username)
- Store applications temporarily until delivery

## Edge cases

- Users without available materials
- Incomplete form submissions
- Large file attachments

## Required tests

- End-to-end application submission flow
- Admin notification delivery verification
- Pricing display accuracy

## Assumptions

- Admin will process applications from single chat
- Russian language interface by default
- No payment integration needed initially
