import React from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import PropTypes from "prop-types";
import { Select, MenuItem, InputLabel, FormControl } from "@material-ui/core";
import isEmpty from "../utils/isEmpty";

/**
 * <LoadDialog wf=<Object>/>
 *
 * The wf should be a Workflow object.
 */
class LoadDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: "",
      title: "",
      selectedValue: "",
      valid: false,
      list: [],
    };
  } // constructor

  componentDidMount() {
    this.fetchData();
  }

  fetchData() {
    fetch("http://localhost:8050/dtgreen/SysAdmin/GetFlows.php", {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status == "Success") {
          this.setState({ list: data.data });
        } else {
          alert("Error! ", data.error);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }

  onSubmit() {
    const formData = new FormData();
    formData.append("id", this.state.selectedValue);

    fetch("http://localhost:8050/dtgreen/SysAdmin/GetFlow.php", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status == "Success") {
          this.props.onLoad(data.data);
        } else {
          alert("Error! ", data.error);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }

  handleChange(e) {
    const newValue = e.target.value;

    if (!isEmpty(newValue))
      this.setState({ selectedValue: e.target.value, valid: true });
    else {
      this.setState({ selectedValue: "", valid: false });
    }
  }

  render() {
    return (
      <Dialog open={this.props.open} fullWidth maxWidth="sm">
        <DialogTitle>Load Workflow</DialogTitle>
        <DialogContent>
          <Select
            labelId="simple-select-label"
            id="simple-select"
            fullWidth
            variant="outlined"
            value={this.state.selectedValue}
            onChange={this.handleChange.bind(this)}
            displayEmpty
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {this.state.list.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.title}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={this.onSubmit.bind(this)}
            color="primary"
            variant="contained"
            disabled={!this.state.valid}
          >
            Load
          </Button>
          <Button
            onClick={() => {
              this.props.onCancel();
            }}
            color="primary"
            variant="contained"
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    );
  } // render
}

LoadDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onLoad: PropTypes.func.isRequired,
};

export default LoadDialog;
