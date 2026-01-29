const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
let coleccionSeries = [];

// ELEMENTOS DEL DOM
const sidebar = document.getElementById('sidebar');
const btnMenu = document.getElementById('sidebarCollapse');
const headerSearch = document.getElementById('mini-search');
const modal = document.getElementById('photo-modal');
const closeBtn = document.getElementById('modalCloseBtn');
const resultsContainer = document.getElementById('search-results');

// --- 1. CONTROL DEL MENÚ LATERAL ---
if (btnMenu) {
    btnMenu.onclick = (e) => { 
        e.stopPropagation(); 
        sidebar.classList.toggle('active'); 
    };
}

document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('active') && !sidebar.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});

// --- 2. GESTIÓN DE SECCIONES ---
function showSection(id) {
    const welcome = document.getElementById('welcome-screen');
    const mainApp = document.getElementById('main-app');
    const btnVolver = document.getElementById('btn-volver');

    if (id === 'welcome') {
        welcome.classList.remove('hidden');
        mainApp.classList.add('hidden');
        headerSearch.classList.add('hidden');
        if (coleccionSeries.length > 0) btnVolver.classList.remove('hidden');
    } else {
        welcome.classList.add('hidden');
        mainApp.classList.remove('hidden');
        headerSearch.classList.remove('hidden');
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        document.getElementById(`sec-${id}`).classList.remove('hidden');
    }
    sidebar.classList.remove('active');
    if (id === 'stats') generarStats();
}

// --- 3. BÚSQUEDA CON SELECCIÓN (SOLUCIÓN AL BOTÓN) ---
async function buscarYAñadir(esInicio) {
    const inputId = esInicio ? 'initialInput' : 'serieInput';
    const inputElement = document.getElementById(inputId);
    const query = inputElement.value;
    
    if (!query) return;

    try {
        const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`);
        const d = await r.json();
        
        if (d.results && d.results.length > 0) {
            // Mostrar lista de resultados para elegir
            resultsContainer.innerHTML = d.results.slice(0, 5).map(s => `
                <div class="result-item" onclick="confirmarSeleccion(${s.id})">
                    <img src="${s.poster_path ? 'https://image.tmdb.org/t/p/w200' + s.poster_path : 'https://via.placeholder.com/200x300'}" alt="${s.name}">
                    <div class="result-info">
                        <h4>${s.name}</h4>
                        <p>${s.first_air_date ? s.first_air_date.substring(0,4) : 'Sin fecha'}</p>
                    </div>
                </div>
            `).join('');
            resultsContainer.classList.remove('hidden');
        } else {
            alert("No se encontraron series con ese nombre.");
        }
    } catch (e) {
        console.error("Error en la búsqueda:", e);
    }
}

// --- 4. CONFIRMAR Y AÑADIR (CON ACTORES POR TEMPORADA) ---
async function confirmarSeleccion(serieId) {
    resultsContainer.classList.add('hidden');
    if (coleccionSeries.some(s => s.id === serieId)) {
        alert("Esta serie ya está en tu colección.");
        return;
    }

    try {
        // 1. Datos básicos
        const det = await fetch(`https://api.themoviedb.org/3/tv/${serieId}?api_key=${API_KEY}&language=es-ES`);
        let serie = await det.json();

        // 2. Actores por temporada (5 x temp sin repetir)
        serie.repartoEspecial = [];
        const actoresVistos = new Set();
        const numTemps = Math.min(serie.number_of_seasons, 5);

        for (let i = 1; i <= numTemps; i++) {
            try {
                const resT = await fetch(`https://api.themoviedb.org/3/tv/${serieId}/season/${i}/credits?api_key=${API_KEY}&language=es-ES`);
                const dataT = await resT.json();
                if (dataT.cast) {
                    let añadidos = 0;
                    for (let actor of dataT.cast) {
                        if (!actoresVistos.has(actor.id) && añadidos < 5) {
                            actoresVistos.add(actor.id);
                            serie.repartoEspecial.push(actor);
                            añadidos++;
                        }
                    }
                }
            } catch (err) { console.warn(`Error en T${i}`); }
        }

        coleccionSeries.push(serie);
        renderizarTodo();
        showSection('series');
        document.getElementById('initialInput').value = "";
        document.getElementById('serieInput').value = "";
    } catch (e) {
        console.error("Error al obtener detalles:", e);
    }
}

