This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Expense Management System

A comprehensive expense management system with automated email notifications built with Next.js, Firebase, and EmailJS.

### Features

- **Employee Expense Submission**: Submit expenses with receipt uploads and OCR text extraction
- **Admin Dashboard**: Review, approve/reject expenses with comprehensive statistics
- **Automated Email Notifications**:
  - New expense notifications to admins and employees
  - Status change notifications 
  - Monthly expense reports to admins
- **Excel Export**: Download detailed expense reports
- **Real-time Status Tracking**: Track expense status changes with timestamps

### Email Notification System

This system includes automated email notifications powered by EmailJS:

1. **New Expense Notifications**: Sent to all admins and the submitting employee when a new expense is created
2. **Status Change Notifications**: Sent to the employee and admins when expense status changes (Approve/Reject/Under Review)
3. **Monthly Reports**: Automatically sent to all admins on the last day of each month with comprehensive expense statistics and Excel attachments

#### Email Setup

To enable email notifications, you need to configure EmailJS:

1. Follow the detailed setup guide in `EMAIL_SETUP.md`
2. Set up your EmailJS account and email templates
3. Configure environment variables in `.env.local`

See `EMAIL_SETUP.md` for complete setup instructions.

## Getting Started

First, install dependencies:

```bash
pnpm install
```

Then, set up your environment variables by copying `.env.local.example` to `.env.local` and filling in your configuration.

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
