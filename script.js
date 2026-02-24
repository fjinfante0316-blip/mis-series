// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];

// 1. INICIALIZACIÓN DE EVENTOS
document.addEventListener('DOMContentLoaded', () => {
    const btnMenu = document.getElementById('sidebarCollapse');
    const sidebar = document.getElementById('sidebar');

    if (btnMenu && sidebar) {
        btnMenu.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.toggle('active');
        };
    }

    // Renderizar si ya hay datos
    if (coleccionSeries.length > 0) renderizarTodo();
});

// 2. NAVEGACIÓN (Cierra el menú al cambiar)
function showSection(id) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('active');

    const welcome = document.getElementById('welcome-screen');
    const mainApp = document.getElementById('main-app');
    
    // Ocultar todo
    welcome.classList.add('hidden');
    mainApp.classList.add('hidden');
    document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));

    // Mostrar sección elegida
    if (id === 'welcome') {
        welcome.classList.remove('hidden');
    } else {
        mainApp.classList.remove('hidden');
        const sec = document.getElementById(`sec-${id}`);
        if (sec) sec.classList.remove('hidden');
        if (id === 'stats') generarStats();
    }
}

// 3. BUSCADOR
async function buscarSeries() {
    const input = document.getElementById('initialInput');
    const query = input.value;
    if (!query) return;

    try {
        const resp = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`);
        const data = await resp.json();
        const resultsDiv = document.getElementById('search-results-main');
        
        resultsDiv.innerHTML = data.results.map(s => `
            <div class="work-card-mini" onclick="confirmar(${s.id})">
                <img src="https://image.tmdb.org/t/p/w200${s.poster_path}" onerror="this.src='https://via.placeholder.com/85x125'">
                <p style="font-size:0.6rem; margin-top:5px;">${s.name}</p>
            </div>
        `).join('');
        resultsDiv.classList.remove('hidden');
    } catch (err) {
        console.error("Error en búsqueda:", err);
    }
}

// 4. AÑADIR SERIE
async function confirmar(id) {
    if (coleccionSeries.some(s => s.id === id)) {
        alert("Esta serie ya está en tu colección.");
        return;
    }

    const resp = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`);
    const serie = await resp.json();
    
    coleccionSeries.push(serie);
    localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
    alert(`${serie.name} añadida correctamente.`);
    renderizarTodo();
}

// 5. RENDERIZADO GENERAL
function renderizarTodo() {
    // Render de Colección (Temporadas pequeñas)
    const gridSeries = document.getElementById('series-grid');
    if (gridSeries) {
        gridSeries.innerHTML = coleccionSeries.map(s => `
            <div class="row-item">
                <h4 style="margin-left:15px; border-left:3px solid #e50914; padding-left:10px;">${s.name}</h4>
                <div class="seasons-carousel">
                    ${s.seasons.map(t => `
                        <div class="card">
                            <img src="https://image.tmdb.org/t/p/w200${t.poster_path || s.poster_path}" style="width:90px; height:130px; object-fit:cover; border-radius:5px;">
                            <p style="font-size:0.6rem; color:#888;">${t.name}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    // Lógica de Actores (Ordenados por frecuencia y nombres divididos)
    const actorsMap = new Map();
    coleccionSeries.forEach(s => {
        s.credits?.cast?.forEach(a => {
            if (!actorsMap.has(a.id)) {
                actorsMap.set(a.id, { name: a.name || "", img: a.profile_path, works: [], count: 0 });
            }
            const act = actorsMap.get(a.id);
            act.count++;
            act.works.push({ poster: s.poster_path, char: a.character });
        });
    });

    const sortedActors = Array.from(actorsMap.values())
        .filter(a => a.img)
        .sort((a, b) => b.count - a.count);

    const actorsGrid = document.getElementById('actors-grid');
    if (actorsGrid) {
        actorsGrid.innerHTML = sortedActors.map(a => {
            const nombreSplit = a.name.split(' ');
            const nombreFormateado = nombreSplit.length > 1 
                ? `${nombreSplit[0]}<br>${nombreSplit.slice(1).join(' ')}` 
                : a.name;

            return `
            <div class="actor-row-container">
                <div class="actor-profile">
                    <img class="actor-photo" src="https://image.tmdb.org/t/p/w200${a.img}">
                    <div class="actor-name-label">${nombreFormateado}</div>
                    <div style="font-size:0.5rem; color:#e50914;">${a.count} series</div>
                </div>
                <div class="actor-works-carousel">
                    ${a.works.map(w => `
                        <div class="work-card-mini">
                            <img src="https://image.tmdb.org/t/p/w200${w.poster}">
                            <div class="character-name">${w.char || ''}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }).join('');
    }
}
