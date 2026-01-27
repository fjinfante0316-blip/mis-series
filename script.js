const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
let coleccionSeries = [];

// Control de Menú
document.getElementById('sidebarCollapse').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('active');
});

// Cambiar de sección
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`sec-${id}`).classList.remove('hidden');
    document.getElementById('sidebar').classList.remove('active');
    if(id === 'stats') generarStats();
}

// Función de búsqueda adaptada
async function buscarYAñadir(esInicio) {
    const inputId = esInicio ? 'initialInput' : 'serieInput';
    const query = document.getElementById(inputId).value;
    if (!query) return;

    try {
        const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${query}&language=es-ES`);
        const d = await r.json();
        
        if (d.results.length > 0) {
            const id = d.results[0].id;
            const det = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&append_to_response=credits&language=es-ES`);
            const serie = await det.json();
            
            coleccionSeries.push(serie);
            renderizarTodo();

            // Si es la primera serie, ocultamos la pantalla de bienvenida
            if (esInicio) {
                document.getElementById('welcome-screen').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('welcome-screen').classList.add('hidden');
                    document.getElementById('main-app').classList.remove('hidden');
                }, 500);
            }
        } else {
            alert("No se encontró la serie");
        }
    } catch (e) { console.error(e); }
    document.getElementById(inputId).value = "";
}

function renderizarTodo() {
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <img src="https://image.tmdb.org/t/p/w500${s.poster_path}">
    `).join('');

    let actHTML = "";
    let creHTML = "";

    coleccionSeries.forEach(s => {
        s.credits.cast.slice(0, 10).forEach(a => {
            actHTML += crearFichaPersona(a, s.poster_path);
        });

        if (s.created_by && s.created_by.length > 0) {
            s.created_by.forEach(c => {
                creHTML += crearFichaPersona(c, s.poster_path);
            });
        }
    });

    document.getElementById('actors-grid').innerHTML = actHTML;
    document.getElementById('directors-grid').innerHTML = creHTML;
}

function crearFichaPersona(p, posterSerie) {
    const foto = p.profile_path ? `https://image.tmdb.org/t/p/w200${p.profile_path}` : 'https://via.placeholder.com/200x200?text=N/A';
    return `
        <div class="person-card">
            <img class="photo-circle" src="${foto}">
            <span class="person-name">${p.name}</span>
            <img class="mini-serie-poster" src="https://image.tmdb.org/t/p/w200${posterSerie}">
        </div>
    `;
}

// Función de estadísticas simplificada
function generarStats() {
    const counts = {};
    coleccionSeries.forEach(s => s.genres.forEach(g => counts[g.name] = (counts[g.name] || 0) + 1));
    document.getElementById('stats-area').innerHTML = Object.keys(counts).map(g => `
        <div style="margin-bottom:15px">
            <small>${g} (${counts[g]})</small>
            <div style="background:#333; height:8px; border-radius:4px"><div style="background:var(--rojo); height:100%; width:${(counts[g]/coleccionSeries.length)*100}%"></div></div>
        </div>
    `).join('');
}
