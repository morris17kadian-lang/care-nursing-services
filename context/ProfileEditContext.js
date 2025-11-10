import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [approvedEdits, setApprovedEdits] = useState({});

  // Load edit requests from storage
  useEffect(() => {
    loadEditRequests();
    loadApprovedEdits();
  }, []);

  const loadEditRequests = async () => {
    try {
      const stored = await AsyncStorage.getItem('profile_edit_requests');
      if (stored) {
        setEditRequests(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load edit requests:', error);
    }
  };

  const loadApprovedEdits = async () => {
    try {
      const stored = await AsyncStorage.getItem('approved_profile_edits');
      if (stored) {
        setApprovedEdits(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load approved edits:', error);
    }
  };

  const saveEditRequests = async (requests) => {
    try {
      await AsyncStorage.setItem('profile_edit_requests', JSON.stringify(requests));
      setEditRequests(requests);
    } catch (error) {
      console.error('Failed to save edit requests:', error);
    }
  };

  const saveApprovedEdits = async (edits) => {
    try {
      await AsyncStorage.setItem('approved_profile_edits', JSON.stringify(edits));
      setApprovedEdits(edits);
    } catch (error) {
      console.error('Failed to save approved edits:', error);
    }
  };

  const createEditRequest = async (nurseData) => {
    const newRequest = {
      id: `edit_${Date.now()}`,
      nurseId: nurseData.nurseId,
      nurseName: nurseData.nurseName,
      nurseCode: nurseData.nurseCode,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      type: 'profile_edit_request'
    };

    const updatedRequests = [...editRequests, newRequest];
    await saveEditRequests(updatedRequests);
    return newRequest;
  };

  const getPendingEditRequests = () => {
    return editRequests.filter(req => req.status === 'pending');
  };

  const approveEditRequest = async (requestId, nurseId) => {
    // Update request status
    const updatedRequests = editRequests.map(req =>
      req.id === requestId ? { ...req, status: 'approved', approvedAt: new Date().toISOString() } : req
    );
    await saveEditRequests(updatedRequests);

    // Grant edit permission (expires in 30 minutes)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const updatedApprovedEdits = {
      ...approvedEdits,
      [nurseId]: { approved: true, expiresAt, approvedAt: new Date().toISOString() }
    };
    await saveApprovedEdits(updatedApprovedEdits);
  };

  const denyEditRequest = async (requestId) => {
    const updatedRequests = editRequests.map(req =>
      req.id === requestId ? { ...req, status: 'denied', deniedAt: new Date().toISOString() } : req
    );
    await saveEditRequests(updatedRequests);
  };

  const canEditProfile = (nurseId) => {
    const approval = approvedEdits[nurseId];
    if (!approval || !approval.approved) return false;
    
    // Check if approval has expired
    const now = new Date();
    const expiresAt = new Date(approval.expiresAt);
    return now < expiresAt;
  };

  const revokeEditPermission = async (nurseId) => {
    const updatedApprovedEdits = { ...approvedEdits };
    delete updatedApprovedEdits[nurseId];
    await saveApprovedEdits(updatedApprovedEdits);
  };

  return (
    <ProfileEditContext.Provider
      value={{
        editRequests,
        approvedEdits,
        createEditRequest,
        getPendingEditRequests,
        approveEditRequest,
        denyEditRequest,
        canEditProfile,
        revokeEditPermission,
      }}
    >
      {children}
    </ProfileEditContext.Provider>
  );
};
