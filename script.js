const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
const seriesGrid = document.getElementById('series-grid');
const directorsGrid = document.getElementById('directors-grid');
const actorsGrid = document.getElementById('actors-grid');
const genreStatsDiv = document.getElementById('genre-stats');

const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const mainContent = document.getElementById('main-content');

const showSeriesBtn = document.getElementById('showSeries');
const showDirectorsBtn = document.getElementById('showDirectors');
const showActorsBtn = document.getElementById('showActors');
const showStatsBtn = document.getElementById('showStats');

const seriesSection = document.getElementById('series-section');
const directorsSection = document.getElementById('directors-section');
const actorsSection = document.getElementById('actors-section');
const statsSection = document.getElementById('stats-section');

let allAddedSeries = []; // Guardará todas las series añadidas
let allDirectors = new Map(); // Para evitar duplicados y guardar fotos
let allActors = new Map(); // Para evitar duplicados y guardar fotos
let genreCounts = {}; // Para las estadísticas

// --- Funcionalidad del Menú Hamburguesa ---
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    mainContent.classList.toggle('shifted');
});

// --- Manejo de Secciones ---
function showSection(sectionToShow) {
    const sections = [seriesSection, directorsSection, actorsSection, statsSection];
    sections.forEach(section => {
        if (section === sectionToShow) {
            section.classList.add('active-section');
            section.classList.remove('hidden-section');
        } else {
            section.classList.remove('active-section');
            section.classList.add('hidden-section');
        }
    });
    // Cierra el sidebar después de seleccionar una sección en móviles
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
        mainContent.classList.remove('shifted');
    }
}

showSeriesBtn.addEventListener('click', () => showSection(seriesSection));
showDirectorsBtn.addEventListener('click', () => {
    renderPeople(directorsGrid, Array.from(allDirectors.values()), 'director');
    showSection(directorsSection);
});
showActorsBtn.addEventListener('click', () => {
    renderPeople(actorsGrid, Array.from(allActors.values()), 'actor');
    showSection(actorsSection);
});
showStatsBtn.addEventListener('click', () => {
    updateGenreStats();
    showSection(statsSection);
});

// --- Lógica Principal de Búsqueda y Renderizado ---
async function buscarSerie() {
    const query = document.getElementById('serieInput').value.trim();
    if (!query) {
        alert('Por favor, escribe el nombre de una serie.');
        return;
    }
    document.getElementById('serieInput').value = ''; // Limpiar input

    try {
        // 1. Buscar el ID de la serie
        const searchRes = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${query}&language=es-ES`);
        if (!searchRes.ok) throw new Error(`HTTP error! status: ${searchRes.status}`);
        const searchData = await searchRes.json();

        if (searchData.results.length === 0) {
            alert('No se encontraron series con ese nombre.');
            return;
        }

        const serieId = searchData.results[0].id;

        // Verificar si la serie ya ha sido añadida
        if (allAddedSeries.some(s => s.id === serieId)) {
            alert('Esta serie ya ha sido añadida.');
            return;
        }

        // 2. Obtener detalles y créditos (actores, directores, etc)
        const detailRes = await fetch(`https://api.themoviedb.org/3/tv/${serieId}?api_key=${API_KEY}&append_to_response=credits&language=es-ES`);
        if (!detailRes.ok) throw new Error(`HTTP error! status: ${detailRes.status}`);
        const serie = await detailRes.json();

        allAddedSeries.push(serie);
        renderSerieCard(serie);
        updatePeopleData(serie);
        updateGenreData(serie);
        alert(`"${serie.name}" ha sido añadida a tu colección.`);

    } catch (error) {
        console.error("Error al buscar la serie:", error);
        alert('Ocurrió un error al buscar la serie. Inténtalo de nuevo.');
    }
}

