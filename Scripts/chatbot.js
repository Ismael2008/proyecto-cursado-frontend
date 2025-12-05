// Archivo: frontend/Scripts/chatbot.js

// --- CONSTANTES ---
const CHATBOT_URL = 'https://proyecto-cursado-backend.onrender.com/api/chatbot'; 
const CHAT_INPUT = document.getElementById('chat-input');
const CHAT_SEND_BTN = document.getElementById('chat-send-btn');
const CHAT_MESSAGES = document.getElementById('chatbot-messages');
const CHATBOT_WINDOW = document.getElementById('chatbot-window');
const CHATBOT_TOGGLE = document.getElementById('chatbot-toggle');
const CHATBOT_CLOSE_BTN = document.getElementById('chatbot-close-btn');

// --- ESTADO DEL CHATBOT ---
let currentLevel = 0; // 0: Menú principal, 1: Carrera, 2: Año, 3: Materia, 4: Opciones de Materia
let selectedCarrera = null; 
let selectedMateria = null; 
let carrerasList = []; 
let materiasList = {}; // Objeto para almacenar la lista de años y todas las materias por carrera

// --- COMANDOS ESPECIALES ---
const COMMANDS = {
    RETURN: 'R',  // Comando estándar para Volver (Return) al nivel anterior (Ej: Nivel 1 -> Nivel 0)
    BACK: 'V',    // Comando para Volver (Volver) al menú de opciones del nivel actual (Ej: Detalles en Nivel 1 -> Menú de Opciones en Nivel 1)
    MAIN_MENU: 'M', // Menú Principal
    EXIT: 'X'    // Salir (Exit)
}

// --- ESTRUCTURAS DE MENÚS FIJOS ---
const MENUS = {
    // Nivel 1: Opciones después de seleccionar una carrera
    CARRERA_OPCIONES: {
        '1': { label: 'Detalles de la Carrera', action: 'get_carrera_details' },
        '2': { label: 'Información del Coordinador', action: 'get_coordinador_info' },
        '3': { label: 'Materias por Año', action: 'show_materias_por_anio' },
    },
    // Nivel 4: Opciones después de seleccionar una materia
    MATERIA_OPCIONES: {
        '1': { label: 'Horarios', action: 'get_horarios' },
        '2': { label: 'Correlativas', action: 'get_correlativas' },
        '3': { label: 'Detalles de la Materia', action: 'get_materia_details' }, // ¡NUEVA OPCIÓN!
    }
};

// ==========================================================
// FUNCIONES DE UTILIDAD (UI)
// ==========================================================

function appendMessage(message, type = 'bot-message') {
    const messageDiv = document.createElement('div');
    // **CORRECCIÓN DE ERROR** Asegura que solo se añaden clases válidas separadas por espacio.
    const classes = type.split(' ').filter(c => c.trim() !== ''); 
    messageDiv.classList.add('message', ...classes);
    
    const content = document.createElement('p');
    // Reemplaza \n por <br> y **texto** por <strong>texto</strong> para el formato del bot
    content.innerHTML = message.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    messageDiv.appendChild(content);
    CHAT_MESSAGES.appendChild(messageDiv);
    CHAT_MESSAGES.scrollTop = CHAT_MESSAGES.scrollHeight;
}

function showLoading() {
    appendMessage('<span class="loading-dots">Cargando...</span>', 'bot-message loading');
    CHAT_INPUT.disabled = true;
    CHAT_SEND_BTN.disabled = true;
}

function hideLoading() {
    const loadingMessage = CHAT_MESSAGES.querySelector('.message.loading');
    if (loadingMessage) {
        CHAT_MESSAGES.removeChild(loadingMessage);
    }
    CHAT_INPUT.disabled = false;
    CHAT_SEND_BTN.disabled = false;
    CHAT_INPUT.focus();
}

/**
 * Agrupa los bloques de horarios consecutivos por día para condensar la lista.
 */
