import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp, FieldValue } from 'firebase/firestore';
import { Branch, Issue } from './types';

// Branches

export const getBranches = async (): Promise<Branch[]> => {
    const branchesCol = collection(db, 'branches');
    const branchSnapshot = await getDocs(branchesCol);
    const branchList = branchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
    return branchList;
};

export const getBranch = async (id: string): Promise<Branch | null> => {
    const branchRef = doc(db, 'branches', id);
    const branchSnap = await getDoc(branchRef);
    if (branchSnap.exists()) {
        return { id: branchSnap.id, ...branchSnap.data() } as Branch;
    } else {
        return null;
    }
};

export const addBranch = async (branch: Omit<Branch, 'id'>): Promise<Branch> => {
    const docRef = await addDoc(collection(db, 'branches'), branch);
    return { id: docRef.id, ...branch };
};

export const updateBranch = async (id: string, data: Partial<Omit<Branch, 'id'>>): Promise<Branch> => {
    const branchRef = doc(db, 'branches', id);
    await updateDoc(branchRef, data);
    const updatedDoc = await getDoc(branchRef);
    return { id: updatedDoc.id, ...updatedDoc.data() } as Branch;
};

export const deleteBranch = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'branches', id));
};

// Issues

export const getIssuesForBranch = async (branchId: string): Promise<Issue[]> => {
    const issuesCol = collection(db, 'issues');
    const q = query(issuesCol, where('branchId', '==', branchId));
    const issueSnapshot = await getDocs(q);
    const issueList = issueSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue));
    return issueList;
};

export const addIssue = async (issue: Omit<Issue, 'id'>): Promise<Issue> => {
    const docRef = await addDoc(collection(db, 'issues'), issue);
    const newIssue = await getDoc(docRef);
    return { id: newIssue.id, ...newIssue.data() } as Issue;
};

export const updateIssue = async (id: string, data: Partial<Omit<Issue, 'id'>>): Promise<Partial<Issue>> => {
    const issueRef = doc(db, 'issues', id);
    const updateData = { ...data };
    
    if (data.closingDate === undefined) {
      // If closingDate is explicitly set to undefined, we may need to remove it.
      // Firestore's `updateDoc` won't remove a field if the value is undefined in the payload.
      // To remove it, you'd typically use `deleteField()`, but for simplicity, we'll
      // just ensure it's not part of the update if it's not a valid date string.
      // Let's create a new object without the undefined property.
      const { closingDate, ...rest } = updateData;
      await updateDoc(issueRef, rest);

    } else {
      await updateDoc(issueRef, updateData);
    }

    const updatedDoc = await getDoc(issueRef);
    return { id: updatedDoc.id, ...updatedDoc.data() };
};


export const deleteIssue = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'issues', id));
};
