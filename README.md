# Anniversaire de Nicolas — Site 2 pages (responsive, animé)

Ce package contient :

- `index.html` — page d’accueil avec *hero*, compte à rebours, programme et CTA.
- `register.html` — formulaire d’inscription (RGPD) avec envoi e‑mail.
- `styles.css` — design moderne (verre, dégradés animés, reveal on scroll).
- `script.js` — compte à rebours + soumission AJAX + animations.
- `api/send.js` — fonction serverless pour **Vercel** (e‑mail via SMTP).
- `netlify/functions/send-email.js` — alternative **Netlify** (SMTP).
- `assets/favicon.png` — favicon.

## Déploiement rapide (Vercel, conseillé)

1) Créez un compte sur vercel.com puis **Import Project** → **Add New…** → **Project**.  
2) Glissez-déposez le contenu de ce dossier (ou poussez sur GitHub puis importez).  
3) Ajoutez les variables d’environnement dans *Settings → Environment Variables* :

```
SMTP_HOST=smtp.votre_fai.fr
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=utilisateur@exemple.fr
SMTP_PASS=motdepasse
FROM_EMAIL=Anniv Nicolas <utilisateur@exemple.fr>
TO_EMAIL=VOTRE_ADRESSE_PERSONNELLE@exemple.fr   # ← modifiez‑moi
```

4) Déployez. L’URL de production exposera l’API à `/api/send`.  
5) Le formulaire `register.html` soumettra en AJAX et vous recevrez les inscriptions par e‑mail.

> Astuce : si votre fournisseur bloque l’envoi, utilisez un SMTP transactionnel gratuit (Mailjet Free, Brevo/Sendinblue Free…).

## Déploiement alternatif (Netlify)

1) Poussez ce dossier sur un dépôt Git, puis **New site from Git** sur app.netlify.com.  
2) Dans **Site settings → Environment variables**, ajoutez les mêmes variables que ci-dessus, plus :

```
NETLIFY_FUNCTIONS=netlify/functions
```

3) Le point d’API sera `/.netlify/functions/send-email`.  
4) Modifiez dans `register.html` l’attribut `action` du `<form>` :
```
action="/.netlify/functions/send-email"
```

## Personnalisation

- **Couleurs/typographie** : dans `styles.css` (variables CSS en tête de fichier).  
- **Texte & sections** : modifiez `index.html`.  
- **RGPD** : texte dans `register.html`. Ajoutez un lien vers votre politique si besoin.  
- **Anti‑spam** : vous pouvez ajouter un champ *honeypot* caché ou un reCAPTCHA v3 côté client + vérif côté serveur.

## Local

Servez le dossier avec n’importe quel serveur statique :
```bash
# Python
python3 -m http.server 5173
# Node
npx serve .
```
Puis ouvrez `http://localhost:8000` (ou le port affiché).

Bon événement ! 🎉
