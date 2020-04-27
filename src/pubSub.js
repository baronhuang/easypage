/**
 * Created on 2020/4/3 0003
 * @author: baronhuang
 * @desc: 发布订阅模式实现
 */

export class PubSub {
  constructor () {
    // 单例模式：每次实例化都是同一个对象
    if (!PubSub.instance) {
      this.events = {};
      PubSub.instance = this;
    }
    return PubSub.instance;
  }

  // 订阅
  subscribe (event, fn) {
    if (!this.events[event]) this.events[event] = [];

    this.events[event].push(fn);
  }

  // 发布
  publish () {
    var event = Array.prototype.shift.call(arguments);
    var fns = this.events[event];
    if (!event || !fns || fns.length === 0) return;

    for (var i = 0, len = fns.length; i < len; i++) {
      var fn = fns[i];
      fn.apply(this, arguments);
    }
  }

  remove (event, fn) {
    var fns = this.events[event];
    if (!fns) return;
    if (!fn) this.events[event] = [];

    for (var i = 0, len = fns.length; i < len; i++) {
      var _fn = fns[i];
      if (_fn === fn) {
        fns.splice(i, 1);
      }
    }
  }
}
