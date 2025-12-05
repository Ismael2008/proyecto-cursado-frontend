// Scripts/adminAdministrador.js
// Lógica Específica del CRUD, Filtro y Modales de Administradores.

// 🔴 1. IMPORTACIÓN CLAVE: Importar utilidades, incluyendo getRole, getToken, y showMessage.
import { getToken, getRole, API_BASE_URL, showMessage } from './nav.js';

// URL específica para el CRUD de administradores (usamos '/usuarios' como en adminRoutes.js)
const ADMIN_API_URL = API_BASE_URL + '/usuarios'; 

// ----------------------------------------------------
// 2. ELEMENTOS DE LA UI, MODAL Y CONTENEDORES
// ----------------------------------------------------

const tableBody = document.querySelector('#administrador-table tbody');
const tableHead = document.querySelector('#administrador-table thead');
const modal = document.getElementById('administrador-modal');
const form = document.getElementById('administrador-form');
const modalTitle = document.getElementById('modal-title');
const btnCrearAdmin = document.getElementById('btn-crear-admin');
const tableContainer = document.getElementById('administrador-table-container'); 
const passwordInput = document.getElementById('contraseña');
const passwordHelp = document.getElementById('password-help');
const togglePassword = document.getElementById('toggle-password');
// ID del campo oculto para el ID del administrador
const adminIdInput = document.getElementById('administrador-id'); 
// 🟢 NUEVO: Campo de estado (asumiendo un input/select con id="estado" en el modal)
const estadoInput = document.getElementById('estado');
// 🟢 NUEVO: Contenedor del campo de estado (asumiendo un div con id="estado-group")
const estadoGroup = document.getElementById('estado-group'); 

// 🟢 ACTUALIZADO: El total de columnas visibles ahora es 8 (6 datos + estado + 1 acción)
const TOTAL_COLUMNS = 8; 


// ----------------------------------------------------
// 3. LÓGICA DE CARGA DE DATOS (Sin cambios)
// ----------------------------------------------------

/**
 * Muestra un mensaje de estado en el cuerpo de la tabla.
 */
function showTableMessage(message, colspan = TOTAL_COLUMNS) {
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center; padding: 20px;">${message}</td></tr>`;
    }
    if (btnCrearAdmin) {
        btnCrearAdmin.style.display = 'inline-flex';
    }
}

/**
 * Obtiene y lista todos los administradores.
 */
const fetchAdministradores = async () => {
    let token;
    // 🟢 CAMBIO CLAVE: Permitir la entrada si el rol es Rector O Coordinador
    const role = getRole();
    if (role !== 'Rector' && role !== 'Coordinador') { 
        showTableMessage('🔴 Acceso Denegado. Solo roles de gestión.', TOTAL_COLUMNS);
        if (tableContainer) tableContainer.style.display = 'none';
        if (btnCrearAdmin) btnCrearAdmin.style.display = 'none';
        return; 
    }
    
    try { token = getToken(); } catch (e) { return; } 
    
    showTableMessage('Cargando administradores...'); 

    try {
        // 🟢 NUEVO: Si es Coordinador, obtener solo sus propios datos (luego filtramos en el cliente)
        const currentAdminPayload = JSON.parse(atob(token.split('.')[1]));
        const currentAdminId = currentAdminPayload.id_administrador;

        const response = await fetch(ADMIN_API_URL, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 403) {
            throw new Error('Permiso denegado por el servidor.');
        }

        if (!response.ok) {
            throw new Error('Error al obtener el listado de administradores.');
        }

        let administradores = await response.json();
        
        // 🟢 FILTRADO: Si es Coordinador, solo mostramos su propia fila.
        if (role === 'Coordinador') {
            administradores = administradores.filter(admin => admin.id_administrador === currentAdminId);
            // Ocultar elementos de gestión
            if (btnCrearAdmin) btnCrearAdmin.style.display = 'none';
            // Ocultar la columna de acciones (por defecto solo Rector puede eliminar)
            renderTableHead('Coordinador'); // Usamos una nueva versión de renderTableHead
        } else {
             // Si es Rector, mostrar todos los elementos
            if (btnCrearAdmin) btnCrearAdmin.style.display = 'inline-flex';
            renderTableHead('Rector');
        }
        
        renderAdministradoresTable(administradores, role, currentAdminId); // Pasa el rol y el ID

    } catch (error) {
        console.error('Error al cargar administradores:', error);
        showTableMessage(`Fallo al cargar administradores: ${error.message}`);
    }
};

