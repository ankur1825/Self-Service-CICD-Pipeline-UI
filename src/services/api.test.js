import { clearExpiredSession } from './api';

describe('expired session handling', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ username: 'client-user', token: 'expired' }));
  });

  test('clears the stale session and navigates to the login explanation', () => {
    const navigate = jest.fn();

    clearExpiredSession(navigate);

    expect(localStorage.getItem('user')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/pipeline/login?reason=session-expired');
  });
});
