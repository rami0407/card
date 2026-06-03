// Firebase Storage Service for Digital Cards (العبارات الضوئية)
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  set, 
  push, 
  get, 
  remove 
} from 'firebase/database';

export interface Topic {
  id: string;
  name: string;
  description: string;
  coverImage: string; // Base64 representation of image
  createdAt: number;
  isPrivate: boolean;
  accessCode?: string; // Generated if isPrivate is true
}

export interface Card {
  id: string;
  topicId: string;
  image: string; // Base64 representation of image
  createdAt: number;
}

export interface CardReply {
  id: string;
  studentName: string;
  studentAvatar: string;
  text: string;
  createdAt: number;
}

export interface CardComment {
  id: string;
  cardId: string;
  studentName: string;
  studentAvatar: string;
  text: string;
  createdAt: number;
  replies: CardReply[];
}

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCMCXiCaiwRrZ6ms_337MZAXstGeow-2hE",
  authDomain: "gen-lang-client-0576446793.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0576446793-default-rtdb.firebaseio.com",
  projectId: "gen-lang-client-0576446793",
  storageBucket: "gen-lang-client-0576446793.firebasestorage.app",
  messagingSenderId: "341882667122",
  appId: "1:341882667122:web:9558ee8db16e3d3b5c42eb",
  measurementId: "G-26FCGHGJ9B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// TOPICS (ACTIVITIES) SAMPLES & OPERATIONS

export async function getTopics(): Promise<Topic[]> {
  const topicsRef = ref(db, 'topics');
  const snapshot = await get(topicsRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    const list = Object.values(data) as Topic[];
    // Sort topics by creation date (newest first)
    list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }
  return [];
}

export async function getTopicById(id: string): Promise<Topic | null> {
  const topicRef = ref(db, `topics/${id}`);
  const snapshot = await get(topicRef);
  if (snapshot.exists()) {
    return snapshot.val() as Topic;
  }
  return null;
}

export async function getTopicByCode(code: string): Promise<Topic | null> {
  const topics = await getTopics();
  const searchCode = code.trim().toLowerCase();
  // Find private topic matching the access code
  const found = topics.find(
    (t) => t.isPrivate && t.accessCode?.trim().toLowerCase() === searchCode
  );
  return found || null;
}

export async function addTopic(
  name: string, 
  description: string, 
  coverImage: string,
  isPrivate: boolean,
  accessCode?: string
): Promise<Topic> {
  const topicsRef = ref(db, 'topics');
  const newTopicRef = push(topicsRef);
  const id = newTopicRef.key || Math.random().toString(36).substring(2, 9);
  
  const newTopic: Topic = {
    id,
    name,
    description,
    coverImage,
    createdAt: Date.now(),
    isPrivate
  };

  if (isPrivate && accessCode) {
    newTopic.accessCode = accessCode;
  }

  await set(ref(db, `topics/${id}`), newTopic);
  return newTopic;
}

export async function updateTopic(
  id: string,
  name: string,
  description: string,
  coverImage: string,
  isPrivate: boolean,
  accessCode?: string
): Promise<Topic> {
  const updatedTopic: Topic = {
    id,
    name,
    description,
    coverImage,
    createdAt: Date.now(),
    isPrivate
  };

  if (isPrivate && accessCode) {
    updatedTopic.accessCode = accessCode;
  }

  const original = await getTopicById(id);
  if (original) {
    updatedTopic.createdAt = original.createdAt;
  }

  await set(ref(db, `topics/${id}`), updatedTopic);
  return updatedTopic;
}

export async function deleteTopic(topicId: string): Promise<void> {
  // 1. Delete the topic itself
  await remove(ref(db, `topics/${topicId}`));

  // 2. Scan and delete cards belonging to this topic
  const cardsRef = ref(db, 'cards');
  const snapshot = await get(cardsRef);
  if (snapshot.exists()) {
    const allCards = snapshot.val();
    for (const cardId in allCards) {
      if (allCards[cardId].topicId === topicId) {
        await remove(ref(db, `cards/${cardId}`));
        // Also delete comments associated with the card
        await remove(ref(db, `comments/${cardId}`));
      }
    }
  }
}

