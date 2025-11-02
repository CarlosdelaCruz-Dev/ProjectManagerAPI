// 'DOMContentLoaded' espera a que project.html esté listo
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DEFINICIÓN DE CONSTANTES ---
    const API_BASE_URL = "https://localhost:7065";
    const projectNameHeader = document.getElementById('project-name-header');
    const logoutButton = document.getElementById('logout-button');

    // Obtenemos el token (el "boleto")
    const token = localStorage.getItem('jwtToken');


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
            } else {
                // Si no (ej. 'task.status' es "Archivado", lo cual no tenemos)
                console.warn(`Estado desconocido: ${task.status}`);
            }
        });
    }


    // --- 6. EJECUCIÓN INICIAL ---
    // En cuanto carga la página, buscamos los detalles
    // del proyecto Y sus tareas.
    fetchProjectDetails();
    fetchProjectTasks();

}); // Fin del 'DOMContentLoaded'