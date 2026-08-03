export const PERMISSIONS = [
  'product.view',
  'product.create',
  'product.edit',
  'product.delete',
  
  'stock.view',
  'stock.adjust',
  'stock.transfer',
  
  'purchase.view',
  'purchase.create',
  'purchase.edit',
  'purchase.delete',
  
  'sale.view',
  'sale.create',
  'sale.cancel',
  
  'warehouse.view',
  'warehouse.create',
  'warehouse.edit',
  
  'report.view',
  'import.export',
  'settings.manage',
  'user.manage'
];

export const DEFAULT_ROLES = {
  Admin: {
    name: 'Admin',
    permissions: [...PERMISSIONS]
  },
  Manager: {
    name: 'Manager',
    permissions: [
      'product.view', 'product.create', 'product.edit',
      'stock.view', 'stock.adjust', 'stock.transfer',
      'purchase.view', 'purchase.create', 'purchase.edit',
      'sale.view', 'sale.create', 'sale.cancel',
      'warehouse.view', 'warehouse.create', 'warehouse.edit',
      'report.view', 'import.export', 'settings.manage'
    ]
  },
  Staff: {
    name: 'Staff',
    permissions: [
      'product.view',
      'stock.view', 'stock.transfer',
      'purchase.view', 'purchase.create',
      'sale.view', 'sale.create'
    ]
  },
  Viewer: {
    name: 'Viewer',
    permissions: [
      'product.view',
      'stock.view',
      'purchase.view',
      'sale.view',
      'warehouse.view',
      'report.view'
    ]
  }
};
