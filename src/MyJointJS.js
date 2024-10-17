import * as joint from "jointjs";
import * as dagre from "dagre";
import graphlib from "graphlib";
import React from "react";
import Button from "@material-ui/core/Button";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";

import Grid from "@material-ui/core/Grid";
import SettingsDialog from "./SettingsDialog.js";
import clone from "just-clone";
import WFUtils from "./WFUtils";
import JointJSUtils from "./JointJSUtils.js";

// https://fontawesome.com/v4.7/icons/

const WFShape_BaseColor = "#daecf2";
const WFShape_InColor = "#4fa8d1";
const WFShape_OutColor = "#daf2dc";
const WFShape_Width = 140;
const WFShape_Height = 70;
const WFShape_RemoveDistance = -30;

const WFShape_SuccessPort = "#00FF00";
const WFShape_FailurePort = "#FFC0CB";

const portsDef = {
  groups: {
    in: {
      position: "left",
      attrs: {
        circle: {
          fill: WFShape_InColor,
          stroke: "black",
          "stroke-width": 1,
          r: 8,
          magnet: "passive",
        },
      },
    },
    out: {
      position: "right",
      attrs: {
        circle: {
          fill: WFShape_OutColor,
          stroke: "black",
          "stroke-width": 1,
          r: 8,
          magnet: true,
        },
      },
    },
    "out-condition": {
      position: "right",
      attrs: {
        circle: {
          fill: WFShape_OutColor,
          stroke: "black",
          "stroke-width": 1,
          r: 8,
          magnet: true,
        },
        text: { fill: "#6a6c8a", fontSize: 14 },
      },
      label: {
        position: {
          name: "outsideOriented",
          args: {
            offset: 15,
            attrs: {},
          },
        },
      },
    },
  },
  items: [],
};

const WFRect = joint.dia.Element.define(
  "workflow.Rectangle",
  {
    attrs: {
      body: {
        refWidth: "100%",
        refHeight: "100%",
        strokeWidth: 2,
        stroke: "#000000",
        fill: "#FFFFFF",
      },
      label: {
        textVerticalAnchor: "middle",
        textAnchor: "middle",
        refX: "50%",
        refY: "50%",
        fontSize: 14,
        fill: "#333333",
      },
    },
  },
  {
    markup: [
      {
        tagName: "rect",
        selector: "body",
      },
      {
        tagName: "text",
        selector: "label",
      },
    ],
  }
);

class MyJointJS extends React.Component {
  stepCount = 1;

  constructor(props) {
    super(props);
    this.graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    this.state = {
      openLoad: false,
      openSave: false,
      saveText: "",
      loadText: "",
      settingsShowDialog: false, // Set to true to show the settings dialog.
      contextShowMenu: false, // Set to true to show the context menu.
      mouse: { x: 0, y: 0 },
      menuElement: null,
      anchorEl: null,
      wf: {},
      layoutDirection: "LR", // The layout of the graph ... LR for left->right or TB for top->bottom
    };
  }

