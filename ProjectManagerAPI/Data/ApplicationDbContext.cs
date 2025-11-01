using Microsoft.EntityFrameworkCore;
using ProjectManagerAPI.Models; // Asegúrate de importar tus modelos
using Task = ProjectManagerAPI.Models.Task;

namespace ProjectManagerAPI.Data
{
    // Heredamos de DbContext para obtener toda la funcionalidad de Entity Framework.
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        // Le decimos a Entity Framework que queremos tablas para cada uno de nuestros modelos.
        // El nombre de la propiedad (ej. Users) será el nombre de la tabla en la base de datos.
        public DbSet<User> Users { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<Task> Tasks { get; set; }
    }
}