# Access Control System

This document explains how the access control system works in the Expense Tracker application.

## Overview

The access control system manages user permissions throughout the application. There are two types of access levels:

### 1. **Admin Access** 👑
Users with admin access have full control over the application:
- Access to the complete Admin Dashboard
- Can review and approve/reject expense submissions
- Can process payments and manage accounts
- Can configure user permissions in Access Control
- Can view all expenses and generate reports

### 2. **Entry Access** 👤
Users with entry access have limited permissions:
- Can submit their own expenses
- Can view their own expense history
- Can track the status of their submissions
- **Cannot** access the admin dashboard
- **Cannot** review or approve other users' expenses

## User Management

### Default Admins ⭐
These users are defined in the `ADMIN_EMAILS` constant and have permanent admin access:
- bhurvaxsharma.india@gmail.com
- nitishjain0109@gmail.com
- neetu@panachegreen.com
- hrd@panachegreen.com
- brijesh@panachegreen.com
- accounts@panachegreen.com

**Note**: Default admin users cannot be removed or modified through the Access Control interface.

### Custom Access Control
You can add additional users through the Access Control section:

1. **Adding Admin Users**:
   - Set Access Rights to "Admin"
   - They will get the same permissions as default admins
   - Full access to all dashboard sections

2. **Adding Entry Users with Specific Rights**:
   - Set Access Rights to "Entry"
   - Grant specific area permissions:
     - **Review**: Can access the Review section to review expenses
     - **Approve**: Can access the Approve section for final approvals
     - **Accounts**: Can access the Accounts section for payment processing

## Data Storage

Access control data is stored in Firebase Firestore:

**Collection**: `accessControl`

**Document Structure**:
```javascript
{
  name: string,
  email: string,
  number: string,
  designation: string,
  department: string,
  employeeManager: string,
  accessRights: 'admin' | 'entry',
  areaOfRights: {
    review: boolean,
    approve: boolean,
    accounts: boolean
  },
  createdAt: string,
  createdBy: string
}
```

## Using Access Control in Code

### Import the helper functions
```typescript
import { 
  hasAdminAccess, 
  hasAreaAccess, 
  getUserAccess,
  isDefaultAdmin 
} from '@/lib/accessControl';
```

### Check if user has admin access
```typescript
const isAdmin = await hasAdminAccess(userEmail);
if (isAdmin) {
  // Show admin features
}
```

### Check area-specific access
```typescript
const canReview = await hasAreaAccess(userEmail, 'review');
const canApprove = await hasAreaAccess(userEmail, 'approve');
const canAccessAccounts = await hasAreaAccess(userEmail, 'accounts');
```

### Get complete user access info
```typescript
const userAccess = await getUserAccess(userEmail);
if (userAccess) {
  console.log('Access Rights:', userAccess.accessRights);
  console.log('Area Rights:', userAccess.areaOfRights);
}
```

## Security Best Practices

1. **Only add trusted users** to the Access Control system
2. **Admin users have full control** - be selective about who gets admin access
3. **Review permissions regularly** - remove users who no longer need access
4. **Use area-specific rights** for entry users who need limited admin capabilities
5. **Default admins are protected** - they cannot be removed accidentally

## Permission Matrix

| Feature | Default Admin | Custom Admin | Entry (No Rights) | Entry (Specific Rights) |
|---------|--------------|--------------|-------------------|------------------------|
| Submit Expenses | ✅ | ✅ | ✅ | ✅ |
| View Own Expenses | ✅ | ✅ | ✅ | ✅ |
| Dashboard Statistics | ✅ | ✅ | ❌ | ❌ |
| Review Section | ✅ | ✅ | ❌ | ✅ (if granted) |
| Approve Section | ✅ | ✅ | ❌ | ✅ (if granted) |
| Accounts Section | ✅ | ✅ | ❌ | ✅ (if granted) |
| Access Control | ✅ | ✅ | ❌ | ❌ |
| View All Expenses | ✅ | ✅ | ❌ | Limited by area |
| Export Reports | ✅ | ✅ | ❌ | ❌ |

## Troubleshooting

### User cannot access admin features
1. Verify the user's email is correctly entered in Access Control
2. Check that Access Rights is set to "Admin" or appropriate area rights are enabled
3. Ensure the user is logged in with the correct email address
4. Check Firebase Firestore rules allow read access to `accessControl` collection

### Changes not taking effect
1. User may need to log out and log back in
2. Clear browser cache and refresh the page
3. Verify the changes were saved to Firestore

### Cannot remove a user
- If the user has a ⭐ star badge, they are a default admin and cannot be removed
- Only custom users added through Access Control can be removed

## Future Enhancements

Potential improvements to the access control system:
- Role-based access control (RBAC) with custom roles
- Time-based access (temporary permissions)
- Audit logs for permission changes
- Department-level permissions
- Approval workflows based on user roles
