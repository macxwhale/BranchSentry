export type Branch = {
  id: string;
  branchId: string;
  name: string;
  ipAddress: string;
  lastWorked?: string; // ISO string
  totalTickets?: number;
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
  reportTitle?: string;
  reportBody?: string;
  channel?: string;
  attach?: string;
  notify_type?: 'success' | 'info' | 'warning' | 'error';
  silent?: boolean;
};

export type SparePart = {
  id: string;
  name: string;
  partNumber?: string;
  quantity: number;
  description?: string;
};

export type SparePartLog = {
  id: string;
  branchId: string;
  sparePartId: string;
  sparePartName: string; // Denormalized for easier display
  type: 'Replaced' | 'Returned';
  quantity: number;
  date: string; // ISO string
  notes?: string;
};
