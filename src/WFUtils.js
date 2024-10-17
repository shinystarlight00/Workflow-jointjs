function getStepName(wf) {
  if (!wf) {
    throw new Error("No wf parameter");
  }
  let propertyNames = Object.getOwnPropertyNames(wf);
  if (propertyNames > 1) {
    console.error("Too many properties!");
  }
  let stepName = propertyNames[0];
  return stepName;
}

function setStepName(wf, newName) {
  if (!wf) {
    throw new Error("No wf parameter");
  }
  if (!newName) {
    throw new Error("no newName");
  }
  const originalStepName = getStepName(wf);
  const content = getStepContent(wf);
  delete wf[originalStepName];
  wf[newName] = content;
}

function setStepNumber(wf, newNumber) {
  if (!wf) {
    throw new Error("No wf parameter");
  }
  if (!newNumber) {
    throw new Error("no newNumber");
  }
  const stepName = getStepName(wf);
  const stepType = getStepType(wf);

  wf[stepName][stepType].StepNumber = newNumber;
}

function getStepContent(wf) {
  if (!wf) {
    throw new Error("No wf parameter");
  }
  const stepName = getStepName(wf);
  return wf[stepName];
}

function getStepType(wf) {
  if (!wf) {
    throw new Error("No wf parameter");
  }
  const stepContent = getStepContent(wf);

  return Object.keys(stepContent)[0];
}

function getConditions(wf) {
  if (!wf) {
    throw new Error("No wf parameter");
  }
  if (getStepType(wf) !== "switch") {
    console.error("Request to get conditions from non switch step");
    return null;
  }
  const content = getStepContent(wf);
  // We know that it will have a property called "switch" which is an array of {condition, next}
  return content.switch;
}

function getStepNumber(wf) {
  if (!wf) {
    throw new Error("No wf parameter");
  }

  const stepName = Object.keys(wf)[0];
  const stepType = Object.keys(wf[stepName])[0];

  const params = wf[stepName][stepType];

  return params.StepNumber ? params.StepNumber : 0;
}

export default {
  getStepName,
  getStepContent,
  getStepType,
  getConditions,
  setStepName,
  getStepNumber,
  setStepNumber,
};
