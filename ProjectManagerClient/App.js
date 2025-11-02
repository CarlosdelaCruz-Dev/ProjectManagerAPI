// Usamos 'document.addEventListener' para asegurarnos de que nuestro código JavaScript
// no se ejecute hasta que el documento HTML (index.html) esté completamente cargado y listo.
document.addEventListener('DOMContentLoaded', () => {

    // --- Definición de Constantes Globales ---
    // ¡URL ACTUALIZADA! Esta es la dirección de tu backend .NET
    const API_BASE_URL = "https://localhost:7065";

    // --- Selección de Elementos del DOM (Registro) ---
    // "Cacheamos" (guardamos) los elementos del HTML en constantes de JavaScript
    // para no tener que buscarlos ('getElementById') cada vez que los usamos. Es más eficiente.
    const registerForm = document.getElementById('register-form');
    const registerUsername = document.getElementById('register-username');
    const registerEmail = document.getElementById('register-email');
    const registerPassword = document.getElementById('register-password');
    const registerMessage = document.getElementById('register-message'); // El párrafo <p> para mensajes



    // --- LÓGICA DE REGISTRO ---

    // 1. Añadimos un "escuchador de eventos" al formulario de registro.
    //    'async' indica que esta función usará operaciones asíncronas ('await').
    registerForm.addEventListener('submit', async (event) => {

        // 2. 'event.preventDefault()' previene que el formulario recargue la página.
        //    Nosotros manejaremos el envío con JavaScript.
        event.preventDefault();

        // 3. Limpiamos mensajes anteriores y mostramos feedback
        registerMessage.textContent = 'Enviando...';
        registerMessage.className = ''; // Resetea las clases de CSS

        // 4. Recolectamos los valores de los inputs.
        const username = registerUsername.value;
        const email = registerEmail.value;
        const password = registerPassword.value;

        // 5. Creamos el objeto 'data' (nuestro DTO de frontend).
        //    Las claves (username, email, password) DEBEN coincidir
        //    con las propiedades de nuestro 'UserRegisterDto.cs' en el backend.
        const data = {
            Name: username,
            email: email,
            password: password
        };

        // --- ¡AQUÍ ESTÁ LA MAGIA! (fetch) ---
        // 'try...catch' es un bloque para manejo de errores.
        // Si algo falla (ej. la API está apagada), el 'catch' lo atrapará.
        try {
            // 6. Usamos 'await fetch' para hacer la llamada a la API.
            //    Construimos la URL completa: API_BASE_URL + "/api/auth/register"
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST', // Le decimos a la API que esto es una petición POST.
                headers: {
                    // Le decimos a la API que le estamos enviando datos en formato JSON.
                    'Content-Type': 'application/json'
                },
                // 'JSON.stringify(data)' convierte nuestro objeto JavaScript 'data'
                // en un string de texto JSON, que es lo que la API espera.
                body: JSON.stringify(data)
            });

            // 7. Después del 'await', la 'response' (respuesta) de la API ha llegado.

            // Verificamos si la respuesta fue exitosa (código HTTP 200-299)
            if (response.ok) {
                // 'response.ok' es true para códigos 200, 201, 204, etc.
                // Nuestro backend devuelve 201 (Created) si tiene éxito.
                registerMessage.textContent = '¡Registro exitoso! Ahora puedes iniciar sesión.';
                registerMessage.className = 'success-message'; // Clase CSS verde

                // Limpiamos el formulario
                registerForm.reset();
            } else {
                // Si la respuesta NO fue 'ok' (ej. 400 Bad Request, 500 Server Error)

                // Intentamos leer el mensaje de error que envía la API (si es que envía uno)
                const errorData = await response.json(); // Asume que el error también es JSON
                const errorMessage = errorData.message || `Error ${response.status}: ${response.statusText}`;

                registerMessage.textContent = `Error: ${errorMessage}`;
                registerMessage.className = 'error-message'; // Clase CSS roja
            }

        } catch (error) {
            // 8. Este 'catch' atrapa errores de RED (ej. no se pudo conectar, la API está apagada).
            console.error('Error de conexión:', error);
            registerMessage.textContent = 'Error de conexión. ¿Está la API encendida?';
            registerMessage.className = 'error-message';
        }
        // --- FIN DEL fetch ---
    });
    // --- FIN DE LÓGICA DE REGISTRO ---


    // --- LÓGICA DE LOGIN ---

    // --- Selección de Elementos del DOM (Login) ---
    // (Los definimos ahora para usarlos después)
    const loginForm = document.getElementById('login-form');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginError = document.getElementById('login-error'); // El <p> para errores de login

    // ---------------------------------
    loginForm.addEventListener('submit', async (event) => {
        // 1. Prevenir que el formulario recargue la página
        event.preventDefault();

        // 2. Limpiar mensajes de error anteriores
        loginError.textContent = 'Iniciando sesión...';
        loginError.className = ''; // Resetea la clase (por si era 'error-message')

        // 3. Recolectar los valores (email y password) de los inputs
        const email = loginEmail.value;
        const password = loginPassword.value;

        // 4. Crear el objeto 'data' (nuestro DTO de frontend)
        //    Las claves (email, password) DEBEN coincidir
        //    con las propiedades de nuestro 'UserLoginDto.cs' en el backend.
        const data = {
            email: email,
            password: password
        };

        // --- ¡Llamada 'fetch' al endpoint de Login! ---
        try {
            // 5. Llamamos al endpoint /api/auth/login
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            // 6. Analizar la respuesta.
            //    A diferencia del registro (que devolvía 201), el login
            //    devolverá 200 (OK) si tiene éxito, o 401 (Unauthorized) si falla.

            if (response.ok) { // response.ok es true si el status es 200

                // 7. ¡Éxito! El backend nos envió el Token JWT.
                //    Lo leemos como JSON. La respuesta se verá así: { "token": "ey..." }
                const result = await response.json();
                const token = result.token;

                // 8. ¡PASO CLAVE! Guardar el token en el navegador.
                //    'localStorage' es un pequeño "almacén" en el navegador.
                //    Esto nos permite recordar el token entre recargas de página.
                //    Es nuestro "boleto de acceso" guardado.
                localStorage.setItem('jwtToken', token);

                // 9. Damos feedback y REDIRIGIMOS al dashboard.
                loginError.textContent = '¡Éxito! Redirigiendo...';
                loginError.className = 'success-message'; // Clase CSS verde

                // Por ahora, solo saludamos en la consola.
                console.log('Token guardado:', token);

                // ¡ACCIÓN DE REDIRECCIÓN!
                // Esto cambia la página del navegador a 'dashboard.html'
                window.location.href = 'dashboard.html';

            } else {
                // 10. Si la respuesta NO fue 'ok' (ej. 401 Unauthorized o 400 Bad Request)
                //     Esto significa "Email o contraseña incorrectos".
                loginError.textContent = 'Email o contraseña incorrectos.';
                loginError.className = 'error-message'; // Clase CSS roja
            }

        } catch (error) {
            // 11. Este 'catch' atrapa errores de RED (API apagada, etc.)
            console.error('Error de conexión en Login:', error);
            loginError.textContent = 'Error de conexión. ¿Está la API encendida?';
            loginError.className = 'error-message';
        }
        // --- FIN DEL fetch ---
    });
    // --- FIN DE LÓGICA DE LOGIN ---




}); // Fin del 'DOMContentLoaded'