function isEmpty(param) {
  if (
    param === "" ||
    param === null ||
    param === undefined ||
    (Array.isArray(param) && param.length === 0) ||
    (typeof param === "object" &&
      param !== null &&
      Object.keys(param).length === 0)
  ) {
    return true;
  }

  return false;
}

module.exports = isEmpty;
