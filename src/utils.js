/**
 * Created on 2020/4/3 0003
 * @author: baronhuang
 * @desc: 框架的工具库
 */

/**
 * 通过 key.key1.key2 的方式给对象赋值
 * @param {Object} obj 需要赋值的对象
 * @param {string} key 需要赋值的键，多级用'.'来链接，格式如：key1.key2.key3等
 * @param {*} value 需要赋值的值
 */
export function setDeepObjectValue (obj, key, value) {
  const keyArray = key.split('.');
  while (keyArray.length > 1) {
    obj = obj[keyArray.shift()];
  }

  if (obj) {
    obj[keyArray[0]] = value;
  }
}

/**
 * 编译dom元素属性上的代码
 * @param {Object} instance 执行的实例
 * @param {string} code 需要编译的代码
 */
export function compileCode (instance, code) {
  code = `with (sandbox) { var __itemInfo={}; ${code} }`;
  // eslint-disable-next-line
  return new Function('sandbox', code)(instance);
}

/**
 * 根据传入的表达式和属性key，编译获取属性值
 * @param {Object} instance 执行实例
 * @param {string} dataExp v-data属性中的表达式
 * @param {string} key 属性key
 */
export function getItemKey (instance, dataExp, key) {
  let firstKey = key.split('.')[0];
  let keys = '';
  if (key.indexOf('.') !== -1) {
    keys = key.split('.').slice(1).map(v => `['${v}']`).join('');
  }

  // 如果有多级的key需要做处理再进行拼接，不然是无法准确地获取到key
  const code = `${dataExp};
  if (!__itemInfo['${firstKey}']) {
    return '${key}';
  } else {
    return __itemInfo['${firstKey}'] + ${JSON.stringify(keys)}
  }
  `;

  return compileCode(instance, code);
}

/**
 * 兼容方式返回v-data属性中表达式
 * @param {HTMLElement} item dom元素
 * @param {Boolean} isTemp 是否为临时变量，一把用在v-for里面
 * @returns {string}
 */
export function getDataExp (item, isTemp) {
  let dataExp = item.getAttribute('v-data');
  return dataExp ? `${dataExp}` : '';
}

/**
 * 执行filter方法
 * @param {Object} instance 执行实例
 * @param {string} key 当前需要执行的key
 * @param {string} code filter执行表达式
 * @param {string} dataExp v-data中的表达式
 */
export function runFilter (instance, key, code, dataExp) {
  // 匹配方法括号中的参数
  const regex = /\((.*)\)/;
  // 获取方法名
  const funName = code.replace(regex, '');
  const args = (code.match(regex) && code.match(regex)[0]) || '()';
  // 把实例上的key值和其他参数带入到filter方法分钟执行
  return compileCode(instance, `${dataExp}; return ${funName}.bind(this, ${key})${args} `);
}

/**
 * 获取数据的类型
 * @param {*} data 需要判断类型的数据
 * @returns {string} 数据类型
 */
export function getDataType (data) {
  // 这里必须要用instanceof Array，IE9中Array.isArray等方法是无法识别Proxy的数组
  if (data instanceof Array) {
    return 'Array';
  }

  return Object.prototype.toString.call(data).slice(8, -1);
}

/**
 * 给对象添加的原型上添加_parentkey标记父节点的属性值，一级级循环遍历添加
 * @param obj {Object} 需要标记的对象
 * @param parentKey {string} 父节点传下来的标记
 */
export function setParentKey (obj, parentKey = '') {
  if (parentKey) {
    let type = getDataType(obj);
    if (['Object', 'Array'].indexOf(type) !== -1) {
      // 数组和对象的prototype不一样，需要自定义
      let newType = type === 'Array' ? Object.create(Array.prototype) : Object.create(Object.prototype);
      newType._parentKey = parentKey;
      // 先设置当前的对象的parentKey
      setPrototypeOf(obj, newType);
      // 再遍历子对象设置parentKey
      setSubParentKey(obj, parentKey);
    }
  } else {
    setSubParentKey(obj, parentKey);
  }
}

/**
 * 递归设置子对象的parentKey
 * @param obj {Object} 需要标记的对象
 * @param parentKey {string} 父节点传下来的标记
 */
export function setSubParentKey (obj, parentKey = '') {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      let type = getDataType(obj[key]);
      if (['Object', 'Array'].indexOf(type) !== -1) {
        let newkeys = parentKey ? `${parentKey}.${key}` : key;
        // 数组和对象的prototype不一样，需要自定义
        let newType = type === 'Array' ? Object.create(Array.prototype) : Object.create(Object.prototype);
        newType._parentKey = newkeys;
        setPrototypeOf(obj[key], newType);
        setParentKey(obj[key], newkeys);
      }
    }
  }
}

/**
 * 兼容IE9的hack Object.setPrototypeOf
 * @param {Object} obj 需要设置prototype的对象
 * @proto {Object} prototype对象
 */
export const setPrototypeOf = Object.setPrototypeOf || function (obj, proto) {
  if (!isIE9()) {
    // eslint-disable-next-line
    obj.__proto__ = proto;
  } else {
    /** IE9 fix - copy object methods from the protype to the new object **/
    for (var prop in proto) {
      obj[prop] = proto[prop];
    }
  }

  return obj;
};

/**
 * 判断是否为IE9
 * @return {boolean}
 */
export function isIE9 () {
  return navigator.appVersion.indexOf('MSIE 9') > 0;
}

/**
 * 根据类型返回一个对象、数组或原始数据
 * @param {*} target 目标对象
 * @return {{}|*[]|*}
 */
function getTarget (target) {
  if (getDataType(target) === 'Array') {
    return [];
  } else if (getDataType(target) === 'Object') {
    return {};
  } else {
    return target;
  }
}

/**
 * 对象和数组的深拷贝，使用深度优先遍历算法
 * @param {*} origin 源对象
 * @return {[]|{}}
 */
export function deepClone (origin) {
  // 存放遍历过的key,value
  let stack = [];
  let target = getTarget(origin);
  if (target !== origin) {
    stack.push([origin, target]);
  }

  while (stack.length) {
    let [ori, tar] = stack.pop();
    for (let key in ori) {
      // 不遍历原型上的属性
      if (ori.hasOwnProperty(key)) {
        tar[key] = getTarget(ori[key]);
        if (tar[key] !== ori[key]) {
          stack.push([ori[key], tar[key]]);
        }
      }
    }
  }

  return target;
}
