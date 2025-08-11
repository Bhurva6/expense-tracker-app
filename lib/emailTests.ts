import { testEmailConfiguration, sendNewExpenseNotification } from '../lib/emailService';

// Test function to verify email configuration
export const runEmailTests = async () => {
  console.log('🧪 Testing email configuration...');
  
  try {
    // Test 1: Verify transporter configuration
    console.log('📧 Testing email transporter...');
    const isConfigValid = await testEmailConfiguration();
    
    if (!isConfigValid) {
      console.error('❌ Email configuration failed. Please check your Gmail credentials.');
      return false;
    }
    
    console.log('✅ Email configuration is valid');
    
    // Test 2: Send a test expense notification
    console.log('📨 Sending test expense notification...');
    
    const testExpense = {
      id: 'test-expense-123',
      user: {
        name: 'Test User',
        email: 'test@example.com', // Replace with your email for testing
        department: 'Testing Department',
      },
      date: new Date().toISOString().split('T')[0],
      purpose: 'Test expense for email notification',
      hotel: 1000,
      transport: 500,
      fuel: 300,
      meals: 800,
      entertainment: 200,
      total: 2800,
      status: 'Under Review',
      createdAt: new Date(),
      notes: 'This is a test expense to verify email notifications',
      location: {
        address: 'Test Location, Test City',
        latitude: 28.6139,
        longitude: 77.2090,
        timestamp: new Date().toLocaleString(),
      },
    };
    
    // Uncomment the line below to send a test email (make sure to update the email address above)
    // await sendNewExpenseNotification(testExpense);
    
    console.log('✅ Email test completed successfully');
    console.log('💡 To test actual email sending, uncomment the sendNewExpenseNotification line in runEmailTests function');
    
    return true;
  } catch (error) {
    console.error('❌ Email test failed:', error);
    return false;
  }
};

// Usage instructions:
// 1. Set up your .env.local file with GMAIL_USER and GMAIL_APP_PASSWORD
// 2. Import and call runEmailTests() in your component to test the configuration
// 3. Check the console for results
