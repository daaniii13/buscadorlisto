<?php

namespace App\Service;

use App\Entity\Contacto;
use App\Repository\ContactoRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Symfony\Component\Validator\ConstraintViolation;

class ContactoService
{
    public function __construct(
        private readonly ContactoRepository $repository,
        private readonly EntityManagerInterface $entityManager,
        private readonly ValidatorInterface $validator,
    ) {}

    /**
     * Busca contactos por una cadena de búsqueda (soporta múltiples palabras).
     */
    public function buscar(string $q): array
    {
        $q = trim($q);

        if ($q === '') {
            return $this->repository->findAllOrderedByDepartamento();
        }

        $palabras = preg_split('/\s+/', $q, -1, PREG_SPLIT_NO_EMPTY);
        if (empty($palabras)) {
            return $this->repository->findAllOrderedByDepartamento();
        }

        return $this->repository->findByMultipleWords($palabras);
    }

    /**
     * Crea un nuevo contacto con validación.
     *
     * @throws \InvalidArgumentException Si los datos no son válidos
     */
    public function crear(array $datos): Contacto
    {
        $contacto = new Contacto();
        $this->aplicarDatos($contacto, $datos);
        $this->validarContacto($contacto);
        $this->verificarDuplicado($contacto);

        $this->entityManager->persist($contacto);
        $this->entityManager->flush();

        return $contacto;
    }

    /**
     * Actualiza un contacto existente con validación.
     *
     * @throws \InvalidArgumentException Si los datos no son válidos o no existe
     */
    public function actualizar(int $id, array $datos): Contacto
    {
        $contacto = $this->repository->find($id);
        if (!$contacto) {
            throw new \InvalidArgumentException('Contacto no encontrado');
        }

        $this->aplicarDatos($contacto, $datos);
        $this->validarContacto($contacto);
        $this->verificarDuplicado($contacto, $id);

        $this->entityManager->flush();

        return $contacto;
    }

    /**
     * Elimina un contacto por ID.
     *
     * @throws \InvalidArgumentException Si el contacto no existe
     */
    public function eliminar(int $id): void
    {
        $contacto = $this->repository->find($id);
        if (!$contacto) {
            throw new \InvalidArgumentException('Contacto no encontrado');
        }

        $this->entityManager->remove($contacto);
        $this->entityManager->flush();
    }

    /**
     * Elimina todos los contactos.
     */
    public function eliminarTodos(): int
    {
        $count = $this->entityManager->createQuery(
            'DELETE FROM App\Entity\Contacto c'
        )->execute();

        return $count;
    }

    /**
     * Aplica datos del array al contacto.
     */
    private function aplicarDatos(Contacto $contacto, array $datos): void
    {
        if (isset($datos['nombre'])) {
            $contacto->setNombre(trim($datos['nombre']));
        }
        if (isset($datos['departamento'])) {
            $contacto->setDepartamento(trim($datos['departamento']));
        }
        if (isset($datos['email'])) {
            $email = isset($datos['email']) ? trim($datos['email']) : '';
            $contacto->setEmail($email !== '' ? $email : null);
        }
        if (isset($datos['extension'])) {
            $extension = isset($datos['extension']) ? trim($datos['extension']) : '';
            $contacto->setExtension($extension !== '' ? $extension : null);
        }
    }

    /**
     * Valida un contacto usando Symfony Validator.
     *
     * @throws \InvalidArgumentException Si hay errores de validación
     */
    private function validarContacto(Contacto $contacto): void
    {
        $errors = $this->validator->validate($contacto);

        if (count($errors) > 0) {
            $mensajes = [];
            foreach ($errors as $error) {
                $mensajes[$error->getPropertyPath()] = $error->getMessage();
            }
            throw new \InvalidArgumentException('Validación fallida: ' . json_encode($mensajes));
        }
    }

    /**
     * Verifica si existe un contacto duplicado.
     *
     * @throws \InvalidArgumentException Si existe duplicado
     */
    private function verificarDuplicado(Contacto $contacto, ?int $excludeId = null): void
    {
        $duplicado = $this->repository->findDuplicate(
            $contacto->getNombre(),
            $contacto->getDepartamento(),
            $contacto->getExtension() ?? '',
            $excludeId
        );

        if ($duplicado) {
            throw new \InvalidArgumentException('El contacto ya existe (mismo nombre, departamento y extensión)');
        }
    }

    /**
     * Obtiene las estadísticas de errores de validación formateadas.
     */
    public static function formatValidationErrors(\InvalidArgumentException $e): array
    {
        $message = $e->getMessage();
        if (str_starts_with($message, 'Validación fallida: ')) {
            $json = substr($message, strlen('Validación fallida: '));
            return json_decode($json, true) ?? [];
        }
        return [];
    }
}
