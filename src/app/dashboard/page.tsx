
"use client"

import * as React from "react"
import Link from "next/link"
import { File, PlusCircle, Search, MoreHorizontal, Upload, FileCode } from "lucide-react"
import Papa from "papaparse"
import { format } from "date-fns"
import { collection } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Branch, Issue } from "@/lib/types"
import { addBranch, deleteBranch, updateBranch } from "@/lib/firestore"
import { useCollection } from "@/hooks/use-collection"
import { db } from "@/lib/firebase"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const branchSchema = z.object({
  branchId: z.string().min(1, "Branch ID is required."),
  name: z.string().min(1, "Branch name is required."),
  ipAddress: z.string().ip({ version: "v4", message: "Invalid IP address." }),
});

type BranchFormValues = z.infer<typeof branchSchema>;

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [sortOption, setSortOption] = React.useState("name-asc")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [currentBranch, setCurrentBranch] = React.useState<Branch | null>(null)
  const [openIssuesBranchFilter, setOpenIssuesBranchFilter] = React.useState('');
  const [openIssuesDescriptionFilter, setOpenIssuesDescriptionFilter] = React.useState('');
  const [openIssuesAssignedToFilter, setOpenIssuesAssignedToFilter] = React.useState('');
  const [isJsonUpdateDialogOpen, setIsJsonUpdateDialogOpen] = React.useState(false)
  const [jsonInput, setJsonInput] = React.useState("")

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      branchId: "",
      name: "",
      ipAddress: "",
    },
  });

  const { data: branches, loading: branchesLoading } = useCollection<Branch>(
    React.useMemo(() => collection(db, 'branches'), [])
  );
  const { data: allIssues, loading: issuesLoading } = useCollection<Issue>(
    React.useMemo(() => collection(db, 'issues'), [])
  );

  const { toast } = useToast()

  const loading = branchesLoading || issuesLoading;

  const branchesWithTicketCount = React.useMemo(() => {
    if (!branches || !allIssues) return [];

    const ticketCounts = allIssues.reduce((acc, issue) => {
        if (issue.ticketNumber && issue.ticketNumber.trim() !== '' && issue.branchId) {
            acc[issue.branchId] = (acc[issue.branchId] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return branches.map(branch => ({
        ...branch,
        totalTickets: ticketCounts[branch.id] || 0
    }));
  }, [branches, allIssues]);

  const filteredAndSortedBranches = React.useMemo(() => {
    if (!branchesWithTicketCount) return [];
    return branchesWithTicketCount
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
          case "last-worked-desc":
            if (!a.lastWorked) return 1;
            if (!b.lastWorked) return -1;
            return new Date(b.lastWorked).getTime() - new Date(a.lastWorked).getTime();
          case "last-worked-asc":
            if (!a.lastWorked) return 1;
            if (!b.lastWorked) return -1;
            return new Date(a.lastWorked).getTime() - new Date(b.lastWorked).getTime();
          case "total-tickets-desc":
            return b.totalTickets - a.totalTickets;
          case "total-tickets-asc":
            return a.totalTickets - b.totalTickets;
          default:
            return a.name.localeCompare(b.name);
        }
      });
  }, [branchesWithTicketCount, searchTerm, sortOption]);
  
  const branchesWithLatestOpenIssue = React.useMemo(() => {
    if (!branches || !allIssues) return [];
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
  
  const filteredBranchesWithOpenIssue = React.useMemo(() => {
    return branchesWithLatestOpenIssue
      .filter(
        (branch) =>
          branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          branch.branchId.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(branch => 
        branch.name.toLowerCase().includes(openIssuesBranchFilter.toLowerCase())
      )
      .filter(branch => 
        branch.latestOpenIssue!.description.toLowerCase().includes(openIssuesDescriptionFilter.toLowerCase())
      )
      .filter(branch => 
        branch.latestOpenIssue!.responsibility.toLowerCase().includes(openIssuesAssignedToFilter.toLowerCase())
      );
  }, [branchesWithLatestOpenIssue, searchTerm, openIssuesBranchFilter, openIssuesDescriptionFilter, openIssuesAssignedToFilter]);


  const handleOpenDialog = (branch: Branch | null) => {
    setCurrentBranch(branch)
    if (branch) {
      form.reset({
        branchId: branch.branchId,
        name: branch.name,
        ipAddress: branch.ipAddress,
      });
    } else {
      form.reset();
    }
    setIsDialogOpen(true)
  }

  const handleSaveBranch = async (values: BranchFormValues) => {
    try {
        if (currentBranch) {
          await updateBranch(currentBranch.id, values);
          toast({ title: "Success", description: "Branch updated successfully." });
        } else {
          await addBranch(values);
          toast({ title: "Success", description: "Branch added successfully." });
        }
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
        toast({ title: "Success", description: "Branch deleted successfully." });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error deleting branch",
            description: "Could not delete the branch from the database.",
        });
    }
  }

  const handleMarkAsWorking = async (branchId: string) => {
    try {
      await updateBranch(branchId, { lastWorked: new Date().toISOString() });
      toast({ title: "Success", description: "Branch 'last worked' time has been updated." });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update branch status.",
      });
    }
  };
  
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
  
  const handleJsonUpdate = async () => {
    let branchesToUpdate;
    try {
        branchesToUpdate = JSON.parse(jsonInput);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Invalid JSON",
            description: "The provided text is not valid JSON.",
        });
        return;
    }

    try {
        const response = await fetch('/api/update-branches', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(branchesToUpdate),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to update branches.');
        }

        toast({
            title: "Update Successful",
            description: result.message,
        });
        setIsJsonUpdateDialogOpen(false);
        setJsonInput("");
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error updating branches",
            description: error.message || "Could not update branches.",
        });
    }
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
          <Button size="sm" variant="outline" onClick={() => setIsJsonUpdateDialogOpen(true)}>
            <FileCode className="h-3.5 w-3.5 mr-2" />
            Update from JSON
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
              <SelectItem value="last-worked-desc">Last Worked (Newest)</SelectItem>
              <SelectItem value="last-worked-asc">Last Worked (Oldest)</SelectItem>
              <SelectItem value="total-tickets-desc">Tickets (High-Low)</SelectItem>
              <SelectItem value="total-tickets-asc">Tickets (Low-High)</SelectItem>
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveBranch)} className="grid gap-4 py-4">
                  <FormField
                    control={form.control}
                    name="branchId"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right">Branch ID</FormLabel>
                        <FormControl>
                          <Input {...field} className="col-span-3" />
                        </FormControl>
                        <FormMessage className="col-start-2 col-span-3" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right">Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="col-span-3" />
                        </FormControl>
                        <FormMessage className="col-start-2 col-span-3" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ipAddress"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right">IP Address</FormLabel>
                        <FormControl>
                          <Input {...field} className="col-span-3" />
                        </FormControl>
                        <FormMessage className="col-start-2 col-span-3" />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">Save</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Dialog open={isJsonUpdateDialogOpen} onOpenChange={setIsJsonUpdateDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Branches from JSON</DialogTitle>
                    <DialogDescription>
                        Paste the JSON array of branches to update their 'last worked' status.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Textarea
                        placeholder={`[
  { "name": "Mlimani City", "totalTickets": 496 }
]`}
                        className="min-h-[200px] font-mono"
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsJsonUpdateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleJsonUpdate}>Update Branches</Button>
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
                  <TableHead className="hidden md:table-cell">
                    Last Worked
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Total Tickets
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
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
                      <TableCell className="hidden md:table-cell">
                        {branch.lastWorked ? format(new Date(branch.lastWorked), "dd MMM yyyy, p") : 'N/A'}
                      </TableCell>
                       <TableCell className="hidden md:table-cell">
                        {branch.totalTickets}
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
                            <DropdownMenuItem onSelect={() => handleMarkAsWorking(branch.id)}>Mark as Working</DropdownMenuItem>
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
              Showing <strong>1-{filteredAndSortedBranches.length}</strong> of <strong>{branches?.length || 0}</strong> branches
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <Input 
                    placeholder="Filter by Branch Name..." 
                    value={openIssuesBranchFilter}
                    onChange={(e) => setOpenIssuesBranchFilter(e.target.value)}
                />
                <Input 
                    placeholder="Filter by Issue Description..." 
                    value={openIssuesDescriptionFilter}
                    onChange={(e) => setOpenIssuesDescriptionFilter(e.target.value)}
                />
                <Input 
                    placeholder="Filter by Assigned To..."
                    value={openIssuesAssignedToFilter}
                    onChange={(e) => setOpenIssuesAssignedToFilter(e.target.value)}
                />
            </div>
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
