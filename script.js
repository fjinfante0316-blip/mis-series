// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];

document.addEventListener('DOMContentLoaded', () => {
    console.log("App cargada correctamente");
    
    const btn = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');

    if (btn && side) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            side.classList.toggle('active');
            console.log("Menu clickeado - Estado active:", side.classList.contains('active'));); // Verificamos en consola
        });
    } else {
        console.error("No se encontró el botón sidebarCollapse o el elemento sidebar");
    }
});

    // Cerrar sidebar al hacer clic fuera (opcional, para móvil)
    document.addEventListener('click', (e) => {
        if (side.classList.contains('active') && !side.contains(e.target) && e.target !== btn) {
            side.classList.remove('active');
        }
    });
});

function showSection(id) {
    const side = document.getElementById('sidebar');
    if(side) side.classList.remove('active');
    
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));

    if (id === 'welcome') {
        document.getElementById('welcome-screen').classList.remove('hidden');
    } else {
        document.getElementById('main-app').classList.remove('hidden');
        const sec = document.getElementById(`sec-${id}`);       
        if (sec) sec.classList.remove('hidden');
        if (id === 'stats') generarStats();
    }
}

async function buscarSeries() {
    const q = document.getElementById('initialInput').value;
    if (!q) return;
    const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(q)}&language=es-ES`);
    const d = await r.json();
    window.ultimos = d.results;
    const resDiv = document.getElementById('search-results-main');
    resDiv.innerHTML = d.results.map(s => `
        <div class="card" onclick="confirmar(${s.id})">
            <img src="https://image.tmdb.org/t/p/w200${s.poster_path}">
            <p style="font-size:0.7rem;">${s.name}</p>
        </div>`).join('');
    resDiv.classList.remove('hidden');
}

// 1. PREVENCIÓN DE DUPLICADOS Y FLUJO DE PORTADA
async function confirmar(id) {
    // Comprobar si ya existe
    const existe = coleccionSeries.some(s => s.id === id);
    if (existe) {
        alert("Esta serie ya está en tu colección.");
        return;
    }

    const r = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`);
    const s = await r.json();
    
    coleccionSeries.push(s);
    localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
    
    // Feedback visual sin cambiar de sección
    alert(`${s.name} añadida correctamente.`);
    renderizarTodo(); 
}

// 2. EXPORTAR E IMPORTAR
function exportarDatos() {
    const dataStr = JSON.stringify(coleccionSeries);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'mis_series_backup.json';

    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function importarDatos(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            coleccionSeries = json;
            localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
            renderizarTodo();
            alert("Datos importados con éxito");
        } catch (err) {
            alert("Error al leer el archivo");
        }
    };
    reader.readAsText(file);
}

// 3. GRÁFICAS (CHART.JS)
let chartGen, chartAn; // Variables para destruir gráficas viejas al actualizar

