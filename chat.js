import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, push, onChildAdded } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
  // TODO: Replace with your Firebase project configuration
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const messagesRef = ref(db, 'messages');

const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const messages = document.getElementById('messages');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text) {
    push(messagesRef, { text, timestamp: Date.now() });
    input.value = '';
  }
});

onChildAdded(messagesRef, (snapshot) => {
  const message = snapshot.val();
  const li = document.createElement('li');
  li.textContent = message.text;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});
