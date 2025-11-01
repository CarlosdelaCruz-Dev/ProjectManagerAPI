// DTOs/TaskDto.cs

namespace ProjectManagerAPI.DTOs
{
    /// <summary>
    /// DTO para devolver la información de una tarea al cliente.
    /// </summary>
    public class TaskDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; }
        public int ProjectId { get; set; }
    }
}