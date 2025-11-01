using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagerAPI.Data;
using ProjectManagerAPI.DTOs;
using ProjectManagerAPI.Models;
using System.Security.Claims;
using Task = System.Threading.Tasks.Task; // Alias para evitar ambigüedad con nuestro Models.Task

namespace ProjectManagerAPI.Controllers
{
    [ApiController] // Indica que este es un controlador de API.
    [Route("api/[controller]")] // Define la ruta base para este controlador: /api/projects
    [Authorize] // ¡SEGURIDAD! Este atributo protege todos los endpoints de este controlador.
                // Solo los usuarios autenticados (con un token JWT válido) podrán acceder.
    public class ProjectsController : ControllerBase
    {
        // Campo privado para guardar la instancia del DbContext, nuestro "puente" a la base de datos.
        private readonly ApplicationDbContext _context;

        // El constructor recibe el DbContext a través de inyección de dependencias.
        public ProjectsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // --- Endpoint para Crear un Nuevo Proyecto ---
        // Se activa con una petición POST a /api/projects
        [HttpPost]
        public async Task<IActionResult> CreateProject(ProjectCreateDto projectDto)
        {
            // 1. Obtener el ID del usuario que está haciendo la petición.
            // Lo leemos directamente desde el token JWT que el usuario envió.
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString))
            {
                // Si no podemos encontrar el ID en el token, es un problema de autorización.
                return Unauthorized("No se pudo identificar al usuario desde el token.");
            }
            var userId = int.Parse(userIdString);

            // 2. Crear una nueva instancia de nuestro modelo 'Project' con los datos del DTO.
            var project = new Project
            {
                Name = projectDto.Name,
                Description = projectDto.Description,
                OwnerId = userId // ¡CLAVE! Asociamos el nuevo proyecto al usuario autenticado. // <-- CORREGIDO
            };

            // 3. Añadir el nuevo proyecto al contexto de Entity Framework y guardar los cambios en la base de datos.
            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            // 4. Crear un DTO de respuesta para no devolver el modelo completo.
            var projectResponseDto = new ProjectDto
            {
                Id = project.Id,
                Name = project.Name,
                Description = project.Description
            };

