import type { ReactNodeList } from "shared/ReactTypes";
import type { FiberRoot } from "./ReactInternalTypes";
import { createUpdate } from "./ReactFiberClassUpdateQueue";
import { SyncLane } from "./ReactFiberLane";
import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";

export function updateContainer(element: ReactNodeList, container: FiberRoot) {
  const current = container.current;
  const lane = SyncLane;
  current.memoizedState = { element };
  console.log("updateContainer", container, current, lane);
  scheduleUpdateOnFiber(container, current, lane);

  //   // ! 创建Update
  //   let update = createUpdate(lane);
  //   update.payload = { element };

  //   // ! 将Update 加入到Fiber的updateQueue中
  //   const root = enqueueUpdate(current, update, lane);

  //   if (root !== null) {
  //     scheduleUpdateOnFiber(root, current, lane);
  //   }
}
