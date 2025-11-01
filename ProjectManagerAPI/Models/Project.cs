using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectManagerAPI.Models
{
    public class Project
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty; // Buena práctica: inicializar

        public string? Description { get; set; }

        // --- ¡AQUÍ ESTÁ LA SOLUCIÓN! ---
        // 1. La Foreign Key (FK) que apunta a la tabla Users
        [Required]
        public int OwnerId { get; set; }

        // 2. La "Propiedad de Navegación" que EF Core usa
        //    para cargar la entidad User completa si la pedimos.
        [ForeignKey("OwnerId")]
        public virtual User Owner { get; set; } = null!; // El '!' es para decirle a C# que confiamos que no será nulo
        // --- FIN DE LA SOLUCIÓN ---

        // Esta relación con Tareas ya debería existir
        public virtual ICollection<Task> Tasks { get; set; } = new List<Task>();
    }
}