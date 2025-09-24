// import { ReactNodeList } from "shared/ReactTypes";
import { createFiber } from "./ReactFiber";
import { initializeUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { createLaneMap, NoLane, NoLanes, NoTimestamp } from "./ReactFiberLane";
import {type Container, type FiberRoot } from "./ReactInternalTypes";
import { HostRoot } from "./ReactWorkTags";

export type RootTag = 0 | 1;

export const LegacyRoot = 0;
export const ConcurrentRoot = 1;

export type RootState = {
  element: any;
};

export function FiberRootNode(this: any, containerInfo: Container, tag: RootTag) {
  this.tag = tag;
  this.containerInfo = containerInfo;
  this.pendingChildren = null;
  this.current = null;
  this.finishedWork = null;
  this.callbackNode = null;
  this.callbackPriority = NoLane;

  this.eventTimes = createLaneMap(NoLanes);
  this.expirationTimes = createLaneMap(NoTimestamp);

  this.pendingLanes = NoLanes;
  this.finishedLanes = NoLanes;
}

export function createFiberRoot(
  containerInfo: Container,
  tag: RootTag,
//   initialChildren: ReactNodeList
): FiberRoot {
  const root: FiberRoot = new FiberRootNode(containerInfo, tag);
  const uninitializedFiber = createFiber(HostRoot, null, null);

  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;

  const initialState: RootState = {
    element: null,
  };
  uninitializedFiber.memoizedState = initialState;

  initializeUpdateQueue(uninitializedFiber);
  return root;
}
