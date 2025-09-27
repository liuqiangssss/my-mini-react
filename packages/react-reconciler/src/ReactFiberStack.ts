export type StackCursor<T> = { current: T };

const valueStack: Array<any> = [];

let index = -1;

// 创建cursor,记录栈尾元素, valueStack[index] 记录的是上一个栈尾元素
function createCursor<T>(defaultValue: T): StackCursor<T> {
  return {
    current: defaultValue,
  };
}

function pop<T>(cursor: StackCursor<T>): void {
  if (index < 0) {
    return;
  }

  cursor.current = valueStack[index]; // 更新栈尾元素

  valueStack[index] = null; // 置空

  index--;
}

function push<T>(cursor: StackCursor<T>, value: T): void {
  index++;

  valueStack[index] = cursor.current;
  cursor.current = value; // 更新栈尾元素
}
export { createCursor, pop, push };
