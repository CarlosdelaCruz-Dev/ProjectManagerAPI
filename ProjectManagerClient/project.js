// 'DOMContentLoaded' espera a que project.html esté listo
document.addEventListener('DOMContentLoaded', () => {

    // === 1. CONSTANTES Y ELEMENTOS DEL DOM ===
    const API_BASE_URL = "https://localhost:7065";
    const projectNameHeader = document.getElementById('project-name-header');
    const logoutButton = document.getElementById('logout-button');

    // Obtenemos el token (el "boleto") desde el localStorage.
    const token = localStorage.getItem('jwtToken');

    // Elementos del formulario de creación de tareas
    const createTaskForm = document.getElementById('create-task-form');
    const taskTitleInput = document.getElementById('task-title');
    const taskDescriptionInput = document.getElementById('task-description');
    const createTaskError = document.getElementById('create-task-error');

    // Columnas del tablero kanban ("Pendiente", "En Progreso", "Terminado")
    const taskColumns = document.querySelectorAll('.task-list');

    // Elementos del modal de edición de tareas
    const editTaskModal = document.getElementById('edit-task-modal');
    const editTaskForm = document.getElementById('edit-task-form');
    const editTaskIdInput = document.getElementById('edit-task-id');
    const editTaskTitleInput = document.getElementById('edit-task-title');
    const editTaskDescriptionInput = document.getElementById('edit-task-description');
    const editTaskError = document.getElementById('edit-task-error');
    const closeTaskModalButton = editTaskModal.querySelector('#close-task-modal-btn');

    // === 2. SEGURIDAD Y CONTEXTO (TOKEN + ID DE PROYECTO) ===

    // 1. Verificamos que el usuario tenga token de sesión.
    //    Si no lo tiene, lo regresamos al login.
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // 2. Leemos el ID del proyecto desde la URL (ej. project.html?id=5)
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        alert('Error: No se especificó ningún proyecto.');
        window.location.href = 'dashboard.html';
        return;
    }

    // === 3. FUNCIONES PRINCIPALES (API Y UI) ===

    /**
     * Esta función se encarga de pedir a la API los datos básicos del proyecto
     * y mostrar el nombre en el encabezado <h1>.
     * Llama a GET /api/projects/{id}.
     */
    async function fetchProjectDetails() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Autenticación
                }
            });

            if (response.ok) {
                const project = await response.json();
                projectNameHeader.textContent = `Proyecto: ${project.name}`;
            } else {
                console.error('Error al cargar el proyecto:', response.statusText);
                projectNameHeader.textContent = 'Error al cargar proyecto';
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            projectNameHeader.textContent = 'Error de conexión';
        }
    }

    /**
     * Esta función se encarga de obtener las tareas del proyecto actual
     * desde la API y delegar el dibujado al tablero.
     * Llama a GET /api/projects/{projectId}/tasks.
     */
    async function fetchProjectTasks() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Autenticación
                }
            });

            if (response.ok) {
                const tasks = await response.json();
                // Enviamos las tareas a la función que las "pinta" en el tablero
                renderTasks(tasks);
            } else {
                console.error('Error al cargar las tareas:', response.statusText);
            }
        } catch (error) {
            console.error('Error de conexión:', error);
        }
    }

    /**
     * Función para "pintar" las tareas en sus columnas del tablero.
     * @param {Array} tasks - Lista de tareas del proyecto
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
            taskCard.draggable = true; // <-- Hacemos la tarjeta arrastrable

            // Contenido de la tarjeta con botón de eliminar y de editar
            taskCard.innerHTML = `
                <button class="delete-task-btn" data-task-id="${task.id}">&times;</button>
                <h4>${task.title}</h4>
                <p>${task.description || ''}</p>
                <button class="edit-task-btn" data-task-id="${task.id}">Editar</button>
            `;

            // 4. Decidimos en qué columna va la tarjeta según su 'status'
            const column = document.getElementById(`task-column-${task.status}`);

            if (column) {
                column.appendChild(taskCard);

                // 5. Lógica de drag & drop para la tarjeta
                taskCard.addEventListener('dragstart', (event) => {
                    // Guardamos el ID de la tarjeta que se está arrastrando
                    event.dataTransfer.setData('text/plain', taskCard.id);
                    taskCard.classList.add('dragging');
                });

                taskCard.addEventListener('dragend', () => {
                    taskCard.classList.remove('dragging');
                });

                // 6. Añadimos el listener del botón de eliminar
                const deleteButton = taskCard.querySelector('.delete-task-btn');

                deleteButton.addEventListener('click', (event) => {
                    // Evitamos que el click dispare el drag
                    event.stopPropagation();

                    if (confirm(`¿Seguro que quieres eliminar la tarea "${task.title}"?`)) {
                        deleteTask(task.id);
                    }
                });

                // 7. Añadimos el listener del botón de editar
                const editButton = taskCard.querySelector('.edit-task-btn');

                editButton.addEventListener('click', (event) => {
                    // Evitamos que el click dispare el drag
                    event.stopPropagation();
                    // Abrimos el modal con los datos de esta tarea
                    openEditTaskModal(task);
                });

            } else {
                // Si el estado no coincide con ninguna columna conocida
                console.warn(`Estado desconocido: ${task.status}`);
            }
        });
    }

    /**
     * Función para actualizar SOLO el estado (columna) de una tarea en la API.
     * Llama al endpoint PATCH /api/tasks/{id}/move.
     * @param {string} taskId - El ID de la tarea (ej. "7")
     * @param {string} newStatus - El nuevo estado (ej. "En Progreso")
     */
    async function updateTaskStatus(taskId, newStatus) {
        // Creamos el DTO que espera el backend
        const statusData = {
            status: newStatus
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/move`, {
                method: 'PATCH', // PATCH: actualización parcial
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Autenticación
                },
                body: JSON.stringify(statusData)
            });

            if (!response.ok) {
                console.error('Error al actualizar el estado de la tarea.');
                // Volvemos a pedir las tareas para estar seguros
                fetchProjectTasks();
            }

        } catch (error) {
            console.error('Error de conexión:', error);
            // Si hay un error de red, recargamos la lista de tareas
            fetchProjectTasks();
        }
    }

    /**
     * Función para ELIMINAR una tarea.
     * Llama al endpoint DELETE /api/tasks/{taskId}.
     * @param {string} taskId - El ID de la tarea a eliminar (ej. "7")
     */
    async function deleteTask(taskId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Autenticación
                }
            });

            if (response.ok) { // Éxito (204 No Content)
                // 1. Refrescamos la lista para que la tarjeta desaparezca del tablero
                fetchProjectTasks();
            } else {
                // Error (ej. 401 No Autorizado, 404 Tarea no encontrada)
                console.error('Error al eliminar la tarea:', response.statusText);
                alert('Error: No se pudo eliminar la tarea.');
            }

        } catch (error) { // Error de red
            console.error('Error de conexión:', error);
            alert('Error de conexión con la API.');
        }
    }

    /**
     * Abre el modal de "Editar Tarea" y lo rellena con los
     * datos de la tarea seleccionada.
     * @param {object} task - Objeto de la tarea (ej. {id: 7, title: "T1", ...})
     */
    function openEditTaskModal(task) {
        // 1. Rellenamos el formulario con los datos actuales de la tarea
        editTaskIdInput.value = task.id; // Guardar el ID en el input oculto
        editTaskTitleInput.value = task.title; // Poner el título actual
        editTaskDescriptionInput.value = task.description || ''; // Poner la desc. actual
        editTaskError.textContent = ''; // Limpiar errores

        // 2. Mostrar el modal (cambiando su estilo CSS)
        editTaskModal.style.display = 'block';
    }

    /**
     * Cierra el modal de "Editar Tarea".
     */
    function closeEditTaskModal() {
        editTaskModal.style.display = 'none';
    }

    /**
     * Función para actualizar el título y la descripción de una tarea.
     * Llama al endpoint PUT /api/tasks/{taskId}.
     * @param {string} taskId - El ID de la tarea (ej. "7")
     * @param {object} taskData - DTO con el nuevo título y descripción
     */
    async function updateTaskDetails(taskId, taskData) {

        try {
            // 1. Hacemos la llamada PUT a la API
            const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
                method: 'PUT', // PUT: actualizar recurso completo
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Autenticación
                },
                body: JSON.stringify(taskData)
            });

            if (response.ok) {
                // 2. Cerramos el modal
                closeEditTaskModal();

                // 3. Refrescamos la lista de tareas
                //    Esto hará que la tarjeta se repinte con el nuevo título/desc.
                fetchProjectTasks();

            } else {
                // Error de validación (ej. título vacío)
                console.error('Error al actualizar la tarea:', response.statusText);
                editTaskError.textContent = 'Error al guardar. Asegúrate de que el título sea válido.';
            }

        } catch (error) {
            // Error de conexión
            console.error('Error de conexión:', error);
            editTaskError.textContent = 'Error de conexión con la API.';
        }
    }

    // === 4. LÓGICA DE EVENTOS Y LISTENERS ===

    // 4.1 Lógica para cerrar sesión (idéntica al dashboard)
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('jwtToken');
        alert('Has cerrado sesión.');
        window.location.href = 'index.html';
    });

    /**
     * 4.2 Lógica para crear una nueva tarea.
     * Se ejecuta cuando se envía el formulario "Añadir Tarea".
     */
    createTaskForm.addEventListener('submit', async (event) => {
        // 1. Evitamos que el formulario recargue la página.
        event.preventDefault();

        // 2. Limpiamos cualquier mensaje de error previo.
        createTaskError.textContent = '';

        // 3. Obtenemos los valores que el usuario escribió.
        const title = taskTitleInput.value;
        const description = taskDescriptionInput.value;

        // 4. Validación básica del título.
        if (!title.trim()) {
            createTaskError.textContent = 'El título es obligatorio.';
            return; // Detenemos la ejecución aquí.
        }

        // 5. Creamos el objeto DTO que espera la API.
        const taskData = {
            title: title,
            description: description
            // No enviamos 'ProjectId' porque va en la URL.
            // No enviamos 'Status' porque el backend lo asigna por defecto.
        };

        // 6. Llamamos a la API dentro de un bloque try/catch.
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks`, {
                method: 'POST', // Creamos un nuevo recurso (tarea)
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Enviamos el "boleto"
                },
                body: JSON.stringify(taskData)
            });

            // 7. Revisamos si la API respondió bien.
            if (response.ok) {
                // Limpiamos el formulario para una nueva tarea.
                createTaskForm.reset();

                // 8. Pedimos la lista actualizada de tareas.
                //    Así la nueva tarea aparece en la columna "Pendiente".
                fetchProjectTasks();

            } else {
                const error = await response.json(); // Leemos el cuerpo del error
                console.error("Error de validación:", error);
                createTaskError.textContent = 'Error al crear la tarea.';
            }

        } catch (error) {
            // Error de conexión
            console.error('Error de conexión:', error);
            createTaskError.textContent = 'Error de conexión con la API.';
        }
    });

    // 4.3 Lógica de drag and drop para las columnas del tablero
    taskColumns.forEach(column => {

        // A. Evento 'dragover' (cuando sobrevolamos una columna)
        column.addEventListener('dragover', (event) => {
            // Permite que se pueda soltar la tarjeta en esta columna
            event.preventDefault();
        });

        // B. Evento 'drop' (cuando soltamos la tarjeta en la columna)
        column.addEventListener('drop', async (event) => {
            event.preventDefault(); // Prevenimos comportamiento por defecto

            // 1. Obtenemos el ID de la tarjeta desde dataTransfer (ej. "task-7")
            const taskIdString = event.dataTransfer.getData('text/plain');

            // Limpiamos el "task-" para quedarnos solo con el número (ej. "7")
            const taskId = taskIdString.replace('task-', '');

            // 2. Obtenemos el nuevo estado según la columna donde se soltó.
            //    El ID de la columna es "task-column-En Progreso", etc.
            const newStatus = column.id.replace('task-column-', '');

            // 3. Movemos la tarjeta en el DOM de inmediato (feedback visual rápido).
            const taskCard = document.getElementById(taskIdString);
            column.appendChild(taskCard); // Mueve el elemento en el DOM

            // 4. Actualizamos el estado en el backend.
            await updateTaskStatus(taskId, newStatus);
        });
    });

    // 4.4 Lógica del modal de edición de tareas

    // Botón "X" para cerrar el modal
    closeTaskModalButton.addEventListener('click', closeEditTaskModal);

    // Envío del formulario de edición
    editTaskForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevenir recarga
        editTaskError.textContent = 'Guardando...';

        // 1. Obtenemos los datos actualizados del formulario.
        const id = editTaskIdInput.value; // El ID de la tarea (del input oculto)
        const title = editTaskTitleInput.value;
        const description = editTaskDescriptionInput.value;

        // 2. Creamos el DTO de actualización (TaskUpdateDto).
        const taskData = {
            title: title,
            description: description
            // No enviamos 'status', este endpoint no lo actualiza.
        };

        // 3. Llamamos a la función que envía la actualización a la API.
        await updateTaskDetails(id, taskData);
    });

    // === 5. EJECUCIÓN INICIAL ===
    // Cuando la página carga, pedimos los datos del proyecto y sus tareas.
    fetchProjectDetails();
    fetchProjectTasks();

}); // Fin del 'DOMContentLoaded'