  componentDidMount() {
    console.log("Mounted!");

    this.paper = new joint.dia.Paper({
      el: this.el,
      model: this.graph,
      width: "100%",
      height: "95vh",
      gridSize: 1,
      background: {
        color: "#f0f0f0",
      },
      linkPinning: false,
      //defaultLink: new joint.shapes.standard.Link(),
      defaultLink: function (cellView, magnet) {
        const link = new joint.shapes.standard.Link();
        return link;
      },
      // Validate link connections.  When a link is being formed, we can examine the links and shut it down
      // if there is anything we don't like about it.
      validateConnection: function (
        cellViewS,
        magnetS,
        cellViewT,
        magnetT,
        end,
        linkView
      ) {
        console.log("===============>  validateConnection");
        if (cellViewS === cellViewT) return false; // Don't allow a link to start and end at the same element.
        if (
          magnetT === undefined ||
          magnetT.getAttribute("port-group") !== "in"
        )
          return false; // If there is no target or the target is not an "in" port group, cancel it
        if (!magnetS.getAttribute("port-group").startsWith("out")) return false; // If the source port group doesn't start with "out" then cancel it.
        // We need to check that the source doesn't ALREADY have a link in the graph!

        const updateWFState = (fromView, toView, magnet) => {
          const wf = fromView.model.get("wf");
          const fromStepName = WFUtils.getStepName(wf);
          const fromStepType = WFUtils.getStepType(wf);
          const fromstepParams = wf[fromStepName][fromStepType];

          const toStepWF = toView.model.get("wf");
          const toStepName = WFUtils.getStepName(toStepWF);
          const toStepType = WFUtils.getStepType(toStepWF);
          const toStepParams = toStepWF[toStepName][toStepType];

          const param =
            magnet.getAttribute("port") == "out-succ"
              ? "NextStepOnSuccess"
              : "NextStepOnFailure";

          wf[fromStepName][fromStepType] = {
            ...fromstepParams,
            [param]: toStepParams.StepNumber,
          };
        };

        // Get the start and end points of the link
        // Get the names of the source and target elements

        console.log("===========> port ", magnetS);
        console.log("===========> wf ", cellViewS.model.get("wf"));

        updateWFState(cellViewS, cellViewT, magnetS);

        const source = linkView.model.source();
        // Cound the number of outgoing links.  Hint ... it will be at least 1 as we have the CURRENT link
        if (
          JointJSUtils.countOutgoingLinks(this.model, source.id, source.port) >
          1
        ) {
          return false;
        }
        return true;
      },
      interactive: function (cellView) {
        if (cellView.model.get("locked")) {
          return {
            elementMove: false,
          };
        }

        // otherwise
        return true;
      },
    });

    this.paper.on("link:pointerup", function (linkView) {
      if (linkView.hasTools()) return;

      const removeCallback = () => {
        const sourceElement = linkView.model.getSourceElement();
        const sourcePort = linkView.model.source().port;

        if (sourceElement) {
          const wf = sourceElement.get("wf");
          const stepName = WFUtils.getStepName(wf);
          const stepType = WFUtils.getStepType(wf);
          const stepParams = wf[stepName][stepType];

          const param =
            sourcePort === "out-succ"
              ? "NextStepOnSuccess"
              : "NextStepOnFailure";

          // Reset the next step to '1000' (or your default value)
          wf[stepName][stepType] = {
            ...stepParams,
            [param]: "1000",
          };

          // Update the element's wf attribute
          sourceElement.set("wf", wf);
        }
      };

      linkView.addTools(
        new joint.dia.ToolsView({
          tools: [
            new joint.linkTools.Remove({
              distance: WFShape_RemoveDistance,
              action: function (evt, linkView, toolView) {
                // Call the custom remove callback
                removeCallback();
                // Then remove the link
                linkView.model.remove();
              },
            }),
          ],
        })
      );
    });

    this.paper.on("link:mouseenter", function (linkView) {
      linkView.showTools();
    });

    this.paper.on("link:mouseleave", function (linkView) {
      linkView.hideTools();
    });

    this._setLayoutDirection("TB"); // Set the default layout direction to be LR (Left->Right)

    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    this._generateFlowData();
  } // componentDidMount

  _setLayoutDirection(direction) {
    if (direction === "LR") {
      portsDef.groups["in"].position = "left";
      portsDef.groups["out"].position = "right";
      portsDef.groups["out-condition"].position = "right";
    } else if (direction === "TB") {
      portsDef.groups["in"].position = "top";
      portsDef.groups["out"].position = "bottom";
      portsDef.groups["out-condition"].position = "bottom";
    } else {
      throw new Error(`Unknown layoutDirection: ${direction}`);
    }

    this.setState({ layoutDirection: direction });
  } // _setDirection

  _add(flag) {
    return this._addStep(flag);
  } // _add

