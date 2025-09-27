import { createWorkInProgress } from "./ReactFiber";
import type { Lane, Lanes } from "./ReactFiberLane";
import { ensureRootIsScheduled } from "./ReactFiberRootScheduler";
import type { Fiber, FiberRoot } from "./ReactInternalTypes";
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from "./ReactFiberCompleteWork";
import { commitMutationEffects, flushPassiveEffects } from "./ReactFiberCommitWork";
import { Scheduler } from "scheduler";

type ExecutionContext = number;

export const NoContext = /*             */ 0b000;
export const BatchedContext = /*               */ 0b001;
export const RenderContext = /*         */ 0b010;
export const CommitContext = /*         */ 0b100;

let workInProgress: Fiber | null = null;
let workInProgressRoot: FiberRoot | null = null;

let executionContext: ExecutionContext = NoContext;

export function scheduleUpdateOnFiber(
  root: FiberRoot,
  fiber: Fiber,
  lane?: Lane
) {
  // 赋值
  workInProgress = fiber;
  workInProgressRoot = root;

  ensureRootIsScheduled(root);
}

export function performWorkOnRoot(
  root: FiberRoot
  // lanes: Lanes,
  // forceSync: boolean,
): void {
  // ! 1. render, 构建fiber 树 VDOM
  renderRootSync(root);

  // ! 2 commit, VDOM -> DOM
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  commitRoot(root);
  console.log("renderRootSync - root", root);
}

function commitRoot(root: FiberRoot) {
  // !1. commit 阶段开始
  const prevExecutionContext = executionContext;
  executionContext |= CommitContext;

  // !2. mutation 阶段，渲染don树
  commitMutationEffects(root, root.finishedWork as Fiber);
  // !2.1  passive effect 阶段 执行 passive effect
  Scheduler.scheduleCallback(Scheduler.NormalPriority, () => {
    flushPassiveEffects(root.finishedWork as Fiber);
  });

  // !3. commit 阶段结束 恢复全局变量
  executionContext = prevExecutionContext;
  workInProgressRoot = null;
}

function renderRootSync(root: FiberRoot) {
  const prevExecutionContext = executionContext;

  // !1. render 阶段开始
  executionContext |= RenderContext;
  workInProgressRoot = root;

  // !2 初始化全局变量
  prepareFreshStack(root);

  // !3 遍历构建fiber树, 深度优先遍历
  workLoopSync();

  // !4 render结束 恢复全局变量
  executionContext = prevExecutionContext;
  workInProgressRoot = null;
}

function prepareFreshStack(root: FiberRoot): Fiber {
  root.finishedWork = null;

  workInProgressRoot = root;
  const rootWorkInProgress = createWorkInProgress(root.current, null);

  if (workInProgress === null) {
    // 函数组件workInProgress可能是什么某个fiber开始
    workInProgress = rootWorkInProgress; // fiber
  }
  return rootWorkInProgress;
}

function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(unitOfWork: Fiber) {
  const current = unitOfWork.alternate;
  // ! 1. beginWork
  // 执行自己
  // 协调，bailou返回子节点
  const next = beginWork(current, unitOfWork);
  // ! 把pendingProps更新到memoizedProps
  unitOfWork.memoizedProps = unitOfWork.pendingProps;

  if (next === null) {
    // If this doesn't spawn new work, complete the current work.
    // 如果不再产生新的work，那么当前work结束
    // ! 2. completeWork
    completeUnitOfWork(unitOfWork);
  } else {
    workInProgress = next;
  }
}

// 深度优先遍历， 子节点， 兄弟节点， 叔叔节点， 爷爷的兄弟节点
function completeUnitOfWork(unitOfWork: Fiber): void {
  let completedWork = unitOfWork;
  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;
    let next = completeWork(current, completedWork);
    if (next !== null) {
      workInProgress = next;
      return;
    }

    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }

    completedWork = returnFiber as Fiber;
    workInProgress = completedWork;
  } while (completedWork !== null);
}