/**
 * Muestra el encabezado de la tabla, ajustado al rol.
 */
function renderTableHead(role) {
    let headerHtml = `
        <tr>
            <th>NOMBRE</th>
            <th>EMAIL</th>
            <th>DNI</th>
            <th>TELÉFONO</th>
            <th>ROL</th>
            <th>FECHA de CREACIÓN</th>
            <th>ESTADO</th>
    `;
    // 🟢 SOLO agregar columna ACCIONES si es Rector
    if (role === 'Rector' || role === 'Coordinador') {
        headerHtml += `<th>ACCIONES</th>`;
    }
    headerHtml += `</tr>`;
    tableHead.innerHTML = headerHtml;
}

/**
 * Dibuja los encabezados y filas de la tabla de administradores.
 */
const renderAdministradoresTable = (administradores, role, currentAdminId) => {
    
    // El renderTableHead ya se llama dentro de fetchAdministradores con el rol correcto
    tableBody.innerHTML = ''; 
    
    if (administradores.length === 0) {
        showTableMessage('No se encontraron administradores registrados.', TOTAL_COLUMNS);
        return;
    }

    administradores.forEach(admin => {
        const row = tableBody.insertRow();
        
        // ... (Lógica de formato de fecha y estado sin cambios) ...
        
        const formattedDate = admin.fecha_creacion 
            ? new Date(admin.fecha_creacion).toLocaleDateString('es-AR', { 
                year: 'numeric', month: '2-digit', day: '2-digit' 
              })
            : 'N/A';
            
        let estadoDisplay;
        switch(admin.estado) {
            case 'activo':
                estadoDisplay = `<span class="badge badge-success">${admin.estado.toUpperCase()}</span>`;
                break;
            case 'suspendido':
                estadoDisplay = `<span class="badge badge-warning">${admin.estado.toUpperCase()}</span>`;
                break;
            case 'inactivo':
            default:
                estadoDisplay = `<span class="badge badge-secondary">${admin.estado.toUpperCase()}</span>`;
                break;
        }
            
        let rowHtml = `
            <td style="text-align: center;">${admin.nombre_administrador || 'N/A'}</td>
            <td style="text-align: center;">${admin.email || 'N/A'}</td>
            <td style="text-align: center;">${admin.dni || 'N/A'}</td>
            <td style="text-align: center;">${admin.telefono || 'N/A'}</td>
            <td style="text-align: center;"><strong>${admin.rol}</strong></td>
            <td style="text-align: center;">${formattedDate}</td>
            <td style="text-align: center;">${estadoDisplay}</td>
        `;

        // 🟢 Lógica de botones de acción
        if (role === 'Rector' || (role === 'Coordinador' && admin.id_administrador === currentAdminId)) {
            let actionsHtml = `<td class="actions">
                <button class="btn btn-info btn-sm" onclick="window.openEditAdministradorModal(${admin.id_administrador})"><i class="fas fa-edit"></i> </button>`;
            
            // Si es Coordinador, solo permitimos editar; si es Rector, permitimos editar y eliminar
            if (role === 'Rector') {
                actionsHtml += `<button class="btn btn-danger btn-sm" onclick="window.deleteAdministrador(${admin.id_administrador}, '${admin.nombre_administrador}')"><i class="fas fa-trash"></i> </button>`; 
            }
            actionsHtml += `</td>`;
            rowHtml += actionsHtml;
        }
        
        row.innerHTML = rowHtml;
    });
};


// ----------------------------------------------------
// 4. LÓGICA DE VALIDACIÓN DE CONTRASEÑA (Sin cambios)
// ----------------------------------------------------

