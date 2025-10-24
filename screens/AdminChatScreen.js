import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, FlatList, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../constants';

export default function AdminChatScreen({ navigation }) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState({});

  // Sample patient conversations
  const patients = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john@example.com',
      avatar: null,
      lastMessage: 'Thank you for the appointment reminder',
      lastMessageTime: '2:30 PM',
      unreadCount: 2,
      status: 'online',
      type: 'patient'
    },
    {
      id: '2',
      name: 'Mary Johnson',
      email: 'mary@example.com',
      avatar: null,
      lastMessage: 'Is my physiotherapy session still scheduled for tomorrow?',
      lastMessageTime: '1:15 PM',
      unreadCount: 1,
      status: 'offline',
      type: 'patient'
    },
    {
      id: '3',
      name: 'Robert Davis',
      email: 'robert@example.com',
      avatar: null,
      lastMessage: 'The nurse was very professional, thank you',
      lastMessageTime: '11:45 AM',
      unreadCount: 0,
      status: 'online',
      type: 'patient'
    },
    {
      id: '4',
      name: 'Sarah Williams',
      email: 'sarah@example.com',
      avatar: null,
      lastMessage: 'Could we reschedule my appointment?',
      lastMessageTime: 'Yesterday',
      unreadCount: 3,
      status: 'offline',
      type: 'patient'
    }
  ];

  // Staff contacts
  const staff = [
    {
      id: 'nurse1',
      name: 'Sarah Johnson, RN',
      email: 'sarah.johnson@care.com',
      avatar: null,
      lastMessage: 'Patient update: Mr. Smith is responding well',
      lastMessageTime: '3:45 PM',
      unreadCount: 1,
      status: 'online',
      type: 'nurse'
    },
    {
      id: 'nurse2',
      name: 'Michael Chen, PT',
      email: 'michael.chen@care.com',
      avatar: null,
      lastMessage: 'Need approval for extended therapy sessions',
      lastMessageTime: '2:20 PM',
      unreadCount: 0,
      status: 'away',
      type: 'nurse'
    },
    {
      id: 'nurse3',
      name: 'Emily Davis, RN',
      email: 'emily.davis@care.com',
      avatar: null,
      lastMessage: 'Schedule conflict for tomorrow morning',
      lastMessageTime: '1:10 PM',
      unreadCount: 2,
      status: 'online',
      type: 'nurse'
    }
  ];

  // Combine all contacts
  const allContacts = [...patients, ...staff];

  // Sample messages for selected patient
  const getMessages = (patientId) => {
    const messageData = {
      '1': [
        { id: '1', text: 'Hello! How can I help you today?', sender: 'admin', time: '2:00 PM', date: 'Today' },
        { id: '2', text: 'Hi, I wanted to confirm my appointment for tomorrow', sender: 'patient', time: '2:15 PM', date: 'Today' },
        { id: '3', text: 'Yes, your appointment is confirmed for Oct 25 at 10:00 AM with Sarah Johnson, RN', sender: 'admin', time: '2:20 PM', date: 'Today' },
        { id: '4', text: 'Thank you for the appointment reminder', sender: 'patient', time: '2:30 PM', date: 'Today' }
      ],
      '2': [
        { id: '1', text: 'Good afternoon! How are you feeling today?', sender: 'admin', time: '1:00 PM', date: 'Today' },
        { id: '2', text: 'Is my physiotherapy session still scheduled for tomorrow?', sender: 'patient', time: '1:15 PM', date: 'Today' }
      ],
      '3': [
        { id: '1', text: 'How did your blood draw appointment go?', sender: 'admin', time: '11:30 AM', date: 'Today' },
        { id: '2', text: 'The nurse was very professional, thank you', sender: 'patient', time: '11:45 AM', date: 'Today' }
      ],
      '4': [
        { id: '1', text: 'Hello Sarah, how can I assist you?', sender: 'admin', time: '9:00 AM', date: 'Yesterday' },
        { id: '2', text: 'Could we reschedule my appointment?', sender: 'patient', time: '9:15 AM', date: 'Yesterday' },
        { id: '3', text: 'I have a conflict with my work schedule', sender: 'patient', time: '9:16 AM', date: 'Yesterday' },
        { id: '4', text: 'Would next week work better?', sender: 'patient', time: '9:17 AM', date: 'Yesterday' }
      ]
    };
    return messages[patientId] || messageData[patientId] || [];
  };

  const handleSendMessage = () => {
    if (messageText.trim() && selectedPatient) {
      const newMessage = {
        id: Date.now().toString(),
        text: messageText.trim(),
        sender: 'admin',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: 'Today'
      };

      // Update messages state
      setMessages(prev => ({
        ...prev,
        [selectedPatient.id]: [...(prev[selectedPatient.id] || getMessages(selectedPatient.id)), newMessage]
      }));

      setMessageText('');
    }
  };

  const openChat = (patient) => {
    setSelectedPatient(patient);
    setChatModalVisible(true);
  };

  // Filter contacts based on search query
  const filteredContacts = allContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPatients = filteredContacts.filter(contact => contact.type === 'patient');
  const filteredStaff = filteredContacts.filter(contact => contact.type === 'nurse');

  const renderPatientItem = ({ item }) => (
    <TouchableWeb
      style={[styles.patientItem, selectedPatient?.id === item.id && styles.selectedPatient]}
      onPress={() => setSelectedPatient(item)}
      activeOpacity={0.7}
    >
      <View style={styles.patientAvatar}>
        <MaterialCommunityIcons name="account" size={32} color={COLORS.white} />
        <View style={[styles.statusIndicator, { backgroundColor: item.status === 'online' ? COLORS.success : COLORS.textLight }]} />
      </View>
      <View style={styles.patientInfo}>
        <View style={styles.patientHeader}>
          <Text style={styles.patientName}>{item.name}</Text>
          <Text style={styles.messageTime}>{item.lastMessageTime}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableWeb>
  );

  const renderMessage = ({ item }) => (
    <View style={[styles.messageContainer, item.sender === 'admin' ? styles.adminMessage : styles.patientMessage]}>
      <View style={[styles.messageBubble, item.sender === 'admin' ? styles.adminBubble : styles.patientBubble]}>
        <Text style={[styles.messageText, item.sender === 'admin' ? styles.adminMessageText : styles.patientMessageText]}>
          {item.text}
        </Text>
        <Text style={[styles.messageTime, item.sender === 'admin' ? styles.adminTimeText : styles.patientTimeText]}>
          {item.time}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Text style={styles.welcomeText}>Chat</Text>
          <TouchableWeb
            style={styles.searchButton}
            onPress={() => setSearchVisible(!searchVisible)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name={searchVisible ? "close" : "magnify"} 
              size={24} 
              color={COLORS.white} 
            />
          </TouchableWeb>
        </View>
        
        {searchVisible && (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textLight} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor={COLORS.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableWeb
                  onPress={() => setSearchQuery('')}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textLight} />
                </TouchableWeb>
              )}
            </View>
          </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Favorite Contacts */}
        <View style={styles.favoritesSection}>
          <View style={styles.favoritesHeader}>
            <Text style={styles.favoritesTitle}>Favourite Contacts</Text>
            <TouchableWeb style={styles.moreButton} activeOpacity={0.7}>
              <MaterialCommunityIcons name="dots-horizontal" size={20} color={COLORS.textLight} />
            </TouchableWeb>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.favoritesScroll}>
            <View style={styles.favoritesContainer}>
              {allContacts.slice(0, 5).map((contact) => (
                <TouchableWeb key={contact.id} style={styles.favoriteItem} onPress={() => openChat(contact)} activeOpacity={0.8}>
                  <View style={styles.favoriteAvatar}>
                    <MaterialCommunityIcons 
                      name={contact.type === 'nurse' ? "account-heart" : "account"} 
                      size={28} 
                      color={COLORS.white} 
                    />
                    <View style={[styles.favoriteStatus, { backgroundColor: contact.status === 'online' ? COLORS.success : COLORS.textLight }]} />
                  </View>
                  <Text style={styles.favoriteName}>{contact.name.split(' ')[0]}</Text>
                </TouchableWeb>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Staff Section */}
        {(searchQuery.length === 0 || filteredStaff.length > 0) && (
          <View style={styles.chatListSection}>
            <Text style={styles.sectionTitle}>Healthcare Staff</Text>
            {searchQuery.length === 0 ? staff.map((contact) => (
              <TouchableWeb
                key={contact.id}
                style={[styles.chatItem, selectedPatient?.id === contact.id && styles.selectedChatItem]}
                onPress={() => openChat(contact)}
                activeOpacity={0.7}
              >
                <View style={styles.chatAvatar}>
                  <MaterialCommunityIcons name="account-heart" size={24} color={COLORS.white} />
                  <View style={[styles.chatStatus, { backgroundColor: contact.status === 'online' ? COLORS.success : COLORS.textLight }]} />
                </View>
                <View style={styles.chatInfo}>
                  <View style={styles.chatHeader}>
                    <Text style={styles.chatName}>{contact.name}</Text>
                    <Text style={styles.chatTime}>{contact.lastMessageTime}</Text>
                  </View>
                  <Text style={styles.chatLastMessage} numberOfLines={1}>{contact.lastMessage}</Text>
                </View>
                {contact.unreadCount > 0 && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
              </TouchableWeb>
            )) : filteredStaff.map((contact) => (
              <TouchableWeb
                key={contact.id}
                style={[styles.chatItem, selectedPatient?.id === contact.id && styles.selectedChatItem]}
                onPress={() => openChat(contact)}
                activeOpacity={0.7}
              >
                <View style={styles.chatAvatar}>
                  <MaterialCommunityIcons name="account-heart" size={24} color={COLORS.white} />
                  <View style={[styles.chatStatus, { backgroundColor: contact.status === 'online' ? COLORS.success : COLORS.textLight }]} />
                </View>
                <View style={styles.chatInfo}>
                  <View style={styles.chatHeader}>
                    <Text style={styles.chatName}>{contact.name}</Text>
                    <Text style={styles.chatTime}>{contact.lastMessageTime}</Text>
                  </View>
                  <Text style={styles.chatLastMessage} numberOfLines={1}>{contact.lastMessage}</Text>
                </View>
                {contact.unreadCount > 0 && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
              </TouchableWeb>
            ))}
          </View>
        )}

        {/* Patients Section */}
        <View style={styles.chatListSection}>
          <Text style={styles.sectionTitle}>Patients</Text>
          {(searchQuery.length === 0 ? patients : filteredPatients).length > 0 ? (
            (searchQuery.length === 0 ? patients : filteredPatients).map((contact) => (
              <TouchableWeb
                key={contact.id}
                style={[styles.chatItem, selectedPatient?.id === contact.id && styles.selectedChatItem]}
                onPress={() => openChat(contact)}
                activeOpacity={0.7}
              >
                <View style={styles.chatAvatar}>
                  <MaterialCommunityIcons name="account" size={24} color={COLORS.white} />
                  <View style={[styles.chatStatus, { backgroundColor: contact.status === 'online' ? COLORS.success : COLORS.textLight }]} />
                </View>
                <View style={styles.chatInfo}>
                  <View style={styles.chatHeader}>
                    <Text style={styles.chatName}>{contact.name}</Text>
                    <Text style={styles.chatTime}>{contact.lastMessageTime}</Text>
                  </View>
                  <Text style={styles.chatLastMessage} numberOfLines={1}>{contact.lastMessage}</Text>
                </View>
                {contact.unreadCount > 0 && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
              </TouchableWeb>
            ))
          ) : searchQuery.length > 0 && filteredContacts.length === 0 && (
            <View style={styles.noResultsContainer}>
              <MaterialCommunityIcons name="account-search" size={48} color={COLORS.textLight} />
              <Text style={styles.noResultsText}>No contacts found</Text>
              <Text style={styles.noResultsSubtext}>Try adjusting your search terms</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Chat Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={chatModalVisible}
        onRequestClose={() => setChatModalVisible(false)}
      >
        <SafeAreaView style={styles.chatModalContainer} edges={['bottom']}>
          {/* Chat Header */}
          <LinearGradient
            colors={GRADIENTS.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.chatModalHeader}
          >
            <View style={styles.chatModalHeaderRow}>
              <TouchableWeb
                style={styles.chatBackButton}
                onPress={() => setChatModalVisible(false)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
              </TouchableWeb>
              <View style={styles.chatPatientInfo}>
                <View style={styles.chatModalAvatar}>
                  <MaterialCommunityIcons name="account" size={24} color={COLORS.white} />
                  <View style={[styles.chatModalStatus, { backgroundColor: selectedPatient?.status === 'online' ? COLORS.success : COLORS.textLight }]} />
                </View>
                <View>
                  <Text style={styles.chatModalPatientName}>{selectedPatient?.name}</Text>
                  <Text style={styles.chatModalPatientStatus}>
                    {selectedPatient?.status === 'online' ? 'Online' : 'Last seen recently'}
                  </Text>
                </View>
              </View>
              <TouchableWeb style={styles.chatMenuButton} activeOpacity={0.7}>
                <MaterialCommunityIcons name="dots-vertical" size={24} color={COLORS.white} />
              </TouchableWeb>
            </View>
          </LinearGradient>

          {/* Messages */}
          <FlatList
            data={getMessages(selectedPatient?.id)}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Message Input */}
          <View style={styles.messageInputContainer}>
            <View style={styles.messageInput}>
              <TextInput
                style={styles.textInput}
                placeholder="Type your message..."
                placeholderTextColor={COLORS.textLight}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={500}
              />
              <TouchableWeb style={styles.attachButton} activeOpacity={0.7}>
                <MaterialCommunityIcons name="paperclip" size={20} color={COLORS.textLight} />
              </TouchableWeb>
            </View>
            <TouchableWeb
              style={[styles.sendButton, messageText.trim() ? styles.sendButtonActive : styles.sendButtonInactive]}
              onPress={handleSendMessage}
              activeOpacity={0.8}
              disabled={!messageText.trim()}
            >
              <LinearGradient
                colors={messageText.trim() ? GRADIENTS.primary : ['#E0E0E0', '#E0E0E0']}
                style={styles.sendButtonGradient}
              >
                <MaterialCommunityIcons 
                  name="send" 
                  size={20} 
                  color={messageText.trim() ? COLORS.white : COLORS.textLight} 
                />
              </LinearGradient>
            </TouchableWeb>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    opacity: 0.98,
    textAlign: 'center',
    flex: 1,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    marginTop: 15,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '500',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  content: {
    flex: 1,
  },
  favoritesSection: {
    backgroundColor: COLORS.white,
    paddingVertical: 20,
    marginBottom: 8,
  },
  favoritesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  favoritesTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
  },
  moreButton: {
    padding: 4,
  },
  favoritesScroll: {
    paddingLeft: 20,
  },
  favoritesContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingRight: 20,
  },
  favoriteItem: {
    alignItems: 'center',
    gap: 8,
  },
  favoriteAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  favoriteStatus: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  favoriteName: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  chatListSection: {
    backgroundColor: COLORS.white,
    paddingTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
  },
  selectedChatItem: {
    backgroundColor: '#F0F8FF',
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  chatStatus: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  chatTime: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  chatLastMessage: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  newBadge: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  newBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  // Chat Modal Styles
  chatModalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  chatModalHeader: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  chatModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatPatientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  chatModalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  chatModalStatus: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  chatModalPatientName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  chatModalPatientStatus: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    opacity: 0.8,
  },
  chatMenuButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
  },
  adminMessage: {
    alignItems: 'flex-end',
  },
  patientMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 14,
    borderRadius: 20,
    marginVertical: 2,
  },
  adminBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 6,
  },
  patientBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
    marginBottom: 4,
  },
  adminMessageText: {
    color: COLORS.white,
  },
  patientMessageText: {
    color: COLORS.text,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    alignSelf: 'flex-end',
  },
  adminTimeText: {
    color: COLORS.white,
    opacity: 0.8,
  },
  patientTimeText: {
    color: COLORS.textLight,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    backgroundColor: COLORS.white,
    gap: 12,
  },
  messageInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8F9FA',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 50,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    maxHeight: 100,
    paddingVertical: 8,
  },
  attachButton: {
    padding: 8,
    marginLeft: 8,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  sendButtonActive: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonInactive: {},
  sendButtonGradient: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
});