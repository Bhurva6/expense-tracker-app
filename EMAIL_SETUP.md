# EmailJS Setup Guide for Expense Management System

## Overview
This guide will help you set up EmailJS to send automated emails for:
1. New expense notifications
2. Expense status change notifications  
3. Monthly expense reports

## Step 1: Create EmailJS Account
1. Go to [EmailJS](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

## Step 2: Connect Email Service
1. In EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the setup instructions to connect your email account
5. Note down the **Service ID**

## Step 3: Create Email Templates

### Template 1: New Expense Notification
**Template ID**: `template_new_expense`

**Subject**: `New Expense Submitted - {{employee_name}}`

**Body**:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .expense-details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .footer { background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>New Expense Submitted</h2>
    </div>
    <div class="content">
        <p>Hello {{to_name}},</p>
        
        <p>A new expense has been submitted by <strong>{{employee_name}}</strong>.</p>
        
        <div class="expense-details">
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