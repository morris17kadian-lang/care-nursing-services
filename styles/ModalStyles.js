import { StyleSheet } from 'react-native';
import { COLORS } from '../constants';

export const modalStyles = StyleSheet.create({
  // Standard centered modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Modal overlay with bottom padding (for tab navigation)
  modalOverlayWithTabs: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },

  // Bottom-aligned modal overlay
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  // Standard modal content container
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },

  // Large modal content (90% height)
  modalContentLarge: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },

  // Bottom sheet style modal
  modalContentBottomSheet: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    margin: 10,
    maxHeight: '95%',
    minHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },

  // Modal header
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  // Modal title
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },

  // Modal subtitle
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  // Modal scroll view
  modalScrollView: {
    maxHeight: '60%',
    paddingHorizontal: 20,
  },

  // Modal scroll content
  modalScrollContent: {
    paddingBottom: 20,
    paddingTop: 10,
  },

  // Modal body (for non-scrolling content)
  modalBody: {
    padding: 20,
  },

  // Modal button row (fixed at bottom)
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  // Close button
  closeButton: {
    padding: 4,
  },
});
