import { 
  auth, 
  googleProvider, 
  githubProvider, 
  db 
} from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  avatar?: string;
  provider: 'google' | 'github' | 'email';
  createdAt?: number;
}

/**
 * Create user profile in Firestore
 */
export async function createUserProfile(user: User, provider: string, avatar?: string) {
  const userDoc: AuthUser = {
    uid: user.uid,
    name: user.displayName || '',
    email: user.email || '',
    avatar: avatar || user.photoURL || undefined,
    provider: (provider as any),
    createdAt: Date.now(),
  };

  await setDoc(doc(db, 'users', user.uid), userDoc);
  return userDoc;
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<AuthUser | null> {
  const docSnap = await getDoc(doc(db, 'users', uid));
  return docSnap.exists() ? (docSnap.data() as AuthUser) : null;
}

/**
 * Update user profile in Firestore
 */
export async function updateUserProfile(uid: string, updates: Partial<AuthUser>) {
  await updateDoc(doc(db, 'users', uid), updates);
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name: string
): Promise<AuthUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update display name
  await updateProfile(credential.user, { displayName: name });

  // Create profile in Firestore
  const userProfile = await createUserProfile(credential.user, 'email');
  return userProfile;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getUserProfile(credential.user.uid);
  
  if (!profile) {
    throw new Error('User profile not found');
  }
  
  return profile;
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  const result = await signInWithPopup(auth, googleProvider);
  
  // Check if user exists in Firestore
  let profile = await getUserProfile(result.user.uid);
  
  // If not, create new user profile
  if (!profile) {
    profile = await createUserProfile(
      result.user,
      'google',
      result.user.photoURL || undefined
    );
  } else {
    // Update avatar if changed
    await updateUserProfile(result.user.uid, {
      avatar: result.user.photoURL || profile.avatar,
    });
  }
  
  return profile;
}

/**
 * Sign in with GitHub
 */
export async function signInWithGitHub(): Promise<AuthUser> {
  const result = await signInWithPopup(auth, githubProvider);
  
  // Check if user exists in Firestore
  let profile = await getUserProfile(result.user.uid);
  
  // If not, create new user profile
  if (!profile) {
    profile = await createUserProfile(
      result.user,
      'github',
      result.user.photoURL || undefined
    );
  } else {
    // Update avatar if changed
    await updateUserProfile(result.user.uid, {
      avatar: result.user.photoURL || profile.avatar,
    });
  }
  
  return profile;
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Get current user
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const profile = await getUserProfile(firebaseUser.uid);
      callback(profile);
    } else {
      callback(null);
    }
  });
}

/**
 * Save portfolio/profile data
 */
export async function savePortfolioData(uid: string, profileData: any) {
  await updateDoc(doc(db, 'users', uid), {
    profile: profileData,
    updatedAt: Date.now(),
  });
}

/**
 * Get portfolio/profile data
 */
export async function getPortfolioData(uid: string) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.data()?.profile || {};
}
