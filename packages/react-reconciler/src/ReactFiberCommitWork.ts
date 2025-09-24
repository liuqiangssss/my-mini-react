import { isHost } from "./ReactFiberCompleteWork";
import { ChildDeletion, Placement } from "./ReactFiberFlags";
import type { Fiber, FiberRoot } from "./ReactInternalTypes";
import { HostComponent, HostRoot, HostText } from "./ReactWorkTags";

export function commitMutationEffects(root: FiberRoot, finishedWork: Fiber) {
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
    const domNode = finishedWork.stateNode;
    // 找到domNode 的父dom节点对应的fiber
    const parentFiber = getHostParentFiber(finishedWork);

    let parentDom = parentFiber.stateNode;

    if (parentDom.containerInfo) {
      // HostRoot
      parentDom = parentDom.containerInfo;
    }

    parentDom.appendChild(domNode);
  } else {
    // Fragment
    let kid = finishedWork.child;
    while (kid !== null) {
      commitPlacement(kid);
      kid = kid.sibling;
    }
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
