import React, { createContext, useContext, useState, useEffect } from 'react';
import ApiService from '../services/ApiService';
import { useAuth } from './AuthContext';

const ProfileEditContext = createContext();

export const useProfileEdit = () => {
  const context = useContext(ProfileEditContext);
  if (!context) {
    throw new Error('useProfileEdit must be used within a ProfileEditProvider');
  }
  return context;
};

export const ProfileEditProvider = ({ children }) => {
  const [editRequests, setEditRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const loadEditRequests = async (statusFilter = null) => {
    try {
      setLoading(true);
      // Admin gets all pending requests, others get filtered list
      const isAdmin = user && (user.role === 'admin' || user.code === 'ADMIN001');
      const data = isAdmin
        ? await ApiService.getPendingProfileEditRequests()
        : await ApiService.getProfileEditRequests({ status: statusFilter || undefined });
      setEditRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Failed to load edit requests:', error);
      // Keep existing requests on error
    } finally {
      setLoading(false);
    }
  };

  // Load edit requests from backend when user changes or on mount
  useEffect(() => {
    if (user) {
      // console.log(`🔄 User changed, reloading edit requests. User: ${user?.name} (${user?.role})`);
      loadEditRequests();
    }
  }, [user]);

  const createEditRequest = async (nurseData) => {
    try {
      setLoading(true);
      const created = await ApiService.createProfileEditRequest({
        nurseId: nurseData.nurseId,
        nurseName: nurseData.nurseName,
        nurseCode: nurseData.nurseCode,
        requestedBy: user?.id || null,
      });
      await loadEditRequests();
      return created;
    } catch (error) {
      console.error('Failed to create edit request:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPendingEditRequests = () => {
    return editRequests.filter(req => req.status === 'pending');
  };

  const approveEditRequest = async (requestId, nurseId) => {
    try {
      setLoading(true);
      const updated = await ApiService.approveProfileEditRequest(requestId);
      await loadEditRequests();
      return updated;
    } catch (error) {
      console.error('Failed to approve edit request:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const denyEditRequest = async (requestId) => {
    try {
      setLoading(true);
      const updated = await ApiService.denyProfileEditRequest(requestId);
      await loadEditRequests();
      return updated;
    } catch (error) {
      console.error('Failed to deny edit request:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const canEditProfile = async (nurseId) => {
    try {
      const response = await ApiService.canEditProfile(nurseId);
      return response?.success ? !!response.canEdit : false;
    } catch (error) {
      console.error('Failed to check edit permission:', error);
      return false;
    }
  };

  const revokeEditPermission = async (nurseId) => {
    try {
      setLoading(true);
      const response = await ApiService.revokeEditPermission(nurseId);
      if (!response?.success) throw new Error(response?.error || 'Failed to revoke edit permission');
      await loadEditRequests();
      return response.data;
    } catch (error) {
      console.error('Failed to revoke edit permission:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProfileEditContext.Provider
      value={{
        editRequests,
        loading,
        createEditRequest,
        getPendingEditRequests,
        approveEditRequest,
        denyEditRequest,
        canEditProfile,
        revokeEditPermission,
        refreshRequests: loadEditRequests,
      }}
    >
      {children}
    </ProfileEditContext.Provider>
  );
};
