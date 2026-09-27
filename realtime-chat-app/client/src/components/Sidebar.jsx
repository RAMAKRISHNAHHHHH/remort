// client/src/components/Sidebar.jsx
// Left column: profile summary, search box, and the list of users.

import { useState } from 'react';
import Profile from './Profile';

export default function Sidebar({
  users,
  onlineUserIds,
  selectedUser,
  onSelectUser,
  unreadCounts,
  darkMode,
  onToggleTheme,
}) {
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="sidebar">
      <Profile darkMode={darkMode} onToggleTheme={onToggleTheme} />

      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="user-list">
        {filteredUsers.length === 0 && (
          <div className="empty-state">No users found</div>
        )}

        {filteredUsers.map((u) => {
          const isOnline = onlineUserIds.has(u._id);
          const unread = unreadCounts?.[u._id] || 0;
          return (
            <div
              key={u._id}
              className={`user-item ${selectedUser?._id === u._id ? 'active' : ''}`}
              onClick={() => onSelectUser(u)}
            >
              <div className="avatar">
                {u.profilePicture ? (
                  <img src={u.profilePicture} alt={u.name} />
                ) : (
                  <span>{u.name.charAt(0).toUpperCase()}</span>
                )}
                <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
              </div>
              <div className="user-item-info">
                <span className="user-item-name">{u.name}</span>
                <span className="user-item-status">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              {unread > 0 && <span className="unread-badge">{unread}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