/**
 * 🟢 FUNCIÓN: Valida que la contraseña cumpla con los requisitos de seguridad.
 * Requisitos: Min 8 chars, Mayúscula, Minúscula, Número, Carácter especial.
 */
const validatePassword = (password) => {
    if (password.length < 8) {
        return { valid: false, message: "La contraseña debe tener al menos 8 caracteres." };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: "La contraseña debe contener al menos una letra mayúscula." };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: "La contraseña debe contener al menos una letra minúscula." };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: "La contraseña debe contener al menos un número." };
    }
    // Permite caracteres especiales comunes
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { valid: false, message: "La contraseña debe contener al menos un carácter especial (ej: !@#$)." };
    }

    return { valid: true, message: "" };
};

// ----------------------------------------------------
// 5. LÓGICA DEL CRUD (MODIFICADA)
// ----------------------------------------------------

/**
 * Maneja la creación y actualización de administradores. (Sin cambios)
 */
const saveAdministrador = async (event) => {
    event.preventDefault();
    let token;
    try { token = getToken(); } catch (e) { return; } 

    // Obtener el rol del usuario logueado
    const currentRole = getRole();

    // ✅ Uso de adminIdInput
    const id = adminIdInput.value; 
    const isEditing = id.length > 0;
    
    const data = {
        nombre_administrador: document.getElementById('nombre_administrador').value,
        email: document.getElementById('email').value || null,
        dni: document.getElementById('dni').value || null,
        telefono: document.getElementById('telefono').value || null,
    };

    // Solo si es Rector o es una CREACIÓN, incluimos el rol.
    // Nota: La creación solo está permitida para el Rector según tu lógica.
    if (currentRole === 'Rector') {
        data.rol = document.getElementById('rol').value;
    }
    
    const contraseña = passwordInput.value;
    
    // --- Lógica de Validación de Contraseña ---
    
    // 1. Validar obligatoriedad
    if (!isEditing && contraseña.length === 0) {
        showMessage('modal-message', 'La contraseña es obligatoria para la creación.', 'alert-error');
        return;
    }
    
    // 2. Validar reglas de seguridad si hay contraseña
    if (contraseña.length > 0) {
        const validationResult = validatePassword(contraseña);
        
        if (!validationResult.valid) {
            showMessage('modal-message', validationResult.message, 'alert-error');
            return; // Detiene el envío si la validación falla
        }
    }
    
    // 3. Asignación de campo y ESTADO
    if (isEditing) {
        // 🟢 SOLO si es Rector, añadimos el campo de estado para la actualización (PUT)
        if (currentRole === 'Rector') {
            data.estado = estadoInput.value; 
        }

        if (contraseña.length > 0) {
            // El backend espera 'newContraseña' para el PUT
            data.newContraseña = contraseña; 
        }
    } else {
        // El backend espera 'contraseña' para el POST
        data.contraseña = contraseña;
    }

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `${ADMIN_API_URL}/${id}` : ADMIN_API_URL;
    const actionText = isEditing ? 'actualizar' : 'crear';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.message || `Error al ${actionText} el administrador.`);
        }
        
        const action = isEditing ? 'actualizado' : 'creado';
        showMessage('modal-message', `Administrador ${action} con éxito.`, 'alert-success'); 
        
        setTimeout(() => {
            window.closeAdministradorModal();
            fetchAdministradores(); 
        }, 1500);

    } catch (error) {
        console.error(`Error al ${actionText} administrador:`, error);
        showMessage('modal-message', `Fallo en el proceso: ${error.message}`, 'alert-error');
    }
};

/**
 * Elimina (Eliminación Lógica) un administrador por su ID (Exportado a window).
 */
