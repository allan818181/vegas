// Real-content AI concierge for Vegas Luxury Hotel (vegashotelonline.com).
// Powered by Google Gemini's free API tier (no billing required) instead of
// the Claude API, per request. Rooms/prices/amenities are REAL data pulled
// from the live site. Booking is a "lead capture" flow, not a live write,
// because the real site gates reservations behind guest sign-in and has no
// public booking API yet. Once that access exists, swap create_lead for a
// real create_booking call.

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const rooms = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/rooms.json'), 'utf8'));
const policies = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/policies.json'), 'utf8'));
const leads = []; // in-memory; real version should write to a DB and notify staff

// ---- Tool implementations ----
function search_rooms({ guests, room_type }) {
  let results = rooms.filter(r => r.available);
  if (guests) results = results.filter(r => r.max_guests >= guests);
  if (room_type) results = results.filter(r => r.type.toLowerCase() === room_type.toLowerCase());
  return results;
}

function get_room_details({ room_id }) {
  const room = rooms.find(r => r.id === room_id);
  return room || { error: `No suite found with id ${room_id}` };
}

function check_price({ room_id, check_in, check_out }) {
  const room = rooms.find(r => r.id === room_id);
  if (!room) return { error: `No suite found with id ${room_id}` };
  const nights = nightsBetween(check_in, check_out);
  if (nights === null) return { error: 'Invalid check_in/check_out dates' };
  return { room_id, nights, price_per_night_tsh: room.price_per_night_tsh, total_tsh: nights * room.price_per_night_tsh };
}

function create_lead({ room_id, check_in, check_out, guest_name, guest_contact, guests }) {
  const room = rooms.find(r => r.id === room_id);
  if (!room) return { error: `No suite found with id ${room_id}` };
  const nights = nightsBetween(check_in, check_out);
  if (nights === null) return { error: 'Invalid check_in/check_out dates' };

  const ref = 'REQ-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const lead = {
    ref, room_id, suite: room.suite, check_in, check_out, nights,
    total_tsh: nights * room.price_per_night_tsh,
    guest_name, guest_contact, guests,
    created_at: new Date().toISOString()
  };
  leads.push(lead);
  notifyStaff(lead); // TODO: replace with real email/WhatsApp/CRM notification
  return lead;
}

function notifyStaff(lead) {
  console.log('NEW RESERVATION REQUEST:', JSON.stringify(lead, null, 2));
}

function get_hotel_info({ topic }) {
  if (!topic || topic === 'all') return policies;
  return { [topic]: policies[topic] ?? 'Not published on the site — check with the team.' };
}

