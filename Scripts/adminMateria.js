// Scripts/adminMateria.js
// Lógica Específica del CRUD, Filtro y Modales de Materias.

// 🔴 1. IMPORTACIÓN CLAVE: Importar las utilidades desde nav.js
import { getToken, handleLogout, showMessage, API_BASE_URL } from './nav.js';

// Definición de URLs específicas
const CARRERAS_API_URL = API_BASE_URL + '/carreras'; 
const MATERIAS_API_URL = API_BASE_URL + '/materias'; 

// ----------------------------------------------------
// 2. ELEMENTOS DE LA UI, MODAL Y CONTENEDORES
// ----------------------------------------------------

const selectCarrera = document.getElementById('carrera-select');
const tableBody = document.querySelector('#materias-table tbody');
const tableHead = document.querySelector('#materias-table thead'); 
const modal = document.getElementById('materia-modal');
const form = document.getElementById('materia-form');
const modalTitle = document.getElementById('modal-title');
const modalCarreraSelect = document.getElementById('materia-carrera-id'); 

// 💡 Elementos para controlar la visibilidad
const btnCrearMateria = document.getElementById('btn-crear-materia');

// 🟢 El contenedor que envuelve la tabla.
const tableContainer = document.querySelector('.table-container'); 
const tablaMaterias = document.getElementById('materias-table'); // La tabla en sí

// La cantidad de columnas debe ser consistente (9 columnas de datos/acciones)
const TOTAL_COLUMNS = 9; 

/**
 * Muestra el mensaje inicial de "Por favor, seleccione una carrera"
 */
const showInitialMessage = () => {
    if (tableHead) {
        tableHead.innerHTML = '';
    }

    if (tableBody) {
        // Se usa la constante TOTAL_COLUMNS (9)
        tableBody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}" style="text-align: center; padding: 20px; font-weight: 600;">POR FAVOR, SELECCIONE UNA CARRERA.</td></tr>`;
    }
};

// ----------------------------------------------------
// 3. LÓGICA DE FILTRO Y CARGA DE DATOS
// ----------------------------------------------------

/**
 * Controla la visibilidad de la tabla, encabezados y el botón Crear.
 */
const toggleTableVisibility = (isVisible) => {
    // Usamos el .table-container para ocultar/mostrar la tabla.
    if (tableContainer) {
        // Usar 'block' o 'flex' dependiendo de tu CSS, 'block' es seguro para un div wrapper.
        tableContainer.style.display = isVisible ? 'block' : 'none'; 
    }
    // Escondemos o mostramos el botón de crear
    if (btnCrearMateria) {
        btnCrearMateria.style.display = isVisible ? 'inline-flex' : 'none';
    }
};


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
    
    // 💡 Inicialmente ocultamos la tabla y el botón
    toggleTableVisibility(false); 
    
    // MOSTRAR MENSAJE INICIAL EN EL CUERPO DE LA TABLA
    showInitialMessage();

    try {
        const response = await fetch(CARRERAS_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al obtener el listado de carreras para el filtro.');
        }

        const carreras = await response.json();
        
        // Limpiar y llenar el select principal (filtro)
        selectCarrera.innerHTML = '<option value="">-- Seleccionar una Carrera --</option>';
        modalCarreraSelect.innerHTML = ''; 

        carreras.forEach(carrera => {
            const option = document.createElement('option');
            option.value = carrera.id_carrera;
            option.textContent = carrera.nombre_carrera;
            selectCarrera.appendChild(option);

            // Asegurar que el modalCarreraSelect también tenga las opciones
            const modalOption = option.cloneNode(true);
            modalCarreraSelect.appendChild(modalOption); 
        });
        
        if(selectCarrera.value) {
             fetchMaterias(selectCarrera.value);
        }

    } catch (error) {
        console.error('Error al cargar carreras:', error);
        selectCarrera.innerHTML = '<option value="">Error al cargar carreras</option>';
        showMessage('materia-message', `Fallo al cargar carreras: ${error.message}`, 'alert-error');
    }
};

