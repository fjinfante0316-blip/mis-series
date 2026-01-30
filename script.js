const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';

// --- 1. CARGA INICIAL Y PERSISTENCIA ---
// Intentamos recuperar los datos guardados al abrir la app
let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];

// Elementos del DOM
const sidebar = document.getElementById('sidebar');
const btnMenu = document.getElementById('sidebarCollapse');
const headerSearch = document.getElementById('mini-search');
const modal = document.getElementById('photo-modal');
const closeBtn = document.getElementById('modalCloseBtn');
const resultsContainer = document.getElementById('search-results');

window.onload = () => {
    if (coleccionSeries.length > 0) {
        renderizarTodo();
        showSection('series');
    }
};

function guardarEnLocalStorage() {
    localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
}

// --- 2. NAVEGACIÓN Y MENÚ ---
if (btnMenu) {
    btnMenu.onclick = (e) => { e.stopPropagation(); sidebar.classList.toggle('active'); };
}

function showSection(id) {
    const welcome = document.getElementById('welcome-screen');
    const mainApp = document.getElementById('main-app');
    const btnVolver = document.getElementById('btn-volver');

    welcome.classList.add('hidden');
    mainApp.classList.add('hidden');
    headerSearch.classList.add('hidden');

    if (id === 'welcome') {
        welcome.classList.remove('hidden');
        if (coleccionSeries.length > 0) btnVolver.classList.remove('hidden');
    } else {
        mainApp.classList.remove('hidden');
        headerSearch.classList.remove('hidden');
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        const sec = document.getElementById(`sec-${id}`);
        if(sec) sec.classList.remove('hidden');
    }
    sidebar.classList.remove('active');
    if (id === 'stats') generarStats();
}

// --- 3. BÚSQUEDA Y SELECCIÓN ---
async function buscarYAñadir(esInicio) {
    const inputId = esInicio ? 'initialInput' : 'serieInput';
    const query = document.getElementById(inputId).value;
    if (!query) return;

    try {
        const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`);
        const d = await r.json();
        
        if (d.results && d.results.length > 0) {
            resultsContainer.innerHTML = d.results.slice(0, 5).map(s => `
                <div class="result-item" onclick="confirmarSeleccion(${s.id})">
                    <img src="${s.poster_path ? 'https://image.tmdb.org/t/p/w200' + s.poster_path : 'https://via.placeholder.com/200x300'}">
                    <div class="result-info">
                        <h4>${s.name}</h4>
                        <p>${s.first_air_date ? s.first_air_date.substring(0,4) : 'N/A'}</p>
                    </div>
                </div>
            `).join('');
            resultsContainer.classList.remove('hidden');
        } else { alert("No se encontraron resultados."); }
    } catch (e) { console.error(e); }
}

async function confirmarSeleccion(serieId) {
    resultsContainer.classList.add('hidden');
    if (coleccionSeries.some(s => s.id === serieId)) return alert("Ya tienes esta serie.");

    try {
        const det = await fetch(`https://api.themoviedb.org/3/tv/${serieId}?api_key=${API_KEY}&language=es-ES`);
        let serie = await det.json();

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
            } catch (err) {}
        }

        coleccionSeries.push(serie);
        guardarEnLocalStorage();
        renderizarTodo();
        showSection('series');
        document.getElementById('initialInput').value = "";
        document.getElementById('serieInput').value = "";
    } catch (e) { console.error(e); }
}

