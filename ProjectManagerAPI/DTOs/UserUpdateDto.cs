using System.ComponentModel.DataAnnotations;

namespace ProjectManagerAPI.DTOs
{
    // Este objeto define los campos que un usuario puede actualizar de su perfil.
    public class UserUpdateDto
    {
        [Required(ErrorMessage = "El nombre es obligatorio.")]
        public string Name { get; set; }
    }
}