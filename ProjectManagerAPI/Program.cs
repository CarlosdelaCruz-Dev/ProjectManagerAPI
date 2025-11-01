using Microsoft.EntityFrameworkCore;
using ProjectManagerAPI.Data;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();

// 1. Obtenemos la cadena de conexión que escribimos en appsettings.json.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// 2. Registramos nuestro ApplicationDbContext y le decimos que use SQLite con esa cadena de conexión.
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(connectionString));

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
app.UseHttpsRedirection();

app.UseAuthentication(); // Primero te identificas
app.UseAuthorization();  // Luego vemos si tienes permisos

app.UseAuthorization();

app.MapControllers();

app.Run();
