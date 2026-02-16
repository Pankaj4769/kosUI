// src/app/domains/staff/models/role.model.ts

export interface Role {
  id: number;
  name: string;
  description?: string;
  // You can extend this later with permissions, scopes, etc.
}