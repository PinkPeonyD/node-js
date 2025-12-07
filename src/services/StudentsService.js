const EventEmitter = require('events');
const Student = require('../models/Student');
const { saveStudents } = require('../utils/FileUtils');

class StudentsService extends EventEmitter {
  constructor(initialStudents = [], options = {}) {
    super();
    const { storagePath = null, logger = console } = options;
    this.students = [...initialStudents];
    this.storagePath = storagePath;
    this.logger = logger;
  }

  async addStudent(name, age, group) {
    try {
      const id = String(Date.now());
      const student = new Student(id, name, age, group);
      this.students.push(student);
      await this.persistStudents();
      this.emit('student:added', student);
      return student;
    } catch (error) {
      this.emit('student:error', error);
      throw new Error(`Failed to add student: ${error.message}`);
    }
  }

  async removeStudent(id) {
    const existing = this.getStudentById(id);
    if (!existing) {
      const notFoundError = new Error(`Student with id ${id} not found`);
      this.emit('student:error', notFoundError);
      throw notFoundError;
    }
    try {
      this.students = this.students.filter((s) => s.id !== id);
      await this.persistStudents();
      this.emit('student:removed', existing);
    } catch (error) {
      this.emit('student:error', error);
      throw new Error(`Failed to remove student: ${error.message}`);
    }
  }

  getStudentById(id) {
    const student = this.students.find((s) => s.id === id);
    this.emit('student:retrieved', { id, student });
    return student;
  }

  getStudentsByGroup(group) {
    const students = this.students.filter((s) => s.group === group);
    this.emit('student:group', { group, students });
    return students;
  }

  getAllStudents() {
    const snapshot = [...this.students];
    this.emit('student:list', snapshot);
    return snapshot;
  }

  calculateAverageAge() {
    if (this.students.length === 0) return 0;
    const average =
      this.students.reduce((sum, s) => sum + s.age, 0) / this.students.length;
    this.emit('student:average', average);
    return average;
  }

  async persistStudents() {
    if (!this.storagePath) return;
    try {
      await saveStudents(this.students, this.storagePath);
    } catch (error) {
      if (this.logger && typeof this.logger.log === 'function') {
        this.logger.log('Failed to persist students:', error.message);
      }
      this.emit('student:error', error);
      throw error;
    }
  }
}

module.exports = StudentsService;
