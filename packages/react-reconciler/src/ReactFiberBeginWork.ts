import type { Fiber } from "./ReactInternalTypes";
import {
  ClassComponent,
  ContextConsumer,
  ContextProvider,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./ReactWorkTags";
import { reconcileChildFibers, mountChildFibers } from "./ReactChildFiber";
import { isNum, isStr } from "shared/utils";
import { renderWithHooks } from "./ReactFiberHooks";
import { pushProvider, readContext } from "./ReactFiberNewContext";
// 1 处理当前fiber， 应为不同组件对应的fiber 的处理方式不同
// 2 返回子节点
export function beginWork(
  current: Fiber | null,
  workInProgress: Fiber
): Fiber | null {
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(current, workInProgress);
    case HostComponent:
      return updateHostComponent(current, workInProgress);
    case HostText:
      return updateHostText(current, workInProgress);
    case ClassComponent:
      return updateClassComponent(current, workInProgress);
    case Fragment:
      return updateFragment(current, workInProgress);
    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress);
    case ContextProvider:
      return updateContextProvider(current, workInProgress);
    case ContextConsumer:
      return updateContextConsumer(current, workInProgress);
    // case ContextConsumer:
    //   return updateContextConsumer(current, workInProgress);
  }

  throw new Error(
    `Unknown unit of work tag (${workInProgress.tag}). This error is likely caused by a bug in ` +
      "React. Please file an issue."
  );
}

function updateFragment(current: Fiber | null, workInProgress: Fiber) {
  const nextChildren = workInProgress.pendingProps.children;
  reconcileChildren(current, workInProgress, nextChildren);

  return workInProgress.child;
}

// 根fiber
function updateHostRoot(current: Fiber | null, workInProgress: Fiber) {
  const nextChildren = workInProgress.memoizedState.element;
  reconcileChildren(current, workInProgress, nextChildren);

  if (current) {
    current.child = workInProgress.child;
  }

  return workInProgress.child;
}

// 文本没有子节点，不需要协调
function updateHostText(current: Fiber | null, workInProgress: Fiber) {
  return null;
}

// 原生标签
// 初次渲染一定要协调
// todo 更新， 协调 或 bailout
function updateHostComponent(current: Fiber | null, workInProgress: Fiber) {
  // 如果原生标签只有一个文本， 这个时候文本不会再生成fiber节点，而是当作原生标签 的 props 处理
  const { type, pendingProps } = workInProgress;
  const isDirectTextChild = shouldSetTextContent(type, pendingProps);
  if (isDirectTextChild) {
    // 文本属性
    return null;
  }

  const nextChildren = pendingProps.children;
  reconcileChildren(current, workInProgress, nextChildren);

  return workInProgress.child;
}

function updateClassComponent(current: Fiber | null, workInProgress: Fiber) {
  const { type, pendingProps } = workInProgress;

  // 获取context
  const context = type.contextType;
  const newValue = readContext(context);

  let instance = workInProgress.stateNode;
  if (current === null) {
    instance = new type(pendingProps);
    workInProgress.stateNode = instance;
  }

  instance.context = newValue;

  const nextChildren = instance.render();
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

// 协调函数组件
function updateFunctionComponent(current: Fiber | null, workInProgress: Fiber) {
  const { type, pendingProps } = workInProgress;
  const nextChildren = renderWithHooks(
    current,
    workInProgress,
    type,
    pendingProps
  );
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

function updateContextProvider(current: Fiber | null, workInProgress: Fiber) {
  const { type, pendingProps } = workInProgress;

  // todo 记录下context value， 方便让后代组件消费
  // * 数据结构，栈
  // ! begin阶段 push ，complete阶段 pop

  const context = type._context;
  const value = pendingProps.value;
  pushProvider(context, value);

  const nextChildren = pendingProps.children;
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

function updateContextConsumer(current: Fiber | null, workInProgress: Fiber) {
  const { type, pendingProps } = workInProgress;
  const context = type._context;

  const newValue = readContext(context);

  // consumer 的 children 是函数
  const render = pendingProps.children;
  const nextChildren = render(newValue);

  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

// 协调子节点, 构建新的fiber树
function reconcileChildren(
  current: Fiber | null,
  workInProgress: Fiber,
  nextChildren: any
) {
  if (current === null) {
    // 初次渲染
    console.log("mountChildFibers", workInProgress);
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren);
  } else {
    // 第一次进入页面根fiber 已经挂在过了 id = root的div 的fiber， 所以会走reconcileChildFibers
    console.log("reconcileChildFibers", workInProgress);
    workInProgress.child = reconcileChildFibers(
      workInProgress, // 需要协调子节点，所以这个是父fiber
      current.child, // 当前fiber的第一个子fiber
      nextChildren // 新的子节点 ，element
    );
  }
}

function shouldSetTextContent(type: string, props: any): boolean {
  return (
    type === "textarea" ||
    type === "noscript" ||
    isStr(props.children) ||
    isNum(props.children) ||
    (typeof props.dangerouslySetInnerHTML === "object" &&
      props.dangerouslySetInnerHTML !== null &&
      props.dangerouslySetInnerHTML.__html != null)
  );
}
