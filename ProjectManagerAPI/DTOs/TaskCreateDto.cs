// DTOs/TaskCreateDto.cs

using System.ComponentModel.DataAnnotations;

namespace ProjectManagerAPI.DTOs
{
    /// <summary>
    /// DTO para recibir los datos al crear una nueva tarea.
    /// </summary>
    public class TaskCreateDto
    {
        [Required(ErrorMessage = "El título de la tarea es obligatorio.")]
        [StringLength(200)]
        public string Title { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }
    }
}