// Scripts/adminCarrera.js
// Lógica Específica del CRUD y Modales de Carreras con Control de Roles.

// 🔴 MODIFICACIÓN CLAVE: Importar 'getRole'
import { getToken, handleLogout, showMessage, API_BASE_URL, getRole } from './nav.js';

// Usamos la constante API_BASE_URL importada para definir la URL específica
const CARRERAS_API_URL = API_BASE_URL + '/carreras'; 
// 🟢 NUEVA CONSTANTE: URL para la lista de coordinadores
const COORDINADORES_API_URL = API_BASE_URL + '/coordinadores';
const coordinadorSelect = document.getElementById('id_coordinador');
const estadoSelect = document.getElementById('estado'); // <-- NUEVO: Selecciona el campo de estado
const estadoGroup = document.getElementById('estado-group'); // <-- NUEVO: Contenedor para mostrar/ocultar el campo de estado

// 🟢 NUEVO: Obtener el rol del usuario al inicio del módulo
let userRole;
try {
    userRole = getRole(); // Intenta obtener el rol
} catch (e) {
    // Si falla (ej. no hay rol), getRole() llama a handleLogout, por lo que solo salimos.
    console.error("No se pudo obtener el rol:", e.message);
}

// ----------------------------------------------------
// 1. LÓGICA DEL CRUD DE CARRERAS
// ----------------------------------------------------

/**
 * Obtiene y lista todas las carreras.
 */
const fetchCarreras = async () => {
    let token;
    try {
        token = getToken(); 
    } catch (e) {
        return; 
    }
    
    // 🔴 MODIFICACIÓN: La tabla ahora tiene 6 columnas (incluyendo Coordinador)
    const tableBody = document.querySelector('#carreras-table tbody');
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Cargando carreras...</td></tr>';
    
    try {
        const response = await fetch(CARRERAS_API_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            handleLogout(); 
            throw new Error('Sesión expirada o no autorizado. Redirigiendo.');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al obtener las carreras.');
        }

        const carreras = await response.json();
        
        tableBody.innerHTML = ''; 
        if (carreras.length === 0) {
            // 🔴 MODIFICACIÓN: Ajuste de colspan a 6
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No se encontraron carreras.</td></tr>';
            return;
        }

        // 🟢 Lógica de restricción de Acciones por Rol en la tabla
        const isRector = userRole === 'Rector';

        carreras.forEach(carrera => {
            const row = tableBody.insertRow();
            
            let actionButtons = '';
            
            // Botón Editar (accesible para Coordinador y Rector)
            if (isRector || userRole === 'Coordinador') { 
                actionButtons += `<button class="btn btn-info btn-sm" onclick="openEditModal(${carrera.id_carrera})"><i class="fas fa-edit"></i> </button>`;
            }
            
            // Botón Eliminar (solo accesible para Rector)
            if (isRector) {
                actionButtons += `<button class="btn btn-danger btn-sm" onclick="deleteCarrera(${carrera.id_carrera})"><i class="fas fa-trash"></i> </button>`;
            }

            // 🟢 MODIFICACIÓN: Añadir la columna del coordinador
            const coordinadorNombre = carrera.nombre_coordinador || 'Sin asignar';

            // 🟢 NUEVA LÓGICA DE ESTILO USANDO LAS CLASES CSS DEL USUARIO
            let estadoClase;
            let estadoTexto;
            
            if (carrera.estado === 'activa') {
                // Estado 'activa' de carrera usa el estilo de 'ACTIVO' (badge-success)
                estadoClase = 'badge badge-success'; 
                estadoTexto = 'Activa';
            } else {
                // Estado 'cerrada' de carrera usa el estilo de 'SUSPENDIDO' (badge-warning)
                estadoClase = 'badge badge-warning'; 
                estadoTexto = 'Cerrada';
            }

            row.innerHTML = `
                <td>${carrera.nombre_carrera}</td>
                <td style="text-align: center;">${carrera.duracion}</td>
                <td style="text-align: center;">${carrera.modalidad}</td>
                <td style="text-align: center;">${carrera.año_aprobacion}</td>
                <td style="text-align: center;">${coordinadorNombre}</td>
                <td style="text-align: center;">
                    <span class="${estadoClase}">${estadoTexto}</span>
                </td>
                <td style="text-align: center;">
                    ${actionButtons || '<span style="color: #6c757d;">Sin Acciones</span>'}
                </td>

            `;
        });

    } catch (error) {
        console.error('Error en fetchCarreras:', error);
        if (!error.message.includes('Redirigiendo')) {
             // 🔴 MODIFICACIÓN: Ajuste de colspan a 6
            tableBody.innerHTML = `<tr><td colspan="7" class="alert alert-error" style="text-align: center;">Error: ${error.message}</td></tr>`;
        }
    }
};

/**
 * Obtiene la lista de coordinadores y llena el <select>.
 */
