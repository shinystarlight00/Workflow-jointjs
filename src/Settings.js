import React from "react";
import MenuItem from "@material-ui/core/MenuItem";
import TextField from "@material-ui/core/TextField";
import Grid from "@material-ui/core/Grid";
import WFUtils from "./WFUtils.js";
import PropTypes from "prop-types";

import Box from "@material-ui/core/Box";

/**
 * <Settings wf=<Object>/>
 *
 * The wf should be a Workflow object.
 */
class Settings extends React.Component {
  /**
   *
   * @param {*} props
   *
   * wf: object
   */
  constructor(props) {
    super(props);
    let state = {
      valid: false,
      params: {},
    };
    if (props.wf) {
      state = this.parseWF(props.wf); // Set the state from the parse of the WF object
      console.dir(this.state);
      delete this.parseFailed;
    } else {
      console.error("!Expected a wf object in Settings");
      this.parseFailed = true;
    }
    state._error_stepName = false;
    this.state = state;
  }

  componentDidMount() {
    this._validate();
  }

  _validate() {
    let valid = true;

    if (this.state.stepName.length === 0) {
      this.setState({
        _error_stepName: true,
        _error_message_stepName: "Can not be empty",
      });
      valid = false;
    } else {
      this.setState({ _error_stepName: false, _error_message_stepName: null });
    }

    this.setState({ valid });

    if (this.props.onValidate) {
      this.props.onValidate(valid);
    }
  }

  parseWF(wf) {
    let stepName = WFUtils.getStepName(wf);
    let step = wf[stepName];
    const stepType = WFUtils.getStepType(wf);

    // It is a call
    let params = step[stepType];
    let result = step.result ? step.result : "";

    let items = [];
    if (step.args) {
      Object.getOwnPropertyNames(step.args).forEach((propertyName) => {
        items.push({
          name: propertyName,
          value: step.args[propertyName],
        });
      });
    }
    return {
      type: stepType,
      stepName,
      params,
      result,
      items,
    };

    return {};
  }

  /**
   * Return a WF object from the core information.
   * @returns
   */
  toWF() {
    let step = {};
    let wf = {};
    wf[this.state.stepName] = step;

    step[this.state.type] = this.state.params;

    if (this.state.result && this.state.result.length > 0) {
      step["result"] = this.state.result;
    }

    if (this.state.items.length > 0) {
      let args = {};
      step["args"] = args;
      this.state.items.forEach((item) => {
        args[item.name] = item.value;
      });
    }

    return wf;
  }

  _settingsChanged() {
    console.log("Settings changed");
    console.dir(this.toWF());
    this._validate();
    this.props.onChange(this.toWF());
  }

  _callArgsChange(items) {
    console.log("CallArgsChange");
    this.setState({ items }, this._settingsChanged);
  }

  _assignArgsChange(items) {
    this.setState({ items }, this._settingsChanged);
  }

  _switchArgsChange(items) {
    this.setState({ items }, this._settingsChanged);
  }

  _typeChange(newType) {
    // A new type means to clear all existing items.
    const newValues = {
      type: newType,
      items: [],
    };

    if (newType === "100step") {
      newValues.params = {
        digit: "",
        seconds: "",
        stepCount: this.state.params.stepCount,
      };
    }
    if (newType === "102step") {
      newValues.params = {
        onSuccess: "",
        onFailure: "",
        stepCount: this.state.params.stepCount,
      };
    }
    this.setState(newValues, this._settingsChanged);
  } // _typeChange

  render() {
    /*
        if (this.parseFailed) {
            return <div>PARSE FAILED</div>
        }
        */
    return (
      <Box>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <TextField
              label="Step Name"
              value={this.state.stepName}
              fullWidth
              inputProps={{
                spellCheck: "false",
              }}
              variant="outlined"
              error={this.state._error_stepName}
              helperText={this.state._error_message_stepName}
              required
              onChange={(e) => {
                this.setState(
                  { stepName: e.target.value },
                  this._settingsChanged
                );
              }}
            ></TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Type"
              value={this.state.type}
              inputProps={{
                spellCheck: "false",
              }}
              variant="outlined"
              select
              onChange={(e) => {
                this._typeChange(e.target.value);
              }}
            >
              <MenuItem value={"100step"}>100-MakeCallWithoutCPA</MenuItem>
              <MenuItem value={"102step"}>102-Ringless Dialing</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={2}>
            <TextField
              label="Count"
              value={this.state.params.stepCount}
              inputProps={{
                spellCheck: "false",
              }}
              variant="outlined"
              disabled
            ></TextField>
          </Grid>
        </Grid>

        {this.state.type === "100step" ? (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                value={this.state.params.digit}
                label="Max Digit"
                fullWidth
                inputProps={{
                  spellCheck: "false",
                }}
                error={this.state._error_digit}
                helperText={this.state._error_message_digit}
                variant="outlined"
                required
                onChange={(e) => {
                  this.setState(
                    { params: { ...this.state.params, digit: e.target.value } },
                    this._settingsChanged
                  );
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                value={this.state.params.seconds}
                label="Max Seconds"
                fullWidth
                inputProps={{
                  spellCheck: "false",
                }}
                error={this.state._error_seconds}
                helperText={this.state._error_message_seconds}
                variant="outlined"
                required
                onChange={(e) => {
                  this.setState(
                    {
                      params: { ...this.state.params, seconds: e.target.value },
                    },
                    this._settingsChanged
                  );
                }}
              />
            </Grid>
          </Grid>
        ) : (
          ""
        )}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              value={this.state.params.onSuccess}
              label="Next Step On Success"
              fullWidth
              inputProps={{
                spellCheck: "false",
              }}
              error={this.state._error_onSuccess}
              helperText={this.state._error_message_onSuccess}
              variant="outlined"
              required
              disabled
              onChange={(e) => {
                this.setState(
                  {
                    params: {
                      ...this.state.params,
                      onSuccess: e.target.value,
                    },
                  },
                  this._settingsChanged
                );
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              value={this.state.params.onFailure}
              label="Next Step On Failure"
              fullWidth
              inputProps={{
                spellCheck: "false",
              }}
              error={this.state._error_onFailure}
              helperText={this.state._error_message_onFailure}
              variant="outlined"
              required
              disabled
              onChange={(e) => {
                this.setState(
                  {
                    params: {
                      ...this.state.params,
                      onFailure: e.target.value,
                    },
                  },
                  this._settingsChanged
                );
              }}
            />
          </Grid>
        </Grid>
      </Box>
    );
  }
}

Settings.propTypes = {
  wf: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default Settings;
