import { type ReactNodeList } from "shared/ReactTypes";
import {
  ConcurrentRoot,
  createFiberRoot,
} from "react-reconciler/src/ReactFiberRoot";
import type {
  Container,
  FiberRoot,
} from "react-reconciler/src/ReactInternalTypes";
import { updateContainer } from "react-reconciler/src/ReactFiberReconciler";

type RootType = {
  render: (children: ReactNodeList) => void;
  unmount: () => void;
  _internalRoot: FiberRoot;
};

function ReactDOMRoot(_internalRoot: FiberRoot) {
  this._internalRoot = _internalRoot;
}

ReactDOMRoot.prototype.render = function (children: ReactNodeList) {
  const root = this._internalRoot;
  updateContainer(children, root);
};

export function createRoot(container: Container): RootType {
  const root = createFiberRoot(container, ConcurrentRoot);
  return new ReactDOMRoot(root);
}

export default {
  createRoot,
};
