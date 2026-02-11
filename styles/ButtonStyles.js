import { StyleSheet } from 'react-native';
import { COLORS } from '../constants';

export const buttonStyles = StyleSheet.create({
  // Standard details button (with gradient)
  detailsButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Details button gradient style
  detailsButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Details button text
  detailsButtonText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },

  // Confirmed button (with gradient)
  confirmedButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Confirmed button gradient style
  confirmedButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Confirmed button text
  confirmedButtonText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },

  // View button (with gradient)
  viewButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },

  // View button gradient style
  viewButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // View button text
  viewButtonText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },

  // Complete button
  completeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },

  // Complete button text
  completeButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Accept button
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },

  // Accept button text
  acceptButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Decline button
  declineButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },

  // Decline button text
  declineButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Cancel button (for modals)
  cancelButton: {
    backgroundColor: COLORS.border,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },

  // Cancel button text
  cancelButtonText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '600',
  },

  // Confirm button (for modals - with gradient)
  confirmButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Confirm button gradient style
  confirmButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },

  // Confirm button text
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal button (base style)
  modalButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Warning pill button (orange gradient look)
  warningPillButton: {
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  warningPillGradient: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  warningPillText: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
});
