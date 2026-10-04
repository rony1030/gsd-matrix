-- ==============================================================================
-- GSD Geosolutions Source Dominicana - Esquema MySQL / MariaDB (Hostinger phpMyAdmin)
-- Base de Datos: Principal & CRM
-- ==============================================================================

-- 1. Tabla de Tipos de Cliente
CREATE TABLE IF NOT EXISTS `client_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(191) NOT NULL UNIQUE,
  `color` VARCHAR(50) DEFAULT '#1A3A52'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `client_types` (`nombre`, `color`) VALUES
('General', '#64748B'),
('Bienes Raíces', '#0D9488'),
('Legal & Litigios', '#1A3A52'),
('Agrimensura & Catastro', '#4A9B6F'),
('Corporativo', '#D97706')
ON DUPLICATE KEY UPDATE `color` = VALUES(`color`);

-- 2. Tabla de Leads y Prospectos Centralizados
CREATE TABLE IF NOT EXISTS `leads` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(255) NOT NULL,
  `email` VARCHAR(191) DEFAULT NULL,
  `telefono` VARCHAR(100) DEFAULT NULL,
  `servicio` VARCHAR(191) DEFAULT NULL,
  `tipo_cliente` VARCHAR(100) DEFAULT 'General',
  `is_real_estate` TINYINT(1) DEFAULT 0,
  `tags` VARCHAR(255) DEFAULT '',
  `mensaje` TEXT,
  `estado` VARCHAR(50) DEFAULT 'nuevo',
  `origen` VARCHAR(100) DEFAULT 'web',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de Cotizaciones Comerciales y Presupuestos
CREATE TABLE IF NOT EXISTS `cotizaciones` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `referencia` VARCHAR(100) NOT NULL UNIQUE,
  `cliente_nombre` VARCHAR(255) NOT NULL,
  `cliente_doc` VARCHAR(100) DEFAULT NULL,
  `cliente_email` VARCHAR(191) DEFAULT NULL,
  `cliente_tel` VARCHAR(100) DEFAULT NULL,
  `cliente_dir` VARCHAR(255) DEFAULT NULL,
  `servicio_tipo` VARCHAR(100) NOT NULL,
  `servicio_titulo` VARCHAR(255) NOT NULL,
  `monto_base` DECIMAL(14,2) DEFAULT 0,
  `moneda` VARCHAR(10) DEFAULT 'USD',
  `duracion_meses` INT DEFAULT 1,
  `superficie_m2` DECIMAL(14,2) DEFAULT 0,
  `items_json` LONGTEXT,
  `condiciones_json` LONGTEXT,
  `itbis` DECIMAL(14,2) DEFAULT 0,
  `total` DECIMAL(14,2) DEFAULT 0,
  `estado` VARCHAR(50) DEFAULT 'borrador',
  `observaciones` TEXT,
  `fecha` DATE DEFAULT NULL,
  `vigencia_dias` INT DEFAULT 30,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de Expedientes Técnicos y Jurídicos
CREATE TABLE IF NOT EXISTS `expedientes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(100) NOT NULL UNIQUE,
  `cotizacion_ref` VARCHAR(100) DEFAULT NULL,
  `servicio_tipo` VARCHAR(100) NOT NULL,
  `cliente_nombre` VARCHAR(255) NOT NULL,
  `cliente_doc` VARCHAR(100) DEFAULT NULL,
  `cliente_tel` VARCHAR(100) DEFAULT NULL,
  `cliente_email` VARCHAR(191) DEFAULT NULL,
  `cliente_dir` VARCHAR(255) DEFAULT NULL,
  `honorario` DECIMAL(14,2) DEFAULT 0,
  `moneda` VARCHAR(10) DEFAULT 'USD',
  `responsable` VARCHAR(150) DEFAULT 'Esteban Mejía',
  `tecnico` VARCHAR(150) DEFAULT NULL,
  `prioridad` VARCHAR(50) DEFAULT 'Media',
  `estado` VARCHAR(50) DEFAULT 'proc',
  `fecha_inicio` DATE DEFAULT NULL,
  `fecha_fin` DATE DEFAULT NULL,
  `objeto_json` LONGTEXT,
  `ubicacion_json` LONGTEXT,
  `linderos_json` LONGTEXT,
  `tecnico_json` LONGTEXT,
  `docs_json` LONGTEXT,
  `tasks_json` LONGTEXT,
  `avances_json` LONGTEXT,
  `notas_json` LONGTEXT,
  `evidencias_json` LONGTEXT,
  `log_json` LONGTEXT,
  `pagos_json` LONGTEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla de Propiedades Inmobiliarias
