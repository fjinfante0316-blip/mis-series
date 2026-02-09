const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];

// --- 1. INICIALIZACIÓN DE BOTONES Y MENÚ ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado");
    initMenu();
    if (coleccionSeries.length > 0) renderizarTodo();
});

function initMenu() {
    const btn = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');

    if (btn && side) {
        btn.onclick = (e) => {
            e.stopPropagation();
            side.classList.toggle('active');
            console.log("Menú activado");
        };

        document.onclick = (e) => {
            if (side.classList.contains('active') && !side.contains(e.target)) {
                side.classList.remove('active');
            }
        };
    }
}

// --- 2. NAVEGACIÓN ---
function showSection(id) {
    console.log("Cambiando a sección:", id);
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
    document.getElementById('sidebar').classList.remove('active');
}
// 3. BÚSQUEDA Y PORTADA
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
        <h2>${s.name}</h2><p>${s.overview || 'Sin sinopsis disponible.'}</p>
        <button onclick="confirmarYVolver(${s.id})" class="btn-menu" style="position:static; width:100%; margin-top:10px; background:var(--rojo);">Añadir a mi Lista</button>`;
    modal.classList.remove('hidden');
}

async function confirmarYVolver(id) {
    if (coleccionSeries.some(s => s.id === id)) { alert("Ya la tienes."); return; }
    const r = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`);
    const serie = await r.json();
    coleccionSeries.push(serie);
    localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
    document.getElementById('photo-modal').classList.add('hidden');
    document.getElementById('search-results-main').classList.add('hidden');
    document.getElementById('initialInput').value = "";
    renderizarTodo();
    showSection('series');
}

// 4. RENDERIZADO (SERIES, ACTORES, CREADORES)
function renderizarTodo() {
    // 1. RENDER DE SERIES (MI COLECCIÓN)
    const seriesGrid = document.getElementById('series-grid');
    if (seriesGrid) {
        seriesGrid.innerHTML = coleccionSeries.map(s => `
            <div class="serie-group">
                <div class="serie-header">
                    <h4>${s.name}</h4>
                    <button onclick="eliminarSerie(${s.id})"><i class="fas fa-trash"></i></button>
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

    // 2. LÓGICA DE ACTORES (5 POR SERIE SIN REPETIR)
    const actoresData = {};
    const idsActoresVistos = new Set();

    coleccionSeries.forEach(s => {
        if (s.credits && s.credits.cast) {
            let count = 0;
            s.credits.cast.forEach(actor => {
                if (count < 5 && !idsActoresVistos.has(actor.id)) {
                    idsActoresVistos.add(actor.id);
                    actoresData[actor.id] = {
                        info: actor,
                        trabajo: { poster: s.poster_path, char: actor.character, id: s.id }
                    };
                    count++;
                }
            });
        }
    });

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

    // 3. LÓGICA DE CREADORES
    const creadoresData = {};

    coleccionSeries.forEach(s => {
        if (s.created_by && s.created_by.length > 0) {
            s.created_by.forEach(c => {
                if (!creadoresData[c.name]) {
                    creadoresData[c.name] = { info: c, trabajos: [] };
                }
                if (!creadoresData[c.name].trabajos.some(t => t.id === s.id)) {
                    creadoresData[c.name].trabajos.push({
                        poster: s.poster_path,
                        serieNombre: s.name,
                        id: s.id
                    });
                }
            });
        }
    });

    const directorsGrid = document.getElementById('directors-grid');
    if (directorsGrid) {
        directorsGrid.innerHTML = Object.values(creadoresData).map(c => `
            <div class="actor-row">
                <div class="actor-info-side">
                    <img src="${c.info.profile_path ? 'https://image.tmdb.org/t/p/w200' + c.info.profile_path : 'https://via.placeholder.com/200?text=Logo'}" class="photo-circle">
                    <span class="person-name">${c.info.name}</span>
                </div>
                <div class="actor-series-carousel">
                    ${c.trabajos.map(t => `
                        <div class="work-item" onclick="ampliarSerie(${t.id})">
                            <img src="https://image.tmdb.org/t/p/w200${t.poster}">
                            <div class="character-name">${t.serieNombre}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }
} // <--- ESTA LLAVE CIERRA TODA LA FUNCIÓN
// 5. UTILIDADES (MODAL, ELIMINAR, FILTROS)
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
    document.getElementById('modal-caption').innerHTML = `<h2>${t.name}</h2><p>${t.overview || 'Sin sinopsis disponible.'}</p>`;
    document.getElementById('photo-modal').classList.remove('hidden');
}

document.getElementById('modalCloseBtn').onclick = () => document.getElementById('photo-modal').classList.add('hidden');

function eliminarSerie(id) {
    if(confirm("¿Eliminar serie?")) {
        coleccionSeries = coleccionSeries.filter(s => s.id !== id);
        localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
        renderizarTodo();
    }
}

function filtrarContenido(tipo) {
    const query = document.getElementById(`filter-${tipo}`).value.toLowerCase();
    if (tipo === 'series') {
        document.querySelectorAll('#series-grid .serie-group').forEach(el => {
            el.style.display = el.querySelector('h4').innerText.toLowerCase().includes(query) ? 'block' : 'none';
        });
    } else {
        const grid = tipo === 'actors' ? 'actors-grid' : 'directors-grid';
        document.querySelectorAll(`#${grid} .actor-row`).forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(query) ? 'flex' : 'none';
        });
    }
}

function exportarDatos() {
    const blob = new Blob([JSON.stringify(coleccionSeries)], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = "mis_series.json"; a.click();
}

function importarDatos(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            coleccionSeries = JSON.parse(event.target.result);
            localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
            renderizarTodo();
            alert("¡Importado!");
        } catch(err) { alert("Error en el archivo."); }
    };
    reader.readAsText(e.target.files[0]);
}

