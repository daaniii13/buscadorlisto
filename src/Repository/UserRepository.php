<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository implements PasswordUpgraderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /**
     * Guarda un usuario en la base de datos
     */
    public function save(User $entity, bool $flush = false): void
    {
        $this->getEntityManager()->persist($entity);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /**
     * Elimina un usuario de la base de datos
     */
    public function remove(User $entity, bool $flush = false): void
    {
        $this->getEntityManager()->remove($entity);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /**
     * Encuentra un usuario por email.
     */
    public function findOneByEmail(string $email): ?User
    {
        return $this->findOneBy(['email' => $email]);
    }

    /**
     * Requerido por PasswordUpgraderInterface.
     * Actualiza la contraseña después de cambiarla.
     */
    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $hashedPassword): void
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf('Instancias de "%s" no son soportadas.', \get_class($user)));
        }

        $user->setPassword($hashedPassword);
        $this->getEntityManager()->persist($user);
        $this->getEntityManager()->flush();
    }

    /**
     * Lista todos los usuarios activos.
     */
    public function findAllActivos(): array
    {
        return $this->findBy(['activo' => true], ['createdAt' => 'DESC']);
    }
}