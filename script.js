const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
let coleccionSeries = [];

// --- LÓGICA DEL MENÚ DESPLEGABLE ---
const sidebar = document.getElementById('sidebar');
const btnMenu = document.getElementById('sidebarCollapse');

// Al hacer click en la hamburguesa, ponemos o quitamos la clase 'active'
btnMenu.onclick = function() {
    sidebar.classList.toggle('active');
};

// Cerrar menú si se hace click fuera de él
document.addEventListener('click', function(event) {
    if (!sidebar.contains(event.target) && !btnMenu.contains(event.target)) {
        sidebar.classList.remove('active');
    }
});

// --- LÓGICA DE SECCIONES ---
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`sec-${id}`).classList.remove('hidden');
    sidebar.classList.remove('active'); // Cerrar menú al navegar
}

// --- BÚSQUEDA Y RENDERIZADO ---
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

            if (esInicio) {
                document.getElementById('welcome-screen').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
            }
        } else {
            alert("No se encontró la serie");
        }
    } catch (e) {
        console.error("Error:", e);
    }
    document.getElementById(inputId).value = "";
}

function renderizarTodo() {
    // Portadas Series
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <img src="https://image.tmdb.org/t/p/w500${s.poster_path}" style="width:100%; border-radius:8px;">
    `).join('');

    // Actores y Creadores
    let actHTML = "";
    let creHTML = "";

    coleccionSeries.forEach(s => {
        s.credits.cast.slice(0, 10).forEach(a => {
            actHTML += `
                <div class="person-card">
                    <img class="photo-circle" src="https://image.tmdb.org/t/p/w200${a.profile_path}" onerror="this.src='https://via.placeholder.com/200'">
                    <p>${a.name}</p>
                    <img class="mini-serie-poster" src="https://image.tmdb.org/t/p/w200${s.poster_path}">
                </div>`;
        });

        if (s.created_by) {
            s.created_by.forEach(c => {
                creHTML += `
                    <div class="person-card">
                        <img class="photo-circle" src="https://image.tmdb.org/t/p/w200${c.profile_path}" onerror="this.src='https://via.placeholder.com/200'">
                        <p>${c.name}</p>
                        <img class="mini-serie-poster" src="https://image.tmdb.org/t/p/w200${s.poster_path}">
                    </div>`;
            });
        }
    });

    document.getElementById('actors-grid').innerHTML = actHTML;
    document.getElementById('directors-grid').innerHTML = creHTML;
}
