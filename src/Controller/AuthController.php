<?php
namespace App\Controller;
use App\Entity\User;
use App\Service\UserService;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

class AuthController extends AbstractController {
    /**
     * POST /api/auth/login - Autentica un usuario
     */
    #[Route('/api/auth/login', name: 'api_auth_login', methods: ['POST'])]
    public function login(
        Request $request, 
        ManagerRegistry $doctrine, 
        UserPasswordHasherInterface $hasher, 
        TokenStorageInterface $tokenStorage
    ): JsonResponse {
        $datos = json_decode($request->getContent(), true);
        $email = $datos['email'] ?? null;
        $password = $datos['password'] ?? null;

        // Busca al usuario en la base de datos
        $user = $doctrine->getRepository(User::class)->findOneBy(['email' => $email]);

        // Valida si existe y si la contraseña es correcta
        if (!$user || !$hasher->isPasswordValid($user, $password)) {
            return $this->json([
                'ok' => false,
                'error' => 'Credenciales inválidas',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Crea la sesión manualmente para que $this->getUser() funcione en otros métodos
        $token = new UsernamePasswordToken($user, 'main', $user->getRoles());
        $tokenStorage->setToken($token);
        $request->getSession()->set('_security_main', serialize($token));

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
    public function check(): JsonResponse {
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
    public function logout(Request $request): JsonResponse {
        $request->getSession()->invalidate();
        return $this->json([
            'ok' => true,
            'mensaje' => 'Sesión cerrada correctamente',
        ]);
    }

    /**
     * GET /api/users - Lista todos los usuarios
     */
    #[Route('/api/users', name: 'api_users_list', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function listarUsuarios(UserService $userService): JsonResponse {
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
     * POST /api/users - Crea un nuevo usuario
     */
    #[Route('/api/users', name: 'api_users_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function crearUsuario(Request $request, UserService $userService): JsonResponse {
        try {
            $datos = json_decode($request->getContent(), true);

            if (!is_array($datos)) {
                return $this->json(['ok' => false, 'error' => 'JSON inválido'], Response::HTTP_BAD_REQUEST);
            }

            if (empty($datos['email']) || empty($datos['password'])) {
                return $this->json(['ok' => false, 'error' => 'Email y contraseña son obligatorios'], Response::HTTP_BAD_REQUEST);
            }

            $roles = $datos['roles'] ?? ['ROLE_ELEVATED'];
            $nombre = $datos['nombre'] ?? null;
            $usuario = $userService->crearUsuario($datos['email'], $datos['password'], $roles, $nombre);

            return $this->json([
                'ok' => true,
                'mensaje' => 'Usuario creado correctamente',
                'usuario' => $this->serializarUsuario($usuario),
            ], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            return $this->json(['ok' => false, 'error' => 'Error al crear usuario: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * PUT /api/users/{id} - Actualiza rol de un usuario
     */
    #[Route('/api/users/{id}', name: 'api_users_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_ADMIN')]
    public function actualizarUsuario(int $id, Request $request, UserService $userService, ManagerRegistry $doctrine): JsonResponse {
        try {
            $datos = json_decode($request->getContent(), true);
            $usuario = $doctrine->getRepository(User::class)->find($id);

            if (!$usuario) {
                return $this->json(['ok' => false, 'error' => 'Usuario no encontrado'], Response::HTTP_NOT_FOUND);
            }

            $userService->cambiarRol($usuario, $datos['roles']);

            return $this->json([
                'ok' => true,
                'mensaje' => 'Usuario actualizado correctamente',
                'usuario' => $this->serializarUsuario($usuario),
            ]);
        } catch (\Exception $e) {
            return $this->json(['ok' => false, 'error' => 'Error al actualizar: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * DELETE /api/users/{id} - Elimina un usuario 
     */
    #[Route('/api/users/{id}', name: 'api_users_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_ADMIN')]
    public function eliminarUsuario(int $id, UserService $userService): JsonResponse {
        try {
            $userService->eliminarUsuario($id);
            return $this->json(['ok' => true, 'mensaje' => 'Usuario eliminado correctamente']);
        } catch (\Exception $e) {
            return $this->json(['ok' => false, 'error' => 'Error al eliminar: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    private function serializarUsuario(User $usuario): array {
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