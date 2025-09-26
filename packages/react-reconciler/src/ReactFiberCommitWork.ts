import { isHost } from "./ReactFiberCompleteWork";
import { ChildDeletion, Placement, Update } from "./ReactFiberFlags";
import type { Fiber, FiberRoot } from "./ReactInternalTypes";
import { HostComponent, HostRoot, HostText } from "./ReactWorkTags";

export function commitMutationEffects(root: FiberRoot, finishedWork: Fiber) {

  const flags = finishedWork.flags;
  const current = finishedWork.alternate;

  switch (finishedWork.tag) {
    case HostText:
      if (flags & Update) {
        if (finishedWork.stateNode === null) {
          throw new Error(
            "This should have a text node initialized. This error is likely " +
              "caused by a bug in React. Please file an issue."
          );
        }

        const newText: string = finishedWork.memoizedProps;
        // For hydration we reuse the update path but we treat the oldProps
        // as the newProps. The updatePayload will contain the real change in
        // this case.
        const oldText: string =
          current !== null ? current.memoizedProps : newText;
        commitHostTextUpdate(finishedWork, newText, oldText);
      }
      break;
  }
  // !1. 遍历fiber树， 处理副作用
  recursivelyTraverseMutationEffects(root, finishedWork);
  commitReconciliationEffects(finishedWork);
}

function recursivelyTraverseMutationEffects(
  root: FiberRoot,
  parentFiber: Fiber
) {
  let child = parentFiber.child;
  while (child !== null) {
    commitMutationEffects(root, child);
    child = child.sibling;
  }
}

// 提交协调的产生的effects， 比如flags是Placement， 需要插入到DOM中
function commitReconciliationEffects(finishedWork: Fiber) {
  const flags = finishedWork.flags;
  if (flags & Placement) {
    // 页面初次渲染 新增插入 appendChild
    // todo 页面更新，修改位置 appendChild || insertBefore
    commitPlacement(finishedWork);
    finishedWork.flags &= ~Placement;
  }
  if (flags & ChildDeletion) {
    // parentFiber 是deletions的父dom对应的fiber
    const parentFiber = isHostParent(finishedWork)
      ? finishedWork
      : getHostParentFiber(finishedWork);
    const parentDom = parentFiber.stateNode;
    commitDeletions(finishedWork.deletions, parentDom);

    finishedWork.flags &= ~ChildDeletion;
    finishedWork.deletions = null;
  }
}

// 根据fiber删除dom节点，父dom，子dom
function commitDeletions(deletions: Fiber[] | null, parentDom: Element) {
  if (deletions === null) {
    return;
  }
  for (let i = 0; i < deletions.length; i++) {
    const childToDelete = deletions[i];
    const domNode = getStateNode(childToDelete);
    parentDom.removeChild(domNode);
  }
}

// 根据一个fiber获取其对应的dom节点
function getStateNode(fiber: Fiber) {
  let node = fiber;
  while (1) {
    if (isHost(node) && node.stateNode) {
      return node.stateNode;
    }
    node = node.child as Fiber;
  }
}

function commitPlacement(finishedWork: Fiber) {
  // parentDom.appendChild(childDom)
  // 只有原生标签的fiber 需要插入到DOM中
  if (finishedWork.stateNode && isHost(finishedWork)) {
    // 有dom节点
    // const domNode = finishedWork.stateNode;
    // 找到domNode 的父dom节点对应的fiber
    const parentFiber = getHostParentFiber(finishedWork);

    let parentDom = parentFiber.stateNode;

    if (parentDom.containerInfo) {
      // HostRoot
      parentDom = parentDom.containerInfo;
    }

    // parentDom.appendChild(domNode);
    // 遍历fiber，寻找finishedWork的兄弟节点，sibling有（dom节点，且是更新过的节点，且本轮不发生移动）
    const before = getHostSibling(finishedWork);
    // 举例
    // old 3 2 0 4 1
    // new 0 1 2 3 4
    // 01 相对位置没有发生变化， 2 3 4 都有placement，2，3 4 的before都是 null
    insertOrAppendPlacementNode(finishedWork, before, parentDom);
  } else {
    // Fragment
    let kid = finishedWork.child;
    while (kid !== null) {
      commitPlacement(kid);
      kid = kid.sibling;
    }
  }
}

// 找一个有dom节点的稳定的兄弟节点
function getHostSibling(fiber: Fiber) {
  let node = fiber;
  sibling: while (1) {
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null;
      }
      node = node.return;
    }
    node = node.sibling;
    while (!isHost(node)) {
      // 不是原生标签,
      // Placement 新增插入，移动
      if (node.flags & Placement) {
        continue sibling;
      }
      //函数组件找他的child
      if (node.child === null) {
        continue sibling;
      } else {
        node = node.child;
      }
    }
    // 存在stateNode，是Host节点
    if (!(node.flags & Placement)) {
      return node.stateNode;
    }
  }
}

function insertOrAppendPlacementNode(
  node: Fiber,
  before: Element,
  parent: Element
) {
  if (before) {
    parent.insertBefore(getStateNode(node), before);
  } else {
    parent.appendChild(getStateNode(node));
  }
}

function getHostParentFiber(finishedWork: Fiber) {
  let parentFiber = finishedWork.return;
  while (parentFiber !== null) {
    if (isHostParent(parentFiber)) {
      return parentFiber;
    }
    parentFiber = parentFiber.return;
  }

  throw new Error(
    "Expected to find a host parent. This error is likely caused by a bug " +
      "in React. Please file an issue."
  );
}

// 检查fiber是HostParent
function isHostParent(fiber: Fiber): boolean {
  return fiber.tag === HostComponent || fiber.tag === HostRoot;
}

function commitHostTextUpdate(
  finishedWork: Fiber,
  newText: string,
  oldText: string
) {
    const textInstance = finishedWork.stateNode;
    commitTextUpdate(textInstance, oldText, newText);
}

export function commitTextUpdate(
    textInstance: Text,
    oldText: string,
    newText: string,
  ): void {
    textInstance.nodeValue = newText;
  }