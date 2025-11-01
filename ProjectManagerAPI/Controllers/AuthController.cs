using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectManagerAPI.Data;
using ProjectManagerAPI.DTOs;
using ProjectManagerAPI.Models;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace ProjectManagerAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // La ruta para acceder a este controlador será /api/auth
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config; // Añadimos el campo para la configuración

        public AuthController(ApplicationDbContext context, IConfiguration config) // Modificamos el constructor
        {
            _context = context;
            _config = config; // Guardamos la configuración
        }

        // POST: api/auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register(UserRegisterDto userDto)
        {
            // Verificamos si el correo ya está en uso
            if (await _context.Users.AnyAsync(u => u.Email == userDto.Email))
            {
                return BadRequest("El correo electrónico ya está en uso.");
            }

            // ¡SEGURIDAD! Encriptamos la contraseña antes de guardarla.
            // Usamos BCrypt, una librería estándar y muy segura.
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(userDto.Password);

            var user = new User
            {
                Name = userDto.Name,
                Email = userDto.Email,
                PasswordHash = passwordHash
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Usuario registrado exitosamente." });
        }

        // POST: api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login(UserLoginDto loginDto)
        {
            // 1. Buscamos al usuario por su correo electrónico.
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == loginDto.Email);

            // 2. Si no existe o la contraseña no coincide, devolvemos un error.
            // Usamos BCrypt para comparar la contraseña del DTO con el hash guardado.
            if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
            {
                return Unauthorized("Credenciales inválidas."); // ¡Error genérico por seguridad!
            }

            // 3. Si las credenciales son válidas, generamos el token JWT.
            var token = GenerateJwtToken(user);

            return Ok(new { token = token }); // Devolvemos el token al cliente.
        }

        private string GenerateJwtToken(User user)
        {
            // El "cerebro" del token: la información que queremos guardar (claims).
            var claims = new List<Claim>
    {
        new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()), // 'Subject' - El ID del usuario
        new Claim(JwtRegisteredClaimNames.Email, user.Email),
        new Claim(JwtRegisteredClaimNames.Name, user.Name),
        new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()) // Un ID único para este token
    };

            // Obtenemos la clave secreta desde la configuración (secrets.json)
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Creamos el token con todos sus componentes.
            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(1), // El token será válido por 1 hora
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}