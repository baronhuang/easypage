/**
 * Created on 2020/4/3 0003
 * @author: baronhuang
 * @desc: 内置 directive 的初始化
 */
import { compileCode, getItemKey, getDataExp, runFilter } from './utils';
import { PubSub } from './pubSub';

// 消息中心
const pubSub = new PubSub();

/**
 * 遍历dom元素，把服务器端渲染的内容赋值给$data
 * @param instance 执行实例
 */
export function assignAttrTo$data ({ instance }) {
  const textNode = [];
  const arrayNode = [];
  const dataNode = [];
  const modelNode = [];
  instance.$el.find('[v-text], [v-array], [v-data], [v-model]').each(function (i, item) {
    if (item.getAttribute('v-text')) {
      textNode.push(item);
    }

    if (item.getAttribute('v-array')) {
      arrayNode.push(item);
    }

    if (item.getAttribute('v-data')) {
      dataNode.push(item);
    }

    if (item.getAttribute('v-model')) {
      modelNode.push(item);
    }
  });

  // 先初始化数组类型的节点，个数要先确定下来，方便后期赋值
  $(arrayNode).each((i, item) => {
    const key = item.getAttribute('v-array');
    instance[key].push({});
  });

  // 编译v-data的表达式
  $(dataNode).each((i, item) => {
    let dataExp = getDataExp(item);
    compileCode(instance, ` ${dataExp} `);
  });

  // 把v-text类型的内容赋值给$data
  $(textNode).each((i, item) => {
    const key = item.getAttribute('v-text');
    // 如果有v-no标记第一次不会获取textContent来初始化值
    if (!item.hasAttribute('v-no')) {
      compileCode(instance, ` ${key} = '${item.textContent.trim()}' `);
    }
  });

  // 输入框的值赋值给$data
  $(modelNode).each((i, item) => {
    const key = item.getAttribute('v-model');
    compileCode(instance, ` ${key} = '${item.value.trim()}' `);
  });
}

/**
 * 初始化v-text
 * @param instance 执行实例
 * @param textNode v-text的节点
 * @param isCompile 是否编译，如果是true，则会把当前的$data赋值到节点上
 */
export function initText ({ instance, textNode, isCompile }) {
  $(textNode).each((i, item) => {
    let [key, filter = ''] = item.getAttribute('v-text').split('|');
    key = key.trim();
    filter = filter.trim();
    let dataExp = getDataExp(item);
    key = getItemKey(instance, dataExp, key);

    const callback = () => {
      // 如果当前存在filter
      if (filter) {
        item.textContent = runFilter(instance, key, filter, dataExp);
      } else {
        // console.log('-----1111111 ', `${dataExp}; return ${key} `);
        item.textContent = compileCode(instance, `${dataExp}; return ${key} `);
      }
    };

    // 编译的情况要先执行
    if (isCompile) {
      callback();
    }

    // 添加数据监听
    instance.$proxyCenter.addObserver(instance, key, callback);
  });
}

/**
 * 初始化v-attr，把里面的表达式编译成真正的属性
 * @param instance
 * @param attrNode
 * @param isCompile
 */
export function initAttr ({ instance, attrNode, isCompile }) {
  $(attrNode).each((i, item) => {
    const attrExp = item.getAttribute('v-attr');
    let dataExp = getDataExp(item);

    const callback = () => {
      const attrObject = compileCode(instance, `${dataExp}; return ${attrExp}`);
      for (let attrName in attrObject) {
        if ($(item).attr(attrName) !== attrObject[attrName]) {
          $(item).attr(attrName, attrObject[attrName]);
        }
      }
    };

    // if (isCompile) {
    //   callback();
    // }
    callback();

    pubSub.subscribe('#updateProp', callback);
  });
}

/**
 * 初始化v-class
 * @param instance
 * @param classNode
 * @param isCompile
 */
