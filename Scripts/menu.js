/**
 * menu.js
 * Gestiona la carga dinámica del menú de carreras y la lista de carreras disponibles,
 * y la lógica de toggle de los dropdowns (Carreras y Contacto).
 */

const CARRERAS_URL = 'http://localhost:3000/api/carreras';

// 🟢 MAPA DE CARRERAS: ELIMINADO. Ahora todas las carreras usan la página genérica 'carrera.html'.


// ==========================================================
// Función: Toggle del Dropdown para Carreras
// (Se mantiene la lógica existente)
// ==========================================================
function toggleCarrerasDropdown(event) {
    const isMenuItemClick = event.target.closest('#carreras-dropdown li a');
    const menuContainer = document.getElementById('carreras-menu-item');

    if (!menuContainer) return;

    if (isMenuItemClick) {
        // Si se hace clic en un enlace DENTRO, se cierra el menú.
        menuContainer.classList.remove('dropdown-active');
        return; 
    }

    const isButtonClick = event.target.closest('#carreras-dropdown-button');

    if (isButtonClick) {
        event.preventDefault(); 
        // Si se hace clic en el botón principal, se alterna la clase.
        menuContainer.classList.toggle('dropdown-active');
    } else if (!menuContainer.contains(event.target)) {
        // Si se hace clic FUERA del menú, se cierra.
        menuContainer.classList.remove('dropdown-active');
    }
}


// ==========================================================
// NUEVA Función: Toggle del Dropdown para Contacto
// (Usa la misma lógica que Carreras)
// ==========================================================
function toggleContactoDropdown(event) {
    const isMenuItemClick = event.target.closest('#contacto-dropdown li a');
    const menuContainer = document.getElementById('contacto-menu-item');

    if (!menuContainer) return; // Asegura que el elemento exista en la página

    if (isMenuItemClick) {
        // Si se hace clic en un enlace DENTRO, se cierra el menú.
        menuContainer.classList.remove('dropdown-active');
        return; 
    }

    const isButtonClick = event.target.closest('#contacto-dropdown-button');

    if (isButtonClick) {
        event.preventDefault(); 
        // Si se hace clic en el botón principal, se alterna la clase.
        menuContainer.classList.toggle('dropdown-active');
    } else if (!menuContainer.contains(event.target)) {
        // Si se hace clic FUERA del menú, se cierra.
        menuContainer.classList.remove('dropdown-active');
    }
}


/**
 * Función central para obtener las carreras y renderizarlas en un elemento de lista (UL).
 * Todas las carreras ahora redirigen a 'carrera.html?id=...'.
 * @param {HTMLElement} targetElement - El elemento DOM (ul/div) donde se inyectarán los elementos.
 * @param {boolean} includeIcon - Si se debe incluir el ícono de graduación (para la lista principal).
 */
async function fetchAndRenderCarreras(targetElement, includeIcon = false) {
    if (!targetElement) return;

    // Mensaje de carga inicial específico.
    targetElement.innerHTML = includeIcon 
        ? '<li>Cargando carreras...</li>' 
        : ''; 

    try {
        const response = await fetch(CARRERAS_URL);
        if (!response.ok) {
            throw new Error('Error al cargar la lista de carreras.');
        }
        
        const carreras = await response.json();
        
        targetElement.innerHTML = ''; // Limpiar después de la carga exitosa
        
        if (carreras.length === 0) {
            targetElement.innerHTML = includeIcon 
                ? '<li>No hay carreras disponibles.</li>' 
                : '<li><a href="#">No disponibles</a></li>';
            return;
        }

        carreras.forEach(carrera => {
            const nombreCarrera = carrera.nombre_carrera || carrera.nombre;
            
            // Lógica unificada: Siempre apunta a carrera.html pasando el ID
            let urlDestino = 'carrera.html';
            
            if (carrera.id_carrera) {
                // Aquí se garantiza que el enlace sea a carrera.html con el ID
                urlDestino = `carrera.html?id=${carrera.id_carrera}`;
            } else {
                 console.warn(`[Carreras] Carrera sin ID: ${nombreCarrera}. Enlazando a 'carrera.html' sin ID.`);
            }


            // 3. Crear e insertar el elemento
            const listItem = document.createElement('li');
            
            let contentHTML = '';
            if (includeIcon) {
                // Agrega el ícono para la lista principal de index.html
                contentHTML += `<i class="fas fa-graduation-cap" style="margin-right: 5px;"></i>`;
            }
            contentHTML += `<a href="${urlDestino}">${nombreCarrera}</a>`;

            listItem.innerHTML = contentHTML;
            targetElement.appendChild(listItem);
        });

    } catch (error) {
        console.error('[Carreras] Error al cargar la lista:', error);
        // Manejo de error unificado.
        targetElement.innerHTML = includeIcon 
            ? '<li style="color: red;">Error: No se pudieron cargar las carreras.</li>'
            : '<li><a href="#" style="color: #991b1b;">Error al cargar</a></li>'; 
    }
}


/**
 * Función 1: Obtiene las carreras y las inyecta en el menú dropdown (UL: #carreras-dropdown).
 */
async function loadCarrerasDropdown() {
    const dropdown = document.getElementById('carreras-dropdown');
    // Llama a la función central, sin ícono.
    await fetchAndRenderCarreras(dropdown, false); 
}

/**
 * Función 2: Obtiene las carreras y las inyecta en la caja principal (UL: #carreras-list).
 * Es la que se debe llamar desde index.html.
 */
async function loadCarrerasList() {
    const carrerasList = document.getElementById('carreras-list');
    // Llama a la función central, con ícono.
    await fetchAndRenderCarreras(carrerasList, true); 
}


// ==========================================================
// Inicialización (ACTUALIZADA)
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar el menú dinámico de carreras (Dropdown)
    loadCarrerasDropdown();

    // 2. Añadir el listener para el click en toda la página, gestionando ambos dropdowns
    document.addEventListener('click', (event) => {
        // Lógica de Carreras
        toggleCarrerasDropdown(event);
        
        // Lógica de Contacto (NUEVO)
        toggleContactoDropdown(event);
    });
});