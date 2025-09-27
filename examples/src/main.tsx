// import { ReactDOM } from 'react'
import {
  ReactDOM,
  Fragment,
  Component,
  useReducer,
  useMemo,
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
} from "../which-react";
const { createRoot } = ReactDOM;

// import { Fragment, Component, useReducer, useMemo, useState } from "react";
// import { createRoot } from "react-dom/client";
import "./index.css";
// import App from './App.tsx'

let fragment = (
  <>
    {/* <> */}
    <h3>123</h3>
    {/* </> */}
    <h4>456</h4>
    <>www</>
  </>
);

// fragment = (
//   <Fragment>
//     <h3>123</h3>
//     <h4>456</h4>
//     <>www</>
//   </Fragment>
// );
// class App extends Component {
//   // props: { name: any };

//   render() {
//     const { name } = this.props;
//     return (
//       <div className="app">
//         <h1>class component: {name}</h1>
//       </div>
//     );
//   }
// }

function App2() {
  const [count, setCount] = useReducer((x) => x + 1, 0);
  // const arr = count % 2 === 0 ? [1, 2, 3] : [1, 2, 3, 4, 5];  一，二轮更新可以搞定
  // const arr = count % 2 === 0 ? [0, 1, 2, 3, 4] : [0, 1, 2, 4];
  // const arr = count % 2 === 0 ? [0, 1, 2, 3, 4] : [3, 2, 0, 4, 1];
  const [count2, setCount2] = useState(0);
  const ref = useRef(0);
    const value = useMemo(() => {
      console.log("useMemo");
      return count2 + 100;
    }, [count2]);

    useLayoutEffect(() => {
      console.log("useLayoutEffect");
    }, [count]);

    useEffect(() => {
      console.log("useEffect");
    }, [count2]);

  return (
    <div className="app">
      <p>111: {value}</p>
      <button
        onClick={() => {
          setCount(count + 1);
          // ref.current = ref.current + 1;
          // alert(ref.current);
        }}
      >
        {count}
      </button>
      <button
        onClick={() => {
          setCount2(count2 + 1);
        }}
      >
        {count2}
      </button>
      {/* <ul>
        {arr.map((item) => (
          <li key={"li" + item}>{item}</li>
        ))}
      </ul>
      {count % 2 === 0 ? <h1>123</h1> : null}
      {count % 2 === 0 ? <h1>123</h1> : undefined}
      {count % 2 === 0 && <h1>123</h1>} */}
    </div>
  );
}
const JSX = (
  <div className="app">
    {/* {fragment}   */}
    {/* <h1 className="title">Hello </h1>
    123
    <h1 className="title"> World</h1>
    dwdwdwd */}
  </div>
) as any;

createRoot(document.getElementById("root")!).render(<App2 />);
