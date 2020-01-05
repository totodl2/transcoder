const isRange = el =>
  typeof el === 'object' && el.min !== undefined && el.max !== undefined;
const isFraction = el =>
  typeof el === 'object' && el.num !== undefined && el.denom !== undefined;

const convertValue = value => {
  if (isFraction(value)) {
    return value.num / value.denom;
  }
  return value;
};

const isBetween = (point, min, max) => (point - min) * (point - max) <= 0;

const isRangesColliding = (amin, amax, bmin, bmax) =>
  isBetween(bmin, amin, amax) ||
  isBetween(bmax, amin, amax) ||
  isBetween(amin, bmin, bmax) ||
  isBetween(amax, bmin, bmax);

const compareRange = (range, point) =>
  isRange(point)
    ? isRangesColliding(
        convertValue(range.min),
        convertValue(range.max),
        convertValue(point.min),
        convertValue(point.max),
      )
    : isBetween(
        parseFloat(point),
        convertValue(range.min),
        convertValue(range.max),
      );

const compareArray = (arr, other) => {
  const otherArray = Array.isArray(other);
  return arr.some(a => {
    if (otherArray) {
      return other.some(b => compareCap(a, b));
    }
    return compareCap(a, other);
  });
};

const compareCap = (a, b) => {
  const newA = convertValue(a);
  const newB = convertValue(b);

  if (Array.isArray(a)) {
    return compareArray(a, b);
  }
  if (Array.isArray(b)) {
    return compareArray(b, a);
  }
  if (isRange(a)) {
    return compareRange(a, b);
  }
  if (isRange(b)) {
    return compareRange(b, a);
  }

  // eslint-disable-next-line eqeqeq
  return newA == newB;
};

module.exports = compareCap;
