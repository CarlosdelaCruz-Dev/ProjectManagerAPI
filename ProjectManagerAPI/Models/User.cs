using System.ComponentModel.DataAnnotations; // Necesario para las validaciones como [Required]

namespace ProjectManagerAPI.Models
{
    public class User
    {
        public int Id { get; set; } // Identificador único para cada usuario

        [Required] // Indica que este campo es obligatorio
        public string Name { get; set; }

        [Required]
        [EmailAddress] // Valida que el texto tenga formato de correo electrónico
        public string Email { get; set; }

        [Required]
        public string PasswordHash { get; set; } // ¡Importante! Nunca guardamos la contraseña real, solo una versión encriptada (hash) 🔐

        // Propiedad de navegación: Un usuario puede tener una colección (lista) de proyectos.
        // Esto le dice a Entity Framework que un usuario está relacionado con muchos proyectos.
        public virtual ICollection<Project> Projects { get; set; } = new List<Project>();
    }
}