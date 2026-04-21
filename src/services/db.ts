import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatSession, Message, UserProfile } from '../types';

export const dbService = {
  async createUserProfile(profile: { uid: string; email: string; displayName: string }) {
    const userRef = doc(db, 'users', profile.uid);
    await setDoc(userRef, {
      ...profile,
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  async createSession(userId: string, title: string): Promise<string | null> {
    try {
      const sessionsRef = collection(db, 'sessions');
      const docRef = await addDoc(sessionsRef, {
        userId,
        title,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      console.error("Error creating session:", e);
      return null;
    }
  },

  async getSessions(userId: string): Promise<ChatSession[]> {
    const sessionsRef = collection(db, 'sessions');
    const q = query(sessionsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
  },

  async deleteSession(sessionId: string) {
    await deleteDoc(doc(db, 'sessions', sessionId));
    // Subcollections should be manually deleted if needed, 
    // but for this app we'll just delete the session doc.
  },

  async updateSessionTitle(sessionId: string, title: string) {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, { title });
  },

  async addMessage(sessionId: string, message: Omit<Message, 'id' | 'createdAt'>) {
    const messagesRef = collection(db, 'sessions', sessionId, 'messages');
    await addDoc(messagesRef, {
      ...message,
      createdAt: serverTimestamp()
    });
  },

  async getMessages(sessionId: string): Promise<Message[]> {
    const messagesRef = collection(db, 'sessions', sessionId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
  }
};
