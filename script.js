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
        
        // Guardamos los resultados temporalmente para poder leer la sinopsis sin volver a llamar a la API
        window.ultimosResultadosBusqueda = d.results;

        resultsCont.innerHTML = d.results.slice(0, 10).map(s => `
            <div class="search-card" onclick="verSinopsisAntesDeAñadir(${s.id})">
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

function verSinopsisAntesDeAñadir(id) {
    const serie = window.ultimosResultadosBusqueda.find(x => x.id == id);
    if (!serie) return;

    const modal = document.getElementById('photo-modal');
    const img = document.getElementById('img-ampliada');
    const caption = document.getElementById('modal-caption');

    img.src = `https://image.tmdb.org/t/p/w500${serie.poster_path}`;
    
    // Insertamos la sinopsis y un botón de "Añadir a mi lista" dentro del modal
    caption.innerHTML = `
        <h2 style="color:var(--rojo); margin-bottom:10px;">${serie.name}</h2>
        <p style="font-size:0.9rem; line-height:1.4; margin-bottom:20px;">${serie.overview || "No hay sinopsis disponible en español."}</p>
        <button onclick="confirmarYVolver(${serie.id})" class="btn-nav" style="background:var(--rojo); border:none; width:100%;">
            <i class="fas fa-plus"></i> Añadir a mi colección
        </button>
    `;

    modal.classList.remove('hidden');
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
    
    // Limpieza
    document.getElementById('initialInput').value = "";
    document.getElementById('search-results-main').classList.add('hidden');
    document.getElementById('photo-modal').classList.add('hidden'); // Cerramos modal
    
    renderizarTodo();
    alert(`"${serie.name}" añadida correctamente.`);
}
// --- RENDERIZADO ---
function renderizarTodo() {
    // Series
    // Busca esta parte en tu función renderizarTodo() y actualízala:
document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
    <div class="serie-group">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:0 5px;">
            <h4 style="margin:0; font-size:0.95rem;">${s.name}</h4>
            <button onclick="eliminarSerie(${s.id})" style="background:none; border:none; color:#444; font-size:0.8rem; cursor:pointer;">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <div class="seasons-carousel">
            ${s.seasons.map(t => `
                <div class="season-card" onclick="ampliarTemporada(${s.id}, ${t.season_number})">
                    <img src="https://image.tmdb.org/t/p/w200${t.poster_path || s.poster_path}">
                    <p>${t.name}</p>
                </div>
            `).join('')}
        </div>
    </div>
`).join('');

    const actorsGrid = document.getElementById('actors-grid');
    if (actorsGrid) {
        actorsGrid.innerHTML = renderFilas(actoresData, true);
    }

    const directorsGrid = document.getElementById('directors-grid');
    if (directorsGrid) {
        directorsGrid.innerHTML = renderFilas(creadoresData, false);
    }
}
    
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
    .map(p => {
        // Filtrar trabajos únicos por poster para evitar duplicados visuales
        const trabajosUnicos = [];
        const m = new Map();
        for (const t of p.trabajos) {
            if (!m.has(t.poster)) {
                m.set(t.poster, true);
                trabajosUnicos.push(t);
            }
        }

        return `
        <div class="actor-row">
            <div class="actor-info-side">
                <img src="${p.info.profile_path ? 'https://image.tmdb.org/t/p/w200'+p.info.profile_path : 'https://via.placeholder.com/200x200?text=👤'}" class="photo-circle">
                <span class="person-name">${p.info.name}</span>
                <span class="badge-series">${trabajosUnicos.length} ${trabajosUnicos.length === 1 ? 'Proyecto' : 'Proyectos'}</span>
            </div>
            
            <div class="actor-series-carousel">
                ${trabajosUnicos.map(t => {
                    // Buscamos el ID de la serie en nuestra colección para poder abrir la sinopsis
                    const serieOriginal = coleccionSeries.find(s => s.poster_path === t.poster);
                    const clickAction = serieOriginal ? `onclick="ampliarSerie(${serieOriginal.id})"` : "";
                    
                    return `
                    <div class="work-item" ${clickAction} style="cursor:pointer">
                        <img src="https://image.tmdb.org/t/p/w200${t.poster}" alt="${t.serieNombre}">
                        <div class="character-name">${esActor ? t.personaje : t.serieNombre}</div>
                    </div>
                `}).join('')}
            </div>
        </div>
    `; }).join('');

    document.getElementById('actors-grid').innerHTML = renderFilas(actoresData, true);
    document.getElementById('directors-grid').innerHTML = renderFilas(creadoresData, false);
}

// --- FUNCIÓN PARA VER SINOPSIS DE TEMPORADA ---
function ampliarTemporada(serieId, temporadaN) {
    const s = coleccionSeries.find(x => x.id == serieId);
    if (!s) return;

    const temp = s.seasons.find(t => t.season_number == temporadaN);
    if (!temp) return;

    const modal = document.getElementById('photo-modal');
    const img = document.getElementById('img-ampliada');
    const caption = document.getElementById('modal-caption');

    img.src = `https://image.tmdb.org/t/p/w500${temp.poster_path || s.poster_path}`;
    
    caption.innerHTML = `
        <h4 style="color:var(--rojo); margin:0;">${s.name}</h4>
        <h2 style="margin:5px 0 15px 0;">${temp.name}</h2>
        <div style="background:rgba(255,255,255,0.1); padding:10px; border-radius:8px; margin-bottom:15px; font-size:0.8rem; display:flex; justify-content:space-around;">
            <span><i class="fas fa-calendar"></i> ${temp.air_date ? temp.air_date.split('-')[0] : 'N/A'}</span>
            <span><i class="fas fa-video"></i> ${temp.episode_count} Episodios</span>
        </div>
        <p style="font-size:0.95rem; line-height:1.5;">${temp.overview || "Esta temporada no tiene una sinopsis específica cargada, pero sigue la trama principal de la serie."}</p>
    `;

    modal.classList.remove('hidden');
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
    if (!s) return;

    const modal = document.getElementById('photo-modal');
    const img = document.getElementById('img-ampliada');
    const caption = document.getElementById('modal-caption');

    img.src = `https://image.tmdb.org/t/p/w500${s.poster_path}`;
    
    // Mostramos título, año y sinopsis
    caption.innerHTML = `
        <h2 style="color:var(--rojo); margin-bottom:5px;">${s.name}</h2>
        <p style="color:#888; margin-bottom:15px; font-weight:bold;">${s.first_air_date ? s.first_air_date.split('-')[0] : 'N/A'}</p>
        <p style="font-size:0.95rem; line-height:1.5;">${s.overview || "Sin sinopsis disponible."}</p>
    `;

    modal.classList.remove('hidden');
}

