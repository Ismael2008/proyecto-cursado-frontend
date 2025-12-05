// Scripts/adminHorario.js

// 🟢 ACTUALIZACIÓN CLAVE: Importar getRole para la lógica de gradualidad de roles
import { API_BASE_URL, getToken, showMessage, handleLogout, getRole } from './nav.js';

// Elementos del DOM
const horarioTable = document.getElementById('horario-table'); 
const carreraSelect = document.getElementById('carrera-select');
const materiaSelect = document.getElementById('materia-select');
const btnCreateHorario = document.getElementById('btn-create-horario');
const horarioModal = document.getElementById('horario-modal');
const horarioModalTitle = document.getElementById('horario-modal-title');
const horarioForm = document.getElementById('horario-form');

let currentHorarios = []; // Almacena los horarios actuales para edición/borrado

// Roles con permisos de gestión de horarios
const ROLES_CON_PERMISO = ['Rector', 'Coordinador'];

// =======================================================
// 1. UTILIDADES DE UI (Basadas en showMessage de nav.js)
// =======================================================

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

// Nota: No es necesario re-declarar closeModal aquí, ya existe en window (sección 5)

/**
 * 🟢 NUEVO: Verifica si el usuario tiene permiso para modificar.
 * Esto ayuda a determinar la UI (botones).
 */
function canModifyHorario() {
    try {
        const role = getRole();
        return ROLES_CON_PERMISO.includes(role);
    } catch (e) {
        return false;
    }
}


// =======================================================
// 2. INICIALIZACIÓN Y LISTENERS
// =======================================================

window.onload = function() {
    try {
        getToken(); // Verifica si hay sesión activa
        fetchCarreras();
        horarioForm.addEventListener('submit', handleHorarioSubmit);
    } catch (error) {
        // Si no hay token, handleLogout ya redirigió, pero lo dejamos como fallback
        if (error.message.includes('No hay token')) handleLogout();
    }
};

// =======================================================
// 3. CARGA DE DATOS: CARRERAS, MATERIAS y HORARIOS
// =======================================================

/**
 * Carga el select de Carreras al iniciar.
 * NOTA: El filtrado de carreras por rol se gestiona en el Backend.
 */
