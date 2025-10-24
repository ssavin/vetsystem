import { Link, useLocation } from 'wouter';

const menuItems = [
  { path: '/clients', label: 'Клиенты', icon: '👥' },
  { path: '/appointments', label: 'Записи на прием', icon: '📅' },
  { path: '/invoices', label: 'Счета', icon: '💰' },
  { path: '/printer-settings', label: 'Принтер', icon: '🖨️' },
  { path: '/settings', label: 'Настройки', icon: '⚙️' },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <nav
      style={{
        width: '250px',
        background: '#F9FAFB',
        borderRight: '1px solid #D1D9E0',
        padding: '20px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      {menuItems.map((item) => {
        const isActive = location === item.path || (item.path === '/clients' && location === '/');
        
        return (
          <Link key={item.path} href={item.path}>
            <a
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 20px',
                color: isActive ? '#1976D2' : '#334155',
                background: isActive ? '#E3F2FD' : 'transparent',
                borderLeft: isActive ? '3px solid #1976D2' : '3px solid transparent',
                textDecoration: 'none',
                fontWeight: isActive ? '600' : '400',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#F1F5F9';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          </Link>
        );
      })}
    </nav>
  );
}
