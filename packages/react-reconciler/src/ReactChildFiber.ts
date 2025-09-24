import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import type { Fiber } from "./ReactInternalTypes";
import type { ReactElement } from "shared/ReactTypes";
import {
  createFiberFromElement,
  createFiberFromText,
  createWorkInProgress,
} from "./ReactFiber";
import { ChildDeletion, Placement } from "./ReactFiberFlags";
import { isArray } from "shared/utils";

type ChildReconciler = (
  returnFiber: Fiber,
  currentFirstChild: Fiber | null,
  newChild: any
  //   lanes: Lanes
) => Fiber | null;

export const reconcileChildFibers: ChildReconciler =
  createChildReconciler(true);
export const mountChildFibers: ChildReconciler = createChildReconciler(false);

function createChildReconciler(
  shouldTrackSideEffects: boolean
): ChildReconciler {
  function deleteChild(returnFiber: Fiber, childToDelete: Fiber) {
    if (!shouldTrackSideEffects) {
      // 初次渲染阶段，不需要删除节点
      return;
    }
    const deletions = returnFiber.deletions;
    if (deletions === null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags = ChildDeletion;
    } else {
      deletions.push(childToDelete);
    }
  }

  function deleteRemainingChildren(returnFiber: Fiber, currentFirstChild: Fiber) {
    if (!shouldTrackSideEffects) {
        // 初次渲染阶段，不需要删除节点
        return;
      }
    let childToDelete : Fiber | null = currentFirstChild;
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete);
      childToDelete = childToDelete.sibling;
    }
    return null;
  }

  // 给fiber节点， 添加 flags 标记， Placement 。。。
  function placeSingleChild(newFiber: Fiber): Fiber {
    // newFiber.alternate === null 表示这个一个全新的fiber节点， 这个节点需要插入到 DOM 中
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      newFiber.flags = Placement;
    }
    return newFiber;
  }

  // 协调单个文本节点
  function reconcileSingleTextNode(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null, // 更新阶段才会用到
    textContent: string
  ): Fiber {
    const created = createFiberFromText(textContent);
    created.return = returnFiber;
    return created;
  }

  function useFiber(fiber: Fiber, pendingProps: any) {
    const clone = createWorkInProgress(fiber, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
  }

  // 协调单个子节点, single 指的是element
  // new div.key = 1
  // old p span.key = 1 a
  function reconcileSingleElement(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    element: ReactElement
  ): Fiber {
    // 节点复用条件
    // ! 1. 同一层级下 2. key 相同 3. 类型相同
    const key = element.key;
    let child = currentFirstChild; // 老节点， 遍历老节复用
    while (child !== null) {
      if (child.key === key) {
        if (child.elementType === element.type) {
          // todo 存在复用节点，后面其他节点可以删除了， 因为新的只有一个新的element
          // deleteRemainingChildren(returnFiber, child.sibling);
          const existing = useFiber(child, element.props);
          existing.return = returnFiber;
          return existing;
        } else {
          // react 不认为同一层级下，有两个相同的key
          // key 相同，类型不同, 删除剩下全部节点
          // 举例：new  div.key = 1
          // old p  span.key = 1  a
          deleteRemainingChildren(returnFiber, child);
          break;
        }
      } else {
        // todo
        // 删除单个节点
        // 举例  {    count ? <h1>123</h1> : <h2>456</h2>  }
        // 将要删除的节点放到父dom节点的deletions数组中
        deleteChild(returnFiber, child);
      }
      // 老节点是单链表
      child = child.sibling;
    }

    // 初次渲染过程时，只创建fiber即可
    const createdFiber = createFiberFromElement(element);
    // coerceRef(created, element);
    createdFiber.return = returnFiber;
    return createdFiber;
  }

  // childArray 时创建fiber节点
  function createChild(returnFiber: Fiber, newChild: any): Fiber | null {
    // 文本节点
    if (isText(newChild)) {
      const created = createFiberFromText(newChild + "");
      created.return = returnFiber;
      return created;
    }

    // 检查newChild 的类型， 单个节点， 文本， 数组
    if (newChild != null && typeof newChild === "object") {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: // react element
          const created = createFiberFromElement(newChild);
          created.return = returnFiber;
          return created;
        default:
          break;
      }
    }

    return null;
  }

  // 函数需要返回头节点，也是父fiber的第一个子fiber
  function reconcileChildrenArray(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    newChildren: any[]
  ) {
    let resultFirstChild: Fiber | null = null; // 头节点
    let previousNewFiber: Fiber | null = null; // 保存遍历生产的fiber的上一个fiber
    let oldFiber = currentFirstChild; // 初次渲染为null

    let newIdx = 0;
    // 初次渲染
    if (oldFiber === null) {
      for (; newIdx < newChildren.length; newIdx++) {
        const newFiber = createChild(returnFiber, newChildren[newIdx]);
        if (newFiber === null) {
          continue;
        }
        newFiber.index = newIdx; // 记录节点在当前层级中的位置下标, 用于组件更新阶段，判断更新前后位置是否一致，不一致需要移动
        if (previousNewFiber === null) {
          // 如果previousNewFiber是null ，证明newFiber是头节点
          resultFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
      return resultFirstChild;
    }

    return resultFirstChild;
  }

  function reconcileChildFibers(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    newChild: any
  ): Fiber | null {
    if (isText(newChild)) {
      return placeSingleChild(
        reconcileSingleTextNode(returnFiber, currentFirstChild, newChild)
      );
    }

    // 检查newChild 的类型， 单个节点， 文本， 数组
    if (newChild != null && typeof newChild === "object") {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: // react element
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFirstChild, newChild)
          );
        default:
          break;
      }
    }

    // todo 其他类型
    // 子节点是数组
    if (isArray(newChild)) {
      return reconcileChildrenArray(returnFiber, currentFirstChild, newChild);
    }
    return null;
  }

  return reconcileChildFibers;
}

function isText(newChild: any) {
  return (
    (typeof newChild === "string" && newChild !== "") ||
    typeof newChild === "number"
  );
}
