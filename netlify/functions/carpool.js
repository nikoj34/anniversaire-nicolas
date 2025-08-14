// netlify/functions/carpool.js
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
    const { name, city, seats, contact, message } = body || {};
    if(!name || !city || !seats || !contact){
      return { statusCode: 400, body: JSON.stringify({ error:'Champs requis manquants.' }) };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const to = process.env.TO_EMAIL;
    const html = `
      <h2>Proposition de covoiturage</h2>
      <ul>
        <li><b>Nom:</b> ${escapeHtml(name)}</li>
        <li><b>Ville de départ:</b> ${escapeHtml(city)}</li>
        <li><b>Places disponibles:</b> ${escapeHtml(seats)}</li>
        <li><b>Contact:</b> ${escapeHtml(contact)}</li>
        <li><b>Message:</b> ${message ? escapeHtml(message) : '—'}</li>
      </ul>
    `;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to,
      subject: 'Covoiturage — Anniversaire de Nicolas',
      html
    });

    return { statusCode: 200, body: JSON.stringify({ message:'Proposition envoyée. Merci !' }) };
  }catch(err){
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error:'Erreur serveur: ' + err.message }) };
  }
};
