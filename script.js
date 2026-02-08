const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';

let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];

// --- INICIO ---
window.onload = () => {
    initMenu();
    if (coleccionSeries.length > 0) {
        renderizarTodo();
    }
};

function initMenu() {
    const btn = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');
    btn.onclick = (e) => { e.stopPropagation(); side.classList.toggle('active'); };
    document.onclick = (e) => { if(side.classList.contains('active') && !side.contains(e.target)) side.classList.remove('active'); };
}

// --- NAVEGACIÓN ---
function showSection(id) {
    const welcome = document.getElementById('welcome-screen');
    const mainApp = document.getElementById('main-app');
    
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));

    if (id === 'welcome') {
        welcome.classList.remove('hidden');
        mainApp.classList.add('hidden');
    } else {
        welcome.classList.add('hidden');
        mainApp.classList.remove('hidden');
        const target = document.getElementById(`sec-${id}`);
        if (target) target.classList.remove('hidden');
    }

    if (id === 'stats') generarStats();
    if (id === 'timeline') generarCronologia();
    
    document.getElementById('sidebar').classList.remove('active');
}

// --- BÚSQUEDA EN PORTADA ---
async function buscarSeries() {
    const query = document.getElementById('initialInput').value;
    const resultsCont = document.getElementById('search-results-main');
    if (!query) return;

    try {
        const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`);
        const d = await r.json();
        
        resultsCont.innerHTML = d.results.slice(0, 10).map(s => `
            <div class="search-card" onclick="confirmarYVolver(${s.id})">
                <img src="${s.poster_path ? 'https://image.tmdb.org/t/p/w200' + s.poster_path : 'https://via.placeholder.com/200x300'}">
                <div class="search-card-info">
                    <h4>${s.name}</h4>
                    <span>${s.first_air_date ? s.first_air_date.split('-')[0] : 'N/A'}</span>
                </div>
            </div>
        `).join('');
        resultsCont.classList.remove('hidden');
    } catch (e) { console.error(e); }
}

async function confirmarYVolver(id) {
    if (coleccionSeries.some(s => s.id === id)) {
        alert("Ya tienes esta serie en tu colección.");
        return;
    }

    const r = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`);
    const serie = await r.json();
    
    coleccionSeries.push(serie);
    localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
    
    document.getElementById('initialInput').value = "";
    document.getElementById('search-results-main').classList.add('hidden');
    
    renderizarTodo();
    alert(`"${serie.name}" añadida correctamente.`);
}

