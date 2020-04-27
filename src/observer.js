/**
 * Created on 2020/4/3 0003
 * @author: baronhuang
 * @desc: 观察者模式
 */

// 被观察者
export class Subject {
  constructor () {
    this.subs = [];
  }

  addSub (sub) {
    this.subs.push(sub);
  }

  notify (val) {
    this.subs.forEach(sub => {
      sub.update(val);
    });
  }
}

// 观察者
export class Observer {
  update () {
    throw new Error('update 方法需要被重写！');
  }
}
