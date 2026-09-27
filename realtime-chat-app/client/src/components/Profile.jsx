// client/src/components/Profile.jsx
// Small header inside the sidebar showing the logged-in user + logout + theme toggle.

import { useAuth } from '../context/AuthContext';

export default function Profile({ darkMode, onToggleTheme }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="profile-bar">
      <div className="avatar small">
        {user.profilePicture ? (
          <img src={user.profilePicture} alt={user.name} />
        ) : (
          <span>{user.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="profile-name">{user.name}</div>
      <div className="profile-actions">
        {onToggleTheme && (
          <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme">
            {darkMode ? '☀️' : '🌙'}
          </button>
        )}
        <button className="icon-btn" onClick={logout} title="Log out">
          ⏻
        </button>
      </div>
    </div>
  );
}