document.getElementById('modalCloseBtn').onclick = () => document.getElementById('photo-modal').classList.add('hidden');

function exportarDatos() {
    const data = JSON.stringify(coleccionSeries);
    const blob = new Blob([data], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = "mis_series.json"; a.click();
}

function importarDatos(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    
    lector.onload = function(e) {
        try {
            const contenido = JSON.parse(e.target.result);
            
            // Validación mínima: ¿es un array?
            if (Array.isArray(contenido)) {
                if (confirm(`Se van a importar ${contenido.length} series. Esto sobrescribirá tu lista actual. ¿Continuar?`)) {
                    coleccionSeries = contenido;
                    localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
                    
                    // Refrescar la interfaz
                    renderizarTodo();
                    if (typeof generarStats === "function") generarStats();
                    if (typeof generarCronologia === "function") generarCronologia();
                    
                    alert("¡Datos importados con éxito!");
                    showSection('series'); // Te lleva a ver tu nueva lista
                }
            } else {
                alert("El archivo no tiene el formato correcto.");
            }
        } catch (err) {
            alert("Error al leer el archivo JSON.");
            console.error(err);
        }
    };

    lector.readAsText(archivo);
}

function filtrarContenido(tipo) {
    const query = document.getElementById(`filter-${tipo}`).value.toLowerCase();
    
    if (tipo === 'series') {
        const elementos = document.querySelectorAll('#series-grid .serie-group');
        elementos.forEach(el => {
            const nombre = el.querySelector('h4').innerText.toLowerCase();
            el.style.display = nombre.includes(query) ? 'block' : 'none';
        });
    } 
    
    else if (tipo === 'actors' || tipo === 'directors') {
        const gridId = tipo === 'actors' ? 'actors-grid' : 'directors-grid';
        const filas = document.querySelectorAll(`#${gridId} .actor-row`);
        
        filas.forEach(fila => {
            const nombrePersona = fila.querySelector('.person-name').innerText.toLowerCase();
            // También buscamos en los personajes interpretados
            const personajes = fila.querySelector('.actor-series-carousel').innerText.toLowerCase();
            
            if (nombrePersona.includes(query) || personajes.includes(query)) {
                fila.style.display = 'flex';
            } else {
                fila.style.display = 'none';
            }
        });
    }
}
