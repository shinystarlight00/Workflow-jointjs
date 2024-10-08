import React, { Component } from "react";
import "./App.css";
import MyJointJS from "./MyJointJS.js";

class App extends Component {
  render() {
    const { appID } = this.props;
    return (
      <div className="App">
        <MyJointJS appID={appID}></MyJointJS>
      </div>
    );
  }
}

export default App;