            // 5. Devolver una respuesta HTTP 201 Created.
            // Es el estándar para una creación exitosa. Incluimos la ubicación del nuevo recurso y el recurso mismo.
            return CreatedAtAction(nameof(GetProjectById), new { id = project.Id }, projectResponseDto);
        }



        // --- Endpoint para Obtener un Proyecto Específico por su ID ---
        // Se activa con una petición GET a /api/projects/{id} (ej. /api/projects/5)
        [HttpGet("{id}")]
        public async Task<IActionResult> GetProjectById(int id)
        {
            // 1. Obtener el ID del usuario desde el token JWT para la validación de seguridad.
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString))
            {
                return Unauthorized();
            }
            var userId = int.Parse(userIdString);

            // 2. Buscar el proyecto en la base de datos.
            // Usamos 'FirstOrDefaultAsync' para encontrar el primer proyecto que cumpla AMBAS condiciones:
            // a) Que el 'Id' del proyecto coincida con el que se pidió en la URL.
            // b) ¡SEGURIDAD! Que el 'OwnerId' del proyecto coincida con el del usuario autenticado. // <-- CORREGIDO
            var project = await _context.Projects
                                        .FirstOrDefaultAsync(p => p.Id == id && p.OwnerId == userId); // <-- CORREGIDO

            // 3. Verificar si el proyecto se encontró.
            // Si 'project' es null, significa que o el proyecto no existe, o no le pertenece al usuario.
            // Por seguridad, devolvemos un 'NotFound' genérico para no dar pistas a posibles atacantes.
            if (project == null)
            {
                return NotFound("El proyecto no fue encontrado o no tienes permiso para verlo.");
            }

            // 4. Si se encontró, lo proyectamos a un DTO y lo devolvemos.
            var projectDto = new ProjectDto
            {
                Id = project.Id,
                Name = project.Name,
                Description = project.Description
            };

            return Ok(projectDto);
        }



        // --- Endpoint para Actualizar un Proyecto Existente ---
        // Se activa con una petición PUT a /api/projects/{id} (ej. /api/projects/5)
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProject(int id, ProjectCreateDto projectUpdateDto)
        {
            // 1. Obtener el ID del usuario desde el token JWT para la validación de seguridad.
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString))
            {
                return Unauthorized();
            }
            var userId = int.Parse(userIdString);

            // 2. Buscar el proyecto en la base de datos para asegurarnos de que existe y le pertenece al usuario.
            // Esta es la misma lógica de seguridad que usamos en GetProjectById.
            var project = await _context.Projects
                                        .FirstOrDefaultAsync(p => p.Id == id && p.OwnerId == userId); // <-- CORREGIDO

            // 3. Si no se encuentra el proyecto, devolvemos un error NotFound.
            if (project == null)
            {
                return NotFound("El proyecto no fue encontrado o no tienes permiso para modificarlo.");
            }

            // 4. Actualizar las propiedades del proyecto con los nuevos datos del DTO.
            project.Name = projectUpdateDto.Name;
            project.Description = projectUpdateDto.Description;

            // 5. Guardar los cambios en la base de datos.
            await _context.SaveChangesAsync();

            // 6. Devolver una respuesta HTTP 204 No Content.
            // Es el estándar para indicar que la actualización fue exitosa y no hay contenido que devolver.
            return NoContent();
        }


        // --- Endpoint para Eliminar un Proyecto Existente ---
        // Se activa con una petición DELETE a /api/projects/{id} (ej. /api/projects/5)
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProject(int id)
        {
            // 1. Obtener el ID del usuario desde el token JWT para la validación de seguridad.
            // Es el mismo mecanismo de seguridad que hemos usado en los otros endpoints.
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString))
            {
                return Unauthorized();
            }
            var userId = int.Parse(userIdString);

            // 2. Buscar el proyecto en la base de datos para asegurarnos de que existe Y le pertenece al usuario.
            var project = await _context.Projects
                                        .FirstOrDefaultAsync(p => p.Id == id && p.OwnerId == userId); // <-- CORREGIDO

            // 3. Si no se encuentra el proyecto (porque no existe o no es del usuario), devolvemos NotFound.
            // Es la misma lógica de seguridad que en los endpoints anteriores.
            if (project == null)
            {
                return NotFound("El proyecto no fue encontrado o no tienes permiso para eliminarlo.");
            }

            // 4. Si encontramos el proyecto, le decimos a Entity Framework que lo elimine.
            _context.Projects.Remove(project);

            // 5. Guardamos los cambios para que la eliminación se aplique en la base de datos.
            await _context.SaveChangesAsync();

            // 6. Devolver una respuesta HTTP 204 No Content, el estándar para una eliminación exitosa.
            return NoContent();
        }



        // --- Endpoint para Obtener los Proyectos del Usuario Autenticado ---
        // Se activa con una petición GET a /api/projects
        [HttpGet]
        public async Task<IActionResult> GetProjectsForUser()
        {
            // 1. Obtener el ID del usuario que está haciendo la petición desde su token JWT.
            // Esta es nuestra principal medida de seguridad para filtrar los datos.
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString))
            {
                // Si no hay token o no se puede leer el ID, no está autorizado.
                return Unauthorized("No se pudo identificar al usuario.");
            }
            var userId = int.Parse(userIdString);

            // 2. Consultar la base de datos.
            // Le pedimos a Entity Framework que nos dé los proyectos (`.Projects`)
            // pero FILTRANDO (`.Where`) solo aquellos donde el 'OwnerId' coincida con el del usuario autenticado. // <-- CORREGIDO
            var projects = await _context.Projects
                                        .Where(p => p.OwnerId == userId) // <-- CORREGIDO
                                        .Select(p => new ProjectDto // 3. Proyectar los resultados a nuestro DTO.
                                        {
                                            Id = p.Id,
                                            Name = p.Name,
                                            Description = p.Description
                                        })
                                        .ToListAsync(); // Convertimos el resultado en una lista.

            // 4. Devolver la lista de proyectos.
            // Si el usuario no tiene proyectos, esto devolverá una lista vacía, lo cual es correcto.
            return Ok(projects);
        }

        // Controllers/ProjectsController.cs

        // --- Endpoint para Crear una Nueva Tarea en un Proyecto Específico ---
        // Se activa con una petición POST a /api/projects/{projectId}/tasks
        [HttpPost("{projectId}/tasks")]
        public async Task<IActionResult> CreateTaskForProject(int projectId, TaskCreateDto taskDto)
        {
            // 1. Obtener el ID del usuario desde el token JWT.
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString))
            {
                return Unauthorized();
            }
            var userId = int.Parse(userIdString);

            // 2. Verificar que el proyecto existe Y le pertenece al usuario autenticado.
            // Esta es la capa de seguridad principal.
            var project = await _context.Projects
                                        .FirstOrDefaultAsync(p => p.Id == projectId && p.OwnerId == userId); // <-- CORREGIDO

            // Si no encontramos el proyecto, el usuario no tiene permiso para añadirle tareas.
            if (project == null)
            {
                return NotFound("El proyecto no fue encontrado o no tienes permiso sobre él.");
            }

            // 3. Crear la nueva instancia del modelo 'Task'.
            var newTask = new Models.Task // Usamos el namespace completo para evitar ambigüedad
            {
                Title = taskDto.Title,
                Description = taskDto.Description,
                Status = "Pendiente", // Todas las tareas nuevas empiezan en estado "Pendiente".
                ProjectId = projectId // Asociamos la tarea al proyecto verificado.
            };

            // 4. Añadir la nueva tarea y guardar los cambios.
            _context.Tasks.Add(newTask);
            await _context.SaveChangesAsync();

            // 5. Crear y devolver un DTO de respuesta.
            var taskResponseDto = new TaskDto
            {
                Id = newTask.Id,
                Title = newTask.Title,
                Description = newTask.Description,
                Status = newTask.Status,
                ProjectId = newTask.ProjectId
            };

            // Devolvemos una respuesta 201 Created.
            return StatusCode(201, taskResponseDto);
        }



        // --- Endpoint para Obtener Todas las Tareas de un Proyecto Específico ---
        // Se activa con una petición GET a /api/projects/{projectId}/tasks
        [HttpGet("{projectId}/tasks")]
        public async Task<IActionResult> GetTasksForProject(int projectId)
        {
            // 1. Obtener el ID del usuario desde el token JWT para la validación de seguridad.
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString))
            {
                return Unauthorized();
            }
            var userId = int.Parse(userIdString);

            // 2. Verificar que el proyecto existe Y le pertenece al usuario autenticado.
            // Esta es la capa de seguridad principal. Si no es dueño del proyecto, no puede ver sus tareas.
            var projectExists = await _context.Projects
                                              .AnyAsync(p => p.Id == projectId && p.OwnerId == userId); // <-- CORREGIDO

            if (!projectExists)
            {
                // Si el proyecto no existe o no es del usuario, devolvemos NotFound.
                return NotFound("El proyecto no fue encontrado o no tienes permiso sobre él.");
            }

            // 3. Si la verificación es exitosa, buscamos todas las tareas asociadas a ese proyecto.
            var tasks = await _context.Tasks
                                      .Where(t => t.ProjectId == projectId)
                                      .Select(t => new TaskDto // 4. Proyectamos los resultados a nuestro DTO.
                                      {
                                          Id = t.Id,
                                          Title = t.Title,
                                          Description = t.Description,
                                          Status = t.Status,
                                          ProjectId = t.ProjectId
                                      })
                                      .ToListAsync();

            // 5. Devolver la lista de tareas.
            // Si el proyecto no tiene tareas, se devolverá una lista vacía, lo cual es el comportamiento correcto.
            return Ok(tasks);
        }
    }
}