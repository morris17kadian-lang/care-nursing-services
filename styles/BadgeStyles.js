import { StyleSheet } from 'react-native';
import { COLORS, GRADIENTS } from '../constants';

export const badgeStyles = StyleSheet.create({
  // Status badge (with gradient background)
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // Status badge text
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },

  // Pending badge
  pendingBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pending badge text
  pendingBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Active indicator badge
  activeIndicator: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  // Active text
  activeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },

  // Notification badge
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Notification badge text
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },

  // Service pill/chip (unselected)
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    gap: 6,
  },

  // Service pill (selected)
  servicePillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  // Service pill text (unselected)
  servicePillText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary,
  },

  // Service pill text (selected)
  servicePillTextSelected: {
    color: COLORS.white,
  },
});
