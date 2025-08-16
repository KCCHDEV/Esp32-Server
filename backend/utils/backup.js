const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const { logger } = require('../middleware/errorHandler');
const { prisma } = require('../lib/prisma');

const execAsync = promisify(exec);

// Backup configuration
const BACKUP_CONFIG = {
  directory: process.env.BACKUP_DIR || './backups',
  retention: {
    daily: 7,    // Keep 7 daily backups
    weekly: 4,   // Keep 4 weekly backups  
    monthly: 12  // Keep 12 monthly backups
  },
  compression: true,
  encryption: process.env.BACKUP_ENCRYPTION_KEY || null
};

// Ensure backup directory exists
async function ensureBackupDirectory() {
  try {
    await fs.mkdir(BACKUP_CONFIG.directory, { recursive: true });
    await fs.mkdir(path.join(BACKUP_CONFIG.directory, 'database'), { recursive: true });
    await fs.mkdir(path.join(BACKUP_CONFIG.directory, 'files'), { recursive: true });
  } catch (error) {
    logger.error('Failed to create backup directories:', error);
    throw error;
  }
}

// Database backup using pg_dump
async function backupDatabase() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `db-backup-${timestamp}.sql`;
    const backupPath = path.join(BACKUP_CONFIG.directory, 'database', backupFileName);
    
    // Extract database connection details from URL
    const dbUrl = process.env.NETLIFY_DATABASE_URL;
    if (!dbUrl) {
      throw new Error('Database URL not found');
    }
    
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || 5432;
    const database = url.pathname.slice(1);
    const username = url.username;
    const password = url.password;
    
    // Create pg_dump command
    const dumpCommand = [
      'pg_dump',
      `--host=${host}`,
      `--port=${port}`,
      `--username=${username}`,
      `--dbname=${database}`,
      '--format=custom',
      '--no-password',
      '--verbose',
      `--file=${backupPath}`
    ].join(' ');
    
    // Set password environment variable
    const env = { ...process.env, PGPASSWORD: password };
    
    logger.info('Starting database backup...');
    await execAsync(dumpCommand, { env });
    
    // Compress if enabled
    let finalPath = backupPath;
    if (BACKUP_CONFIG.compression) {
      const compressedPath = `${backupPath}.gz`;
      await execAsync(`gzip "${backupPath}"`);
      finalPath = compressedPath;
    }
    
    // Get file size
    const stats = await fs.stat(finalPath);
    const fileSizeKB = Math.round(stats.size / 1024);
    
    logger.info(`Database backup completed: ${finalPath} (${fileSizeKB} KB)`);
    
    // Log backup to database
    await logBackup('DATABASE', finalPath, fileSizeKB);
    
    return finalPath;
  } catch (error) {
    logger.error('Database backup failed:', error);
    throw error;
  }
}

// File system backup (user uploads, logs, etc.)
async function backupFiles() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `files-backup-${timestamp}.tar.gz`;
    const backupPath = path.join(BACKUP_CONFIG.directory, 'files', backupFileName);
    
    // Directories to backup
    const dirsToBackup = [
      './uploads',
      './logs',
      './config'
    ].filter(dir => {
      try {
        require('fs').accessSync(dir);
        return true;
      } catch {
        return false;
      }
    });
    
    if (dirsToBackup.length === 0) {
      logger.info('No files to backup');
      return null;
    }
    
    // Create tar command
    const tarCommand = `tar -czf "${backupPath}" ${dirsToBackup.join(' ')}`;
    
    logger.info('Starting file backup...');
    await execAsync(tarCommand);
    
    // Get file size
    const stats = await fs.stat(backupPath);
    const fileSizeKB = Math.round(stats.size / 1024);
    
    logger.info(`File backup completed: ${backupPath} (${fileSizeKB} KB)`);
    
    // Log backup to database
    await logBackup('FILES', backupPath, fileSizeKB);
    
    return backupPath;
  } catch (error) {
    logger.error('File backup failed:', error);
    throw error;
  }
}

// Full system backup
async function createFullBackup() {
  try {
    await ensureBackupDirectory();
    
    const results = {
      timestamp: new Date().toISOString(),
      database: null,
      files: null,
      success: true,
      errors: []
    };
    
    // Backup database
    try {
      results.database = await backupDatabase();
    } catch (error) {
      results.success = false;
      results.errors.push(`Database backup failed: ${error.message}`);
    }
    
    // Backup files
    try {
      results.files = await backupFiles();
    } catch (error) {
      results.success = false;
      results.errors.push(`File backup failed: ${error.message}`);
    }
    
    // Clean old backups
    try {
      await cleanOldBackups();
    } catch (error) {
      logger.warn('Failed to clean old backups:', error);
    }
    
    logger.info('Full backup completed:', results);
    return results;
  } catch (error) {
    logger.error('Full backup failed:', error);
    throw error;
  }
}

