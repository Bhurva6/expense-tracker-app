// Test file for EmailJS functionality
// Run this in the browser console to test email sending

// Test new expense notification
async function testNewExpenseEmail() {
  const { sendNewExpenseNotification } = await import('./lib/emailService');
  
  const testExpense = {
    id: 'test-123',
    user: {
      name: 'Test User',
      email: 'test@example.com',
      department: 'Testing'
    },
    date: '2025-01-23',
    purpose: 'Test expense for email functionality',
    hotel: 1000,
    transport: 500,
    fuel: 300,
    meals: 200,
    entertainment: 100,
    total: 2100,
    createdAt: new Date(),
    notes: 'This is a test expense to verify email notifications'
  };
  
  try {
    await sendNewExpenseNotification(testExpense);
    console.log('✅ New expense email test passed');
  } catch (error) {
    console.error('❌ New expense email test failed:', error);
  }
}

// Test status change notification
async function testStatusChangeEmail() {
  const { sendStatusChangeNotification } = await import('./lib/emailService');
  
  const testExpense = {
    id: 'test-123',
    user: {
      name: 'Test User',
      email: 'test@example.com',
      department: 'Testing'
    },
    date: '2025-01-23',
    purpose: 'Test expense for status change',
    hotel: 1000,
    transport: 500,
    fuel: 300,
    meals: 200,
    entertainment: 100,
    total: 2100,
    createdAt: new Date(),
    notes: 'Status change test'
  };
  
  try {
    await sendStatusChangeNotification(testExpense, 'Under Review', 'Approve', 'Test Admin');
    console.log('✅ Status change email test passed');
  } catch (error) {
    console.error('❌ Status change email test failed:', error);
  }
}

// Run all tests
async function runAllEmailTests() {
  console.log('🧪 Starting EmailJS tests...');
  console.log('Make sure you have configured your EmailJS settings in .env.local');
  
  await testNewExpenseEmail();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between tests
  
  await testStatusChangeEmail();
  
  console.log('🏁 Email tests completed');
}

// Export functions for manual testing
if (typeof window !== 'undefined') {
  window.emailTests = {
    testNewExpenseEmail,
    testStatusChangeEmail,
    runAllEmailTests
  };
  
  console.log('📧 Email test functions available on window.emailTests');
  console.log('Usage: window.emailTests.runAllEmailTests()');
}
