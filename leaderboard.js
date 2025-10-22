(function(){
  const tbody = document.querySelector('#leaderboardTable tbody');
  const refreshBtn = document.getElementById('refreshBtn');
  const API_LEADER = './api/get_leaderboard.php'; // ruta relativa; ponla a /space-invaders/api/... si usas subcarpeta

  async function fetchLeaderboard(limit = 50) {
    try {
      const resp = await fetch(API_LEADER + '?limit=' + encodeURIComponent(limit), { cache: 'no-store' });
      if (!resp.ok) {
        console.error('Respuesta no OK al pedir leaderboard', resp.status);
        return [];
      }
      const j = await resp.json();
      console.log('Respuesta leaderboard:', j);
      if (j && j.success && Array.isArray(j.data)) return j.data;
      return [];
    } catch (err) {
      console.error('Error cargando leaderboard', err);
      return [];
    }
  }

  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

  async function render() {
    tbody.innerHTML = '';
    const list = await fetchLeaderboard(100);
    if (!list || list.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="4" style="padding:8px;color:#9fb1c6">No hay puntuaciones todavía.</td>';
      tbody.appendChild(tr);
      return;
    }
    list.forEach((entry, idx) => {
      const tr = document.createElement('tr');
      // fecha: si viene en ISO (ej. 2025-10-21T21:15:29+00:00) la parseamos; si no, mostramos texto crudo
      let fechaText = '';
      if (entry.fecha) {
        const d = new Date(entry.fecha);
        if (!isNaN(d.getTime())) fechaText = d.toLocaleString();
        else fechaText = escapeHtml(String(entry.fecha));
      }
      const usuarioEsc = escapeHtml(entry.usuario || '');
      const puntajeVal = (entry.puntaje === null || entry.puntaje === undefined) ? '—' : String(entry.puntaje);

      tr.innerHTML = `<td style="padding:6px">${idx+1}</td>
        <td style="padding:6px">${usuarioEsc}</td>
        <td style="padding:6px;text-align:right">${escapeHtml(puntajeVal)}</td>
        <td style="padding:6px;text-align:right">${escapeHtml(fechaText)}</td>`;
      tbody.appendChild(tr);
    });
  }

  refreshBtn.addEventListener('click', render);
  render();
})();
