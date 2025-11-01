// DTOs/ProjectCreateDto.cs

using System.ComponentModel.DataAnnotations;

namespace ProjectManagerAPI.DTOs
{
    /// <summary>
    /// Data Transfer Object (DTO) para recibir los datos necesarios al crear un nuevo proyecto.
    /// Se usa para validar la entrada del cliente.
    /// </summary>
    public class ProjectCreateDto
    {
        [Required(ErrorMessage = "El nombre del proyecto es obligatorio.")]
        [StringLength(100, ErrorMessage = "El nombre no puede exceder los 100 caracteres.")]
        public string Name { get; set; }

        [StringLength(500, ErrorMessage = "La descripción no puede exceder los 500 caracteres.")]
        public string? Description { get; set; }
    }
}