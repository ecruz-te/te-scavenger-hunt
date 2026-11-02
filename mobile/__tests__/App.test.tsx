import { render, screen } from '@testing-library/react-native';

import App from '../App';

describe('App', () => {
  it('renders the title screen', async () => {
    await render(<App />);
    expect(screen.getByText('Scavenger Hunt')).toBeTruthy();
  });
});
