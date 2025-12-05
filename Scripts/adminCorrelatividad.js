// Scripts/adminCorrelatividad.js
// Lógica Específica del CRUD, Filtro y Modales de Correlatividades.

// 🔴 1. IMPORTACIÓN CLAVE: Importar las utilidades desde nav.js, incluyendo getRole.
import { getToken, getRole, handleLogout, showMessage, API_BASE_URL } from './nav.js';

// Definición de URLs específicas
const CARRERAS_API_URL = API_BASE_URL + '/carreras'; 
const MATERIAS_API_URL = API_BASE_URL + '/materias'; 
const CORRELATIVIDADES_API_URL = API_BASE_URL + '/correlatividades';
const CORRELATIVIDADES_FILTRO_URL = CORRELATIVIDADES_API_URL + '/por-materia';

// ----------------------------------------------------
// 2. ELEMENTOS DE LA UI, MODAL Y CONTENEDORES
// ----------------------------------------------------

const selectCarrera = document.getElementById('carrera-select');
const selectMateriaPrincipal = document.getElementById('materia-principal-select'); // Segundo filtro
const tableBody = document.querySelector('#correlatividad-table tbody');
const tableHead = document.querySelector('#correlatividad-table thead');
const modal = document.getElementById('correlatividad-modal');
const form = document.getElementById('correlatividad-form');
const modalTitle = document.getElementById('modal-title');
const btnCrearCorrelativa = document.getElementById('btn-crear-correlativa');
const tableContainer = document.getElementById('correlatividad-table-container'); 
const selectMateriaRequisito = document.getElementById('id_materia_requisito'); 
// 💡 Elemento para el mensaje de estado (ya no se usa la lógica gradual)
const correlatividadMessage = document.getElementById('correlatividad-message'); // Aún se mantiene por si se usa para otros mensajes de error.

const TOTAL_COLUMNS = 5; 

/**
 * Muestra un mensaje de estado en el cuerpo de la tabla.
 */
function showTableMessage(message, colspan = TOTAL_COLUMNS) {
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center; padding: 20px;">${message}</td></tr>`;
    }
    // Asegurar que la tabla sea visible si mostramos un mensaje dentro de ella.
    if (tableContainer) {
        tableContainer.style.display = 'block';
    }
    // Ocultar el botón si no hay datos cargados
    btnCrearCorrelativa.style.display = 'none';
    // Limpiar el encabezado cuando se muestra un mensaje de estado general
    if (tableHead) {
        tableHead.innerHTML = '';
    }
}

/**
 * Limpia la tabla y oculta el botón de crear.
 * Se usa como estado inicial cuando no hay filtros seleccionados.
 */
function clearTableArea() {
    if (tableBody) {
        tableBody.innerHTML = ''; // Cuerpo vacío
    }
    if (tableHead) {
        tableHead.innerHTML = ''; // Encabezado vacío
    }
    btnCrearCorrelativa.style.display = 'none';
    // Opcional: Ocultar el contenedor de la tabla si el HTML lo permite
    // if (tableContainer) {
    //     tableContainer.style.display = 'none'; 
    // }
}


// ----------------------------------------------------
// 3. LÓGICA DE FILTROS Y CARGA DE DATOS
// ----------------------------------------------------

/**
 * Obtiene y llena el dropdown de carreras.
 */
const fetchCarrerasForSelect = async () => {
    let token;
    try { 
        token = getToken(); 
    } catch (e) { 
        return; 
    }
    
    // 💡 Paso 1: Mostrar mensaje de carga dentro de la tabla
    showTableMessage('Cargando carreras...'); 

    try {
        const response = await fetch(CARRERAS_API_URL, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Error al obtener el listado de carreras para el filtro.');
        }

        const carreras = await response.json();
        
        selectCarrera.innerHTML = '<option value="">-- Seleccionar una Carrera --</option>';
        carreras.forEach(carrera => {
            const option = document.createElement('option');
            option.value = carrera.id_carrera;
            option.textContent = carrera.nombre_carrera;
            selectCarrera.appendChild(option);
        });
        
        // 🔴 LÓGICA ELIMINADA: No mostrar mensaje de guía, solo limpiar el área si no hay selección.
        if (!selectCarrera.value) {
            clearTableArea(); // Deja la tabla vacía
        }

    } catch (error) {
        console.error('Error al cargar carreras:', error);
        selectCarrera.innerHTML = '<option value="">Error al cargar carreras</option>';
        showTableMessage(`Fallo al cargar carreras: ${error.message}`);
    }
};

