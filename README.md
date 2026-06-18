# Buscador de contactos - Symfony 7.4

Aplicación de búsqueda y gestión de contactos municipales construida con **Symfony 7.4** y **Doctrine ORM**.

## Características

- **Búsqueda multi-palabra:** Busca simultáneamente en varios campos aplicando lógica AND.
- **CRUD completo:** Crear, leer, actualizar y eliminar contactos.
- **Importación CSV:** Con detección automática de encoding (limpieza de ISO-8859-1 a UTF-8) y delimitadores (coma o punto y coma).
- **Exportación CSV:** Descarga todos los contactos en formato CSV.
- **Exportación PDF:** Genera tablas en PDF utilizando jsPDF.
- **Validación centralizada:** Reglas consistentes implementadas con Symfony Validator.
- **API REST:** Endpoints JSON para una integración sencilla.
- **Interfaz responsiva:** Frontend construido con HTML5 y JavaScript.

## Requisitos

- PHP 8.2+
- MySQL 5.7+ / MariaDB
- Composer
- Node.js (opcional, para gestión de assets si fuera necesario)

## Instalación

### 1. Clonar el repositorio y acceder al directorio
```bash
git clone <URL_DEL_REPOSITORIO> buscador-symfony
cd buscador-symfony
```

### 2. Instalar dependencias
```bash
composer install
```

### 3. Configurar variables de entorno
Crea tu archivo de configuración local:
```bash
cp .env .env.local
```

Edita `.env.local` y ajusta las credenciales de tu base de datos:
```env
DATABASE_URL="mysql://usuario:contraseña@127.0.0.1:3306/bbdd_telefonia?serverVersion=5.7&charset=utf8mb4"
```

### 4. Crear base de datos y ejecutar migraciones
```bash
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
```

### 5. Iniciar el servidor
Tienes dos opciones para levantar el entorno local:
```bash
# Opción 1: Servidor interno de PHP
php -S localhost:8080 -t public

# Opción 2: Symfony CLI (recomendado)
symfony server:start
```

### 6. Acceder a la aplicación
Abre tu navegador web e ingresa a:
```text
http://127.0.0.1:8000
```

## API endpoints

### Búsqueda
```http
GET /api/contactos?q=busqueda
```
*Retorna un array JSON con los contactos coincidentes.*

### Crear contacto
```http
POST /api/contactos
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "departamento": "IT",
  "extension": "1234",
  "email": "juan@example.com"
}
```

### Actualizar contacto
```http
PUT /api/contactos/123
Content-Type: application/json

{
  "nombre": "Juan Updated",
  "departamento": "IT Updated",
  "extension": "5678",
  "email": "juan@updated.com"
}
```

### Eliminar un contacto
```http
DELETE /api/contactos/123
```

### Eliminar todos los contactos
```http
DELETE /api/contactos/batch/todos
```

### Importar CSV
```http
POST /api/contactos/importar
Content-Type: multipart/form-data
```
**Form Data esperado:** `archivo_csv: <archivo.csv>`

**Formato CSV esperado:**
```csv
nombre,departamento,extension,email
Juan Pérez,IT,1234,juan@example.com
Maria González,RRHH,5678,maria@example.com
```

## Estructura del proyecto

```text
src/
├── Controller/
│   └── ContactoController.php    # Endpoints de la API REST
├── Entity/
│   └── Contacto.php              # Entidad Doctrine con reglas de validación
├── Repository/
│   └── ContactoRepository.php    # Métodos de búsqueda avanzada en base de datos
├── Service/
│   ├── ContactoService.php       # Lógica de negocio principal
│   └── CsvImportService.php      # Lógica de procesamiento de archivos CSV
│
public/
  ├── index.html                    # Interfaz de usuario (Punto de entrada)
  ├── script.js                     # Lógica del frontend (Llamada API, DOM)
  └── styles.css                    # Estilos visuales
```

## Validaciones

Las validaciones se manejan desde `src/Entity/Contacto.php`. Si fallan, la API retorna los mensajes de error en formato JSON indicando el campo problemático.

- **Nombre:** Obligatorio | Máximo 150 caracteres.
- **Departamento:** Obligatorio | Máximo 150 caracteres.
- **Extensión:** Obligatorio en creación | Máximo 13 caracteres | Solo admite números.
- **Email:** Opcional | Debe tener un formato de correo válido.
- **Prevención de duplicados:** No se pueden crear contactos con la misma combinación exacta de *Nombre, departamento y extensión*. Durante la importación de CSV, los duplicados se omiten automáticamente sin interrumpir el proceso.

## Mejoras sobre la versión anterior

| Característica | Versión Anterior | Versión Actual (Symfony) |
|----------------|------------------|--------------------------|
| **Framework** | - (PHP Puro)     | Symfony 7.4              |
| **ORM** | Consultas SQL manuales | Doctrine ORM       |
| **Validación** | Scripts Ad-hoc   | Centralizada (Validator) |
| **Seguridad** | Manual           | Automática (Escapado, inyecciones) |
| **Testing** | Inexistente      | Fácil de implementar (PHPUnit) |
| **Escalabilidad** | Limitada      | Alta                     |

## Desarrollo y mantenimiento

### Ejecutar tests
```bash
php bin/phpunit
```

### Crear y aplicar una nueva migración
```bash
php bin/console doctrine:migrations:diff
php bin/console doctrine:migrations:migrate
```

### Limpiar caché
```bash
php bin/console cache:clear
```

## Troubleshooting (solución de problemas)

**Error de conexión a la base de datos:**
- Verifica las credenciales en `.env.local`.
- Asegúrate de que el servicio de MySQL/MariaDB esté en ejecución.
- Comprueba que ejecutaste `php bin/console doctrine:database:create`.

**Los Assets (JS/CSS) no cargan:**
- Ejecuta el siguiente comando para reinstalar los assets públicos:
  ```bash
  php bin/console assets:install public
```