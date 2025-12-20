const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const StudentsService = require('./services/StudentsService');
const BackupManager = require('./backup-manager');
const Logger = require('./utils/Logger');
const { loadStudents } = require('./utils/FileUtils');
const Student = require('./models/Student');

const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, '..', 'students.json');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const logger = new Logger(false, false);

async function loadInitialStudents() {
  try {
    await fs.access(DATA_FILE);
    const raw = await loadStudents(DATA_FILE);
    return Array.isArray(raw)
      ? raw.map((item) => new Student(item.id, item.name, item.age, item.group))
      : [];
  } catch {
    return [
      new Student('1', 'John Doe', 20, 2),
      new Student('2', 'Jane Smith', 23, 3),
      new Student('3', 'Mike Johnson', 18, 2),
    ];
  }
}

function normalizeGroup(group) {
  const parsed = Number(group);
  return Number.isNaN(parsed) ? group : parsed;
}

function validateStudentPayload(payload = {}, { partial = false } = {}) {
  const { name, age, group } = payload;

  if (
    !partial &&
    (name === undefined || age === undefined || group === undefined)
  ) {
    throw Object.assign(new Error('Name, age and group are required'), {
      status: 400,
    });
  }

  const result = {};

  if (name !== undefined) {
    result.name = name;
  }

  if (age !== undefined) {
    const ageNumber = Number(age);
    if (!Number.isFinite(ageNumber)) {
      throw Object.assign(new Error('Age must be a valid number'), {
        status: 400,
      });
    }
    result.age = ageNumber;
  }

  if (group !== undefined) {
    result.group = normalizeGroup(group);
  }

  return result;
}

function isNotFound(error) {
  return error?.message?.toLowerCase().includes('not found');
}

async function bootstrap() {
  const initialStudents = await loadInitialStudents();
  const studentsService = new StudentsService(initialStudents, {
    storagePath: DATA_FILE,
    logger,
  });

  const backupManager = new BackupManager(
    () => studentsService.getAllStudents(),
    {
      backupDir: BACKUP_DIR,
      logger,
    }
  );

  attachStudentEvents(studentsService, logger);
  attachBackupEvents(backupManager, logger);

  const app = express();
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,DELETE,OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Accept, Authorization'
    );
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Student Management API' });
  });

  app.get('/api/students', (req, res) => {
    res.json(studentsService.getAllStudents());
  });

  app.post('/api/students', async (req, res, next) => {
    try {
      const payload = validateStudentPayload(req.body);
      const student = await studentsService.addStudent(
        payload.name,
        payload.age,
        payload.group
      );
      res.status(201).json(student);
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/students', async (req, res, next) => {
    try {
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Body must be an array' });
      }

      const sanitized = req.body.map((s) => ({
        id: s.id,
        ...validateStudentPayload(s),
      }));

      const replaced = await studentsService.replaceAll(sanitized);
      res.json(replaced);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/students/group/:id', (req, res) => {
    const groupId = normalizeGroup(req.params.id);
    res.json(studentsService.getStudentsByGroup(groupId));
  });

  app.get('/api/students/average-age', (req, res) => {
    res.json({ averageAge: studentsService.calculateAverageAge() });
  });

  app.get('/api/students/:id', (req, res) => {
    const student = studentsService.getStudentById(req.params.id);
    if (!student) {
      return res
        .status(404)
        .json({ error: `Student with id ${req.params.id} not found` });
    }
    res.json(student);
  });

  app.put('/api/students/:id', async (req, res, next) => {
    try {
      const payload = validateStudentPayload(req.body, { partial: true });
      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: 'Nothing to update' });
      }

      const updated = await studentsService.updateStudent(
        req.params.id,
        payload
      );
      res.json(updated);
    } catch (error) {
      if (isNotFound(error)) {
        res.status(404).json({ error: error.message });
      } else {
        next(error);
      }
    }
  });

  app.delete('/api/students/:id', async (req, res, next) => {
    try {
      await studentsService.removeStudent(req.params.id);
      res.status(204).end();
    } catch (error) {
      if (isNotFound(error)) {
        res.status(404).json({ error: error.message });
      } else {
        next(error);
      }
    }
  });

  app.post('/api/students/save', async (req, res, next) => {
    try {
      await studentsService.persistStudents();
      res.json({
        message: 'Students saved',
        count: studentsService.getAllStudents().length,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/students/load', async (req, res, next) => {
    try {
      const loaded = await studentsService.loadFromFile();
      res.json({ message: 'Students loaded', count: loaded.length });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/backup/start', async (req, res, next) => {
    try {
      if (backupManager.intervalId) {
        return res
          .status(200)
          .json({ status: 'running', message: 'Backup already running' });
      }
      await backupManager.start();
      res.status(200).json({ status: 'running' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/backup/stop', (req, res) => {
    backupManager.stop();
    res.json({ status: 'stopped' });
  });

  app.get('/api/backup/status', (req, res) => {
    res.json({
      status: backupManager.intervalId ? 'running' : 'stopped',
      intervalMs: backupManager.intervalMs,
    });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, _next) => {
    logger.error('API error:', error.message);
    res
      .status(error.status || 500)
      .json({ error: error.message || 'Internal Server Error' });
  });

  app.listen(PORT, () => {
    logger.log(`API server listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start API server:', error.message);
  process.exit(1);
});

function attachStudentEvents(service, loggerInstance) {
  service.on('student:added', (student) =>
    loggerInstance.log('student:added', student)
  );
  service.on('student:updated', (student) =>
    loggerInstance.log('student:updated', student)
  );
  service.on('student:removed', (student) =>
    loggerInstance.log('student:removed', student)
  );
  service.on('student:replaced', (students) =>
    loggerInstance.log('student:replaced', { count: students.length })
  );
  service.on('student:loaded', (students) =>
    loggerInstance.log('student:loaded', { count: students.length })
  );
  service.on('student:error', (error) =>
    loggerInstance.error('student:error', error.message)
  );
}

function attachBackupEvents(backupManager, loggerInstance) {
  backupManager.on('backup:success', ({ filePath, timestamp, count }) => {
    loggerInstance.log('backup:success', {
      filePath,
      timestamp: new Date(timestamp).toISOString(),
      count,
    });
  });

  backupManager.on('backup:error', (error) =>
    loggerInstance.error('backup:error', error.message)
  );

  backupManager.on('backup:skipped', (skipped) =>
    loggerInstance.log('backup:skipped', skipped)
  );

  backupManager.on('backup:stopped', () =>
    loggerInstance.log('backup:stopped')
  );
}
