(function(){
  const tbody = document.querySelector('#leaderboardTable tbody');
  const refreshBtn = document.getElementById('refreshBtn');
  const API_LEADER = './api/get_leaderboard.php'; // ajustar si está en subcarpeta

  async function fetchLeaderboard(limit = 50) {
    try {
      const resp = await fetch(API_LEADER + '?limit=' + encodeURIComponent(limit), { cache: 'no-store' });
      const j = await resp.json();
      if (j && j.success && Array.isArray(j.data)) return j.data;
      return [];
    } catch (err) {
      console.error('Error cargando leaderboard', err);
      return [];
    }
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }

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
      const fechaText = entry.fecha ? (new Date(entry.fecha).toLocaleString()) : '';
      tr.innerHTML = `<td style="padding:6px">${idx+1}</td>
        <td style="padding:6px">${escapeHtml(entry.usuario || '')}</td>
        <td style="padding:6px;text-align:right">${entry.puntaje}</td>
        <td style="padding:6px;text-align:right">${fechaText}</td>`;
      tbody.appendChild(tr);
    });
  }

  refreshBtn.addEventListener('click', render);
  render();
})();