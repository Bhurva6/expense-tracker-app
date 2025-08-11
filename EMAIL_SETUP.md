# Nodemailer + Gmail Setup Guide for Expense Management System

## Overview
This expense management system uses **Nodemailer with Gmail** to send automated email notifications for:
1. **New expense notifications** - Sent to employee (confirmation) and all admins when a new expense is submitted
2. **Expense status change notifications** - Sent to employee and all admins when expense status changes (Approve/Reject/Under Review)
3. **Expense closure notifications** - Sent to employee and all admins when an expense is marked as closed/paid
4. **Monthly admin reports** - Automated monthly summary sent to all admins

## Features
✅ **Professional HTML email templates** with responsive design  
✅ **Location tracking** included in email notifications  
✅ **Error handling** - continues operation even if some emails fail  
✅ **Admin and employee notifications** for complete transparency  
✅ **Free Gmail integration** - no paid service required  
✅ **Secure authentication** using Gmail App Passwords  

## Step 1: Gmail Account Setup

### 1.1 Enable 2-Step Verification
1. Go to your [Google Account settings](https://myaccount.google.com/)
2. Navigate to **Security** tab
3. Click on **2-Step Verification** 
4. Follow the setup process to enable 2-Step Verification
5. ⚠️ This is required for App Passwords

### 1.2 Generate App Password
1. In Google Account Security settings
2. Click on **App passwords** (appears only after 2-Step Verification is enabled)
3. Select **Mail** as the app
4. Select **Other (Custom name)** and enter "Expense Management System"
5. Click **Generate**
6. Copy the **16-character password** (format: `abcd efgh ijkl mnop`)
7. ⚠️ Save this password securely - it won't be shown again

## Step 2: Environment Configuration

### 2.1 Create .env.local file
Create a `.env.local` file in the root directory of your project:

```bash
# Gmail Configuration for Nodemailer
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

### 2.2 Example Configuration
```bash
# Real example (replace with your credentials)
GMAIL_USER=admin@panachegreen.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

### 2.3 Security Notes
- ✅ Add `.env.local` to your `.gitignore` file
- ✅ Never commit credentials to version control
- ✅ Use different credentials for production vs development
- ✅ Regularly rotate App Passwords for security

## Step 3: Update Admin Email List

### 3.1 Modify Admin Emails
Edit the admin email list in `/lib/emailService.ts`:

```typescript
const ADMIN_EMAILS = [
  'bhurvaxsharma.india@gmail.com',
  'nitishjain0109@gmail.com',
  'neetu@panachegreen.com',
  'kunal.nihalani@icloud.com',
  'hrd@panachegreen.com',
  'brijesh@panachegreen.com',
  'accounts@panachegreen.com',
];
```

### 3.2 Add/Remove Admin Emails
- Add new admin emails to receive notifications
- Remove emails of former admins
- Verify all email addresses are correct
- Test with a few emails first before adding all

## Step 4: Testing Email Configuration

### 4.1 Basic Configuration Test
```typescript
import { testEmailConfiguration } from '../lib/emailService';

// Test if Gmail connection works
const isValid = await testEmailConfiguration();
console.log('Email config valid:', isValid);
```

### 4.2 Full Email Test
```typescript
import { runEmailTests } from '../lib/emailTests';

// Run comprehensive email tests
await runEmailTests();
```

### 4.3 Manual Test
1. Submit a test expense through the form
2. Check if emails are received by employee and admins
3. Change expense status and verify status change emails
4. Close an expense and verify closure emails

## Step 5: Email Templates & Content

### 5.1 New Expense Notification
- **To**: Employee (confirmation) + All Admins (alert)
- **When**: Immediately after expense submission
- **Content**: Complete expense details, location, breakdown
- **Template**: Professional design with company branding

### 5.2 Status Change Notification
- **To**: Employee + All Admins  
- **When**: Admin changes expense status (Approve/Reject/Under Review)
- **Content**: Status change details, action by admin, next steps
- **Template**: Color-coded by status (green=approved, red=rejected, yellow=review)

### 5.3 Expense Closure Notification
- **To**: Employee + All Admins
- **When**: Admin marks expense as closed/paid
- **Content**: Payment details, final amounts, closure confirmation
- **Template**: Payment summary with transaction complete message

### 5.4 Monthly Admin Report
- **To**: All Admins only
- **When**: Automated monthly (can be triggered manually)
- **Content**: Monthly statistics, category breakdown, employee summary
- **Template**: Dashboard-style report with charts and metrics

## Step 6: Troubleshooting

### 6.1 Common Issues

**🚨 "Authentication failed" error**
- ✅ Verify Gmail credentials in `.env.local`
- ✅ Ensure 2-Step Verification is enabled
- ✅ Use App Password, not regular Gmail password
- ✅ Check for typos in email/password

**🚨 "Service unavailable" error**  
- ✅ Check internet connection
- ✅ Verify Gmail service is not down
- ✅ Try with different Gmail account

**🚨 Emails not being received**
- ✅ Check spam/junk folders
- ✅ Verify recipient email addresses
- ✅ Test with your own email first
- ✅ Check Gmail sending limits

**🚨 "Less secure app" warnings**
- ✅ Use App Passwords instead of regular password
- ✅ Enable 2-Step Verification
- ✅ Don't use "Less secure app access"

### 6.2 Gmail Sending Limits
- **Daily limit**: 500 emails per day for regular Gmail
- **Per minute**: ~100 emails per minute
- **Rate limiting**: Built into the service
- **For higher volumes**: Consider Gmail Workspace or dedicated email service

### 6.3 Debug Mode
Enable detailed logging by adding to your `.env.local`:
```bash
NODE_ENV=development
DEBUG=nodemailer
```

## Step 7: Production Deployment

### 7.1 Environment Variables
Set these in your production environment (Vercel, Netlify, etc.):
```bash
GMAIL_USER=production-email@company.com
GMAIL_APP_PASSWORD=production-app-password
```

### 7.2 Production Considerations
- ✅ Use dedicated business email account
- ✅ Monitor email delivery rates
- ✅ Set up email bounce handling
- ✅ Consider Gmail Workspace for better reliability
- ✅ Implement email queue for high volume

### 7.3 Security Best Practices
- ✅ Rotate App Passwords quarterly
- ✅ Use environment variables only
- ✅ Monitor email logs for suspicious activity
- ✅ Implement rate limiting if needed

## Step 8: Monitoring & Maintenance

### 8.1 Email Delivery Monitoring
- Check console logs for email send status
- Monitor bounced emails
- Track delivery success rates
- Set up alerts for email failures

### 8.2 Regular Maintenance
- **Monthly**: Review admin email list
- **Quarterly**: Rotate App Passwords
- **Yearly**: Review email templates and content
- **As needed**: Update email styling and branding

## Step 9: Advanced Features

### 9.1 Custom Email Templates
Modify email templates in `/lib/emailService.ts`:
- Update HTML styling
- Add company logo
- Customize email content
- Add additional data fields

### 9.2 Email Scheduling
Add scheduled reports:
```typescript
// Monthly report automation
setInterval(() => {
  sendMonthlyAdminReport(adminStats, expenses);
}, 30 * 24 * 60 * 60 * 1000); // 30 days
```

### 9.3 Email Analytics
Track email metrics:
- Open rates (requires tracking pixels)
- Click-through rates
- Bounce rates
- Delivery success rates

## Support & Documentation

### 9.1 Official Documentation
- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [Gmail SMTP Settings](https://support.google.com/a/answer/176600)

### 9.2 Need Help?
- Check console logs for error messages
- Test email configuration using the provided test functions
- Verify all environment variables are set correctly
- Contact your system administrator if issues persist

---

## ✅ Quick Setup Checklist

- [ ] Enable 2-Step Verification on Gmail account
- [ ] Generate Gmail App Password
- [ ] Create `.env.local` file with credentials  
- [ ] Update admin email list in `emailService.ts`
- [ ] Test email configuration using `testEmailConfiguration()`
- [ ] Submit test expense to verify notifications
- [ ] Test status change and closure notifications
- [ ] Add `.env.local` to `.gitignore`
- [ ] Deploy with production email credentials

**🎉 Once completed, your expense management system will automatically send professional email notifications for all expense-related activities!**
            <h3>Expense Details:</h3>
            <p><strong>Employee:</strong> {{employee_name}} ({{employee_email}})</p>
            <p><strong>Department:</strong> {{employee_department}}</p>
            <p><strong>Date:</strong> {{expense_date}}</p>
            <p><strong>Purpose:</strong> {{expense_purpose}}</p>
            <p><strong>Total Amount:</strong> ₹{{expense_total}}</p>
            <p><strong>Breakdown:</strong> {{expense_details}}</p>
            <p><strong>Notes:</strong> {{expense_notes}}</p>
            <p><strong>Submitted On:</strong> {{submission_date}}</p>
        </div>
        
        {{#email_type}}
        {{#eq email_type "confirmation"}}
        <p>Your expense has been submitted successfully and is now under review. You will be notified once the status changes.</p>
        {{else}}
        <p>Please review this expense in the admin dashboard and take appropriate action.</p>
        {{/eq}}
        {{/email_type}}
        
        <p>Best regards,<br>Expense Management System</p>
    </div>
    <div class="footer">
        <p>This is an automated email. Please do not reply.</p>
    </div>
</body>
</html>
```

### Template 2: Status Change Notification
**Template ID**: `template_status_change`

**Subject**: `Expense Status Updated - {{new_status}}`

**Body**:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { color: white; padding: 20px; text-align: center; }
        .approved { background-color: #4CAF50; }
        .rejected { background-color: #f44336; }
        .under-review { background-color: #ff9800; }
        .content { padding: 20px; }
        .expense-details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .footer { background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header {{#eq new_status 'Approve'}}approved{{/eq}}{{#eq new_status 'Reject'}}rejected{{/eq}}{{#eq new_status 'Under Review'}}under-review{{/eq}}">
        <h2>Expense Status Updated</h2>
    </div>
    <div class="content">
        <p>Hello {{to_name}},</p>
        
        <p>The status of expense #{{expense_id}} has been updated.</p>
        
        <div class="expense-details">
            <h3>Expense Details:</h3>
            <p><strong>Employee:</strong> {{employee_name}} ({{employee_email}})</p>
            <p><strong>Date:</strong> {{expense_date}}</p>
            <p><strong>Purpose:</strong> {{expense_purpose}}</p>
            <p><strong>Amount:</strong> ₹{{expense_total}}</p>
            <p><strong>Previous Status:</strong> {{old_status}}</p>
            <p><strong>New Status:</strong> <span style="font-weight: bold; color: {{#eq new_status 'Approve'}}#4CAF50{{/eq}}{{#eq new_status 'Reject'}}#f44336{{/eq}}{{#eq new_status 'Under Review'}}#ff9800{{/eq}};">{{new_status}}</span></p>
            <p><strong>Updated By:</strong> {{action_by}}</p>
            <p><strong>Updated On:</strong> {{action_date}}</p>
        </div>
        
        {{#email_type}}
        {{#eq email_type "admin_notification"}}
        <p>This is a notification that the expense status has been updated by {{action_by}}.</p>
        {{else}}
        {{#eq new_status "Approve"}}
        <p>Congratulations! Your expense has been approved.</p>
        {{else}}
        {{#eq new_status "Reject"}}
        <p>Unfortunately, your expense has been rejected. Please contact your admin for more details.</p>
        {{else}}
        <p>Your expense is now under review. You will be notified of any further updates.</p>
        {{/eq}}
        {{/eq}}
        {{/email_type}}
        
        <p>Best regards,<br>Expense Management System</p>
    </div>
    <div class="footer">
        <p>This is an automated email. Please do not reply.</p>
    </div>
</body>
</html>
```

### Template 3: Monthly Report
**Template ID**: `template_monthly_report`

**Subject**: `Monthly Expense Report - {{month_year}}`

**Body**:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background-color: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #2196F3; }
        .footer { background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Monthly Expense Report</h2>
        <p>{{month_year}}</p>
    </div>
    <div class="content">
        <p>Hello {{to_name}},</p>
        
        <p>Here's the monthly expense report for {{month_year}}:</p>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">{{total_expenses}}</div>
                <div>Total Expenses</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">₹{{total_amount}}</div>
                <div>Total Amount</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{total_employees}}</div>
                <div>Employees</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{approved_count}}</div>
                <div>Approved</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{under_review_count}}</div>
                <div>Under Review</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{rejected_count}}</div>
                <div>Rejected</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{closed_count}}</div>
                <div>Closed</div>
            </div>
        </div>
        
        <h3>Category Analysis:</h3>
        <p><strong>Highest Spending Category:</strong> {{highest_category}} - ₹{{highest_amount}}</p>
        <p><strong>Lowest Spending Category:</strong> {{lowest_category}} - ₹{{lowest_amount}}</p>
        
        <p><strong>Report Generated:</strong> {{report_date}}</p>
        
        <p>The detailed Excel report is attached to this email for your review.</p>
        
        <p>Best regards,<br>Expense Management System</p>
    </div>
    <div class="footer">
        <p>This is an automated monthly report.</p>
    </div>
</body>
</html>
```

## Step 4: Get Template IDs and User ID
1. After creating templates, note down each **Template ID**
2. Go to "Account" section to find your **User ID** (Public Key)

## Step 5: Configure Environment Variables
1. Copy `.env.local.example` to `.env.local`
2. Fill in your EmailJS configuration:
```env
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
NEXT_PUBLIC_EMAILJS_USER_ID=your_user_id  
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_NEW_EXPENSE=template_new_expense
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_STATUS_CHANGE=template_status_change
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_MONTHLY_REPORT=template_monthly_report
```

## Step 6: Test Email Functionality

### Testing New Expense Notifications:
1. Submit a new expense through the ExpenseForm
2. Check that emails are sent to all admin emails
3. Check that confirmation email is sent to the employee

### Testing Status Change Notifications:
1. Change an expense status in AdminDashboard
2. Check that notification is sent to the employee
3. Check that notification is sent to all admins

### Testing Monthly Reports:
1. Click "Send Monthly Report" button in AdminDashboard
2. Check that report emails are sent to all admins
3. Monthly reports will automatically be sent on the last day of each month

## Troubleshooting

### Common Issues:
1. **Emails not sending**: Check that all environment variables are set correctly
2. **Template errors**: Verify template IDs match exactly
3. **Service connection**: Ensure email service is properly connected in EmailJS
4. **Rate limits**: Free EmailJS accounts have sending limits

### Debug Tips:
1. Check browser console for error messages
2. Verify EmailJS dashboard for failed sends
3. Test templates individually in EmailJS dashboard
4. Ensure admin email list is correctly configured

## Email Sending Limits
- EmailJS free plan: 200 emails/month
- Consider upgrading to paid plan for production use
- Monitor usage in EmailJS dashboard

## Security Notes
- Environment variables starting with `NEXT_PUBLIC_` are exposed to the client
- EmailJS User ID is meant to be public
- Never expose private keys or sensitive credentials
- Consider implementing server-side email sending for production use