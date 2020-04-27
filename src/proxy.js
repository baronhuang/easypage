/**
 * Created on 2020/4/3 0003
 * @author: baronhuang
 * @desc: proxy对象相关工作，添加数据监听，值的传递等
 */

// import '@/libs/proxy/es6-proxy-polyfill';
import { Observer, Subject } from './observer';
import { PubSub } from './pubSub';
import { getDataType, setParentKey } from './utils';

let isNativeProxy = true;
if (!window.Proxy) {
  isNativeProxy = false;
  require('./es6-proxy-polyfill');
}

// 消息中心
const pubSub = new PubSub();

export class ProxyCenter {
  constructor () {
    // 组件内部的属性更新map，每个属性维护一个列表
    this.subjectMap = {};
    // 存储当前的模板对象，对于v-for这种需要根据模板来更新页面元素就非常有用
    this.templateMap = {};
    // 属性更新需要通信的子组件更新列表
    this.children = new Subject();
    // 是否为原生Proxy
    this.isNativeProxy = isNativeProxy;
    // 每个proxy的名称
    this.name = 'ProxyCenter' + new Date().getTime();
  }

  /**
   * 通知所有的监听器更新数据、模板、子组件等
   * @param target 监听的源对象
   * @param key 当前更新的key
   * @param value 当前更新的value
   * @param isReset 是否为重置赋值
   */
  notifyAll (target, key, value, isReset) {
    // 是否更新数组
    let isUpdateArray = isReset || (!isReset && key.indexOf('length') !== -1);

    // 通知当前组件内的监听
    this.subjectMap[key] && this.subjectMap[key].notify(value);
    pubSub.publish('#updateClass');
    pubSub.publish('#updateProp');
    pubSub.publish('#updateShow');

    // 因为IE9的Proxy只能监听数组长度变化，不能监听数组的元素变化
    if (this.isNativeProxy) {
      // 数组长度发生变量，需要触发模板的变更，需特殊处理
      if (target instanceof Array && isUpdateArray) {
        // 通知更新模板
        if (isReset) {
          this.templateMap[target._parentKey] && this.templateMap[target._parentKey].notify({ length: value.length, isReset: true });
        } else {
          this.templateMap[target._parentKey] && this.templateMap[target._parentKey].notify({ length: value, isReset: true });
        }
      }

      // 如果是重置赋值，需要传递整个对象
      if (isReset) {
        this.children.notify({ key: key, value: value, target: target });
      } else {
        this.children.notify({ key: key, value: value });
      }
    } else {
      // 如果是数组长度变化，需要延后执行，不然当前数组还是旧的
      if (target instanceof Array && isUpdateArray) {
        // 利用Promise的线程后置执行
        new Promise(resolve => resolve()).then(() => {
          this.children.notify({ key: key, value: value, target: target });
          if (isReset) {
            this.templateMap[target._parentKey] && this.templateMap[target._parentKey].notify({ length: value.length, isReset: true });
          } else {
            this.templateMap[target._parentKey] && this.templateMap[target._parentKey].notify({ length: value, isReset: true });
          }
        });
      } else {
        this.children.notify({ key: key, value: value });
      }
    }
  }

  /**
   * 初始化数据监听
   * @param {Object} instance 执行实例
   * @param {Object} $data 需要监听的数据对象
   */
  initProxyData ({ instance, $data }) {
    let handler = {
      get: (target, key, receiver) => {
        // 递归创建并返回
        if (typeof target[key] === 'object' && target[key] !== null) {
          return new Proxy(target[key], handler);
        }

        return target[key];
      },
      set: (target, key, value, receiver) => {
        // console.log('----this.temp' + this.name, target instanceof Array, notifyKey, `old: ${JSON.stringify(target[key])}`, `new: ${JSON.stringify(value)}`);
        let notifyKey = `${target._parentKey}.${key}`;
        if (['Object', 'Array'].indexOf(getDataType(value)) !== -1 && !value._parentKey) {
          setParentKey(value, notifyKey);
        }

        target[key] = value;
        this.notifyAll(target, notifyKey, value, false);
        return true;
      }
    };

    let $dataProxy = new Proxy($data, handler);

    // 遍历代理对象，重新对实例上
    for (let key in $dataProxy) {
      Object.defineProperty(instance, key, {
        get: () => {
          return $dataProxy[key];
        },
        set: (val) => {
          $data[key] = val;
          // 对于直接赋值的话，新的监听对象没有parentKey，需要手动设置回去
          if (['Object', 'Array'].indexOf(getDataType($data[key])) !== -1) {
            setParentKey($data[key], key);
          }

          this.notifyAll($data[key], key, $data[key], true);
        },
        configurable: true,
        enumerable: true
      });
    }
  }

  /**
   * 发现有dom节点存在数据监听，则新增观察者，数据更新时会更新页面内容
   * @param {Object} instance 执行实例
   * @param {string} key 监听的数据key
   * @param {Function} updateCb 执行的回调
   */
  addObserver (instance, key, updateCb) {
    // 把中括号转成点
    key = key.replace(/\[(.*?)\]/g, '.$1').replace(/'/g, '');
    // 若不是监听的key，则无需添加监听者
    if (!instance.hasOwnProperty(key.split('.')[0])) {
      return;
    }
    const observer = new Observer();
    observer.update = updateCb;
    if (!this.subjectMap[key]) {
      this.subjectMap[key] = new Subject();
    }

    this.subjectMap[key].addSub(observer);
  }

  /**
   * 添加数组的观察者，数据的监听会比值和对象要更加复杂些
   * @param {string} key 监听的key
   * @param {Function} updateCb 执行的回调
   */
  addArrayObserver (key, updateCb) {
    const observer = new Observer();
    observer.update = updateCb;
    if (!this.templateMap[key]) {
      this.templateMap[key] = new Subject();
    }

    this.templateMap[key].addSub(observer);
  }

  /**
   * 子组件的观察者，数据更新时会通知子组件更新，
   * @param {Function} updateCb 回调方法
   */
  addChildenObserver (updateCb) {
    const observer = new Observer();
    observer.update = updateCb;
    this.children.addSub(observer);
  }
}
