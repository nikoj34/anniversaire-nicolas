// netlify/functions/send-email.js
const nodemailer = require('nodemailer');

function escapeHtml(str = ''){
  const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

exports.handler = async (event) => {
  if(event.httpMethod !== 'POST'){
    return { statusCode: 405, body: JSON.stringify({ error:'Method not allowed' }) };
  }
  try{
    const body = JSON.parse(event.body || '{}');
    const { firstName, lastName, email, phone, guests, diet, message, consent } = body || {};
    if(!firstName || !lastName || !email || !guests || !consent){
      return { statusCode: 400, body: JSON.stringify({ error:'Champs requis manquants.' }) };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const to = process.env.TO_EMAIL; // votre adresse
    const html = `
      <h2>Nouvelle inscription — Anniversaire de Nicolas</h2>
      <ul>
        <li><b>Nom:</b> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</li>
        <li><b>Email:</b> ${escapeHtml(email)}</li>
        <li><b>Téléphone:</b> ${phone ? escapeHtml(phone) : '—'}</li>
        <li><b>Invités:</b> ${escapeHtml(guests)}</li>
        <li><b>Régime:</b> ${diet ? escapeHtml(diet) : '—'}</li>
        <li><b>Message:</b> ${message ? escapeHtml(message) : '—'}</li>
      </ul>
      <p style="font-size:12px;color:#666">Consentement RGPD reçu: ${consent ? 'oui' : 'non'}</p>
    `;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to,
      subject: 'Inscription — Anniversaire de Nicolas',
      html
    });

    return { statusCode: 200, body: JSON.stringify({ message:'Inscription envoyée. Merci !' }) };
  }catch(err){
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error:'Erreur serveur: ' + err.message }) };
  }
};
