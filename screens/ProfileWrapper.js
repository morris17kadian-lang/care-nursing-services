import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import AdminProfileScreen from './AdminProfileScreen';
import NurseProfileScreen from './NurseProfileScreen';
import ProfileScreen from './ProfileScreen';

const ProfileWrapper = (props) => {
  const { user } = useContext(AuthContext);

  if (user?.role === 'admin' || user?.role === 'superAdmin') {
    return <AdminProfileScreen {...props} />;
  } else if (user?.role === 'nurse') {
    return <NurseProfileScreen {...props} />;
  } else {
    return <ProfileScreen {...props} />;
  }
};

export default ProfileWrapper;
