const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
let coleccionSeries = [];

// ELEMENTOS DEL DOM
const sidebar = document.getElementById('sidebar');
const btnMenu = document.getElementById('sidebarCollapse');
const headerSearch = document.getElementById('mini-search');
const modal = document.getElementById('photo-modal');
const closeBtn = document.getElementById('modalCloseBtn');
const resultsContainer = document.getElementById('search-results');

// --- 1. MENÚ Y NAVEGACIÓN ---
if (btnMenu) {
    btnMenu.onclick = (e) => { e.stopPropagation(); sidebar.classList.toggle('active'); };
}

function showSection(id) {
    const welcome = document.getElementById('welcome-screen');
    const mainApp = document.getElementById('main-app');
    welcome.classList.add('hidden');
    mainApp.classList.add('hidden');
    headerSearch.classList.add('hidden');

    if (id === 'welcome') {
        welcome.classList.remove('hidden');
        if(coleccionSeries.length > 0) document.getElementById('btn-volver').classList.remove('hidden');
    } else {
        mainApp.classList.remove('hidden');
        headerSearch.classList.remove('hidden');
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        document.getElementById(`sec-${id}`).classList.remove('hidden');
    }
    sidebar.classList.remove('active');
    if (id === 'stats') generarStats();
}

// --- 2. BUSCADOR CON SELECCIÓN PREVIA ---
async function buscarYAñadir(esInicio) {
    const inputId = esInicio ? 'initialInput' : 'serieInput';
    const query = document.getElementById(inputId).value;
    if (!query) return;

    try {
        const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${query}&language=es-ES`);
        const d = await r.json();
        
        if (d.results && d.results.length > 0) {
            resultsContainer.innerHTML = d.results.slice(0, 5).map(s => `
                <div class="result-item" onclick="confirmarSeleccion(${s.id})">
                    <img src="https://image.tmdb.org/t/p/w200${s.poster_path}" onerror="this.src='https://via.placeholder.com/200x300'">
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

        // REPARTO POR TEMPORADAS (5 actores x temp sin repetir)
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
        renderizarTodo();
        showSection('series');
    } catch (e) { console.error(e); }
}

function eliminarSerie(idSerie) {
    if (confirm("¿Seguro que quieres eliminar esta serie de tu colección?")) {
        // Filtramos la colección para quitar la serie con ese ID
        coleccionSeries = coleccionSeries.filter(s => s.id != idSerie);
        
        // Volvemos a dibujar todo
        renderizarTodo();
        
        // Si no quedan series, volvemos a la portada
        if (coleccionSeries.length === 0) {
            showSection('welcome');
        }
    }
}

// --- 3. RENDERIZADO DE TODO ---
// --- ACTUALIZACIÓN DE RENDERIZADO (Con el botón de borrar) ---
function renderizarTodo() {
    // Portadas/Carrusel
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <div class="serie-group" style="position: relative;">
            <button class="btn-delete-serie" onclick="eliminarSerie('${s.id}')">
                <i class="fas fa-trash"></i>
            </button>

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

    // Actores y Creadores (Se mantiene igual que antes)
    let actHTML = ""; let creHTML = "";
    coleccionSeries.forEach(s => {
        s.repartoEspecial.forEach(a => {
            actHTML += crearFicha(a, s.poster_path, a.character, s.id);
        });
        if (s.created_by) {
            s.created_by.forEach(c => {
                creHTML += crearFicha(c, s.poster_path, 'Creador', s.id);
            });
        }
    });
    document.getElementById('actors-grid').innerHTML = actHTML;
    document.getElementById('directors-grid').innerHTML = creHTML;
}
function crearFicha(p, poster, rol, sId) {
    const imgUrl = p.profile_path ? `https://image.tmdb.org/t/p/w200${p.profile_path}` : 'https://via.placeholder.com/200';
    return `
        <div class="person-card">
            <img class="photo-circle" src="${imgUrl}" onclick="ampliarFoto('${imgUrl}', '${p.name}', '${rol}')">
            <span class="person-name">${p.name}</span>
            <img class="mini-serie-poster" src="https://image.tmdb.org/t/p/w200${poster}" onclick="ampliarSerie('${sId}')">
        </div>`;
}

// --- 4. MODALES Y CIERRE ---
function ampliarFoto(url, nombre, personaje) {
    document.getElementById('img-ampliada').src = url.replace('w200', 'w500');
    document.getElementById('modal-caption').innerHTML = `<h2>${nombre}</h2><p>${personaje}</p>`;
    document.body.style.overflow = 'hidden'; 
    modal.classList.remove('hidden');
}

function ampliarSerie(idSerie) {
    const s = coleccionSeries.find(item => item.id == idSerie);
    if (!s) return;
    document.getElementById('img-ampliada').src = `https://image.tmdb.org/t/p/w500${s.poster_path}`;
    const año = s.first_air_date ? s.first_air_date.substring(0, 4) : "N/A";
    document.getElementById('modal-caption').innerHTML = `
        <h2>${s.name} (${año})</h2>
        <div style="font-size:14px; line-height:1.4; text-align:justify;">${s.overview || "Sin sinopsis."}</div>`;
    document.body.style.overflow = 'hidden';
    modal.classList.remove('hidden');
}

function cerrarModal() { modal.classList.add('hidden'); document.body.style.overflow = 'auto'; }
closeBtn.onclick = cerrarModal;
modal.onclick = (e) => { if (e.target === modal) cerrarModal(); };

// --- 5. ESTADÍSTICAS Y TIEMPO ---
function generarStats() {
    let min = 0; let eps = 0;
    coleccionSeries.forEach(s => {
        const dur = (s.episode_run_time && s.episode_run_time[0]) || 45;
        min += (dur * s.number_of_episodes);
        eps += s.number_of_episodes;
    });
    const hrs = Math.floor(min / 60);
    const dias = (hrs / 24).toFixed(1);

    document.getElementById('stats-area').innerHTML = `
        <div class="time-stats-container">
            <div class="time-card"><i>(H)</i><h3>${hrs}</h3><span>Horas</span></div>
            <div class="time-card"><i>(D)</i><h3>${dias}</h3><span>Días</span></div>
            <div class="time-card"><i>(E)</i><h3>${eps}</h3><span>Episodios</span></div>
        </div>
        <hr style="border:0; border-top:1px solid #333; margin:20px 0;">
        ${crearGraficoCircular()}`;
}

function crearGraficoCircular() {
    const counts = {};
    const colores = ['#e50914', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6'];
    coleccionSeries.forEach(s => { if(s.genres[0]) counts[s.genres[0].name] = (counts[s.genres[0].name] || 0) + 1; });
    let acum = 0; let partes = []; let legend = '<div class="chart-legend">';
    Object.keys(counts).forEach((gen, i) => {
        const porc = (counts[gen] / coleccionSeries.length) * 100;
        const col = colores[i % colores.length];
        partes.push(`${col} ${acum}% ${acum + porc}%`);
        acum += porc;
        legend += `<div class="legend-item"><div class="color-box" style="background:${col}"></div>${gen}</div>`;
    });
    return `<h3>Géneros</h3><div id="genero-chart" style="background: conic-gradient(${partes.join(',')})"></div>${legend}</div>`;
}

// --- 6. EXPORTAR / IMPORTAR ---
function exportarDatos() {
    const blob = new Blob([JSON.stringify(coleccionSeries)], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "mis_series.json";
    a.click();
}

function importarDatos(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        coleccionSeries = JSON.parse(event.target.result);
        renderizarTodo();
        showSection('series');
    };
    reader.readAsText(e.target.files[0]);
}
