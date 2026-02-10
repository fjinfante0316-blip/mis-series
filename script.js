// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];

window.onload = () => {
    const btn = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');
    if(btn) btn.onclick = () => side.classList.toggle('active');
    if(coleccionSeries.length > 0) renderizarTodo();
};

function showSection(id) {
    const welcome = document.getElementById('welcome-screen');
    const mainApp = document.getElementById('main-app');
    
    // Ocultar bloques principales
    welcome.classList.add('hidden');
    mainApp.classList.add('hidden');
    
    // Ocultar sub-secciones
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('hidden'));

    if (id === 'welcome') {
        welcome.classList.remove('hidden');
    } else {
        mainApp.classList.remove('hidden');
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
        <div class="work-card" onclick="confirmar(${s.id})">
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
    // 1. Series
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <div class="serie-group">
            <h4 style="padding:0 20px">${s.name}</h4>
            <div class="seasons-carousel">
                ${s.seasons.map(t => `<div class="work-card"><img src="https://image.tmdb.org/t/p/w200${t.poster_path || s.poster_path}"><p>${t.name}</p></div>`).join('')}
            </div>
        </div>`).join('');

    // 2. Actores con carrusel de series
    const actorsMap = new Map();
    coleccionSeries.forEach(serie => {
        serie.credits?.cast?.slice(0, 5).forEach(act => {
            if (!actorsMap.has(act.id)) actorsMap.set(act.id, { name: act.name, img: act.profile_path, works: [] });
            actorsMap.get(act.id).works.push({ title: serie.name, poster: serie.poster_path });
        });
    });

    document.getElementById('actors-grid').innerHTML = Array.from(actorsMap.values()).map(a => `
        <div class="actor-card-row">
            <div class="actor-info">
                <img class="actor-photo" src="https://image.tmdb.org/t/p/w200${a.img}" onerror="this.src='https://via.placeholder.com/50'">
                <strong>${a.name}</strong>
            </div>
            <div class="actor-works-carousel">
                ${a.works.map(w => `<div class="work-card"><img src="https://image.tmdb.org/t/p/w200${w.poster}"><p>${w.title}</p></div>`).join('')}
            </div>
        </div>`).join('');
}

function generarStats() {
    let tCaps = 0, tHoras = 0;
    const gens = {};
    coleccionSeries.forEach(s => {
        tCaps += s.number_of_episodes || 0;
        tHoras += (s.number_of_episodes * (s.episode_run_time[0] || 45)) / 60;
        s.genres.forEach(g => gens[g.name] = (gens[g.name] || 0) + 1);
    });
    document.getElementById('stats-area').innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:20px;">
            <div class="actor-card-row"><h3>${tCaps}</h3><p>Capítulos</p></div>
            <div class="actor-card-row"><h3>${Math.round(tHoras)}</h3><p>Horas</p></div>
        </div>`;
}
