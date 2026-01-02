import { Link, useLocation } from 'react-router-dom';
import { NAV_SECTIONS, ADMIN_SECTION, NavItem } from './navConfig';
import { useAdmin } from '@/hooks/useAdmin';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobile?: boolean;
  onClose?: () => void;
}

function NavLink({
  item,
  collapsed,
  isActive,
  onClick,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      } ${collapsed ? 'justify-center' : ''}`}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
      />
    </svg>
  );
}

export function Sidebar({ collapsed, onToggleCollapse, mobile, onClose }: SidebarProps) {
  const location = useLocation();
  const { isAdmin } = useAdmin();

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  const handleLinkClick = () => {
    if (mobile && onClose) {
      onClose();
    }
  };

  // Combine nav sections with admin section if user is admin
  const allSections = isAdmin ? [...NAV_SECTIONS, ADMIN_SECTION] : NAV_SECTIONS;

  return (
    <aside
      className={`flex flex-col bg-white border-r border-gray-200 h-full transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-gray-200 ${collapsed ? 'justify-center' : ''}`}>
        <Link to="/" className="flex items-center gap-2" onClick={handleLinkClick}>
          <svg
            className="w-8 h-8 text-blue-600 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <circle cx="12" cy="12" r="3" strokeWidth="2" />
            <path strokeWidth="2" d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
          {!collapsed && <span className="text-xl font-bold text-gray-900">Peloton</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {allSections.map((section) => (
          <div key={section.id}>
            {!collapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.label}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  isActive={isActive(item)}
                  onClick={handleLinkClick}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle (desktop only) */}
      {!mobile && (
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={onToggleCollapse}
            className="flex items-center justify-center w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <CollapseIcon collapsed={collapsed} />
            {!collapsed && <span className="ml-2">Collapse</span>}
          </button>
        </div>
      )}
    </aside>
  );
}
