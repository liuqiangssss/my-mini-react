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
  createContext,
  useContext,
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
const CountContext = createContext(1000);
function App2() {
  const [count, setCount] = useState(0);
  // const arr = count % 2 === 0 ? [1, 2, 3] : [1, 2, 3, 4, 5];  一，二轮更新可以搞定
  // const arr = count % 2 === 0 ? [0, 1, 2, 3, 4] : [0, 1, 2, 4];
  // const arr = count % 2 === 0 ? [0, 1, 2, 3, 4] : [3, 2, 0, 4, 1];
  const [count2, setCount2] = useState(0);

  useLayoutEffect(() => {
    console.log("useLayoutEffect");
  }, [count]);

  useEffect(() => {
    console.log("useEffect");
  }, [count2]);

  return (
    <div className="app">
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
      <CountContext.Provider value={count}>
        <CountContext.Provider value={count + 20}>
          <Child />
        </CountContext.Provider>
      </CountContext.Provider>
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

function Child() {
  //! 后代组件消费value， 寻找最近的匹配的provider组件的value
  const context = useContext(CountContext);
  return <div>Child: {context}</div>;
}

createRoot(document.getElementById("root")!).render(<App2 />);