window.deleteAdministrador = async (id, nombreAdmin) => { // 🟢 CAMBIO: Ahora recibe el nombre
    
    // Se usa 'Rector' aquí para el chequeo rápido, asumiendo que el getRole es robusto
    if (getRole() !== 'Rector') { 
        Swal.fire('Error', 'Acceso denegado. Solo el Rector tiene permiso para gestionar administradores.', 'error');
        return;
    }
    
    let token;
    try { token = getToken(); } catch (e) { return; } 
    
    // 🟢 CORRECCIÓN DE ERROR: Chequeo de auto-eliminación (UX)
    try {
        // Usamos el token para obtener el ID del admin logueado
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Asumimos que el payload del JWT tiene 'id_administrador' (como se usa en authMiddleware)
        const currentAdminId = payload.id_administrador; 
        
        if (String(id) === String(currentAdminId)) {
            // 🔴 CORRECCIÓN DE TEXTO: Usar "eliminar"
            Swal.fire('Prohibido', 'No puedes eliminar tu propia cuenta de administrador.', 'warning');
            return;
        }
    } catch(e) { 
        console.warn("No se pudo parsear el token para chequear auto-eliminación.", e);
        // Continuar si no se puede parsear, ya que el backend lo validará
    }

    // 🔴 CORRECCIÓN DE TEXTOS: Cambiar "Desactivar" por "Eliminar" (Lógica)
    const result = await Swal.fire({
        title: `¿Desea eliminar a: ${nombreAdmin}?`, 
        text: 'Esta acción eliminará al administrador. Ya no podrá iniciar sesión y perderá todos sus accesos.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#3085d6', 
        confirmButtonText: 'Sí, Eliminar', 
        cancelButtonText: 'Cancelar',
        allowOutsideClick: false
    });

    if (!result.isConfirmed) {
        return;
    }
    
    try {
        const response = await fetch(`${ADMIN_API_URL}/${id}`, {
            method: 'DELETE', // Mantenemos DELETE, el backend hace la lógica de UPDATE
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 403) {
             const resultData = await response.json();
             throw new Error(resultData.message || 'Permiso denegado.');
        }

        if (!response.ok) {
            const resultData = await response.json();
            // 🔴 CORRECCIÓN DE TEXTO: Usar "eliminar"
            throw new Error(resultData.message || 'Error al eliminar el administrador.');
        }
        
        // 🔴 CORRECCIÓN DE TEXTO: Usar "Eliminado"
        Swal.fire('¡Eliminado!', `El administrador ${nombreAdmin} ha sido eliminado con éxito.`, 'success'); 
        fetchAdministradores(); 

    } catch (error) {
        console.error('Error al eliminar administrador:', error);
        Swal.fire('Error', `Fallo al eliminar: ${error.message}`, 'error');
    }
};


// ----------------------------------------------------
// 6. LÓGICA DEL MODAL (Actualizada para manejar estado - Sin cambios)
// ----------------------------------------------------

const openAdministradorModal = (title) => {
    modalTitle.textContent = title;
    const modalMessage = document.getElementById('modal-message');
    if (modalMessage) {
        modalMessage.classList.add('hidden');
    }
    modal.classList.remove('hidden');
    modal.style.display = 'flex'; 
};

window.closeAdministradorModal = () => {
    modal.style.display = 'none';
    modal.classList.add('hidden');
    showMessage('administrador-alert-message', '', 'alert-hide');
};

window.openCreateAdministradorModal = () => {
    if (getRole() !== 'Rector') {
        showMessage('administrador-alert-message', 'Acceso denegado a la creación. Solo el Rector tiene permiso.', 'alert-error');
        return;
    }
    
    form.reset();
    adminIdInput.value = ''; // ✅ Uso de adminIdInput
    
    // 🟢 NUEVO: Ocultar el campo de estado en creación
    if (estadoGroup) {
        estadoGroup.style.display = 'none';
    }
    
    passwordInput.required = true;
    // 🔴 ACTUALIZACIÓN de mensaje de ayuda para reflejar la política de seguridad
    passwordHelp.textContent = 'Obligatoria. Mínimo 8 caracteres, debe incluir mayúscula, minúscula, número y símbolo.';
    passwordInput.name = 'contraseña'; 

    openAdministradorModal('Crear Nuevo Administrador');
}

window.openEditAdministradorModal = async (id) => {
    
    const role = getRole();
    let token;
    
    try { token = getToken(); } catch (e) { return; } 
    
    // 🟢 NUEVO: Lógica de validación de permisos de edición
    let currentAdminId;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentAdminId = payload.id_administrador;
    } catch(e) {
        console.error("Error al parsear token:", e);
        Swal.fire('Error', 'No se pudo verificar la identidad para la edición.', 'error');
        return;
    }

    if (role === 'Coordinador' && String(id) !== String(currentAdminId)) {
        Swal.fire('Acceso Denegado', 'Un Coordinador solo puede editar sus propios datos.', 'error');
        return;
    }
    
    if (role !== 'Rector' && role !== 'Coordinador') {
        Swal.fire('Acceso Denegado', 'Permiso insuficiente para la edición.', 'error');
        return;
    }

    try {
        const response = await fetch(`${ADMIN_API_URL}/${id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al cargar los datos del administrador.');
        }

        const admin = await response.json();
        
        // ... (Llenado del formulario sin cambios) ...
        adminIdInput.value = admin.id_administrador; 
        document.getElementById('nombre_administrador').value = admin.nombre_administrador;
        document.getElementById('email').value = admin.email || '';
        document.getElementById('dni').value = admin.dni || '';
        document.getElementById('telefono').value = admin.telefono || '';
        document.getElementById('rol').value = admin.rol;
        
        // 🟢 CAMBIO CLAVE: Ocultar o mostrar campos basados en el rol
        const rolGroup = document.getElementById('rol-group'); // Asume que el select de rol está en un div con id="rol-group"
        // Obtenemos los elementos de input/select directamente
        const rolInput = document.getElementById('rol');
        
        if (role === 'Coordinador') {
            // Un Coordinador no debe ver ni editar su rol o estado
            if (rolGroup) rolGroup.style.display = 'none';
            if (estadoGroup) estadoGroup.style.display = 'none';
            // 🛑 AÑADIDO: Deshabilitar los inputs para evitar cualquier interacción
            if (rolInput) rolInput.disabled = true;
            if (estadoInput) estadoInput.disabled = true;
        } else {
            // El Rector ve y edita todo
            if (rolGroup) rolGroup.style.display = 'block';
            if (estadoGroup) estadoGroup.style.display = 'block';
            if (estadoInput) estadoInput.value = admin.estado;
            // 🛑 AÑADIDO: Asegurarse de que no estén deshabilitados para el Rector
            if (rolInput) rolInput.disabled = false;
            if (estadoInput) estadoInput.disabled = false;
        }

        // 🟢 NOTA: Asegúrate de que el backend (`adminController.js`) ignora los campos `rol` y `estado` si el usuario logueado es Coordinador (esto ya se hizo en el turno anterior).

        passwordInput.value = ''; 
        passwordInput.required = false;
        passwordHelp.textContent = 'Dejar vacío para mantener la contraseña actual. Si se cambia: Mínimo 8 caracteres, debe incluir mayúscula, minúscula, número y símbolo.';
        
        openAdministradorModal('Editar Datos Personales'); 
        
    } catch (error) {
        console.error('Error en openEditAdministradorModal:', error);
        Swal.fire('Error', `Error al cargar datos: ${error.message}`, 'error');
    }
};


// ----------------------------------------------------
// 7. INICIALIZACIÓN DEL MÓDULO (Event Listeners - Sin cambios)
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Cargar la tabla de administradores al inicio (incluye chequeo de rol)
    fetchAdministradores();
    
    // 2. Manejar el envío del formulario (Crear/Editar)
    form.addEventListener('submit', saveAdministrador);

    // 🟢 NUEVO: Lógica para mostrar/ocultar contraseña (Toggle Password)
    const togglePasswordIcon = document.getElementById('toggle-password');
    
    if (togglePasswordIcon && passwordInput) {
        togglePasswordIcon.addEventListener('click', function (e) {
            // Alternar el tipo de input (password <-> text)
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Alternar el ícono del ojo (eye <-> eye-slash)
            this.classList.toggle('fa-eye-slash');
            this.classList.toggle('fa-eye');
        });
    }

});