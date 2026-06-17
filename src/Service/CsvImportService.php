<?php
namespace App\Service;
use App\Entity\Contacto;
use App\Repository\ContactoRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class CsvImportService {
    public function __construct(
        private readonly ContactoRepository $repository,
        private readonly EntityManagerInterface $entityManager,
    ) {}

    /**
     * @return array ['importados' => int, 'errores' => int, 'duplicados' => int]
     *
     * @throws \RuntimeException
    **/

    public function importar(UploadedFile $file): array {
        if ($file->getError() !== UPLOAD_ERR_OK) {
            throw new \RuntimeException('Error al subir el archivo');
        }

        $contenido = file_get_contents($file->getPathname());
        if ($contenido === false) {
            throw new \RuntimeException('Error al leer el archivo');
        }

        $contenido = $this->limpiarBOM($contenido);
        $contenido = $this->normalizarEncoding($contenido);
        $lineas = $this->parseCSV($contenido);

        if (!empty($lineas)) {
            array_shift($lineas);
        }

        $importados = 0;
        $errores = 0;
        $duplicados = 0;

        foreach ($lineas as $fila) {
            try {
                if ($this->procesarFila($fila)) {
                    $importados++;
                } else {
                    $duplicados++;
                }
            } catch (\Exception $e) {
                $errores++;
            }
        }

        $this->entityManager->flush();

        return [
            'importados' => $importados,
            'errores' => $errores,
            'duplicados' => $duplicados,
        ];
    }

    /**
     * Retorna true si fue importada la fila, false si es duplicada
     *
     * @throws \InvalidArgumentException
    **/
    private function procesarFila(array $fila): bool {
        if (count($fila) < 4) {
            throw new \InvalidArgumentException('Fila incompleta');
        }

        $nombre = trim($fila[0]);
        $departamento = trim($fila[1]);
        $extension = $this->limpiarExtension(trim($fila[2]));
        $email = trim($fila[3]);

        // Validar los campos requeridos
        if (empty($nombre) || empty($departamento) || empty($extension)) {
            throw new \InvalidArgumentException('Campos requeridos vacíos');
        }

        // Validar si la extensión es numérica
        if (!ctype_digit($extension)) {
            throw new \InvalidArgumentException('Extensión debe ser numérica');
        }

        // Buscar el duplicado
        if ($this->repository->findDuplicate($nombre, $departamento, $extension)) {
            return false;
        }

        // Crear contacto nuevo
        $contacto = new Contacto();
        $contacto->setNombre($nombre);
        $contacto->setDepartamento($departamento);
        $contacto->setExtension($extension);
        $contacto->setEmail(!empty($email) ? $email : null);

        $this->entityManager->persist($contacto);
        return true;
    }

    private function limpiarBOM(string $contenido): string {
        $bom = pack('H*', 'EFBBBF');
        if (str_starts_with($contenido, $bom)) {
            $contenido = substr($contenido, strlen($bom));
        }
        return $contenido;
    }

    private function normalizarEncoding(string $contenido): string {
        $encoding = mb_detect_encoding($contenido, 'UTF-8, ISO-8859-1', true);

        if ($encoding && $encoding !== 'UTF-8') {
            $contenido = iconv($encoding, 'UTF-8//TRANSLIT', $contenido);
        }
        return $contenido;
    }

    private function parseCSV(string $contenido): array {
        $lineas = explode("\n", $contenido);
        $resultado = [];

        foreach ($lineas as $linea) {
            $linea = trim($linea);
            if (empty($linea)) {
                continue;
            }

            // Detectar delimitador
            $delimitador = $this->detectarDelimitador($linea);
            $campos = str_getcsv($linea, $delimitador);

            // Asegurar exactamente 4 campos
            while (count($campos) < 4) {
                $campos[] = '';
            }

            $campos = array_slice($campos, 0, 4);
            $resultado[] = array_map('trim', $campos);
        }
        return $resultado;
    }

    /**
     * Detecta el delimitador usado en la línea (coma o punto y coma).
     */
    private function detectarDelimitador(string $linea): string {
        $comillas = substr_count($linea, '"');
        if ($comillas % 2 === 0) {
            $contadorComas = substr_count($linea, ',');
            $contadorPuntoYComas = substr_count($linea, ';');

            return $contadorPuntoYComas > $contadorComas ? ';' : ',';
        }
        return ',';
    }

    /**
     * Limpia la extensión eliminando caracteres no numéricos.
    **/
    private function limpiarExtension(string $extension): string {
        return preg_replace('/[^0-9]/', '', $extension);
    }
}