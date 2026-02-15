import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface NavItem {
  label: string;
  path: string;
  icon?: string;
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const mainLinks: NavItem[] = [
    { label: 'Planning', path: '/' },
  ];

  const adminLinks: NavItem[] = [
    { label: 'Hierarchy', path: '/admin/hierarchy' },
    { label: 'Measures', path: '/admin/measures' },
    { label: 'Time Periods', path: '/admin/time-periods' },
    { label: 'Users', path: '/admin/users' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const renderLink = (item: NavItem) => {
    const active = isActive(item.path);
    return (
      <Link
        key={item.path}
        to={item.path}
        style={{
          ...styles.link,
          background: active ? 'rgba(66,99,235,0.15)' : 'transparent',
          color: active ? '#748ffc' : '#a0a4b8',
          borderLeft: active ? '3px solid #4263eb' : '3px solid transparent',
        }}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logoArea}>
        <h1 style={styles.logo}>MerchFin</h1>
        <span style={styles.version}>v1.0</span>
      </div>

      <nav style={styles.nav}>
        <div style={styles.section}>
          <span style={styles.sectionLabel}>MAIN</span>
          {mainLinks.map(renderLink)}
        </div>

        {isAdmin && (
          <div style={styles.section}>
            <span style={styles.sectionLabel}>ADMIN</span>
            {adminLinks.map(renderLink)}
          </div>
        )}
      </nav>

      <div style={styles.footer}>
        <div style={styles.footerDivider} />
        <span style={styles.footerText}>Merchandise Financial Planning</span>
      </div>
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 240,
    minWidth: 240,
    height: '100vh',
    background: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 100,
  },
  logoArea: {
    padding: '24px 20px 20px',
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
  },
  logo: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.3px',
  },
  version: {
    fontSize: 10,
    color: '#5c5f73',
    fontWeight: 500,
  },
  nav: {
    flex: 1,
    padding: '8px 0',
    overflowY: 'auto',
  },
  section: {
    marginBottom: 8,
  },
  sectionLabel: {
    display: 'block',
    padding: '16px 20px 8px',
    fontSize: 10,
    fontWeight: 600,
    color: '#5c5f73',
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
  },
  link: {
    display: 'block',
    padding: '9px 20px 9px 17px',
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'all 0.15s',
    cursor: 'pointer',
  },
  footer: {
    padding: '16px 20px 20px',
  },
  footerDivider: {
    height: 1,
    background: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  footerText: {
    fontSize: 10,
    color: '#5c5f73',
  },
};

export default Sidebar;
