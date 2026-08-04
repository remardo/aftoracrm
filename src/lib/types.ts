export type Role = 'factory_admin' | 'factory_manager' | 'dealer_admin' | 'dealer_manager';

export type Row = Record<string, any>;

export interface Profile {
  id: number;
  user_id?: string | null;
  email: string;
  full_name: string;
  phone?: string | null;
  role: Role;
  dealer_id: number | null;
  outlet_id?: number | null;
  status: string;
}

export interface NavItem {
  to: string;
  label: string;
  icon: any;
  roles?: Role[];
}
