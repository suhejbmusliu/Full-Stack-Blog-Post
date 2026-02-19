import "dotenv/config";
import pool from "../config/database.js";

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // admins
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id VARCHAR(32) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        passwordHash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
        isActive BOOLEAN NOT NULL DEFAULT TRUE,

        failedLogins INT NOT NULL DEFAULT 0,
        lockedUntil DATETIME NULL,
        lastLoginAt DATETIME NULL,

        twoFactorEnabled BOOLEAN NOT NULL DEFAULT FALSE,
        twoFactorSecret VARCHAR(255) NULL,
        twoFactorTemp VARCHAR(255) NULL,

        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_admin_email (email),
        INDEX idx_admin_active (isActive)
      );
    `);

    //disable 2fa

    await conn.query(`
    CREATE TABLE IF NOT EXISTS two_factor_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  admin_id VARCHAR(191) NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_admin_expires (admin_id, expires_at),
  UNIQUE KEY uq_token_hash (token_hash),

  CONSTRAINT fk_2fa_reset_admin
    FOREIGN KEY (admin_id) REFERENCES admins(id)
    ON DELETE CASCADE
);
    `);

    // refresh_tokens
    await conn.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id VARCHAR(32) PRIMARY KEY,
        adminId VARCHAR(32) NOT NULL,
        tokenHash VARCHAR(255) NOT NULL,
        revokedAt DATETIME NULL,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        userAgent VARCHAR(255) NULL,
        ip VARCHAR(64) NULL,

        INDEX idx_rt_admin (adminId),
        INDEX idx_rt_expires (expiresAt),
        CONSTRAINT fk_refresh_admin
          FOREIGN KEY (adminId) REFERENCES admins(id)
          ON DELETE CASCADE
      );
    `);

    // password_reset_tokens
    await conn.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR(32) PRIMARY KEY,
        adminId VARCHAR(32) NOT NULL,
        tokenHash VARCHAR(255) NOT NULL,
        expiresAt DATETIME NOT NULL,
        usedAt DATETIME NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_prt_admin_created (adminId, createdAt),
        CONSTRAINT fk_prt_admin
          FOREIGN KEY (adminId) REFERENCES admins(id)
          ON DELETE CASCADE
      );
    `);

    // posts
    await conn.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id VARCHAR(32) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        content LONGTEXT NOT NULL,
        excerpt TEXT NULL,
        status ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
        activityDate DATETIME NULL,

        coverImage VARCHAR(500) NULL,
        coverThumb VARCHAR(500) NULL,

        authorId VARCHAR(32) NOT NULL,

        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_posts_status_created (status, createdAt),
        INDEX idx_posts_title (title),
        INDEX idx_posts_slug (slug),

        CONSTRAINT fk_posts_author
          FOREIGN KEY (authorId) REFERENCES admins(id)
          ON DELETE RESTRICT
      );
    `);

    // categories
    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(32) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        slug VARCHAR(255) NOT NULL UNIQUE,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_categories_slug (slug)
      );
    `);

    // tags
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id VARCHAR(32) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        slug VARCHAR(255) NOT NULL UNIQUE,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_tags_slug (slug)
      );
    `);

    // post_categories (join)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS post_categories (
        postId VARCHAR(32) NOT NULL,
        categoryId VARCHAR(32) NOT NULL,
        PRIMARY KEY (postId, categoryId),

        CONSTRAINT fk_pc_post
          FOREIGN KEY (postId) REFERENCES posts(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_pc_category
          FOREIGN KEY (categoryId) REFERENCES categories(id)
          ON DELETE CASCADE
      );
    `);

    // post_tags (join)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS post_tags (
        postId VARCHAR(32) NOT NULL,
        tagId VARCHAR(32) NOT NULL,
        PRIMARY KEY (postId, tagId),

        CONSTRAINT fk_pt_post
          FOREIGN KEY (postId) REFERENCES posts(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_pt_tag
          FOREIGN KEY (tagId) REFERENCES tags(id)
          ON DELETE CASCADE
      );
    `);

    // admin_logs
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id VARCHAR(32) PRIMARY KEY,
        adminId VARCHAR(32) NULL,
        action VARCHAR(255) NOT NULL,
        entity VARCHAR(255) NULL,
        entityId VARCHAR(255) NULL,
        meta JSON NULL,
        ip VARCHAR(64) NULL,
        userAgent VARCHAR(255) NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_logs_admin_created (adminId, createdAt),
        CONSTRAINT fk_logs_admin
          FOREIGN KEY (adminId) REFERENCES admins(id)
          ON DELETE SET NULL
      );
    `);

    // post_images
    await conn.query(`
      CREATE TABLE IF NOT EXISTS post_images (
        id VARCHAR(32) PRIMARY KEY,
        url VARCHAR(500) NOT NULL,
        sortOrder INT NOT NULL DEFAULT 0,
        postId VARCHAR(32) NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_pi_post_sort (postId, sortOrder),
        CONSTRAINT fk_pi_post
          FOREIGN KEY (postId) REFERENCES posts(id)
          ON DELETE CASCADE
      );
    `);

    // activity_years
    await conn.query(`
      CREATE TABLE IF NOT EXISTS activity_years (
        id VARCHAR(32) PRIMARY KEY,
        year INT NOT NULL UNIQUE,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_activity_year (year)
      );
    `);

    await conn.commit();
    console.log("✅ Tables created/verified successfully.");
    process.exit(0);
  } catch (err) {
    await conn.rollback();
    console.error("❌ Failed creating tables:", err);
    process.exit(1);
  } finally {
    conn.release();
  }
}

run();
