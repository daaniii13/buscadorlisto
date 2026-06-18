<?php
namespace App\Controller;
use App\Service\ContactoService;
use App\Service\CsvImportService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class ContactoController extends AbstractController {
    /**
     * GET / - Redirige a index.html
     */
    #[Route('/', name: 'root', methods: ['GET'])]
    public function root(): RedirectResponse {
        return $this->redirect('/index.html');
    }

    /**
     * GET /api/contactos - Busca contactos (parámetro opcional: q=búsqueda)
     */
    #[Route('/api/contactos', name: 'index', methods: ['GET'])]
    public function index(Request $request, ContactoService $service): JsonResponse {
        try {
            $q = $request->query->get('q', '');
            $contactos = $service->buscar($q);

            return $this->json($contactos);
        } catch (\Exception $e) {
            return $this->json([
                'error' => 'Error en la búsqueda: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/contactos - Crea un nuevo contacto
     */
    #[Route('/api/contactos', name: 'create', methods: ['POST'])]
    #[IsGranted('ROLE_ELEVATED')]
    public function crear(Request $request, ContactoService $service): JsonResponse {
        try {
            $datos = json_decode($request->getContent(), true);

            if (!is_array($datos)) {
                return $this->json([
                    'ok' => false,
                    'error' => 'JSON inválido',
                ], 400);
            }

            // Validar campos requeridos (ahora sí, extensión obligatoria de nuevo)
            if (empty($datos['nombre']) || empty($datos['departamento']) || empty($datos['extension'])) {
                return $this->json([
                    'ok' => false,
                    'error' => 'Los campos nombre, departamento y extensión son obligatorios',
                ], 400);
            }

            $contacto = $service->crear($datos);

            return $this->json([
                'ok' => true,
                'mensaje' => 'Contacto guardado correctamente',
                'data' => $this->serializeContacto($contacto),
            ]);
        } catch (\InvalidArgumentException $e) {
            $validaciones = ContactoService::formatValidationErrors($e);
            if (!empty($validaciones)) {
                return $this->json([
                    'ok' => false,
                    'error' => 'Validación fallida',
                    'validaciones' => $validaciones,
                ], 400);
            }

            return $this->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            return $this->json([
                'ok' => false,
                'error' => 'Error al guardar: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/contactos/{id} - Actualiza un contacto existente
     */
    #[Route('/api/contactos/{id}', name: 'update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_ELEVATED')]
    public function actualizar(int $id, Request $request, ContactoService $service): JsonResponse {
        try {
            $datos = json_decode($request->getContent(), true);

            if (!is_array($datos)) {
                return $this->json([
                    'ok' => false,
                    'error' => 'JSON inválido',
                ], 400);
            }

            $contacto = $service->actualizar($id, $datos);

            return $this->json([
                'ok' => true,
                'mensaje' => 'Contacto actualizado correctamente',
                'data' => $this->serializeContacto($contacto),
            ]);
        } catch (\InvalidArgumentException $e) {
            $validaciones = ContactoService::formatValidationErrors($e);
            if (!empty($validaciones)) {
                return $this->json([
                    'ok' => false,
                    'error' => 'Validación fallida',
                    'validaciones' => $validaciones,
                ], 400);
            }

            return $this->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], 404);
        } catch (\Exception $e) {
            return $this->json([
                'ok' => false,
                'error' => 'Error al actualizar: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/contactos/{id} - Elimina un contacto
     */
    #[Route('/api/contactos/{id}', name: 'delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_ELEVATED')]
    public function eliminar(int $id, ContactoService $service): JsonResponse {
        try {
            $service->eliminar($id);

            return $this->json([
                'ok' => true,
                'mensaje' => 'Contacto eliminado correctamente',
            ]);
        } catch (\InvalidArgumentException $e) {
            return $this->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], 404);
        } catch (\Exception $e) {
            return $this->json([
                'ok' => false,
                'error' => 'Error al eliminar: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/contactos/batch/todos - Elimina todos los contactos
     */
    #[Route('/api/contactos/batch/todos', name: 'delete_all', methods: ['DELETE'])]
    #[IsGranted('ROLE_ELEVATED')]
    public function eliminarTodos(ContactoService $service): JsonResponse {
        try {
            $cantidad = $service->eliminarTodos();

            return $this->json([
                'ok' => true,
                'mensaje' => 'Todos los contactos eliminados',
                'cantidad' => $cantidad,
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'ok' => false,
                'error' => 'Error al eliminar: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/contactos/importar - Importa contactos desde CSV
     */
    #[Route('/api/contactos/importar', name: 'import', methods: ['POST'])]
    #[IsGranted('ROLE_ELEVATED')]
    public function importar(Request $request, CsvImportService $service): JsonResponse {
        try {
            $archivo = $request->files->get('archivo_csv');

            if (!$archivo) {
                return $this->json([
                    'ok' => false,
                    'error' => 'No se proporcionó archivo CSV',
                ], 400);
            }

            $stats = $service->importar($archivo);

            $mensaje = sprintf(
                'Importación completada: %d nuevo(s) contacto(s). Se omitieron registros duplicados. Se detectaron %d filas con errores de formato.',
                $stats['importados'],
                $stats['errores']
            );

            return $this->json([
                'ok' => true,
                'importados' => $stats['importados'],
                'errores' => $stats['errores'],
                'duplicados' => $stats['duplicados'],
                'mensaje' => $mensaje,
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'ok' => false,
                'error' => 'Error en la importación: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function serializeContacto($contacto): array {
        return [
            'id' => $contacto->getId(),
            'nombre' => $contacto->getNombre(),
            'departamento' => $contacto->getDepartamento(),
            'email' => $contacto->getEmail(),
            'extension' => $contacto->getExtension(),
        ];
    }
}