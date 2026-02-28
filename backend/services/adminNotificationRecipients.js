const ADMIN_NOTIFICATION_ROLES = {
  FULL_ACCESS: 'full_access',
  SCHEDULING_ONLY: 'scheduling_only',
  FINANCIAL_ONLY: 'financial_only',
};

const NOTIFICATION_CATEGORIES = {
  ALL: 'all',
  SCHEDULING: 'scheduling',
  FINANCIAL: 'financial',
};

function normalizeString(value) {
  return String(value || '').trim().toLowerCase();
}

function getDisplayName(record) {
  return (
    record?.fullName ||
    record?.name ||
    `${record?.firstName || ''} ${record?.lastName || ''}`.trim()
  );
}

function inferRoleFromKnownStaff(adminUser) {
  const email = normalizeString(adminUser?.email);
  const name = normalizeString(getDisplayName(adminUser));

  if (email === 'prince@876nurses.com' || name.includes('prince')) {
    return ADMIN_NOTIFICATION_ROLES.SCHEDULING_ONLY;
  }

  return ADMIN_NOTIFICATION_ROLES.FULL_ACCESS;
}

function getEffectiveEmailNotificationRole(adminUser) {
  const explicitRole = normalizeString(adminUser?.emailNotificationRole);

  if (
    explicitRole === ADMIN_NOTIFICATION_ROLES.FULL_ACCESS ||
    explicitRole === ADMIN_NOTIFICATION_ROLES.SCHEDULING_ONLY ||
    explicitRole === ADMIN_NOTIFICATION_ROLES.FINANCIAL_ONLY
  ) {
    return explicitRole;
  }

  return inferRoleFromKnownStaff(adminUser);
}

function categoryAllowsRole(category, role) {
  switch (category) {
    case NOTIFICATION_CATEGORIES.SCHEDULING:
      return (
        role === ADMIN_NOTIFICATION_ROLES.FULL_ACCESS ||
        role === ADMIN_NOTIFICATION_ROLES.SCHEDULING_ONLY
      );
    case NOTIFICATION_CATEGORIES.FINANCIAL:
      return (
        role === ADMIN_NOTIFICATION_ROLES.FULL_ACCESS ||
        role === ADMIN_NOTIFICATION_ROLES.FINANCIAL_ONLY
      );
    case NOTIFICATION_CATEGORIES.ALL:
    default:
      return true;
  }
}

function selectAdminRecipients(admins = [], category = NOTIFICATION_CATEGORIES.ALL) {
  return admins.filter((adminUser) => {
    if (!adminUser?.isActive) return false;
    if (!adminUser?.email) return false;

    const role = getEffectiveEmailNotificationRole(adminUser);
    return categoryAllowsRole(category, role);
  });
}

module.exports = {
  ADMIN_NOTIFICATION_ROLES,
  NOTIFICATION_CATEGORIES,
  getEffectiveEmailNotificationRole,
  selectAdminRecipients,
};
