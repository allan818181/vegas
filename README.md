# Vegas Luxury Hotel — AI Concierge (Real Content)

Same working chat agent as the Cowork demo, now running as a standalone app
powered by Google Gemini's free API tier (no billing required), and grounded
in real data pulled from vegashotelonline.com (10 real suites, real prices in
Tsh, real hotel info). This is the version being deployed to Render.

Booking still isn't a live write — the real site requires guest sign-in to finalize
a reservation, and there's no public booking API yet. So instead of faking a
confirmation, the agent captures a **reservation request (lead)**: suite, dates,
price, guest name and contact — and logs it (currently to the server console via
`notifyStaff()` in `server.js`, see step 4 below for making that real).

## 1. Get a free Gemini API key

aistudio.google.com/apikey → sign in with a Google account → Create API key. No credit card needed.

## 2. Run it

```bash
cd booking-agent-demo
npm install
cp .env.example .env
```

Edit `.env`:
```
GEMINI_API_KEY=your-real-key-here
```

```bash
npm start
```

Open http://localhost:3000 — same chat widget, same reasoning quality you saw in
the Cowork demo, now running on your own infrastructure with your own key.

Try: "Do you have a Double Deluxe under 100,000 Tsh?", "What amenities come with
Suite 101?", "Can I book Suite 206 for 3 nights starting September 5th?"

See captured reservation requests at http://localhost:3000/api/leads

## 3. Get this onto the real site

1. **Embed the widget.** Copy `public/widget.js` + `public/style.css`'s chat
   widget block, and the chat bubble/window markup from `public/index.html`,
   into the real site's codebase (or serve them from your backend and add one
   `<script src="https://your-backend.com/widget.js"></script>` tag to every
   page, same pattern as tawk.to's snippet). Whoever maintains vegashotelonline.com
   needs to do this part, or grant you access to.
2. **Deploy the backend.** `server.js` needs to run somewhere reachable from the
   internet — Render, Railway, Fly.io, or a small VPS all work for this scale.
   Set `GEMINI_API_KEY` as an environment variable there (never commit it).
3. **Point the widget at your deployed backend** instead of `localhost:3000` —
   update the `fetch('/api/chat', ...)` URL in `widget.js` if the widget and
   backend aren't served from the same domain.

## 4. Make reservation requests actually reach staff

Right now `notifyStaff()` in `server.js` just logs to the console. Before this
goes live, wire it to something real:
- Email: `nodemailer` + a Gmail/SMTP account (vegasluxuryhotel@gmail.com is right there)
- WhatsApp: WhatsApp Business API, since guests already contact them via WhatsApp
- Or write to a simple database/spreadsheet staff can check

## 5. When real booking API access exists

If vegashotelonline.com's team gives you access to their real booking system
(however "Reserve Suite" + sign-in works under the hood), replace `create_lead`
in `server.js` with a real `create_booking` that calls it directly — same
pattern as before, only the function body changes. The AI logic, tool
structure, and chat widget don't need to change at all.

## What's real vs. still a placeholder

| Part | Status |
|---|---|
| AI conversation (Claude) | Real |
| Suite names, prices, amenities, hotel info | Real — pulled from vegashotelonline.com on 2026-08-14 |
| Availability | Assumed available (site doesn't expose real-time availability publicly) |
| Booking | Lead capture only — real site requires sign-in, no public booking API |
| Staff notification | Placeholder (console log) — needs wiring to email/WhatsApp/DB |
| Cancellation policy | Not published on the site — agent says so honestly rather than guessing |
