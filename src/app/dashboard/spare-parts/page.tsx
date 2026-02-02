
"use client"

import * as React from "react"
import { MoreHorizontal, PlusCircle, Search } from "lucide-react"
import { collection, query } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { SparePart } from "@/lib/types"
import { addSparePart, deleteSparePart, updateSparePart } from "@/lib/firestore"
import { useCollection } from "@/hooks/use-collection"
import { db } from "@/lib/firebase"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const sparePartSchema = z.object({
  name: z.string().min(1, "Part name is required."),
  partNumber: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantity must be a non-negative number."),
  description: z.string().optional(),
});

type SparePartFormValues = z.infer<typeof sparePartSchema>;

export default function SparePartsPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [sortOption, setSortOption] = React.useState("name-asc")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [currentPart, setCurrentPart] = React.useState<SparePart | null>(null)

  const form = useForm<SparePartFormValues>({
    resolver: zodResolver(sparePartSchema),
    defaultValues: {
      name: "",
      partNumber: "",
      quantity: 0,
      description: "",
    },
  });

  const sparePartsQuery = React.useMemo(() => query(collection(db, 'spare_parts')), []);
  const { data: spareParts, loading } = useCollection<SparePart>(sparePartsQuery);

  const { toast } = useToast()

  const filteredAndSortedParts = React.useMemo(() => {
    if (!spareParts) return [];
    return spareParts
      .filter(
        (part) =>
          part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (part.partNumber && part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => {
        switch (sortOption) {
          case "name-asc":
            return a.name.localeCompare(b.name);
          case "name-desc":
            return b.name.localeCompare(a.name);
          case "quantity-asc":
            return a.quantity - b.quantity;
          case "quantity-desc":
            return b.quantity - a.quantity;
          default:
            return a.name.localeCompare(b.name);
        }
      });
  }, [spareParts, searchTerm, sortOption]);

  const handleOpenDialog = (part: SparePart | null) => {
    setCurrentPart(part)
    if (part) {
      form.reset({
        name: part.name,
        partNumber: part.partNumber,
        quantity: part.quantity,
        description: part.description,
      });
    } else {
      form.reset({ name: "", partNumber: "", quantity: 0, description: "" });
    }
    setIsDialogOpen(true)
  }

  const handleSavePart = async (values: SparePartFormValues) => {
    try {
      if (currentPart) {
        await updateSparePart(currentPart.id, values);
        toast({ title: "Success", description: "Spare part updated successfully." });
      } else {
        await addSparePart(values);
        toast({ title: "Success", description: "Spare part added successfully." });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error saving spare part",
        description: "Could not save the spare part to the database.",
      });
    }

    setIsDialogOpen(false)
    setCurrentPart(null)
  }

  const handleDeletePart = async (id: string) => {
    try {
      await deleteSparePart(id);
      toast({ title: "Success", description: "Spare part deleted successfully." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error deleting spare part",
        description: "Could not delete the spare part from the database.",
      });
    }
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold">Spare Parts Inventory</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or part number..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="quantity-asc">Quantity (Low-High)</SelectItem>
              <SelectItem value="quantity-desc">Quantity (High-Low)</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 gap-1" onClick={() => handleOpenDialog(null)}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add Part
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{currentPart ? "Edit Spare Part" : "Add New Spare Part"}</DialogTitle>
                <DialogDescription>
                  Enter the details for the spare part.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSavePart)} className="grid gap-4 py-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Part Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="partNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Part Number (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                           <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsDialogOpen(false); setCurrentPart(null); }}>Cancel</Button>
                    <Button type="submit">Save</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
          <CardDescription>
            Manage your spare parts inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Part Number</TableHead>
                <TableHead className="hidden md:table-cell">
                  Description
                </TableHead>
                <TableHead className="text-right">
                  Quantity in Stock
                </TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : (
                filteredAndSortedParts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-medium">
                      {part.name}
                    </TableCell>
                    <TableCell>{part.partNumber || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {part.description || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {part.quantity}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
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
                            <DropdownMenuItem onSelect={() => handleOpenDialog(part)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDeletePart(part.id)} className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
               {!loading && filteredAndSortedParts.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center">
                        No spare parts found.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>1-{filteredAndSortedParts.length}</strong> of <strong>{spareParts?.length || 0}</strong> spare parts.
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
