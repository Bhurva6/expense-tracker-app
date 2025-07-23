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

// Test monthly report
async function testMonthlyReport() {
  const { triggerMonthlyReport } = await import('./lib/emailService');
  
  const testExpenses = [
    {
      id: 'test-1',
      user: { name: 'User 1', email: 'user1@test.com', department: 'Sales' },
      date: '2025-01-15',
      purpose: 'Business travel',
      hotel: 2000,
      transport: 800,
      fuel: 500,
      meals: 300,
      entertainment: 200,
      total: 3800,
      status: 'Approve',
      createdAt: new Date(),
    },
    {
      id: 'test-2',
      user: { name: 'User 2', email: 'user2@test.com', department: 'Marketing' },
      date: '2025-01-20',
      purpose: 'Client meeting',
      hotel: 1500,
      transport: 600,
      fuel: 300,
      meals: 250,
      entertainment: 150,
      total: 2800,
      status: 'Under Review',
      createdAt: new Date(),
    }
  ];
  
  const testStats = {
    totalMonthSpend: 6600,
    totalEmployees: 2,
    maxCategory: ['Business travel', 3800],
    minCategory: ['Client meeting', 2800],
    totalApproved: 1,
    totalUnderReview: 1,
    totalRejected: 0,
    totalClosed: 0,
    categorySpend: {
      'Business travel': 3800,
      'Client meeting': 2800
    }
  };
  
  try {
    await triggerMonthlyReport(testExpenses, testStats);
    console.log('✅ Monthly report email test passed');
  } catch (error) {
    console.error('❌ Monthly report email test failed:', error);
  }
}

// Run all tests
async function runAllEmailTests() {
  console.log('🧪 Starting EmailJS tests...');
  console.log('Make sure you have configured your EmailJS settings in .env.local');
  
  await testNewExpenseEmail();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between tests
  
  await testStatusChangeEmail();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testMonthlyReport();
  
  console.log('🏁 Email tests completed');
}

// Export functions for manual testing
if (typeof window !== 'undefined') {
  window.emailTests = {
    testNewExpenseEmail,
    testStatusChangeEmail,
    testMonthlyReport,
    runAllEmailTests
  };
  
  console.log('📧 Email test functions available on window.emailTests');
  console.log('Usage: window.emailTests.runAllEmailTests()');
}
