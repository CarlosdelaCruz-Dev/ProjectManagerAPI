// DTOs/TaskUpdateDto.cs

using System.ComponentModel.DataAnnotations;

namespace ProjectManagerAPI.DTOs
{
    /// <summary>
    /// DTO para recibir los datos al actualizar una tarea existente.
    /// </summary>
    public class TaskUpdateDto
    {
        [Required(ErrorMessage = "El título de la tarea es obligatorio.")]
        [StringLength(200)]
        public string Title { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }
    }
}