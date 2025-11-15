const Student = require('../models/Student');

class StudentsService {
  constructor(initialStudents = []) {
    this.students = [...initialStudents];
  }

  addStudent(name, age, group) {
    const id = String(Date.now());
    const student = new Student(id, name, age, group);
    this.students.push(student);
    return student;
  }

  removeStudent(id) {
    this.students = this.students.filter((s) => s.id !== id);
  }

  getStudentById(id) {
    return this.students.find((s) => s.id === id);
  }

  getStudentsByGroup(group) {
    return this.students.filter((s) => s.group === group);
  }

  getAllStudents() {
    return [...this.students];
  }

  calculateAverageAge() {
    if (this.students.length === 0) return 0;
    return (
      this.students.reduce((sum, s) => sum + s.age, 0) / this.students.length
    );
  }
}

module.exports = StudentsService;