  _addStep(flag) {
    let stepName = `Step${this.stepCount}`;

    this.stepCount++;

    let stepCount = this.stepCount;

    let rect = new WFRect({
      ports: portsDef,
    });
    rect.position(100, 30);
    rect.resize(WFShape_Width, WFShape_Height);
    rect.attr({
      body: {
        fill: WFShape_BaseColor,
      },
      label: {
        text: stepName,
        fill: "black",
      },
    });
    rect.addPort({ id: "in", group: "in" });
    rect.addPort({
      id: "out-succ",
      group: "out",
      attrs: { circle: { fill: WFShape_SuccessPort } },
    });
    rect.addPort({
      id: "out-fail",
      group: "out",
      attrs: { circle: { fill: WFShape_FailurePort } },
    });
    rect.addTo(this.graph);
    rect.set("wf", {
      [stepName]: {
        "100step": {
          StepNumber: stepCount,
          NextStepOnSuccess: "1000",
          NextStepOnFailure: "1000",
        },
      },
    });

    /**
     * Add a handler for the context menu.
     */
    this.paper.findViewByModel(rect).on("element:contextmenu", (e) => {
      if (e.preventDefault) {
        e.preventDefault();
      } else {
        e.returnValue = false; // For older browsers
      }

      this.setState({
        contextShowMenu: true,
        mouse: { x: e.clientX, y: e.clientY },
        menuElement: rect,
        wf: clone(rect.get("wf")),
      });
    });

    /*
     * Add a handler for the settings menu on a double click.
     */
    this.paper.findViewByModel(rect).on("element:pointerdblclick", (e) => {
      this.setState({
        settingsShowDialog: true,
        menuElement: rect,
        wf: clone(rect.get("wf")),
      });
    });

    if (flag) {
      this.setState({
        settingsShowDialog: true,
        menuElement: rect,
        wf: clone(rect.get("wf")),
      });
    }

    return rect;
  }

  async _generateFlowData() {
    const loadData = await this._loadData();

    if (loadData) {
      await this._onLoadData(loadData);
    } else {
      this._generateStartAndEnd(true);
      this._generateStartAndEnd(false);
    }
  }

  _generateStartAndEnd(start) {
    let stepName = start ? "Start" : "End";

    let rect = new WFRect({
      ports: portsDef,
    });

    const screenWidth = this.paper.getComputedSize().width;
    const screenHeight = this.paper.getComputedSize().height;

    const centerPos = screenWidth / 2 - WFShape_Width / 2;

    rect.position(centerPos, start ? 30 : screenHeight - 150);
    rect.resize(WFShape_Width, WFShape_Height);
    rect.attr({
      body: {
        fill: WFShape_BaseColor,
      },
      label: {
        text: stepName,
        fill: "black",
      },
    });
    rect.addPort({ group: "in" });
    rect.addPort({
      id: "out-succ",
      group: "out",
      attrs: { circle: { fill: WFShape_SuccessPort } },
    });
    rect.addTo(this.graph);
    rect.set("wf", {
      [stepName]: {
        "100step": {
          StepNumber: start ? 1 : 999,
          NextStepOnSuccess: "1000",
          NextStepOnFailure: "1000",
        },
      },
    });

    /**
     * Add a handler for the context menu.
     */
    this.paper.findViewByModel(rect).on("element:contextmenu", (e) => {
      console.log("=========> ", e);
      if (e.preventDefault) {
        e.preventDefault();
      } else {
        e.returnValue = false; // For older browsers
      }

      this.setState({
        contextShowMenu: true,
        mouse: { x: e.clientX, y: e.clientY },
        menuElement: rect,
        wf: clone(rect.get("wf")),
      });
    });

    /*
     * Add a handler for the settings menu on a double click.
     */
    this.paper.findViewByModel(rect).on("element:pointerdblclick", (e) => {
      this.setState({
        settingsShowDialog: true,
        menuElement: rect,
        wf: clone(rect.get("wf")),
      });
    });
  }

