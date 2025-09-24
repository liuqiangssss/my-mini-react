import type { Flags } from "./ReactFiberFlags";
import type { WorkTag } from "./ReactWorkTags";

export type Container = Element | Document | DocumentFragment;

export type Fiber = {
  // 标记fiber的类型，如原生标签，函数组件，类组件，Fragment等
  tag: WorkTag;

  // 标记组件在当前层级下的唯一性
  key: string | null;

  // 组件类型
  elementType: any;

  // 标记组件类型，原生标签这里是字符串“div”，函数组件这里是函数，类组件这里是类
  type: any;

  // 如果组件是原生标签，DOM；如果是类组件，是实例；如果是函数组件，是null
  // 如果组件是原生根节点，stateNode存的是FiberRoot. HostRoot=3
  stateNode: any;

  // 父fiber
  return: Fiber | null;

  // 单链表结构
  // 第一个子fiber
  child: Fiber | null;

  // 下⼀个兄弟fiber
  sibling: Fiber | null;

  // 记录了节点在当前层级中的位置下标，⽤于diff时候判断节点是否需要发⽣移动
  index: number;

  // 新的props
  pendingProps: any;
  // 上⼀次渲染时使⽤的 props
  memoizedProps: any;

  // 不同的组件的 memoizedState 存储不同
  // 函数组件 hook0
  // 类组件 state
  // HostRoot RootState
  memoizedState: any;
  // Effect Placement
  flags: Flags;

  // 上一次渲染的fiber
  alternate: Fiber | null;

  updateQueue: any;
};

export type FiberRoot = {
  // 根节点
  current: Fiber;
  // 根节点
  containerInfo: Container;

  // 一个准备提交 work in progress 的 fiber， HostRoot
  finishedWork: Fiber | null;
};
