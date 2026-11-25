'use strict';
window.AgroDatabase = {
  configured: false,
  async request(path, method = 'GET', body) {
    let response;
    try {
      response = await fetch(path, {
        method, credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Agroagua-Request': '1' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
    } catch (error) {
      throw new Error('Servidor indisponível. Confira a conexão e tente novamente.');
    }
    if (response.status === 204) return {};
    let data;
    try { data = await response.json(); }
    catch (error) { throw new Error('Inicie o aplicativo pelo servidor Flask.'); }
    if (!response.ok) {
      const error = new Error(data.error || 'Não foi possível concluir a operação.');
      error.status = response.status;
      throw error;
    }
    return data;
  },
  async setup() {
    if (location.protocol === 'file:') return;
    const status = await this.request('/api/health');
    if (typeof status.database_configured !== 'boolean') {
      throw new Error('Reinicie o Flask para carregar a integração com o banco.');
    }
    this.configured = status.database_configured;
  },
};
window.AgroDatabase.ready = window.AgroDatabase.setup().catch(error => {
  window.AgroDatabase.setupError = error;
});
