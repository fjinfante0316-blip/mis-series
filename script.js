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
    // 1. RENDER SERIES
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <div class="row-item">
            <h4 style="margin-left:15px">${s.name}</h4>
            <div class="seasons-carousel">
                ${s.seasons.map(t => `
                    <div class="card" onclick="verSinopsis(${s.id}, ${t.season_number})">
                        <img src="https://image.tmdb.org/t/p/w200${t.poster_path || s.poster_path}">
                        <p>${t.name}</p>
                    </div>`).join('')}
            </div>
        </div>`).join('');

    // 2. REPARTO COMPLETO (Sin límites)
    const actorsMap = new Map();
    coleccionSeries.forEach(s => {
        // Quitamos el slice para que salgan todos los actores registrados
        s.credits?.cast?.forEach(a => {
            if (!actorsMap.has(a.id)) actorsMap.set(a.id, { name: a.name, img: a.profile_path, works: [] });
            actorsMap.get(a.id).works.push({ title: s.name, poster: s.poster_path, char: a.character });
        });
    });

    document.getElementById('actors-grid').innerHTML = Array.from(actorsMap.values())
        .filter(a => a.img) // Solo actores con foto para mantener la estética
        .map(a => `
        <div class="actor-row-container">
            <div class="actor-profile">
                <img class="actor-photo" src="https://image.tmdb.org/t/p/w200${a.img}">
                <div class="actor-name-label">${a.name}</div>
            </div>
            <div class="actor-works-carousel">
                ${a.works.map(w => `
                    <div class="work-card-mini">
                        <img src="https://image.tmdb.org/t/p/w200${w.poster}">
                        <div class="character-name">${w.char || 'Recurrente'}</div>
                    </div>`).join('')}
            </div>
        </div>`).join('');

    // 3. CREADORES (Añadido)
    const creatorMap = new Map();
    coleccionSeries.forEach(s => {
        s.created_by?.forEach(c => {
            if (!creatorMap.has(c.id)) creatorMap.set(c.id, { name: c.name, img: c.profile_path, works: [] });
            creatorMap.get(c.id).works.push({ title: s.name, poster: s.poster_path });
        });
    });

    document.getElementById('directors-grid').innerHTML = Array.from(creatorMap.values()).map(c => `
        <div class="actor-row-container">
            <div class="actor-profile">
                <img class="actor-photo" src="https://image.tmdb.org/t/p/w200${c.img || ''}" onerror="this.src='https://via.placeholder.com/60'">
                <div class="actor-name-label">${c.name}</div>
            </div>
            <div class="actor-works-carousel">
                ${c.works.map(w => `
                    <div class="work-card-mini">
                        <img src="https://image.tmdb.org/t/p/w200${w.poster}">
                    </div>`).join('')}
            </div>
        </div>`).join('');
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
    let totalMinutos = 0;
    const generos = {};

    coleccionSeries.forEach(s => {
        // Multiplicamos capítulos por la duración media de cada uno
        const duracionMedia = s.episode_run_time[0] || 45; 
        totalMinutos += (s.number_of_episodes * duracionMedia);
        
        s.genres.forEach(g => generos[g.name] = (generos[g.name] || 0) + 1);
    });

    const horasTotales = Math.floor(totalMinutos / 60);
    const minutosRestantes = totalMinutos % 60;

    document.getElementById('stats-area').innerHTML = `
        <div class="row-item">
            <div style="display:flex; justify-content:space-around; text-align:center;">
                <div><h3>${horasTotales}h ${minutosRestantes}m</h3><p>Tiempo Total</p></div>
                <div><h3>${coleccionSeries.length}</h3><p>Series</p></div>
            </div>
            <div style="padding:15px; color:#888;">
                <p>Has invertido un total de ${totalMinutos.toLocaleString()} minutos viendo series.</p>
            </div>
        </div>
    `;
}