// --- 5. RENDERIZADO (CARRUSELES AGRUPADOS) ---
function renderizarTodo() {
    // Series
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <div class="serie-group">
            <button class="btn-delete-serie" onclick="eliminarSerie('${s.id}')"><i class="fas fa-trash"></i></button>
            <div class="serie-title-tag">${s.name}</div>
            <div class="seasons-carousel">
                ${s.seasons.map(t => `
                    <div class="season-card" onclick="ampliarSerie('${s.id}')">
                        <img src="https://image.tmdb.org/t/p/w500${t.poster_path || s.poster_path}">
                        <div class="season-number">${t.name}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    // Agrupación de Actores para Carrusel
    const actoresAgrupados = {};
    coleccionSeries.forEach(s => {
        s.repartoEspecial.forEach(a => {
            if (!actoresAgrupados[a.id]) {
                actoresAgrupados[a.id] = { info: a, trabajos: [] };
            }
            if (!actoresAgrupados[a.id].trabajos.some(t => t.serieId === s.id)) {
                actoresAgrupados[a.id].trabajos.push({ 
                    serieId: s.id, 
                    poster: s.poster_path, 
                    personaje: a.character || 'Desconocido' 
                });
            }
        });
    });

    const actorsGrid = document.getElementById('actors-grid');
    actorsGrid.className = "grid-people seasons-carousel"; 
    actorsGrid.innerHTML = Object.values(actoresAgrupados).map(a => {
        const personajes = a.trabajos.map(t => t.personaje).join(' / ');
        const postersHTML = a.trabajos.map(t => `
            <img class="mini-serie-poster" src="https://image.tmdb.org/t/p/w200${t.poster}" onclick="ampliarSerie('${t.serieId}')">
        `).join('');
        
        return `
            <div class="person-card">
                <img class="photo-circle" src="${a.info.profile_path ? 'https://image.tmdb.org/t/p/w200'+a.info.profile_path : 'https://via.placeholder.com/200'}" 
                     onclick="ampliarFoto('https://image.tmdb.org/t/p/w500${a.info.profile_path}', '${a.info.name}', '${personajes}')">
                <span class="person-name">${a.info.name}</span>
                <div class="mini-posters-container">${postersHTML}</div>
            </div>`;
    }).join('');

    const creadoresAgrupados = {};
    coleccionSeries.forEach(s => {
        if (s.created_by) {
            s.created_by.forEach(c => {
                // Usamos el nombre como clave porque no todos tienen ID de persona único
                if (!creadoresAgrupados[c.name]) {
                    creadoresAgrupados[c.name] = { info: c, series: [] };
                }
                // Evitar duplicar series en el mismo creador
                if (!creadoresAgrupados[c.name].series.some(ser => ser.id === s.id)) {
                    creadoresAgrupados[c.name].series.push({ 
                        id: s.id, 
                        poster: s.poster_path 
                    });
                }
            });
        }
    });

    // --- RENDERIZAR CREADORES EN EL GRID ---
    const directorsGrid = document.getElementById('directors-grid');
    if (directorsGrid) {
        directorsGrid.className = "grid-people seasons-carousel"; 
        directorsGrid.innerHTML = Object.values(creadoresAgrupados).map(c => {
            const postersHTML = c.series.map(s => `
                <img class="mini-serie-poster" src="https://image.tmdb.org/t/p/w200${s.poster}" onclick="ampliarSerie('${s.id}')">
            `).join('');
            
            return `
                <div class="person-card">
                    <img class="photo-circle" src="${c.info.profile_path ? 'https://image.tmdb.org/t/p/w200' + c.info.profile_path : 'https://via.placeholder.com/200'}" 
                         onclick="ampliarFoto('https://image.tmdb.org/t/p/w500${c.info.profile_path}', '${c.info.name}', 'Creador')">
                    <span class="person-name">${c.info.name}</span>
                    <div class="mini-posters-container">${postersHTML}</div>
                </div>`;
        }).join('');
    }
}

// --- 6. FUNCIONES DE APOYO (ELIMINAR, MODAL, STATS) ---
function eliminarSerie(idSerie) {
    if (confirm("¿Eliminar serie?")) {
        coleccionSeries = coleccionSeries.filter(s => s.id != idSerie);
        renderizarTodo();
        if (coleccionSeries.length === 0) showSection('welcome');
    }
}

function ampliarFoto(url, nombre, personaje) {
    document.getElementById('img-ampliada').src = url;
    document.getElementById('modal-caption').innerHTML = `<h2>${nombre}</h2><p>${personaje}</p>`;
    document.body.style.overflow = 'hidden'; 
    modal.classList.remove('hidden');
}

function ampliarSerie(idSerie) {
    const s = coleccionSeries.find(item => item.id == idSerie);
    if (!s) return;
    document.getElementById('img-ampliada').src = `https://image.tmdb.org/t/p/w500${s.poster_path}`;
    document.getElementById('modal-caption').innerHTML = `
        <h2>${s.name}</h2>
        <div style="font-size:14px; line-height:1.4;">${s.overview || "Sin sinopsis."}</div>`;
    document.body.style.overflow = 'hidden';
    modal.classList.remove('hidden');
}

function cerrarModal() { 
    modal.classList.add('hidden'); 
    document.body.style.overflow = 'auto'; 
}

if (closeBtn) closeBtn.onclick = cerrarModal;
if (modal) modal.onclick = (e) => { if (e.target === modal) cerrarModal(); };

function generarStats() {
    let min = 0;
    coleccionSeries.forEach(s => {
        const dur = (s.episode_run_time && s.episode_run_time[0]) || 45;
        min += (dur * s.number_of_episodes);
    });
    const hrs = Math.floor(min / 60);
    document.getElementById('stats-area').innerHTML = `<h3>Has visto aproximadamente ${hrs} horas de series.</h3>`;
}

// Exportar e Importar
function exportarDatos() {
    const blob = new Blob([JSON.stringify(coleccionSeries)], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = "mis_series.json"; a.click();
}

function importarDatos(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        coleccionSeries = JSON.parse(event.target.result);
        renderizarTodo(); showSection('series');
    };
    reader.readAsText(e.target.files[0]);
}
