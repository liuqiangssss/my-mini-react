import type { Fiber } from "./ReactInternalTypes";
import {
  ClassComponent,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./ReactWorkTags";
import { isNum, isStr } from "shared/utils";

// 完成工作， 创建dom节点
export function completeWork(current: Fiber | null, workInProgress: Fiber) {
  const newProps = workInProgress.pendingProps;

  switch (workInProgress.tag) {
    case HostRoot:
    case ClassComponent:
    case Fragment:
    case FunctionComponent:
      return null;
    case HostText: {
      workInProgress.stateNode = document.createTextNode(newProps);
      return null;
    }
    case HostComponent: {
      // 原⽣标签,type是标签名
      const { type } = workInProgress;
      if (current !== null && workInProgress.stateNode !== null) {
        // 更新阶段
        updateHostComponent(current, workInProgress, type, newProps);
      } else {
        // mount 阶段, 才需要创建dom
        // 1 创建真是dom
        const instance = document.createElement(type);
        // 2 初始化dom属性
        finalizeInitialChildren(instance, null, newProps);
        // 3 把子dom挂在到父dom节点上
        appendAllChildren(instance, workInProgress);
        // 4 设置stateNode
        workInProgress.stateNode = instance;
      }

      return null;
    }
    default:
  }

  throw new Error(
    `Unknown unit of work tag (${workInProgress.tag}). This error is likely caused by a bug in ` +
      "React. Please file an issue."
  );
}

function updateHostComponent(
  current: Fiber,
  workInProgress: Fiber,
  type: string,
  newProps: any
) {
  if (current?.memoizedProps === newProps) {
    return;
  }
  finalizeInitialChildren(
    workInProgress.stateNode,
    current.memoizedProps,
    newProps
  );
}

// 初始化/ 更新dom属性
// old  {className = red, onClick = () => {}， data-test = '123'}
// new {className = blue, onClick = () => {}}
function finalizeInitialChildren(
  domElement: Element,
  prevProps: any,
  nextProps: any // 新的props
) {
  // 遍历老的
  for (const propKey in prevProps) {
    const prevProp = prevProps[propKey];
    if (propKey === "children") {
      if (isStr(prevProp) || isNum(prevProp)) {
        // 属性
        domElement.textContent = "";
      }
    } else {
      // 3. 设置属性
      if (propKey === "onClick") {
        domElement.removeEventListener("click", prevProp);
      } else {
        if (!(prevProp in nextProps)) {
          domElement[propKey] = "";
        }
      }
    }
  }

  for (const propKey in nextProps) {
    const nextProp = nextProps[propKey];
    if (propKey === "children") {
      if (isStr(nextProp) || isNum(nextProp)) {
        // 属性
        domElement.textContent = nextProp + "";
      }
    } else {
      // 3. 设置属性
      if (propKey === "onClick") {
        domElement.addEventListener("click", nextProp);
      } else {
        domElement[propKey] = nextProp;
      }
    }
  }
}

// 把子dom挂在到父dom节点上
// 如果父fiber是Fragment， 则需要找到子dom 最近的父dom元素上, 比如
// const fragment = (
//     <>
//       <>
//         <h3>123</h3>
//       </>
//       <h4>456</h4>
//       <>www</>
//     </>
//   );
function appendAllChildren(parent: Element, workInProgress: Fiber) {
  let nodeFiber = workInProgress.child; // 第一个子fiber, 链表

  while (nodeFiber !== null) {
    if (isHost(nodeFiber)) {
      parent.appendChild(nodeFiber.stateNode); // nodeFiber.stateNode 是dom节点
    } else if (nodeFiber.child !== null) {
      // stateNode 不是dom， 但是又有子节点， 比如Fragment
      nodeFiber = nodeFiber.child;
      continue;
    }

    if (nodeFiber === workInProgress) {
      return;
    }

    // 兄弟节点
    while (nodeFiber.sibling === null) {
      if (nodeFiber.return === null || nodeFiber.return === workInProgress) {
        return;
      }
      nodeFiber = nodeFiber.return;
    }

    nodeFiber = nodeFiber.sibling;
  }
}

// nodeFiber.stateNode 是dom节点
export function isHost(fiber: Fiber) {
  return fiber.tag === HostComponent || fiber.tag === HostText;
}
