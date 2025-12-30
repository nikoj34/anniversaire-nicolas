# Application de suivi repas / selles

Ce dossier contient un prototype minimal d'application multi-plateforme :

- **iOS/iPadOS** : interface SwiftUI pour saisir repas et selles (`ios/MealEntryView.swift`).
- **Google Apps Script** : script d'enregistrement dans un Google Sheet (`apps-script/DriveLogger.gs`).
- **Web (PC)** : page HTML/JS permettant la saisie depuis un navigateur (`web/index.html`, `web/app.js`).

Chaque composant doit être configuré avec l'identifiant de votre script Google Apps Script (`YOUR_SCRIPT_ID`) et l'identifiant du Google Sheet (`YOUR_SHEET_ID`).

Ce prototype illustre la structure générale décrite dans le prompt : saisie rapide, stockage Drive et base pour l'analyse graphique.