  _saveData() {
    const graphData = this.graph.toJSON();

    console.log("=========>data ", JSON.stringify(graphData));

    const formData = new FormData();
    formData.append("appID", this.props.appID);
    formData.append("data", JSON.stringify(graphData));

    fetch("http://localhost:8050/dtgreen/SysAdmin/AddStep2.php", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status == "Success") {
          alert("Workflow data saved successfully!");
        } else {
          alert("Error! ", data.error);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }

  async _loadData() {
    const formData = new FormData();
    formData.append("appID", this.props.appID);

    try {
      const response = await fetch(
        "http://localhost:8050/dtgreen/SysAdmin/GetFlow.php",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.status === "Success") {
        return data.data;
      } else {
        console.error("Error loading data:", data.error);
        return null;
      }
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  }

  _menuClose() {
    this.setState({ contextShowMenu: false });
  } // _menuClose

  _deleteElement() {
    this.state.menuElement.remove(); // Delete the JointJS element that is the current menu selection from the graph.
    this._menuClose();
  } // _deleteElement

  _duplicateElement() {
    const newElement = this._add(false);
    //newElement.set('wf', clone(this.state.menuElement.get('wf')))
    const newWf = clone(this.state.menuElement.get("wf"));
    WFUtils.setStepName(newWf, "Copy_" + WFUtils.getStepName(newWf));
    WFUtils.setStepNumber(newWf, this.stepCount);
    this._setElementFromWF(newElement, newWf);
    this._generateLinks(newWf);
    this._menuClose();
  } // _duplicateElement

  _generateLinks(wf) {
    const stepName = WFUtils.getStepName(wf);
    const stepType = WFUtils.getStepType(wf);
    const data = wf[stepName][stepType];
    const sourceElement = this._getElementFromStepNumber(data.StepNumber);
    // Create success link
    if (
      data.NextStepOnSuccess &&
      data.NextStepOnSuccess !== "1000" &&
      data.NextStepOnSuccess !== "1"
    ) {
      const targetElement = this._getElementFromStepNumber(
        data.NextStepOnSuccess
      );

      if (targetElement) {
        const link = new joint.shapes.standard.Link({
          source: { id: sourceElement.id, port: "out-succ" },
          target: { id: targetElement.id, port: "in" },
          attrs: {
            line: {
              stroke: "black",
              "stroke-width": 2,
            },
          },
        });
        this.graph.addCell(link);
      }
    }

    // Create failure link
    if (
      data.NextStepOnFailure &&
      data.NextStepOnFailure !== "1000" &&
      data.NextStepOnFailure !== "1"
    ) {
      const targetElement = this._getElementFromStepNumber(
        data.NextStepOnFailure
      );

      if (targetElement) {
        const link = new joint.shapes.standard.Link({
          source: { id: sourceElement.id, port: "out-fail" },
          target: { id: targetElement.id, port: "in" },
          attrs: {
            line: {
              stroke: "black",
              "stroke-width": 2,
            },
          },
        });
        this.graph.addCell(link);
      }
    }
  }

  _setElementFromWF(jjsElement, wf) {
    let type = WFUtils.getStepType(wf);
    let originalWf = jjsElement.get("wf"); // Save the original WF value
    jjsElement.set("wf", wf);
    let stepName = WFUtils.getStepName(wf);
    jjsElement.attr("label/text", stepName);

    // We need to check that the output port types are correct for the given WF type.
    // * Other than "switch" - A single output port of type "out"
    // * "switch" - As many output ports of type "out-condition" as there are conditions in the switch
    let originalType = WFUtils.getStepType(originalWf);
    if (type !== "switch" && originalType === "switch") {
      jjsElement.resize(WFShape_Width, WFShape_Height);
    }
    if (type === "return" && originalType !== "return") {
      // Need to end up with no output ports of any type
      let outPorts = jjsElement.getGroupPorts("out");
      jjsElement.removePorts(outPorts);
      outPorts = jjsElement.getGroupPorts("out-condition");
      jjsElement.removePorts(outPorts);
    } else if (
      type !== "return" &&
      type !== "switch" &&
      originalType === "return"
    ) {
      jjsElement.addPort({ group: "out" });
    } else if (type === "switch" && originalType !== "switch") {
      // Delete all "out" ports and add condition ports
      const outPorts = jjsElement.getGroupPorts("out");
      jjsElement.removePorts(outPorts);
      const conditions = WFUtils.getConditions(wf);
      conditions.forEach((condition) => {
        jjsElement.addPort({
          id: condition.condition,
          group: "out-condition",
          attrs: { text: { text: condition.condition } },
        });
      });
      jjsElement.resize(WFShape_Width, WFShape_Height + 10 * conditions.length);
    } else if (type !== "switch" && originalType === "switch") {
      // Delete all ports and add one normal output port
      const outPorts = jjsElement.getGroupPorts("out-condition");
      jjsElement.removePorts(outPorts);
      jjsElement.addPort({ group: "out" });
    } else if (type === "switch" && originalType === "switch") {
      // We need to check and see if new ports have been added or old ports removed
      const newConditions = WFUtils.getConditions(wf);
      const oldConditions = WFUtils.getConditions(originalWf);
      let dirty = false;
      if (oldConditions.length !== newConditions.length) {
        dirty = true;
      } else {
        for (let i = 0; i < oldConditions.length; i++) {
          if (oldConditions[i].condition !== newConditions[i].condition) {
            dirty = true;
            break;
          }
        }
      }
      if (dirty) {
        const outPorts = jjsElement.getGroupPorts("out-condition");
        jjsElement.removePorts(outPorts);
        newConditions.forEach((condition) => {
          jjsElement.addPort({
            id: condition.condition,
            group: "out-condition",
            attrs: { text: { text: condition.condition } },
          });
        });
        jjsElement.resize(
          WFShape_Width,
          WFShape_Height + 10 * newConditions.length
        );
      }
    }
  }

  /**
   * Called when the settings OK button has been clicked.
   * @param {*} wf
   */
  _settingsOk(wf) {
    this.setState({ settingsShowDialog: false });
    this._setElementFromWF(this.state.menuElement, wf);
    this._menuClose();
  } // _settingsOk

  _settingsCancel(wf) {
    this.setState({ settingsShowDialog: false });
    this._menuClose();
  } // _settingsCancel

  _deleteAll() {
    // Delete all elements
    const allCells = this.graph.getCells();
    this.graph.removeCells(allCells);
  }

  async _onLoadData(data) {
    const datalist = JSON.parse(data);

    const screenWidth = this.paper.getComputedSize().width;
    const screenHeight = this.paper.getComputedSize().height;

    const centerPos = screenWidth / 2 - WFShape_Width / 2;

    const jsondata = { cells: [] };

    jsondata.cells = await datalist.map((data, index) => {
      const validKeys = ["PositionX", "PositionY", "StepName", "StepType"];
      const params = {};

      if (data.StepNumber > this.stepCount) {
        this.stepCount = data.StepNumber + 1;
      }

      Object.keys(data).forEach((key) => {
        if (!validKeys.includes(key)) {
          params[key] = data[key];
        }
      });

      const cellData = {
        type: "workflow.Rectangle",
        position: {
          x: data.PositionX
            ? parseFloat(data.PositionX)
            : centerPos + 30 * index,
          y: data.PositionY ? parseFloat(data.PositionY) : 30,
        },
        size: { width: 140, height: 70 },
        angle: 0,
        ports: {
          groups: {
            in: {
              position: "top",
              attrs: {
                circle: {
                  fill: "#4fa8d1",
                  stroke: "black",
                  "stroke-width": 1,
                  r: 8,
                  magnet: "passive",
                },
              },
            },
            out: {
              position: "bottom",
              attrs: {
                circle: {
                  fill: "#daf2dc",
                  stroke: "black",
                  "stroke-width": 1,
                  r: 8,
                  magnet: true,
                },
              },
            },
            "out-condition": {
              position: "bottom",
              attrs: {
                circle: {
                  fill: "#daf2dc",
                  stroke: "black",
                  "stroke-width": 1,
                  r: 8,
                  magnet: true,
                },
                text: { fill: "#6a6c8a", fontSize: 14 },
              },
              label: {
                position: {
                  name: "outsideOriented",
                  args: { offset: 15, attrs: {} },
                },
              },
            },
          },
          items: [
            { id: "in", group: "in" },
            {
              id: "out-succ",
              group: "out",
              attrs: { circle: { fill: "#00FF00" } },
            },
            {
              id: "out-fail",
              group: "out",
              attrs: { circle: { fill: "#FFC0CB" } },
            },
          ],
        },
        z: 3,
        wf: {
          [data.StepName]: {
            [data.StepType + "step"]: params,
          },
        },
        attrs: {
          body: {
            refWidth: "100%",
            refHeight: "100%",
            strokeWidth: 2,
            stroke: "#000000",
            fill: WFShape_BaseColor,
          },
          label: {
            textVerticalAnchor: "middle",
            textAnchor: "middle",
            refX: "50%",
            refY: "50%",
            fontSize: 14,
            fill: "black",
            text: data.StepName,
          },
        },
        markup: [
          {
            tagName: "rect",
            selector: "body",
          },
          {
            tagName: "text",
            selector: "label",
          },
          {
            tagName: "text",
            selector: "icon",
          },
        ],
      };

      return cellData;
    });

    this._deleteAll();

    try {
      this.graph.fromJSON(jsondata);

      // Second pass: Create links
      await datalist.forEach((data) => {
        const sourceElement = this._getElementFromStepNumber(data.StepNumber);
        if (!sourceElement) return;

        /**
         * Add a handler for the context menu.
         */
        this.paper
          .findViewByModel(sourceElement)
          .on("element:contextmenu", (e) => {
            if (e.preventDefault) {
              e.preventDefault();
            } else {
              e.returnValue = false; // For older browsers
            }

            this.setState({
              contextShowMenu: true,
              mouse: { x: e.clientX, y: e.clientY },
              menuElement: sourceElement,
              wf: clone(sourceElement.get("wf")),
            });
          });

        /*
         * Add a handler for the settings menu on a double click.
         */
        this.paper
          .findViewByModel(sourceElement)
          .on("element:pointerdblclick", (e) => {
            this.setState({
              settingsShowDialog: true,
              menuElement: sourceElement,
              wf: clone(sourceElement.get("wf")),
            });
          });

        // Create success link
        if (
          data.NextStepOnSuccess &&
          data.NextStepOnSuccess !== "1000" &&
          data.NextStepOnSuccess !== "1"
        ) {
          const targetElement = this._getElementFromStepNumber(
            data.NextStepOnSuccess
          );
          const targetNumber = data.NextStepOnSuccess;

          if (targetElement) {
            const link = new joint.shapes.standard.Link({
              source: { id: sourceElement.id, port: "out-succ" },
              target: { id: targetElement.id, port: "in" },
              attrs: {
                line: {
                  stroke: "black",
                  "stroke-width": 2,
                },
              },
            });
            this.graph.addCell(link);

            const nextStep = datalist.find(
              (positionData) =>
                positionData.StepNumber == parseInt(data.NextStepOnSuccess)
            );

            if (nextStep && (!nextStep.PositionX || !nextStep.PositionY)) {
              const sourcePosition = sourceElement.position();
              const newPositionY =
                targetNumber !== "999"
                  ? parseFloat(targetNumber) *
                    ((screenHeight - 200) / datalist.length)
                  : screenHeight - 100;
              const newPositionX = sourcePosition.x - 100;

              // Set the position of the target element
              const targetPosition = {
                x: newPositionX,
                y: newPositionY,
              };

              targetElement.position(targetPosition.x, targetPosition.y);
            }
          }
        }

        // Create failure link
        if (
          data.NextStepOnFailure &&
          data.NextStepOnFailure !== "1000" &&
          data.NextStepOnFailure !== "1"
        ) {
          const targetElement = this._getElementFromStepNumber(
            data.NextStepOnFailure
          );
          const targetNumber = data.NextStepOnFailure;

          if (targetElement) {
            const link = new joint.shapes.standard.Link({
              source: { id: sourceElement.id, port: "out-fail" },
              target: { id: targetElement.id, port: "in" },
              attrs: {
                line: {
                  stroke: "black",
                  "stroke-width": 2,
                },
              },
            });
            this.graph.addCell(link);

            const nextStep = datalist.find(
              (positionData) =>
                positionData.StepNumber == parseInt(data.NextStepOnFailure)
            );

            if (nextStep && (!nextStep.PositionX || !nextStep.PositionY)) {
              const sourcePosition = sourceElement.position();
              const newPositionY =
                targetNumber !== "999"
                  ? parseFloat(targetNumber) *
                    ((screenHeight - 200) / datalist.length)
                  : screenHeight - 100;
              const newPositionX = sourcePosition.x + 100;

              // Set the position of the target element
              const targetPosition = {
                x: newPositionX,
                y: newPositionY,
              };
              targetElement.position(targetPosition.x, targetPosition.y);
            }
          }
        }
      });
    } catch (error) {
      console.error("Error loading graph from JSON: ", error);
    }
  }

  _getElementFromStepName(stepName) {
    const foundElement = this.graph.getElements().find((element) => {
      const wf = element.get("wf");
      if (!wf) {
        return false;
      }
      if (WFUtils.getStepName(wf) === stepName) {
        return true;
      }
      return false;
    });
    return foundElement;
  }

  _getElementFromStepNumber(stepNumber) {
    const foundElement = this.graph.getElements().find((element) => {
      const wf = element.get("wf");
      if (!wf) {
        return false;
      }
      if (WFUtils.getStepNumber(wf) === stepNumber) {
        return true;
      }
      return false;
    });
    return foundElement;
  }

  render() {
    return (
      <div>
        {/* This is the anchor element for the JointJS surface */}
        <div ref={(el) => (this.el = el)}></div>

        {/* Button at the bottom */}
        <Grid container justifyContent="flex-end">
          <Button
            color="primary"
            variant="contained"
            onClick={() => {
              this._saveData();
            }}
            style={{ marginRight: 20 }}
          >
            Save
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => {
              this._add(true);
            }}
            style={{ marginRight: 20 }}
          >
            Add Step
          </Button>
        </Grid>

        {/* Context Menu from step */}
        <Menu
          keepMounted
          anchorReference="anchorPosition"
          open={this.state.contextShowMenu}
          anchorPosition={{
            top: this.state.mouse.y - 10,
            left: this.state.mouse.x - 10, // Subtract some from the x,y values so that the menu is not at the very edge.
          }}
          MenuListProps={{ onMouseLeave: () => this._menuClose() }}
        >
          <MenuItem
            onClick={() => {
              this.setState({ settingsShowDialog: true });
            }}
          >
            Settings
          </MenuItem>
          <MenuItem onClick={() => this._duplicateElement()}>
            Duplicate
          </MenuItem>
          <MenuItem onClick={() => this._deleteElement()}>Delete</MenuItem>
        </Menu>

        {/* SETTINGS */}
        <SettingsDialog
          open={this.state.settingsShowDialog}
          wf={this.state.wf}
          onOk={this._settingsOk.bind(this)}
          onCancel={this._settingsCancel.bind(this)}
        />
      </div>
    );
  } // render
}

/*

*/
export default MyJointJS;
