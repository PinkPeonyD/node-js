const StudentsService = require('./services/StudentsService');
const BackupManager = require('./backup-manager');
const BackupReporter = require('./backup-reporter');
const { loadStudents } = require('./utils/FileUtils');
const Logger = require('./utils/Logger');
const Student = require('./models/Student');
const fs = require('fs');
const path = require('path');

// CLI args
const args = process.argv.slice(2); //это массив, содержащий аргументы командной строки:
//process.argv[0] — путь к исполняемому файлу Node.js
//process.argv[1] — путь к запускаемому JavaScript файлу
//process.argv[2] и далее — пользовательские аргументы
//Метод .slice(2) отрезает первые два элемента массива, оставляя только пользовательские аргументы.
const verbose = args.includes('--verbose');
const quiet = args.includes('--quiet');
const reportBackups = args.includes('--report-backups');

const logger = new Logger(verbose, quiet);

// File path for persistence
const DATA_FILE = path.join(__dirname, '..', 'students.json');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Load students from file or use initial data
async function loadInitialStudents() {
  if (fs.existsSync(DATA_FILE)) {
    logger.log('Loading students from file...');
    try {
      const data = await loadStudents(DATA_FILE);
      const restored = data.map(
        (item) => new Student(item.id, item.name, item.age, item.group)
      );
      logger.log(`Successfully loaded ${restored.length} students from file`);
      return restored;
    } catch (error) {
      logger.log('Error loading students from file:', error.message);
      logger.log('Using initial data instead');
      return [
        new Student('1', 'John Doe', 20, 2),
        new Student('2', 'Jane Smith', 23, 3),
        new Student('3', 'Mike Johnson', 18, 2),
      ];
    }
  }

  logger.log('No existing data file found. Using initial data');
  return [
    new Student('1', 'John Doe', 20, 2),
    new Student('2', 'Jane Smith', 23, 3),
    new Student('3', 'Mike Johnson', 18, 2),
  ];
}

async function main() {
  const students = await loadInitialStudents();
  const service = new StudentsService(students, {
    storagePath: DATA_FILE,
    logger,
  });
  const backupManager = new BackupManager(() => service.getAllStudents(), {
    backupDir: BACKUP_DIR,
    logger,
  });
  const reporter = new BackupReporter({ backupDir: BACKUP_DIR, logger });

  attachStudentEvents(service, logger);
  attachBackupEvents(backupManager, logger);

  try {
    await backupManager.start();

    logger.log('Initial Students');
    logger.log('All students:', await service.getAllStudents());

    logger.log('\n Adding a new student');
    const newStudent = await service.addStudent('Alice Brown', 21, 3);
    logger.log('Added student:', newStudent);

    logger.log('\nGetting student by ID');
    const foundStudent = await service.getStudentById(newStudent.id);
    logger.log('Found student:', foundStudent);

    logger.log('\nGetting students by group');
    const group2Students = await service.getStudentsByGroup(2);
    logger.log('Students in group 2:', group2Students);

    logger.log('\nCalculating average age');
    const avgAge = await service.calculateAverageAge();
    logger.log('Average age of all students:', avgAge);

    logger.log('\n Removing a student');
    const currentStudents = await service.getAllStudents();
    if (currentStudents.length > 0) {
      const studentToRemove = currentStudents[0];
      await service.removeStudent(studentToRemove.id);
      logger.log('Removed student with id', studentToRemove.id);
    } else {
      logger.log('No students available to remove');
    }
    logger.log('Remaining students:', await service.getAllStudents());

    logger.log('\nFinal average age');
    logger.log('New average age:', await service.calculateAverageAge());
  } finally {
    backupManager.stop();
    if (reportBackups) {
      await reporter.report();
    }
  }
}

main().catch((error) => {
  logger.log('Unexpected error:', error.message);
  process.exitCode = 1;
});

function attachStudentEvents(service, loggerInstance) {
  service.on('student:added', (student) =>
    loggerInstance.log('Event student:added', student)
  );
  service.on('student:removed', (student) =>
    loggerInstance.log('Event student:removed', student)
  );
  service.on('student:retrieved', ({ id, student }) =>
    loggerInstance.log('Event student:retrieved', {
      id,
      found: Boolean(student),
    })
  );
  service.on('student:group', ({ group, students: groupStudents }) =>
    loggerInstance.log('Event student:group', {
      group,
      count: groupStudents.length,
    })
  );
  service.on('student:list', (list) =>
    loggerInstance.log('Event student:list', { count: list.length })
  );
  service.on('student:average', (avg) =>
    loggerInstance.log('Event student:average', avg)
  );
  service.on('student:error', (error) =>
    loggerInstance.error('Event student:error', error.message)
  );
}

function attachBackupEvents(backupManager, loggerInstance) {
  backupManager.on('backup:success', ({ filePath, timestamp, count }) => {
    loggerInstance.log('Event backup:success', {
      filePath,
      timestamp: new Date(timestamp).toISOString(),
      count,
    });
  });

  backupManager.on('backup:error', (error) => {
    loggerInstance.error('Event backup:error', error.message);
  });

  backupManager.on('backup:skipped', (skipped) => {
    loggerInstance.log('Event backup:skipped', { skipped });
  });

  backupManager.on('backup:stopped', () => {
    loggerInstance.log('Event backup:stopped');
  });
}
