const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const https   = require('https');
const path    = require('path');

const app  = express();
const PORT = 3000;

// ─────────────────────────────────────────────
//  CONFIG  ← fill these two values (see README)
// ─────────────────────────────────────────────
const WHATSAPP_PHONE    = '919821824769';   // your number with country code, no +
const CALLMEBOT_APIKEY  = 'YOUR_API_KEY';   // ← replace after CallMeBot setup (step 2 below)
// ─────────────────────────────────────────────

const DB_FILE = path.join(__dirname, 'messages.json');

// Create DB file if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
  console.log('📁 Created messages.json database');
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serve index.html

// ── POST /contact  — receive form submission ──
app.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }

  // ── 1. Save to JSON database ──
  const messages = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const entry = {
    id:         Date.now(),
    name,
    email,
    subject:    subject || '—',
    message,
    receivedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  };
  messages.push(entry);
  fs.writeFileSync(DB_FILE, JSON.stringify(messages, null, 2));
  console.log(`\n📩 New message from ${name} <${email}>`);

  // ── 2. Send WhatsApp notification via CallMeBot ──
  const waText = encodeURIComponent(
    `📬 *New Portfolio Message!*\n\n` +
    `👤 *Name:* ${name}\n` +
    `📧 *Email:* ${email}\n` +
    `📌 *Subject:* ${subject || 'No subject'}\n` +
    `💬 *Message:* ${message}\n\n` +
    `⏰ ${entry.receivedAt}`
  );

  const waUrl = `https://api.callmebot.com/whatsapp.php?phone=${WHATSAPP_PHONE}&text=${waText}&apikey=${CALLMEBOT_APIKEY}`;

  https.get(waUrl, (waRes) => {
    console.log(`✅ WhatsApp notification sent (status: ${waRes.statusCode})`);
  }).on('error', (err) => {
    console.error('⚠️  WhatsApp notification failed:', err.message);
  });

  res.json({ success: true });
});

// ── GET /messages — view all saved submissions ──
app.get('/messages', (req, res) => {
  const messages = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  // Return a nice HTML table if opened in browser
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    const rows = messages.reverse().map(m => `
      <tr>
        <td>${m.id}</td>
        <td>${m.name}</td>
        <td>${m.email}</td>
        <td>${m.subject}</td>
        <td>${m.message}</td>
        <td>${m.receivedAt}</td>
      </tr>`).join('');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Portfolio Messages</title>
        <style>
          body { font-family: 'Courier New', monospace; background: #07070f; color: #e2e8f0; padding: 2rem; }
          h1 { color: #a78bfa; margin-bottom: 1.5rem; }
          table { width: 100%; border-collapse: collapse; font-size: .85rem; }
          th { background: rgba(124,58,237,.2); color: #a78bfa; padding: .75rem 1rem; text-align: left; }
          td { padding: .65rem 1rem; border-bottom: 1px solid rgba(255,255,255,.06); vertical-align: top; max-width: 300px; word-break: break-word; }
          tr:hover td { background: rgba(124,58,237,.05); }
          .count { color: #64748b; font-size: .8rem; margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <h1>📩 Portfolio Messages</h1>
        <div class="count">${messages.length} total submission(s)</div>
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Subject</th><th>Message</th><th>Received At</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" style="color:#64748b;padding:2rem">No messages yet.</td></tr>'}</tbody>
        </table>
      </body>
      </html>
    `);
  } else {
    res.json(messages);
  }
});

app.listen(PORT, () => {
  console.log('\n' + '─'.repeat(50));
  console.log(`✅  Portfolio backend running`);
  console.log(`🌐  Open portfolio  →  http://localhost:${PORT}`);
  console.log(`📊  View messages   →  http://localhost:${PORT}/messages`);
  console.log('─'.repeat(50) + '\n');
});
