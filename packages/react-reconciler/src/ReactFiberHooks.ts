import { isFn } from "shared/utils";
import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";
import type { Fiber, FiberRoot } from "./ReactInternalTypes";
import { HostRoot } from "./ReactWorkTags";
import { Passive, Update, type Flags } from "./ReactFiberFlags";
import { type HookFlags, HookLayout, HookPassive } from "./ReactHookEffectTags";
import { readContext } from "./ReactFiberNewContext";
import type { ReactContext } from "shared/ReactTypes";

type Dispatch<A> = (action: A) => void;

type EffectInstance = {
  destroy: void | (() => void);
};

type Hook = {
  memoizedState: any;
  queue: any;
  next: Hook | null;
};

// effect 类型
export type Effect = {
  tag: HookFlags;
  inst: EffectInstance;
  create: () => (() => void) | void;
  deps: any[] | void | null;
  next: Effect | null;
};

export type Update<S, A> = {
  action: A;
  hasEagerState: boolean;
  eagerState: S | null;
  next: Update<S, A>;
};

export type UpdateQueue<S, A> = {
  pending: Update<S, A> | null;
  dispatch: Dispatch<A> | null;
  lastRenderedReducer: ((S, A) => S) | null;
  lastRenderedState: S | null;
};

// 当前正在工作的函数组件的fiber
let currentlyRenderingFiber: Fiber | null = null;

let workInProgressHook: Hook | null = null;

let currentHook: Hook | null = null;

export function renderWithHooks<Props>(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: any,
  pendingProps: Props
) {
  currentlyRenderingFiber = workInProgress;
  // 初始先置空
  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;
  let children = Component(pendingProps);

  // 重置全局变量
  finishRenderingHooks();
  return children;
}

function finishRenderingHooks() {
  currentlyRenderingFiber = null;
  currentHook = null;
  workInProgressHook = null;
}

// 1 返回当前useXXX 函数对应的hook
// 构建hook链表
function updateWorkInProgressHook(): Hook {
  let hook: Hook;
  const current = currentlyRenderingFiber?.alternate;
  if (current) {
    // update 阶段 复用原先hook}
    currentlyRenderingFiber!.memoizedState = current.memoizedState;

    if (workInProgressHook !== null) {
      workInProgressHook = hook = workInProgressHook.next as Hook;
      currentHook = currentHook!.next;
    } else {
      // 头节点
      hook = workInProgressHook = currentlyRenderingFiber!.memoizedState;
      currentHook = current.memoizedState;
    }
  } else {
    // mount 阶段
    currentHook = null;
    hook = {
      memoizedState: null,
      queue: null,
      next: null,
    };
    if (workInProgressHook) {
      workInProgressHook = workInProgressHook.next = hook;
    } else {
      // hook 单链表的头节点
      workInProgressHook = currentlyRenderingFiber!.memoizedState = hook;
    }
  }

  return hook;
}

export function useReducer<S, I, A>(
  reducer: ((state: S, action: A) => S) | null,
  initialArg: I,
  init?: (initialArg: I) => S
) {
  let initialState: S;
  if (init !== undefined) {
    initialState = init(initialArg);
  } else {
    initialState = initialArg as any;
  }

  // ! 1 构建hook 链表(mount 和 update 阶段)
  let hook: Hook = updateWorkInProgressHook();

  // ! 2. 区分函数组件是初次挂载还是更新
  if (!currentlyRenderingFiber?.alternate) {
    // mount
    hook.memoizedState = initialState;
  }

  //   const queue: UpdateQueue<S, A> = {
  //     pending: null,
  //     dispatch: null,
  //     lastRenderedReducer: reducer,
  //     lastRenderedState: initialState,
  //   };
  //   hook.queue = queue; // 初始化hook的queue
  // ! 3 dispatch
  const dispatch: Dispatch<A> = dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber!,
    hook,
    reducer as any
  );

  return [hook.memoizedState, dispatch];
}

function dispatchReducerAction<S, A>(
  fiber: Fiber,
  hook: Hook,
  reducer: (state: S, action: A) => S,
  action: A
): void {
  hook.memoizedState = reducer ? reducer(hook.memoizedState, action) : action;

  const root: FiberRoot = getRootForUpdatedFiber(fiber) as FiberRoot;
  fiber.alternate = {
    ...fiber,
  };

  scheduleUpdateOnFiber(root, fiber);
}

