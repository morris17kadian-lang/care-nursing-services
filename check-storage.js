const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function checkUsers() {
  try {
    const usersData = await AsyncStorage.getItem('users');
    if (usersData) {
      const users = JSON.parse(usersData);
      console.log('Found users:', users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        hasProfilePhoto: !!u.profilePhoto
      })));
    } else {
      console.log('No users found in AsyncStorage');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();