/**
 * Obtiene y lista todas las materias para una carrera seleccionada.
 */
const fetchMaterias = async (idCarrera) => {
    
    if (!idCarrera) {
        // SI NO HAY CARRERA SELECCIONADA, OCULTAR Y MOSTRAR EL MENSAJE INICIAL
        toggleTableVisibility(false); 
        showInitialMessage();
        return;
    }
    
    let token;
    try {
        token = getToken(); 
    } catch (e) { 
        return; 
    }
    
    // Mostrar el botón y la tabla antes de cargar
    toggleTableVisibility(true); 

    // Mensaje de carga mientras se espera (Esto borra el mensaje inicial)
    tableBody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}" style="text-align: center;">Cargando materias...</td></tr>`;
    
    try {
        // La URL usa id_carrera como se requiere
        const url = `${MATERIAS_API_URL}?id_carrera=${idCarrera}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            handleLogout(); 
            throw new Error('Sesión expirada o no autorizado.');
        }

        if (!response.ok) {
            let errorMessage = 'Error interno del servidor al obtener el listado de materias.';
            try {
                 const errorData = await response.json();
                 errorMessage = errorData.message || errorMessage; 
            } catch (e) { /* ignore JSON parse error */ }
            throw new Error(errorMessage); 
        }

        const materias = await response.json();
        
        // Llenar la tabla con encabezados y datos
        renderMateriasTable(materias, TOTAL_COLUMNS);

    } catch (error) {
        console.error('Error en fetchMaterias:', error);
        const errorMessage = error.message || 'Error desconocido al cargar materias.';
        showMessage('materia-message', `Error: ${errorMessage}`, 'alert-error');
        // Mostrar mensaje de error en el cuerpo de la tabla
        tableBody.innerHTML = `<tr><td colspan="${TOTAL_COLUMNS}" class="alert alert-error" style="text-align: center;">Error al cargar materias: ${errorMessage}</td></tr>`;
    }
};

/**
 * Dibuja los encabezados y filas de la tabla de materias.
 * 🟢 CORRECCIÓN CLAVE: Se asegura que el estilo de los encabezados sea compacto 
 * y que las celdas se mapeen correctamente, eliminando la lógica de scroll externa.
 */
const renderMateriasTable = (materias, totalColumns) => {
    
    // 1. 💡 DIBUJAR ENCABEZADOS (9 Columnas - Usa nowrap para evitar saltos de línea en el header)
    tableHead.innerHTML = `
        <tr>
            <th >NOMBRE de materia</th>
            <th style="text-align: center;">AÑO DE CURSADO</th>
            <th >CAMPO DE FORMACIÓN</th>
            <th >Tipo de Cursada</th>
            <th >FORMATO</th>
            <th style="text-align: center;">HORAS SEMANALES</th>
            <th style="text-align: center;">HORAS ANUALES</th>
            <th >ACREDITACIÓN</th>
            <th style="text-align: center;">ACCIONES</th>
        </tr>
    `;
    
    tableBody.innerHTML = ''; // Limpiar el cuerpo de la tabla (borra el mensaje de carga)
    
    if (materias.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${totalColumns}" style="text-align: center;">No se encontraron materias para la carrera seleccionada.</td></tr>`;
        return;
    }

    // 2. 💡 DIBUJAR FILAS (9 Celdas por Fila)
    materias.forEach(materia => {
        const row = tableBody.insertRow();
        
        // Se utiliza la propiedad 'white-space: nowrap;' en la primera columna para manejar nombres largos.
        // Se aplica 'text-align: center;' a las columnas numéricas.
        row.innerHTML = `
            <td >${materia.nombre_materia || ''}</td>
            <td style="text-align: center;">${materia.año || ''}</td>
            <td>${materia.campo_formacion || ''}</td>
            <td>${materia.modalidad || ''}</td>
            <td>${materia.formato || ''}</td>
            <td style="text-align: center;">${materia.horas_semanales || ''}</td>
            <td style="text-align: center;">${materia.total_horas_anuales || ''}</td>
            <td>${materia.acreditacion || ''}</td>
            
            <td style="white-space: nowrap;">
                <button class="btn btn-info btn-sm" onclick="window.openEditMateriaModal(${materia.id_materia})"><i class="fas fa-edit"></i> </button>
                <button class="btn btn-danger btn-sm" onclick="window.deleteMateria(${materia.id_materia})"><i class="fas fa-trash"></i> </button>
            </td>
        `;
    });
};

