import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getDatabase, ref, push, onChildAdded } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

// TODO: replace with your Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DB_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const messagesRef = ref(db, 'chat-messages');

function escapeHtml(str){
  const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
  return str.replace(/[&<>"']/g, c => map[c]);
}

const list = document.getElementById('chatList');
const form = document.getElementById('chatForm');
const nameInput = document.getElementById('chatName');
const msgInput = document.getElementById('chatMessage');
const statusEl = form.querySelector('.status');

onChildAdded(messagesRef, snapshot => {
  const { name, message } = snapshot.val();
  const li = document.createElement('li');
  li.innerHTML = `<strong>${escapeHtml(name)}:</strong> ${escapeHtml(message)}`;
  list.appendChild(li);
  list.scrollTop = list.scrollHeight;
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  statusEl.className = 'status';
  const name = nameInput.value.trim();
  const message = msgInput.value.trim();
  if(!name || !message){
    statusEl.className = 'status err';
    statusEl.textContent = 'Nom et message requis.';
    return;
  }
  try{
    await push(messagesRef, { name, message });
    msgInput.value = '';
    statusEl.className = 'status ok';
    statusEl.textContent = 'Message envoyé';
  }catch(err){
    statusEl.className = 'status err';
    statusEl.textContent = err.message;
  }
});