/**
 * Obtiene y llena el dropdown de materias basado en la carrera seleccionada.
 */
const fetchMateriasForSelect = async (idCarrera) => {
    selectMateriaPrincipal.innerHTML = '<option value="">-- Cargando Materias... --</option>';
    selectMateriaPrincipal.disabled = true;
    
    if (!idCarrera) {
        selectMateriaPrincipal.innerHTML = '<option value="">-- Seleccionar una Materia --</option>';
        // 🔴 LÓGICA ELIMINADA: Al no haber carrera seleccionada, volvemos a dejar el área limpia.
        clearTableArea();
        return;
    }
    
    // 💡 Limpiar tabla al seleccionar una nueva carrera
    showTableMessage('Cargando materias...');
    
    let token;
    try { token = getToken(); } catch (e) { return; } 

    try {
        const url = `${MATERIAS_API_URL}?id_carrera=${idCarrera}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Error al obtener el listado de materias.');
        }

        const materias = await response.json();
        
        // Almacenar las materias en el DOM para fácil acceso
        selectMateriaPrincipal.dataset.materias = JSON.stringify(materias);

        selectMateriaPrincipal.innerHTML = '<option value="">-- Seleccionar una Materia --</option>';
        
        if (materias.length === 0) {
            // Si la carrera no tiene materias
            selectMateriaPrincipal.disabled = true;
            showTableMessage('La carrera seleccionada no tiene materias asignadas.');
            return;
        }
        
        materias.forEach(materia => {
            const option = document.createElement('option');
            option.value = materia.id_materia;
            option.textContent = `${materia.nombre_materia}`;
            selectMateriaPrincipal.appendChild(option);
        });
        
        selectMateriaPrincipal.disabled = false;
        
        // 🔴 LÓGICA ELIMINADA: Ya no se muestra el mensaje de "Ahora, seleccione una Materia Principal.".
        // El área de la tabla se queda vacía, esperando la selección.
        clearTableArea(); 
        
    } catch (error) {
        console.error('Error al cargar materias:', error);
        selectMateriaPrincipal.innerHTML = '<option value="">Error al cargar materias</option>';
        selectMateriaPrincipal.disabled = true;
        showTableMessage(`Fallo al cargar materias: ${error.message}`);
    }
};

/**
 * Obtiene y lista las correlatividades para una materia seleccionada (idMateriaPrincipal).
 */
const fetchCorrelatividades = async (idMateriaPrincipal) => {
    
    if (!idMateriaPrincipal) {
        // 🔴 LÓGICA MODIFICADA: Si no hay materia, solo limpiamos el área.
        clearTableArea();
        return;
    }

    let token;
    try { token = getToken(); } catch (e) { return; } 
    
    // Muestra temporalmente un mensaje de carga en el cuerpo de la tabla
    showTableMessage('Cargando correlatividades...');
    
    try {
        // Se llama a la API con el filtro id_materia_principal
        const url = `${CORRELATIVIDADES_FILTRO_URL}/${idMateriaPrincipal}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Error interno del servidor al obtener el listado de correlatividades.');
        }

        const correlatividades = await response.json();
        
        // Renderizar la tabla con los datos (incluyendo nombres de materias)
        renderCorrelatividadesTable(correlatividades, idMateriaPrincipal);
        
        // Mostrar el botón de agregar
        btnCrearCorrelativa.style.display = 'inline-flex';

    } catch (error) {
        console.error('Error en fetchCorrelatividades:', error);
        // Si hay error, volvemos a mostrar el mensaje de error dentro de la tabla
        showTableMessage(`Error al cargar las correlatividades: ${error.message}`);
    }
};

/**
 * Dibuja los encabezados y filas de la tabla de correlatividades.
 * La materia principal es la seleccionada en el filtro.
 */
