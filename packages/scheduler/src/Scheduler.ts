// 实现一个单线程的任务调度器
import { getCurrentTime, isFn } from "shared/utils";
import {
  type PriorityLevel,
  NoPriority,
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
  getTimeoutByPriorityLevel,
} from "./SchedulerPriorities";
import { peek, pop, push } from "./SchedulerMinHeap";
// 任务没执行完会返回一个回调函数， 继续执行任务
type Callback = any;
// 任务池， 最小堆
export interface Task {
  id: number;
  callback: Callback;
  priorityLevel: PriorityLevel;
  startTime: number;
  expirationTime: number;
  sortIndex: number;
}

const taskQueue: Task[] = []; // 没有验吃的任务
const timerQueue: Task[] = []; // 需要延迟执行的任务

let taskIdCounter = 0;

let currentPriorityLevel: PriorityLevel = NoPriority;

let currentTask: Task | null = null;

// 记录时间切片的起始值，时间戳
let startTime = -1;

// 时间切片执行超过这个时间，就停止执行，等待下一次调度
let frameInterval = 5;

// 是否有 work 正在执行
let isPerformingWork = false;

// 主线程在调度任务
let isHostCallbackScheduled = false;

// 是否有任务在倒计时
let isHostTimeoutScheduled = false;

let taskTimeoutID = -1;

let isMessageLoopRunning = false;

function shouldYieldToHost() {
  let timeElapsed = getCurrentTime() - startTime;
  if (timeElapsed >= frameInterval) {
    return true;
  }
  return false;
}

// 任务调度器的入口函数
function scheduleCallback(
  priorityLevel: PriorityLevel,
  callback: Callback,
  options?: { delay: number }
) {
  const delay = options?.delay ?? 0;
  const currentTime = getCurrentTime();
  const startTime = currentTime + delay;

  const timeout = getTimeoutByPriorityLevel(priorityLevel); // 根据优先级获取超时时间
  // 过期时间，理论上时任务的执行时间
  const expirationTime = startTime + timeout;
  let newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1, // 最小堆排序依据， 越小越应该先执行
  };
  if (startTime > currentTime) {
    // newTask 任务有延迟
    newTask.sortIndex = startTime; //  timeQueue 的排序依据是，谁先到达开始时间
    // 任务在timeQueue到达开始时间后，被推入taskQueue
    push(timerQueue, newTask);

    // 每次只倒计时一个任务
    // 如果taskQueue有任务，优先执行任务调度，而不是倒计时
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      if (isHostTimeoutScheduled) {
        // 如果有任务正在倒计时，但是newTask才是堆顶任务，newTask最先到达开始时间，newTask应该先倒计时
        cancelHostTimeout();
      } else {
        isHostTimeoutScheduled = true;
      }

      requestHostTimeout(handleTimeout, startTime - currentTime);
    }
  } else {
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask);

    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback();
    }
  }
}

function requestHostCallback() {
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    schedulePerformWorkUntilDeadline(); // 创建一个宏任务，执行performWorkUntilDeadline
  }
}

const channel = new MessageChannel();
const port = channel.port2;
channel.port1.onmessage = performWorkUntilDeadline;

function schedulePerformWorkUntilDeadline() {
  port.postMessage(null);
}

function performWorkUntilDeadline() {
  if (isMessageLoopRunning) {
    // 记录一个work（时间切片） 的开始时间
    const currentTime = getCurrentTime();
    startTime = currentTime;
    let hasMoreWork = true;
    try {
      hasMoreWork = flushWork(currentTime);
    } finally {
      if (hasMoreWork) {
        schedulePerformWorkUntilDeadline();
      } else {
        isMessageLoopRunning = false;
      }
    }
  }
}

function flushWork(initalTime: number) {
  // 开始执行任务，调度结束
  isHostCallbackScheduled = false;
  isPerformingWork = true;
  let previousPriorityLevel = currentPriorityLevel;
  try {
    return workLoop(initalTime);
  } finally {
    currentTask = null;
    isPerformingWork = false;
    currentPriorityLevel = previousPriorityLevel;
  }
}

