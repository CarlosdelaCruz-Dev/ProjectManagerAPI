// DTOs/TaskStatusUpdateDto.cs

using System.ComponentModel.DataAnnotations;

namespace ProjectManagerAPI.DTOs
{
    /// <summary>
    /// DTO para recibir el nuevo estado de una tarea.
    /// Se usa para las operaciones de movimiento de tarjetas entre columnas.
    /// </summary>
    public class TaskStatusUpdateDto
    {
        [Required(ErrorMessage = "El estado es obligatorio.")]
        public string Status { get; set; }
    }
}