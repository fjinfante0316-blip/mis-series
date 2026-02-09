// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];

// 2. INICIALIZACIÓN AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    initMenu();
    if (coleccionSeries.length > 0) {
        renderizarTodo();
    }
});

// 3. MENÚ LATERAL (HAMBURGUESA)
function initMenu() {
    const btn = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');
    if (btn && side) {
        btn.onclick = (e) => {
            e.stopPropagation();
            side.classList.toggle('active');
        };
        document.onclick = (e) => {
            if (side.classList.contains('active') && !side.contains(e.target)) {
                side.classList.remove('active');
            }
        };
    }
}

// 4. NAVEGACIÓN ENTRE SECCIONES
function showSection(id) {
    const welcome = document.getElementById('welcome-screen');
    const mainApp = document.getElementById('main-app');
    
    // Ocultar todas las secciones
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

    // Activar funciones especiales según la sección
    if (id === 'stats') generarStats();
    if (id === 'timeline') generarCronologia();
    
    const side = document.getElementById('sidebar');
    if (side) side.classList.remove('active');
}

// 5. RENDERIZADO PRINCIPAL (COLECCIÓN, ACTORES Y CREADORES)
function renderizarTodo() {
    // --- Render de la Colección ---
    const seriesGrid = document.getElementById('series-grid');
    if (seriesGrid) {
        seriesGrid.innerHTML = coleccionSeries.map(s => `
            <div class="serie-group">
                <div class="serie-header" style="display:flex; justify-content:space-between; align-items:center; padding: 0 5px;">
                    <h4>${s.name}</h4>
                    <button onclick="eliminarSerie(${s.id})" style="background:none; border:none; color:gray; cursor:pointer;">
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
    }

    // --- Lógica de Actores (5 por serie sin repetir) y Creadores ---
    const actoresData = {};
    const idsActoresVistos = new Set();
    const creadoresData = {};

    coleccionSeries.forEach(s => {
        // Actores
        if (s.credits && s.credits.cast) {
            let count = 0;
            s.credits.cast.forEach(a => {
                if (count < 5 && !idsActoresVistos.has(a.id)) {
                    idsActoresVistos.add(a.id);
                    actoresData[a.id] = {
                        info: a,
                        trabajo: { poster: s.poster_path, char: a.character, id: s.id }
                    };
                    count++;
                }
            });
        }
        // Creadores
        if (s.created_by) {
            s.created_by.forEach(c => {
                if (!creadoresData[c.name]) {
                    creadoresData[c.name] = { info: c, trabajos: [] };
                }
                if (!creadoresData[c.name].trabajos.some(t => t.id === s.id)) {
                    creadoresData[c.name].trabajos.push({
                        poster: s.poster_path,
                        nombreSerie: s.name,
                        id: s.id
                    });
                }
            });
        }
    });

    // Inyectar Actores
    const actorsGrid = document.getElementById('actors-grid');
    if (actorsGrid) {
        actorsGrid.innerHTML = Object.values(actoresData).map(a => `
            <div class="actor-row">
                <div class="actor-info-side">
                    <img src="${a.info.profile_path ? 'https://image.tmdb.org/t/p/w200'+a.info.profile_path : 'https://via.placeholder.com/200'}" class="photo-circle">
                    <span class="person-name">${a.info.name}</span>
                </div>
                <div class="actor-series-carousel">
                    <div class="work-item" onclick="ampliarSerie(${a.trabajo.id})">
                        <img src="https://image.tmdb.org/t/p/w200${a.trabajo.poster}">
                        <div class="character-name">${a.trabajo.char}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Inyectar Creadores
    const directorsGrid = document.getElementById('directors-grid');
    if (directorsGrid) {
        directorsGrid.innerHTML = Object.values(creadoresData).map(c => `
            <div class="actor-row">
                <div class="actor-info-side">
                    <img src="${c.info.profile_path ? 'https://image.tmdb.org/t/p/w200'+c.info.profile_path : 'https://via.placeholder.com/200?text=Logo'}" class="photo-circle">
                    <span class="person-name">${c.info.name}</span>
                </div>
                <div class="actor-series-carousel">
                    ${c.trabajos.map(t => `
                        <div class="work-item" onclick="ampliarSerie(${t.id})">
                            <img src="https://image.tmdb.org/t/p/w200${t.poster}">
                            <div class="character-name">${t.nombreSerie}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }
}

// 6. ESTADÍSTICAS
function generarStats() {
    const area = document.getElementById('stats-area');
    if (!area) return;
    const generos = {};
    coleccionSeries.forEach(s => s.genres?.forEach(g => generos[g.name] = (generos[g.name] || 0) + 1));
    const sorted = Object.entries(generos).sort((a,b) => b[1]-a[1]);

    area.innerHTML = `
        <div class="stats-summary" style="display:flex; justify-content:center; gap:20px; margin-bottom:25px; text-align:center;">
            <div class="stat-card" style="background:#1a1a1a; padding:15px; border-radius:10px; min-width:80px;">
                <h3 style="color:red; margin:0;">${coleccionSeries.length}</h3><p style="margin:0; font-size:0.8rem;">Series</p>
            </div>
        </div>
        ${sorted.map(([name, count]) => `
            <div style="margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:4px;">
                    <span>${name}</span><span>${count}</span>
                </div>
                <div style="background:#333; height:6px; border-radius:3px; overflow:hidden;">
                    <div style="background:red; width:${(count/coleccionSeries.length)*100}%; height:100%;"></div>
                </div>
            </div>
        `).join('')}
    `;
}

// 7. CRONOLOGÍA
function generarCronologia() {
    const grid = document.getElementById('sec-timeline-grid');
    if (!grid) return;
    const ordenadas = [...coleccionSeries].sort((a,b) => new Date(b.first_air_date) - new Date(a.first_air_date));
    grid.innerHTML = ordenadas.map(s => `
        <div class="timeline-item" style="display:flex; align-items:center; gap:15px; margin-bottom:15px; background:#1a1a1a; padding:10px; border-radius:10px; cursor:pointer;" onclick="ampliarSerie(${s.id})">
            <div style="background:red; color:white; padding:5px 10px; border-radius:5px; font-weight:bold; font-size:0.8rem;">
                ${s.first_air_date?.split('-')[0] || '????'}
            </div>
            <div>
                <h4 style="margin:0; font-size:1rem;">${s.name}</h4>
                <p style="margin:0; font-size:0.7rem; color:gray;">${s.genres?.map(g=>g.name).slice(0,2).join(', ')}</p>
            </div>
        </div>
    `).join('');
}

// 8. BUSCADOR Y MODALES
async function buscarSeries() {
    const query = document.getElementById('initialInput').value;
    const resultsCont = document.getElementById('search-results-main');
    if (!query) return;

    try {
        const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`);
        const d = await r.json();
        window.ultimosResultados = d.results;

        resultsCont.innerHTML = d.results.slice(0, 10).map(s => `
            <div class="search-card" onclick="verSinopsisAntesDeAñadir(${s.id})">
                <img src="${s.poster_path ? 'https://image.tmdb.org/t/p/w200'+s.poster_path : 'https://via.placeholder.com/200x300?text=Sin+Poster'}">
                <div class="search-card-info"><h4>${s.name}</h4></div>
            </div>`).join('');
        resultsCont.classList.remove('hidden');
    } catch (e) { console.error(e); }
}

function verSinopsisAntesDeAñadir(id) {
    const s = window.ultimosResultados.find(x => x.id == id);
    if(!s) return;
    const modal = document.getElementById('photo-modal');
    document.getElementById('img-ampliada').src = `https://image.tmdb.org/t/p/w500${s.poster_path}`;
    document.getElementById('modal-caption').innerHTML = `
        <h2 style="margin-top:0;">${s.name}</h2>
        <p style="font-size:0.9rem; line-height:1.4;">${s.overview || 'Sin sinopsis disponible.'}</p>
        <button onclick="confirmarYVolver(${s.id})" style="width:100%; padding:12px; background:red; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer; margin-top:15px;">
            Añadir a mi Colección
        </button>`;
    modal.classList.remove('hidden');
}

async function confirmarYVolver(id) {
    if (coleccionSeries.some(s => s.id === id)) { alert("Ya tienes esta serie en tu colección."); return; }
    try {
        const r = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`);
        const serie = await r.json();
        coleccionSeries.push(serie);
        localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
        
        document.getElementById('photo-modal').classList.add('hidden');
        document.getElementById('search-results-main').classList.add('hidden');
        document.getElementById('initialInput').value = "";
        
        renderizarTodo();
        showSection('series');
    } catch (e) { console.error(e); }
}

function ampliarSerie(id) {
    const s = coleccionSeries.find(x => x.id == id);
    if(!s) return;
    document.getElementById('img-ampliada').src = `https://image.tmdb.org/t/p/w500${s.poster_path}`;
    document.getElementById('modal-caption').innerHTML = `<h2>${s.name}</h2><p>${s.overview || 'Sin sinopsis.'}</p>`;
    document.getElementById('photo-modal').classList.remove('hidden');
}

function ampliarTemporada(serieId, tNum) {
    const s = coleccionSeries.find(x => x.id == serieId);
    const t = s.seasons.find(x => x.season_number == tNum);
    document.getElementById('img-ampliada').src = `https://image.tmdb.org/t/p/w500${t.poster_path || s.poster_path}`;
    document.getElementById('modal-caption').innerHTML = `<h2>${t.name}</h2><p>${t.overview || 'Sin sinopsis disponible para esta temporada.'}</p>`;
    document.getElementById('photo-modal').classList.remove('hidden');
}

// Función para cerrar el modal
if (document.getElementById('modalCloseBtn')) {
    document.getElementById('modalCloseBtn').onclick = () => {
        document.getElementById('photo-modal').classList.add('hidden');
    };
}

function eliminarSerie(id) {
    if(confirm("¿Estás seguro de que quieres eliminar esta serie de tu colección?")) {
        coleccionSeries = coleccionSeries.filter(s => s.id !== id);
        localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
        renderizarTodo();
    }
}

// 9. FILTRADO (BUSCADOR INTERNO)
function filtrarContenido(tipo) {
    const query = document.getElementById(`filter-${tipo}`).value.toLowerCase();
    if (tipo === 'series') {
        document.querySelectorAll('#series-grid .serie-group').forEach(el => {
            const nombre = el.querySelector('h4').innerText.toLowerCase();
            el.style.display = nombre.includes(query) ? 'block' : 'none';
        });
    } else {
        const gridId = tipo === 'actors' ? 'actors-grid' : 'directors-grid';
        document.querySelectorAll(`#${gridId} .actor-row`).forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(query) ? 'flex' : 'none';
        });
    }
}
