<?php
namespace App\Service;
use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class UserService {
    public function __construct(
        private UserRepository $userRepository,
        private UserPasswordHasherInterface $passwordHasher,
        private ValidatorInterface $validator,
    ) {
    }

    /**
     * Crea un nuevo usuario con validación
     */
    public function crearUsuario(string $email, string $password, array $roles = ['ROLE_ELEVATED'], ?string $nombre = null): User {
        if ($this->userRepository->findOneByEmail($email)) {
            throw new \InvalidArgumentException('El correo electrónico ya está registrado.');
        }
        $usuario = new User();
        $usuario->setEmail($email);
        $usuario->setRoles($roles);
        $usuario->setNombre($nombre);
        $hashedPassword = $this->passwordHasher->hashPassword($usuario, $password);
        $usuario->setPassword($hashedPassword);

        $errores = $this->validator->validate($usuario);
        if (count($errores) > 0) {
            throw new \InvalidArgumentException(sprintf(
                'Validación fallida: %s',
                (string) $errores
            ));
        }
        $this->userRepository->save($usuario, true);
        return $usuario;
    }

    /**
     * Cambia la contraseña de un usuario
     */
    public function cambiarContrasena(User $usuario, string $nuevaContrasena): void {
        $hashedPassword = $this->passwordHasher->hashPassword($usuario, $nuevaContrasena);
        $usuario->setPassword($hashedPassword);
        $this->userRepository->save($usuario, true);
    }

    /**
     * Cambia el rol de un usuario
     */
    public function cambiarRol(User $usuario, array $nuevoRol): void {
        $usuario->setRoles($nuevoRol);

        $errores = $this->validator->validate($usuario);
        if (count($errores) > 0) {
            throw new \InvalidArgumentException(sprintf('Validación fallida: %s', (string) $errores));
        }

        $this->userRepository->save($usuario, true);
    }

    /**
     * Lista todos los usuarios activos
     */
    public function listarUsuarios(): array {
        return $this->userRepository->findAllActivos();
    }

    /**
     * Elimina un usuario
     */
    public function eliminarUsuario(int $id): void {
        $usuario = $this->userRepository->find($id);

        if (!$usuario) {
            throw new \InvalidArgumentException(sprintf('Usuario con ID %d no encontrado', $id));
        }

        $this->userRepository->remove($usuario, true);
    }

    /**
     * Obtiene un usuario por email
     */
    public function obtenerPorEmail(string $email): ?User {
        return $this->userRepository->findOneByEmail($email);
    }

    /**
     * Desactiva un usuario sin eliminarlo
     */
    public function desactivarUsuario(User $usuario): void {
        $usuario->setActivo(false);
        $this->userRepository->save($usuario, true);
    }

    /**
     * Activa un usuario
     */
    public function activarUsuario(User $usuario): void {
        $usuario->setActivo(true);
        $this->userRepository->save($usuario, true);
    }
}