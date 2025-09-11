"use client"

import * as React from "react"
import Link from "next/link"
import {
  File,
  PlusCircle,
  Search,
  MoreHorizontal,
  Upload,
  Firebase
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
import { branches as initialBranches } from "@/lib/data"
import { Branch } from "@/lib/types"

export default function Dashboard() {
  const [branches, setBranches] = React.useState<Branch[]>(initialBranches)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [currentBranch, setCurrentBranch] = React.useState<Branch | null>(null)
  const [branchId, setBranchId] = React.useState("")
  const [branchName, setBranchName] = React.useState("")
  const [branchIp, setBranchIp] = React.useState("")

  const { toast } = useToast()

  const filteredBranches = branches.filter(
    (branch) =>
      branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.branchId.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  const handleSaveBranch = () => {
    if (!branchId || !branchName || !branchIp) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "All fields are required.",
      })
      return
    }

    if (currentBranch) {
      // Edit branch
      setBranches(
        branches.map((b) =>
          b.id === currentBranch.id
            ? { ...b, branchId, name: branchName, ipAddress: branchIp }
            : b
        )
      )
      toast({ title: "Success", description: "Branch updated successfully." })
    } else {
      // Add new branch
      const newBranch: Branch = {
        id: (branches.length + 1).toString(),
        branchId,
        name: branchName,
        ipAddress: branchIp,
      }
      setBranches([...branches, newBranch])
      toast({ title: "Success", description: "Branch added successfully." })
    }

    setIsDialogOpen(false)
    setCurrentBranch(null)
  }

  const handleDeleteBranch = (id: string) => {
    setBranches(branches.filter(b => b.id !== id));
    toast({ title: "Success", description: "Branch deleted successfully." })
  }
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Here you would process the CSV file
      console.log("Uploading file:", file.name);
      toast({
        title: "File Uploaded",
        description: `${file.name} has been uploaded.`,
      });
    }
  };
  
  const handleConnectFirebase = () => {
    toast({
        title: "Connect to Firebase",
        description: "Connecting to Firebase...",
    });
    // In a real app, you'd trigger the Firebase connection flow here.
  }

  return (
    <Tabs defaultValue="all">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
           <Button size="sm" variant="outline" onClick={handleConnectFirebase}>
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-2 h-4 w-4" viewBox="0 0 16 16">
                <path d="M7.674 1.542.872 9.543a.25.25 0 0 0 .193.424h3.454l-.32 4.403c-.023.32.293.488.52.285L15.128 6.46a.25.25 0 0 0-.193-.424H11.48l.32-4.403c.023-.32-.293-.488-.52-.285L7.674 1.542Z"/>
            </svg>
            Connect to Firebase
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Label htmlFor="csv-upload" className="cursor-pointer">
               <Upload className="h-3.5 w-3.5 mr-2" />
               Upload CSV
               <Input id="csv-upload" type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
            </Label>
          </Button>
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
                {filteredBranches.map((branch) => (
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              Showing <strong>1-{filteredBranches.length}</strong> of <strong>{branches.length}</strong> branches
            </div>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