const renderCorrelatividadesTable = (correlatividades, idMateriaPrincipal) => {
    
    // 1. Obtener el nombre de la materia principal para mostrarlo
    const materiasData = JSON.parse(selectMateriaPrincipal.dataset.materias || '[]');
    const materiaPrincipal = materiasData.find(m => String(m.id_materia) === String(idMateriaPrincipal));
    const nombreMateriaPrincipal = materiaPrincipal ? materiaPrincipal.nombre_materia : 'N/A';
    
    // 1. DIBUJAR ENCABEZADOS
    tableHead.innerHTML = `
        <tr>
            <th>MATERIA PRINCIPAL</th>
            <th>CORRELATIVA</th>
            <th>RÉGIMEN DE CORRELATIVIDAD</th>
            <th>ESTADO DE CORRELATIVA</th>
            <th>ACCIONES</th>
        </tr>
    `;
    
    tableBody.innerHTML = ''; 
    
    if (correlatividades.length === 0) {
        // Muestra el mensaje de tabla vacía dentro del cuerpo de la tabla. (Este mensaje SÍ se mantiene)
        tableBody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}" style="text-align: center;">No se encontraron correlatividades para "${nombreMateriaPrincipal}".</td></tr>`;
        return;
    }

    // 2. DIBUJAR FILAS
    correlatividades.forEach(corr => {
        const row = tableBody.insertRow();
        
        // Buscar el nombre de la materia requisito en el dataset de materias
        const materiaRequisito = materiasData.find(m => String(m.id_materia) === String(corr.id_materia_requisito));
        const nombreMateriaRequisito = materiaRequisito 
            ? `${materiaRequisito.nombre_materia}` 
            : `ID: ${corr.id_materia_requisito} (No Encontrada)`;
        
        row.innerHTML = `
            <td style="text-align: center;">${nombreMateriaPrincipal}</td>
            <td style="text-align: center;">${nombreMateriaRequisito}</td>
            <td style="text-align: center;">${corr.tipo || ''}</td>
            <td style="text-align: center;">${corr.estado_requisito || ''}</td>
            
            <td style="text-align: center;">
                <button class="btn btn-info btn-sm" onclick="window.openEditCorrelatividadModal(${corr.id_correlatividad})"><i class="fas fa-edit"></i> </button>
                <button class="btn btn-danger btn-sm" onclick="window.deleteCorrelatividad(${corr.id_correlatividad})"><i class="fas fa-trash"></i> </button>
            </td>
        `;
    });
};


// ----------------------------------------------------
// 4. LÓGICA DEL CRUD
// ----------------------------------------------------

/**
 * Maneja la creación y actualización de correlatividades.
 */
const saveCorrelatividad = async (event) => {
    event.preventDefault();
    let token;
    try { token = getToken(); } catch (e) { return; } 

    const id = document.getElementById('correlatividad-id').value;
    const isEditing = id.length > 0;
    
    const data = {
        id_materia_principal: parseInt(document.getElementById('id_materia_principal').value),
        id_materia_requisito: parseInt(selectMateriaRequisito.value), 
        tipo: document.getElementById('tipo').value,
        estado_requisito: document.getElementById('estado_requisito').value,
    };
    
    // Validar campos
    if (isNaN(data.id_materia_principal) || isNaN(data.id_materia_requisito)) {
        showMessage('modal-message', 'Verifique que la materia principal y la requisito estén seleccionadas.', 'alert-error');
        return;
    }

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `${CORRELATIVIDADES_API_URL}/${id}` : CORRELATIVIDADES_API_URL;

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
            
            // 🔴 Manejo de error 403 (Permiso denegado por el backend)
            if (response.status === 403) {
                throw new Error(result.message || 'Permiso denegado. No tiene autoridad sobre la materia principal.');
            }

            throw new Error(result.message || `Error al ${isEditing ? 'actualizar' : 'crear'} correlatividad.`);
        }
        
        const action = isEditing ? 'actualizada' : 'creada';
        showMessage('modal-message', `Correlatividad ${action} con éxito.`, 'alert-success'); 
        
        setTimeout(() => {
            window.closeCorrelatividadModal();
            fetchCorrelatividades(data.id_materia_principal);
        }, 1500);

    } catch (error) {
        console.error('Error al guardar correlatividad:', error);
        showMessage('modal-message', `Fallo en el proceso: ${error.message}`, 'alert-error');
    }
};