async function fetchCarreras() {
    try {
        const response = await fetch(`${API_BASE_URL}/carreras`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Error al obtener carreras');
        
        const carreras = await response.json();
        carreraSelect.innerHTML = '<option value="">-- Seleccionar una Carrera --</option>';
        carreras.forEach(carrera => {
            const option = document.createElement('option');
            option.value = carrera.id_carrera;
            option.textContent = carrera.nombre_carrera;
            carreraSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error en fetchCarreras:', error);
        showMessage('horario-alert-message', 'Error al cargar las carreras.', 'alert-error');
    }
}

/**
 * Carga el select de Materias basado en la Carrera seleccionada.
 * NOTA: El filtrado de materias por rol se gestiona en el Backend.
 */
window.fetchMateriasForHorario = async function() {
    showMessage('horario-alert-message', '', 'hidden');
    const idCarrera = carreraSelect.value;
    
    // Resetear Materias y la Tabla
    materiaSelect.disabled = true;
    materiaSelect.innerHTML = '<option value="">-- Seleccionar una Materia --</option>';
    if (horarioTable) {
        horarioTable.innerHTML = '<thead><tr></tr></thead>';
    }
    btnCreateHorario.style.display = 'none';

    if (!idCarrera) return;

    try {
        const response = await fetch(`${API_BASE_URL}/materias?id_carrera=${idCarrera}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Error al obtener materias');
        
        const materias = await response.json();
        
        materias.forEach(materia => {
            const option = document.createElement('option');
            option.value = materia.id_materia;
            option.textContent = `${materia.nombre_materia}`;
            materiaSelect.appendChild(option);
        });

        if (materias.length > 0) {
            materiaSelect.disabled = false; // HABILITADO
        } else {
            if (horarioTable) {
                horarioTable.innerHTML = '<thead><tr><th colspan="5" style="text-align: center;">No hay materias asociadas a la carrera seleccionada.</th></tr></thead>';
            }
        }

    } catch (error) {
        console.error('Error en fetchMateriasForHorario:', error);
        showMessage('horario-alert-message', 'Error al cargar las materias.', 'alert-error');
    }
}

/**
 * Carga la tabla de Horarios basada en la Materia seleccionada.
 */
window.fetchHorarios = async function() {
    showMessage('horario-alert-message', '', 'hidden');
    const idMateria = materiaSelect.value;
    btnCreateHorario.style.display = 'none'; // Ocultar por defecto
    
    // Muestra el estado de carga en la tabla
    if (horarioTable) {
        horarioTable.innerHTML = '<thead><tr><th colspan="5" style="text-align: center;">Cargando horarios...</th></tr></thead>';
    }

    if (!idMateria) {
        if (horarioTable) {
            horarioTable.innerHTML = '<thead><tr><th colspan="5" style="text-align: center;">Por favor, seleccione una materia.</th></tr></thead>';
        }
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/horarios?id_materia=${idMateria}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Error al obtener horarios');

        currentHorarios = await response.json();
        drawHorarioTable(currentHorarios);
        
        // 🟢 Control de Visibilidad del Botón "Agregar Horario"
        if (canModifyHorario()) {
            btnCreateHorario.style.display = 'block'; 
        }

    } catch (error) {
        console.error('Error en fetchHorarios:', error);
        showMessage('horario-alert-message', 'Error al cargar los horarios.', 'alert-error');
        if (horarioTable) {
            horarioTable.innerHTML = '<thead><tr><th colspan="5" style="text-align: center;">No se pudieron cargar los horarios.</th></tr></thead>';
        }
    }
}

// =======================================================
// 4. DIBUJAR LA TABLA (AJUSTE POR ROL)
// =======================================================

function drawHorarioTable(horarios) {
    if (!horarioTable) return;
    
    // 🟢 Determinar si el usuario tiene permisos para ver la columna de acciones
    const showActions = canModifyHorario();
    
    // 1. ELIMINAR CUALQUIER CONTENIDO ANTERIOR
    horarioTable.innerHTML = ''; 

    // 2. CREAR Y DIBUJAR EL ENCABEZADO (<thead>)
    const tableHead = horarioTable.createTHead();
    let headerHtml = `
        <tr>
            <th >NOMBRE de MATERIA</th>
            <th style="text-align: center;">DÍA</th>
            <th style="text-align: center;">HORA INICIO</th>
            <th style="text-align: center;">HORA FIN</th>
    `;
    if (showActions) {
        headerHtml += `<th style="text-align: center;">ACCIONES</th>`;
    }
    headerHtml += `</tr>`;
    tableHead.innerHTML = headerHtml;

    // 3. CREAR EL CUERPO DE LA TABLA (<tbody>)
    const tableBody = document.createElement('tbody');
    tableBody.id = 'horario-table-body'; 
    horarioTable.appendChild(tableBody);
    
    // 4. COMPROBAR SI HAY DATOS
    if (horarios.length === 0) {
        // Colspan ajustado dinámicamente: 4 si no hay acciones, 5 si hay acciones
        const colspan = showActions ? 5 : 4; 
        tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center;">No hay horarios registrados para esta materia.</td></tr>`;
        return;
    }
    
    const defaultMateriaName = materiaSelect.options[materiaSelect.selectedIndex].textContent.split('(')[0].trim();

    // 5. DIBUJAR LAS FILAS (<tbody>)
    horarios.forEach(horario => {
        const row = tableBody.insertRow();
        
        const materiaName = horario.nombre_materia || defaultMateriaName;
        
        let rowHtml = `
            <td style="text-align: center;">${materiaName}</td>
            <td style="text-align: center;">${horario.dia_semana}</td>
            <td style="text-align: center;">${horario.hora_inicio.substring(0, 5)}</td>
            <td style="text-align: center;">${horario.hora_fin.substring(0, 5)}</td>
        `;

        // 🟢 Inyectar botones de acción solo si el rol lo permite
        if (showActions) {
            rowHtml += `
                <td class="actions-column" style="text-align: center;">
                    <button class="btn btn-info btn-sm" onclick="openEditHorarioModal(${horario.id_horario})">
                        <i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteHorario(${horario.id_horario})">
                        <i class="fas fa-trash"></i></button>
                </td>
            `;
        }

        row.innerHTML = rowHtml;
    });
}

// =======================================================
// 5. MODALES DE CREACIÓN Y EDICIÓN (VERIFICACIÓN DE ROL)
// =======================================================

window.openCreateHorarioModal = function() {
    // 🟢 Verificación de rol en el modal de creación
    if (!canModifyHorario()) {
        showMessage('horario-alert-message', 'No tiene permisos para crear horarios.', 'alert-error');
        return;
    }
    
    horarioModalTitle.textContent = 'Agregar Horario';
    horarioForm.reset();
    document.getElementById('id-horario').value = ''; 
    
    // Asegura que el id_materia esté en el formulario antes de abrir
    document.getElementById('id-materia-horario').value = materiaSelect.value; 

    openModal('horario-modal');
}

window.openEditHorarioModal = function(id_horario) {
    // 🟢 Verificación de rol en el modal de edición
    if (!canModifyHorario()) {
        showMessage('horario-alert-message', 'No tiene permisos para editar horarios.', 'alert-error');
        return;
    }
    
    horarioModalTitle.textContent = 'Editar Horario';
    const horario = currentHorarios.find(h => h.id_horario == id_horario);

    if (horario) {
        document.getElementById('id-horario').value = horario.id_horario;
        document.getElementById('id-materia-horario').value = horario.id_materia; 
        document.getElementById('dia-semana').value = horario.dia_semana;
        // La entrada de tipo 'time' solo espera HH:MM
        document.getElementById('hora-inicio').value = horario.hora_inicio.substring(0, 5);
        document.getElementById('hora-fin').value = horario.hora_fin.substring(0, 5);

        openModal('horario-modal');
    } else {
        showMessage('horario-alert-message', 'No se encontró el horario para editar.', 'alert-error');
    }
}

// Nota: Esta función es redundante si ya está definida globalmente
window.closeModal = function(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// =======================================================
// 6. MANEJO DE SUBMIT (Crear/Editar) (VERIFICACIÓN DE ROL)
// =======================================================

async function handleHorarioSubmit(event) {
    event.preventDefault();
    showMessage('horario-alert-message', '', 'hidden');
    
    // 🟢 Doble verificación de rol antes de la petición API
    if (!canModifyHorario()) {
        showMessage('horario-alert-message', 'Permisos insuficientes para guardar horarios.', 'alert-error');
        return;
    }

    const id_horario = document.getElementById('id-horario').value;
    const isEditing = !!id_horario;
    
    const formData = new FormData(horarioForm);
    const data = Object.fromEntries(formData.entries());

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `${API_BASE_URL}/horarios/${id_horario}` : `${API_BASE_URL}/horarios`;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            // El backend debe manejar el error 403 Forbidden para permisos insuficientes
            throw new Error(errorData.message || `Error al ${isEditing ? 'editar' : 'crear'} el horario.`);
        }

        closeModal('horario-modal');
        showMessage('horario-alert-message', `Horario ${isEditing ? 'editado' : 'creado'} con éxito.`, 'alert-success');
        fetchHorarios(); // Recargar la tabla
        
    } catch (error) {
        console.error('Error al guardar horario:', error);
        showMessage('horario-alert-message', `Error al guardar el horario: ${error.message}`, 'alert-error');
    }
}

// =======================================================
// 7. ELIMINAR (VERIFICACIÓN DE ROL) - IMPLEMENTACIÓN ELIMINACIÓN LÓGICA
// =======================================================

window.deleteHorario = async function(id_horario) {
    // 🟢 Verificación de rol antes de la confirmación
    if (!canModifyHorario()) {
        Swal.fire('Acceso Denegado', 'No tiene permisos para dar de baja horarios.', 'error');
        return;
    }
    
    // 🚨 ACTUALIZACIÓN: Mensaje adaptado a la eliminación lógica (dar de baja/desactivar)
    const result = await Swal.fire({
        title: '¿Estás seguro de dar de baja este horario?',
        text: 'Esta acción dará de baja este horario, y ya no será visible en el listado, pero mantendrá un registro para auditoría!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', // Rojo
        cancelButtonColor: '#3085d6', // Azul
        confirmButtonText: 'Sí, dar de baja', // 🚨 CAMBIO DE TEXTO
        cancelButtonText: 'Cancelar',
        allowOutsideClick: false
    });

    // 💡 Si el usuario no presionó "Sí, dar de baja", salimos.
    if (!result.isConfirmed) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/horarios/${id_horario}`, {
            method: 'DELETE', // El método DELETE en la ruta de la API invoca la función de eliminación lógica en el backend
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            // El backend debe manejar el error 403 Forbidden para permisos insuficientes
            throw new Error(errorData.message || 'Error al dar de baja el horario.');
        }

        // 🚨 ACTUALIZACIÓN: Mensaje de éxito adaptado
        Swal.fire(
            '¡Dado de Baja!',
            'El horario ha sido dado de baja con éxito.',
            'success'
        );

        fetchHorarios(); // Recargar la tabla
        
    } catch (error) {
        console.error('Error al dar de baja el horario:', error);
        Swal.fire(
            'Error',
            `Fallo al dar de baja el horario: ${error.message}`,
            'error'
        );
    }
}