function renderSerieCard(serie) {
    const credits = serie.credits;
    
    // Filtrar Datos
    const directoresInfo = credits.crew.filter(person => person.job === 'Director' || person.job === 'Executive Producer').slice(0, 2);
    const actoresInfo = credits.cast.slice(0, 10);
    const guionistasInfo = credits.crew.filter(person => person.job === 'Writer' || person.department === 'Writing').slice(0, 3);
    const productoresInfo = credits.crew.filter(person => person.job === 'Producer').slice(0, 3);

    const card = document.createElement('div');
    card.className = 'serie-card';
    card.innerHTML = `
        <img src="https://image.tmdb.org/t/p/w500${serie.poster_path || '/images/placeholder.jpg'}" alt="${serie.name}">
        <div class="overlay">
            <h3>${serie.name} (${serie.first_air_date ? serie.first_air_date.substring(0,4) : 'N/A'})</h3>
            <p><strong>Géneros:</strong> ${serie.genres.map(g => g.name).join(', ') || 'N/A'}</p>
            <p><strong>Directores:</strong> ${directoresInfo.map(d => d.name).join(', ') || 'N/A'}</p>
            <p><strong>Guionistas:</strong> ${guionistasInfo.map(g => g.name).join(', ') || 'N/A'}</p>
            <p><strong>Productores:</strong> ${productoresInfo.map(p => p.name).join(', ') || 'N/A'}</p>
            <p><strong>Actores Principales:</strong> ${actoresInfo.map(a => a.name).join(', ') || 'N/A'}</p>
            <p>${serie.overview || 'Sin descripción disponible.'}</p>
        </div>
    `;
    seriesGrid.prepend(card); // Añadir al principio
}

function updatePeopleData(serie) {
    const credits = serie.credits;

    // Actualizar Directores
    credits.crew.filter(person => person.job === 'Director' || person.job === 'Executive Producer').slice(0, 2).forEach(p => {
        if (!allDirectors.has(p.id)) {
            allDirectors.set(p.id, {
                id: p.id,
                name: p.name,
                profile_path: p.profile_path,
                role: 'Director' // O Executive Producer
            });
        }
    });

    // Actualizar Actores
    credits.cast.slice(0, 10).forEach(p => {
        if (!allActors.has(p.id)) {
            allActors.set(p.id, {
                id: p.id,
                name: p.name,
                profile_path: p.profile_path,
                character: p.character
            });
        }
    });
}

function renderPeople(container, peopleArray, type) {
    container.innerHTML = ''; // Limpiar antes de renderizar
    peopleArray.forEach(person => {
        const card = document.createElement('div');
        card.className = 'person-card';
        const photoPath = person.profile_path ? `https://image.tmdb.org/t/p/w200${person.profile_path}` : 'https://via.placeholder.com/200x300?text=Sin+Foto';
        card.innerHTML = `
            <img src="${photoPath}" alt="${person.name}">
            <h4>${person.name}</h4>
            <p>${type === 'director' ? person.role : person.character}</p>
        `;
        container.appendChild(card);
    });
}

function updateGenreData(serie) {
    serie.genres.forEach(genre => {
        genreCounts[genre.name] = (genreCounts[genre.name] || 0) + 1;
    });
}

function updateGenreStats() {
    genreStatsDiv.innerHTML = '<h3>Estadísticas de Género</h3>';
    if (Object.keys(genreCounts).length === 0) {
        genreStatsDiv.innerHTML += '<p>Añade algunas series para ver las estadísticas.</p>';
        return;
    }

    // Ordenar géneros por cantidad (de mayor a menor)
    const sortedGenres = Object.entries(genreCounts).sort(([,a],[,b]) => b - a);

    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.padding = '0';

    let totalSeries = allAddedSeries.length; // O la suma de todas las cuentas de género si una serie tiene varios

    // Para una representación más visual, podríamos usar barras de texto simples
    sortedGenres.forEach(([genre, count]) => {
        const percentage = ((count / totalSeries) * 100).toFixed(1); // Porcentaje basado en el total de series
        const li = document.createElement('li');
        li.style.marginBottom = '10px';
        li.innerHTML = `
            <strong>${genre}</strong>: ${count} series (${percentage}%)<br>
            <div style="background-color: #333; height: 10px; width: 100%; border-radius: 5px;">
                <div style="background-color: #e50914; height: 100%; width: ${percentage}%; border-radius: 5px;"></div>
            </div>
        `;
        ul.appendChild(li);
    });
    genreStatsDiv.appendChild(ul);
}
