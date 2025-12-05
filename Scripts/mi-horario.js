// mi-horario.js

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:3000/api'; 

    const carreraSelect = document.getElementById('carrera-select');
    const anioSelect = document.getElementById('anio-select');
    const materiaSelect = document.getElementById('materia-select');
    const addMateriaBtn = document.getElementById('add-materia-btn');
    const scheduleBody = document.getElementById('schedule-body');
    const selectedMateriasList = document.getElementById('selected-materias-list');

    // 📌 NUEVAS VARIABLES DEL MODAL DE CONFLICTO
    const conflictModal = document.getElementById('conflict-modal');
    const conflictMessage = document.getElementById('conflict-message');
    const closeModalButtons = conflictModal.querySelectorAll('.close-button, .ok-button');

    // 💡 NUEVA VARIABLE para almacenar temporalmente los datos de todas las carreras (YA NO SE USA)
    let carrerasData = []; 
    
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const horasBloques = [
        '18:30', '19:10', '19:55', '20:35', '21:20', '22:00', '22:40'
    ];
    const horasFinBloques = [
        '19:10', '19:50', '20:35', '21:15', '22:00', '22:40', '23:20'
    ];

    // Array para almacenar las materias seleccionadas con sus horarios
    const selectedMaterias = []; 

    // ==========================================================
    // LÓGICA DE MODAL
    // ==========================================================

    /**
     * Muestra el modal de conflicto con un mensaje específico.
     * @param {string} message - El mensaje de conflicto a mostrar.
     */
    const showConflictModal = (message) => {
        conflictMessage.textContent = message;
        conflictModal.style.display = 'block';
    };

    // Lógica para cerrar el modal
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            conflictModal.style.display = 'none';
        });
    });

    // Cerrar el modal haciendo clic fuera de él
    window.addEventListener('click', (event) => {
        if (event.target === conflictModal) {
            conflictModal.style.display = 'none';
        }
    });

    // ==========================================================
    // LÓGICA DE DIBUJO DEL HORARIO (Creación y Manipulación)
    // ==========================================================

    /**
     * Limpia completamente la tabla de horarios y las materias seleccionadas.
     */
    const limpiarHorario = () => {
        // Limpiar el array de materias seleccionadas
        selectedMaterias.length = 0; 
        
        // Limpiar la lista lateral
        selectedMateriasList.innerHTML = '';

        // Limpiar visualmente la tabla (quitando el contenido de las celdas)
        document.querySelectorAll('.schedule-cell').forEach(cell => {
            cell.innerHTML = '';
            cell.classList.remove('materia-active');
            cell.classList.remove('schedule-conflict');
        });
    };

    /**
     * Dibuja la estructura base de la tabla de horarios con IDs fijos.
     */
    const createScheduleStructure = () => {
        scheduleBody.innerHTML = '';
        
        horasBloques.forEach((horaInicio, index) => {
            const horaFin = horasFinBloques[index];
            const row = document.createElement('tr');
            
            // Columna de la hora
            row.innerHTML = `<td class="time-slot">${horaInicio} - ${horaFin}</td>`;
            
            dias.forEach(dia => {
                const cell = document.createElement('td');
                
                // Genera un ID fijo para la celda: EJEMPLO: "Lunes-18:30"
                cell.id = `${dia}-${horaInicio}`; 
                cell.className = 'schedule-cell';
                
                row.appendChild(cell);
            });
            scheduleBody.appendChild(row);
        });
    };

    /**
     * Marca los bloques de horario para una materia específica.
     */
    const markMateriaInSchedule = (idMateria, nombreMateria, horarios) => {
        horarios.forEach(horario => {
            const horaInicioSinSegundos = horario.hora_inicio.substring(0, 5);
            const cellId = `${horario.dia_semana}-${horaInicioSinSegundos}`;
            const cell = document.getElementById(cellId);
            
            if (cell) {
                // ⚠️ NOTA: El checkeo de conflicto AHORA se hace en addMateria. 
                // Aquí solo marcamos visualmente si hay más de un elemento.
                if (cell.children.length > 0) {
                     // Si ya hay un elemento, la celda está en conflicto (color rojo)
                     cell.classList.add('schedule-conflict');
                }
                
                // Crea y añade el elemento de la materia
                const materiaDiv = document.createElement('div');
                materiaDiv.className = 'schedule-item';
                materiaDiv.textContent = nombreMateria;
                materiaDiv.title = `Materia: ${nombreMateria} | ${horario.hora_inicio} a ${horario.hora_fin}`;
                
                // Usa un atributo de datos para identificar la materia en la celda
                materiaDiv.setAttribute('data-materia-id', idMateria); 
                cell.appendChild(materiaDiv);
                
                // Añade la clase visual para el estilo
                cell.classList.add('materia-active');
            } else {
                console.warn(`Celda no encontrada para ${nombreMateria} en ${cellId}`);
            }
        });
    };

    /**
     * Limpia los bloques de horario para una materia específica.
     */
    const unmarkMateriaInSchedule = (idMateria) => {
        const elementsToRemove = document.querySelectorAll(`.schedule-cell div[data-materia-id="${idMateria}"]`);
        
        elementsToRemove.forEach(div => {
            const cell = div.parentNode;
            
            // Eliminar el div de la materia
            div.remove(); 
            
            // Si la celda queda vacía, quitamos las clases de estilo
            if (cell.children.length === 0) {
                 cell.classList.remove('materia-active');
                 cell.classList.remove('schedule-conflict');
            } else {
                 // Si la celda todavía tiene otras materias, verificamos si queda solo una
                 if (cell.children.length === 1) {
                      cell.classList.remove('schedule-conflict');
                 }
            }
        });
    };

    /**
     * Renderiza la lista lateral de materias seleccionadas.
     */
    const renderSelectedMaterias = () => {
        selectedMateriasList.innerHTML = '';
        selectedMaterias.forEach(materia => {
            const li = document.createElement('li');
            li.className = 'selected-materia-item';
            li.innerHTML = `
                <span>${materia.nombre}</span>
                <button class="remove-materia-btn" data-id="${materia.id}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            selectedMateriasList.appendChild(li);
        });
    };
    
    // ==========================================================
    // LÓGICA DE CONFLICTO Y ADICIÓN (MODIFICADA)
    // ==========================================================
    
    /**
     * Verifica si los nuevos horarios se solapan con los ya seleccionados.
     * Si hay conflicto, MUESTRA EL MODAL y devuelve true.
     */
    const checkConflict = (newHorarios, newMateriaNombre) => {
        let conflictFound = false;

        for (const newHorario of newHorarios) {
            const newHora = newHorario.hora_inicio.substring(0, 5);
            
            for (const existingMateria of selectedMaterias) {
                for (const existingHorario of existingMateria.horarios) {
                    
                    const existingHora = existingHorario.hora_inicio.substring(0, 5);

                    if (
                        newHorario.dia_semana === existingHorario.dia_semana &&
                        newHora === existingHora
                    ) {
                        // ❌ USAR EL NUEVO MODAL EN LUGAR DE alert()
                        const conflictMsg = `La materia "${newMateriaNombre}" no se puede agregar porque se solapa con el horario de "${existingMateria.nombre}".`;
                        showConflictModal(conflictMsg);
                        
                        conflictFound = true; // Marca que hay un conflicto
                        return true; // Salir inmediatamente al encontrar el primer conflicto
                    }
                }
            }
        }
        return conflictFound;
    };

    /**
     * Función central para agregar una materia
     */
    const addMateria = () => {
        const selectedOption = materiaSelect.options[materiaSelect.selectedIndex];
        if (!selectedOption.value) return; 

        const materiaId = selectedOption.value;
        const materiaNombre = selectedOption.textContent;

        // 1. Evitar duplicados
        if (selectedMaterias.some(m => m.id === materiaId)) {
            showConflictModal(`La materia "${materiaNombre}" ya ha sido seleccionada.`);
            return;
        }

        // 2. Llamar al Backend para obtener los horarios
        fetch(`${API_BASE_URL}/horarios?id_materia=${materiaId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} al cargar horarios`);
                }
                return response.json();
            })
            .then(horarios => {
                
                // 🚨 3. VERIFICACIÓN CRÍTICA DE CONFLICTO
                if (checkConflict(horarios, materiaNombre)) {
                    // Si hay conflicto, la función checkConflict ya mostró el modal.
                    // ¡DETENEMOS LA EJECUCIÓN AQUÍ!
                    return; 
                }

                const materiaConHorarios = {
                    id: materiaId,
                    nombre: materiaNombre,
                    horarios: horarios
                };
                
                // 4. Si NO hay conflicto, agregamos al array y dibujamos
                selectedMaterias.push(materiaConHorarios);
                markMateriaInSchedule(materiaId, materiaNombre, horarios);
                renderSelectedMaterias();
            })
            .catch(error => console.error('Error al obtener los horarios:', error));
    };

    /**
     * Función central para quitar una materia
     */
    const removeMateria = (materiaId) => {
        // 1. Quitar del array
        const index = selectedMaterias.findIndex(m => m.id === materiaId);
        if (index > -1) {
            selectedMaterias.splice(index, 1);
        }
        
        // 2. Desmarcar en la tabla
        unmarkMateriaInSchedule(materiaId);
        
        // 3. Actualizar lista lateral
        renderSelectedMaterias();
    };

    
    /**
     * 🚀 NUEVA FUNCIÓN CLAVE: Llama al nuevo endpoint para obtener los años reales de la carrera.
     * @param {string} idCarrera - ID de la carrera.
     */
    const cargarAniosByCarrera = async (idCarrera) => {
        anioSelect.innerHTML = '<option value="">Cargando años...</option>';
        anioSelect.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/anios?id_carrera=${idCarrera}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} al cargar años.`);
            }
            // El backend devuelve un array de números de año: [1, 2, 3]
            const anios = await response.json(); 
            
            anioSelect.innerHTML = '<option value="">Selecciona un año</option>';
            
            if (anios.length > 0) {
                const nombreAnios = { 1: "1° Año", 2: "2° Año", 3: "3° Año", 4: "4° Año", 5: "5° Año" };

                anios.forEach(anio => {
                    const option = document.createElement('option');
                    option.value = anio;
                    option.textContent = nombreAnios[anio] || `${anio}° Año`;
                    anioSelect.appendChild(option);
                });
                anioSelect.disabled = false;
            } else {
                 anioSelect.innerHTML = '<option value="">No hay años disponibles</option>';
            }

        } catch (error) {
            console.error('Error al cargar los años:', error);
            anioSelect.innerHTML = '<option value="">Error al cargar años</option>';
        }
    };


    const cargarDatos = () => {
        // 1. FETCH DE CARRERAS (Simplificado)
        fetch(`${API_BASE_URL}/carreras`) 
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} al cargar carreras. Asegúrese de que el backend esté corriendo.`);
                }
                return response.json();
            })
            .then(carreras => {
                 // 💡 Ya no necesitamos guardar carrerasData globalmente.
                
                carreraSelect.innerHTML = '<option value="">Selecciona una carrera</option>';
                carreras.forEach(carrera => {
                    const option = document.createElement('option');
                    option.value = carrera.id_carrera;
                    option.textContent = carrera.nombre_carrera;
                    // ❌ ELIMINADA: Ya no guardamos la duración aquí
                    // option.setAttribute('data-duracion', carrera.duracion); 
                    carreraSelect.appendChild(option);
                });
            })
            .catch(error => console.error('Error al cargar las carreras:', error));
    };
    
    /**
     * 🚀 CORRECCIÓN CLAVE: Función para manejar la carga de materias, 
     * usando ahora el parámetro 'año' (con ñ) en la URL, consistente con el backend.
     */
    const cargarMateriasByCarreraAnio = (idCarrera, anio) => {
        materiaSelect.disabled = true;
        addMateriaBtn.disabled = true;
        materiaSelect.innerHTML = '<option value="">Cargando materias...</option>';

        // 🚀 CORRECCIÓN CLAVE: Usamos 'año' (con ñ) en el query string.
        fetch(`${API_BASE_URL}/materias?id_carrera=${idCarrera}&año=${anio}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || `HTTP error! status: ${response.status} al cargar materias.`);
                    });
                }
                return response.json();
            })
            .then(materias => {
                 materiaSelect.innerHTML = '<option value="">Selecciona una materia</option>';

                materias.forEach(materia => {
                    const option = document.createElement('option');
                    option.value = materia.id_materia;
                    option.textContent = materia.nombre_materia;
                    materiaSelect.appendChild(option);
                });
                
                // Habilitar el select de materia solo si hay materias.
                if (materias.length > 0) {
                    materiaSelect.disabled = false;
                }
            })
            .catch(error => {
                console.error('Error al cargar materias:', error);
                materiaSelect.innerHTML = '<option value="">Error al cargar materias</option>';
            });
    };

    
    // ==========================================================
    // EVENT LISTENERS (Modificados para usar la lógica de años)
    // ==========================================================

    // 🔴 1. EVENTO: Cambio de Carrera (ARREGLO PRINCIPAL)
    carreraSelect.addEventListener('change', () => {
        const idCarrera = carreraSelect.value;
        
        // Reiniciar y deshabilitar selects dependientes
        anioSelect.disabled = true;
        anioSelect.innerHTML = '<option value="">Selecciona un año</option>';
        materiaSelect.disabled = true;
        addMateriaBtn.disabled = true;
        materiaSelect.innerHTML = '<option value="">Selecciona una materia</option>';
        
        // 🚩 Limpiar el horario y la lista de seleccionadas al cambiar la carrera.
        limpiarHorario(); 
        
        // 🚀 CORRECCIÓN CLAVE: Si se selecciona una carrera, cargamos los años disponibles
        if (idCarrera) {
             cargarAniosByCarrera(idCarrera);
        }
    });

    // 🟢 2. EVENTO: Cambio de Año (Lógica para cargar materias)
    anioSelect.addEventListener('change', () => {
        const idCarrera = carreraSelect.value;
        const anio = anioSelect.value; // El valor es el número del año (1, 2, 3...)
        
        // Limpiamos materias y deshabilitamos el botón Add al cambiar el año.
        materiaSelect.disabled = true;
        addMateriaBtn.disabled = true;
        materiaSelect.innerHTML = '<option value="">Selecciona una materia</option>';

        // 🚩 Limpiar el horario al cambiar el año para empezar de nuevo la selección.
        // limpiarHorario();
        
        // 🚀 CORRECCIÓN CLAVE: Llamar a la función que usa el parámetro 'año' (con ñ)
        if (idCarrera && anio) {
            cargarMateriasByCarreraAnio(idCarrera, anio);
        }
    });
    
    // 🟡 3. Evento: Cambio de Materia (Habilita el botón de Agregar)
    materiaSelect.addEventListener('change', () => {
          const materiaSeleccionada = materiaSelect.value;
          // Habilitar el botón ADD si se seleccionó una materia válida (no la opción vacía)
          addMateriaBtn.disabled = !materiaSeleccionada;
    });

    // Evento para agregar una materia
    addMateriaBtn.addEventListener('click', addMateria);

    // Evento para eliminar una materia (delegación de eventos)
    selectedMateriasList.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-materia-btn');
        if (removeBtn) {
            const materiaId = removeBtn.dataset.id;
            removeMateria(materiaId);
        }
    });
    
    // Funcionalidades de los botones de acción (Mantener originales)
    document.getElementById('print-schedule-btn').addEventListener('click', () => {
        window.print();
    });

    document.getElementById('download-pdf-btn').addEventListener('click', () => {
        downloadScheduleAsPDF();
    });

    document.getElementById('export-ics-btn').addEventListener('click', () => {
        // 📌 LLAMADA A LA NUEVA FUNCIONALIDAD DE EXPORTAR
        exportScheduleAsICS();
    });

    /**
    * Función que genera un PDF solo con la tabla de horarios
    * (Requiere la librería html2pdf.js)
    */
    function downloadScheduleAsPDF() {
        // Muestra un mensaje para informar al usuario de que la función requiere una librería externa

        const element = document.querySelector('.schedule-grid-container'); 
        
        // Guardamos la posición actual del scroll para restaurarla
        const currentScrollY = window.scrollY;
        
        // Guardamos el ancho original (si lo tenías en línea) y forzamos a 1200px para la captura
        const originalWidth = element.style.width; 
        element.style.width = '1200px'; 

        // 📌 CLAVE 1: Mover el scroll de la página a la parte superior
        window.scrollTo(0, 0); 
        
        // Opciones de configuración (Usando A3 para garantizar el ancho)
        const options = {
            margin: 10, 
            filename: 'Mi_Horario_Personalizado.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 1, 
                windowWidth: 1200, 
                width: 1200, 
                // CLAVE 2: Aquí ya no debería ser necesario el scrollY negativo, 
                // pero lo dejamos como protección.
                scrollY: 0, 
                scrollX: 0
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a3', // A3 horizontal para máxima garantía de ancho
                orientation: 'landscape', 
                autoScale: true 
            },
            pagebreak: { 
                mode: ['css', 'legacy'] 
            } 
        };

        // Verificar si html2pdf está disponible antes de usarlo
        if (typeof html2pdf === 'undefined') {
            console.error("Error: html2pdf no está cargado. Asegúrate de incluir el script.");
            showConflictModal('Error: La librería html2pdf.js no está cargada en el HTML. No se puede generar el PDF.');
            // Asegurar la restauración incluso si falla la librería
            element.style.width = originalWidth;
            window.scrollTo(0, currentScrollY);
            return;
        }

        // Generar, guardar y restaurar
        html2pdf().set(options).from(element).save().then(() => {
            // Restaurar el ancho original
            element.style.width = originalWidth;
            // 📌 CLAVE 3: Restaurar la posición del scroll de la ventana
            window.scrollTo(0, currentScrollY);
            console.log('PDF generado. Scroll y anchos restaurados.');
        }).catch(error => {
            console.error('Error al generar el PDF:', error);
            // Asegurar la restauración incluso en caso de error
            element.style.width = originalWidth;
            window.scrollTo(0, currentScrollY);
            showConflictModal('Hubo un error al generar el PDF. Revisa la consola (F12) para más detalles.');
        });
    }

    // ==========================================================
    // LÓGICA DE EXPORTACIÓN ICS (iCalendar)
    // ==========================================================

    /**
     * Función central para exportar el horario seleccionado a un archivo ICS (iCalendar).
     */
    function exportScheduleAsICS() {
        // La variable 'selectedMaterias' es accesible aquí.
        if (selectedMaterias.length === 0) {
            showConflictModal("No hay materias seleccionadas para exportar. Agregue materias primero.");
            return;
        }

        // 📌 NOTA: Ajusta la zona horaria (TZID) a la que corresponda a tu ubicación
        const timezone = 'America/Argentina/Jujuy'; 
        
        // Usamos el próximo Lunes como fecha base para la recurrencia.
        const startOfWeek = getNextDayOfWeek('Lunes'); 
        const maxRepetitions = 15; // Número de repeticiones (ej. semanas de un cuatrimestre)

        // Inicio del archivo ICS
        let icsContent = "BEGIN:VCALENDAR\r\n";
        icsContent += "VERSION:2.0\r\n";
        icsContent += "PRODID:-//MiHorarioPersonalizado//NONSGML v1.0//EN\r\n";
        
        // Nombre del calendario
        const carreraNombre = carreraSelect.options[carreraSelect.selectedIndex].textContent;
        const anioTexto = anioSelect.value;
        icsContent += `X-WR-CALNAME:Horario ${carreraNombre} - Año ${anioTexto}\r\n`;
        
        // --- Iterar sobre las materias y sus bloques de horario ---
        selectedMaterias.forEach(materia => {
            materia.horarios.forEach(horario => {
                
                // 1. Calcular Fechas de Inicio/Fin
                const eventStart = calculateEventDate(startOfWeek, horario.dia_semana, horario.hora_inicio);
                const eventEnd = calculateEventDate(startOfWeek, horario.dia_semana, horario.hora_fin);

                // Formato ICS (YYYYMMDDTHHMMSS)
                const dtStart = formatICSDate(eventStart);
                const dtEnd = formatICSDate(eventEnd);
                
                // 2. Bloque de Evento (VEVENT)
                icsContent += "BEGIN:VEVENT\r\n";
                icsContent += `DTSTAMP:${formatICSDate(new Date())}\r\n`;
                icsContent += `UID:${generateUID(materia, horario)}\r\n`;
                icsContent += `DTSTART;TZID=${timezone}:${dtStart}\r\n`;
                icsContent += `DTEND;TZID=${timezone}:${dtEnd}\r\n`;
                icsContent += `SUMMARY:${materia.nombre}\r\n`; 
                icsContent += `DESCRIPTION:Carrera: ${carreraNombre} - Año: ${anioTexto}\r\n`;
                
                // 3. Recurrencia (RRULE)
                const icsDay = getICSDay(horario.dia_semana);
                icsContent += `RRULE:FREQ=WEEKLY;BYDAY=${icsDay};COUNT=${maxRepetitions}\r\n`;
                
                icsContent += "END:VEVENT\r\n";
            });
        });

        // Fin del archivo ICS
        icsContent += "END:VCALENDAR\r\n";

        // 4. Descargar el archivo
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Mi_Horario.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Funciones Auxiliares para ICS 
    
    function getICSDay(dia_semana) {
        const mapping = {
            'Lunes': 'MO',
            'Martes': 'TU',
            'Miércoles': 'WE',
            'Jueves': 'TH',
            'Viernes': 'FR',
            'Sábado': 'SA',
            'Domingo': 'SU'
        };
        return mapping[dia_semana] || 'MO';
    }

    function generateUID(materia, horario) {
        return `horario-${materia.id}-${horario.dia_semana}-${horario.hora_inicio.replace(/:/g, '')}@mihorario.com`;
    }

    function formatICSDate(date) {
        const pad = (num) => (num < 10 ? '0' : '') + num;
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());

        return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    }

    function getNextDayOfWeek(dayName) {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const today = new Date();
        const currentDay = today.getDay(); 
        const targetDay = days.indexOf(dayName);
        
        let diff = targetDay - currentDay;
        // Si el día objetivo ya pasó esta semana, apunta al mismo día de la próxima semana (+7)
        if (diff < 0) { 
             diff += 7; 
        } else if (diff === 0 && today.getHours() >= 18) {
             // Si es hoy y ya pasó la hora de inicio de clases (18:30), apunta a la próxima semana
             diff += 7;
        }

        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + diff);
        nextDay.setHours(0, 0, 0, 0); 
        return nextDay;
    }

    function calculateEventDate(baseDate, dayName, timeString) {
        const [hours, minutes, seconds] = timeString.split(':').map(Number);
        
        const eventDate = new Date(baseDate.getTime()); 
        
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        // Ajustamos la diferencia de días basándonos en el día de la semana de la fecha base (que es el próximo Lunes a las 00:00:00)
        const baseDayIndex = days.indexOf('Lunes'); // Usamos Lunes como índice de referencia para la base
        const targetDayIndex = days.indexOf(dayName);
        
        let diff = targetDayIndex - baseDayIndex;
        // Si el día objetivo es anterior al día base (Lunes), necesitamos sumar 7 días (ej: Domingo)
        if (diff < 0) { 
             diff += 7;
        }

        eventDate.setDate(eventDate.getDate() + diff);

        // Establecer la hora
        eventDate.setHours(hours, minutes, seconds, 0);
        return eventDate;
    }

    // Inicialización
    createScheduleStructure(); // Crea la tabla una sola vez
    cargarDatos(); // Carga las carreras, etc.
});