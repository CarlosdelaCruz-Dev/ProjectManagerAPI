// DTOs/ProjectDto.cs

namespace ProjectManagerAPI.DTOs
{
    /// <summary>
    /// DTO para devolver información segura y concisa de un proyecto al cliente.
    /// Evita exponer el modelo completo de la base de datos.
    /// </summary>
    public class ProjectDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
    }
}