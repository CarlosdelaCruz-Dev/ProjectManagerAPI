// 'DOMContentLoaded' es un "escuchador de eventos" que espera a que todo el
// HTML (dashboard.html) se haya cargado por completo antes de ejecutar
// cualquier código JavaScript. Esto previene errores donde JS intenta
// encontrar un elemento (ej. 'logout-button') que todavía no existe.
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DEFINICIÓN DE CONSTANTES ---
    // Guardamos todos nuestros "puntos de contacto" en variables constantes
    // para un acceso fácil y rápido.

    // La dirección raíz de nuestra API de backend.
    const API_BASE_URL = "https://localhost:7065";

    // --- Elementos de la Barra de Navegación ---
    // El 'span' donde pondremos "Bienvenido, <usuario>"
    const userInfo = document.getElementById('user-info');
    // El botón para salir
    const logoutButton = document.getElementById('logout-button');

    // --- Elementos del Formulario de Crear Proyecto ---
    const createProjectForm = document.getElementById('create-project-form');
    const projectNameInput = document.getElementById('project-name');
    const projectDescriptionInput = document.getElementById('project-description');
    const createProjectError = document.getElementById('create-project-error');


    // --- ¡NUEVO! Seleccionar elementos del Modal de Edición ---
    const editModal = document.getElementById('edit-project-modal');
    const editProjectForm = document.getElementById('edit-project-form');
    const editProjectIdInput = document.getElementById('edit-project-id');
    const editProjectNameInput = document.getElementById('edit-project-name');
    const editProjectDescriptionInput = document.getElementById('edit-project-description');
    const editProjectError = document.getElementById('edit-project-error');
    const closeModalButton = document.querySelector('.close-modal-btn');

    // --- Contenedor de Proyectos ---
    // El 'div' donde "pintaremos" las tarjetas de los proyectos
    const projectsContainer = document.getElementById('projects-container');

    // --- Autenticación ---
    // Leemos el "boleto de acceso" (Token) que guardamos en localStorage
    // durante el inicio de sesión (en app.js).
    const token = localStorage.getItem('jwtToken');


    // --- 2. EL GUARDIA DE SEGURIDAD ---
    // Esta es la primera comprobación que hacemos.
    // Si el usuario no tiene un token (porque no ha iniciado sesión
    // o porque lo borró), lo "expulsamos" inmediatamente.
    if (!token) {
        // Redirigimos al usuario a la página de inicio de sesión
        window.location.href = 'index.html';
        // 'return' detiene la ejecución de todo el script.
        // No tiene sentido cargar proyectos si el usuario no está autenticado.
        return;
    }


    // --- 3. LÓGICA DE EVENTOS (LISTENERS) ---
    // Aquí es donde le damos "vida" a los botones.

    /**
     * Lógica para Cerrar Sesión
     * Se activa cuando el usuario hace clic en 'logoutButton'.
     */
    logoutButton.addEventListener('click', () => {
        // "Cerrar sesión" en el frontend es simple:
        // solo borramos el "boleto" (token) del almacén.
        localStorage.removeItem('jwtToken');

        // Damos feedback al usuario
        alert('Has cerrado sesión.');

        // Lo enviamos de vuelta a la página de inicio.
        window.location.href = 'index.html';
    });

    /**
     * Lógica para Crear un Nuevo Proyecto
     * Se activa cuando el formulario 'createProjectForm' hace "submit".
     * Usamos 'async' porque dentro usaremos 'await' para la llamada fetch.
     */
    createProjectForm.addEventListener('submit', async (event) => {
        // Prevenir que el formulario recargue la página
        event.preventDefault();
        // Limpiar errores anteriores
        createProjectError.textContent = '';

        // 1. Obtener los valores de los inputs
        const name = projectNameInput.value;
        const description = projectDescriptionInput.value;

        // 2. Crear el objeto DTO (debe coincidir con ProjectCreateDto.cs)
        const projectData = {
            name: name,
            description: description
        };

        // 3. 'try...catch' es para manejar errores de red.
        try {
            // Hacemos la llamada 'fetch' al endpoint POST /api/projects
            const response = await fetch(`${API_BASE_URL}/api/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // ¡Clave de seguridad! Enviamos el token en el header 'Authorization'.
                    // El formato 'Bearer <token>' es el estándar que espera nuestra API.
                    'Authorization': `Bearer ${token}`
                },
                // Convertimos nuestro objeto JS en un string JSON
                body: JSON.stringify(projectData)
            });

            if (response.ok) {
                // ¡ÉXITO! (Respuesta 201 Created)
                // Limpiamos el formulario para que el usuario pueda crear otro.
                createProjectForm.reset();

                // ¡PATRÓN CLAVE!
                // En lugar de "adivinar" cómo se ve el nuevo proyecto,
                // simplemente volvemos a pedirle a la API la lista COMPLETA
                // de proyectos. Esto refresca la UI automáticamente.
                fetchProjects();
            } else {
                // Error de la API (ej. 400 Bad Request, nombre vacío)
                const error = await response.json();
                console.error("Error de validación:", error);
                createProjectError.textContent = 'Error al crear el proyecto. Asegúrate de que el nombre sea válido.';
            }

        } catch (error) {
            // Error de Conexión (ej. API apagada)
            console.error('Error de conexión:', error);
            createProjectError.textContent = 'Error de conexión con la API.';
        }
    });


    // --- 4. DEFINICIÓN DE FUNCIONES (FETCHING Y RENDERING) ---
    // Estas funciones definen la lógica principal de la página.

    /**
     * Función para OBTENER LOS DATOS DEL USUARIO
     * Llama al endpoint GET /api/users/me para obtener los datos
     * del usuario autenticado y mostrarlos en la barra de navegación.
     */
    async function fetchUserProfile() {
        try {
            // Hacemos la llamada 'fetch'
            const response = await fetch(`${API_BASE_URL}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Enviamos el token
                }
            });

            if (response.ok) {
                // ¡Éxito! (Respuesta 200 OK)
                const user = await response.json();
                // Usamos 'user.name' (que coincide con el JSON que envía la API)
                userInfo.textContent = `Bienvenido, ${user.name}`;
            } else if (response.status === 401) {
                // Error 401 (No Autorizado) - El token es inválido o expiró.
                alert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
                localStorage.removeItem('jwtToken'); // Limpiar el token malo
                window.location.href = 'index.html'; // Expulsar
            } else {
                // Otro error (ej. 500 Error de Servidor)
                console.error('Error al obtener el perfil:', response.statusText);
                userInfo.textContent = 'Error al cargar usuario.';
            }
        } catch (error) {
            // Error de Conexión (ej. API apagada)
            console.error('Error de conexión:', error);
            userInfo.textContent = 'Error de conexión.';
        }
    }

    /**
     * Función para OBTENER LOS PROYECTOS
     * Llama al endpoint GET /api/projects para obtener la lista
     * de proyectos que le pertenecen al usuario autenticado.
     */
    async function fetchProjects() {
        // (No necesitamos verificar el token aquí, el "Guardia" ya lo hizo)
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Enviamos el token
                }
            });

            if (response.ok) {
                // ¡Éxito! (Respuesta 200 OK)
                // 'projects' será un array (lista) de objetos de proyecto
                const projects = await response.json();

                // Enviamos la lista a la función que los "pintará" en el HTML
                renderProjects(projects);
            } else {
                // Error (ej. 401 Token inválido)
                console.error('Error al cargar los proyectos:', response.statusText);
                projectsContainer.innerHTML = '<p class="error-message">Error al cargar proyectos.</p>';
            }

        } catch (error) {
            // Error de Conexión (ej. API apagada)
            console.error('Error de conexión:', error);
            projectsContainer.innerHTML = '<p class="error-message">Error de conexión con la API.</p>';
        }
    }

    /**
     * Función para "PINTAR" LOS PROYECTOS EN EL HTML
     * Recibe una lista (array) de proyectos y crea el HTML dinámicamente.
     * @param {Array} projects - Un array de objetos de proyecto
     */
    function renderProjects(projects) {
        // Limpiamos el contenedor para borrar contenido viejo (ej. el mensaje "Aún no tienes...")
        projectsContainer.innerHTML = '';

        // Si la lista que nos dio la API está vacía...
        if (projects.length === 0) {
            // Mostramos un mensaje amigable.
            projectsContainer.innerHTML = '<p>Aún no tienes proyectos. ¡Crea uno!</p>';
            return; // Salimos de la función
        }

        // Si SÍ hay proyectos, usamos 'forEach' para recorrer el array
        projects.forEach(project => {
            // 1. Creamos un nuevo 'div' en memoria
            const projectCard = document.createElement('div');

            // 2. Le añadimos clases y IDs (para CSS y futuras interacciones)
            projectCard.className = 'project-card';
            projectCard.id = `project-${project.id}`;

            // 3. Definimos el HTML interno de la tarjeta
            //    ¡Añadimos un botón de eliminar!
            projectCard.innerHTML = `
                <h3><a href="project.html?id=${project.id}">${project.name}</a></h3>
                <p>${project.description || 'Este proyecto no tiene descripción.'}</p>
                <div class="project-card-actions">
                    <button class="edit-project-btn" data-project-id="${project.id}">Editar</button>
                    <button class="delete-project-btn" data-project-id="${project.id}">Eliminar</button>
                </div>
            `;

            // 4. Añadimos la tarjeta al contenedor
            projectsContainer.appendChild(projectCard);

            // 5. ¡NUEVA LÓGICA! 
            //    Buscamos el botón que ACABAMOS de crear dentro de la tarjeta
            const deleteButton = projectCard.querySelector('.delete-project-btn');

            // Y le añadimos su propio "escuchador de clics"
            deleteButton.addEventListener('click', async () => {
                // Pedimos confirmación antes de borrar
                if (!confirm(`¿Estás seguro de que quieres eliminar el proyecto "${project.name}"?`)) {
                    return; // Si el usuario dice "Cancelar", no hacemos nada.
                }

                // Si el usuario dice "Aceptar", procedemos a eliminar
                await deleteProject(project.id);
            });

            // 6. ¡NUEVA LÓGICA DE EDITAR!
            //    Buscamos el botón de editar que acabamos de crear
            const editButton = projectCard.querySelector('.edit-project-btn');

            editButton.addEventListener('click', () => {
                // Cuando el usuario haga clic en "Editar",
                // llamamos a una función para abrir el modal
                // y le pasamos los datos del proyecto actual.
                openEditModal(project);
            });
        });
    }


    /**
     * Función para ELIMINAR un proyecto
     * Llama al endpoint DELETE /api/projects/{id}
     * @param {number} projectId - El ID del proyecto a eliminar
     */
    async function deleteProject(projectId) {
        // Obtenemos el token (siempre necesario para endpoints protegidos)
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            alert('Sesión inválida.');
            window.location.href = 'index.html';
            return;
        }

        try {
            // Hacemos la llamada 'fetch' al endpoint DELETE
            // Usamos el 'projectId' en la URL
            const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}` // ¡Nuestra autenticación!
                }
            });

            if (response.ok) {
                // ¡Éxito! (Respuesta 204 No Content)
                // El proyecto fue eliminado en el backend.

                // ¡PATRÓN CLAVE!
                // Volvemos a cargar la lista de proyectos para que
                // el proyecto eliminado desaparezca de la UI.
                fetchProjects();

            } else {
                // Error (ej. 401 No Autorizado, 404 No Encontrado)
                alert('Error: No se pudo eliminar el proyecto.');
            }

        } catch (error) {
            // Error de Conexión
            console.error('Error de conexión:', error);
            alert('Error de conexión con la API.');
        }
    }
    // --- FIN DE deleteProject ---


    // --- FUNCIONES DEL MODAL DE EDICIÓN ---

    /**
     * Abre el modal y rellena el formulario con los datos
     * del proyecto que el usuario quiere editar.
     * @param {object} project - El objeto del proyecto (con id, name, description)
     */
    function openEditModal(project) {
        // Rellenamos el formulario con los datos actuales del proyecto
        editProjectIdInput.value = project.id;
        editProjectNameInput.value = project.name;
        editProjectDescriptionInput.value = project.description || '';
        editProjectError.textContent = ''; // Limpiar errores

        // Mostramos el modal (cambiando su estilo CSS)
        editModal.style.display = 'block';
    }

    /**
     * Cierra el modal de edición
     */
    function closeEditModal() {
        editModal.style.display = 'none';
    }

    // "Escuchador" para cerrar el modal
    closeModalButton.addEventListener('click', closeEditModal);

    // También podemos cerrar el modal si el usuario hace clic FUERA de la caja
    window.addEventListener('click', (event) => {
        if (event.target == editModal) {
            closeEditModal();
        }
    });

    // "Escuchador" para el envío del formulario de EDICIÓN
    editProjectForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        editProjectError.textContent = 'Guardando...';

        // 1. Obtener los datos (actualizados) del formulario
        const id = editProjectIdInput.value;
        const name = editProjectNameInput.value;
        const description = editProjectDescriptionInput.value;

        // 2. Obtener el token
        const token = localStorage.getItem('jwtToken');
        // (El guardia de la página ya debería habernos protegido, pero es bueno verificar)
        if (!token) return;

        // 3. Crear el DTO (debe coincidir con ProjectCreateDto.cs)
        const projectData = {
            name: name,
            description: description
        };

        // 4. Hacer la llamada 'fetch' PUT
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
                method: 'PUT', // ¡Este es el método para ACTUALIZAR!
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(projectData)
            });

            if (response.ok) {
                // ¡Éxito! (Respuesta 204 No Content)
                // 5. Cerrar el modal
                closeEditModal();

                // 6. ¡Refrescar la lista de proyectos!
                //    Esto hará que la tarjeta se repinte con el nuevo nombre.
                fetchProjects();

            } else {
                const error = await response.json();
                console.error("Error de validación:", error);
                editProjectError.textContent = 'Error al guardar. Asegúrate de que el nombre sea válido.';
            }

        } catch (error) {
            console.error('Error de conexión:', error);
            editProjectError.textContent = 'Error de conexión con la API.';
        }
    });
    // --- FIN DE FUNCIONES DEL MODAL ---


    // --- 5. EJECUCIÓN INICIAL ---
    // Esta es la "chispa" que enciende la página.
    // En cuanto la página carga y el Guardia de Seguridad pasa,
    // le pedimos a la API los datos del usuario y los proyectos.
    fetchUserProfile();
    fetchProjects();

}); // Fin del 'DOMContentLoaded'