// ----------------------------------------------------
// 5. LÓGICA DEL CRUD (Sin cambios relevantes en la lógica, solo para completar el archivo)
// ----------------------------------------------------

/**
 * Maneja la creación y actualización de materias.
 */
const saveMateria = async (event) => {
    // ... (El resto del código de saveMateria, deleteMateria, y Modales sigue siendo el mismo)
    event.preventDefault();
    let token;
    try {
        token = getToken(); 
    } catch (e) { return; } 

    const id = document.getElementById('materia-id').value;
    const isEditing = id.length > 0;
    
    // Objeto de datos actualizado para incluir TODAS las columnas
    const data = {
        nombre_materia: document.getElementById('nombre_materia').value,
        año: parseInt(document.getElementById('anio').value), 
        campo_formacion: document.getElementById('campo_formacion').value, 
        modalidad: document.getElementById('modalidad').value,
        formato: document.getElementById('formato').value,
        horas_semanales: parseInt(document.getElementById('horas_semanales').value),
        total_horas_anuales: parseInt(document.getElementById('total_horas_anuales').value),
        acreditacion: document.getElementById('acreditacion').value,
        id_carrera: parseInt(document.getElementById('materia-carrera-id').value), 
    };
    
    // Validar campos
    if (!data.nombre_materia || isNaN(data.año) || isNaN(data.horas_semanales) || isNaN(data.total_horas_anuales) || isNaN(data.id_carrera)) {
        showMessage('modal-message', 'Verifique que todos los campos requeridos estén llenos y sean números válidos.', 'alert-error');
        return;
    }


    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `${MATERIAS_API_URL}/${id}` : MATERIAS_API_URL;

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
            throw new Error(result.message || `Error al ${isEditing ? 'actualizar' : 'crear'} materia.`);
        }
        
        const result = await response.json();
        showMessage('modal-message', result.message || `Materia ${isEditing ? 'actualizada' : 'creada'} con éxito.`, 'alert-success'); 
        
        const currentCarreraId = selectCarrera.value;
        if (String(data.id_carrera) === currentCarreraId) {
             setTimeout(() => {
                 window.closeMateriaModal();
                 fetchMaterias(currentCarreraId);
             }, 1500);
        } else {
             setTimeout(() => {
                 window.closeMateriaModal();
             }, 1500);
        }


    } catch (error) {
        console.error('Error al guardar materia:', error);
        showMessage('modal-message', `Fallo en el proceso: ${error.message}`, 'alert-error');
    }
};

/**
 * Elimina una materia por su ID (Exportado a window para onclick).
 * 🔑 ACTUALIZACIÓN: Implementa la mensajería para la Eliminación Lógica (Dar de Baja).
 */