export function initClass ({ instance, classNode, isCompile }) {
  $(classNode).each((i, item) => {
    const classExp = item.getAttribute('v-class');
    let dataExp = getDataExp(item);

    const callback = () => {
      const classObject = compileCode(instance, `${dataExp}; return ${classExp}`);
      for (let className in classObject) {
        if (classObject[className]) {
          $(item).addClass(className);
        } else {
          $(item).removeClass(className);
        }
      }
    };
    // if (isCompile) {
    //   callback();
    // }
    callback();
    pubSub.subscribe('#updateClass', callback);
  });
}

/**
 * 初始化v-model
 * @param instance
 * @param modelNode
 * @param isCompile
 */
export function initModel ({ instance, modelNode, isCompile }) {
  $(modelNode).each((i, item) => {
    if (item.tagName === 'INPUT' || item.tagName === 'TEXTAREA') {
      let $item = $(item);
      let key = item.getAttribute('v-model');
      let dataExp = getDataExp(item);
      key = getItemKey(instance, dataExp, key);

      const callback = (val) => {
        item.value = compileCode(instance, `${dataExp}; return ${key} `);
      };

      if (isCompile) {
        callback();
      }

      instance.$proxyCenter.addObserver(instance, key, callback);
      let isInputZh = false;

      // 修复iphone中中文输入法的问题
      const onCompositionStart = function (e) {
        isInputZh = true;
      };
      const onCompositionEnd = function (e) {
        isInputZh = false;
        // iphone8以下的浏览器需要手动触发一个input事件，非常坑
        let event = document.createEvent('HTMLEvents');
        event.initEvent('input');
        e.target.dispatchEvent(event);
      };

      // 监听用户输入
      $item.on('input', function (e) {
        if (isInputZh) return;
        // 这里一定要用JSON.stringify转一下，不然用户输入''时会出现编译出错
        compileCode(instance, `${dataExp}; ${key} = ${JSON.stringify(e.target.value)} `);
      });

      $item.on('compositionstart', onCompositionStart);
      $(item).on('compositionend', onCompositionEnd);

      // // 文本框聚焦事件兼容ios键盘弹出以后收不回去的bug
      // $item.on('focus', function (e) {
      //   setTimeout(function () {
      //     e.target.scrollIntoView(true);
      //   }, 100);
      // });
      //
      // // 文本框失焦事件(处理ios兼容问题)
      // $item.on('blur', function (e) {
      //   setTimeout(function () {
      //     e.target.scrollIntoView(false);
      //   }, 100);
      // });
    }
  });
}

/**
 * 初始化v-show
 * @param instance
 * @param showNode
 * @param isCompile
 */
export function initShow ({ instance, showNode, isCompile }) {
  $(showNode).each((i, item) => {
    const key = item.getAttribute('v-show');
    let dataExp = getDataExp(item);

    const callback = () => {
      const value = compileCode(instance, `${dataExp}; return ${key} `);
      value ? $(item).show() : $(item).hide();
    };

    // if (isCompile) {
    //   callback();
    // }

    callback();

    // instance.$proxyCenter.addObserver(instance, key, callback);
    pubSub.subscribe('#updateShow', callback);
  });
}

/**
 * 初始化v-on
 * @param instance
 * @param eventNode
 */
export function initEvent ({ instance, eventNode }) {
  $(eventNode).each((i, item) => {
    // v-on中可以多个事件，用‘,’隔开
    let eventList = [];
    let eventTpl = item.getAttribute('v-on');
    let match;
    // 匹配 ),前面的内容
    let reg = /([^)]+\))?((?=\s*,)+)/;
    // 如果有多个事件表达式，需要做拆开出来
    if (reg.exec(eventTpl)) {
      while ((match = reg.exec(eventTpl)) !== null) {
        if (match[1]) {
          eventTpl = eventTpl.replace(match[1], '');
          eventTpl = eventTpl.replace(/^(\s*,)?/, '');
          eventList.push(match[1]);
        } else {
          eventTpl = eventTpl.replace(/^(\s*,)?/, '');
          eventList.push(eventTpl);
          break;
        }
      }
    } else {
      eventList.push(eventTpl);
    }

    for (let eventItem of eventList) {
      // 把如click=alert()，切割开[事件, 方法]
      let [event, funName] = eventItem.split('=');
      event = event.trim();
      funName = funName.trim();
      const dataExp = item.getAttribute('v-data');
      $(item).on(event, null, null, (event) => {
        // console.log('---initEvent', `${dataExp}; ${funName}`);
        compileCode(instance, `${dataExp}; ${funName}`);
      });
    }
  });
}

