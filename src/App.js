import React, { Component } from 'react';
import './App.css';
import MyJointJS from './MyJointJS.js';

class App extends Component {
  const { appID } = this.props;
  render() {
    return (
      <div className="App">
        <MyJointJS appID={appID}></MyJointJS>
      </div>
    );
  }
}

export default App;
