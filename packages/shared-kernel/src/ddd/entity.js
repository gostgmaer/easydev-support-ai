'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.Entity = void 0;
class Entity {
  _id;
  constructor(id) {
    this._id = id;
  }
  get id() {
    return this._id;
  }
  equals(object) {
    if (object === null || object === undefined) {
      return false;
    }
    if (this === object) {
      return true;
    }
    if (!(object instanceof Entity)) {
      return false;
    }
    return this._id === object._id;
  }
}
exports.Entity = Entity;
