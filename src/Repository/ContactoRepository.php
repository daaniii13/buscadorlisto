<?php
namespace App\Repository;
use App\Entity\Contacto;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Contacto>
 */
class ContactoRepository extends ServiceEntityRepository {
    public function __construct(ManagerRegistry $registry) {
        parent::__construct($registry, Contacto::class);
    }

    /**
     * Guarda un contacto en la base de datos
     */
    public function save(Contacto $entity, bool $flush = false): void {
        $this->getEntityManager()->persist($entity);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /**
     * Elimina un contacto de la base de datos
     */
    public function remove(Contacto $entity, bool $flush = false): void {
        $this->getEntityManager()->remove($entity);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /**
     * Busca contactos por una palabra clave en múltiples campos
     */
    public function findByWord(string $word): array {
        return $this->createQueryBuilder('c')
            ->where('c.nombre LIKE :word')
            ->orWhere('c.departamento LIKE :word')
            ->orWhere('c.email LIKE :word')
            ->orWhere('c.extension LIKE :word')
            ->setParameter('word', '%' . $word . '%')
            ->orderBy('c.departamento', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Busca contactos que coincidan con múltiples palabras (lógica AND)
     * Cada palabra debe encontrarse en al menos uno de los campos
     */
    public function findByMultipleWords(array $words): array {
        $qb = $this->createQueryBuilder('c');

        foreach ($words as $index => $word) {
            $paramName = 'word' . $index;
            $qb->andWhere(
                $qb->expr()->orX(
                    'c.nombre LIKE :' . $paramName,
                    'c.departamento LIKE :' . $paramName,
                    'c.email LIKE :' . $paramName,
                    'c.extension LIKE :' . $paramName
                )
            )
            ->setParameter($paramName, '%' . $word . '%');
        }

        return $qb->orderBy('c.departamento', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Busca un contacto duplicado por nombre, departamento y extensión
     */
    public function findDuplicate(string $nombre, string $departamento, string $extension, ?int $excludeId = null): ?Contacto {
        $qb = $this->createQueryBuilder('c')
            ->where('c.nombre = :nombre')
            ->andWhere('c.departamento = :departamento')
            ->andWhere('c.extension = :extension')
            ->setParameter('nombre', $nombre)
            ->setParameter('departamento', $departamento)
            ->setParameter('extension', $extension);

        if ($excludeId !== null) {
            $qb->andWhere('c.id != :excludeId')
                ->setParameter('excludeId', $excludeId);
        }

        return $qb->getQuery()->getOneOrNullResult();
    }

    /**
     * Obtiene todos los contactos ordenados por departamento
     */
    public function findAllOrderedByDepartamento(): array {
        return $this->createQueryBuilder('c')
            ->orderBy('c.departamento', 'ASC')
            ->getQuery()
            ->getResult();
    }
}