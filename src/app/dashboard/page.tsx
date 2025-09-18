"use client"

import * as React from "react"
import Link from "next/link"
import {
  File,
  PlusCircle,
  Search,
  MoreHorizontal,
  Upload,
} from "lucide-react"
import Papa from "papaparse"
import { format } from "date-fns"


import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Branch, Issue } from "@/lib/types"
import { addBranch, deleteBranch, getBranches, getAllIssues, updateBranch } from "@/lib/firestore"

export default function Dashboard() {
  const [branches, setBranches] = React.useState<Branch[]>([])
  const [allIssues, setAllIssues] = React.useState<Issue[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [sortOption, setSortOption] = React.useState("name-asc")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [currentBranch, setCurrentBranch] = React.useState<Branch | null>(null)
  const [branchId, setBranchId] = React.useState("")
  const [branchName, setBranchName] = React.useState("")
  const [branchIp, setBranchIp] = React.useState("")
  const [loading, setLoading] = React.useState(true)


  const { toast } = useToast()

  const fetchBranches = React.useCallback(async () => {
    setLoading(true);
    try {
      const branchesFromDb = await getBranches();
      setBranches(branchesFromDb);
      const issuesFromDb = await getAllIssues();
      setAllIssues(issuesFromDb);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error fetching data",
        description: "Could not fetch data from the database.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);


  React.useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const filteredAndSortedBranches = branches
    .filter(
      (branch) =>
        branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        branch.branchId.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "id-asc":
          return a.branchId.localeCompare(b.branchId, undefined, { numeric: true });
        case "id-desc":
          return b.branchId.localeCompare(a.branchId, undefined, { numeric: true });
        default:
          return 0;
      }
    });
  
  const branchesWithLatestOpenIssue = React.useMemo(() => {
    return branches.map(branch => {
      const openIssues = allIssues
        .filter(issue => issue.branchId === branch.id && issue.status === 'Open')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      return {
        ...branch,
        latestOpenIssue: openIssues[0] || null
      };
    }).filter(branch => branch.latestOpenIssue);
  }, [branches, allIssues]);
  
  const filteredBranchesWithOpenIssue = branchesWithLatestOpenIssue
    .filter(
      (branch) =>
        branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        branch.branchId.toLowerCase().includes(searchTerm.toLowerCase())
    );


  const handleOpenDialog = (branch: Branch | null) => {
    setCurrentBranch(branch)
    if (branch) {
      setBranchId(branch.branchId)
      setBranchName(branch.name)
      setBranchIp(branch.ipAddress)
    } else {
      setBranchId("")
      setBranchName("")
      setBranchIp("")
    }
    setIsDialogOpen(true)
  }

  const handleSaveBranch = async () => {
    if (!branchId || !branchName || !branchIp) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "All fields are required.",
      })
      return
    }

    try {
        if (currentBranch) {
          const updatedBranch = await updateBranch(currentBranch.id, { branchId, name: branchName, ipAddress: branchIp });
          setBranches(branches.map(b => b.id === currentBranch.id ? updatedBranch : b));
          toast({ title: "Success", description: "Branch updated successfully." });
        } else {
          await addBranch({ branchId, name: branchName, ipAddress: branchIp });
          toast({ title: "Success", description: "Branch added successfully." });
        }
        fetchBranches();
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error saving branch",
            description: "Could not save the branch to the database.",
        });
    }


    setIsDialogOpen(false)
    setCurrentBranch(null)
  }

  const handleDeleteBranch = async (id: string) => {
    try {
        await deleteBranch(id);
        setBranches(branches.filter(b => b.id !== id));
        toast({ title: "Success", description: "Branch deleted successfully." });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error deleting branch",
            description: "Could not delete the branch from the database.",
        });
    }
  }
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const branchesToAdd: Omit<Branch, 'id'>[] = [];
        for (const row of results.data) {
          const branchData = row as { branchId: string, name: string, ipAddress: string };
          if (branchData.branchId && branchData.name && branchData.ipAddress) {
            branchesToAdd.push({
              branchId: branchData.branchId,
              name: branchData.name,
              ipAddress: branchData.ipAddress,
            });
          }
        }

        if (branchesToAdd.length > 0) {
          try {
            for (const branch of branchesToAdd) {
              await addBranch(branch);
            }
            await fetchBranches();
            toast({
              title: "Upload Successful",
              description: `${branchesToAdd.length} branches have been added.`,
            });
          } catch (error) {
            toast({
              variant: "destructive",
              title: "Error uploading branches",
              description: "Could not save the branches to the database.",
            });
          }
        } else {
          toast({
            variant: "destructive",
            title: "Invalid CSV format",
            description: "The CSV file must have 'branchId', 'name', and 'ipAddress' columns.",
          });
        }
      },
      error: (error) => {
        toast({
          variant: "destructive",
          title: "Error parsing CSV",
          description: error.message,
        });
      },
    });
     // Reset file input
    event.target.value = '';
  };
  
  return (
    <Tabs defaultValue="all">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open-issues">Open Issues</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <Label htmlFor="csv-upload" className="cursor-pointer">
               <Upload className="h-3.5 w-3.5 mr-2" />
               Upload CSV
               <Input id="csv-upload" type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
            </Label>
          </Button>
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="id-asc">Branch ID (Asc)</SelectItem>
              <SelectItem value="id-desc">Branch ID (Desc)</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative ml-auto flex-1 md:grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or ID..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1" onClick={() => handleOpenDialog(null)}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add Branch
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{currentBranch ? "Edit Branch" : "Add New Branch"}</DialogTitle>
                <DialogDescription>
                  {currentBranch ? "Update the details of your branch." : "Enter the details for the new branch."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="branchId" className="text-right">
                    Branch ID
                  </Label>
                  <Input id="branchId" value={branchId} onChange={(e) => setBranchId(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="branchName" className="text-right">
                    Name
                  </Label>
                  <Input id="branchName" value={branchName} onChange={(e) => setBranchName(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="branchIp" className="text-right">
                    IP Address
                  </Label>
                  <Input id="branchIp" value={branchIp} onChange={(e) => setBranchIp(e.target.value)} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveBranch}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <TabsContent value="all">
        <Card>
          <CardHeader>
            <CardTitle>Branches</CardTitle>
            <CardDescription>
              Manage your branches and view their details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch ID</TableHead>
                  <TableHead>Branch Name</TableHead>
                  <TableHead className="hidden md:table-cell">
                    IP Address
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedBranches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell>
                        <Badge variant="outline">{branch.branchId}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                          <Link href={`/dashboard/branches/${branch.id}`} className="hover:underline">
                              {branch.name}
                          </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {branch.ipAddress}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => handleOpenDialog(branch)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDeleteBranch(branch.id)} className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              Showing <strong>1-{filteredAndSortedBranches.length}</strong> of <strong>{branches.length}</strong> branches
            </div>
          </CardFooter>
        </Card>
      </TabsContent>
      <TabsContent value="open-issues">
        <Card>
          <CardHeader>
            <CardTitle>Branches with Open Issues</CardTitle>
            <CardDescription>
              Branches with their latest open issue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Issue Description</TableHead>
                  <TableHead>Date Opened</TableHead>
                  <TableHead>Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : (
                  filteredBranchesWithOpenIssue.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">
                          <Link href={`/dashboard/branches/${branch.id}`} className="hover:underline">
                              {branch.name}
                          </Link>
                      </TableCell>
                      <TableCell>{branch.latestOpenIssue!.description}</TableCell>
                      <TableCell>{format(new Date(branch.latestOpenIssue!.date), "dd MMM yyyy")}</TableCell>
                      <TableCell>{branch.latestOpenIssue!.responsibility}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              Showing <strong>{filteredBranchesWithOpenIssue.length}</strong> of <strong>{branchesWithLatestOpenIssue.length}</strong> branches with open issues.
            </div>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