// --- 4. RENDERIZADO (SERIES, ACTORES Y CREADORES) ---
function renderizarTodo() {
    // 4.1 SERIES
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

    // 4.2 AGRUPACIÓN
    const actoresAgrupados = {};
    const creadoresAgrupados = {};

    coleccionSeries.forEach(s => {
        s.repartoEspecial.forEach(a => {
            if (!actoresAgrupados[a.id]) { actoresAgrupados[a.id] = { info: a, trabajos: [] }; }
            actoresAgrupados[a.id].trabajos.push({ serieId: s.id, poster: s.poster_path, personaje: a.character || 'N/A' });
        });
        if (s.created_by) {
            s.created_by.forEach(c => {
                if (!creadoresAgrupados[c.name]) { creadoresAgrupados[c.name] = { info: c, series: [] }; }
                creadoresAgrupados[c.name].series.push({ id: s.id, poster: s.poster_path });
            });
        }
    });

    // 4.3 RENDER ACTORES (Fila por actor ordenada)
    const actorsGrid = document.getElementById('actors-grid');
    actorsGrid.className = "grid-people-rows";
    const listaActores = Object.values(actoresAgrupados).sort((a,b) => b.trabajos.length - a.trabajos.length);

    actorsGrid.innerHTML = listaActores.map(a => {
        const todosPersonajes = a.trabajos.map(t => t.personaje).join(' / ');
        const seriesHTML = a.trabajos.map(t => `
            <div class="mini-card-serie" onclick="ampliarSerie('${t.serieId}')">
                <img src="https://image.tmdb.org/t/p/w200${t.poster}">
                <span>${t.personaje}</span>
            </div>
        `).join('');

        return `
            <div class="actor-row">
                <div class="actor-info-side">
                    <img class="photo-circle" src="${a.info.profile_path ? 'https://image.tmdb.org/t/p/w200'+a.info.profile_path : 'https://via.placeholder.com/200'}" 
                         onclick="ampliarFoto('https://image.tmdb.org/t/p/w500${a.info.profile_path}', '${a.info.name}', '${todosPersonajes}')">
                    <span class="person-name">${a.info.name}</span>
                    <div class="badge-count">${a.trabajos.length} series</div>
                </div>
                <div class="actor-series-carousel">${seriesHTML}</div>
            </div>`;
    }).join('');

    // 4.4 RENDER CREADORES (Fila por creador con carrusel de series)
    const directorsGrid = document.getElementById('directors-grid');
    directorsGrid.className = "grid-people-rows"; // Aplicamos la misma clase de filas
    directorsGrid.innerHTML = listaCreadores.map(c => {
        // Generamos el carrusel de las series que ha creado
        const seriesHTML = c.series.map(s => {
            // Buscamos el nombre de la serie para mostrarlo bajo el póster
            const datosSerie = coleccionSeries.find(item => item.id === s.id);
            return `
                <div class="mini-card-serie" onclick="ampliarSerie('${s.id}')">
                    <img src="https://image.tmdb.org/t/p/w200${s.poster}">
                    <span>${datosSerie ? datosSerie.name : ''}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="actor-row">
                <div class="actor-info-side">
                    <img class="photo-circle" src="${c.info.profile_path ? 'https://image.tmdb.org/t/p/w200' + c.info.profile_path : 'https://via.placeholder.com/200'}" 
                         onclick="ampliarFoto('https://image.tmdb.org/t/p/w500${c.info.profile_path}', '${c.info.name}', 'Creador')">
                    <span class="person-name">${c.info.name}</span>
                    <div class="badge-count">${c.series.length} series</div>
                </div>
                <div class="actor-series-carousel">
                    ${seriesHTML}
                </div>
            </div>`;
    }).join('');

// --- 5. ELIMINAR, MODALES Y STATS ---
function eliminarSerie(idSerie) {
    if (confirm("¿Eliminar serie?")) {
        coleccionSeries = coleccionSeries.filter(s => s.id != idSerie);
        guardarEnLocalStorage();
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
        <div style="font-size:14px; line-height:1.4; text-align:justify;">${s.overview || "Sin sinopsis."}</div>`;
    document.body.style.overflow = 'hidden';
    modal.classList.remove('hidden');
}

function cerrarModal() { modal.classList.add('hidden'); document.body.style.overflow = 'auto'; }
closeBtn.onclick = cerrarModal;
modal.onclick = (e) => { if (e.target === modal) cerrarModal(); };

// --- ESTADÍSTICAS CON FILTRADO ---
function generarStats() {
    if (coleccionSeries.length === 0) {
        document.getElementById('stats-area').innerHTML = "<p>Añade series para ver tus estadísticas.</p>";
        return;
    }

    let min = 0; let eps = 0;
    const counts = {};
    const colores = ['#e50914', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#d35400'];

    coleccionSeries.forEach(s => {
        const dur = (s.episode_run_time && s.episode_run_time[0]) || 45;
        min += (dur * s.number_of_episodes);
        eps += s.number_of_episodes;

        if (s.genres && s.genres.length > 0) {
            const nombreGenero = s.genres[0].name;
            counts[nombreGenero] = (counts[nombreGenero] || 0) + 1;
        }
    });

    const hrs = Math.floor(min / 60);
    const dias = (hrs / 24).toFixed(1);

    let acumulado = 0;
    let partesGrafico = [];
    let leyendaHTML = '<div class="chart-legend">';
    
    const totalSeries = coleccionSeries.length;
    const nombresGeneros = Object.keys(counts);

    nombresGeneros.forEach((gen, i) => {
        const cantidad = counts[gen];
        const porcentaje = (cantidad / totalSeries) * 100;
        const color = colores[i % colores.length];

        partesGrafico.push(`${color} ${acumulado}% ${acumulado + porcentaje}%`);
        acumulado += porcentaje;

        // Añadimos el evento onclick para filtrar
        leyendaHTML += `
            <div class="legend-item" onclick="filtrarPorGenero('${gen}')" style="cursor:pointer">
                <div class="color-box" style="background:${color}"></div>
                <span>${gen} (${cantidad})</span>
            </div>`;
    });
    leyendaHTML += '</div>';

    document.getElementById('stats-area').innerHTML = `
        <div class="time-stats-container">
            <div class="time-card"><i>(H)</i><h3>${hrs}</h3><span>Horas</span></div>
            <div class="time-card"><i>(D)</i><h3>${dias}</h3><span>Días</span></div>
            <div class="time-card"><i>(E)</i><h3>${eps}</h3><span>Episodios</span></div>
        </div>
        
        <div class="genres-stats-section">
            <h3 class="section-subtitle">Distribución por Géneros (Pulsa para filtrar)</h3>
            <div class="chart-wrapper">
                <div id="genero-chart" style="background: conic-gradient(${partesGrafico.join(',')})"></div>
                ${leyendaHTML}
            </div>
        </div>
    `;
}

// --- FUNCIÓN DE FILTRADO ---
function filtrarPorGenero(genero) {
    // 1. Filtramos la colección
    const seriesFiltradas = coleccionSeries.filter(s => 
        s.genres && s.genres.some(g => g.name === genero)
    );

    // 2. Modificamos temporalmente el renderizado de la sección de series
    const grid = document.getElementById('series-grid');
    
    // Añadimos un encabezado de filtro y el botón de cerrar
    grid.innerHTML = `
        <div class="filter-header">
            <span>Mostrando: <b>${genero}</b></span>
            <button onclick="renderizarTodo()" class="btn-clear-filter">Ver todas ×</button>
        </div>
    ` + seriesFiltradas.map(s => `
        <div class="serie-group">
            <button class="btn-delete-serie" onclick="eliminarSerie('${

// --- 6. EXPORTAR / IMPORTAR ---
function exportarDatos() {
    const blob = new Blob([JSON.stringify(coleccionSeries)], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "mis_series_backup.json";
    a.click();
}

function importarDatos(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        coleccionSeries = JSON.parse(event.target.result);
        guardarEnLocalStorage();
        renderizarTodo();
        showSection('series');
    };
    reader.readAsText(e.target.files[0]);
}

// Cerrar resultados al click fuera
document.addEventListener('click', (e) => {
    if (!resultsContainer.contains(e.target)) resultsContainer.classList.add('hidden');
});
