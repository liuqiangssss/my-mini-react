// import { StrictMode } from 'react'
import { ReactDOM, Fragment, Component, useReducer } from "../which-react";
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
  const arr = count % 2 === 0 ? [0, 1, 2, 3, 4] : [0, 1, 2, 4];
  return (
    <div className="app">
      <button
        onClick={() => {
          setCount();
        }}
      >
        {count}
      </button>
      <ul>
        {arr.map((item) => (
          <li key={"li" + item}>{item}</li>
        ))}
      </ul>
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

ReactDOM.createRoot(document.getElementById("root")!).render(<App2 />);
