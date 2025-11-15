const StudentsService = require('./services/StudentsService');
const { saveToJSON, loadJSON } = require('./utils/FileUtils');
const Logger = require('./utils/Logger');
const Student = require('./models/Student');
const fs = require('fs');
const path = require('path');

// CLI args
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const quiet = args.includes('--quiet');

const logger = new Logger(verbose, quiet);

// File path for persistence
const DATA_FILE = path.join(__dirname, '..', 'students.json');

// Load students from file or use initial data
let students = [];
if (fs.existsSync(DATA_FILE)) {
  logger.log('Loading students from file...');
  try {
    const data = loadJSON(DATA_FILE);
    // Transform loaded data into Student objects
    students = data.map(
      (item) => new Student(item.id, item.name, item.age, item.group)
    );
    logger.log(`Successfully loaded ${students.length} students from file`);
  } catch (error) {
    logger.log('Error loading students from file:', error.message);
    logger.log('Using initial data instead');
    students = [
      new Student('1', 'John Doe', 20, 2),
      new Student('2', 'Jane Smith', 23, 3),
      new Student('3', 'Mike Johnson', 18, 2),
    ];
  }
} else {
  logger.log('No existing data file found. Using initial data');
  students = [
    new Student('1', 'John Doe', 20, 2),
    new Student('2', 'Jane Smith', 23, 3),
    new Student('3', 'Mike Johnson', 18, 2),
  ];
}

const service = new StudentsService(students);

logger.log('Initial Students');
logger.log('All students:', service.getAllStudents());

logger.log('\n Adding a new student');
const newStudent = service.addStudent('Alice Brown', 21, 3);
logger.log('Added student:', newStudent);

logger.log('\nGetting student by ID');
const foundStudent = service.getStudentById(newStudent.id);
logger.log('Found student:', foundStudent);

logger.log('\nGetting students by group');
const group2Students = service.getStudentsByGroup(2);
logger.log('Students in group 2:', group2Students);

logger.log('\nCalculating average age');
const avgAge = service.calculateAverageAge();
logger.log('Average age of all students:', avgAge);

logger.log('\n Removing a student');
service.removeStudent('1');
logger.log('Removed student with id "1"');
logger.log('Remaining students:', service.getAllStudents());

logger.log('\nFinal average age');
logger.log('New average age:', service.calculateAverageAge());

logger.log('\nSaving students to file');
try {
  saveToJSON(service.getAllStudents(), DATA_FILE);
  logger.log(
    `Successfully saved ${service.getAllStudents().length} students to ${DATA_FILE}`
  );
} catch (error) {
  logger.log('Error saving students to file:', error.message);
}
