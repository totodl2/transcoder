const compare = require('./compareCap');

describe('compareCap', () => {
  it('should compare range', () => {
    expect(compare({ min: 5, max: 10 }, { min: 0, max: 6 })).toBe(true);
    expect(compare({ min: 5, max: 10 }, { min: 9, max: 15 })).toBe(true);
    expect(compare({ min: 0, max: 5 }, { min: 5, max: 10 })).toBe(true);
    expect(compare({ min: 10, max: 15 }, { min: 5, max: 10 })).toBe(true);
    expect(compare({ min: 11, max: 15 }, { min: 5, max: 10 })).toBe(false);
    expect(compare({ min: 11, max: 15 }, 12)).toBe(true);
    expect(compare({ min: 11, max: 15 }, 42)).toBe(false);
    expect(compare(12, { min: 11, max: 15 })).toBe(true);
    expect(compare(42, { min: 11, max: 15 })).toBe(false);
    expect(compare('12.4', { min: 11, max: 15 })).toBe(true);
  });

  it('should compare fractions', () => {
    expect(compare({ num: 2, denom: 5 }, 0.4)).toBe(true);
    expect(compare({ num: 1, denom: 3 }, 0.3)).toBe(false);
    expect(compare(0.4, { num: 2, denom: 5 })).toBe(true);
    expect(compare(0.3, { num: 1, denom: 3 })).toBe(false);
    expect(compare({ num: 1, denom: 3 }, { num: 1, denom: 3 })).toBe(true);
    expect(compare({ num: 1, denom: 3 }, { num: 1, denom: 4 })).toBe(false);
  });

  it('should compare range with fraction', () => {
    expect(
      compare(
        { min: { num: 10, denom: 5 }, max: { num: 100, denom: 10 } },
        { min: { num: 10, denom: 2 }, max: 10 },
      ),
    ).toBe(true);
    expect(
      compare({ min: { num: 10, denom: 5 }, max: { num: 100, denom: 10 } }, 11),
    ).toBe(false);
    expect(
      compare(10, { min: { num: 10, denom: 5 }, max: { num: 100, denom: 10 } }),
    ).toBe(true);
  });

  it('should compare arrays', () => {
    expect(compare([1, 2, 3], [1])).toBe(true);
    expect(compare([1, 2, 3], [0])).toBe(false);
    expect(compare([1, 2, 3], 1)).toBe(true);
    expect(compare([1, 2, 3], 4)).toBe(false);
    expect(compare({ num: 10, denom: 5 }, [1, 2, 3])).toBe(true);
    expect(compare(4, [1, 2, 3])).toBe(false);
    expect(compare({ min: 2, max: 10 }, [1, 2, 3])).toBe(true);
    expect(compare([1, 2, 3], { min: 2, max: 10 })).toBe(true);
  });
});
