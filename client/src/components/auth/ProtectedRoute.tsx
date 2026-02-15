import React, { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const ProtectedRoute: React.FC = () => {
  const { user, token, isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (isLoading) {
    return (
      <div style={styles.spinnerWrapper}>
        <div style={styles.spinner} />
        <p style={styles.spinnerText}>Loading...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const spinnerKeyframes = `
@keyframes merchfin-spin {
  to { transform: rotate(360deg); }
}
`;

// Inject keyframes once
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = spinnerKeyframes;
  document.head.appendChild(styleEl);
}

const styles: Record<string, React.CSSProperties> = {
  spinnerWrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #dee2e6',
    borderTopColor: '#4263eb',
    borderRadius: '50%',
    animation: 'merchfin-spin 0.7s linear infinite',
  },
  spinnerText: {
    marginTop: 12,
    fontSize: 14,
    color: '#868e96',
  },
};

export default ProtectedRoute;
