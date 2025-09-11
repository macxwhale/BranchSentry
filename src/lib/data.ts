import { Branch, Issue } from './types';

export const branches: Branch[] = [
  { id: '1', branchId: 'BR-SF-001', name: 'San Francisco Central', ipAddress: '192.168.1.1' },
  { id: '2', branchId: 'BR-NY-002', name: 'New York Downtown', ipAddress: '192.168.1.2' },
  { id: '3', branchId: 'BR-LA-003', name: 'Los Angeles Metro', ipAddress: '192.168.1.3' },
  { id: '4', branchId: 'BR-CH-004', name: 'Chicago North', ipAddress: '192.168.1.4' },
  { id: '5', branchId: 'BR-TX-005', name: 'Austin South', ipAddress: '192.168.1.5' },
];

export const issues: Issue[] = [
  { id: '101', branchId: '1', description: 'Network printer offline', date: '2024-07-20T10:00:00Z', responsibility: 'John Doe', status: 'Resolved' },
  { id: '102', branchId: '1', description: 'POS system slow response', date: '2024-07-22T14:30:00Z', responsibility: 'Jane Smith', status: 'In Progress' },
  { id: '103', branchId: '2', description: 'Firewall configuration error', date: '2024-07-21T09:00:00Z', responsibility: 'Peter Jones', status: 'Resolved' },
  { id: '104', branchId: '3', description: 'Customer Wi-Fi not connecting', date: '2024-07-23T11:00:00Z', responsibility: 'Emily White', status: 'Open' },
  { id: '105', branchId: '1', description: 'Security camera feed interrupted', date: '2024-07-24T08:45:00Z', responsibility: 'Jane Smith', status: 'Open' },
  { id: '106', branchId: '4', description: 'Server rack overheating', date: '2024-07-19T16:00:00Z', responsibility: 'Robert Brown', status: 'Resolved' },
  { id: '107', branchId: '5', description: 'VoIP phone system outage', date: '2024-07-25T13:00:00Z', responsibility: 'Chris Green', status: 'In Progress' },
];
