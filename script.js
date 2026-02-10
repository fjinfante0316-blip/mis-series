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
    // 1. RENDER COLECCIÓN
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <div class="row-item">
            <h4 style="margin-left:10px">${s.name}</h4>
            <div class="seasons-carousel">
                ${s.seasons.map(t => `
                    <div class="card" onclick="verSinopsis(${s.id}, ${t.season_number})">
                        <img src="https://image.tmdb.org/t/p/w200${t.poster_path || s.poster_path}">
                        <p>${t.name}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    // 2. REPARTO (5 personajes por serie/temporada sin repetir actor)
    const actorsMap = new Map();
    coleccionSeries.forEach(serie => {
        // Obtenemos los 5 principales de la serie
        serie.credits?.cast?.slice(0, 5).forEach(act => {
            if (!actorsMap.has(act.id)) {
                actorsMap.set(act.id, {
                    name: act.name,
                    img: act.profile_path,
                    works: []
                });
            }
            actorsMap.get(act.id).works.push({
                serie: serie.name,
                poster: serie.poster_path,
                character: act.character
            });
        });
    });

    document.getElementById('actors-grid').innerHTML = Array.from(actorsMap.values()).map(a => `
        <div class="actor-row-container">
            <div class="actor-profile">
                <img class="actor-photo" src="https://image.tmdb.org/t/p/w200${a.img}" onerror="this.src='https://via.placeholder.com/65'">
                <div class="actor-name-label">${a.name}</div>
            </div>
            <div class="actor-works-carousel">
                ${a.works.map(w => `
                    <div class="work-card-mini">
                        <img src="https://image.tmdb.org/t/p/w200${w.poster}">
                        <div class="character-name">${w.character}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Función para ver Sinopsis al clicar portada
async function verSinopsis(serieId, seasonNum) {
    const serie = coleccionSeries.find(s => s.id === serieId);
    const temporada = serie.seasons.find(t => t.season_number === seasonNum);
    
    // Si queremos sinopsis detallada de la temporada, TMDB requiere otra llamada, 
    // pero por ahora usamos la que tenemos:
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div style="text-align:center">
            <img src="https://image.tmdb.org/t/p/w300${temporada.poster_path || serie.poster_path}" style="width:150px; border-radius:10px; margin-bottom:15px">
            <h2 style="color:var(--rojo)">${serie.name}</h2>
            <h3>${temporada.name}</h3>
            <p style="color:#ccc; line-height:1.5; font-size:0.9rem;">${temporada.overview || "Sin sinopsis disponible para esta temporada."}</p>
            <div style="margin-top:15px; font-size:0.8rem; color:var(--rojo)">
                Episodios: ${temporada.episode_count}
            </div>
        </div>
    `;
    document.getElementById('info-modal').classList.remove('hidden');
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
