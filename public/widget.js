// --- Mock site page: just displays rooms for context, not part of the AI demo ---
fetch('/api/rooms')
  .then(r => r.json())
  .then(rooms => {
    const grid = document.getElementById('roomGrid');
    grid.innerHTML = rooms.map(r => `
      <div class="room-card">
        <h3>${r.suite} — ${r.type}</h3>
        <div class="price">Tsh ${r.price_per_night_tsh.toLocaleString()}/night</div>
        <div class="desc">${r.description}</div>
      </div>
    `).join('');
  })
  .catch(() => {
    document.getElementById('roomGrid').innerHTML = '<p>Could not load rooms.</p>';
  });

// --- Chat widget ---
const chatBubble = document.getElementById('chatBubble');
const chatWindow = document.getElementById('chatWindow');
const closeChat = document.getElementById('closeChat');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

let conversation = []; // full Gemini-format {role, parts:[...]} history sent back each turn

chatBubble.onclick = () => chatWindow.classList.remove('hidden');
closeChat.onclick = () => chatWindow.classList.add('hidden');

function addBubble(text, role) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function extractText(parts) {
  if (!Array.isArray(parts)) return '';
  return parts.filter(p => typeof p.text === 'string').map(p => p.text).join('\n');
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';
  addBubble(text, 'user');
  conversation.push({ role: 'user', parts: [{ text }] });

  const typingBubble = addBubble('…typing', 'bot typing');

  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: conversation })
    });
    const data = await resp.json();
    typingBubble.remove();

    if (data.error) {
      addBubble(`⚠️ ${data.error}`, 'bot');
      return;
    }

    conversation = data.messages;
    const last = conversation[conversation.length - 1];
    const replyText = extractText(last.parts) || '(no reply text — check server logs)';
    addBubble(replyText, 'bot');
  } catch (err) {
    typingBubble.remove();
    addBubble('⚠️ Could not reach the server. Is it running?', 'bot');
  }
}

sendBtn.onclick = sendMessage;
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMessage();
});
