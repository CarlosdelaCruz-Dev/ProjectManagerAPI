namespace ProjectManagerAPI.DTOs
{
    // Este objeto define la información segura que devolveremos sobre un usuario.
    public class UserProfileDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
    }
}