// Log backup to database
async function logBackup(type, filePath, sizeKB) {
  try {
    // Note: This would need a BackupLog model in the schema
    // For now, we'll use the audit log
    await prisma.auditLog.create({
      data: {
        action: `BACKUP_${type}`,
        details: {
          filePath,
          sizeKB,
          timestamp: new Date().toISOString()
        },
        success: true
      }
    });
  } catch (error) {
    logger.error('Failed to log backup:', error);
  }
}

// Clean old backups based on retention policy
async function cleanOldBackups() {
  try {
    const now = new Date();
    
    // Clean database backups
    const dbBackupDir = path.join(BACKUP_CONFIG.directory, 'database');
    await cleanBackupDirectory(dbBackupDir, BACKUP_CONFIG.retention);
    
    // Clean file backups
    const fileBackupDir = path.join(BACKUP_CONFIG.directory, 'files');
    await cleanBackupDirectory(fileBackupDir, BACKUP_CONFIG.retention);
    
    logger.info('Old backups cleaned');
  } catch (error) {
    logger.error('Failed to clean old backups:', error);
  }
}

// Clean backup directory based on retention policy
async function cleanBackupDirectory(dir, retention) {
  try {
    const files = await fs.readdir(dir);
    const now = new Date();
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await fs.stat(filePath);
      const ageInDays = (now - stats.mtime) / (1000 * 60 * 60 * 24);
      
      // Determine if file should be kept based on age and type
      let shouldKeep = false;
      
      if (ageInDays <= retention.daily) {
        shouldKeep = true; // Keep all files from last 7 days
      } else if (ageInDays <= retention.daily * retention.weekly) {
        // Keep weekly backups (one per week)
        const dayOfWeek = new Date(stats.mtime).getDay();
        shouldKeep = dayOfWeek === 0; // Keep Sunday backups
      } else if (ageInDays <= retention.daily * retention.monthly * 30) {
        // Keep monthly backups (first of month)
        const dayOfMonth = new Date(stats.mtime).getDate();
        shouldKeep = dayOfMonth === 1; // Keep first day of month
      }
      
      if (!shouldKeep) {
        await fs.unlink(filePath);
        logger.info(`Deleted old backup: ${file}`);
      }
    }
  } catch (error) {
    logger.error('Failed to clean backup directory:', error);
  }
}

// Restore database from backup
async function restoreDatabase(backupPath) {
  try {
    if (!await fs.access(backupPath).then(() => true).catch(() => false)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    
    // Extract database connection details
    const dbUrl = process.env.NETLIFY_DATABASE_URL;
    const url = new URL(dbUrl);
    
    const restoreCommand = [
      'pg_restore',
      `--host=${url.hostname}`,
      `--port=${url.port || 5432}`,
      `--username=${url.username}`,
      `--dbname=${url.pathname.slice(1)}`,
      '--clean',
      '--no-password',
      '--verbose',
      backupPath
    ].join(' ');
    
    const env = { ...process.env, PGPASSWORD: url.password };
    
    logger.info(`Starting database restore from: ${backupPath}`);
    await execAsync(restoreCommand, { env });
    
    logger.info('Database restore completed');
    
    // Log restore action
    await prisma.auditLog.create({
      data: {
        action: 'DATABASE_RESTORE',
        details: { backupPath },
        success: true
      }
    });
    
    return true;
  } catch (error) {
    logger.error('Database restore failed:', error);
    throw error;
  }
}

// Schedule automatic backups
function scheduleBackups() {
  // Create backup every 6 hours in production
  const interval = process.env.NODE_ENV === 'production' ? 6 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  
  setInterval(async () => {
    try {
      logger.info('Starting scheduled backup...');
      await createFullBackup();
    } catch (error) {
      logger.error('Scheduled backup failed:', error);
    }
  }, interval);
  
  logger.info(`Backup scheduler started (interval: ${interval / (60 * 60 * 1000)} hours)`);
}

module.exports = {
  createFullBackup,
  backupDatabase,
  backupFiles,
  restoreDatabase,
  cleanOldBackups,
  scheduleBackups,
  BACKUP_CONFIG
};