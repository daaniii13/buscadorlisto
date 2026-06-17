<?php
declare(strict_types=1);
namespace DoctrineMigrations;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260615140000 extends AbstractMigration {   
    public function getDescription(): string {
        return 'Crea tabla de usuarios (user) para autenticación';
    }

    // this up() migration is auto-generated, please modify it to your needs
    public function up(Schema $schema): void {
        $this->addSql('CREATE TABLE `user` (id INT AUTO_INCREMENT NOT NULL, email VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL, roles JSON NOT NULL, nombre VARCHAR(150) DEFAULT NULL, activo TINYINT(1) NOT NULL, created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', UNIQUE INDEX UNIQ_IDENTIFIER_EMAIL (email), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
    }

    // this down() migration is auto-generated, please modify it to your needs
    public function down(Schema $schema): void {
        $this->addSql('DROP TABLE `user`');
    }
}
