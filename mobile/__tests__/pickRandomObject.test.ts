import { pickRandomObject } from '../src/pickRandomObject';

describe('pickRandomObject', () => {
  it('never returns the current object when there are others', () => {
    for (let i = 0; i < 50; i++) {
      expect(pickRandomObject(['mug', 'spoon'], 'mug')).toBe('spoon');
    }
  });

  it('returns the only object even if it is current', () => {
    expect(pickRandomObject(['mug'], 'mug')).toBe('mug');
  });
});