function condenseSchedule(scheduleText) {
    if (!scheduleText || typeof scheduleText !== 'string') return scheduleText;

    // Objeto para almacenar los horarios agrupados: { 'Miércoles': { start: '18:30', end: '21:15' }, ... }
    const groupedSchedule = {};
    
    // 1. Parsear el texto y obtener los bloques de horario
    // Expresión regular para encontrar '* Día: HH:MM a HH:MM'
    const regex = /\*\s*(.+?):\s*(\d{2}:\d{2})\s*a\s*(\d{2}:\d{2})/g;
    let match;

    while ((match = regex.exec(scheduleText)) !== null) {
        const day = match[1].trim(); // Miércoles
        const startTime = match[2]; // 18:30
        const endTime = match[3]; // 19:10 o 21:15

        if (!groupedSchedule[day]) {
            // Primer bloque del día
            groupedSchedule[day] = { start: startTime, end: endTime };
        } else {
            // Actualizar solo el final, asumiendo que el inicio (start) es el más temprano
            // Esto solo funciona si los bloques vienen ordenados cronológicamente
            groupedSchedule[day].end = endTime;
        }
    }

    // 2. Formatear el resultado
    let condensedText = '';
    const days = Object.keys(groupedSchedule);
    
    if (days.length === 0) return scheduleText; // Si no se encontró nada, devuelve el original

    for (const day of days) {
        const { start, end } = groupedSchedule[day];
        condensedText += `* **${day}**: ${start} a ${end}\n`;
    }
    
    return condensedText.trim();
}

// ==========================================================
// FUNCIONES DE COMUNICACIÓN CON EL BACKEND
// ==========================================================

async function fetchCarreras() {
    try {
        const response = await fetch(`${CHATBOT_URL}/carreras`);
        if (!response.ok) throw new Error('Error al obtener la lista de carreras.');
        return await response.json();
    } catch (error) {
        console.error('Error al cargar carreras:', error);
        appendMessage('❌ **Error de conexión:** No pude cargar la lista de carreras. Verifica el servidor.', 'bot-message error');
        return [];
    }
}

async function fetchMateriasPorCarrera(carreraId) {
    try {
        const response = await fetch(`${CHATBOT_URL}/materias/${carreraId}`);
        if (!response.ok) throw new Error(`Error al obtener materias para carrera ${carreraId}.`);
        return await response.json();
    } catch (error) {
        console.error('Error al cargar materias:', error);
        appendMessage('❌ **Error:** No se pudieron cargar las materias de la carrera seleccionada.', 'bot-message error');
        return [];
    }
}

async function fetchInfo(action, id) {
    showLoading();
    try {
        // Para obtener detalles de carrera o coordinador, usamos el id de la carrera.
        // Para materias (horario, correlativas, detalles), usamos el id de la materia.
        const response = await fetch(`${CHATBOT_URL}/info?action=${action}&id=${id}`);
        if (!response.ok) throw new Error(`Error al ejecutar acción: ${action}`);
        const data = await response.json();
        hideLoading();
        return data;
    } catch (error) {
        console.error('Error al obtener información:', error);
        hideLoading();
        appendMessage(`❌ **Error:** Ocurrió un problema al buscar la información solicitada (${action}).`, 'bot-message error');
        return null;
    }
}

// ==========================================================
// MANEJO DE MENÚS Y ESTADOS (NIVELES)
// ==========================================================

/**
 * Nivel 0: Muestra el menú principal con la lista de carreras.
 * * @param {boolean} [shouldShowGreeting=false] - Indica si debe mostrar el saludo (para el inicio y comando M).
 */
async function showMainMenu(shouldShowGreeting = false) { 
    carrerasList = await fetchCarreras();
    currentLevel = 0;
    selectedCarrera = null;
    selectedMateria = null;

    // Muestra el saludo si se indica (al inicio o con comando M)
    if (shouldShowGreeting) {
        appendMessage('👋 ¡Hola! Soy tu **Asistente Virtual** del IES N°6. Te ayudaré con información sobre carreras, materias, horarios, correlativas y coordinadores.', 'bot-message initial-message');
    }

    if (carrerasList.length === 0) {
        appendMessage('🛑 No hay carreras disponibles en este momento. Intenta más tarde.', 'bot-message error');
        return;
    }

    let menuContent = '📚 **Menú Principal:** Elige una carrera ingresando su **número**:\n\n';
    carrerasList.forEach((carrera, index) => {
        menuContent += `**[${index + 1}]** ${carrera.nombre_carrera}\n`;
    });
    
    menuContent += `\n**[${COMMANDS.EXIT}]** Salir del Chat\n`; 

    appendMessage(menuContent);
}

