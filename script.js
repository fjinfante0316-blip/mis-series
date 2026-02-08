const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';

let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];

// --- INICIALIZACIÓN ---
window.onload = () => {
    initMenu();
    if (coleccionSeries.length > 0) {
        renderizarTodo();
        showSection('series');
    }
};

function initMenu() {
    const btn = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');
    if(btn) {
        btn.onclick = (e) => { 
            e.stopPropagation(); 
            side.classList.toggle('active'); 
        };
    }
    document.onclick = (e) => { 
        if(side && !side.contains(e.target) && e.target !== btn) {
            side.classList.remove('active');
        }
    };
}

// --- NAVEGACIÓN ---
function showSection(id) {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    
    const target = document.getElementById(`sec-${id}`);
    if(target) target.classList.remove('hidden');

    if (id === 'stats') generarStats();
    if (id === 'timeline') generarCronologia();
    // Cerramos menú al navegar
    document.getElementById('sidebar').classList.remove('active');
}

// --- BÚSQUEDA Y SELECCIÓN ---
async function buscarYAñadir(esInicio) {
    const input = document.getElementById(esInicio ? 'initialInput' : 'serieInput');
    const query = input.value;
    if (!query) return;

    const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`);
    const d = await r.json();
    
    const resultsCont = document.getElementById('search-results');
    resultsCont.innerHTML = d.results.slice(0,5).map(s => `
        <div class="result-item" onclick="confirmarSeleccion(${s.id})">
            <img src="${s.poster_path ? 'https://image.tmdb.org/t/p/w200'+s.poster_path : 'https://via.placeholder.com/200x300'}">
            <div class="result-info">
                <h4>${s.name}</h4>
                <p>${s.first_air_date ? s.first_air_date.split('-')[0] : 'N/A'}</p>
            </div>
        </div>
    `).join('');
    resultsCont.classList.remove('hidden');
}

async function confirmarSeleccion(id) {
    document.getElementById('search-results').classList.add('hidden');
    const r = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`);
    const serie = await r.json();
    
    coleccionSeries.push(serie);
    localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
    mostrarNotificacion("Serie añadida con éxito");
    renderizarTodo();
    showSection('series');
}

