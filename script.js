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

// RENDERIZADO
function renderizarTodo() {
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <img src="https://image.tmdb.org/t/p/w500${s.poster_path}">
    `).join('');

    let actHTML = ""; let creHTML = "";
    coleccionSeries.forEach(s => {
        s.credits.cast.slice(0, 10).forEach(a => {
            actHTML += `<div class="person-card">
                <img class="photo-circle" src="https://image.tmdb.org/t/p/w200${a.profile_path}" onerror="this.src='https://via.placeholder.com/200'">
                <span class="person-name">${a.name}</span>
                <img class="mini-serie-poster" src="https://image.tmdb.org/t/p/w200${s.poster_path}">
            </div>`;
        });
        if (s.created_by) {
            s.created_by.forEach(c => {
                creHTML += `<div class="person-card">
                    <img class="photo-circle" src="https://image.tmdb.org/t/p/w200${c.profile_path}" onerror="this.src='https://via.placeholder.com/200'">
                    <span class="person-name">${c.name}</span>
                    <img class="mini-serie-poster" src="https://image.tmdb.org/t/p/w200${s.poster_path}">
                </div>`;
            });
        }
    });
    document.getElementById('actors-grid').innerHTML = actHTML;
    document.getElementById('directors-grid').innerHTML = creHTML;
}

function generarStats() {
    const container = document.getElementById('stats-area');
    const counts = {};
    coleccionSeries.forEach(s => { s.genres.forEach(g => { counts[g.name] = (counts[g.name] || 0) + 1; }); });
    container.innerHTML = Object.keys(counts).map(gen => {
        const porc = (counts[gen] / coleccionSeries.length) * 100;
        return `
            <div style="margin-bottom:15px; padding:0 15px;">
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px;">
                    <span>${gen}</span><span>${counts[gen]}</span>
                </div>
                <div style="background:#333; height:8px; border-radius:4px; overflow:hidden;">
                    <div style="background:var(--rojo); width:${porc}%; height:100%;"></div>
                </div>
            </div>`;
    }).join('');
}
