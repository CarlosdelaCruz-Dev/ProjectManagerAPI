using System.ComponentModel.DataAnnotations;

namespace ProjectManagerAPI.Models
{
    public class Task
    {
        public int Id { get; set; }

        [Required]
        public string Title { get; set; }

        public string? Description { get; set; }

        public string Status { get; set; } // Aquí guardaremos el estado (ej. "Pendiente", "En Progreso", "Hecho")

        // --- Relación con Project ---
        public int ProjectId { get; set; } // Clave foránea que nos dice a qué proyecto pertenece esta tarea
        public Project Project { get; set; } // Propiedad de navegación para acceder a la información del proyecto
    }
}