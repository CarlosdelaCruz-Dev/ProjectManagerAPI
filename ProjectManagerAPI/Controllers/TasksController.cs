using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagerAPI.Data;
using ProjectManagerAPI.DTOs;
using System.Security.Claims;

namespace ProjectManagerAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // Define la ruta base: /api/tasks
    [Authorize] // ¡SEGURIDAD! Todo este controlador está protegido.
    public class TasksController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TasksController(ApplicationDbContext context)
        {
            _context = context;
        }

        // --- Endpoint para Actualizar una Tarea Existente ---
        // Se activa con una petición PUT a /api/tasks/{taskId} (ej. /api/tasks/10)
        [HttpPut("{taskId}")]
        public async Task<IActionResult> UpdateTask(int taskId, TaskUpdateDto taskUpdateDto)
        {
            // 1. Obtener el ID del usuario desde el token JWT.
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString))
            {
                return Unauthorized();
            }
            var userId = int.Parse(userIdString);

            // 2. Buscar la tarea en la base de datos.
            // ¡Paso clave de eficiencia y seguridad! Usamos '.Include(t => t.Project)'
            // para cargar la tarea Y su proyecto asociado en una sola consulta a la base de datos.
            var task = await _context.Tasks
                                        .Include(t => t.Project)
                                        .FirstOrDefaultAsync(t => t.Id == taskId);

            // 3. Verificación de seguridad.
            // a) ¿La tarea no existe?
            // b) ¿El dueño del proyecto asociado a la tarea NO es el usuario que hace la petición?
            // Si cualquiera de las dos es cierta, denegamos el acceso.

            // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
            if (task == null || task.Project.OwnerId != userId) // <-- Cambiado de UserId a OwnerId
            {
                // Devolvemos NotFound para no revelar la existencia de una tarea que no le pertenece.
                return NotFound("La tarea no fue encontrada o no tienes permiso para modificarla.");
            }

            // 4. Si la seguridad pasa, actualizamos los datos de la tarea.
            task.Title = taskUpdateDto.Title;
            task.Description = taskUpdateDto.Description;

            // 5. Guardamos los cambios en la base de datos.
            await _context.SaveChangesAsync();

            // 6. Devolvemos una respuesta 204 No Content, el estándar para una actualización exitosa.
            return NoContent();
        }



        // --- Endpoint para Actualizar PARCIALMENTE una Tarea (moverla de columna) ---
        // Se activa con una petición PATCH a /api/tasks/{taskId}/move
        [HttpPatch("{taskId}/move")]
        public async Task<IActionResult> MoveTask(int taskId, TaskStatusUpdateDto statusUpdateDto)
        {
            // 1. Obtener el ID del usuario desde el token JWT para la validación de seguridad.
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString))
            {
                return Unauthorized();
            }
            var userId = int.Parse(userIdString);

            // 2. Buscar la tarea en la base de datos, incluyendo su proyecto asociado para verificar la propiedad.
            // Es la misma lógica de seguridad que usamos en el endpoint de actualización (PUT).
            var task = await _context.Tasks
                                        .Include(t => t.Project)
                                        .FirstOrDefaultAsync(t => t.Id == taskId);

            // 3. Verificación de seguridad.
            // Si la tarea no existe o el dueño del proyecto no es el usuario autenticado, denegamos el acceso.

            // --- ¡AQUÍ ESTÁ LA SEGUNDA CORRECCIÓN! ---
            if (task == null || task.Project.OwnerId != userId) // <-- Cambiado de UserId a OwnerId
            {
                return NotFound("La tarea no fue encontrada o no tienes permiso para modificarla.");
            }

            // 4. Actualizamos ÚNICAMENTE la propiedad 'Status' de la tarea.
            task.Status = statusUpdateDto.Status;

            // 5. Guardamos los cambios en la base de datos.
            await _context.SaveChangesAsync();

            // 6. Devolvemos una respuesta 204 No Content, el estándar para una actualización exitosa.
            return NoContent();
        }


        [Authorize]
        [HttpDelete("{taskId}")]
        public async Task<IActionResult> DeleteTask(int taskId)
        {
            // 1. Obtener el ID del usuario autenticado desde el token JWT
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString))
            {
                // Esto no debería ocurrir si [Authorize] está funcionando
                return Unauthorized(new { Message = "No se pudo identificar al usuario." });
            }

            if (!int.TryParse(userIdString, out var userId))
            {
                return BadRequest(new { Message = "ID de usuario en formato inválido." });
            }

            // 2. Buscar la tarea EN LA BASE DE DATOS
            // Es crucial incluir el Proyecto para poder verificar la propiedad.
            var task = await _context.Tasks
                .Include(t => t.Project) // <-- Incluimos la entidad relacionada 'Project'
                .FirstOrDefaultAsync(t => t.Id == taskId);

            // 3. Validar si la tarea existe
            if (task == null)
            {
                // Usamos 404 Not Found si el recurso no existe
                return NotFound(new { Message = "Tarea no encontrada." });
            }

            // 4. VERIFICACIÓN DE SEGURIDAD (Cero Confianza)
            // Verificamos si el ID del usuario (del token) coincide con el OwnerId
            // del proyecto al que pertenece la tarea.
            if (task.Project.OwnerId != userId) // <-- Este ya estaba correcto.
            {
                // 403 Forbidden: El usuario está autenticado, pero NO tiene permiso
                // para acceder o modificar este recurso específico.
                return Forbid();
            }

            // 5. Ejecutar la eliminación
            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();

            // 6. Retornar éxito
            // 204 No Content es la respuesta estándar y correcta para
            // una operación DELETE exitosa. No devuelve cuerpo.
            return NoContent();
        }
    }
}