const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
let coleccionSeries = [];

// ELEMENTOS
const sidebar = document.getElementById('sidebar');
const btnMenu = document.getElementById('sidebarCollapse');
const headerSearch = document.getElementById('mini-search');

// CONTROL MENÚ
btnMenu.onclick = (e) => { 
    e.stopPropagation(); 
    sidebar.classList.toggle('active'); 
};

document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('active') && !sidebar.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});

// NAVEGACIÓN
function showSection(id) {
    const welcome = document.getElementById('welcome-screen');
    const mainApp = document.getElementById('main-app');

    if (id === 'welcome') {
        welcome.classList.remove('hidden');
        mainApp.classList.add('hidden');
        headerSearch.classList.add('hidden'); // Ocultar mini buscador en portada
        if(coleccionSeries.length > 0) document.getElementById('btn-volver').classList.remove('hidden');
    } else {
        welcome.classList.add('hidden');
        mainApp.classList.remove('hidden');
        headerSearch.classList.remove('hidden'); // Mostrar mini buscador
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        document.getElementById(`sec-${id}`).classList.remove('hidden');
    }
    sidebar.classList.remove('active');
    if (id === 'stats') generarStats();
}

// BÚSQUEDA
async function buscarYAñadir(esInicio) {
    const inputId = esInicio ? 'initialInput' : 'serieInput';
    const query = document.getElementById(inputId).value;
    if (!query) return;

    try {
        const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${query}&language=es-ES`);
        const d = await r.json();
        if (d.results && d.results.length > 0) {
            const id = d.results[0].id;
            const det = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&append_to_response=credits&language=es-ES`);
            const serie = await det.json();
            coleccionSeries.push(serie);
            renderizarTodo();
            showSection('series');
        } else { alert("Serie no encontrada"); }
    } catch (e) { console.error(e); }
    document.getElementById(inputId).value = "";
}

// Función para ampliar Serie (Corregida)
function ampliarSerie(idSerie) {
    const serie = coleccionSeries.find(s => s.id == idSerie);
    if (!serie) return;

    const modal = document.getElementById('photo-modal');
    const img = document.getElementById('img-ampliada');
    const caption = document.getElementById('modal-caption');

    img.src = `https://image.tmdb.org/t/p/w500${serie.poster_path}`;
    const año = serie.first_air_date ? serie.first_air_date.substring(0, 4) : "N/A";

    caption.innerHTML = `
        <h3 style="color:var(--rojo); margin: 5px 0;">${serie.name}</h3>
        <p style="color:#aaa; font-size:14px; margin-bottom:10px;">Estreno: ${año}</p>
        <div style="text-align:left; font-size:14px; line-height:1.5; color:#eee;">
            ${serie.overview || "Sin sinopsis disponible."}
        </div>
    `;

    modal.classList.remove('hidden');
}

