// Scripts/nav.js
// Lógica de Navegación, Estado Activo del Menú y Seguridad (Logout/Token Check)

export const API_BASE_URL = 'https://proyecto-cursado-backend.onrender.com/api/admin'; 

// Mapeo de la entidad (data-entity) al nombre del archivo HTML
const NAV_MAP = {
    'carrera': { file: 'adminCarrera.html', name: 'Gestión de Carreras', icon: 'fas fa-graduation-cap' },
    'materia': { file: 'adminMateria.html', name: 'Gestión de Materias', icon: 'fas fa-book' },
    'horario': { file: 'adminHorario.html', name: 'Gestión de Horarios', icon: 'fas fa-clock' },
    'correlatividad': { file: 'adminCorrelatividad.html', name: 'Gestión de Correlatividades', icon: 'fas fa-link' },
    'administrador': { file: 'adminAdministrador.html', name: 'Gestión de Administradores', icon: 'fas fa-users' }
};

// 🟢 Mapeo de permisos de navegación por rol
const ROLE_PERMISSIONS = {
    'Rector': ['carrera', 'materia', 'horario', 'correlatividad', 'administrador'],
    'Coordinador': ['carrera', 'materia', 'horario', 'correlatividad', 'administrador'] 
};

// =========================================================
// 1. UTILIDADES DE AUTENTICACIÓN Y SESIÓN (Funciones exportadas para el CRUD)
// =========================================================

export const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('adminRol'); 
    window.location.href = 'acceso.html'; // Asegúrate de que esta es la página de login
};

// Exportar estas funciones para que otros módulos JS puedan usarlas
export const getToken = () => {
    const token = localStorage.getItem('adminToken'); 
    if (!token) {
        handleLogout();
        // Lanzar un error detiene la ejecución del código en el módulo que lo importó
        throw new Error('No hay token de sesión.'); 
    }
    return token;
};

/**
 * Obtiene el rol del usuario desde el localStorage.
 * Asume que getToken() ya validó la existencia de la sesión.
 * @returns {string} El rol del usuario (ej: 'Rector', 'Coordinador').
 */
export const getRole = () => {
    const rol = localStorage.getItem('adminRol');
    // Si no hay rol (debería existir si hay token), forzamos el logout por seguridad.
    if (!rol) {
        handleLogout(); 
        throw new Error('No hay rol de sesión. Redirigiendo.');
    }
    return rol;
};

// Exportar showMessage
export const showMessage = (elementId, message, type = 'alert-success') => {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = message;
    element.className = `alert ${type}`;
    element.classList.remove('hidden');
    setTimeout(() => {
        element.classList.add('hidden');
    }, 5000);
};

const setupUserInterface = () => {
    const username = localStorage.getItem('adminUsername') || 'Administrador';
    
    let role = 'Visitante';
    try {
        role = getRole(); // Usa la función segura
    } catch (e) {
        // Ignorar si el error es por falta de sesión, ya que handleLogout se llamó
        return; 
    }
    
    // Formatear el rol: primera letra mayúscula
    const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
    
    // Mostrar Nombre de Usuario
    const userDisplayElement = document.getElementById('user-display'); 
    if (userDisplayElement) {
        userDisplayElement.textContent = username; 
    }

    // Mostrar Rol
    const roleDisplayElement = document.getElementById('role-display'); 
    if (roleDisplayElement) {
        roleDisplayElement.textContent = formattedRole; 
    }
    
    // Configurar botón de Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
};

// =========================================================
// 2. LÓGICA DE NAVEGACIÓN Y ESTADO ACTIVO (INYECCIÓN FILTRADA)
// =========================================================

function injectNavMenu() {
    const navContainer = document.querySelector('.sidebar-nav');
    if (!navContainer) return;
    
    let userRole;
    try {
        userRole = getRole(); // 🟢 Usar la función exportada
    } catch (e) {
        // Si no hay rol (y ya se llamó a handleLogout), no inyectamos nada
        return; 
    }
    
    const allowedEntities = ROLE_PERMISSIONS[userRole] || [];

    let htmlContent = '';
    
    // Iterar el NAV_MAP y solo inyectar si la entidad está permitida para el rol
    for (const entity in NAV_MAP) {
        if (allowedEntities.includes(entity)) {
            const item = NAV_MAP[entity];
            htmlContent += `
                <div class="nav-item" data-entity="${entity}">
                    <a href="${item.file}" style="color: inherit; text-decoration: none; display: flex; align-items: center; width: 100%;">
                        <i class="${item.icon}"></i>
                        <span>${item.name}</span>
                    </a>
                </div>
            `;
        }
    }
    navContainer.innerHTML = htmlContent;
}

function updateSidebarActiveState(entityName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`.nav-item[data-entity="${entityName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    // Asumiendo que tu <h1> principal tiene el ID 'content-title'
    const contentTitle = document.getElementById('content-title');
    if (contentTitle) {
        const titleText = NAV_MAP[entityName] ? NAV_MAP[entityName].name : '';
        contentTitle.textContent = titleText;
    }
}

// =========================================================
// 3. INICIALIZACIÓN DE LA APLICACIÓN
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Verificación de Token y Seguridad Principal
    try {
        getToken();
    } catch (e) {
        // Si no hay token, handleLogout ya redirigió
        return; 
    }
    
    // 2. Inyectar el menú (filtrado por rol)
    injectNavMenu();
    
    // 3. Configurar UI (Muestra de Usuario y Rol)
    setupUserInterface();
    
    // 4. Marcar la opción actual del menú como activa
    const currentPageName = window.location.pathname.split('/').pop();
    let activeEntity = null;
    
    for (const entity in NAV_MAP) {
        if (NAV_MAP[entity].file === currentPageName) {
            activeEntity = entity;
            break;
        }
    }
    
    if (activeEntity) {
        updateSidebarActiveState(activeEntity);
    } 
});