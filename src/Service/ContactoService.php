<?php
namespace App\Service;
use App\Entity\Contacto;
use App\Repository\ContactoRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class ContactoService {
    public function __construct(
        private readonly ContactoRepository $repository,
        private readonly EntityManagerInterface $entityManager,
        private readonly ValidatorInterface $validator,
    ) {}

    /**
     * Busca contactos por una cadena de búsqueda (soporta múltiples palabras)
     */
    public function buscar(string $q): array {
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
     * Crea un nuevo contacto con validación
     */
    public function crear(array $datos): Contacto {
        try {
            $contacto = new Contacto();
            $this->aplicarDatos($contacto, $datos);
            $this->validarContacto($contacto);
            $this->verificarDuplicado($contacto);

            $this->entityManager->persist($contacto);
            $this->entityManager->flush();

            return $contacto;
        } catch (\InvalidArgumentException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new \Exception('Fallo interno PHP: ' . $e->getMessage());
        }
    }

    /**
     * Actualiza un contacto existente con validación
     */
    public function actualizar(int $id, array $datos): Contacto {
        try {
            $contacto = $this->repository->find($id);
            if (!$contacto) {
                throw new \InvalidArgumentException('Contacto no encontrado');
            }

            $this->aplicarDatos($contacto, $datos);
            $this->validarContacto($contacto);
            $this->verificarDuplicado($contacto, $id);
            $this->entityManager->flush();

            return $contacto;
        } catch (\InvalidArgumentException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new \Exception('Fallo interno PHP: ' . $e->getMessage());
        }
    }

    /**
     * Elimina un contacto por ID
     */
    public function eliminar(int $id): void {
        try {
            $contacto = $this->repository->find($id);
            if (!$contacto) {
                throw new \InvalidArgumentException('Contacto no encontrado');
            }

            $this->entityManager->remove($contacto);
            $this->entityManager->flush();
        } catch (\InvalidArgumentException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new \Exception('Fallo interno PHP: ' . $e->getMessage());
        }
    }

    /**
     * Elimina todos los contactos
     */
    public function eliminarTodos(): int {
        return $this->entityManager->createQuery(
            'DELETE FROM App\Entity\Contacto c'
        )->execute();
    }

    /**
     * Aplica datos del array al contacto
     */
    private function aplicarDatos(Contacto $contacto, array $datos): void {
        if (isset($datos['nombre'])) {
            $contacto->setNombre(trim((string) $datos['nombre']));
        }
        if (isset($datos['departamento'])) {
            $contacto->setDepartamento(trim((string) $datos['departamento']));
        }
        if (isset($datos['email'])) {
            $email = trim((string) $datos['email']);
            $contacto->setEmail($email !== '' ? $email : null);
        }
        if (isset($datos['extension'])) {
            $extension = trim((string) $datos['extension']);
            $contacto->setExtension($extension !== '' ? $extension : null);
        }
    }

    /**
     * Valida un contacto usando Symfony Validator
     */
    private function validarContacto(Contacto $contacto): void {
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
     */
    private function verificarDuplicado(Contacto $contacto, ?int $excludeId = null): void {
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
     * Obtiene las estadísticas de errores de validación formateadas
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