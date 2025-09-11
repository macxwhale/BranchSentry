export type Branch = {
  id: string;
  branchId: string;
  name: string;
  ipAddress: string;
};

export type Issue = {
  id: string;
  branchId: string;
  description: string;
  date: string; // ISO string
  responsibility: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  ticketNumber?: string;
  ticketUrl?: string;
};
