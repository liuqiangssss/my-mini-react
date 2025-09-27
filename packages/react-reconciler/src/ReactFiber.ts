import { isFn, isStr } from "shared/utils";
import { NoFlags } from "./ReactFiberFlags";
import { type Lanes, NoLanes } from "./ReactFiberLane";
import {
  ClassComponent,
  ContextProvider,
  Fragment,
  FunctionComponent,
  HostComponent,
  HostText,
  IndeterminateComponent,
  type WorkTag,
} from "./ReactWorkTags";
import { REACT_FRAGMENT_TYPE, REACT_PROVIDER_TYPE } from "shared/ReactSymbols";
import type { Fiber } from "./ReactInternalTypes";
import type { ReactElement } from "shared/ReactTypes";

export function createFiber(
  tag: WorkTag,
  pendingProps: any,
  key: string | null
) {
  return new FiberNode(tag, pendingProps, key);
}

function FiberNode(tag: WorkTag, pendingProps: unknown, key: null | string) {
  // Instance
  this.tag = tag;
  this.key = key;
  this.elementType = null;
  this.type = null;
  this.stateNode = null;

  // Fiber
  this.return = null;
  this.child = null;
  this.sibling = null;
  this.index = 0;

  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.updateQueue = null;
  this.memoizedState = null;

  // Effects
  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.deletions = null;

  this.lanes = NoLanes;
  this.childLanes = NoLanes;

  this.alternate = null;

  this.deletions = null;
}

// 根据type和props创建Fiber
export function createFiberFromTypeAndProps(
  type: any,
  key: null | string,
  pendingProps: any
  // lanes: Lanes
): Fiber {
  let fiberTag: WorkTag = IndeterminateComponent;
  // The resolved type is set if we know what the final type will be. I.e. it's not lazy.
  if (isFn(type)) {
    if (shouldConstruct(type)) {
      fiberTag = ClassComponent;
    } else {
      fiberTag = FunctionComponent;
    }
  } else if (isStr(type)) {
    fiberTag = HostComponent; // 原生标签
  } else if (type === REACT_FRAGMENT_TYPE) {
    // return createFiberFromFragment(pendingProps.children, key);
    fiberTag = Fragment;
  } else if (type.$$typeof === REACT_PROVIDER_TYPE) {
    fiberTag = ContextProvider;
  }
 
  const fiber = createFiber(fiberTag, pendingProps, key);
  fiber.elementType = type;
  fiber.type = type;
  // fiber.lanes = lanes;
  return fiber;
}

// 根据ReactElement创建Fiber
export function createFiberFromElement(
  element: ReactElement
  // lanes: Lanes
): Fiber {
  const { type, key, props: pendingProps } = element;
  const fiber = createFiberFromTypeAndProps(type, key, pendingProps);
  return fiber;
}

// 根据ReactElement创建Fiber
export function createFiberFromText(content: string): Fiber {
  const fiber = createFiber(HostText, content, null);
  return fiber;
}

// function createFiberFromFragment
function shouldConstruct(Component: Function) {
  const prototype = Component.prototype;
  return !!(prototype && prototype.isReactComponent);
}

export function createWorkInProgress(current: Fiber, pendingProps: any): Fiber {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    workInProgress = createFiber(
      current.tag,
      pendingProps,
      current.key
    ) as Fiber;

    workInProgress.elementType = current.elementType;
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;

    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    workInProgress.pendingProps = pendingProps;
    workInProgress.type = current.type;
    workInProgress.flags = NoFlags;
  }

  workInProgress.flags = current.flags;
  workInProgress.child = current.child;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.updateQueue = current.updateQueue;

  return workInProgress;
}
