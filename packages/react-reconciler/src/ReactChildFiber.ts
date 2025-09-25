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
import { HostText } from "./ReactWorkTags";

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

  function deleteRemainingChildren(
    returnFiber: Fiber,
    currentFirstChild: Fiber
  ) {
    if (!shouldTrackSideEffects) {
      // 初次渲染阶段，不需要删除节点
      return;
    }
    let childToDelete: Fiber | null = currentFirstChild;
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

  function updateTextNode(
    returnFiber: Fiber,
    current: Fiber | null,
    textContent: string
  ) {
    if (current === null || current.tag !== HostText) {
      const created = createFiberFromText(textContent);
      created.return = returnFiber;
      return created;
    } else {
      // 老节点是文本， 满足复用三条件
      const existing = useFiber(current, textContent);
      existing.return = returnFiber;
      return existing;
    }
  }

  function updateElement(
    returnFiber: Fiber,
    current: Fiber | null,
    element: ReactElement
  ) {
    const { type, props: pendingProps } = element;
    if (current !== null) {
      if (current.elementType === type) {
        const existing = useFiber(current, pendingProps);
        existing.return = returnFiber;
        return existing;
      }
    }
    const created = createFiberFromElement(element);
    created.return = returnFiber;
    return created;
  }

  function updateSlot(
    returnFiber: Fiber,
    oldFiber: Fiber | null,
    newChild: any
  ) {
    //  判断节点是否可以复用
    const key = oldFiber ? oldFiber.key : null;
    if (isText(newChild)) {
      if (key !== null) {
        // 新节点是文本，老节点不是文本， 文本节点没有key
        return null;
      }
      // 有可能可以复用, 没有key也会走这里
      return updateTextNode(returnFiber, oldFiber, newChild);
    }

    if (typeof newChild === "object" && newChild !== null) {
      if (newChild.key === key) {
        return updateElement(returnFiber, oldFiber, newChild);
      } else {
        return null;
      }
    }
    return null;
  }

  function placeChild(
    newFiber: Fiber,
    lastPlacedIndex: number, // 记录的是新fiber在老fiber上的位置
    newIdx: number
  ) {
    newFiber.index = newIdx;

    if (!shouldTrackSideEffects) {
      return lastPlacedIndex;
    }
    // 判断节点位置是否发生相对位置的变化，是否需要移动
    const current = newFiber.alternate;
    if (current !== null) {
      const oldIndex = current.index;
      if (oldIndex < lastPlacedIndex) {
        // 0 1 2
        // 0 2 1
        // 节点需要移动位置
        newFiber.flags = Placement;
        return lastPlacedIndex;
      } else {
        return oldIndex;
      }
    } else {
      // 新增节点
      newFiber.flags = Placement;
      return lastPlacedIndex;
    }
  }

  function mapRemainingChildren(oldFiber: Fiber): Map<string | number, Fiber> {
    const existingChildren = new Map<string | number, Fiber>();
    let existingChild: Fiber | null = oldFiber;
    while (existingChild !== null) {
      existingChildren.set(
        existingChild.key === null ? existingChild.index : existingChild.key,
        existingChild
      );
      existingChild = existingChild.sibling;
    }
    return existingChildren;
  }

  function updateFromMap(existingChildren: Map<string | number, Fiber>, returnFiber: Fiber, newIdx: number, newChild: any) {
    if (isText(newChild)) {
      const matchedFiber = existingChildren.get(newIdx) || null;
      return updateTextNode(returnFiber, matchedFiber, newChild + "");
    } else {
        const matchedFiber = existingChildren.get(newChild.key === null ?newIdx : newChild.key) || null;
        return updateElement(returnFiber, matchedFiber, newChild);
    }
  }

  // 函数需要返回头节点，也是父fiber的第一个子fiber
  function reconcileChildrenArray(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null, // 当前fiber 的第一个子节点
    newChildren: any[]
  ) {
    let resultFirstChild: Fiber | null = null; // 头节点
    let previousNewFiber: Fiber | null = null; // 保存遍历生产的fiber的上一个fiber
    let oldFiber = currentFirstChild; // 初次渲染为null
    let nextOldFiber: Fiber | null = null; // oldFiber.sibling
    let newIdx = 0;
    let lastPlacedIndex = 0;

    // old  0 1 2 3 4
    // new  0 1 2 3
    // ! 1 从左往右遍历，按位置比较，如果可以复用，那就复用，不能复用， 退出本轮
    // 第一轮：按顺序逐一比较，能复用就复用
    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      // 老节点的位置比当前要处理的新节点位置更靠后
      // * 说明中间有节点被删除了或 位置发生了变化
      // 需要暂停当前老节点的复用，跳过这次匹配
      if (oldFiber.index > newIdx) {
        nextOldFiber = oldFiber;
        oldFiber = null; //* 避免在第一轮遍历中处理复杂的位置变化，将其留给后续的优化阶段
      } else {
        nextOldFiber = oldFiber.sibling; // 正常情况，移动到下一个兄弟节点
      }
      // 尝试复用或创建新节点
      const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx]);
      if (newFiber === null) {
        if (oldFiber === null) {
          //处理特殊情况：当 oldFiber.index > newIdx 时，oldFiber 被人为置为 null。
          // 如果 oldFiber 是因为 index > newIdx 被人为置空的
          // 需要还原，确保剩余老节点能被第三轮正确处理
          oldFiber = nextOldFiber;
        }
        break;
      }

      // 组件更新阶段
      if (shouldTrackSideEffects) {
        //  当前位置存在老节点
        // ✅ 成功创建了新节点（newFiber !== null，因为前面已经检查过）
        // ❌ 但是新节点没有复用老节点（alternate === null）
        if (oldFiber && newFiber?.alternate === null) {
          deleteChild(returnFiber, oldFiber); // 因为老节点没有被复用，需要从 DOM 中删除！
        }
      }

      // 判断节点在dom的相对位置是否发生变化
      //   组件更新阶段，判断更新前后位置是否一致，不一致需要移动
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx); // lastPlacedIndex上一次位置，newIdx新的位置

      if (previousNewFiber === null) {
        // 如果previousNewFiber是null ，证明newFiber是头节点
        resultFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }

    // ! 2.1 老节点还有，新节点没了， 删除剩余的老节点
    if (newIdx === newChildren.length) {
      deleteRemainingChildren(returnFiber, oldFiber as Fiber);
      return resultFirstChild;
    }

    // ! 2.2 新节点还有，老节点没了， 创建新节点
    // 包括初次渲染 // 如果老节点已经用完，直接创建剩余的新节点
    if (oldFiber === null) {
      for (; newIdx < newChildren.length; newIdx++) {
        const newFiber = createChild(returnFiber, newChildren[newIdx]);
        if (newFiber === null) {
          continue;
        }
        // newFiber.index = newIdx; // 记录节点在当前层级中的位置下标, 用于组件更新阶段，判断更新前后位置是否一致，不一致需要移动
        // 组件更新阶段，判断更新前后位置是否一致，不一致需要移动
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx); // lastPlacedIndex上一次位置，newIdx新的位置

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

    // ! 3 新老节点都还有
    // [01234] [0124]
    // old 3 4
    // new 4
    const existingChildren = mapRemainingChildren(oldFiber);
    for (; newIdx < newChildren.length; newIdx++) {
        const newFiber =  updateFromMap(existingChildren, returnFiber, newIdx, newChildren[newIdx]);
        if (newFiber !== null) {
            // 节点复用过后，瘦身map
            if (shouldTrackSideEffects) {
                existingChildren.delete(newFiber.key === null ? newIdx : newFiber.key);
            }
            lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
            if (previousNewFiber === null) {
                resultFirstChild = newFiber;
            } else {
                previousNewFiber.sibling = newFiber;
            }
            previousNewFiber = newFiber;
        }
       
    }

    // ! 3.1 处理剩余的老节点
    if (shouldTrackSideEffects) {
        existingChildren.forEach((child) => {
            deleteChild(returnFiber, child);
        });
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
