import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, setDoc, deleteField } from 'firebase/firestore';
import { Branch, Issue, ReportConfiguration } from './types';

// Branches

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

export const addIssue = async (issue: Omit<Issue, 'id'>): Promise<Issue> => {
    const docRef = await addDoc(collection(db, 'issues'), issue);
    const newIssue = await getDoc(docRef);
    return { id: newIssue.id, ...newIssue.data() } as Issue;
};

export const updateIssue = async (id: string, data: Partial<Omit<Issue, 'id'>>): Promise<Partial<Issue>> => {
    const issueRef = doc(db, 'issues', id);
    const updateData: { [key: string]: any } = { ...data };

    if (data.closingDate === undefined) {
      updateData.closingDate = deleteField();
    }
    
    await updateDoc(issueRef, updateData);

    const updatedDoc = await getDoc(issueRef);
    return { id: updatedDoc.id, ...updatedDoc.data() };
};


export const deleteIssue = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'issues', id));
};

// Report Configurations
export const getReportConfigurations = async (): Promise<ReportConfiguration[]> => {
    const configCol = collection(db, 'report_configurations');
    const configSnapshot = await getDocs(configCol);
    return configSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReportConfiguration));
};

export const updateReportConfiguration = async (config: ReportConfiguration): Promise<void> => {
    const configRef = doc(db, 'report_configurations', config.id);
    // Use setDoc with merge to create the document if it doesn't exist, or update it if it does.
    await setDoc(configRef, config, { merge: true });
};
