import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * Clone each valid child element and merge `props` onto it.
 * Single children, arrays, and fragments (unwrapped) are all supported.
 */
export function cloneElements<P extends object>(
  children: ReactNode,
  props: P,
): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) {
      return child;
    }

    if (child.type === Fragment) {
      return cloneElements(
        (child as ReactElement<{ children?: ReactNode }>).props.children,
        props,
      );
    }

    return cloneElement(child as ReactElement<P>, props);
  });
}