function generarStats() {
    const statsArea = document.getElementById('stats-area');
    if (!statsArea) return;

    if (coleccionSeries.length === 0) {
        statsArea.innerHTML = "<p>Añade series para ver tus estadísticas.</p>";
        return;
    }

    const generos = {};
    let totalEpisodios = 0;

    coleccionSeries.forEach(s => {
        // Contar Géneros
        s.genres?.forEach(g => {
            generos[g.name] = (generos[g.name] || 0) + 1;
        });
        // Sumar capítulos totales
        totalEpisodios += s.number_of_episodes || 0;
    });

    const sortGeneros = Object.entries(generos).sort((a, b) => b[1] - a[1]);

    statsArea.innerHTML = `
        <div class="stats-summary">
            <div class="stat-card"><h3>${coleccionSeries.length}</h3><p>Series</p></div>
            <div class="stat-card"><h3>${totalEpisodios}</h3><p>Episodios</p></div>
        </div>
        <h3>Tus Géneros Favoritos</h3>
        <div class="genres-chart">
            ${sortGeneros.map(([name, count]) => {
                const porcentaje = (count / coleccionSeries.length) * 100;
                return `
                    <div class="genre-bar-container">
                        <div class="genre-info"><span>${name}</span><span>${count}</span></div>
                        <div class="genre-bar-bg"><div class="genre-bar-fill" style="width:${porcentaje}%"></div></div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function generarCronologia() {
    const timelineGrid = document.getElementById('sec-timeline-grid');
    if (!timelineGrid) return;

    if (coleccionSeries.length === 0) {
        timelineGrid.innerHTML = "<p>No hay datos para mostrar la cronología.</p>";
        return;
    }

    // Ordenar series por fecha de estreno
    const seriesOrdenadas = [...coleccionSeries].sort((a, b) => {
        return new Date(b.first_air_date) - new Date(a.first_air_date);
    });

    timelineGrid.innerHTML = seriesOrdenadas.map(s => `
        <div class="timeline-item">
            <div class="timeline-date">${s.first_air_date ? s.first_air_date.split('-')[0] : '???'}</div>
            <div class="timeline-content" onclick="ampliarSerie(${s.id})">
                <img src="https://image.tmdb.org/t/p/w200${s.poster_path}" alt="${s.name}">
                <div>
                    <h4>${s.name}</h4>
                    <p>${s.genres?.map(g => g.name).slice(0, 2).join(', ')}</p>
                </div>
            </div>
        </div>
    `).join('');
}
