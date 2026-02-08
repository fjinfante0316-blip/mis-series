const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';

let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];

// --- INICIO ---
window.onload = () => {
    initMenu();
    if (coleccionSeries.length > 0) showSection('series');
};

function initMenu() {
    const btn = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');
    if(btn) btn.onclick = (e) => { e.stopPropagation(); side.classList.toggle('active'); };
    document.onclick = (e) => { if(side && !side.contains(e.target)) side.classList.remove('active'); };
}

// --- NAVEGACIÓN ---
function showSection(id) {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    
    // Ocultar todas
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    
    // Mostrar objetivo
    const target = document.getElementById(`sec-${id}`);
    if(target) target.classList.remove('hidden');

    if (id === 'stats') generarStats();
    if (id === 'timeline') generarCronologia();
    if (id === 'series' || id === 'actors' || id === 'directors') renderizarTodo();
}

// --- BÚSQUEDA ---
async function buscarYAñadir(esInicio) {
    const input = document.getElementById(esInicio ? 'initialInput' : 'serieInput');
    const query = input.value;
    if (!query) return;

    const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`);
    const d = await r.json();
    
    const resultsCont = document.getElementById('search-results');
    resultsCont.innerHTML = d.results.slice(0,5).map(s => `
        <div class="result-item" onclick="confirmarSeleccion(${s.id})">
            <img src="https://image.tmdb.org/t/p/w200${s.poster_path}">
            <span>${s.name} (${s.first_air_date?.split('-')[0]})</span>
        </div>
    `).join('');
    resultsCont.classList.remove('hidden');
}

async function confirmarSeleccion(id) {
    document.getElementById('search-results').classList.add('hidden');
    const r = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`);
    const serie = await r.json();
    
    // Simplificamos reparto
    serie.repartoEspecial = serie.credits.cast.slice(0, 15);
    
    coleccionSeries.push(serie);
    localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
    mostrarNotificacion("Serie añadida con éxito");
    showSection('series');
}

// --- RENDERIZADO ---
function renderizarTodo() {
    // Series
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <div class="serie-group">
            <button class="btn-delete" onclick="eliminarSerie(${s.id})">×</button>
            <div class="serie-title-tag">${s.name}</div>
            <div class="seasons-carousel">
                <img src="https://image.tmdb.org/t/p/w500${s.poster_path}" onclick="ampliarSerie(${s.id})">
            </div>
        </div>
    `).join('');

    // Actores y Creadores (Lógica de filas que pediste)
    const actores = {};
    coleccionSeries.forEach(s => {
        s.repartoEspecial.forEach(a => {
            if(!actores[a.id]) actores[a.id] = { info: a, series: [] };
            actores[a.id].series.push(s.poster_path);
        });
    });

    document.getElementById('actors-grid').innerHTML = Object.values(actores)
        .sort((a,b) => b.series.length - a.series.length)
        .slice(0,20).map(a => `
        <div class="actor-row">
            <div class="actor-info-side">
                <img src="https://image.tmdb.org/t/p/w200${a.info.profile_path}" class="photo-circle">
                <span>${a.info.name}</span>
            </div>
            <div class="actor-series-carousel">
                ${a.series.map(p => `<img src="https://image.tmdb.org/t/p/w200${p}">`).join('')}
            </div>
        </div>
    `).join('');
}

// --- CRONOLOGÍA ---
function generarCronologia() {
    const container = document.getElementById('sec-timeline-grid');
    const ordenadas = [...coleccionSeries].sort((a,b) => a.first_air_date.localeCompare(b.first_air_date));
    container.innerHTML = ordenadas.map(s => `
        <div class="timeline-item">
            <div class="timeline-date">${s.first_air_date.split('-')[0]}</div>
            <div class="timeline-content">
                <img src="https://image.tmdb.org/t/p/w200${s.poster_path}">
                <div><h4>${s.name}</h4><p>${s.origin_country[0] || '?'}</p></div>
            </div>
        </div>
    `).join('');
}

// --- ESTADÍSTICAS Y BANDERAS ---
function generarStats() {
    const paises = {};
    coleccionSeries.forEach(s => {
        if(s.origin_country?.[0]) {
            paises[s.origin_country[0]] = (paises[s.origin_country[0]] || 0) + 1;
        }
    });

    let banderasHTML = Object.keys(paises).map(iso => `
        <div class="flag-card">
            <img src="https://purecatamphetamine.github.io/country-flag-icons/3x2/${iso}.svg" class="flag-img">
            <span>${paises[iso]}</span>
        </div>
    `).join('');

    document.getElementById('stats-area').innerHTML = `
        <div class="paises-section">
            <h3>Geografía de tus Series</h3>
            <div class="flags-container">${banderasHTML}</div>
        </div>
    `;
}

function mostrarNotificacion(msj) {
    const t = document.createElement('div');
    t.className = 'toast-notification show';
    t.innerHTML = msj;
    document.body.appendChild(t);
    setTimeout(() => { t.classList.remove('show'); setTimeout(()=>t.remove(), 500); }, 2000);
}

function eliminarSerie(id) {
    coleccionSeries = coleccionSeries.filter(s => s.id !== id);
    localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
    renderizarTodo();
    mostrarNotificacion("Serie eliminada");
}
