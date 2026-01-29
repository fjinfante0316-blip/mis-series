const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
let coleccionSeries = [];

// ELEMENTOS DEL DOM
const sidebar = document.getElementById('sidebar');
const btnMenu = document.getElementById('sidebarCollapse');
const headerSearch = document.getElementById('mini-search');
const modal = document.getElementById('photo-modal');
const closeBtn = document.getElementById('modalCloseBtn');

// --- 1. CONTROL DEL MENÚ LATERAL ---
if (btnMenu) {
    btnMenu.onclick = (e) => { 
        e.stopPropagation(); 
        sidebar.classList.toggle('active'); 
    };
}

document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('active') && !sidebar.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});

// --- 2. NAVEGACIÓN ENTRE SECCIONES ---
function showSection(id) {
    const welcome = document.getElementById('welcome-screen');
    const mainApp = document.getElementById('main-app');

    if (id === 'welcome') {
        welcome.classList.remove('hidden');
        mainApp.classList.add('hidden');
        headerSearch.classList.add('hidden');
        if(coleccionSeries.length > 0) document.getElementById('btn-volver').classList.remove('hidden');
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

// --- 3. BÚSQUEDA Y CONTROL DE DUPLICADOS ---
async function buscarYAñadir(esInicio) {
    const inputId = esInicio ? 'initialInput' : 'serieInput';
    const query = document.getElementById(inputId).value;
    if (!query) return;

    try {
        const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${query}&language=es-ES`);
        const d = await r.json();
        
        if (d.results && d.results.length > 0) {
            const serieId = d.results[0].id;

            // BLOQUEO DE DUPLICADOS
            if (coleccionSeries.some(s => s.id === serieId)) {
                alert("Esta serie ya está en tu colección.");
                document.getElementById(inputId).value = "";
                return;
            }

            const det = await fetch(`https://api.themoviedb.org/3/tv/${serieId}?api_key=${API_KEY}&language=es-ES`);
            let serie = await det.json();

            // REPARTO: 5 actores por temporada sin repetir
            serie.repartoEspecial = [];
            const actoresVistos = new Set();
            const numTemporadas = Math.min(serie.number_of_seasons, 5);

            for (let i = 1; i <= numTemporadas; i++) {
                try {
                    const resTemp = await fetch(`https://api.themoviedb.org/3/tv/${serieId}/season/${i}/credits?api_key=${API_KEY}&language=es-ES`);
                    const dataTemp = await resTemp.json();
                    if (dataTemp.cast) {
                        let añadidos = 0;
                        for (let actor of dataTemp.cast) {
                            if (!actoresVistos.has(actor.id) && añadidos < 5) {
                                actoresVistos.add(actor.id);
                                serie.repartoEspecial.push(actor);
                                añadidos++;
                            }
                        }
                    }
                } catch (err) { console.warn(`T${i} no disponible`); }
            }

            coleccionSeries.push(serie);
            renderizarTodo();
            showSection('series');
        } else { alert("No se encontró la serie"); }
    } catch (e) { console.error(e); }
    document.getElementById(inputId).value = "";
}

// --- 4. RENDERIZADO (CARRUSELES Y FICHAS) ---
function renderizarTodo() {
    // Render Series
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <div class="serie-group">
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

    // Render Actores y Creadores
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

// --- 5. MODALES (INFO Y CIERRE) ---
function ampliarFoto(url, nombre, personaje) {
    const img = document.getElementById('img-ampliada');
    const caption = document.getElementById('modal-caption');
    img.src = url.replace('w200', 'w500');
    caption.innerHTML = `<h2>${nombre}</h2><p>Personaje: ${personaje}</p>`;
    document.body.style.overflow = 'hidden'; 
    modal.classList.remove('hidden');
}

function ampliarSerie(idSerie) {
    const s = coleccionSeries.find(item => item.id == idSerie);
    if (!s) return;
    const img = document.getElementById('img-ampliada');
    const caption = document.getElementById('modal-caption');
    img.src = `https://image.tmdb.org/t/p/w500${s.poster_path}`;
    const año = s.first_air_date ? s.first_air_date.substring(0, 4) : "N/A";
    caption.innerHTML = `
        <h2>${s.name} (${año})</h2>
        <div style="font-size:14px; line-height:1.4; text-align:justify;">
            ${s.overview || "Sin sinopsis disponible."}
        </div>`;
    document.body.style.overflow = 'hidden';
    modal.classList.remove('hidden');
}

function cerrarModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

if (closeBtn) closeBtn.onclick = cerrarModal;
modal.onclick = (e) => { if (e.target === modal) cerrarModal(); };

// --- 6. EXPORTAR / IMPORTAR ---
function exportarDatos() {
    if (coleccionSeries.length === 0) return alert("Colección vacía");
    const blob = new Blob([JSON.stringify(coleccionSeries)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "mis_series.json";
    a.click();
    sidebar.classList.remove('active');
}

function importarDatos(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const datos = JSON.parse(e.target.result);
            coleccionSeries = datos;
            renderizarTodo();
            showSection('series');
            alert("Colección cargada");
        } catch (err) { alert("Archivo no válido"); }
    };
    reader.readAsText(file);
    sidebar.classList.remove('active');
}

// --- 7. ESTADÍSTICAS ---
function generarStats() {
    const container = document.getElementById('stats-area');
    if (coleccionSeries.length === 0) {
        container.innerHTML = "<p>Añade series para calcular tu tiempo.</p>";
        return;
    }

    let minutosTotales = 0;
    let episodiosTotales = 0;

    coleccionSeries.forEach(s => {
        // Obtenemos la duración media (TMDB devuelve un array, solemos coger el primero)
        const duracionMedia = (s.episode_run_time && s.episode_run_time.length > 0) 
                              ? s.episode_run_time[0] 
                              : 45; // Si no hay dato, estimamos 45 min
        
        minutosTotales += (duracionMedia * s.number_of_episodes);
        episodiosTotales += s.number_of_episodes;
    });

    const horasTotales = Math.floor(minutosTotales / 60);
    const diasTotales = (horasTotales / 24).toFixed(1);

    // --- AQUÍ EL RENDERIZADO DE LAS NUEVAS STATS ---
    let statsHTML = `
        <div class="time-stats-container">
            <div class="time-card">
                <i class="fas fa-clock"></i>
                <h3>${horasTotales}</h3>
                <span>Horas Totales</span>
            </div>
            <div class="time-card">
                <i class="fas fa-calendar-day"></i>
                <h3>${diasTotales}</h3>
                <span>Días de Vida</span>
            </div>
            <div class="time-card">
                <i class="fas fa-film"></i>
                <h3>${episodiosTotales}</h3>
                <span>Capítulos</span>
            </div>
        </div>
        <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;">
    `;

    // Añadimos el gráfico circular que ya tenías debajo
    container.innerHTML = statsHTML + `<h3 style="margin-bottom:15px;">Géneros Favoritos</h3>` + crearGraficoCircular();
}

// Función auxiliar para separar la lógica del gráfico (para que el código sea limpio)
function crearGraficoCircular() {
    const counts = {};
    const colores = ['#e50914', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6', '#e67e22'];
    coleccionSeries.forEach(s => {
        if (s.genres && s.genres.length > 0) {
            const g = s.genres[0].name;
            counts[g] = (counts[g] || 0) + 1;
        }
    });
    let acumulado = 0;
    let partes = [];
    let legend = '<div class="chart-legend">';
    const keys = Object.keys(counts);
    keys.forEach((gen, i) => {
        const porc = (counts[gen] / coleccionSeries.length) * 100;
        const col = colores[i % colores.length];
        partes.push(`${col} ${acumulado}% ${acumulado + porc}%`);
        acumulado += porc;
        legend += `<div class="legend-item"><div class="color-box" style="background:${col}"></div>${gen}</div>`;
    });
    return `<div id="genero-chart" style="background: conic-gradient(${partes.join(',')})"></div>${legend}</div>`;
}