CREATE TABLE IF NOT EXISTS `propiedades` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(191) UNIQUE,
  `titulo` VARCHAR(255) NOT NULL,
  `descripcion` LONGTEXT,
  `short_description` VARCHAR(255) DEFAULT '',
  `precio` DECIMAL(14,2) DEFAULT 0,
  `moneda` VARCHAR(10) DEFAULT 'USD',
  `tipo` VARCHAR(100) DEFAULT NULL,
  `operacion` VARCHAR(50) DEFAULT 'Venta',
  `ubicacion` VARCHAR(255) DEFAULT NULL,
  `provincia` VARCHAR(100) DEFAULT '',
  `ciudad` VARCHAR(100) DEFAULT '',
  `sector` VARCHAR(100) DEFAULT '',
  `habitaciones` DECIMAL(4,1) DEFAULT 0,
  `banos` DECIMAL(4,1) DEFAULT 0,
  `parqueos` INT DEFAULT 0,
  `area_construccion` DECIMAL(14,2) DEFAULT 0,
  `area_solar` DECIMAL(14,2) DEFAULT 0,
  `condicion` VARCHAR(100) DEFAULT 'Listo',
  `tour_3d` VARCHAR(255) DEFAULT '',
  `amenidades` LONGTEXT,
  `estado` VARCHAR(50) DEFAULT 'disponible',
  `imagenes` LONGTEXT,
  `imagen_portada` VARCHAR(255) DEFAULT '',
  `destacada` TINYINT(1) DEFAULT 0,
  `meta_title` VARCHAR(255) DEFAULT NULL,
  `meta_description` TEXT,
  `keywords` VARCHAR(255) DEFAULT NULL,
  `seo_score` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabla de Proyectos y Desarrollos Exclusivos
CREATE TABLE IF NOT EXISTS `proyectos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(191) NOT NULL UNIQUE,
  `nombre` VARCHAR(255) NOT NULL,
  `promotor` VARCHAR(150) DEFAULT 'GSD Real Estate',
  `ubicacion` VARCHAR(255) NOT NULL,
  `tipologias` VARCHAR(255) DEFAULT 'Apartamentos',
  `precio_desde` DECIMAL(14,2) DEFAULT 0,
  `moneda` VARCHAR(10) DEFAULT 'USD',
  `estado` VARCHAR(100) DEFAULT 'En construcción',
  `entrega` VARCHAR(50) DEFAULT '2026',
  `descripcion` LONGTEXT,
  `cover_image` VARCHAR(255) DEFAULT NULL,
  `galeria` LONGTEXT,
  `amenidades` LONGTEXT,
  `bloques` LONGTEXT,
  `featured` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabla de Usuarios y Operadores del Sistema
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(150) NOT NULL,
  `usuario` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(191) DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `rol` VARCHAR(100) NOT NULL DEFAULT 'Administrador / Socio',
  `permisos_json` LONGTEXT,
  `avatar` VARCHAR(255) DEFAULT '',
  `telefono` VARCHAR(100) DEFAULT '',
  `cargo` VARCHAR(150) DEFAULT 'Director General & Abogado Notario',
  `estado` VARCHAR(50) DEFAULT 'activo',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `usuarios` (`id`, `nombre`, `usuario`, `email`, `password`, `rol`, `permisos_json`, `cargo`, `estado`)
VALUES
(
  1,
  'Esteban Mejía',
  'admin',
  'esteban@geosolutionssource.com',
  'gsd2026admin',
  'Administrador / Socio',
  '["expedientes","cotizaciones","propiedades","proyectos","blog","finanzas","ajustes","usuarios"]',
  'Director General & Abogado Notario',
  'activo'
)
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- 8. Tabla de Artículos del Blog Institucional & SEO
CREATE TABLE IF NOT EXISTS `blogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `titulo` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(191) UNIQUE,
  `categoria` VARCHAR(100) DEFAULT 'Inversión',
  `tags` VARCHAR(255) DEFAULT '',
  `contenido` LONGTEXT,
  `imagen_portada` VARCHAR(255) DEFAULT NULL,
  `estado` VARCHAR(50) DEFAULT 'borrador',
  `meta_title` VARCHAR(255) DEFAULT NULL,
  `meta_description` TEXT,
  `keywords` VARCHAR(255) DEFAULT NULL,
  `seo_score` INT DEFAULT 0,
  `autor` VARCHAR(100) DEFAULT 'GSD',
  `fecha_publicacion` DATE DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabla de Configuración Global
CREATE TABLE IF NOT EXISTS `settings` (
  `key` VARCHAR(100) PRIMARY KEY,
  `value` LONGTEXT,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tabla de Integración Redes Sociales
CREATE TABLE IF NOT EXISTS `social_feeds` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project` VARCHAR(100) NOT NULL UNIQUE,
  `project_name` VARCHAR(150) NOT NULL,
  `instagram_handle` VARCHAR(100) DEFAULT '@gsd',
  `instagram_url` VARCHAR(255) DEFAULT 'https://www.instagram.com/',
  `posts_json` LONGTEXT,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
