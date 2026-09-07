export class BusyRegistry {
  constructor() {
    this.users = new Set()
  }

  has(userId) {
    return this.users.has(userId)
  }

  add(userId) {
    this.users.add(userId)
  }

  delete(userId) {
    this.users.delete(userId)
  }
}
