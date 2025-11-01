using Microsoft.AspNetCore.Authorization; // Necesario para [Authorize]
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagerAPI.Data;
using ProjectManagerAPI.DTOs;
using System.Security.Claims; // Necesario para leer los claims del token

namespace ProjectManagerAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // ¡LA CLAVE DE LA SEGURIDAD! Este atributo protege TODO el controlador.
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/users/me
        [HttpGet("me")]
        public async Task<IActionResult> GetMyProfile()
        {
            // 1. Leemos el ID del usuario directamente desde su "tarjeta de identificación" (el token JWT).
            // El sistema de autenticación de ASP.NET Core lo hace disponible automáticamente.
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(userIdString))
            {
                return Unauthorized(); // Si por alguna razón no se encuentra el ID en el token.
            }

            var userId = int.Parse(userIdString);

            // 2. Buscamos al usuario en la base de datos.
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
            {
                return NotFound("Usuario no encontrado.");
            }

            // 3. Creamos un DTO con la información segura y lo devolvemos.
            var userProfile = new UserProfileDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email
            };

            return Ok(userProfile);
        }


        // PUT: api/users/me
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMyProfile(UserUpdateDto userUpdateDto)
        {
            // 1. Obtenemos el ID del usuario desde su token, igual que antes.
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString))
            {
                return Unauthorized();
            }
            var userId = int.Parse(userIdString);

            // 2. Buscamos al usuario en la base de datos.
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound("Usuario no encontrado.");
            }

            // 3. Actualizamos la propiedad 'Name' con el valor del DTO.
            user.Name = userUpdateDto.Name;

            // 4. Guardamos los cambios en la base de datos.
            await _context.SaveChangesAsync();

            // Devolvemos una respuesta 204 No Content, que es el estándar para una actualización exitosa.
            return NoContent();
        }
    }
}