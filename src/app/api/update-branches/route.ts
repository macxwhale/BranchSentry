
import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Branch } from '@/lib/types';
import { updateBranch } from '@/lib/firestore';


// Define the expected shape of the input data
interface BranchUpdatePayload {
    name: string;
    totalTickets: number;
}

export async function POST(request: Request) {
    let branchesToProcess: BranchUpdatePayload[];
    
    try {
        branchesToProcess = await request.json();
    } catch (e) {
        return NextResponse.json({ message: "Error: Invalid JSON in request body." }, { status: 400 });
    }

    if (!Array.isArray(branchesToProcess) || branchesToProcess.length === 0) {
        return NextResponse.json({ message: "Error: No data provided to process, or the JSON is not an array." }, { status: 400 });
    }

    try {
        const branchesCol = collection(db, 'branches');
        const branchSnapshot = await getDocs(branchesCol);
        const allBranches = branchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
        const branchesByName = new Map(allBranches.map(b => [b.name.toLowerCase(), b]));

        let updatedCount = 0;
        const updatePromises: Promise<any>[] = [];
        const newDate = new Date().toISOString();

        for (const branch of branchesToProcess) {
            // Silently skip entries that don't have the required fields
            if (!branch.name || typeof branch.totalTickets !== 'number') {
                continue;
            }
          
            const name = branch.name.trim();
            const totalTickets = branch.totalTickets;

            const branchToUpdate = branchesByName.get(name.toLowerCase());

            if (branchToUpdate && totalTickets > 0) {
                // Use the existing firestore helper function
                updatePromises.push(
                    updateBranch(branchToUpdate.id, { lastWorked: newDate })
                );
                updatedCount++;
            }
        }

        if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
        }
    
        return NextResponse.json({ 
            message: `Successfully processed the request. Updated the 'lastWorked' status for ${updatedCount} branches.`,
            updatedCount: updatedCount,
        });

    } catch (error) {
        console.error('Failed to process branch updates:', error);
        let errorMessage = "An unknown server error occurred.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ message: `Failed to process request: ${errorMessage}` }, { status: 500 });
    }
}
