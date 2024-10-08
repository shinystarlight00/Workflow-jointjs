import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";

var rootElement = document.getElementById("root");
var appID = rootElement.getAttribute("data-value");

ReactDOM.render(<App appID={appID} />, document.getElementById("root"));