/**
 * Nivel 1: Opciones principales de la carrera.
 */
function showCarreraMenu() {
    currentLevel = 1;
    let menuContent = `✅ **Carrera Seleccionada:** ${selectedCarrera.nombre_carrera}\n\n`;
    menuContent += 'Ahora elige una opción ingresando su **número**:\n\n';

    Object.keys(MENUS.CARRERA_OPCIONES).forEach(key => {
        menuContent += `**[${key}]** ${MENUS.CARRERA_OPCIONES[key].label}\n`;
    });
    
    menuContent += `\n**[${COMMANDS.RETURN}]** Volver al Menú Principal\n`; 
    menuContent += `**[${COMMANDS.EXIT}]** Salir del Chat\n`;

    appendMessage(menuContent);
}

/**
 * Nivel 2: Menú de Años para agrupar materias.
 */
async function showAnioMenu() {
    currentLevel = 2;
    const allMaterias = await fetchMateriasPorCarrera(selectedCarrera.id_carrera);

    if (allMaterias.length === 0) {
        appendMessage('⚠️ No se encontraron materias para esta carrera.', 'bot-message error');
        showCarreraMenu(); 
        return;
    }

    // Agrupar por el campo 'año' y ordenar. Se filtra null/undefined para mayor robustez.
    const anios = [...new Set(allMaterias.map(m => m.año))] 
        .filter(año => año !== undefined && año !== null) 
        .sort((a, b) => a - b);
    
    // Almacenamos el listado de materias completo y los años en el objeto de estado
    materiasList = { anios, allMaterias }; 

    if (anios.length === 0) {
        appendMessage('⚠️ No se encontraron años definidos para las materias de esta carrera. Revisa los datos en la BD.', 'bot-message error');
        showCarreraMenu(); 
        return;
    }


    let menuContent = `📚 **Materias de ${selectedCarrera.nombre_carrera}:** Elige un **año**:\n\n`;
    anios.forEach((anio, index) => { // 'anio' aquí representa el valor del año (1, 2, 3, etc.)
        menuContent += `**[${index + 1}]** ${anio}º Año\n`;
    });

    menuContent += `\n**[${COMMANDS.RETURN}]** Volver a Opciones de Carrera\n`;
    menuContent += `**[${COMMANDS.MAIN_MENU}]** Volver al Menú Principal\n`;
    menuContent += `**[${COMMANDS.EXIT}]** Salir del Chat\n`;
    
    appendMessage(menuContent);
}

/**
 * Nivel 3: Muestra la lista de materias de un año específico.
 */
function showMateriaList(anioSeleccionado) {
    currentLevel = 3;
    
    // Filtramos las materias usando la propiedad 'año'
    const materiasDelAnio = materiasList.allMaterias.filter(m => m.año == anioSeleccionado); 
    
    // Actualizamos el objeto de estado para el nivel 3
    materiasList.materiasDelAnio = materiasDelAnio; 

    let menuContent = `📝 **Materias de ${anioSeleccionado}º Año:** Elige una ingresando su **número**:\n\n`;
    materiasDelAnio.forEach((materia, index) => {
        menuContent += `**[${index + 1}]** ${materia.nombre_materia}\n`;
    });
    
    menuContent += `\n**[${COMMANDS.RETURN}]** Volver a Menú de Años\n`;
    menuContent += `**[${COMMANDS.MAIN_MENU}]** Volver al Menú Principal\n`;
    menuContent += `**[${COMMANDS.EXIT}]** Salir del Chat\n`;

    appendMessage(menuContent);
}

/**
 * Nivel 4: Opciones de Horario, Correlativas y Detalles de la materia seleccionada.
 */
