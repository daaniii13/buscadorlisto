<?php

namespace App\Entity;

use App\Repository\ContactoRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ContactoRepository::class)]
#[ORM\Table(name: 'contacto')]
class Contacto
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 150)]
    #[Assert\NotBlank(message: 'El nombre es obligatorio')]
    #[Assert\Length(max: 150, maxMessage: 'El nombre no puede exceder 150 caracteres')]
    private string $nombre = '';

    #[ORM\Column(length: 150)]
    #[Assert\NotBlank(message: 'El departamento es obligatorio')]
    #[Assert\Length(max: 150, maxMessage: 'El departamento no puede exceder 150 caracteres')]
    private string $departamento = '';

    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\Regex(pattern: '/@/', message: 'El correo debe contener al menos un @')]
    private ?string $email = null;

    #[ORM\Column(length: 13, nullable: true)]
    #[Assert\NotBlank(message: 'La extensión es obligatoria')]
    #[Assert\Length(max: 13, maxMessage: 'La extensión no puede exceder 13 caracteres')]
    #[Assert\Regex(
        pattern: '/^[0-9]*$/',
        message: 'La extensión debe contener solo números'
    )]
    private ?string $extension = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getNombre(): string
    {
        return $this->nombre;
    }

    public function setNombre(string $nombre): static
    {
        $this->nombre = $nombre;
        return $this;
    }

    public function getDepartamento(): string
    {
        return $this->departamento;
    }

    public function setDepartamento(string $departamento): static
    {
        $this->departamento = $departamento;
        return $this;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): static
    {
        $this->email = $email;
        return $this;
    }

    public function getExtension(): ?string
    {
        return $this->extension;
    }

    public function setExtension(?string $extension): static
    {
        $this->extension = $extension;
        return $this;
    }

    public function __toString(): string
    {
        return "{$this->nombre} ({$this->departamento})";
    }
}