function getUser(trail = {}) {
  const { admin_user, users_permissions_user } = trail;

  if (!admin_user && !users_permissions_user) {
    return 'Unknown';
  }

  if (admin_user) {
    // Use username if firstname/lastname are not available
    if (admin_user.firstname || admin_user.lastname) {
      return [admin_user.firstname, admin_user.lastname, '(Admin)']
        .filter(Boolean)
        .join(' ');
    } else if (admin_user.username) {
      return `${admin_user.username} (Admin)`;
    } else if (admin_user.email) {
      return `${admin_user.email} (Admin)`;
    }
    // Return any available identifier
    return admin_user.username || admin_user.email || 'Admin';
  }

  if (users_permissions_user) {
    if (users_permissions_user.username) {
      return `${users_permissions_user.username} (User)`;
    }
    return `${users_permissions_user.email || 'User'} (User)`;
  }
  
  return 'Unknown';
}

export default getUser;