window.deleteMateria = async (id) => {
    const result = await Swal.fire({
        title: '¿Estás seguro de dar de baja esta materia?',
        // Mensaje ajustado para eliminación lógica
        text: 'Al confirmar, la materia será dada de baja y no aparecerá en los listado, pero mantendrá un registro para auditoría!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#3085d6', 
        confirmButtonText: 'Sí, dar de baja', // Texto del botón de confirmación actualizado
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
        const response = await fetch(`${MATERIAS_API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.message || 'Error al dar de baja la materia.');
        }
        
        // La respuesta del backend ya contiene el mensaje de éxito de la baja
        const resultData = await response.json();
        Swal.fire(
            '¡Dada de Baja!', // Título de éxito actualizado
            resultData.message || 'La materia ha sido dada de baja con éxito.', // Mensaje de éxito actualizado
            'success'
        );
        
        // Recargar el listado después de la baja (para que desaparezca de la tabla activa)
        fetchMaterias(selectCarrera.value);

    } catch (error) {
        console.error('Error al dar de baja la materia:', error);
        Swal.fire(
            'Error',
            `Fallo al dar de baja: ${error.message}`,
            'error'
        );
    }
};


// ----------------------------------------------------
// 6. LÓGICA DEL MODAL (Funciones del Modal)
// ----------------------------------------------------

const openMateriaModal = (title) => {
    modalTitle.textContent = title;
    document.getElementById('modal-message').classList.add('hidden');
    modal.style.display = 'flex'; 
};

window.openCreateMateriaModal = () => { // Se hace global para el onclick del botón Crear
    form.reset();
    document.getElementById('materia-id').value = '';
    
    const selectedCarrera = selectCarrera.value;
    if (selectedCarrera) {
        modalCarreraSelect.value = selectedCarrera;
        modalCarreraSelect.disabled = true; 
    } else {
        modalCarreraSelect.disabled = false;
    }

    openMateriaModal('Agregar Materia');
}

window.closeMateriaModal = () => {
    modal.style.display = 'none';
    modalCarreraSelect.disabled = false;
    // Ocultar mensaje al cerrar
    document.getElementById('modal-message').classList.add('hidden'); 
};

window.openEditMateriaModal = async (id) => {
    let token;
    try {
        token = getToken(); 
    } catch (e) { return; } 

    try {
        const response = await fetch(`${MATERIAS_API_URL}/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al cargar los datos de la materia.');
        }

        const materia = await response.json();
        
        // Mapeo para llenar el formulario con nombres exactos de la DB
        document.getElementById('materia-id').value = materia.id_materia;
        document.getElementById('nombre_materia').value = materia.nombre_materia || ''; // Aseguramos que cargue
        
        // Campos numéricos (simplemente cargando el valor)
        document.getElementById('anio').value = materia.año || '';
        document.getElementById('horas_semanales').value = materia.horas_semanales || '';
        document.getElementById('total_horas_anuales').value = materia.total_horas_anuales || '';

        // 🟢 CLAVE: Estos campos ahora son <input list="..."> (datalist)
        // La forma de cargar su valor es la misma: document.getElementById('ID').value = valor;
        document.getElementById('campo_formacion').value = materia.campo_formacion || ''; 
        document.getElementById('modalidad').value = materia.modalidad || '';
        document.getElementById('formato').value = materia.formato || '';
        document.getElementById('acreditacion').value = materia.acreditacion || '';
        
        // Selector de Carrera (ancho completo)
        modalCarreraSelect.value = materia.id_carrera;
        modalCarreraSelect.disabled = true;

        openMateriaModal('Editar Materia'); 
        
    } catch (error) {
        console.error('Error en openEditMateriaModal:', error);
        showMessage('modal-message', `Error al cargar datos: ${error.message}`, 'alert-error');
        openMateriaModal('Error al cargar');
    }
};


// ----------------------------------------------------
// 7. INICIALIZACIÓN DEL MÓDULO (Event Listeners)
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Cargar las carreras al inicio
    fetchCarrerasForSelect();
    
    // 2. Evento de Cambio en el Filtro de Carrera
    selectCarrera.addEventListener('change', (e) => {
        fetchMaterias(e.target.value);
    });
    
    // 3. Inicializar Eventos del Modal
    // El botón de crear ahora usa la función global (openCreateMateriaModal)
    btnCrearMateria.addEventListener('click', window.openCreateMateriaModal);
    document.querySelector('#materia-modal .close-btn').addEventListener('click', window.closeMateriaModal);

    // 4. Manejar el envío del formulario (Crear/Editar)
    form.addEventListener('submit', saveMateria);

    // 5. Inicialmente ocultar la tabla y el botón. El mensaje inicial lo maneja fetchCarrerasForSelect().
    toggleTableVisibility(false);
   
});