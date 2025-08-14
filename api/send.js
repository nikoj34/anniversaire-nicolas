// api/send.js — Vercel Serverless Function (Node.js)
import nodemailer from 'nodemailer';

function escapeHtml(str){
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  return str.replace(/[&<>"]/g, ch => map[ch]);
}

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ error:'Method not allowed' });
  try{
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { firstName, lastName, email, phone, guests, diet, message, consent } = body || {};
    if(!firstName || !lastName || !email || !guests || !consent){
      return res.status(400).json({ error:'Champs requis manquants.' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const to = process.env.TO_EMAIL; // ← Renseignez votre adresse e‑mail ici via variable d’env.
    const html = `
      <h2>Nouvelle inscription — Anniversaire de Nicolas</h2>
      <ul>
        <li><b>Nom:</b> ${firstName} ${lastName}</li>
        <li><b>Email:</b> ${email}</li>
        <li><b>Téléphone:</b> ${phone || '—'}</li>
        <li><b>Invités:</b> ${guests}</li>
        <li><b>Régime:</b> ${diet || '—'}</li>
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

    return res.status(200).json({ message:'Inscription envoyée. Merci !' });
  }catch(err){
    console.error(err);
    return res.status(500).json({ error:'Erreur serveur: ' + err.message });
  }
}
