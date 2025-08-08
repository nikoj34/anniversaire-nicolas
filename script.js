// Countdown to August 20, 2025 20:00 Europe/Paris
(() => {
  const target = new Date('2025-08-20T20:00:00+02:00').getTime();
  function update(){
    const now = Date.now();
    const d = Math.max(0, target - now);
    const dd = Math.floor(d / (1000*60*60*24));
    const hh = Math.floor((d / (1000*60*60)) % 24);
    const mm = Math.floor((d / (1000*60)) % 60);
    const ss = Math.floor((d / 1000) % 60);
    const set = (id,val)=>{ const el = document.getElementById(id); if(el) el.textContent = String(val).padStart(2,'0'); };
    set('dd', dd); set('hh', hh); set('mm', mm); set('ss', ss);
  }
  setInterval(update, 1000); update();
})();

// Reveal on scroll
(() => {
  const obs = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) e.target.classList.add('show');
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
})();

// Form: progressive enhancement (AJAX). Requires a backend at /api/send
(() => {
  const form = document.getElementById('rsvpForm');
  if(!form) return;
  const status = document.getElementById('formStatus');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    status.className = 'status';
    status.textContent = 'Envoi en cours…';
    const data = Object.fromEntries(new FormData(form).entries());
    if(!data.consent){ status.className = 'status err'; status.textContent = 'Veuillez accepter la mention RGPD.'; return; }
    try{
      const res = await fetch(form.action, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(data)
      });
      const payload = await res.json().catch(()=>({}));
      if(res.ok){
        status.className = 'status ok';
        status.textContent = payload.message || 'Merci ! Votre inscription a bien été envoyée.';
        form.reset();
      }else{
        throw new Error(payload.error || 'Erreur lors de l’envoi. Réessayez plus tard.');
      }
    }catch(err){
      status.className = 'status err';
      status.textContent = err.message;
    }
  });
})();
