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
  closingDate?: string; // ISO string
};

export type ReportConfiguration = {
  id: string; // Corresponds to responsibility, e.g., 'CRDB'
  time: string; // UTC time in HH:mm format
  enabled: boolean;
};
