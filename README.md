# Buscador de Contactos - Symfony 7.4

Aplicación de búsqueda y gestión de contactos municipales construida con **Symfony 7.4** + **Doctrine ORM**.

## Características

✅ **Búsqueda multi-palabra** - Busca simultáneamente en varios campos
✅ **CRUD completo** - Crear, leer, actualizar y eliminar contactos
✅ **Importación CSV** - Con detección automática de encoding y delimitadores
✅ **Exportación CSV** - Descarga todos los contactos como CSV
✅ **Exportación PDF** - Genera tablas en PDF con jsPDF
✅ **Validación centralizada** - Reglas consistentes con Symfony Validator
✅ **API REST** - Endpoints JSON para integración fácil
✅ **Interfaz responsiva** - Frontend HTML5 + JavaScript vanilla

## Requisitos

- PHP 8.2+
- MySQL 5.7+ / MariaDB
- Composer
- Node.js (opcional, para assets)

## Instalación

### 1. Clonar y navegar
```bash
cd buscador-symfony
```

### 2. Instalar dependencias
```bash
composer install
```

### 3. Configurar .env
```bash
cp .env .env.local  # opcional si no existe
```

Editar `.env` y ajustar:
```env
DATABASE_URL="mysql://root:password@127.0.0.1:3306/bbdd_telefonia?serverVersion=5.7&charset=utf8mb4"
```

### 4. Ejecutar migraciones
```bash
php bin/console doctrine:migrations:migrate
```

### 5. Iniciar servidor
```bash
# Opción 1: Servidor simple
php -S localhost:8888 -t public

# Opción 2: Symfony CLI
symfony serve
```

### 6. Abrir en navegador
```
http://localhost:8888/index.html
```

## API Endpoints

### Búsqueda
```bash
GET /api/contactos?q=busqueda
```
Retorna array de contactos coincidentes.

### Crear
```bash
POST /api/contactos
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "departamento": "IT",
  "extension": "1234",
  "email": "juan@example.com"
}
```

### Actualizar
```bash
PUT /api/contactos/123
Content-Type: application/json

{
  "nombre": "Juan Updated",
  "departamento": "IT Updated",
  "extension": "5678",
  "email": "juan@updated.com"
}
```

### Eliminar Uno
```bash
DELETE /api/contactos/123
```

### Eliminar Todos
```bash
DELETE /api/contactos/batch/todos
```

### Importar CSV
```bash
POST /api/contactos/importar
Content-Type: multipart/form-data

[Form Data]
archivo_csv: <archivo.csv>
```

**Formato CSV esperado:**
```csv
nombre,departamento,extension,email
Juan Pérez,IT,1234,juan@example.com
Maria González,RRHH,5678,maria@example.com
```

## Estructura del Proyecto

```
src/
├── Controller/
│   └── ContactoController.php    # REST API endpoints
├── Entity/
│   └── Contacto.php              # Doctrine entity con validaciones
├── Repository/
│   └── ContactoRepository.php    # Métodos de búsqueda avanzada
├── Service/
│   ├── ContactoService.php       # Lógica de negocio
│   └── CsvImportService.php      # Importación de CSV

public/
├── index.html                    # Interfaz de usuario
├── script.js                     # Lógica del frontend
└── styles.css                    # Estilos CSS

migrations/                       # Migraciones de BD
```

## Validaciones

### Campo: Nombre
- Obligatorio
- Máximo 150 caracteres

### Campo: Departamento
- Obligatorio
- Máximo 150 caracteres

### Campo: Email
- Opcional
- Debe ser formato válido de email

### Campo: Extensión
- Obligatorio en creación
- Máximo 15 caracteres
- Solo números

### Duplicados
Se previene crear contactos con: mismo nombre + departamento + extensión

## Mejoras sobre Versión Anterior

| Feature | Antes | Ahora |
|---------|-------|-------|
| Framework | - | Symfony 7.4 |
| ORM | SQL manual | Doctrine |
| Validación | Ad-hoc | Centralizada |
| Seguridad | Manual | Automática |
| Testing | - | Fácil |
| Escalabilidad | Limitada | Excelente |

## Desarrollo

### Ejecutar tests
```bash
php bin/phpunit
```

### Crear nueva migración
```bash
php bin/console doctrine:migrations:diff
php bin/console doctrine:migrations:migrate
```

### Limpiar caché
```bash
php bin/console cache:clear
```

## Troubleshooting

### Error de conexión a BD
- Verificar credenciales en `.env`
- Asegurar que MySQL está corriendo
- Verificar que la base de datos existe

### Assets no cargan (JS/CSS)
```bash
php bin/console assets:install public
```

### Errores de validación
- Revisar `src/Entity/Contacto.php` para las reglas
- Los mensajes se retornan en JSON con el campo específico

## Notas

- Las búsquedas usan lógica AND entre palabras
- El CSV import detecta automáticamente delimitadores (coma o punto y coma)
- Se limpia encoding ISO-8859-1 a UTF-8 automáticamente
- Los contactos duplicados se saltan sin error durante importación

## Licencia

MIT

## Contacto

Para soporte o preguntas sobre la migración a Symfony, consulta `MIGRATION_COMPLETE.md`.
