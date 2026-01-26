
"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Copy, MoreHorizontal, PlusCircle, Search } from "lucide-react"
import { format } from "date-fns"
import { collection, query, where, doc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Branch, Issue } from "@/lib/types"
import { addIssue, deleteIssue, updateIssue } from "@/lib/firestore"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDoc } from "@/hooks/use-doc"
import { useCollection } from "@/hooks/use-collection"
import { db } from "@/lib/firebase"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";


const issueSchema = z.object({
  description: z.string().min(1, "Description is required."),
  responsibility: z.string().min(1, "Responsibility is required."),
  status: z.enum(["Open", "In Progress", "Resolved"]),
  date: z.date(),
  ticketNumber: z.string().optional(),
  ticketUrl: z.string().url().or(z.literal("")).optional(),
});

type IssueFormValues = z.infer<typeof issueSchema>;

export default function BranchDetailPage() {
  const params = useParams()
  const branchId = params.id as string

  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [sortOption, setSortOption] = React.useState("date-desc")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [currentIssue, setCurrentIssue] = React.useState<Issue | null>(null)

  const { toast } = useToast()

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      description: "",
      responsibility: "",
      status: "Open",
      date: new Date(),
      ticketNumber: "",
      ticketUrl: "",
    },
  });

  const { data: branch, loading: branchLoading } = useDoc<Branch>(
    React.useMemo(() => (branchId ? doc(db, 'branches', branchId) : null), [branchId])
  );
  
  const { data: issues, loading: issuesLoading } = useCollection<Issue>(
    React.useMemo(() => (branchId ? query(collection(db, 'issues'), where('branchId', '==', branchId)) : null), [branchId])
  );

  const filteredIssues = React.useMemo(() => {
    if (!issues) return [];
    return issues
    .filter((issue) => statusFilter === "all" || issue.status === statusFilter)
    .filter(
      (issue) =>
        issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.responsibility.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortOption) {
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "closing-date-asc":
          if (a.closingDate && b.closingDate) return new Date(a.closingDate).getTime() - new Date(b.closingDate).getTime();
          if (a.closingDate) return -1;
          if (b.closingDate) return 1;
          return 0;
        case "closing-date-desc":
          if (a.closingDate && b.closingDate) return new Date(b.closingDate).getTime() - new Date(a.closingDate).getTime();
          if (a.closingDate) return -1;
          if (b.closingDate) return 1;
          return 0;
        case "status-asc":
          return a.status.localeCompare(b.status);
        case "status-desc":
          return b.status.localeCompare(a.status);
        case "assigned-asc":
            return a.responsibility.localeCompare(b.responsibility);
        case "assigned-desc":
            return b.responsibility.localeCompare(a.responsibility);
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
  }, [issues, statusFilter, searchTerm, sortOption]);

  const handleOpenDialog = (issue: Issue | null) => {
    setCurrentIssue(issue)
    if (issue) {
      form.reset({
        description: issue.description,
        responsibility: issue.responsibility,
        status: issue.status,
        date: new Date(issue.date),
        ticketNumber: issue.ticketNumber || "",
        ticketUrl: issue.ticketUrl || "",
      });
    } else {
      form.reset();
    }
    setIsDialogOpen(true)
  }

  const handleSaveIssue = async (values: IssueFormValues) => {
    if (!branch) return;

    const issueData: Partial<Omit<Issue, 'id'>> & { branchId: string } = {
      ...values,
      date: values.date.toISOString(),
      branchId: branch.id,
    };

    if (values.status === 'Resolved') {
      if (!currentIssue || currentIssue.status !== 'Resolved') {
        issueData.closingDate = new Date().toISOString();
      } else if (currentIssue?.closingDate) {
        issueData.closingDate = currentIssue.closingDate;
      }
    } else {
        if (issueData.closingDate) {
            issueData.closingDate = undefined;
        }
    }
    
    try {
      if (currentIssue) {
        await updateIssue(currentIssue.id, issueData);
        toast({ title: "Success", description: "Issue updated successfully." });
      } else {
        await addIssue(issueData as Omit<Issue, 'id'>);
        toast({ title: "Success", description: "Issue logged successfully." });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Failed to save issue." });
    }

    setIsDialogOpen(false)
  };

  
  const handleDeleteIssue = async (id: string) => {
    try {
        await deleteIssue(id);
        toast({ title: "Success", description: "Issue deleted successfully." })
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete issue." });
    }
  }

  const handleCloneIssue = async (issueToClone: Issue) => {
    const clonedIssueData: Omit<Issue, 'id'> = {
        branchId: issueToClone.branchId,
        description: `(Clone) ${issueToClone.description}`,
        responsibility: issueToClone.responsibility,
        status: 'Open',
        date: new Date().toISOString(),
        ticketNumber: issueToClone.ticketNumber,
        ticketUrl: issueToClone.ticketUrl,
    };

    try {
        await addIssue(clonedIssueData);
        toast({ title: "Success", description: "Issue cloned successfully." });
    } catch (e) {
        console.error("Failed to clone issue:", e);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to clone the issue.",
        });
    }
  };


  if (branchLoading) {
    return <div>Loading branch details...</div>
  }
  
  if (!branch) {
      return <div>Branch not found.</div>
  }


  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Branch Name</CardDescription>
            <CardTitle className="text-2xl">{branch.name}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Branch ID</CardDescription>
            <CardTitle className="text-2xl">{branch.branchId}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>IP Address</CardDescription>
            <CardTitle className="text-2xl">{branch.ipAddress}</CardTitle>
          </CardHeader>
        </Card>
         <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last Worked</CardDescription>
            <CardTitle className="text-xl">
              {branch.lastWorked ? format(new Date(branch.lastWorked), "dd MMM yyyy, p") : 'N/A'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Issues</CardDescription>
            <CardTitle className="text-2xl">
              {issues?.filter((i) => i.status !== "Resolved").length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
       <div className="grid gap-4">
        <div className="flex items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Issue History</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1" onClick={() => handleOpenDialog(null)}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Log Issue
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{currentIssue ? "Edit Issue" : "Log New Issue"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSaveIssue)} className="grid gap-4 py-4">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                       <FormField
                        control={form.control}
                        name="ticketNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ticket Number</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="ticketUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ticket URL</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="responsibility"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Responsibility</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select responsibility" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="CRDB">CRDB</SelectItem>
                                <SelectItem value="Zaoma">Zaoma</SelectItem>
                                <SelectItem value="Wavetec">Wavetec</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "dd MMM yyyy")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
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
          </div>
        </div>
          <Card>
            <CardHeader className="px-7">
              <CardTitle>Issues</CardTitle>
              <CardDescription>
                A complete history of issues for this branch.
              </CardDescription>
              <div className="flex items-center gap-2 pt-4">
                 <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search by keyword or person..."
                      className="w-full rounded-lg bg-background pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
                 <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Opened (Newest)</SelectItem>
                      <SelectItem value="date-asc">Opened (Oldest)</SelectItem>
                      <SelectItem value="closing-date-desc">Closed (Newest)</SelectItem>
                      <SelectItem value="closing-date-asc">Closed (Oldest)</SelectItem>
                      <SelectItem value="status-asc">Status (A-Z)</SelectItem>
                      <SelectItem value="status-desc">Status (Z-A)</SelectItem>
                      <SelectItem value="assigned-asc">Assigned To (A-Z)</SelectItem>
                      <SelectItem value="assigned-desc">Assigned To (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden sm:table-cell">Ticket</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">Opened</TableHead>
                    <TableHead className="hidden md:table-cell">Closed</TableHead>
                    <TableHead className="text-right">Assigned To</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issuesLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Loading issues...
                      </TableCell>
                    </TableRow>
                  ) : filteredIssues.length > 0 ? (
                    filteredIssues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell>
                          <div className="font-medium">{issue.description}</div>
                        </TableCell>
                         <TableCell className="hidden sm:table-cell">
                          {issue.ticketUrl && issue.ticketNumber ? (
                              <a href={issue.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  {issue.ticketNumber}
                              </a>
                          ) : (
                              issue.ticketNumber
                          )}
                         </TableCell>
                         <TableCell className="hidden sm:table-cell">
                          <Badge className="text-xs" variant={issue.status === 'Resolved' ? 'secondary' : (issue.status === 'Open' ? 'destructive' : 'default')}>{issue.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{format(new Date(issue.date), "dd MMM yyyy")}</TableCell>
                         <TableCell className="hidden md:table-cell">
                          {issue.closingDate ? format(new Date(issue.closingDate), "dd MMM yyyy") : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">{issue.responsibility}</TableCell>
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
                              <DropdownMenuItem onSelect={() => handleOpenDialog(issue)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleCloneIssue(issue)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Clone
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDeleteIssue(issue.id)} className="text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                     <TableRow>
                        <TableCell colSpan={7} className="text-center">
                            No issues found for this branch.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      </div>
    </div>
  )
}

    
