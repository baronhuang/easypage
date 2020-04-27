/**
 * Created on 2020/4/3 0003
 * @author: baronhuang
 * @desc: easyPage 主类，轻量级的vue，可用做数据绑定，面向对象的方式来开发
 */

import { assignAttrTo$data, initAttr, initClass, initEvent, initFor, initModel, initShow, initText, removeAttr } from './directives';
import { setDeepObjectValue, getDataType, setParentKey, deepClone } from './utils';
import { checkTypeAndSetDefault } from './checkType';
import { PubSub } from './pubSub';
import { ProxyCenter } from './proxy';

// 消息中心
const pubSub = new PubSub();

export class EasyPage {
  /**
   * 初始化时可以传入一些选项
   * @param {boolean} isAssign 是否把egg渲染的值赋值给$data，一般用在根组件
   * @param {Object} prop 传递父组件中的属性到子组件
   */
  constructor ({ isAssign = false, prop = {} } = {}) {
    // 获取this的原型
    const prototype = Object.getPrototypeOf(this);
    // 从组件外面传进来的属性，可用来访问父组件的属性
    prototype.$prop = {};
    // 组件内部定义的属性
    prototype.$data = {};
    // 父组件的this引用
    prototype.$parent = null;
    // 子组件列表
    prototype.$children = {};
    // 自定义的directive列表
    prototype.$attrs = ['v-text', 'v-on', 'v-array', 'v-class', 'v-model', 'v-data', 'v-show', 'v-for', 'v-attr'];
    // 数据监控类
    prototype.$proxyCenter = new ProxyCenter();
    // 当前组件和父组件之间的prop映射
    prototype.$propMap = {};

    // 首先初始化prop
    this.init$propMap(prop);
    this.init$prop(prop);
    // 检测数据类型
    checkTypeAndSetDefault(this.$prop, this.constructor.propTypes);

    new Promise(resolve => resolve()).then(() => {
      if (isAssign) {
        assignAttrTo$data({ instance: this });
      }
      // 反向赋值和isCompile选项互斥
      this._init({ isCompile: !isAssign });
      // 执行初始化完成回调
      this.inited && this.inited();
    });
  }

  /**
   * 初始化组件
   * @param {Boolean} isCompile 是否为动态编译方式
   * @private
   */
  _init ({ isCompile }) {
    this.init$Data();
    this.$proxyCenter.initProxyData({ instance: this, $data: this.$prop });
    this.$proxyCenter.initProxyData({ instance: this, $data: this.$data });
    this._initDirective({ $el: this.$el, isCompile });
    this.init$Expose();
    this.init$event();
    this.init$on();
  }

  /**
   * 初始化内置directive
   * @param {HTMLElement} $el 需要初始化的元素
   * @param {Boolean} isCompile 是否为动态编译
   * @private
   */
  _initDirective ({ $el = this.$el, isCompile }) {
    // for循环必须放第一个初始化，因为涉及编译代码
    initFor({ instance: this, forNode: $el.find('[v-for]'), isCompile });

    const textNode = [];
    const classNode = [];
    const modelNode = [];
    const showNode = [];
    const eventNode = [];
    const attrNode = [];
    const attrList = this.$attrs.map(v => `[${v}]`).join(',');
    $el.find(attrList).andSelf().each(function (i, item) {
      if (item.getAttribute('v-text')) {
        textNode.push(item);
      }

      if (item.getAttribute('v-class')) {
        classNode.push(item);
      }

      if (item.getAttribute('v-model')) {
        modelNode.push(item);
      }

      if (item.getAttribute('v-show')) {
        showNode.push(item);
      }

      if (item.getAttribute('v-on')) {
        eventNode.push(item);
      }

      if (item.getAttribute('v-attr')) {
        attrNode.push(item);
      }
    });

    initText({ instance: this, textNode, isCompile });
    initAttr({ instance: this, attrNode, isCompile });
    initClass({ instance: this, classNode, isCompile });
    initModel({ instance: this, modelNode, isCompile });
    initShow({ instance: this, showNode, isCompile });
    initEvent({ instance: this, eventNode });

    // 初始化完需要把标签去掉
    removeAttr($el, this.$attrs);
  }

  /**
   * 初始化传入的prop，深拷贝
   * @param {Object} prop
   */
  init$prop (prop) {
    if (getDataType(prop) !== 'Object') {
      throw new Error('prop 必须为对象类型');
    }
    // 整个$prop深拷贝，这里不放入$data，涉及到属性父级传递
    for (let key of Object.keys(prop)) {
      let type = getDataType(prop[key]);
      let subKey = key.slice(key.indexOf(':') + 1);
      if (type === 'Object' || type === 'Array') {
        this.$prop[subKey] = deepClone(prop[key]);
      } else {
        this.$prop[subKey] = prop[key];
      }
    }

    setParentKey(this.$prop);
  }

  /**
   * 初始化$data
   */
  init$Data () {
    let { $data, $prop } = Object.getPrototypeOf(this);
    for (let key of Object.keys(this)) {
      // prop没有的属性才进行深拷贝
      if ($prop.hasOwnProperty(key)) {
        throw new Error(`属性 \`${key}\` 不能跟 prop 的属性重复`);
      }
      let type = getDataType(this[key]);
      if (type === 'Object' || type === 'Array') {
        $data[key] = deepClone(this[key]);
      } else {
        $data[key] = this[key];
      }
    }

    setParentKey($data);
  }