function showMateriaOptions() {
    currentLevel = 4;
    let menuContent = `✅ **Materia Seleccionada:** ${selectedMateria.nombre_materia}\n\n`;
    menuContent += '¿Qué deseas saber? Ingresa el **número**:\n\n';

    Object.keys(MENUS.MATERIA_OPCIONES).forEach(key => {
        menuContent += `**[${key}]** ${MENUS.MATERIA_OPCIONES[key].label}\n`;
    });
    
    menuContent += `\n**[${COMMANDS.RETURN}]** Volver a Lista de Materias\n`;
    menuContent += `**[${COMMANDS.MAIN_MENU}]** Volver al Menú Principal\n`;
    menuContent += `**[${COMMANDS.EXIT}]** Salir del Chat\n`;

    appendMessage(menuContent);
}

/**
 * Muestra las opciones de navegación después de ver cualquier información.
 * El nivel actual (1 o 4) se mantiene para que el comando V funcione correctamente.
 */
function showPostInfoNavigationOptions(level) {
    let backLabel = '';

    if (level === 1) {
        backLabel = 'Volver a Opciones de Carrera';
    } else if (level === 4) {
        backLabel = 'Volver a Opciones de Materia';
    } else {
        // Si no estamos en Nivel 1 o 4 (como en Nivel 0), no mostramos V
        return;
    }

    let menuContent = `\n**Para continuar, ingresa:**\n`;
    menuContent += `**[${COMMANDS.BACK}]** ${backLabel}\n`; // Comando 'V'
    menuContent += `**[${COMMANDS.MAIN_MENU}]** Volver al Menú Principal\n`;
    menuContent += `**[${COMMANDS.EXIT}]** Salir del Chat\n`;
    appendMessage(menuContent);
}

// ==========================================================
// LÓGICA DE PROCESAMIENTO DE ENTRADA
// ==========================================================

