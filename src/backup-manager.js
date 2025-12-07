const EventEmitter = require('events');
const fs = require('fs/promises');
const path = require('path');

class BackupManager extends EventEmitter {
  /**
   * @param {Function|Array} studentsSource - Function returning current students array or direct reference.
   * @param {Object} options
   * @param {string} [options.backupDir] - Directory to store backup files.
   * @param {number} [options.intervalMs] - Backup interval in milliseconds.
   * @param {number} [options.maxPendingIntervals] - Max consecutive pending intervals before throwing.
   * @param {Object} [options.logger] - Logger with log/error methods.
   */
  constructor(studentsSource, options = {}) {
    super();
    if (!studentsSource) {
      throw new Error('BackupManager requires a students source');
    }

    const {
      backupDir = path.join(__dirname, '..', 'backups'),
      intervalMs = 5000,
      maxPendingIntervals = 3,
      logger = console,
    } = options;

    this.getStudents =
      typeof studentsSource === 'function'
        ? studentsSource
        : () => studentsSource;

    this.backupDir = backupDir;
    this.intervalMs = intervalMs;
    this.maxPendingIntervals = maxPendingIntervals;
    this.logger = logger;

    this.intervalId = null;
    this.pending = false;
    this.pendingIntervals = 0;
  }

  async start() {
    if (this.intervalId) return;

    await fs.mkdir(this.backupDir, { recursive: true });
    this.intervalId = global.setInterval(() => {
      this.runBackup().catch((error) => {
        if (this.logger?.error) {
          this.logger.error('Backup interval error:', error.message);
        }
        this.stop();
      });
    }, this.intervalMs);

    // Run initial backup immediately
    try {
      await this.runBackup();
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  stop() {
    if (this.intervalId) {
      global.clearInterval(this.intervalId);
      this.intervalId = null;
      this.emit('backup:stopped');
    }
  }

  async runBackup() {
    if (this.pending) {
      this.pendingIntervals += 1;
      if (this.logger?.log) {
        this.logger.log('Backup skipped due to pending operation');
      }
      if (this.pendingIntervals >= this.maxPendingIntervals) {
        this.stop();
        const error = new Error(
          `Backup operation stuck for ${this.pendingIntervals} intervals`
        );
        this.emit('backup:error', error);
        throw error;
      }
      this.emit('backup:skipped', this.pendingIntervals);
      return;
    }

    try {
      this.pending = true;
      this.pendingIntervals = 0;

      const timestamp = Date.now();
      const filename = `${timestamp}.backup.json`;
      const filePath = path.join(this.backupDir, filename);
      const snapshot = await Promise.resolve(this.getStudents());
      const payload = JSON.stringify(snapshot, null, 2);

      await fs.writeFile(filePath, payload, 'utf8');
      if (this.logger?.log) {
        this.logger.log(`Backup created: ${filePath}`);
      }
      this.emit('backup:success', {
        filePath,
        timestamp,
        count: snapshot.length,
      });
    } catch (error) {
      if (this.logger?.error) {
        this.logger.error(`Backup failed: ${error.message}`);
      }
      this.emit('backup:error', error);
      throw error;
    } finally {
      this.pending = false;
    }
  }
}

module.exports = BackupManager;