// --- RENDERIZADO (CARRUSELES) ---
function renderizarTodo() {
    // 1. Render Series con Carrusel de Temporadas
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
    <div class="serie-group">
        <div class="serie-header-mobile">
            <span class="serie-title-tag">${s.name}</span>
            <button class="btn-delete-mini" onclick="eliminarSerie(${s.id})"><i class="fas fa-times"></i></button>
        </div>
        <div class="seasons-carousel">
            ${s.seasons.map(t => `
                <div class="season-card" onclick="ampliarSerie(${s.id})">
                    <img src="https://image.tmdb.org/t/p/w300${t.poster_path || s.poster_path}">
                    <div class="season-number">${t.name}</div>
                </div>
            `).join('')}
        </div>
    </div>
`).join('');

    // 2. Agrupar Actores y Creadores
    const actoresData = {};
    const creadoresData = {};

    coleccionSeries.forEach(s => {
        // Actores
        if(s.credits && s.credits.cast) {
            s.credits.cast.slice(0, 10).forEach(a => {
                if(!actoresData[a.id]) actoresData[a.id] = { info: a, trabajos: [] };
                actoresData[a.id].trabajos.push({ poster: s.poster_path, titulo: s.name, char: a.character });
            });
        }
        // Creadores
        if(s.created_by) {
            s.created_by.forEach(c => {
                if(!creadoresData[c.id || c.name]) creadoresData[c.id || c.name] = { info: c, trabajos: [] };
                creadoresData[c.id || c.name].trabajos.push({ poster: s.poster_path, titulo: s.name });
            });
        }
    });

    // 3. Render Actores (Filas con Carrusel)
    document.getElementById('actors-grid').innerHTML = Object.values(actoresData)
        .sort((a,b) => b.trabajos.length - a.trabajos.length)
        .map(a => `
        <div class="actor-row">
            <div class="actor-info-side">
                <img src="${a.info.profile_path ? 'https://image.tmdb.org/t/p/w200'+a.info.profile_path : 'https://via.placeholder.com/200'}" class="photo-circle">
                <span class="person-name">${a.info.name}</span>
                <div class="badge-count">${a.trabajos.length} series</div>
            </div>
            <div class="actor-series-carousel">
                ${a.trabajos.map(t => `
                    <div class="mini-card-serie">
                        <img src="https://image.tmdb.org/t/p/w200${t.poster}">
                        <span>${t.char || 'Actor'}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    // 4. Render Creadores (Filas con Carrusel)
    document.getElementById('directors-grid').innerHTML = Object.values(creadoresData)
        .sort((a,b) => b.trabajos.length - a.trabajos.length)
        .map(c => `
        <div class="actor-row">
            <div class="actor-info-side">
                <img src="${c.info.profile_path ? 'https://image.tmdb.org/t/p/w200'+c.info.profile_path : 'https://via.placeholder.com/200'}" class="photo-circle">
                <span class="person-name">${c.info.name}</span>
                <div class="badge-count">${c.trabajos.length} series</div>
            </div>
            <div class="actor-series-carousel">
                ${c.trabajos.map(t => `
                    <div class="mini-card-serie">
                        <img src="https://image.tmdb.org/t/p/w200${t.poster}">
                        <span>${t.titulo}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// --- CRONOLOGÍA ---
function generarCronologia() {
    const container = document.getElementById('sec-timeline-grid');
    if (!container) return;
    
    // Ordenar de más nueva a más vieja
    const ordenadas = [...coleccionSeries].sort((a,b) => 
        (b.first_air_date || "").localeCompare(a.first_air_date || "")
    );

    container.innerHTML = ordenadas.map(s => {
        const año = s.first_air_date ? s.first_air_date.split('-')[0] : 'N/A';
        return `
            <div class="timeline-item">
                <div class="timeline-date">${año}</div>
                <div class="timeline-content" onclick="ampliarSerie(${s.id})">
                    <img src="https://image.tmdb.org/t/p/w200${s.poster_path}">
                    <div class="timeline-info">
                        <h4>${s.name}</h4>
                        <p style="color:#888; margin:2px 0 0; font-size:0.8rem;">${s.origin_country?.[0] || 'N/A'}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
    
// --- ESTADÍSTICAS ---
function generarStats() {
    if (coleccionSeries.length === 0) return;

    let minTotal = 0;
    let epsTotal = 0;
    const generos = {};
    const paises = {};

    coleccionSeries.forEach(s => {
        const dur = (s.episode_run_time && s.episode_run_time[0]) || 45;
        minTotal += (dur * s.number_of_episodes);
        epsTotal += s.number_of_episodes;

        if (s.genres) s.genres.forEach(g => generos[g.name] = (generos[g.name] || 0) + 1);
        if (s.origin_country && s.origin_country[0]) {
            const p = s.origin_country[0];
            paises[p] = (paises[p] || 0) + 1;
        }
    });

    // Lógica Gráfico
    const colores = ['#ff4b2b', '#ff416c', '#8e2de2', '#4a00e0', '#f9d423'];
    let acumulado = 0;
    const totalG = Object.values(generos).reduce((a, b) => a + b, 0);
    const gradiente = Object.keys(generos).map((g, i) => {
        const porc = (generos[g] / totalG) * 100;
        const color = colores[i % colores.length];
        const string = `${color} ${acumulado}% ${acumulado + porc}%`;
        acumulado += porc;
        return string;
    }).join(', ');

    document.getElementById('stats-area').innerHTML = `
        <div class="stats-dashboard">
            <div class="stat-card-premium">
                <i class="fas fa-clock"></i>
                <h3>${Math.floor(minTotal / 60)}</h3>
                <span>Horas de Vida</span>
            </div>
            <div class="stat-card-premium">
                <i class="fas fa-layer-group"></i>
                <h3>${epsTotal}</h3>
                <span>Capítulos</span>
            </div>
            <div class="stat-card-premium">
                <i class="fas fa-tv"></i>
                <h3>${coleccionSeries.length}</h3>
                <span>Series</span>
            </div>
        </div>

        <div class="stats-secondary-grid">
            <div class="glass-panel chart-container-pro">
                <h3 class="section-subtitle">Tus Géneros</h3>
                <div id="genero-chart" style="background: conic-gradient(${gradiente})"></div>
                <div class="flags-container">
                    ${Object.keys(generos).slice(0, 5).map(g => `<span class="legend-item">${g}</span>`).join('')}
                </div>
            </div>

            <div class="glass-panel">
                <h3 class="section-subtitle">Países de Origen</h3>
                <div class="flags-container" style="justify-content: flex-start;">
                    ${Object.keys(paises).map(iso => `
                        <div class="flag-pill">
                            <img src="https://purecatamphetamine.github.io/country-flag-icons/3x2/${iso}.svg">
                            <span>${iso}</span>
                            <span class="count">${paises[iso]}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// --- UTILIDADES ---
function mostrarNotificacion(msj) {
    const t = document.createElement('div');
    t.className = 'toast-notification show';
    t.innerHTML = `<i class="fas fa-info-circle"></i> ${msj}`;
    document.body.appendChild(t);
    setTimeout(() => { t.classList.remove('show'); setTimeout(()=>t.remove(), 500); }, 2000);
}

function eliminarSerie(id) {
    if(!confirm("¿Eliminar de la colección?")) return;
    coleccionSeries = coleccionSeries.filter(s => s.id !== id);
    localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
    renderizarTodo();
    mostrarNotificacion("Serie eliminada");
}

function ampliarSerie(id) {
    const s = coleccionSeries.find(item => item.id == id);
    document.getElementById('img-ampliada').src = `https://image.tmdb.org/t/p/w500${s.poster_path}`;
    document.getElementById('modal-caption').innerHTML = `<h2>${s.name}</h2><p>${s.overview}</p>`;
    document.getElementById('photo-modal').classList.remove('hidden');
}

document.getElementById('modalCloseBtn').onclick = () => document.getElementById('photo-modal').classList.add('hidden');
