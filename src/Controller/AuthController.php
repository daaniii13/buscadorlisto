<?php

namespace App\Controller;

use App\Entity\User;
use App\Service\UserService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class AuthController extends AbstractController
{
    /**
     * POST /api/auth/login - Autentica un usuario
     */
    #[Route('/api/auth/login', name: 'api_auth_login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        $user = $this->getUser();

        if (!$user) {
            return $this->json([
                'ok' => false,
                'error' => 'Credenciales inválidas',
            ], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'ok' => true,
            'usuario' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'nombre' => $user->getNombre(),
                'roles' => $user->getRoles(),
            ],
        ]);
    }

    /**
     * GET /api/auth/check - Verifica si hay usuario logueado
     */
    #[Route('/api/auth/check', name: 'api_auth_check', methods: ['GET'])]
    public function check(): JsonResponse
    {
        $user = $this->getUser();

        if (!$user) {
            return $this->json([
                'logueado' => false,
                'usuario' => null,
            ]);
        }

        return $this->json([
            'logueado' => true,
            'usuario' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'nombre' => $user->getNombre(),
                'roles' => $user->getRoles(),
            ],
        ]);
    }

    /**
     * GET /api/auth/logout - Destruye la sesión
     */
    #[Route('/api/auth/logout', name: 'api_auth_logout', methods: ['GET'])]
    public function logout(): JsonResponse
    {
        return $this->json([
            'ok' => true,
            'mensaje' => 'Sesión cerrada correctamente',
        ]);
    }

    /**
     * GET /api/users - Lista todos los usuarios (solo ADMIN)
     */
    #[Route('/api/users', name: 'api_users_list', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function listarUsuarios(UserService $userService): JsonResponse
    {
        try {
            $usuarios = $userService->listarUsuarios();
            $datos = array_map(fn(User $u) => $this->serializarUsuario($u), $usuarios);

            return $this->json([
                'ok' => true,
                'usuarios' => $datos,
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'ok' => false,
                'error' => 'Error al listar usuarios: ' . $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * POST /api/users - Crea un nuevo usuario (solo ADMIN)
     * Body JSON: { "email": "...", "password": "...", "roles": ["ROLE_ELEVATED"] }
     */
    #[Route('/api/users', name: 'api_users_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function crearUsuario(Request $request, UserService $userService): JsonResponse
    {
        try {
            $datos = json_decode($request->getContent(), true);

            if (!is_array($datos)) {
                return $this->json([
                    'ok' => false,
                    'error' => 'JSON inválido',
                ], Response::HTTP_BAD_REQUEST);
            }

            if (empty($datos['email']) || empty($datos['password'])) {
                return $this->json([
                    'ok' => false,
                    'error' => 'Email y contraseña son obligatorios',
                ], Response::HTTP_BAD_REQUEST);
            }

            $roles = $datos['roles'] ?? ['ROLE_ELEVATED'];
            $usuario = $userService->crearUsuario($datos['email'], $datos['password'], $roles);

            return $this->json([
                'ok' => true,
                'mensaje' => 'Usuario creado correctamente',
                'usuario' => $this->serializarUsuario($usuario),
            ], Response::HTTP_CREATED);
        } catch (\InvalidArgumentException $e) {
            return $this->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        } catch (\Exception $e) {
            return $this->json([
                'ok' => false,
                'error' => 'Error al crear usuario: ' . $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * PUT /api/users/{id} - Actualiza rol de un usuario (solo ADMIN)
     * Body JSON: { "roles": ["ROLE_ELEVATED"] }
     */
    #[Route('/api/users/{id}', name: 'api_users_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_ADMIN')]
    public function actualizarUsuario(int $id, Request $request, UserService $userService): JsonResponse
    {
        try {
            $datos = json_decode($request->getContent(), true);

            if (!is_array($datos) || empty($datos['roles'])) {
                return $this->json([
                    'ok' => false,
                    'error' => 'Roles es obligatorio',
                ], Response::HTTP_BAD_REQUEST);
            }

            $usuario = $this->getDoctrine()->getRepository(User::class)->find($id);
            if (!$usuario) {
                return $this->json([
                    'ok' => false,
                    'error' => 'Usuario no encontrado',
                ], Response::HTTP_NOT_FOUND);
            }

            $userService->cambiarRol($usuario, $datos['roles']);

            return $this->json([
                'ok' => true,
                'mensaje' => 'Usuario actualizado correctamente',
                'usuario' => $this->serializarUsuario($usuario),
            ]);
        } catch (\InvalidArgumentException $e) {
            return $this->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        } catch (\Exception $e) {
            return $this->json([
                'ok' => false,
                'error' => 'Error al actualizar usuario: ' . $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * DELETE /api/users/{id} - Elimina un usuario (solo ADMIN)
     */
    #[Route('/api/users/{id}', name: 'api_users_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_ADMIN')]
    public function eliminarUsuario(int $id, UserService $userService): JsonResponse
    {
        try {
            $userService->eliminarUsuario($id);

            return $this->json([
                'ok' => true,
                'mensaje' => 'Usuario eliminado correctamente',
            ]);
        } catch (\InvalidArgumentException $e) {
            return $this->json([
                'ok' => false,
                'error' => $e->getMessage(),
            ], Response::HTTP_NOT_FOUND);
        } catch (\Exception $e) {
            return $this->json([
                'ok' => false,
                'error' => 'Error al eliminar usuario: ' . $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Serializa un usuario para JSON.
     */
    private function serializarUsuario(User $usuario): array
    {
        return [
            'id' => $usuario->getId(),
            'email' => $usuario->getEmail(),
            'nombre' => $usuario->getNombre(),
            'roles' => $usuario->getRoles(),
            'activo' => $usuario->isActivo(),
            'createdAt' => $usuario->getCreatedAt()->format('Y-m-d H:i:s'),
        ];
    }
}
