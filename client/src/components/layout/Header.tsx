import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const routeTitles: Record<string, string> = {
  '/': 'Planning Grid',
  '/admin/hierarchy': 'Hierarchy Configuration',
  '/admin/measures': 'Measure Configuration',
  '/admin/time-periods': 'Time Period Configuration',
  '/admin/users': 'User Management',
};

const Header: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const pageTitle = routeTitles[location.pathname] || 'MerchFin';

  const roleBadgeColor: Record<string, string> = {
    admin: '#4263eb',
    planner: '#37b24d',
    viewer: '#868e96',
  };

  return (
    <header style={styles.header}>
      <h2 style={styles.title}>{pageTitle}</h2>

      <div style={styles.right}>
        {user && (
          <>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{user.name}</span>
              <span
                style={{
                  ...styles.roleBadge,
                  background: roleBadgeColor[user.role] || '#868e96',
                }}
              >
                {user.role}
              </span>
            </div>
            <button onClick={logout} style={styles.logoutBtn}>
              Sign Out
            </button>
          </>
        )}
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: 56,
    background: '#fff',
    borderBottom: '1px solid #dee2e6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#212529',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#495057',
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#fff',
    padding: '2px 8px',
    borderRadius: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  logoutBtn: {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 500,
    color: '#495057',
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};

export default Header;
