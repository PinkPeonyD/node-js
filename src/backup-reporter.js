const fs = require('fs/promises');
const path = require('path');

class BackupReporter {
  constructor(options = {}) {
    const {
      backupDir = path.join(__dirname, '..', 'backups'),
      logger = console,
    } = options;

    this.backupDir = backupDir;
    this.logger = logger;
  }

  async listBackupFiles() {
    try {
      const files = await fs.readdir(this.backupDir);
      return files
        .filter((file) => file.endsWith('.backup.json'))
        .map((file) => {
          const timestamp = Number(file.replace('.backup.json', ''));
          return {
            file,
            timestamp: Number.isFinite(timestamp) ? timestamp : 0,
          };
        })
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async gatherStats() {
    const files = await this.listBackupFiles();
    const studentsMap = new Map();
    let totalStudents = 0;
    let latestFile = null;

    for (const { file, timestamp } of files) {
      const filePath = path.join(this.backupDir, file);
      try {
        const raw = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(raw);
        const students = Array.isArray(data) ? data : [];

        totalStudents += students.length;
        if (!latestFile || timestamp > latestFile.timestamp) {
          latestFile = { name: file, timestamp };
        }

        for (const student of students) {
          if (!student?.id) continue;
          const amount = studentsMap.get(student.id) || 0;
          studentsMap.set(student.id, amount + 1);
        }
      } catch (error) {
        if (this.logger?.error) {
          this.logger.error(`Failed to parse backup ${file}: ${error.message}`);
        }
      }
    }

    const studentsById = Array.from(studentsMap.entries()).map(
      ([id, amount]) => ({ id, amount })
    );

    return {
      totalFiles: files.length,
      latestFile: latestFile
        ? {
            name: latestFile.name,
            timestamp: latestFile.timestamp,
            date: new Date(latestFile.timestamp),
          }
        : null,
      studentsById,
      averageStudents: files.length ? totalStudents / files.length : 0,
    };
  }

  async report() {
    const stats = await this.gatherStats();
    this.logger.log('Backup files total:', stats.totalFiles);

    if (stats.latestFile) {
      this.logger.log(
        'Latest backup:',
        stats.latestFile.name,
        stats.latestFile.date.toISOString()
      );
    } else {
      this.logger.log('No backups found.');
    }

    this.logger.log('Students grouped by id:', stats.studentsById);
    this.logger.log('Average students per backup:', stats.averageStudents);

    return stats;
  }
}

module.exports = BackupReporter;
