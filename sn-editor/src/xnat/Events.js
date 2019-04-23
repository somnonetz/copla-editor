export class Events {

   constructor() {
      this.events = {};
      this.on = this.on.bind(this);
      this.emit = this.emit.bind(this);
   }

   on(event, callback) {
      (this.events[event] = this.events[event] || []).push(callback);
   }

   emit(event, ...args) {
      (this.events[event] || []).map(callback => callback(...args));
   }
}

const events = new Events(); // Singleton

export default events;
