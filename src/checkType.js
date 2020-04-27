/**
 * Created on 2020/4/15 0015
 * @author: baronhuang
 * @desc: 类型检查
 */

import { getDataType } from './utils';

/**
 * 根据propTypes检查props的类型，并设置默认值
 * @param {Object} props 用户传入的props
 * @param {Object} propTypes 类型规则
 */
export function checkTypeAndSetDefault (props, propTypes) {
  if (propTypes) {
    if (propTypes.constructor.name !== 'Object') {
      throw new Error(`props 属性必须为 Object 类型`);
    }

    for (let key of Object.keys(propTypes)) {
      if (!props.hasOwnProperty(key)) {
        if (getDataType(propTypes[key]) === 'Object') {
          // 有设置default值首先设置
          if (propTypes[key].hasOwnProperty('default')) {
            props[key] = propTypes[key].default;
          }

          // 再判断必填项
          if (propTypes[key].required && !props.hasOwnProperty(key)) {
            throw new Error(`props.${key} 是必填项`);
          }
        }
      }
      // null和undefined会通过任何类型
      if (props[key] !== null && props[key] !== undefined) {
        // 获取propTypes[key]的类型
        let type = getDataType(propTypes[key]);
        if (type === 'Object') {
          let subType = propTypes[key].type;
          if (subType) {
            let dataType = getDataType(subType);
            if (dataType !== 'Function' && dataType !== 'Array') {
              throw new Error(`props.${key}.type 定义类型有误，需要指定类型或者包含类型的数组`);
            }
            checkTypeOption(props, subType, key);
          }
        } else {
          checkTypeOption(props, propTypes[key], key);
        }
      }
    }
  }
}

/**
 * 检查propType的type选项
 * @param {Object} props props对象
 * @param {Object} propType 当前需要检测的propType
 * @param {string} key props.key
 */
export function checkTypeOption (props, propType, key) {
  let type = getDataType(propType);
  switch (type) {
    // 一种数据类型
    case 'Function':
      if (props[key].constructor !== propType) {
        throw new Error(`props.${key} 必须为 ${propType.name} 类型`);
      }
      break;
    // 多种类型
    case 'Array':
      if (!propType.find(v => v === props[key].constructor)) {
        throw new Error(`props.${key} 必须为 ${propType.map(v => v.name).join('|')} 类型`);
      }
      break;
  }
}