/**
 * Dar de baja (Eliminación Lógica) una correlatividad por su ID usando SweetAlert2 (Exportado a window).
 * 💡 MODIFICADO para reflejar la eliminación lógica.
 */
window.deleteCorrelatividad = async (id) => {

    const result = await Swal.fire({
        // 🔴 Título cambiado para indicar que es una baja
        title: '¿Estás seguro de dar de baja esta correlatividad?',
        // 🔴 Texto cambiado para reflejar la eliminación lógica y la trazabilidad
        text: '¡Esta acción dará de baja la correlatividad, y ya no será visible en el listado, pero mantendrá un registro para auditoría!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#3085d6', 
        // 🔴 Texto del botón cambiado
        confirmButtonText: 'Sí, dar de baja',
        cancelButtonText: 'Cancelar',
        allowOutsideClick: false
    });

    if (!result.isConfirmed) {
        return;
    }
    
    let token;
    try { token = getToken(); } catch (e) { return; } 
    
    const idMateriaPrincipal = selectMateriaPrincipal.value;

    try {
        // Mantenemos el método DELETE, el backend sabe que debe hacer un UPDATE
        const response = await fetch(`${CORRELATIVIDADES_API_URL}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const resultData = await response.json();
            
            // 🔴 Manejo de error 403 (Permiso denegado por el backend)
            if (response.status === 403) {
                throw new Error(resultData.message || 'Permiso denegado. No tiene autoridad sobre la materia principal.');
            }

            // 🔴 Mensaje de error actualizado
            throw new Error(resultData.message || 'Error al dar de baja la correlatividad.');
        }
        
        // 🔴 Mensaje de éxito actualizado
        Swal.fire(
            '¡Dada de Baja!',
            'La correlatividad ha sido dada de baja con éxito.',
            'success'
        );
        
        fetchCorrelatividades(idMateriaPrincipal); 

    } catch (error) {
        console.error('Error al dar de baja correlatividad:', error);
        Swal.fire(
            'Error',
            `Fallo al dar de baja: ${error.message}`,
            'error'
        );
    }
};


// ----------------------------------------------------
// 5. LÓGICA DEL MODAL (Exportado a window)
// ----------------------------------------------------

const loadMateriasForModalSelect = (idCarrera) => {
    selectMateriaRequisito.innerHTML = '<option value="">-- Seleccione Materia Requisito --</option>';
    if (!idCarrera) return;

    // Usar los datos de materias ya cargados en el dataset
    const materias = JSON.parse(selectMateriaPrincipal.dataset.materias || '[]');
    
    // 💡 Filtramos la materia principal para que no pueda ser requisito de sí misma
    const idMateriaPrincipal = selectMateriaPrincipal.value;
    
    materias.forEach(materia => {
        // Aseguramos que la materia requisito no sea la materia principal
        if (String(materia.id_materia) !== String(idMateriaPrincipal)) {
            const option = document.createElement('option');
            option.value = materia.id_materia;
            option.textContent = `${materia.nombre_materia}`;
            selectMateriaRequisito.appendChild(option);
        }
    });
};


const openCorrelatividadModal = (title) => {
    modalTitle.textContent = title;
    // 💡 Usamos document.getElementById para el elemento modal-message en el modal
    const modalMessage = document.getElementById('modal-message');
    if (modalMessage) {
        modalMessage.classList.add('hidden');
    }
    modal.style.display = 'flex'; 
};

window.openCreateCorrelatividadModal = () => {
    const idCarrera = selectCarrera.value;
    const idMateriaPrincipal = selectMateriaPrincipal.value;
    const nombreMateriaPrincipal = selectMateriaPrincipal.options[selectMateriaPrincipal.selectedIndex].text;

    if (!idMateriaPrincipal || selectMateriaPrincipal.selectedIndex === 0) {
        // 💡 Usamos showMessage para errores de UX, apuntando al nuevo div de alertas en el HTML
        showMessage('correlatividad-alert-message', 'Debe seleccionar una materia principal válida para agregar correlativas.', 'alert-error');
        return;
    }
    
    // Limpiamos el mensaje de error anterior si existe
    showMessage('correlatividad-alert-message', '', 'alert-hide');

    form.reset();
    document.getElementById('correlatividad-id').value = '';
    
    // Asignar IDs y nombres
    document.getElementById('id_materia_principal').value = idMateriaPrincipal;
    document.getElementById('nombre_materia_principal').value = nombreMateriaPrincipal;
    
    loadMateriasForModalSelect(idCarrera);

    openCorrelatividadModal('Agregar Correlatividad');
}

window.closeCorrelatividadModal = () => {
    modal.style.display = 'none';
    const modalMessage = document.getElementById('modal-message');
    if (modalMessage) {
        modalMessage.classList.add('hidden'); 
    }
    // Opcional: limpiar el mensaje de alerta de la UI al cerrar el modal
    showMessage('correlatividad-alert-message', '', 'alert-hide');
};

window.openEditCorrelatividadModal = async (id) => {
    let token;
    try { token = getToken(); } catch (e) { return; } 

    try {
        const response = await fetch(`${CORRELATIVIDADES_API_URL}/${id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            
            // 🔴 Manejo de error 403 (Permiso denegado por el backend)
            if (response.status === 403) {
                 Swal.fire('Error de Permisos', errorData.message || 'No tiene autoridad para editar esta correlatividad.', 'error');
                 return;
            }
            
            // También capturará 404 si la correlatividad fue eliminada lógicamente (inactiva)
            throw new Error(errorData.message || 'Error al cargar los datos de la correlatividad.');
        }

        const corr = await response.json();
        
        // Cargar materias para el select requisito
        loadMateriasForModalSelect(selectCarrera.value);

        // Llenar el formulario
        document.getElementById('correlatividad-id').value = corr.id_correlatividad;
        
        // La Materia Principal (Filtro) no se edita en el modal
        document.getElementById('id_materia_principal').value = corr.id_materia_principal;
        // Obtener el nombre de la materia principal desde la lista (para asegurarnos de que sea el correcto)
        const principalOption = Array.from(selectMateriaPrincipal.options).find(opt => String(opt.value) === String(corr.id_materia_principal));
        const nombreMateriaPrincipal = principalOption ? principalOption.text : 'N/A';
        document.getElementById('nombre_materia_principal').value = nombreMateriaPrincipal;

        selectMateriaRequisito.value = corr.id_materia_requisito;
        document.getElementById('tipo').value = corr.tipo;
        document.getElementById('estado_requisito').value = corr.estado_requisito;

        openCorrelatividadModal('Editar Correlatividad'); 
        
    } catch (error) {
        console.error('Error en openEditCorrelatividadModal:', error);
        Swal.fire('Error', `Error al cargar datos: ${error.message}`, 'error');
    }
};


// ----------------------------------------------------
// 6. INICIALIZACIÓN DEL MÓDULO (Event Listeners)
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Cargar las carreras al inicio
    fetchCarrerasForSelect();
    
    // 2. Evento de Cambio en el Filtro de Carrera
    selectCarrera.addEventListener('change', (e) => {
        // Al cambiar la carrera, recargar el segundo select
        fetchMateriasForSelect(e.target.value);
    });
    
    // 3. Evento de Cambio en el Filtro de Materia Principal
    selectMateriaPrincipal.addEventListener('change', (e) => {
        // Al cambiar la materia, cargar la tabla de correlatividades
        fetchCorrelatividades(e.target.value);
    });
    
    // 4. Inicializar Eventos del Modal
    btnCrearCorrelativa.addEventListener('click', window.openCreateCorrelatividadModal);
    document.querySelector('#correlatividad-modal .close-btn').addEventListener('click', window.closeCorrelatividadModal);
    
    // 5. Manejar el envío del formulario (Crear/Editar)
    form.addEventListener('submit', saveCorrelatividad);

});