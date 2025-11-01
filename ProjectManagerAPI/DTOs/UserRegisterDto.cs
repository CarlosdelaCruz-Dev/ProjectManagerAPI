using System.ComponentModel.DataAnnotations;

namespace ProjectManagerAPI.DTOs
{
    public class UserRegisterDto
    {
        [Required]
        public string Name { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [MinLength(6)] // Exigimos una contraseña de al menos 6 caracteres
        public string Password { get; set; }
    }
}