function renderizarTodo() {
    // 1. RENDER SERIES
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
    <div class="row-item" style="padding: 10px 0;">
        <h4 style="margin-left: 15px; font-size: 1rem; margin-bottom: 5px;">${s.name}</h4>
        <div class="seasons-carousel">
            ${s.seasons.map(t => `
                <div class="card" onclick="verSinopsis(${s.id}, ${t.season_number})">
                    <img src="https://image.tmdb.org/t/p/w200${t.poster_path || s.poster_path}">
                    <p>${t.name}</p>
                </div>
            `).join('')}
        </div>
    </div>
`).join('');

    // 2. REPARTO COMPLETO (Sin límites)
    const actorsMap = new Map();
    coleccionSeries.forEach(s => {
        s.credits?.cast?.forEach(a => {
            if (!actorsMap.has(a.id)) {
                actorsMap.set(a.id, { 
                    name: a.name, 
                    img: a.profile_path, 
                    works: [], 
                    count: 0 // Contador de apariciones
                });
            }
            const actorData = actorsMap.get(a.id);
            actorData.count++; 
            actorData.works.push({ title: s.name, poster: s.poster_path, char: a.character });
        });
    });

    // Convertimos a array y ordenamos de mayor a menor 'count'
    const sortedActors = Array.from(actorsMap.values())
        .filter(a => a.img) // Solo los que tienen foto
        .sort((a, b) => b.count - a.count);

    document.getElementById('actors-grid').innerHTML = sortedActors.map(a => {
    // Dividimos el nombre por espacios y los unimos con un salto de línea para centrar uno sobre otro
    const nombreFormateado = a.name.split(' ').join('<br>');

    return `
    <div class="actor-row-container">
        <div class="actor-profile">
            <img class="actor-photo" src="https://image.tmdb.org/t/p/w200${a.img}">
            <div class="actor-name-label">${nombreFormateado}</div>
            <div style="font-size:0.55rem; color:#888; margin-top:4px;">${a.count} series</div>
        </div>
        <div class="actor-works-carousel">
            ${a.works.map(w => `
                <div class="work-card-mini">
                    <img src="https://image.tmdb.org/t/p/w200${w.poster}">
                    <div class="character-name">${w.char || 'Recurrente'}</div>
                </div>`).join('')}
        </div>
    </div>`;
}).join('');


    // --- 3. LÓGICA DE CREADORES ORDENADOS POR FRECUENCIA ---
    const creatorMap = new Map();
    coleccionSeries.forEach(s => {
        s.created_by?.forEach(c => {
            if (!creatorMap.has(c.id)) {
                creatorMap.set(c.id, { 
                    name: c.name, 
                    img: c.profile_path, 
                    works: [], 
                    count: 0 
                });
            }
            const creatorData = creatorMap.get(c.id);
            creatorData.count++;
            creatorData.works.push({ title: s.name, poster: s.poster_path });
        });
    });

    const sortedCreators = Array.from(creatorMap.values())
        .sort((a, b) => b.count - a.count);

    document.getElementById('directors-grid').innerHTML = sortedCreators.map(c => {
    const nombreCreador = c.name.split(' ').join('<br>');
    return `
    <div class="actor-row-container">
        <div class="actor-profile">
            <img class="actor-photo" src="https://image.tmdb.org/t/p/w200${c.img || ''}" onerror="this.src='https://via.placeholder.com/60'">
            <div class="actor-name-label">${nombreCreador}</div>
            <div style="font-size:0.55rem; color:#888; margin-top:4px;">${c.count} series</div>
        </div>
        <div class="actor-works-carousel">
            ${c.works.map(w => `
                <div class="work-card-mini">
                    <img src="https://image.tmdb.org/t/p/w200${w.poster}">
                    <div class="character-name">Creador</div>
                </div>`).join('')}
        </div>
    </div>`;
}).join('');

// Función para ver Sinopsis al clicar portada
async function verSinopsis(serieId, seasonNum) {
    const serie = coleccionSeries.find(s => s.id === serieId);
    const temporada = serie.seasons.find(t => t.season_number === seasonNum);
    
    // Si queremos sinopsis detallada de la temporada, TMDB requiere otra llamada, 
    // pero por ahora usamos la que tenemos:
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div style="text-align:center">
            <img src="https://image.tmdb.org/t/p/w300${temporada.poster_path || serie.poster_path}" style="width:150px; border-radius:10px; margin-bottom:15px">
            <h2 style="color:var(--rojo)">${serie.name}</h2>
            <h3>${temporada.name}</h3>
            <p style="color:#ccc; line-height:1.5; font-size:0.9rem;">${temporada.overview || "Sin sinopsis disponible para esta temporada."}</p>
            <div style="margin-top:15px; font-size:0.8rem; color:var(--rojo)">
                Episodios: ${temporada.episode_count}
            </div>
        </div>
    `;
    document.getElementById('info-modal').classList.remove('hidden');
}

function generarStats() {
    // Lógica de tiempo (Minutos a Horas)
    let totalMin = 0;
    const gens = {};
    const anios = {};

    coleccionSeries.forEach(s => {
        totalMin += (s.number_of_episodes * (s.episode_run_time[0] || 45));
        s.genres.forEach(g => gens[g.name] = (gens[g.name] || 0) + 1);
        const anio = s.first_air_date ? s.first_air_date.split('-')[0] : "N/A";
        anios[anio] = (anios[anio] || 0) + 1;
    });

    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    document.getElementById('stats-area').innerHTML = `<h3 style="text-align:center">${h}h ${m}m de visionado total</h3>`;

    // Gráfico Circular (Géneros)
    const ctxGen = document.getElementById('chartGeneros').getContext('2d');
    if(chartGen) chartGen.destroy();
    chartGen = new Chart(ctxGen, {
        type: 'pie',
        data: {
            labels: Object.keys(gens),
            datasets: [{
                data: Object.values(gens),
                backgroundColor: ['#e50914', '#564d4d', '#b9090b', '#f5f5f1', '#333']
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }
    });

    // Gráfico de Barras (Años)
    const ctxAn = document.getElementById('chartAnios').getContext('2d');
    if(chartAn) chartAn.destroy();
    chartAn = new Chart(ctxAn, {
        type: 'bar',
        data: {
            labels: Object.keys(anios).sort(),
            datasets: [{
                label: 'Series por año',
                data: Object.keys(anios).sort().map(k => anios[k]),
                backgroundColor: '#e50914'
            }]
        },
        options: { 
            scales: { 
                y: { ticks: { color: '#fff' } },
                x: { ticks: { color: '#fff' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

    // Asegurar que el menú funcione
function initMenu() {
    const btn = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');
    
    if (btn && side) {
        btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            side.classList.toggle('active');
            console.log("Menú clickeado");
        };
    }
}

// Ejecutar al cargar
window.onload = () => {
    initMenu();
    if (coleccionSeries.length > 0) renderizarTodo();
};
