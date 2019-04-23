// This file:
// - declares symbols that are provided outisde of dygraphs
// - defines custom types used internally


/**
 * @typedef {function(
 *   (number|Date),
 *   number,
 *   function(string):*,
 *   (Dygraph|undefined)
 * ):string}
 */
let AxisLabelFormatter;


/**
 * @typedef {function(number,function(string),Dygraph):string}
 */
let ValueFormatter;


/**
 * @typedef {Array.<Array.<string|number|Array.<number>>>}
 */
let DygraphDataArray;

/**
 * @constructor
 */
function GVizDataTable() {}