// --- RENDERIZADO ---
function renderizarTodo() {
    // Series
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <div class="serie-group" style="margin-bottom:30px">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
                <span style="font-weight:bold; color:var(--rojo)">${s.name}</span>
                <button onclick="eliminarSerie(${s.id})" style="background:none; border:none; color:#555; cursor:pointer"><i class="fas fa-trash"></i></button>
            </div>
            <div class="seasons-carousel">
                ${s.seasons.map(t => `
                    <div class="season-card" onclick="ampliarSerie(${s.id})">
                        <img src="https://image.tmdb.org/t/p/w300${t.poster_path || s.poster_path}">
                        <div style="font-size:0.7rem; margin-top:5px">${t.name}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    // Actores y Creadores
    const actoresData = {};
    const creadoresData = {};

    coleccionSeries.forEach(s => {
        // Recolección de Actores con Personaje
        s.credits?.cast?.slice(0, 10).forEach(a => {
            if(!actoresData[a.id]) actoresData[a.id] = { info: a, trabajos: [] };
            // Guardamos el poster y el personaje
            actoresData[a.id].trabajos.push({ 
                poster: s.poster_path, 
                personaje: a.character,
                serieNombre: s.name 
            });
        });

        // Recolección de Creadores
        s.created_by?.forEach(c => {
            if(!creadoresData[c.name]) creadoresData[c.name] = { info: c, trabajos: [] };
            creadoresData[c.name].trabajos.push({ 
                poster: s.poster_path, 
                serieNombre: s.name 
            });
        });
    });

    const renderFilas = (data, esActor) => Object.values(data)
        .sort((a, b) => b.trabajos.length - a.trabajos.length)
        .map(p => `
        <div class="actor-row">
            <div class="actor-info-side">
                <img src="${p.info.profile_path ? 'https://image.tmdb.org/t/p/w200'+p.info.profile_path : 'https://via.placeholder.com/200x200?text=👤'}" class="photo-circle">
                <span class="person-name">${p.info.name}</span>
                <span class="badge-series">${p.trabajos.length} ${p.trabajos.length === 1 ? 'Proyecto' : 'Proyectos'}</span>
            </div>
            
            <div class="actor-series-carousel">
                ${p.trabajos.map(t => `
                    <div class="work-item">
                        <img src="https://image.tmdb.org/t/p/w200${t.poster}" alt="${t.serieNombre}">
                        <div class="character-name">${esActor ? t.personaje : t.serieNombre}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    document.getElementById('actors-grid').innerHTML = renderFilas(actoresData, true);
    document.getElementById('directors-grid').innerHTML = renderFilas(creadoresData, false);
}

// --- CRONOLOGÍA ---
function generarCronologia() {
    const container = document.getElementById('sec-timeline-grid');
    const ordenadas = [...coleccionSeries].sort((a,b) => (b.first_air_date || "").localeCompare(a.first_air_date || ""));
    container.innerHTML = ordenadas.map(s => `
        <div class="timeline-item">
            <div class="timeline-date">${s.first_air_date?.split('-')[0] || 'N/A'}</div>
            <div class="timeline-content" onclick="ampliarSerie(${s.id})">
                <img src="https://image.tmdb.org/t/p/w200${s.poster_path}">
                <div><h4 style="margin:0">${s.name}</h4><small>${s.number_of_seasons} Temporadas</small></div>
            </div>
        </div>
    `).join('');
}

// --- STATS ---
function generarStats() {
    let min = 0; let eps = 0;
    const paises = {}; const generos = {};
    coleccionSeries.forEach(s => {
        min += (s.episode_run_time?.[0] || 45) * s.number_of_episodes;
        eps += s.number_of_episodes;
        if(s.origin_country?.[0]) paises[s.origin_country[0]] = (paises[s.origin_country[0]] || 0) + 1;
        if(s.genres?.[0]) generos[s.genres[0].name] = (generos[s.genres[0].name] || 0) + 1;
    });

    const colores = ['#e50914', '#564d4d', '#b9090b', '#f5f5f1', '#ff0000'];
    let ac = 0;
    const grad = Object.keys(generos).map((g,i) => {
        const p = (generos[g] / coleccionSeries.length) * 100;
        const s = `${colores[i%5]} ${ac}% ${ac+p}%`; ac+=p; return s;
    }).join(',');

    document.getElementById('stats-area').innerHTML = `
        <div class="stats-dashboard">
            <div class="stat-card-premium"><h3>${Math.floor(min/60)}</h3><span>Horas</span></div>
            <div class="stat-card-premium"><h3>${eps}</h3><span>Episodios</span></div>
            <div class="stat-card-premium"><h3>${coleccionSeries.length}</h3><span>Series</span></div>
        </div>
        <div id="genero-chart" style="background: conic-gradient(${grad})"></div>
        <div style="text-align:center">
            ${Object.keys(paises).map(iso => `
                <div class="flag-pill"><img src="https://purecatamphetamine.github.io/country-flag-icons/3x2/${iso}.svg"> ${iso} <b>${paises[iso]}</b></div>
            `).join('')}
        </div>
    `;
}

// --- UTILIDADES ---
function eliminarSerie(id) {
    if(!confirm("¿Borrar serie?")) return;
    coleccionSeries = coleccionSeries.filter(s => s.id !== id);
    localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
    renderizarTodo();
}

function ampliarSerie(id) {
    const s = coleccionSeries.find(x => x.id == id);
    document.getElementById('img-ampliada').src = `https://image.tmdb.org/t/p/w500${s.poster_path}`;
    document.getElementById('modal-caption').innerHTML = `<h2>${s.name}</h2><p>${s.overview}</p>`;
    document.getElementById('photo-modal').classList.remove('hidden');
}

document.getElementById('modalCloseBtn').onclick = () => document.getElementById('photo-modal').classList.add('hidden');

function exportarDatos() {
    const data = JSON.stringify(coleccionSeries);
    const blob = new Blob([data], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = "mis_series.json"; a.click();
}
