import { performWorkOnRoot } from "./ReactFiberWorkLoop";
import type { FiberRoot } from "./ReactInternalTypes";
import { ImmediatePriority, Scheduler } from "scheduler";

export function ensureRootIsScheduled(root: FiberRoot) {
  console.log("ensureRootIsScheduled", root);
  queueMicrotask(() => {
    scheduleTaskForRootDuringMicrotask(root);
  });
}

function scheduleTaskForRootDuringMicrotask(root: FiberRoot) {
  Scheduler.scheduleCallback(
    ImmediatePriority,
    performWorkOnRootViaSchedulerTask.bind(null, root)
  );
}

function performWorkOnRootViaSchedulerTask(root: FiberRoot) {

    performWorkOnRoot(root);
}