/**
 * 初始化v-for
 * @param instance
 * @param forNode
 * @param isCompile
 */
export function initFor ({ instance, forNode, isCompile }) {
  // 只能够在编译状态下执行
  if (isCompile) {
    $(forNode).each((i, node) => {
      const $node = $(node);
      const exp = node.getAttribute('v-for');
      // 假如标签为v-for="(item, index) in list"，正则表示：itemName='item', indexName='index', listName='list'
      const [itemName, indexName] = exp.match(/\((.*)\)/)[1].split(',').map(v => v.trim());
      const listName = exp.slice(exp.lastIndexOf(' ') + 1);
      let listHtml = '';
      let $lastNode;
      // 注释标记，当列表为空时，当做插入的标记
      let comment = $(`<!--v-for:${listName}-->`);
      // 插入到v-for节点前面
      comment.insertBefore($node);

      // 构造html
      instance[listName].forEach((item, index) => {
        const clone = $node.clone();
        // 把v-for里面的内容编译成item=list[0],index=0这种格式，这样其他标签才能识别
        const dataExp = `var ${itemName}=${listName}[${index}], ${indexName}=${index}, __itemInfo={${itemName}: '${listName}[${index}]', ${indexName}: '${index}'} `;
        clone
          .attr('v-data', dataExp)
          .find('*').attr('v-data', dataExp);
        listHtml += clone[0].outerHTML;
      });

      // 把构造的html替换原来的v-for节点
      let $listHtml = $(listHtml);
      let curLength = $listHtml.length;
      $lastNode = $($listHtml[curLength - 1]);
      $node.replaceWith($listHtml);

      instance.$proxyCenter.addArrayObserver(listName, ({ length, isReset }) => {
        // 重置，需要删除模板上的元素，然后重新初始化
        if (isReset) {
          for (let index = 0; index < curLength; index++) {
            let prevNode = $lastNode.prev();
            $lastNode.remove();
            $lastNode = prevNode;
          }

          curLength = 0;
        }
        // 删除数组
        if (length < curLength) {
          for (let index = 0; index < curLength - length; index++) {
            let prevNode = $lastNode.prev();
            $lastNode.remove();
            $lastNode = prevNode;
          }
          // 添加数组
        } else if (length > curLength) {
          // 如果当前元素为空，则取注释作为第一个节点
          if (curLength === 0) {
            $lastNode = comment;
          }

          for (let index = curLength; index < length; index++) {
            const clone = $node.clone();
            // 把v-for里面的内容编译成item=list[0],index=0这种格式，这样其他标签才能识别
            const dataExp = `var ${itemName}=${listName}[${index}], ${indexName}=${index}, __itemInfo={${itemName}: '${listName}[${index}]', ${indexName}: '${index}'} `;
            clone
              .attr('v-data', dataExp)
              .find('*').attr('v-data', dataExp);
            $lastNode.after(clone);
            $lastNode = clone;
            instance._initDirective({ $el: $lastNode, isCompile: true });
          }
        }

        // 更新当前的curLength
        curLength = length;
      });
    });
  }
}

/**
 * 删除元素的所有自定义属性
 * @param {Element} $el dom元素
 * @param {Array} $attrs 属性列表
 */
export function removeAttr ($el, $attrs) {
  const attrList = $attrs.map(v => `[${v}]`).join(',');
  $el.find(attrList).andSelf().each((i, item) => {
    $(item).removeAttr($attrs.join(' '));
  });
}