function renderizarTodo() {
    // 1. RENDERIZAR SERIES CON CARRUSEL DE TEMPORADAS
    const gridSeries = document.getElementById('series-grid');
    gridSeries.innerHTML = coleccionSeries.map(s => {
        // Generamos el HTML de todas las temporadas disponibles
        const temporadasHTML = s.seasons.map(temp => {
            // Si la temporada no tiene póster, usamos el de la serie
            const path = temp.poster_path ? temp.poster_path : s.poster_path;
            return `
                <div class="season-card" onclick="ampliarSerie('${s.id}')">
                    <img src="https://image.tmdb.org/t/p/w500${path}">
                    <div class="season-number">${temp.name}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="serie-group">
                <div class="serie-title-tag">${s.name}</div>
                <div class="seasons-carousel">
                    ${temporadasHTML}
                </div>
            </div>
        `;
    }).join('');

    // 2. RENDERIZAR ACTORES Y CREADORES (Se mantiene igual)
    let actHTML = ""; let creHTML = "";
    coleccionSeries.forEach(s => {
        s.credits.cast.slice(0, 10).forEach(a => {
            actHTML += crearFicha(a, s.poster_path);
        });
        if (s.created_by) {
            s.created_by.forEach(c => {
                creHTML += crearFicha(c, s.poster_path);
            });
        }
    });
    document.getElementById('actors-grid').innerHTML = actHTML;
    document.getElementById('directors-grid').innerHTML = creHTML;
}

function generarStats() {
    const container = document.getElementById('stats-area');
    if (coleccionSeries.length === 0) {
        container.innerHTML = "<p>Añade series para ver estadísticas.</p>";
        return;
    }

    const counts = {};
    const coloresBase = [
        '#e50914', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6', 
        '#e67e22', '#1abc9c', '#ecf0f1', '#95a5a6', '#d35400'
    ];

    // Contamos solo el primer género de cada serie
    coleccionSeries.forEach(s => {
        if (s.genres && s.genres.length > 0) {
            const primerGenero = s.genres[0].name;
            counts[primerGenero] = (counts[primerGenero] || 0) + 1;
        }
    });

    const total = coleccionSeries.length;
    let acumulado = 0;
    let gradientParts = [];
    let legendHTML = '<div class="chart-legend">';

    Object.keys(counts).forEach((gen, index) => {
        const porcentaje = (counts[gen] / total) * 100;
        const color = coloresBase[index % coloresBase.length];
        
        // Parte del degradado para el gráfico
        gradientParts.push(`${color} ${acumulado}% ${acumulado + porcentaje}%`);
        acumulado += porcentaje;

        // Parte de la leyenda
        legendHTML += `
            <div class="legend-item">
                <div class="color-box" style="background:${color}"></div>
                <span>${gen} (${counts[gen]})</span>
            </div>`;
    });

    legendHTML += '</div>';

    // Inyectamos el gráfico y la leyenda
    container.innerHTML = `
        <h2 style="color:var(--rojo)">Distribución por Género</h2>
        <div id="genero-chart" style="background: conic-gradient(${gradientParts.join(', ')})"></div>
        ${legendHTML}
    `;
    // Función para abrir el modal
function ampliarFoto(url, nombre, personaje) {
    const modal = document.getElementById('photo-modal');
    const img = document.getElementById('img-ampliada');
    const caption = document.getElementById('modal-caption');

    // Usamos imagen de alta calidad
    img.src = url.replace('w200', 'w500');
    
    // Mostramos Nombre Real + Nombre Personaje
    caption.innerHTML = `
        <div style="color:var(--rojo); font-size:1.4rem;">${nombre}</div>
        <div style="color:#aaa; font-size:1rem; font-weight:normal; margin-top:5px;">Personaje: ${personaje}</div>
    `;
    
    modal.classList.remove('hidden');
}

    // Función única para cerrar el modal
    function cerrarModal() {
        const modal = document.getElementById('photo-modal');
        modal.classList.add('hidden');
        // Limpiamos la imagen para que no parpadee la anterior al abrirlo de nuevo
        document.getElementById('img-ampliada').src = "";
    }

    // Asignar el cierre al botón y al fondo oscuro
    document.addEventListener('DOMContentLoaded', () => {
        const modal = document.getElementById('photo-modal');
        const closeBtn = document.getElementById('modalCloseBtn');

        // Cerrar con la X
        closeBtn.addEventListener('click', cerrarModal);

        // Cerrar al tocar el fondo negro (pero no al tocar la foto/texto)
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cerrarModal();
            }
        });
    });

    // MODIFICACIÓN: Actualiza tu función crearFicha para que sea así:
    function crearFicha(p, poster) {
        const imgUrl = p.profile_path ? `https://image.tmdb.org/t/p/w200${p.profile_path}` : 'https://via.placeholder.com/200x200?text=N/A';
    
        return `
            <div class="person-card">
                <img class="photo-circle" 
                     src="${imgUrl}" 
                     onclick="ampliarFoto('${imgUrl}', '${p.name}')"
                     onerror="this.src='https://via.placeholder.com/200'">
                <span class="person-name">${p.name}</span>
                <img class="mini-serie-poster" src="https://image.tmdb.org/t/p/w200${poster}">
            </div>`;
    }
}
