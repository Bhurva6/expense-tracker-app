import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const ADMIN_EMAILS = [
  'bhurvaxsharma.india@gmail.com',
  'nitishjain0109@gmail.com',
  'neetu@panachegreen.com',
  'hrd@panachegreen.com',
  'brijesh@panachegreen.com',
  'accounts@panachegreen.com',
];

export interface AccessControlUser {
  id: string;
  name: string;
  email: string;
  number: string;
  designation: string;
  department: string;
  employeeManager: string;
  accessRights: 'admin' | 'entry';
  areaOfRights: {
    review: boolean;
    approve: boolean;
    accounts: boolean;
  };
}

/**
 * Check if a user has admin access
 * @param email - User's email address
 * @returns true if user has admin access
 */
export const hasAdminAccess = async (email: string): Promise<boolean> => {
  // First check if user is in ADMIN_EMAILS
  if (ADMIN_EMAILS.includes(email)) {
    return true;
  }
  
  try {
    // Then check if user has admin access in access control
    const q = query(collection(db, 'accessControl'), where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return false;
    }
    
    const userData = snapshot.docs[0].data() as AccessControlUser;
    return userData.accessRights === 'admin';
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
};

/**
 * Check if a user has access to a specific area
 * @param email - User's email address
 * @param area - The area to check access for (review, approve, accounts)
 * @returns true if user has access to the area
 */
export const hasAreaAccess = async (
  email: string,
  area: 'review' | 'approve' | 'accounts'
): Promise<boolean> => {
  // ADMIN_EMAILS have full access
  if (ADMIN_EMAILS.includes(email)) {
    return true;
  }
  
  try {
    const q = query(collection(db, 'accessControl'), where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return false;
    }
    
    const userData = snapshot.docs[0].data() as AccessControlUser;
    
    // For both admin and entry users, check specific area permissions
    // Admin users will only see sections they have checkboxes selected for
    return userData.areaOfRights?.[area] === true;
  } catch (error) {
    console.error('Error checking area access:', error);
    return false;
  }
};

/**
 * Get user access information
 * @param email - User's email address
 * @returns User access control data or null
 */
export const getUserAccess = async (email: string): Promise<AccessControlUser | null> => {
  try {
    const q = query(collection(db, 'accessControl'), where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Check if user is in ADMIN_EMAILS - they have default admin access
      if (ADMIN_EMAILS.includes(email)) {
        return {
          id: 'default-admin',
          name: 'Admin User',
          email: email,
          number: '',
          designation: 'Administrator',
          department: 'Admin',
          employeeManager: '',
          accessRights: 'admin',
          areaOfRights: {
            review: true,
            approve: true,
            accounts: true,
          },
        };
      }
      return null;
    }
    
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as AccessControlUser;
  } catch (error) {
    console.error('Error getting user access:', error);
    return null;
  }
};

/**
 * Check if email is in the default admin list
 * @param email - User's email address
 * @returns true if email is in ADMIN_EMAILS
 */
export const isDefaultAdmin = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email);
};

export { ADMIN_EMAILS };
