/**
 * @license
 * Copyright 2011 Dan Vanderkam (danvdk@gmail.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 */

/**
 * @fileoverview
 * Including this file will add several additional shapes to Dygraph.Circles
 * which can be passed to drawPointCallback.
 * See tests/custom-circles.html for usage.
 */

(function () {

/**
 * @param {!CanvasRenderingContext2D} ctx the canvas context
 * @param {number} sides the number of sides in the shape.
 * @param {number} radius the radius of the image.
 * @param {number} cx center x coordate
 * @param {number} cy center y coordinate
 * @param {number=} rotationRadians the shift of the initial angle, in radians.
 * @param {number=} delta the angle shift for each line. If missing, creates a
 *     regular polygon.
 */
  const regularShape = function (
    ctx, sides, radius, cx, cy, rotationRadians, delta) {
    rotationRadians = rotationRadians || 0;
    delta = delta || Math.PI * 2 / sides;

    ctx.beginPath();
    const initialAngle = rotationRadians;
    let angle = initialAngle;

    const computeCoordinates = function () {
      const x = cx + (Math.sin(angle) * radius);
      const y = cy + (-Math.cos(angle) * radius);
      return [x, y];
    };

    const initialCoordinates = computeCoordinates();
    const x = initialCoordinates[0];
    const y = initialCoordinates[1];
    ctx.moveTo(x, y);

    for (let idx = 0; idx < sides; idx++) {
      angle = (idx == sides - 1) ? initialAngle : (angle + delta);
      const coords = computeCoordinates();
      ctx.lineTo(coords[0], coords[1]);
    }
    ctx.fill();
    ctx.stroke();
  };

  /**
 * TODO(danvk): be more specific on the return type.
 * @param {number} sides
 * @param {number=} rotationRadians
 * @param {number=} delta
 * @return {Function}
 * @private
 */
  const shapeFunction = function (sides, rotationRadians, delta) {
    return function (g, name, ctx, cx, cy, color, radius) {
      ctx.strokeStyle = color;
      ctx.fillStyle = 'white';
      regularShape(ctx, sides, radius, cx, cy, rotationRadians, delta);
    };
  };

  const customCircles = {
    TRIANGLE: shapeFunction(3),
    SQUARE: shapeFunction(4, Math.PI / 4),
    DIAMOND: shapeFunction(4),
    PENTAGON: shapeFunction(5),
    HEXAGON: shapeFunction(6),
    CIRCLE(g, name, ctx, cx, cy, color, radius) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.fillStyle = 'white';
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI, false);
      ctx.fill();
      ctx.stroke();
    },
    STAR: shapeFunction(5, 0, 4 * Math.PI / 5),
    PLUS(g, name, ctx, cx, cy, color, radius) {
      ctx.strokeStyle = color;

      ctx.beginPath();
      ctx.moveTo(cx + radius, cy);
      ctx.lineTo(cx - radius, cy);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, cy + radius);
      ctx.lineTo(cx, cy - radius);
      ctx.closePath();
      ctx.stroke();
    },
    EX(g, name, ctx, cx, cy, color, radius) {
      ctx.strokeStyle = color;

      ctx.beginPath();
      ctx.moveTo(cx + radius, cy + radius);
      ctx.lineTo(cx - radius, cy - radius);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + radius, cy - radius);
      ctx.lineTo(cx - radius, cy + radius);
      ctx.closePath();
      ctx.stroke();
    },
  };

  for (const k in customCircles) {
    if (!customCircles.hasOwnProperty(k)) continue;
    Dygraph.Circles[k] = customCircles[k];
  }

}());
