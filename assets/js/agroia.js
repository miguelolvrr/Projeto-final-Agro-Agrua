(() => {
  'use strict';
  const panel = document.getElementById('agroiaPanel');
  const toggle = document.getElementById('agroiaToggle');
  const close = document.getElementById('agroiaClose');
  const form = document.getElementById('agroiaForm');
  const input = document.getElementById('agroiaInput');
  const log = document.getElementById('agroiaLog');
  const status = document.getElementById('agroiaStatus');
  const send = document.getElementById('agroiaSend');
  const clear = document.getElementById('agroiaClear');
  let history = [];
  let pending = false;

  function addMessage(text, role) {
    const message = document.createElement('p');
    message.className = `agroia-message ${role}`;
    message.textContent = text;
    log.append(message);
    log.scrollTop = log.scrollHeight;
    return message;
  }
  function show(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    (open ? input : toggle).focus();
  }
  toggle.addEventListener('click', () => show(panel.hidden));
  close.addEventListener('click', () => show(false));
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') show(false);
  });
  clear.addEventListener('click', () => {
    history = [];
    log.replaceChildren();
    status.textContent = '';
    addMessage('Sou a AgroIA. Como posso ajudar com o AgroÁgua ou sua irrigação?', 'model');
    input.focus();
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || pending) return;
    if (location.protocol === 'file:') {
      status.textContent = 'Abra o app pelo servidor Flask para conversar com a AgroIA.';
      return;
    }
    pending = true;
    send.disabled = clear.disabled = true;
    input.readOnly = true;
    const bubble = addMessage(message, 'user');
    input.value = '';
    status.textContent = 'AgroIA está preparando a resposta…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message, history}), signal: controller.signal,
      });
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Abra o aplicativo pelo iniciar-servidor.bat para usar a AgroIA.');
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível obter uma resposta.');
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('A resposta veio vazia. Tente novamente.');
      addMessage(data.reply, 'model');
      history = [...history, {role: 'user', text: message}, {role: 'model', text: data.reply}].slice(-6);
      status.textContent = '';
    } catch (error) {
      bubble.remove();
      input.value = message;
      status.textContent = error.name === 'AbortError' ? 'A resposta demorou demais. Tente novamente.' : error.message;
    } finally {
      clearTimeout(timeout);
      pending = false;
      send.disabled = clear.disabled = false;
      input.readOnly = false;
      if (!panel.hidden) input.focus();
    }
  });
})();
