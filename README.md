# iFocus Notification Broadcast

A lightweight, client-side browser application designed to prepare and broadcast common notification updates to multiple WhatsApp recipients through WhatsApp Click-to-Chat, with full manual review and confirmation.

---

## Overview

**iFocus Notification Broadcast** is a secure, browser-based utility that empowers users and organizations to:

- Enter multiple WhatsApp mobile numbers in a comma-separated format.
- Compose a single common notification message.
- Automatically validate, clean, and deduplicate recipient numbers.
- Review recipient badges and message formatting in a confirmation dialog.
- Open each recipient sequentially in WhatsApp with the message pre-filled.
- Manually review, adjust if necessary, and send each message within the official WhatsApp interface.

---

## Features

Version 1.0 includes the following production capabilities:

- **Comma-Separated Recipient Input**: Enter one or many mobile numbers separated by commas, automatically ignoring extraneous commas and whitespace.
- **Intelligent Number Cleaning**: Non-destructively removes spaces, plus signs (`+`), hyphens (`-`), and parentheses (`()`) from entered numbers.
- **International Validation**: Verifies numbers contain digits only and adhere to the standard international length of 8 to 15 digits.
- **Automated Deduplication**: Detects and filters duplicate numbers, displaying an informational notice showing exactly how many duplicate entries were ignored.
- **Input Safeguards**:
  - Maximum of **50 unique valid recipients** per broadcast session.
  - Maximum of **2,000 characters** per broadcast message with a real-time counter (`X / 2000 characters`).
  - Mandatory consent acknowledgement checkbox confirming recipient agreement prior to broadcast.
  - Non-destructive input validation (never silently truncates message drafts).
- **Comprehensive Validation Messaging**: Clear inline error messages for missing numbers, missing messages, unchecked consent, invalid numbers, duplicate entries, and exceeded limits.
- **Pre-Broadcast Confirmation Modal**: Displays all cleaned unique recipient chips, recipient count, formatted message preview, and pre-flight notices.
- **Sequential Recipient Queue**: One-recipient-at-a-time workflow with prominent "Open in WhatsApp" and "Open Next Recipient" buttons.
- **Official Click-to-Chat Integration**: Formulates standard `https://wa.me/<number>?text=<encoded>` URLs with full support for newlines, punctuation, and Unicode emojis.
- **Browser Popup Blocker Detection**: Gracefully detects if browser popup blockers prevent WhatsApp from opening and informs the user without false queue progression.
- **Progress Tracking & Visual Badges**: Visual indicators for `Pending`, `← Current`, and `✓ Opened` recipients, accompanied by summary counters and a progress bar.
- **Completion Summary**: Congratulatory session banner displaying total recipients processed and opened.
- **Home Navigation & Data Loss Prevention**: Top-left Home button to reset and start fresh, with a protective warning modal if clicked while a broadcast is in progress with recipients remaining.
- **Zero Backend Architecture**: Runs 100% in the client browser with no external server, database, or cookie dependencies.

---

## How It Works

The broadcast workflow follows a strictly manual, step-by-step confirmation process:

Recipients  
→ Validation  
→ Message  
→ Consent Acknowledgement  
→ Confirmation  
→ Recipient Queue  
→ WhatsApp Click-to-Chat  
→ Manual Send  
→ Next Recipient

1. **Recipients**: Enter one or more WhatsApp mobile numbers (comma-separated).
2. **Validation**: Numbers are non-destructively cleaned, validated against international phone standards (8–15 digits), and deduplicated.
3. **Message**: Compose a notification message (up to 2,000 characters) with real-time character counting.
4. **Consent Acknowledgement**: Confirm that recipients expect or have agreed to receive the notification.
5. **Confirmation**: Review the cleaned recipient chips and formatted message preview in a modal dialog.
6. **Recipient Queue**: A sequential queue manages recipients with status badges (`Pending`, `Current`, `Opened`).
7. **WhatsApp Click-to-Chat**: For each recipient, clicking "Open in WhatsApp" generates the official `https://wa.me/<number>?text=<encoded>` URL and opens WhatsApp in a new tab.
8. **Manual Send**: The user manually reviews the pre-filled message inside WhatsApp and clicks Send.
9. **Next Recipient**: The user returns to the queue and opens the next recipient in line until all recipients have been processed.

---

## Technology

- **HTML**: Accessible, semantic page structure and dialogs.
- **CSS**: Modern responsive styling with custom properties, flexbox/grid layout, smooth animations, and mobile-friendly touch targets.
- **Vanilla JavaScript**: Modular, zero-dependency client-side architecture.
- **WhatsApp Click-to-Chat**: Official deep-linking protocol (`https://wa.me/`).

No backend or database is required.

---

## Privacy

- **Local Processing**: Recipient numbers and message content are processed locally by this application and are not intentionally stored or sent to an application backend.
- **Direct WhatsApp Handoff**: When you choose Open in WhatsApp, the selected recipient and message are passed to WhatsApp to prepare the conversation through the standard Click-to-Chat URL (`https://wa.me/`).
- **Zero Persistence & Telemetry**: No recipient data or messages are saved to cookies, localStorage, IndexedDB, application databases, or remote logging services. When the page is refreshed or a new session is started, all memory state is discarded.

---

## Important Limitation

**The application does not automatically send WhatsApp messages. Users manually confirm/send messages inside WhatsApp.**

This application is an interactive preparation tool that prepares messages and opens individual WhatsApp chats via official Click-to-Chat links. The user retains complete control at all times and must manually review and click "Send" within the WhatsApp interface for each message.

This application is not an official WhatsApp or Meta product. It is an independent utility and is not affiliated with, sponsored by, or endorsed by WhatsApp LLC or Meta Platforms, Inc.

---

## Responsible Usage

**Responsible use:** This tool is intended for legitimate communication only. Please contact only recipients who expect or have agreed to receive your messages.

Users must:
- Only contact recipients who expect or have consented to receive your messages.
- Comply with all applicable local telecommunication laws, privacy regulations, and the [WhatsApp Terms of Service](https://www.whatsapp.com/legal/).
- Adhere to the 50-recipient session limit to avoid unsolicited, repetitive, or spam notifications.

---

## Running Locally

Because the project is entirely static, you can run it using any simple HTTP server or directly in your browser:

### Option 1: Using Python (Recommended)
```bash
# Navigate to the project directory
cd "path/to/iFocus Broadcast"

# Start a local web server on port 8080
python -m http.server 8080
```
Open your browser and navigate to: `http://localhost:8080`

### Option 2: Using Node.js (http-server / serve)
```bash
npx serve .
```

### Option 3: Direct Browser Launch
You can also open `index.html` directly in modern web browsers (Chrome, Edge, Firefox, Safari).

---

## Deployment

The application is fully static and ready for instant deployment on any static hosting platform:

- **GitHub Pages**: Push the repository to GitHub, go to **Settings > Pages**, select the `main` branch root, and click **Save**.
- **Cloudflare Pages / Vercel / Netlify**: Connect your Git repository and deploy with default static settings (no build command required).

---

## Version

**Version 1.0** (Production Release)
