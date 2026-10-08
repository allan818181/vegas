<h1 align="center">Vegas Hotel AI Concierge</h1>

<p align="center"><b>An AI chat concierge for a real Dar es Salaam hotel, grounded in its actual suites, prices and policies.</b></p>

<p align="center">![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black) ![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white) ![Gemini API](https://img.shields.io/badge/Gemini%20API-8E75B2?logo=googlegemini&logoColor=white)</p>

## Overview

AI hotel concierge chat widget (Node.js + Express + Google Gemini) grounded in real suite, price and policy data; captures reservation requests as staff leads.

## Features

- Embeddable chat widget (`public/widget.js`) for the hotel website
- Answers grounded in real data: 10 suites with prices in TSh and hotel policies (`data/*.json`), so it does not invent facts
- Captures reservation requests (suite, dates, guest contact) as leads for staff instead of faking bookings
- Runs on Google Gemini's free API tier; API key kept in `.env`

## Tech stack

JavaScript · Node.js · Express · Gemini API

## Getting started

```bash
npm install
echo "GEMINI_API_KEY=your-key" > .env   # free key: aistudio.google.com/apikey
node server.js                         # http://localhost:3000
```

## Project structure

`server.js` Express API + Gemini calls · `data/` rooms and policies · `public/` widget and demo page

---

<p align="center">Built by <a href="https://github.com/allan818181"><b>Allan Muganyizi Deus</b></a> · Full-Stack &amp; DevOps Engineer · Dar es Salaam, Tanzania<br/>
<a href="https://www.linkedin.com/in/allan-deus-4b888631a">LinkedIn</a> · <a href="mailto:allandeus014@gmail.com">Email</a></p>
