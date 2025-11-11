// 'DOMContentLoaded' espera a que project.html esté listo
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DEFINICIÓN DE CONSTANTES ---
    const API_BASE_URL = "https://localhost:7065";
    const projectNameHeader = document.getElementById('project-name-header');
    const logoutButton = document.getElementById('logout-button');

    // Obtenemos el token (el "boleto")
    const token = localStorage.getItem('jwtToken');

    // --- ¡NUEVO! Seleccionar elementos del Formulario de Tareas ---
    const createTaskForm = document.getElementById('create-task-form');
    const taskTitleInput = document.getElementById('task-title');
    const taskDescriptionInput = document.getElementById('task-description');
    const createTaskError = document.getElementById('create-task-error');

    // --- ¡NUEVO! Seleccionar las 3 columnas de tareas ---
    const taskColumns = document.querySelectorAll('.task-list');


    // --- 2. EL GUARDIA DE SEGURIDAD ---
    // (Igual que en el dashboard)
    if (!token) {
        window.location.href = 'index.html';
        return;
    }


    // --- 3. ¡NUEVO! LEER EL ID DEL PROYECTO DESDE LA URL ---

    // 'URLSearchParams' es una herramienta de JavaScript para leer
    // la parte "?id=5" de la URL.
    const urlParams = new URLSearchParams(window.location.search);

    // 'urlParams.get("id")' nos da el valor asociado con "id".
    // Si la URL es "project.html?id=5", projectId será "5".
    const projectId = urlParams.get('id');

    if (!projectId) {
        // Si no hay ID en la URL, no sabemos qué proyecto cargar.
        alert('Error: No se especificó ningún proyecto.');
        window.location.href = 'dashboard.html'; // Devolver al dashboard
        return;
    }


    // --- 4. LÓGICA DE EVENTOS ---

    // Lógica para Cerrar Sesión (idéntica al dashboard)
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('jwtToken');
        alert('Has cerrado sesión.');
        window.location.href = 'index.html';
    });


    /**Lógica para Crear una Nueva Tarea
        * Se activa cuando el formulario 'createTaskForm'(que seleccionamos arriba)
            * detecta un evento 'submit'(cuando el usuario presiona el botón "Añadir Tarea").
     * 'async' es necesario porque usaremos 'await' para la llamada 'fetch'.
     */

    createTaskForm.addEventListener('submit', async (event) => {
        // 'event.preventDefault()' es crucial.
        // Detiene el comportamiento normal del navegador (que sería recargar la página).
        // Nosotros queremos manejarlo todo con JavaScript "por detrás".
        event.preventDefault();

        // Limpiamos cualquier mensaje de error de un intento anterior.
        createTaskError.textContent = '';

        // 1. Obtenemos el texto que el usuario escribió en los inputs.
        //    '.value' nos da el contenido actual del campo.
        const title = taskTitleInput.value;
        const description = taskDescriptionInput.value;

        // 2. Validación simple en el frontend.
        //    '.trim()' quita espacios en blanco al inicio y al final.
        //    Si el título está vacío (o solo tiene espacios), mostramos un error.
        if (!title.trim()) {
            createTaskError.textContent = 'El título es obligatorio.';
            return; // 'return' detiene la ejecución de la función aquí.
        }

        // 3. Crear el objeto DTO (Data Transfer Object).
        //    Este objeto JavaScript DEBE tener la misma "forma"
        //    (mismos nombres de propiedades) que nuestro DTO de C# en el backend (TaskCreateDto.cs).
        const taskData = {
            title: title,
            description: description
            // Nota: No enviamos 'ProjectId' en el 'body' porque ya va en la URL.
            // No enviamos 'Status' porque el backend lo asigna por defecto ("Pendiente").
        };

        // 4. 'try...catch' : El bloque estándar para manejar operaciones 'async' (asíncronas).
        //    Si algo falla dentro de 'try' (ej. la API se cae),
        //    la ejecución salta inmediatamente al bloque 'catch (error)'.
        try {
            // 5. ¡LA LLAMADA A LA API!
            //    Usamos 'await fetch()' para hacer la petición de red y "esperar" la respuesta.
            //    Construimos la URL del endpoint:
            //    Ej: "https://localhost:7065/api/projects/5/tasks"
            //    (Usamos 'projectId', la variable que ya habíamos leído de la URL al cargar la página).
            const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks`, {
                method: 'POST', // Le decimos a la API que queremos CREAR un nuevo recurso.
                headers: {
                    // Le decimos a la API que le estamos enviando datos en formato JSON.
                    'Content-Type': 'application/json',
                    // ¡La autenticación! Enviamos el "boleto" (token) que guardamos al iniciar sesión.
                    // Sin esto, la API nos rechazaría con un error 401 (No Autorizado).
                    'Authorization': `Bearer ${token}`
                },
                // 'body' es el contenido de nuestra petición.
                // 'JSON.stringify(taskData)' convierte nuestro objeto 'data' de JavaScript
                // en un string de texto plano en formato JSON, que es lo que la API entiende.
                body: JSON.stringify(taskData)
            });

            // 6. Revisamos la respuesta de la API.
            //    'response.ok' es 'true' si el código de estado fue 200-299.
            //    Nuestro backend devuelve 201 (Created) si tiene éxito.
            if (response.ok) {
                // ¡ÉXITO! La tarea se creó en la base de datos.

                // 7. Limpiamos el formulario para que el usuario pueda añadir otra tarea.
                createTaskForm.reset();

                // 8. ¡EL PATRÓN DE ACTUALIZACIÓN!
                //    En lugar de "adivinar" cómo se ve la nueva tarea, simplemente
                //    volvemos a llamar a nuestra función 'fetchProjectTasks()'.
                //    Esto le pide a la API la lista FRESCA de tareas y
                //    la vuelve a "pintar" toda, haciendo que nuestra
                //    nueva tarea aparezca mágicamente en la columna "Pendiente".
                fetchProjectTasks();

            } else {
                // La API nos dio un error (ej. 400 Bad Request si la validación falló).
                const error = await response.json(); // Leemos el cuerpo del error
                console.error("Error de validación:", error);
                createTaskError.textContent = 'Error al crear la tarea.';
            }

        } catch (error) {
            // Error de Conexión. Esto se activa si el 'fetch' en sí falla
            // (ej. la API está apagada o no hay internet).
            console.error('Error de conexión:', error);
            createTaskError.textContent = 'Error de conexión con la API.';
        }
    });


    // ¡NUEVO! LÓGICA DE DRAG AND DROP (PARA LAS COLUMNAS) ---

    // Recorremos las 3 columnas ("Pendiente", "En Progreso", "Terminado")
    taskColumns.forEach(column => {

        // A. EVENTO 'DRAGOVER' (SOBREVOLAR)
        //    Se activa continuamente mientras una tarjeta se arrastra SOBRE la columna.
        column.addEventListener('dragover', (event) => {
            // ¡ESTO ES CRUCIAL!
            // Por defecto, el navegador NO permite soltar elementos.
            // 'event.preventDefault()' le dice al navegador:
            // "¡Confía en mí, sé lo que hago, PERMITE soltar aquí!"
            event.preventDefault();
        });

        // B. EVENTO 'DROP' (SOLTAR)
        //    Se activa UNA VEZ, cuando el usuario "suelta" la tarjeta en la columna.
        column.addEventListener('drop', async (event) => {
            event.preventDefault(); // Prevenir cualquier comportamiento raro del navegador

            // 1. Obtener el ID de la tarjeta que guardamos en 'dragstart'
            //    (Ej. "task-7")
            const taskIdString = event.dataTransfer.getData('text/plain');

            // Limpiamos el "task-" para quedarnos solo con el número (ej. "7")
            const taskId = taskIdString.replace('task-', '');

            // 2. Obtener el NUEVO estado de la columna donde la soltamos
            //    (El ID de la columna es "task-column-En Progreso")
            //    Limpiamos el "task-column-" para quedarnos con el estado (ej. "En Progreso")
            const newStatus = column.id.replace('task-column-', '');

            // 3. (Opcional) Mover la tarjeta visualmente INMEDIATAMENTE
            //    Esto da una sensación de rapidez, antes de llamar a la API.
            const taskCard = document.getElementById(taskIdString);
            column.appendChild(taskCard); // Mueve el elemento en el DOM

            // 4. Llamar a la función que actualizará el backend
            //    (Esta función la crearemos en el siguiente paso)
            await updateTaskStatus(taskId, newStatus);
        });
    });
    // --- FIN DE LÓGICA DE DRAG AND DROP ---


    // --- 5. DEFINICIÓN DE FUNCIONES (FETCHING Y RENDERING) ---

    /**
     * Función para OBTENER LOS DATOS DEL PROYECTO
     * Llama a GET /api/projects/{id} para obtener el nombre del proyecto
     * y mostrarlo en el encabezado <h1>.
     */
    async function fetchProjectDetails() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // ¡Autenticación!
                }
            });

            if (response.ok) {
                const project = await response.json();
                // Actualizamos el <h1> con el nombre real del proyecto
                projectNameHeader.textContent = `Proyecto: ${project.name}`;
            } else {
                // Si falla (ej. el proyecto no existe o no es nuestro)
                console.error('Error al cargar el proyecto:', response.statusText);
                projectNameHeader.textContent = 'Error al cargar proyecto';
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            projectNameHeader.textContent = 'Error de conexión';
        }
    }

    /**
     * Función para OBTENER LAS TAREAS de este proyecto
     * Llama a GET /api/projects/{projectId}/tasks
     */
    async function fetchProjectTasks() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // ¡Autenticación!
                }
            });

            if (response.ok) {
                const tasks = await response.json();
                // Enviamos las tareas a la función que las "pintará"
                renderTasks(tasks);
            } else {
                console.error('Error al cargar las tareas:', response.statusText);
            }
        } catch (error) {
            console.error('Error de conexión:', error);
        }
    }

    /**
     * Función para "PINTAR" LAS TAREAS EN SUS COLUMNAS
     * Recibe la lista de tareas y las distribuye.
     * @param {Array} tasks - Un array de objetos de tarea
     */
    function renderTasks(tasks) {
        // 1. Limpiamos todas las columnas antes de empezar
        document.getElementById('task-column-Pendiente').innerHTML = '';
        document.getElementById('task-column-En Progreso').innerHTML = '';
        document.getElementById('task-column-Terminado').innerHTML = '';

        // 2. Recorremos la lista de tareas
        tasks.forEach(task => {
            // 3. Creamos la tarjeta HTML para la tarea
            const taskCard = document.createElement('div');
            taskCard.className = 'task-card';
            taskCard.id = `task-${task.id}`;
            taskCard.draggable = true; // <-- ¡AQUÍ LA HACEMOS "AGARRABLE" LA TARJETA!
            taskCard.innerHTML = `
                <h4>${task.title}</h4>
                <p>${task.description || ''}</p>
            `;

            // 4. ¡DECISIÓN CLAVE!
            //    Buscamos la columna correcta basada en el 'task.status'
            //    (El ID de la columna lo definimos como "task-column-Pendiente", etc.)
            const column = document.getElementById(`task-column-${task.status}`);

            if (column) {
                // Si encontramos la columna, añadimos la tarjeta
                column.appendChild(taskCard);
                // 5. ¡NUEVA LÓGICA DE DRAG!
                //    Se activa cuando el usuario "agarra" la tarjeta.
                taskCard.addEventListener('dragstart', (event) => {
                    // 'dataTransfer' es el "portapapeles" del drag and drop.
                    // Guardamos el ID de la tarjeta (ej. "task-7") para saber
                    // cuál estamos moviendo.
                    event.dataTransfer.setData('text/plain', taskCard.id);

                    // (Opcional) Añadimos una clase CSS para dar feedback visual
                    taskCard.classList.add('dragging');
                });

                // (Opcional) Limpiamos el estilo cuando se suelta
                taskCard.addEventListener('dragend', () => {
                    taskCard.classList.remove('dragging');
                });
            } else {
                // Si no (ej. 'task.status' es "Archivado", lo cual no tenemos)
                console.warn(`Estado desconocido: ${task.status}`);
            }
        });
    }

    /**
     * ¡NUEVO! Función para ACTUALIZAR EL ESTADO de una tarea
     * Llama al endpoint PATCH /api/tasks/{id}/move
     * @param {string} taskId - El ID de la tarea (ej. "7")
     * @param {string} newStatus - El nuevo estado (ej. "En Progreso")
     */
    async function updateTaskStatus(taskId, newStatus) {
        // (No necesitamos verificar el token aquí, el "Guardia" ya lo hizo)

        // 1. Crear el DTO (debe coincidir con TaskStatusUpdateDto.cs)
        const statusData = {
            status: newStatus
        };

        try {
            // 2. Hacer la llamada 'fetch' PATCH
            const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/move`, {
                method: 'PATCH', // ¡PATCH es para actualizaciones parciales!
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Autenticación
                },
                body: JSON.stringify(statusData)
            });

            if (!response.ok) {
                // Si la API falla, ¡tenemos un problema!
                console.error('Error al actualizar el estado de la tarea.');
                // En un proyecto real, aquí "revertiríamos" el movimiento visual,
                // pero por ahora, simplemente recargamos todo para estar seguros.
                fetchProjectTasks();
            }

            // Si la respuesta es 'ok' (204 No Content), no hacemos nada.
            // ¿Por qué? Porque ya movimos la tarjeta visualmente en el
            // evento 'drop'. Confiamos en que la API funcionó.
            // (Esto se llama "Actualización Optimista").

        } catch (error) {
            // Error de Conexión
            console.error('Error de conexión:', error);
            // Si hay un error de red, recargamos todo para estar seguros
            fetchProjectTasks();
        }
    }
    // --- FIN DE updateTaskStatus ---


    // --- 6. EJECUCIÓN INICIAL ---
    // En cuanto carga la página, buscamos los detalles
    // del proyecto Y sus tareas.
    fetchProjectDetails();
    fetchProjectTasks();

}); // Fin del 'DOMContentLoaded'