  /**
   * 初始化prop映射
   * @param {Object} prop $prop对象
   */
  init$propMap (prop) {
    let { $propMap } = Object.getPrototypeOf(this);
    for (let key of Object.keys(prop)) {
      let splitIndex = key.indexOf(':') + 1;
      let subKey;
      let parentKey;
      if (splitIndex > 0) {
        subKey = key.slice(splitIndex);
        parentKey = key.slice(0, splitIndex - 1);
      } else {
        subKey = key;
        parentKey = key;
      }

      subKey = key.trim();
      parentKey = key.trim();
      $propMap[parentKey] = subKey;
    }
  }

  /**
   * 初始化 $on 装饰器的事件列表
   */
  init$event () {
    this.$eventList && this.$eventList.forEach(({ selector, event, childSelector, data, fn }) => {
      $(selector).on(event, childSelector, data, fn.bind(this));
    });
  }

  /**
   * 初始化需要暴露全局的属性列表
   */
  init$Expose () {
    this.$exposeList && this.$exposeList.forEach((key) => {
      window[key] = this[key].bind(this);
    });
  }

  init$on () {
    this.$onList && this.$onList.forEach(({ event, fn }) => {
      pubSub.subscribe(event, fn.bind(this));
    });
  }

  /**
   * 编译html模板，使其变成可供框架操控的元素
   * @param {string|HTMLElement} template 需要编译的模板，可以是html元素
   * @returns {*|jQuery.fn.init|jQuery|HTMLElement} 返回编译后的模板
   */
  $compile (template = this.$el) {
    const el = $(template);
    this._initDirective({ $el: el, isCompile: true });
    return el;
  }

  /**
   * 父组件更新子组件的数据
   * @param key 全称key
   * @param firstKey 第一个key
   * @param value
   * @param target
   */
  update$Prop ({ key, firstKey, value, target }) {
    if (this.$prop.hasOwnProperty(firstKey)) {
      // 如果是数据，需要做特殊处理
      if (target instanceof Array) {
        const copy = deepClone(target);
        // 非常重要，触发模板长度变化，若是非原生proxy，需要前置
        !this.$proxyCenter.isNativeProxy && (this[firstKey].length = copy.length);
        for (let i = 0; i < copy.length; i++) {
          this[firstKey][i] = copy[i];
        }
        this.$proxyCenter.isNativeProxy && (this[firstKey].length = copy.length);
      } else {
        setDeepObjectValue(this, key, value);
      }
    }
  }

  /**
   * 把子组件挂载到父组件
   * @param {Object} parentThis 父组件的this引用
   * @param {HTMLElement} slot 父组件中的挂载点元素
   * @param {Object} options 选项
   * @param {string} options.type 挂载的方式，append(默认): 挂载到组件内部, replace: 替换挂载点
   * @param {string} options.name 组件的名称，父组件可通过this.$children[name]来访问
   */
  $mount (parentThis, slot, { type = 'append', name = '' } = {}) {
    Object.getPrototypeOf(this).$parent = parentThis;
    if (name) {
      parentThis.$children[name] = this;
    }

    // 监听父组件传入到子组件的属性，同步父组件的data到子组件的prop中
    parentThis.$proxyCenter.addChildenObserver(({ key, value, target }) => {
      let firstKey = key.split('.')[0];
      let realKey;
      // console.log(1111, firstKey, this.$propMap);
      if (this.$propMap[key]) {
        // 根据prop属性key映射，返回真实的更新key
        // firstKey = this.$propMap[firstKey];
        realKey = key;
        this.update$Prop({ key: realKey, firstKey, value, target });
      } else {
        let updateKeys = Object.keys(this.$propMap).filter(v => v.split(':')[0].trim() === firstKey);
        for (let updateKey of updateKeys) {
          if (updateKeys.indexOf(':') !== -1) {
            let temp = updateKey.split(':');
            if (temp[1]) {
              realKey = key.replace(new RegExp(`^${firstKey}`), temp[1]);
              firstKey = realKey.split('.')[0];
              // console.log('------------realKey', realKey, firstKey);
              this.update$Prop({ key: realKey, firstKey, value, target });
            }
          } else {
            realKey = key;
            this.update$Prop({ key: realKey, firstKey, value, target });
          }
        }
      }

      // let realKey = key.split('.');
      // realKey[0] = firstKey;
      // realKey = realKey.join('.');
      // console.log('-------realKey1', realKey);
    });
    if (type === 'replace') {
      $(slot).replaceWith(this.$el);
    } else {
      $(slot).append(this.$el);
    }
  }

  /**
   * 自定义事件，可以用于子组件通信父组件，或者是兄弟组件通信
   * @param {string} event 事件名称
   * @param {Function} callback 事件回调
   */
  $on (event, callback) {
    pubSub.subscribe(event, callback.bind(this));
  }

  /**
   * 触发自定义事件
   * @param {string} event 事件名称
   * @param {*} data 需要传入事件回调的参数
   */
  $emit (event, data = null) {
    pubSub.publish(event, data);
  }
}