// 根据 sourceFiber 找根节点
function getRootForUpdatedFiber(sourceFiber: Fiber): FiberRoot | null {
  let node = sourceFiber;
  let parent = node.return;

  while (parent !== null) {
    node = parent;
    parent = node.return;
  }

  return node.tag === HostRoot ? node.stateNode : null;
}

// 源码中useState与useReducer对比
// useState,如果state没有改变，不引起组件更新。useReducer不是如此。
// reducer 代表state修改规则，useReducer比较方便复用这个规则
export function useState<S>(initialState: S | (() => S)) {
  const init = isFn(initialState) ? (initialState as any)() : initialState;
  return useReducer(null, init);
}

export function useMemo<T>(nextCreate: () => T, deps: any[]): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;

  // 更新时，检查依赖项是否发生变化
  if (prevState !== null) {
    // 证明时更新阶段
    if (nextDeps !== null) {
      const prevDeps = prevState[1];
      if (areHookInputsEqual(prevDeps, nextDeps)) {
        return prevState[0];
      }
    }
  }
  const nextValue = nextCreate();

  hook.memoizedState = [nextValue, nextDeps]; // 挂载时
  return nextValue;
}

export function useCallback<T>(callback: T, deps: any[]): T {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;
  if (prevState !== null) {
    // 证明是更新阶段
    if (nextDeps !== null) {
      const prevDeps = prevState[1];
      if (areHookInputsEqual(prevDeps, nextDeps)) {
        return prevState[0];
      }
    }
  }
  hook.memoizedState = [callback, nextDeps];
  return callback;
}

export function useRef<T>(initialValue: T) {
  const hook = updateWorkInProgressHook();
  if (currentHook === null) {
    // useRef 只在初次挂载时初始化
    hook.memoizedState = { current: initialValue };
  }
  return hook.memoizedState;
}

export function useContext<T>(context: ReactContext<T>): T {
  return readContext(context);
}

// useEffect与useLayoutEffect的区别
// 存储结构一样
// effect和destroy函数的执行时机不同
export function useLayoutEffect(
  create: () => (() => void) | void,
  deps: any[]
) {
  return updateEffectImpl(Update, HookLayout, create, deps);
}

// 依赖项变更后异步执行，layout依赖项变更后，同步执行
export function useEffect(create: () => (() => void) | void, deps: any[]) {
  return updateEffectImpl(Passive, HookPassive, create, deps);
}

function updateEffectImpl(
  fiberFlags: Flags,
  hookFlags: HookFlags,
  create: () => (() => void) | void,
  deps: any[]
) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const effect: Effect = hook.memoizedState;
  const inst = effect ? effect.inst : { destroy: undefined };

  if (currentHook !== null) {
    if (nextDeps !== null) {
      const prevEffect: Effect = currentHook.memoizedState;
      const prevDeps = prevEffect.deps as any[];
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        return;
      }
    }
  }

  currentlyRenderingFiber!.flags |= fiberFlags;

  // * 保存effect
  // * 构建effect链表
  hook.memoizedState = pushEffectImpl(hookFlags, inst, create, nextDeps);
}

function pushEffectImpl(
  hookFlags: HookFlags,
  inst: EffectInstance,
  create: () => (() => void) | void,
  nextDeps: any[] | null
) {
  const effect: Effect = {
    tag: hookFlags,
    inst,
    create,
    deps: nextDeps,
    next: null,
  };
  let componentUpdateQueue = currentlyRenderingFiber?.updateQueue;
  // 源码是单向循环链表
  if (componentUpdateQueue === null) {
    // 第一个effect
    componentUpdateQueue = {
      lastEffect: null,
    };
    currentlyRenderingFiber!.updateQueue = componentUpdateQueue;

    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    const lastEffect = componentUpdateQueue.lastEffect;
    const firstEffect = lastEffect.next;
    // 构建循环链表
    lastEffect.next = effect;
    effect.next = firstEffect;
    componentUpdateQueue.lastEffect = effect;
  }

  return effect;
}

// 判断依赖项是否发生变化
function areHookInputsEqual(
  nextDeps: Array<any>,
  prevDeps: Array<any> | null
): boolean {
  if (prevDeps === null) {
    return false;
  }

  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}
