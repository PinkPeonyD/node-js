class Student {
  /**
   * @param {string} id
   * @param {string} name
   * @param {number} age
   * @param {string|number} group
   */
  constructor(id, name, age, group) {
    this.id = id;
    this.name = name;
    this.age = age;
    this.group = group;
  }
}

module.exports = Student;