// 取消任务, 最小堆无法删除，只能将callback 设置为null
// 调度过程中，当这个任务到达堆顶时，删除无效任务
function cancelCallback(task: Task) {
  // callback = null;
  task.callback = null;
}

function getCurrentPriorityLevel(): PriorityLevel {
  return currentPriorityLevel;
}

/**
 * 一个work 就是一个时间切片内要执行的task
 * @param initalTime
 * @returns 返回true代表有任务没执行完，需要继续执行
 */
function workLoop(initalTime: number): boolean {
  let currentTime = initalTime;
  advanceTimers(currentTime);
  currentTask = peek(taskQueue) as Task;
  while (currentTask !== null) {
    // 只有当任务还没过期 AND 需要让出控制权时，才中断执行。
    // 如果任务已经过期，即使时间片用完了，也不应该中断，因为这是一个紧急任务，需要立即执行完成

    // 过期的任务（紧急任务）会一直执行，不管时间片是否用完
    // 未过期的任务（非紧急任务）会在时间片用完时让出控制权，避免阻塞浏览器
    // 这样既保证了紧急任务的及时执行，又避免了长时间占用主线程导致页面卡顿。
    if (currentTask.expirationTime > currentTime && shouldYieldToHost()) {
      break;
    }
    let callback = currentTask.callback;
    if (isFn(callback)) {
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      const didUserCallbackTimeout = currentTask.expirationTime < currentTime;
      const continuation = callback(didUserCallbackTimeout);
      // 经过执行callback，更新当前时间
      currentTime = getCurrentTime();
      if (isFn(continuation)) {
        // 如果返回函数，代表任务没有执行完，需要继续执行
        currentTask.callback = continuation;
        advanceTimers(currentTime);
        return true;
      } else {
        // pop(taskQueue); 不能直接pop，因为任务池是动态的，这时任务可能不在堆顶
        // 不是堆顶就不用管了，callback执行前 task 的callback就已经被设置为null了
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
        advanceTimers(currentTime);
      }
    } else {
      // 无效任务
      pop(taskQueue);
    }
    currentTask = peek(taskQueue) as Task;
  }

  if (currentTask !== null) {
    return true;
  } else {
    //   // 如果当前任务为空，代表没有任务需要执行了,但是timeQueue可能有任务，继续倒计时
    const firstTimer = peek(timerQueue) as Task;
    if (firstTimer !== null) {
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
    return false;
  }
}

function requestHostTimeout(
  callback: (currentTime: number) => void,
  ms: number
) {
  taskTimeoutID = setTimeout(() => {
    callback(getCurrentTime());
  }, ms);
}

function cancelHostTimeout() {
  clearTimeout(taskTimeoutID);
  taskTimeoutID = -1;
}

function advanceTimers(currentTime: number) {
  let timer = peek(timerQueue) as Task;
  while (timer !== null) {
    if (timer.callback === null) {
      pop(timerQueue); // 无效任务
    } else if (timer.startTime <= currentTime) {
      // 倒计时到达开始时间，将timeQueue的任务推入taskQueue
      pop(timerQueue);
      timer.sortIndex = timer.expirationTime;
      push(taskQueue, timer);
    } else {
      // 倒计时未到达时间，直接返回
      return;
    }
    timer = peek(timerQueue) as Task;
  }
}

// 倒计时到达时间后，将timeQueue的任务推入taskQueue的处理函数
function handleTimeout(currentTime: number) {
  isHostTimeoutScheduled = false;
  advanceTimers(currentTime);

  // 经过advanceTimers，如果当前没有任务在执行，则执行任务调度，否则继续倒计时
  if (!isHostCallbackScheduled) {
    if (peek(taskQueue) !== null) {
      isHostCallbackScheduled = true;
      requestHostCallback();
    } else {
      // 主线成正在执行任务，继续倒计时
      const firstTimer = peek(timerQueue) as Task;
      if (firstTimer !== null) {
        requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
      }
    }
  }
}

export {
  PriorityLevel,
  NoPriority,
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
  scheduleCallback, // 任务进入调度器，等待调度
  cancelCallback, // 取消任务, 最小堆无法删除，只能将callback 设置为null
  getCurrentPriorityLevel,
  shouldYieldToHost, // 将控制权交给宿主环境
};
