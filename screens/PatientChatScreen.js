import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, FlatList, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function PatientChatScreen({ navigation }) {
  const { user } = useAuth();
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState({});

  // Healthcare team contacts
  const healthcareTeam = [
    {
      id: 'admin',
      name: 'Care Admin',
      role: 'Administrator',
      avatar: null,
      lastMessage: 'Your appointment has been confirmed for tomorrow',
      lastMessageTime: '4:15 PM',
      unreadCount: 1,
      status: 'online',
      isAdmin: true,
    },
    {
      id: 'sarah',
      name: 'Sarah Johnson, RN',
      role: 'Your Assigned Nurse',
      avatar: null,
      lastMessage: 'How are you feeling after today\'s visit?',
      lastMessageTime: '3:20 PM',
      unreadCount: 0,
      status: 'online',
      isAdmin: false,
    },
    {
      id: 'michael',
      name: 'Michael Chen, PT',
      role: 'Physiotherapist',
      avatar: null,
      lastMessage: 'Remember to do your exercises twice daily',
      lastMessageTime: '1:45 PM',
      unreadCount: 2,
      status: 'away',
      isAdmin: false,
    },
  ];

  // Sample messages for each contact
  const getMessages = (contactId) => {
    const messageData = {
      'admin': [
        { id: '1', text: 'Hello! How can I help you today?', sender: 'admin', time: '2:00 PM', date: 'Today' },
        { id: '2', text: 'I wanted to confirm my appointment for tomorrow', sender: 'patient', time: '2:05 PM', date: 'Today' },
        { id: '3', text: 'Yes, your appointment is confirmed for 10:00 AM with Sarah Johnson, RN', sender: 'admin', time: '2:10 PM', date: 'Today' },
        { id: '4', text: 'Perfect, thank you!', sender: 'patient', time: '2:12 PM', date: 'Today' },
        { id: '5', text: 'Your appointment has been confirmed for tomorrow', sender: 'admin', time: '4:15 PM', date: 'Today' },
      ],
      'sarah': [
        { id: '1', text: 'Hi! I\'ll be your nurse for today\'s visit', sender: 'nurse', time: '9:30 AM', date: 'Today' },
        { id: '2', text: 'Great! Looking forward to meeting you', sender: 'patient', time: '9:35 AM', date: 'Today' },
        { id: '3', text: 'How are you feeling after today\'s visit?', sender: 'nurse', time: '3:20 PM', date: 'Today' },
      ],
      'michael': [
        { id: '1', text: 'Hello! I\'m your physiotherapist', sender: 'therapist', time: '11:00 AM', date: 'Yesterday' },
        { id: '2', text: 'Here are your exercise instructions', sender: 'therapist', time: '11:30 AM', date: 'Yesterday' },
        { id: '3', text: 'Thank you for the exercises', sender: 'patient', time: '2:00 PM', date: 'Yesterday' },
        { id: '4', text: 'Remember to do your exercises twice daily', sender: 'therapist', time: '1:45 PM', date: 'Today' },
      ],
    };
    return messageData[contactId] || [];
  };

  const openChat = (contact) => {
    setSelectedContact(contact);
    const contactMessages = getMessages(contact.id);
    setMessages({ ...messages, [contact.id]: contactMessages });
    setChatModalVisible(true);
  };

  const sendMessage = () => {
    if (!messageText.trim() || !selectedContact) return;

    const newMessage = {
      id: Date.now().toString(),
      text: messageText.trim(),
      sender: 'patient',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today'
    };

    const contactMessages = messages[selectedContact.id] || [];
    setMessages({
      ...messages,
      [selectedContact.id]: [...contactMessages, newMessage]
    });

    setMessageText('');
  };

  // Filter contacts based on search query
  const filteredContacts = healthcareTeam.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMessage = ({ item }) => {
    const isPatient = item.sender === 'patient';
    return (
      <View style={[styles.messageContainer, isPatient ? styles.patientMessage : styles.otherMessage]}>
        <Text style={[styles.messageText, isPatient ? styles.patientMessageText : styles.otherMessageText]}>
          {item.text}
        </Text>
        <Text style={[styles.messageTime, isPatient ? styles.patientMessageTime : styles.otherMessageTime]}>
          {item.time}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {/* Empty space for balance */}
          </View>
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Care Team</Text>
          <Text style={styles.sectionSubtitle}>Message your healthcare providers</Text>
          
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <TouchableWeb
                key={contact.id}
                style={styles.contactItem}
                onPress={() => openChat(contact)}
                activeOpacity={0.7}
              >
                <View style={styles.contactAvatar}>
                  <MaterialCommunityIcons 
                    name={contact.isAdmin ? "shield-account" : contact.role.includes('Nurse') ? "account-heart" : "account-school"} 
                    size={24} 
                    color={COLORS.white} 
                  />
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
          ) : (
            <View style={styles.noResultsContainer}>
              <MaterialCommunityIcons name="account-search" size={48} color={COLORS.textLight} />
              <Text style={styles.noResultsText}>No healthcare providers found</Text>
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
              <View style={styles.chatContactInfo}>
                <View style={styles.chatModalAvatar}>
                  <MaterialCommunityIcons
                    name={selectedContact?.isAdmin ? "shield-account" : selectedContact?.role.includes('Nurse') ? "account-heart" : "account-school"}
                    size={24}
                    color={COLORS.white}
                  />
                </View>
                <View style={styles.chatContactDetails}>
                  <Text style={styles.chatContactName}>{selectedContact?.name}</Text>
                  <Text style={styles.chatContactRole}>{selectedContact?.role}</Text>
                </View>
              </View>
              <TouchableWeb style={styles.chatOptionsButton} activeOpacity={0.7}>
                <MaterialCommunityIcons name="dots-vertical" size={24} color={COLORS.white} />
              </TouchableWeb>
            </View>
          </LinearGradient>

          {/* Messages */}
          <FlatList
            data={messages[selectedContact?.id] || []}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Message Input */}
          <View style={styles.messageInputContainer}>
            <View style={styles.messageInputWrapper}>
              <TextInput
                style={styles.messageInput}
                placeholder="Type your message..."
                placeholderTextColor={COLORS.textLight}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={500}
              />
              <TouchableWeb
                style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
                onPress={sendMessage}
                activeOpacity={0.7}
                disabled={!messageText.trim()}
              >
                <MaterialCommunityIcons
                  name="send"
                  size={20}
                  color={messageText.trim() ? COLORS.white : COLORS.textLight}
                />
              </TouchableWeb>
            </View>
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    width: 44, // Same width as search button for balance
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
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
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  contactTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  contactRole: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactLastMessage: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  unreadBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    marginBottom: 12,
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

  // Chat Modal Styles
  chatModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  chatModalHeader: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  chatModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  chatContactInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatModalAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatContactDetails: {
    flex: 1,
  },
  chatContactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  chatContactRole: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  chatOptionsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messagesContent: {
    padding: 20,
  },
  messageContainer: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  patientMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  patientMessageText: {
    color: COLORS.white,
  },
  otherMessageText: {
    color: COLORS.text,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  patientMessageTime: {
    color: COLORS.white,
    opacity: 0.8,
    textAlign: 'right',
  },
  otherMessageTime: {
    color: COLORS.textLight,
  },
  messageInputContainer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    padding: 15,
  },
  messageInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.lightGray,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
});