const fetchCoordinadores = async () => {
    let token;
    try {
        token = getToken(); 
    } catch (e) {
        return; 
    }

    try {
        const response = await fetch(COORDINADORES_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar la lista de coordinadores.');
        }

        const coordinadores = await response.json();
        
        // Limpiar y llenar el select
        coordinadorSelect.innerHTML = '<option value="">-- Seleccione un Coordinador --</option>';
        coordinadores.forEach(admin => {
            const option = document.createElement('option');
            option.value = admin.id_administrador;
            
            // 🔴 MODIFICACIÓN: Usamos nombre_administrador como identificador de usuario.
            // Si el backend sigue el ejemplo de arriba, admin.nombre_administrador ya está disponible.
            // Si quieres el formato 'Nombre (Usuario)', usa el alias 'usuario_display'.
            option.textContent = `${admin.nombre_administrador}`; 
            
            coordinadorSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error en fetchCoordinadores:', error);
        showMessage('modal-message', `Error al cargar coordinadores: ${error.message}`, 'alert-error');
    }
};


/**
 * Maneja la creación y actualización de carreras.
 */
const saveCarrera = async (event) => {
    event.preventDefault();
    
    const id = document.getElementById('carrera-id').value;
    const isEditing = id.length > 0;
    
    if (!isEditing && userRole !== 'Rector') {
        showMessage('modal-message', 'Acceso Denegado: Solo el Rector puede crear nuevas carreras.', 'alert-error');
        return;
    }
    
    let token;
    try {
        token = getToken(); 
    } catch (e) { return; } 

    const id_coordinador = coordinadorSelect.value;
    
    if (!id_coordinador) {
        showMessage('modal-message', 'Debe seleccionar un Coordinador a cargo.', 'alert-error');
        return;
    }

    // 🔴 MODIFICACIÓN CLAVE: Inicializar data
    const data = {
        nombre_carrera: document.getElementById('nombre_carrera').value,
        duracion: parseInt(document.getElementById('duracion').value),
        modalidad: document.getElementById('modalidad').value,
        año_aprobacion: parseInt(document.getElementById('año_aprobacion').value),
        id_coordinador: parseInt(id_coordinador) 
    };
    
    // 🟢 NUEVA LÓGICA: Añadir el estado SOLO si estamos editando y es visible
    if (isEditing && estadoGroup && estadoGroup.style.display !== 'none') {
        data.estado = estadoSelect.value;
    }

    
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `${CARRERAS_API_URL}/${id}` : CARRERAS_API_URL;

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        // ... (Manejo de errores y respuesta del servidor)
        if (response.status === 401) {
            handleLogout(); 
            throw new Error('Sesión expirada. Por favor, vuelve a iniciar sesión.');
        }
        
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || `Error al ${isEditing ? 'actualizar' : 'crear'} carrera.`);
        }
        
        showMessage('modal-message', result.message || `Carrera ${isEditing ? 'actualizada' : 'creada'} con éxito.`); 
        
        setTimeout(() => {
            closeModal();
            fetchCarreras();
        }, 1500);

    } catch (error) {
        console.error('Error al guardar carrera:', error);
        showMessage('modal-message', `Fallo en el proceso: ${error.message}`, 'alert-error'); 
    }
};

/**
 * Inactiva una carrera por su ID (Eliminación Lógica).
 */
