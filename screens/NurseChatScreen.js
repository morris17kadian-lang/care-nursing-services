import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, FlatList, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function NurseChatScreen({ navigation }) {
  const { user } = useAuth();
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState({});

  // Internal staff communications
  const staffContacts = [
    {
      id: 'admin',
      name: 'Admin',
      role: 'Administrator',
      avatar: null,
      lastMessage: 'New patient assignment for tomorrow',
      lastMessageTime: '3:45 PM',
      unreadCount: 2,
      status: 'online',
      isAdmin: true,
    },
    {
      id: '2',
      name: 'Sarah Johnson, RN',
      role: 'Senior Nurse',
      avatar: null,
      lastMessage: 'How did the wound care go today?',
      lastMessageTime: '2:30 PM',
      unreadCount: 0,
      status: 'online',
      isAdmin: false,
    },
    {
      id: '3',
      name: 'Michael Chen, PT',
      role: 'Physiotherapist',
      avatar: null,
      lastMessage: 'Patient feedback on rehabilitation',
      lastMessageTime: '1:15 PM',
      unreadCount: 1,
      status: 'away',
      isAdmin: false,
    },
    {
      id: '4',
      name: 'Emily Davis, RN',
      role: 'Clinical Nurse',
      avatar: null,
      lastMessage: 'Shift handover notes attached',
      lastMessageTime: 'Yesterday',
      unreadCount: 0,
      status: 'offline',
      isAdmin: false,
    }
  ];

  // Sample messages for internal communication
  const getMessages = (contactId) => {
    const messageData = {
      'admin': [
        { id: '1', text: 'Good afternoon! Hope your rounds are going well.', sender: 'admin', time: '3:30 PM', date: 'Today' },
        { id: '2', text: 'Hi! Yes, everything is on schedule. Just finished with Mr. Johnson.', sender: 'nurse', time: '3:35 PM', date: 'Today' },
        { id: '3', text: 'Perfect! I have a new patient assignment for you tomorrow - Mrs. Williams needs post-surgery care.', sender: 'admin', time: '3:40 PM', date: 'Today' },
        { id: '4', text: 'New patient assignment for tomorrow', sender: 'admin', time: '3:45 PM', date: 'Today' }
      ],
      '2': [
        { id: '1', text: 'Hey! How did the wound care appointment go with Mr. Davis?', sender: 'staff', time: '2:15 PM', date: 'Today' },
        { id: '2', text: 'How did the wound care go today?', sender: 'staff', time: '2:30 PM', date: 'Today' }
      ],
      '3': [
        { id: '1', text: 'The patient responded well to the physiotherapy session', sender: 'nurse', time: '1:00 PM', date: 'Today' },
        { id: '2', text: 'Patient feedback on rehabilitation', sender: 'staff', time: '1:15 PM', date: 'Today' }
      ],
      '4': [
        { id: '1', text: 'Shift handover notes attached', sender: 'staff', time: '5:30 PM', date: 'Yesterday' }
      ]
    };
    return messages[contactId] || messageData[contactId] || [];
  };

  const handleSendMessage = () => {
    if (messageText.trim() && selectedContact) {
      const newMessage = {
        id: Date.now().toString(),
        text: messageText.trim(),
        sender: 'nurse',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: 'Today'
      };

      setMessages(prev => ({
        ...prev,
        [selectedContact.id]: [...(prev[selectedContact.id] || getMessages(selectedContact.id)), newMessage]
      }));

      setMessageText('');
    }
  };

  const openChat = (contact) => {
    setSelectedContact(contact);
    setChatModalVisible(true);
  };

  // Filter contacts based on search query
  const filteredAdminContacts = staffContacts.filter(contact => 
    contact.isAdmin && (
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.role.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const filteredStaffContacts = staffContacts.filter(contact => 
    !contact.isAdmin && (
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.role.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const renderMessage = ({ item }) => (
    <View style={[styles.messageContainer, item.sender === 'nurse' ? styles.nurseMessage : styles.otherMessage]}>
      <View style={[styles.messageBubble, item.sender === 'nurse' ? styles.nurseBubble : styles.otherBubble]}>
        <Text style={[styles.messageText, item.sender === 'nurse' ? styles.nurseMessageText : styles.otherMessageText]}>
          {item.text}
        </Text>
        <Text style={[styles.messageTime, item.sender === 'nurse' ? styles.nurseTimeText : styles.otherTimeText]}>
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
        {/* Admin Communication Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Administration</Text>
          {filteredAdminContacts.length > 0 ? (
            filteredAdminContacts.map((contact) => (
              <TouchableWeb
                key={contact.id}
                style={styles.contactItem}
                onPress={() => openChat(contact)}
                activeOpacity={0.7}
              >
                <View style={styles.contactAvatar}>
                  <MaterialCommunityIcons name="shield-account" size={24} color={COLORS.white} />
                  <View style={[styles.contactStatus, { backgroundColor: contact.status === 'online' ? COLORS.success : COLORS.textLight }]} />
                </View>
                <View style={styles.contactInfo}>
                  <View style={styles.contactHeader}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactTime}>{contact.lastMessageTime}</Text>
                  </View>
                  <Text style={styles.contactRole}>{contact.role}</Text>
                  <Text style={styles.contactLastMessage} numberOfLines={1}>{contact.lastMessage}</Text>
                </View>
                {contact.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadCount}>{contact.unreadCount}</Text>
                  </View>
                )}
              </TouchableWeb>
            ))
          ) : searchQuery.length > 0 && (
            <View style={styles.noResultsContainer}>
              <MaterialCommunityIcons name="account-search" size={32} color={COLORS.textLight} />
              <Text style={styles.noResultsText}>No admin found</Text>
            </View>
          )}
        </View>

        {/* Staff Communication Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Healthcare Team</Text>
          {filteredStaffContacts.length > 0 ? (
            filteredStaffContacts.map((contact) => (
              <TouchableWeb
                key={contact.id}
                style={styles.contactItem}
                onPress={() => openChat(contact)}
                activeOpacity={0.7}
              >
                <View style={styles.contactAvatar}>
                  <MaterialCommunityIcons name="account-heart" size={24} color={COLORS.white} />
                  <View style={[styles.contactStatus, { backgroundColor: contact.status === 'online' ? COLORS.success : COLORS.textLight }]} />
                </View>
                <View style={styles.contactInfo}>
                  <View style={styles.contactHeader}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactTime}>{contact.lastMessageTime}</Text>
                  </View>
                  <Text style={styles.contactRole}>{contact.role}</Text>
                  <Text style={styles.contactLastMessage} numberOfLines={1}>{contact.lastMessage}</Text>
                </View>
                {contact.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadCount}>{contact.unreadCount}</Text>
                  </View>
                )}
              </TouchableWeb>
            ))
          ) : searchQuery.length > 0 && (
            <View style={styles.noResultsContainer}>
              <MaterialCommunityIcons name="account-search" size={32} color={COLORS.textLight} />
              <Text style={styles.noResultsText}>No staff found</Text>
            </View>
          )}
        </View>

        {/* Staff Communication Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nursing Staff</Text>
          {staffContacts.filter(contact => !contact.isAdmin).map((contact) => (
            <TouchableWeb
              key={contact.id}
              style={styles.contactItem}
              onPress={() => openChat(contact)}
              activeOpacity={0.7}
            >
              <View style={styles.contactAvatar}>
                <MaterialCommunityIcons name="account-heart" size={24} color={COLORS.white} />
                <View style={[styles.contactStatus, { backgroundColor: contact.status === 'online' ? COLORS.success : contact.status === 'away' ? COLORS.warning : COLORS.textLight }]} />
              </View>
              <View style={styles.contactInfo}>
                <View style={styles.contactHeader}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactTime}>{contact.lastMessageTime}</Text>
                </View>
                <Text style={styles.contactRole}>{contact.role}</Text>
                <Text style={styles.contactLastMessage} numberOfLines={1}>{contact.lastMessage}</Text>
              </View>
              {contact.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>{contact.unreadCount}</Text>
                </View>
              )}
            </TouchableWeb>
          ))}
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
              <View style={styles.chatContactInfo}>
                <View style={styles.chatModalAvatar}>
                  <MaterialCommunityIcons 
                    name={selectedContact?.isAdmin ? "shield-account" : "account-heart"} 
                    size={24} 
                    color={COLORS.white} 
                  />
                  <View style={[styles.chatModalStatus, { backgroundColor: selectedContact?.status === 'online' ? COLORS.success : selectedContact?.status === 'away' ? COLORS.warning : COLORS.textLight }]} />
                </View>
                <View>
                  <Text style={styles.chatModalContactName}>{selectedContact?.name}</Text>
                  <Text style={styles.chatModalContactRole}>{selectedContact?.role}</Text>
                </View>
              </View>
              <TouchableWeb style={styles.chatMenuButton} activeOpacity={0.7}>
                <MaterialCommunityIcons name="dots-vertical" size={24} color={COLORS.white} />
              </TouchableWeb>
            </View>
          </LinearGradient>

          {/* Messages */}
          <FlatList
            data={getMessages(selectedContact?.id)}
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
    backgroundColor: COLORS.background,
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
    marginHorizontal: 12,
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
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.white,
    marginBottom: 8,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  contactStatus: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactName: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  contactTime: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  contactRole: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.primary,
    marginBottom: 2,
  },
  contactLastMessage: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  unreadBadge: {
    backgroundColor: '#FF4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  unreadCount: {
    fontSize: 11,
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
  chatContactInfo: {
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
  chatModalContactName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  chatModalContactRole: {
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
  nurseMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 14,
    borderRadius: 20,
    marginVertical: 2,
  },
  nurseBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 6,
  },
  otherBubble: {
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
  nurseMessageText: {
    color: COLORS.white,
  },
  otherMessageText: {
    color: COLORS.text,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    alignSelf: 'flex-end',
  },
  nurseTimeText: {
    color: COLORS.white,
    opacity: 0.8,
  },
  otherTimeText: {
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
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  noResultsText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginTop: 8,
  },
});