function nightsBetween(checkIn, checkOut) {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  if (isNaN(a) || isNaN(b)) return null;
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

const TOOL_IMPL = { search_rooms, get_room_details, check_price, create_lead, get_hotel_info };

// Gemini's function-declaration schema uses uppercase OpenAPI-style types.
const TOOLS = [
  {
    name: 'search_rooms',
    description: 'Search available suites, optionally filtered by guest count and/or room type (Executive Suite, Double Deluxe).',
    parameters: {
      type: 'OBJECT',
      properties: {
        guests: { type: 'INTEGER' },
        room_type: { type: 'STRING', enum: ['Executive Suite', 'Double Deluxe'] }
      }
    }
  },
  {
    name: 'get_room_details',
    description: 'Get full details for a specific suite by its id (e.g. RM-101).',
    parameters: { type: 'OBJECT', properties: { room_id: { type: 'STRING' } }, required: ['room_id'] }
  },
  {
    name: 'check_price',
    description: 'Calculate the total price (in Tsh) for a suite across a date range.',
    parameters: {
      type: 'OBJECT',
      properties: { room_id: { type: 'STRING' }, check_in: { type: 'STRING' }, check_out: { type: 'STRING' } },
      required: ['room_id', 'check_in', 'check_out']
    }
  },
  {
    name: 'create_lead',
    description: 'Log a reservation REQUEST for staff follow-up (not a confirmed booking — the real site requires guest sign-in to finalize). Call only after the guest has confirmed suite, dates, price, and given name and contact info.',
    parameters: {
      type: 'OBJECT',
      properties: {
        room_id: { type: 'STRING' },
        check_in: { type: 'STRING' },
        check_out: { type: 'STRING' },
        guest_name: { type: 'STRING' },
        guest_contact: { type: 'STRING', description: 'Phone or email' },
        guests: { type: 'INTEGER' }
      },
      required: ['room_id', 'check_in', 'check_out', 'guest_name', 'guest_contact', 'guests']
    }
  },
  {
    name: 'get_hotel_info',
    description: 'Look up real hotel info: property/location, stars, hours, contact, amenities, cancellation, booking_flow, or "all".',
    parameters: { type: 'OBJECT', properties: { topic: { type: 'STRING' } } }
  }
];

const SYSTEM_PROMPT = `You are the AI concierge for "Vegas Luxury Hotel", a real 3-star hotel in Dar es Salaam, Tanzania (vegashotelonline.com).
Reply the way a warm, professional concierge would: concise, welcoming, never robotic or listy.

Rules:
- Never invent suite names, prices, amenities, or policies — always use the tools to get real data.
- Prices are in Tanzanian Shillings (Tsh) — always show the currency.
- Proactively recommend specific suites matching what the guest describes.
- The real site requires guest sign-in to complete a booking, and there is no public booking-write API yet. So never claim to have "confirmed" a booking. Instead: confirm suite, dates, and total price with the guest, collect their name and a contact (phone or email), then call create_lead. Tell them a team member will follow up to finalize, or they can complete it directly by signing in on vegashotelonline.com.
- If asked something not covered by your tools (cancellation specifics, complaints, disputes), say you'll connect them with the team and give the real contact info from get_hotel_info rather than guessing.
- Keep replies short and conversational.`;

app.post('/api/chat', async (req, res) => {
  if (!API_KEY) return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it to your .env file.' });
  try {
    const { messages } = req.body; // client sends full running history in Gemini {role, parts} format
    const updated = await runAgentTurn(messages);
    res.json({ messages: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Something went wrong' });
  }
});

async function runAgentTurn(messages) {
  let convo = [...messages];

  for (let i = 0; i < 6; i++) { // safety cap on tool-call round trips
    const response = await callGemini(convo);
    const candidate = response.candidates && response.candidates[0];
    if (!candidate) throw new Error('No response from Gemini');

    const parts = candidate.content.parts || [];
    const functionCalls = parts.filter(p => p.functionCall);

    convo.push({ role: 'model', parts });

    if (functionCalls.length === 0) {
      return convo; // model gave a final text reply
    }

    // Execute each requested tool call, then feed results back.
    // Include the call's id when present so parallel tool calls line up correctly.
    const responseParts = functionCalls.map(fc => {
      const { name, args, id } = fc.functionCall;
      const fn = TOOL_IMPL[name];
      let result;
      try { result = fn ? fn(args || {}) : { error: `Unknown tool ${name}` }; }
      catch (e) { result = { error: e.message }; }
      return { functionResponse: { id, name, response: { result } } };
    });
    convo.push({ role: 'user', parts: responseParts });
  }

  convo.push({ role: 'model', parts: [{ text: "Let me get a team member to help with that." }] });
  return convo;
}

async function callGemini(contents) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let resp;
  try {
    resp = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        tools: [{ function_declarations: TOOLS }]
      }),
      signal: controller.signal
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Gemini API request timed out after 30s.');
    throw new Error(`Could not reach Gemini API: ${e.message}`);
  } finally { clearTimeout(timeout); }
  if (!resp.ok) { const text = await resp.text(); throw new Error(`Gemini API error ${resp.status}: ${text}`); }
  return resp.json();
}

app.get('/api/leads', (req, res) => res.json(leads));
app.get('/api/rooms', (req, res) => res.json(rooms));

app.listen(PORT, () => {
  console.log(`Vegas Luxury concierge demo running at http://localhost:${PORT}`);
  if (!API_KEY) console.warn('WARNING: GEMINI_API_KEY not set — chat will fail until you add it to .env');
});