async function processInput(input) {
    const cleanInput = input.trim().toUpperCase();
    const inputNumber = parseInt(cleanInput);

    // 1. Manejo de comandos de navegación globales
    if (cleanInput === COMMANDS.MAIN_MENU) {
        showMainMenu(true); 
        return;
    }
    
    if (cleanInput === COMMANDS.EXIT) {
        // ... (Lógica de cierre sin cambios)
        appendMessage('👋 ¡Hasta luego! Vuelve pronto si necesitas ayuda.', 'bot-message');
        
        CHAT_INPUT.disabled = true;
        CHAT_SEND_BTN.disabled = true;

        setTimeout(() => {
            currentLevel = 0; 
            selectedCarrera = null;
            selectedMateria = null;
            CHATBOT_WINDOW.classList.add('hidden');

            CHAT_INPUT.disabled = false;
            CHAT_SEND_BTN.disabled = false;
        }, 3500); 

        return;
    }
    
    if (cleanInput === COMMANDS.BACK) {
        // Comando V: Volver al menú de opciones del nivel actual
        if (currentLevel === 1) {
            showCarreraMenu(); 
            return;
        } else if (currentLevel === 4) {
            showMateriaOptions();
            return;
        }
    }
    
    if (cleanInput === COMMANDS.RETURN) {
        switch (currentLevel) {
            case 1: showMainMenu(true); return; // Carreras (Nivel 1) -> Principal (Nivel 0)
            case 2: showCarreraMenu(); return; // Años (Nivel 2) -> Opciones de Carrera (Nivel 1)
            case 3: 
                currentLevel = 2; 
                await showAnioMenu(); 
                return; 
            case 4: 
                currentLevel = 3;
                showMateriaList(selectedMateria.año);
                return;
        }
    }
    
    // 2. Procesamiento basado en el nivel
    
    if (currentLevel === 0) { // Nivel 0: Selección de Carrera
        if (inputNumber >= 1 && inputNumber <= carrerasList.length) {
            selectedCarrera = carrerasList[inputNumber - 1];
            showCarreraMenu();
        } else {
            appendMessage(`❌ Opción no válida. Ingresa un número entre **1 y ${carrerasList.length}**, o **${COMMANDS.EXIT}**.`);
        }

    } else if (currentLevel === 1) { // Nivel 1: Opciones de Carrera
        const opcion = MENUS.CARRERA_OPCIONES[cleanInput];
        if (opcion) {
            if (opcion.action === 'show_materias_por_anio') {
                // Opción 3: Materias por Año lleva al nivel 2
                await showAnioMenu();
            } else {
                // Opciones 1 y 2: Información de detalles/coordinador
                const data = await fetchInfo(opcion.action, selectedCarrera.id_carrera);
                if (data && data.message) {
                    appendMessage(data.message);
                    
                    // Muestra solo las opciones de navegación (V, M, X)
                    showPostInfoNavigationOptions(currentLevel); 
                }
            }
        } else {
            appendMessage(`❌ Opción no válida. Ingresa **1, 2, 3**, o un comando de navegación.`);
        }
        
    } else if (currentLevel === 2) { // Nivel 2: Selección de Año
        const aniosDisponibles = materiasList.anios; 
        if (inputNumber >= 1 && inputNumber <= aniosDisponibles.length) {
            const anioSeleccionado = aniosDisponibles[inputNumber - 1];
            showMateriaList(anioSeleccionado);
        } else {
            appendMessage(`❌ Opción no válida. Ingresa un número entre **1 y ${aniosDisponibles.length}**, o un comando de navegación.`);
        }
        
    } else if (currentLevel === 3) { // Nivel 3: Selección de Materia
        const materiasDelAnio = materiasList.materiasDelAnio;
        if (inputNumber >= 1 && inputNumber <= materiasDelAnio.length) {
            selectedMateria = materiasDelAnio[inputNumber - 1];
            // Asegurarse de almacenar la propiedad 'año' correcta
            selectedMateria.año = materiasDelAnio[inputNumber - 1].año; 
            showMateriaOptions();
        } else {
            appendMessage(`❌ Opción no válida. Ingresa un número entre **1 y ${materiasDelAnio.length}**, o un comando de navegación.`);
        }

    } else if (currentLevel === 4) { // Nivel 4: Opciones de Materia
        const opcion = MENUS.MATERIA_OPCIONES[cleanInput];
        if (opcion) {
            const data = await fetchInfo(opcion.action, selectedMateria.id_materia);
            if (data && data.message) {

                let messageContent = data.message;
                
                if (opcion.action === 'get_materia_details') {
                    // Nuevo: Título para Detalles de la Materia
                    messageContent = '📚 **Detalles de ' + selectedMateria.nombre_materia + ':**\n\n' + data.message;
                }
                else if (opcion.action === 'get_horarios') {
                    messageContent = '⏰ **Horarios de ' + selectedMateria.nombre_materia + ':**\n' + condenseSchedule(data.message);
                } else if (opcion.action === 'get_correlativas') {
                    
                    // Regex para capturar los REQUISITOS (lo que esta materia requiere).
                    // Esta regex captura las líneas que contienen "Requiere"
                    const correlativaRegex = /\*\s*Requiere\s*["']?(.+?)["']?\s*\(\s*(aprobada|regular)\s*[\s\-\/]*Tipo:\s*([Cc]ursar|[Pp]romoci[óo]n\/?\/?[Rr]endir)\s*\)/ig; 

                    let match;
                    const requisitosUnicos = []; // Lista para almacenar { nombre, estado, tipo }
                    const temporalMessage = data.message;
                    
                    // Parsear el mensaje y extraer solo los REQUISITOS
                    while ((match = correlativaRegex.exec(temporalMessage)) !== null) {
                        
                        const nombre = match[1].trim();
                        const estadoRaw = match[2].trim();
                        const tipoRaw = match[3].trim(); 

                        // Canonicalizamos el estado: Aprobada o Regular
                        const estado = estadoRaw.charAt(0).toUpperCase() + estadoRaw.slice(1).toLowerCase();

                        // Canonicalizamos el tipo para la agrupación:
                        const tipo = tipoRaw.toLowerCase().includes('cursar') 
                            ? 'Requisitos para Cursar' 
                            : 'Requisitos para Promocionar o Rendir';

                        // Almacenamos el requisito, incluyendo el tipo
                        requisitosUnicos.push({ nombre, estado, tipo });
                    }

                    // 1. Agrupar los requisitos por tipo
                    const groupedRequisitos = requisitosUnicos.reduce((acc, req) => {
                        const key = req.tipo;
                        if (!acc[key]) {
                            acc[key] = [];
                        }
                        acc[key].push(req);
                        return acc;
                    }, {});

                    // 2. Formatear el mensaje de salida agrupado
                    let groupedMessage = `🔗 **Correlativas Requeridas para ${selectedMateria.nombre_materia}:**\n\n`;

                    const groupOrder = ['Requisitos para Cursar', 'Requisitos para Promocionar o Rendir'];
                    let foundRequirements = false;

                    for (const groupName of groupOrder) {
                        if (groupedRequisitos[groupName] && groupedRequisitos[groupName].length > 0) {
                            foundRequirements = true;
                            
                            // Título del grupo en negrita con separadores
                            groupedMessage += `✅ **${groupName}** \n`; 
                            
                            // Listar requisitos
                            groupedRequisitos[groupName].forEach(req => {
                                // Formato: * **Materia** - Estado
                                groupedMessage += `* ${req.nombre} - ${req.estado}\n`;
                            });
                            
                            groupedMessage += '\n'; // Separador entre grupos
                        }
                    }

                    if (!foundRequirements) {
                        // Si no se encontraron REQUISITOS (Correlativas Previas):
                        
                        let messageForEmptyCorrelativas = `🔗 **Correlativas Requeridas para ${selectedMateria.nombre_materia}:**\n\n`;

                        // Caso 1: El backend indica que no hay NINGUNA correlativa (ni requiere, ni es requerida)
                        if (temporalMessage.toLowerCase().includes('no tiene correlativas registradas')) {
                            // Si el mensaje dice explícitamente que no tiene correlativas, lo mostramos (incluye dependientes, pero es lo más claro)
                            groupedMessage = temporalMessage;
                        } 
                        
                        // Caso 2: La materia NO tiene requisitos previos, pero SÍ tiene dependientes
                        else {
                            // Este es el mensaje positivo si sólo hay dependientes, pero no requisitos previos.
                            messageForEmptyCorrelativas += '✅ Esta materia **no requiere** correlativas previas.\n';
                            groupedMessage = messageForEmptyCorrelativas;
                            
                        }
                        
                    } else {
                        // Si SÍ se encontraron requisitos, NO agregamos la sección de dependientes.
                        groupedMessage = groupedMessage.trimEnd(); // Quitamos el último salto de línea
                    }

                    messageContent = groupedMessage;
                }

                appendMessage(messageContent);
                
                // Muestra solo las opciones de navegación (V, M, X)
                showPostInfoNavigationOptions(currentLevel); 
            }
        } else {
            // Si la opción es inválida, regeneramos el menú de opciones para guiar al usuario
            appendMessage(`❌ Opción no válida. Ingresa **1, 2, 3**, o un comando de navegación.`); // OPCIONES ACTUALIZADAS
            showMateriaOptions(); 
        }
    }
}


// ==========================================================
// INICIALIZACIÓN Y EVENT LISTENERS
// ==========================================================

function handleSend() {
    const input = CHAT_INPUT.value;
    if (input.trim() === '') return;

    // Usamos la función appendMessage para mantener la lógica de formato
    appendMessage(input, 'user-message'); 
    CHAT_INPUT.value = '';
    
    // Llamamos a la lógica principal del menú, no a una función de envío simple.
    processInput(input);
}

CHATBOT_TOGGLE.addEventListener('click', () => {
    const isHidden = CHATBOT_WINDOW.classList.contains('hidden');
    CHATBOT_WINDOW.classList.toggle('hidden');

    if (isHidden) {
        // *** LÓGICA DE APERTURA ***
        if (currentLevel === 0) { 
            CHAT_MESSAGES.innerHTML = ''; // Limpia el historial de chat
            showMainMenu(true); // Muestra el saludo y el menú de carreras
        } else if (CHAT_MESSAGES.children.length < 2) {
             // Caso de primera apertura o cierre total
             CHAT_MESSAGES.innerHTML = ''; 
             showMainMenu(true);
        }
        CHAT_INPUT.focus();
    }
});

CHATBOT_CLOSE_BTN.addEventListener('click', () => {
    CHATBOT_WINDOW.classList.add('hidden');
});


document.addEventListener('DOMContentLoaded', () => {
    CHAT_SEND_BTN.addEventListener('click', handleSend);
    CHAT_INPUT.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    });
});