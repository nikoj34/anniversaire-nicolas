// api/carpool.js — Vercel Serverless Function for carpool form
import nodemailer from 'nodemailer';

function escapeHtml(str = ''){
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ error:'Method not allowed' });
  try{
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { name, city, seats, contact, message } = body || {};
    if(!name || !city || !seats || !contact){
      return res.status(400).json({ error:'Champs requis manquants.' });
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

    return res.status(200).json({ message:'Proposition envoyée. Merci !' });
  }catch(err){
    console.error(err);
    return res.status(500).json({ error:'Erreur serveur: ' + err.message });
  }
}
