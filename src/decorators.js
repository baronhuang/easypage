/**
 * Created on 2020/4/3 0003
 * @author: baronhuang
 * @desc: 内置 装饰器 decorator
 */

/**
 * easyPage初始化的参数
 * @param {HTMLElement} $el 需要监听的根元素
 * @param {string} exposeName 组件名称，一旦指定就会把组件暴露到window对象里
 * @param {string} template 可以通过模板的方式来初始化easyPage的内容，$el和template同时存在时，template优先级更高
 * @returns {function(*): *}
 */
export function $init ({ $el, exposeName, template }) {
  return function (target) {
    if ($el) {
      target.prototype.$el = $($el);
    }

    if (template) {
      target.prototype.$el = $(template);
    }

    if (exposeName) {
      if (window[exposeName]) {
        throw new Error(`window.${exposeName} 已经定义了，不能重复定义`);
      }
      window[exposeName] = target;
    }

    return target;
  };
}

/**
 * 定义当前方法是否暴露到window对象中
 * @param target
 * @param key
 * @param descriptor
 */
export function $expose (target, key, descriptor) {
  if (!target.$exposeList) {
    target.$exposeList = [];
  }
  target.$exposeList.push(key);
}

/**
 * 给dom元素添加事件，并触发class中的方法，跟jquery的.on()方法参数一致
 * @param {string} selector 事件的触发元素，jquery选择器方式
 * @param {string} event 事件名称
 * @param {string} childSelector 事件代理中的子元素
 * @param {*} data 需要传输的数据，放在event.data上
 * @returns {Function}
 */
export function $event (selector, event, childSelector, data) {
  if (!event) {
    throw new Error('event 参数为必填');
  }

  if (!selector) {
    throw new Error('selector 参数为必填');
  }

  return function (target, key, descriptor) {
    if (!target.$eventList) {
      target.$eventList = [];
    }
    target.$eventList.push({ selector, event, childSelector, data, fn: target[key] });
  };
}

/**
 * 把方法添加到自定义事件中，等价于this.$on(event, callback)方法
 * @param {string} event 事件名称
 * @returns {Function}
 */
export function $on (event) {
  return function (target, key, descriptor) {
    const fn = descriptor.value;
    if (typeof fn !== 'function') {
      throw new Error('$on 必须绑定 Function 类型');
    }

    if (!event) {
      throw new Error('事件名为必填');
    }

    if (!target.$onList) {
      target.$onList = [];
    }

    target.$onList.push({ fn, event });
  };
}

/**
 * 防抖函数
 * @param {number} time 多长时间以后执行原函数
 * @returns {Function}
 */
export function $debounce (time = 500) {
  let timer;
  return (target, name, descriptor) => {
    const fn = descriptor.value;
    if (typeof fn === 'function') {
      descriptor.value = function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          fn.apply(this, args);
        }, time);
      };
    }
  };
}

/**
 * 节流函数
 * @param {number} time 单位事件内只触发一次函数
 * @returns {Function}
 */
export function $throttle (time = 1000) {
  let prev = new Date();
  return (target, name, descriptor) => {
    const fn = descriptor.value;
    if (typeof fn === 'function') {
      descriptor.value = function (...args) {
        const now = new Date();
        if (now - prev > time) {
          fn.apply(this, args);
          prev = new Date();
        }
      };
    }
  };
}
