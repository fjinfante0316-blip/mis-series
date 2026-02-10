// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');
    btn.onclick = () => side.classList.toggle('active');
    if (coleccionSeries.length > 0) renderizarTodo();
});

function showSection(id) {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));

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
        <div class="card" onclick="confirmar(${s.id})">
            <img src="https://image.tmdb.org/t/p/w200${s.poster_path}">
            <p style="font-size:0.7rem;">${s.name}</p>
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
    // Mi Colección
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <div class="row-item">
            <h4>${s.name}</h4>
            <div class="seasons-carousel">
                ${s.seasons.map(t => `<div class="card"><img src="https://image.tmdb.org/t/p/w200${t.poster_path || s.poster_path}"><p>${t.name}</p></div>`).join('')}
            </div>
        </div>`).join('');

    // Reparto (5 actores únicos por serie)
    const actorsMap = new Map();
    coleccionSeries.forEach(s => {
        s.credits?.cast?.slice(0, 5).forEach(a => {
            if (!actorsMap.has(a.id)) actorsMap.set(a.id, { name: a.name, img: a.profile_path, works: [] });
            actorsMap.get(a.id).works.push({ title: s.name, poster: s.poster_path });
        });
    });

    document.getElementById('actors-grid').innerHTML = Array.from(actorsMap.values()).map(a => `
        <div class="row-item">
            <div class="row-header">
                <img class="photo-circle" src="https://image.tmdb.org/t/p/w200${a.img}">
                <strong>${a.name}</strong>
            </div>
            <div class="actor-works-carousel">
                ${a.works.map(w => `<div class="card" style="min-width:80px"><img src="https://image.tmdb.org/t/p/w200${w.poster}"></div>`).join('')}
            </div>
        </div>`).join('');

    // Creadores (Igual que actores)
    const creatorMap = new Map();
    coleccionSeries.forEach(s => {
        s.created_by?.forEach(c => {
            if (!creatorMap.has(c.id)) creatorMap.set(c.id, { name: c.name, img: c.profile_path, works: [] });
            creatorMap.get(c.id).works.push({ title: s.name, poster: s.poster_path });
        });
    });
    document.getElementById('directors-grid').innerHTML = Array.from(creatorMap.values()).map(c => `
        <div class="row-item">
            <div class="row-header">
                <img class="photo-circle" src="https://image.tmdb.org/t/p/w200${c.img || ''}" onerror="this.src='https://via.placeholder.com/50'">
                <strong>${c.name}</strong>
            </div>
            <div class="actor-works-carousel">
                ${c.works.map(w => `<div class="card" style="min-width:80px"><img src="https://image.tmdb.org/t/p/w200${w.poster}"></div>`).join('')}
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
        <div class="row-item">
            <div style="display:flex; justify-content:space-around; text-align:center;">
                <div><h3>${tCaps}</h3><p>Capítulos</p></div>
                <div><h3>${Math.round(tHoras)}</h3><p>Horas Totales</p></div>
            </div>
            <hr style="border:0.5px solid #333">
            <h4>Géneros</h4>
            ${Object.entries(gens).map(([n,v]) => `<p>${n}: ${v}</p>`).join('')}
        </div>`;
}