const deleteCarrera = async (id) => {
    // 🟢 RESTRICCIÓN CLAVE: Solo Rector puede inactivar (dar de baja)
    if (userRole !== 'Rector') {
        await Swal.fire(
            'Acceso Denegado',
            'Solo el Rector tiene permiso para dar de baja carreras.',
            'error'
        );
        return;
    }
    
    // 🔴 MODIFICACIÓN CLAVE: Cambiar el texto de confirmación para reflejar la eliminación lógica
    const result = await Swal.fire({
        title: '¿Estás seguro de dar de baja esta carrera?',
        text: 'Esta acción dará de baja a está carrera, la desvinculará de su coordinador y no se mostrará en el listado, pero mantendrá un registro para auditoría!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', // Rojo
        cancelButtonColor: '#3085d6', // Azul
        confirmButtonText: 'Sí, dar de baja', // 🔴 Nuevo texto
        cancelButtonText: 'Cancelar',
        allowOutsideClick: false
    });

    if (!result.isConfirmed) {
        return;
    }
    
    let token;
    try {
        token = getToken(); 
    } catch (e) { return; } 
    
    try {
        // La llamada al endpoint DELETE es la misma, el backend hace la lógica
        const response = await fetch(`${CARRERAS_API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Error al dar de baja la carrera.'); // 🔴 Nuevo texto
        }

        Swal.fire(
            '¡Dada de Baja!', // 🔴 Nuevo título
            'La carrera ha sido dada de baja con éxito.', // 🔴 Nuevo texto
            'success'
        );
        
        fetchCarreras();

    } catch (error) {
        console.error('Error al dar de baja la carrera:', error); // 🔴 Nuevo texto
        Swal.fire(
            'Error',
            `Fallo al dar de baja: ${error.message}`, // 🔴 Nuevo texto
            'error'
        );
    }
};

// ----------------------------------------------------
// 2. LÓGICA DEL MODAL
// ----------------------------------------------------

const modal = document.getElementById('carrera-modal');
const form = document.getElementById('carrera-form');
const modalTitle = document.getElementById('modal-title');

const openModal = (title) => {
    modalTitle.textContent = title;
    document.getElementById('modal-message').classList.add('hidden');
    modal.style.display = 'flex'; 
};

window.closeModal = () => { 
    modal.style.display = 'none';
};

const openCreateModal = async () => { // 🔴 MODIFICACIÓN: Ahora es async para llamar a fetchCoordinadores
    // 🟢 RESTRICCIÓN: Solo Rector puede abrir el modal de creación
    if (userRole !== 'Rector') {
        console.warn('Intento de acceso a Crear Carrera bloqueado para Coordinador.');
        return; 
    }
    
    form.reset();
    document.getElementById('carrera-id').value = '';

    // 🟢 NUEVA LÓGICA: Ocultar el campo de estado en Creación
    if (estadoGroup) estadoGroup.style.display = 'none';
    
    // 🔴 NUEVO: Cargar lista de coordinadores
    await fetchCoordinadores();
    
    // Asegurar que el select no tenga un valor previo si es creación
    coordinadorSelect.value = ''; 
    
    openModal('Agregar Carrera');
}


window.openEditModal = async (id) => { 
    // 🟢 RESTRICCIÓN: Si por alguna razón el botón de editar se renderizó para un rol no válido, lo bloqueamos
    if (userRole !== 'Rector' && userRole !== 'Coordinador') {
        await Swal.fire('Acceso Denegado', 'No tiene permisos para editar carreras.', 'error');
        return;
    }
    
    let token;
    try {
        token = getToken(); 
    } catch (e) { return; } 

    try {
        // 🔴 NUEVO: Cargar lista de coordinadores ANTES de cargar los datos de la carrera
        await fetchCoordinadores(); 
        
        const response = await fetch(`${CARRERAS_API_URL}/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al cargar los datos de la carrera.');
        }

        const carrera = await response.json();
        
        document.getElementById('carrera-id').value = carrera.id_carrera;
        document.getElementById('nombre_carrera').value = carrera.nombre_carrera;
        document.getElementById('duracion').value = carrera.duracion;
        document.getElementById('modalidad').value = carrera.modalidad;
        document.getElementById('año_aprobacion').value = carrera.año_aprobacion;
        
        // 🔴 MODIFICACIÓN CLAVE: Asignar el coordinador recuperado del backend
        if (carrera.id_coordinador) {
            coordinadorSelect.value = carrera.id_coordinador;
        } else {
             // Si el backend devuelve null o undefined, resetear el select
            coordinadorSelect.value = '';
        }

        // 🔴 LÓGICA CLAVE DE ESTADO: Mostrar y precargar el estado
        if (estadoGroup && userRole === 'Rector') {
            // Solo el Rector puede ver y editar el estado
            estadoSelect.value = carrera.estado || 'activa'; // Precargar el estado actual
            estadoGroup.style.display = 'block';
        } else if (estadoGroup) {
            // Ocultar el campo de estado si no es Rector
            estadoGroup.style.display = 'none';
        }
        
        openModal('Editar Carrera'); 
        
    } catch (error) {
        console.error('Error en openEditModal:', error);
        showMessage('modal-message', `Error al cargar datos: ${error.message}`, 'alert-error'); 
    }
};

window.deleteCarrera = deleteCarrera; 
window.openEditModal = openEditModal; // Reafirmar el método global para el HTML


// ----------------------------------------------------
// 3. INICIALIZACIÓN DEL MÓDULO (Event Listeners)
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar la tabla al inicio
    fetchCarreras();
    
    // 2. Inicializar Eventos del Modal
    const btnCrearCarrera = document.getElementById('btn-crear-carrera');
    
    // 🟢 RESTRICCIÓN CLAVE: Ocultar botón de creación si el usuario es Coordinador
    if (userRole !== 'Rector' && btnCrearCarrera) {
        // Si no es Rector (es Coordinador o no tiene rol válido), ocultar el botón
        btnCrearCarrera.style.display = 'none';
    } else if (btnCrearCarrera) {
        // Solo el Rector tiene acceso al evento de creación
        btnCrearCarrera.addEventListener('click', openCreateModal);
    }
    

    document.querySelector('.close-btn').addEventListener('click', closeModal);

    // 3. Manejar el envío del formulario (Crear/Editar)
    form.addEventListener('submit', saveCarrera);
});