// CARDS OPERATIONS

export async function getCards(topicId: string): Promise<Card[]> {
  const cardsRef = ref(db, 'cards');
  const snapshot = await get(cardsRef);
  if (snapshot.exists()) {
    const allCards = Object.values(snapshot.val()) as Card[];
    const filtered = allCards.filter(card => card.topicId === topicId);
    filtered.sort((a, b) => b.createdAt - a.createdAt);
    return filtered;
  }
  return [];
}

export async function addCard(topicId: string, image: string): Promise<Card> {
  const cardsRef = ref(db, 'cards');
  const newCardRef = push(cardsRef);
  const id = newCardRef.key || Math.random().toString(36).substring(2, 9);

  const newCard: Card = {
    id,
    topicId,
    image,
    createdAt: Date.now()
  };

  await set(ref(db, `cards/${id}`), newCard);
  return newCard;
}

export async function deleteCard(cardId: string): Promise<void> {
  await remove(ref(db, `cards/${cardId}`));
  // Also clean up comments
  await remove(ref(db, `comments/${cardId}`));
}

// COMMENTS & DISCUSSIONS OPERATIONS

export async function getComments(cardId: string): Promise<CardComment[]> {
  const commentsRef = ref(db, `comments/${cardId}`);
  const snapshot = await get(commentsRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    const list = Object.values(data) as CardComment[];
    
    // Convert replies objects into sorted arrays for UI rendering
    list.forEach(comment => {
      if (comment.replies && typeof comment.replies === 'object') {
        const repliesArray = Object.values(comment.replies) as CardReply[];
        repliesArray.sort((a, b) => a.createdAt - b.createdAt); // oldest first chronologically
        comment.replies = repliesArray;
      } else {
        comment.replies = [];
      }
    });

    // Sort main comments by creation date (newest first)
    list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }
  return [];
}

export async function addComment(
  cardId: string, 
  studentName: string, 
  studentAvatar: string, 
  text: string
): Promise<CardComment> {
  const commentsRef = ref(db, `comments/${cardId}`);
  const newCommentRef = push(commentsRef);
  const id = newCommentRef.key || Math.random().toString(36).substring(2, 9);

  const newComment: CardComment = {
    id,
    cardId,
    studentName,
    studentAvatar,
    text,
    createdAt: Date.now(),
    replies: []
  };

  await set(ref(db, `comments/${cardId}/${id}`), newComment);
  return newComment;
}

export async function addReply(
  commentId: string,
  studentName: string,
  studentAvatar: string,
  text: string
): Promise<CardComment> {
  const rootCommentsRef = ref(db, 'comments');
  const snapshot = await get(rootCommentsRef);
  let foundCardId: string | null = null;
  let foundComment: CardComment | null = null;

  if (snapshot.exists()) {
    const allComments = snapshot.val();
    for (const cardId in allComments) {
      if (allComments[cardId][commentId]) {
        foundCardId = cardId;
        foundComment = allComments[cardId][commentId];
        break;
      }
    }
  }

  if (!foundCardId || !foundComment) {
    throw new Error('Comment not found');
  }

  const replyId = push(ref(db, `comments/${foundCardId}/${commentId}/replies`)).key || Math.random().toString(36).substring(2, 9);
  const newReply: CardReply = {
    id: replyId,
    studentName,
    studentAvatar,
    text,
    createdAt: Date.now()
  };

  await set(ref(db, `comments/${foundCardId}/${commentId}/replies/${replyId}`), newReply);

  // Return the updated comment (with sorted replies array)
  const updatedSnapshot = await get(ref(db, `comments/${foundCardId}/${commentId}`));
  const updatedComment = updatedSnapshot.val() as CardComment;
  if (updatedComment.replies && typeof updatedComment.replies === 'object') {
    const repliesArray = Object.values(updatedComment.replies) as CardReply[];
    repliesArray.sort((a, b) => a.createdAt - b.createdAt);
    updatedComment.replies = repliesArray;
  } else {
    updatedComment.replies = [];
  }
  return updatedComment;
}
