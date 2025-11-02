using Microsoft.EntityFrameworkCore;
using ProjectManagerAPI.Data;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// --- INICIO DE NUESTRA CONFIGURACIÓN DE CORS ---
// 1. Definimos un nombre para nuestra política de CORS
var myAllowSpecificOrigins = "_myAllowSpecificOrigins";

// 2. Añadimos el servicio de CORS al contenedor
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: myAllowSpecificOrigins,
        policy =>
        {
            // 3. ¡LA PARTE MÁS IMPORTANTE!
            //    Le decimos a la API que confíe en la URL exacta de tu frontend
            policy.WithOrigins("https://localhost:44303")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});
// --- FIN DE NUESTRA CONFIGURACIÓN DE CORS ---


// Add services to the container.
builder.Services.AddControllers();

// 1. Obtenemos la cadena de conexión que escribimos en appsettings.json.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// 2. Registramos nuestro ApplicationDbContext y le decimos que use SQLite con esa cadena de conexión.
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(connectionString));

// --- Tu código de Autenticación (¡está perfecto!) ---
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
        };
    });

var app = builder.Build();

// Configure the HTTP request pipeline.

 app.UseHttpsRedirection();

// --- ¡AQUÍ APLICAMOS LA POLÍTICA DE CORS! ---
// 4. Le decimos a la aplicación que "Use" (aplique) la política de CORS.
//    Debe ir ANTES de UseAuthentication y UseAuthorization.
app.UseCors(myAllowSpecificOrigins);

app.UseAuthentication(); // Primero te identificas
app.UseAuthorization();  // Luego vemos si tienes permisos

// (Había una línea duplicada aquí, la limpié)
// app.UseAuthorization(); <-- Esta estaba duplicada

app.MapControllers();

app.Run();