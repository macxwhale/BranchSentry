"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import {
  MoreHorizontal,
  PlusCircle,
  Search,
} from "lucide-react"

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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Branch, Issue } from "@/lib/types"
import { addIssue, deleteIssue, getBranch, getIssuesForBranch, updateIssue } from "@/lib/firestore"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"


export default function BranchDetailPage() {
  const params = useParams()
  const branchId = params.id as string

  const [branch, setBranch] = React.useState<Branch | null>(null)
  const [issues, setIssues] = React.useState<Issue[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [currentIssue, setCurrentIssue] = React.useState<Issue | null>(null)
  const [description, setDescription] = React.useState("")
  const [responsibility, setResponsibility] = React.useState("")
  const [status, setStatus] = React.useState<Issue["status"]>("Open")
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [ticketNumber, setTicketNumber] = React.useState("")
  const [ticketUrl, setTicketUrl] = React.useState("")
  const [closingDate, setClosingDate] = React.useState<Date | undefined>()


  const { toast } = useToast()

  React.useEffect(() => {
    const fetchBranchData = async () => {
      try {
        const foundBranch = await getBranch(branchId);
        if (foundBranch) {
          setBranch(foundBranch);
          const branchIssues = await getIssuesForBranch(branchId);
          setIssues(branchIssues);
        } else {
          toast({ variant: "destructive", title: "Error", description: "Branch not found." });
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch branch data." });
      }
    };

    if (branchId) {
      fetchBranchData();
    }
  }, [branchId, toast]);

  const filteredIssues = issues
    .filter((issue) => statusFilter === "all" || issue.status === statusFilter)
    .filter(
      (issue) =>
        issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.responsibility.toLowerCase().includes(searchTerm.toLowerCase())
    )

  const handleOpenDialog = (issue: Issue | null) => {
    setCurrentIssue(issue)
    if (issue) {
      setDescription(issue.description)
      setResponsibility(issue.responsibility)
      setStatus(issue.status)
      setDate(new Date(issue.date))
      setTicketNumber(issue.ticketNumber || "")
      setTicketUrl(issue.ticketUrl || "")
      setClosingDate(issue.closingDate ? new Date(issue.closingDate) : undefined)
    } else {
      setDescription("")
      setResponsibility("")
      setStatus("Open")
      setDate(new Date())
      setTicketNumber("")
      setTicketUrl("")
      setClosingDate(undefined)
    }
    setIsDialogOpen(true)
  }

  const handleSaveIssue = async () => {
    if (!description || !responsibility || !date) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "All fields are required.",
      })
      return
    }

    const issueData: Omit<Issue, 'id'> & { closingDate?: string } = {
      description,
      responsibility,
      status,
      date: date.toISOString(),
      branchId: branch!.id,
      ticketNumber,
      ticketUrl,
    };

    if (status === 'Resolved' && (!currentIssue || currentIssue.status !== 'Resolved')) {
      issueData.closingDate = new Date().toISOString();
    } else if (status !== 'Resolved') {
      issueData.closingDate = undefined;
    } else if (currentIssue?.closingDate) {
      issueData.closingDate = currentIssue.closingDate;
    }


    try {
      if (currentIssue) {
        const updated = await updateIssue(currentIssue.id, issueData);
        setIssues(issues.map((i) => (i.id === currentIssue.id ? { ...i, ...updated, id: currentIssue.id } : i)));
        toast({ title: "Success", description: "Issue updated successfully." });
      } else {
        const newIssue = await addIssue(issueData);
        setIssues([...issues, newIssue]);
        toast({ title: "Success", description: "Issue logged successfully." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save issue." });
    }

    setIsDialogOpen(false)
  }
  
  const handleDeleteIssue = async (id: string) => {
    try {
        await deleteIssue(id);
        setIssues(issues.filter(i => i.id !== id));
        toast({ title: "Success", description: "Issue deleted successfully." })
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete issue." });
    }
  }


  if (!branch) {
    return <div>Loading branch details...</div>
  }

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
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
            <CardDescription>Open Issues</CardDescription>
            <CardTitle className="text-2xl">
              {issues.filter((i) => i.status !== "Resolved").length}
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
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="ticketNumber">Ticket Number</Label>
                      <Input id="ticketNumber" value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} />
                    </div>
                     <div className="grid gap-2">
                      <Label htmlFor="ticketUrl">Ticket URL</Label>
                      <Input id="ticketUrl" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="responsibility">Responsibility</Label>
                      <Select value={responsibility} onValueChange={setResponsibility}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select responsibility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CRDB">CRDB</SelectItem>
                          <SelectItem value="Zaoma">Zaoma</SelectItem>
                          <SelectItem value="Wavetec">Wavetec</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                       <Select value={status} onValueChange={(value) => setStatus(value as Issue['status'])}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                   <div className="grid gap-2">
                      <Label htmlFor="date">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "justify-start text-left font-normal",
                              !date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveIssue}>Save</Button>
                </DialogFooter>
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
                  {filteredIssues.map((issue) => (
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
                      <TableCell className="hidden md:table-cell">{new Date(issue.date).toLocaleDateString()}</TableCell>
                       <TableCell className="hidden md:table-cell">
                        {issue.closingDate ? new Date(issue.closingDate).toLocaleDateString() : 'N/A'}
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
                            <DropdownMenuItem onSelect={() => handleDeleteIssue(issue.id)} className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      </div>
    </div>
  )
}
