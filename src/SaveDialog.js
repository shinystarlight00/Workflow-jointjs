import React from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import TextField from "@material-ui/core/TextField";
import PropTypes from "prop-types";
import isEmpty from "../utils/isEmpty";

/**
 * <SaveDialog wf=<Object>/>
 *
 * The wf should be a Workflow object.
 */
class SaveDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data,
      valid: false,
      title: "",
      title_error: false,
      title_error_message: "",
    };
  } // constructor

  /**
   * Check to see if the WF property has changed.
   * @param {*} prevProps
   */
  //   componentDidUpdate(prevProps) {
  //     if (prevProps.data !== this.props.data) {
  //       if (this.onValidate(prevProps.data)) {
  //         this.setState({ data: this.props.data, valid: true });
  //       } else {
  //         this.setState({ valid: false });
  //       }
  //     }
  //   } // componentDidUpdate

  componentWillReceiveProps(nextProps) {
    if (this.onValidate(nextProps.data)) {
      console.log("=========> new Props ", nextProps.data);
      this.setState({ data: nextProps.data, valid: true });
    } else {
      this.setState({ valid: false });
    }
  }

  /**
   * Called when the validation of the settings has changed.
   * @param {*} valid True if the settings are valid and false otherwise.
   */
  onValidate(data) {
    if (isEmpty(data)) {
      return false;
    } else {
      return true;
    }
  } // onValidate

  onChange(e) {
    const data = e.target.value;
    console.log("=========> data is ", isEmpty(data));

    if (isEmpty(data)) {
      this.setState({
        title: "",
        title_error: true,
        title_error_message: "Title can not be empty",
      });
    } else
      this.setState({
        title: e.target.value,
        title_error: false,
        title_error_message: null,
      });
  }

  onSubmit() {
    fetch("http://localhost:8050/dtgreen/SysAdmin/AddStep2.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: "hello world!",
      }),
    })
      //   .then((response) => response.json())
      .then((data) => {
        console.log("Success:", data);
        // Handle success (e.g., show a success message, close the dialog)
        // this.props.onSaveSuccess(data);
      })
      .catch((error) => {
        console.error("Error:", error);
        // Handle error (e.g., show an error message)
      });
  }

  render() {
    return (
      <Dialog open={this.props.open} fullWidth maxWidth="sm">
        <DialogTitle>Save Workflow</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            value={this.state.title}
            fullWidth
            inputProps={{
              spellCheck: "false",
            }}
            variant="outlined"
            error={this.state.title_error}
            helperText={this.state.title_error_message}
            required
            onChange={this.onChange.bind(this)}
          ></TextField>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={this.onSubmit.bind(this)}
            disabled={!this.state.valid}
            color="primary"
            variant="contained"
          >
            Save
          </Button>
          &nbsp;
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

SaveDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  data: PropTypes.string.isRequired,
};

export default SaveDialog;
