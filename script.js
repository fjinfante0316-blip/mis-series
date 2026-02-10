// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];

window.onload = () => {
    initMenu();
    if (coleccionSeries.length > 0) renderizarTodo();
};

function initMenu() {
    const btn = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');
    if (btn) {
        btn.onclick = () => side.classList.toggle('active');
    }
}

function showSection(id) {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('hidden'));

    if (id === 'welcome') {
        document.getElementById('welcome-screen').classList.remove('hidden');
    } else {
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById(`sec-${id}`).classList.remove('hidden');
        if (id === 'stats') generarStats();
    }
    document.getElementById('sidebar').classList.remove('active');
}

async function buscarSeries() {
    const q = document.getElementById('initialInput').value;
    if (!q) return;
    const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(q)}&language=es-ES`);
    const d = await r.json();
    window.ultimos = d.results;
    const resDiv = document.getElementById('search-results-main');
    resDiv.innerHTML = d.results.map(s => `
        <div class="search-card" onclick="confirmar(${s.id})">
            <img src="https://image.tmdb.org/t/p/w200${s.poster_path}">
            <p>${s.name}</p>
        </div>`).join('');
    resDiv.classList.remove('hidden');
}

async function confirmar(id) {
    const r = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`);
    const s = await r.json();
    coleccionSeries.push(s);
    localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
    renderizarTodo();
    showSection('series');
}

function renderizarTodo() {
    // Render Series
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <div class="serie-group">
            <h4 style="margin-left:20px">${s.name}</h4>
            <div class="seasons-carousel">
                ${s.seasons.map(t => `<div class="season-card"><img src="https://image.tmdb.org/t/p/w200${t.poster_path || s.poster_path}"><p>${t.name}</p></div>`).join('')}
            </div>
        </div>`).join('');

    // Lógica Actores (5 únicos) y Creadores
    const actData = {};
    const seenAct = new Set();
    const creData = {};

    coleccionSeries.forEach(s => {
        let count = 0;
        s.credits?.cast?.forEach(a => {
            if (count < 5 && !seenAct.has(a.id)) {
                seenAct.add(a.id);
                actData[a.id] = { name: a.name, img: a.profile_path, char: a.character, sImg: s.poster_path };
                count++;
            }
        });
        s.created_by?.forEach(c => {
            if (!creData[c.id]) creData[c.id] = { name: c.name, img: c.profile_path, shows: [] };
            creData[c.id].shows.push(s.poster_path);
        });
    });

    document.getElementById('actors-grid').innerHTML = Object.values(actData).map(a => `
        <div class="actor-row" style="display:flex; align-items:center; padding:10px; gap:20px;">
            <img src="https://image.tmdb.org/t/p/w200${a.img}" style="width:60px; height:60px; border-radius:50%; object-fit:cover;">
            <div><strong>${a.name}</strong><br><small>${a.char}</small></div>
        </div>`).join('');
}

function generarStats() {
    let totalCaps = 0;
    let totalHoras = 0;
    const generos = {};
    const años = {};

    coleccionSeries.forEach(s => {
        totalCaps += s.number_of_episodes || 0;
        totalHoras += (s.number_of_episodes * (s.episode_run_time[0] || 45)) / 60;
        s.genres.forEach(g => generos[g.name] = (generos[g.name] || 0) + 1);
        const año = s.first_air_date?.split('-')[0];
        años[año] = (años[año] || 0) + 1;
    });

    document.getElementById('stats-area').innerHTML = `
        <div class="stats-grid">
            <div class="stat-bubble"><h3>${totalCaps}</h3><p>Episodios</p></div>
            <div class="stat-bubble"><h3>${Math.round(totalHoras)}</h3><p>Horas</p></div>
            <div class="stat-bubble"><h3>${coleccionSeries.length}</h3><p>Series</p></div>
        </div>
        <div style="padding:20px">
            <h4>Géneros Predominantes</h4>
            ${Object.entries(generos).map(([n, v]) => `<p>${n}: ${v}</p>`).join('')}
        </div>
    `;
}
