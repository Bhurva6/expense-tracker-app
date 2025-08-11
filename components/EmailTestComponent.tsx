import React, { useState } from 'react';
import { testEmailConfiguration, sendTestEmail as sendTestEmailAPI } from '../lib/emailService';
import { Button } from './ui/shadcn';

const EmailTestComponent: React.FC = () => {
  const [isTestingConfig, setIsTestingConfig] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testEmail, setTestEmail] = useState('');

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testEmailConfig = async () => {
    setIsTestingConfig(true);
    addTestResult('🧪 Testing email configuration...');
    
    try {
      const isValid = await testEmailConfiguration();
      if (isValid) {
        addTestResult('✅ Email configuration is valid - Gmail connection successful!');
      } else {
        addTestResult('❌ Email configuration failed - Check your Gmail credentials');
      }
    } catch (error) {
      addTestResult(`❌ Email test error: ${error}`);
    } finally {
      setIsTestingConfig(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      addTestResult('❌ Please enter a test email address');
      return;
    }

    setIsSendingTest(true);
    addTestResult(`📧 Sending test expense notification to ${testEmail}...`);
    
    try {
      const testExpense = {
        id: `test-${Date.now()}`,
        user: {
          name: 'Test User',
          email: testEmail,
          department: 'Testing Department',
        },
        date: new Date().toISOString().split('T')[0],
        purpose: 'Test expense for email notification verification',
        hotel: 1500,
        transport: 800,
        fuel: 500,
        meals: 1200,
        entertainment: 300,
        total: 4300,
        status: 'Under Review',
        createdAt: new Date(),
        notes: 'This is a test expense to verify email notifications are working correctly.',
        location: {
          address: 'Test Location, Mumbai, Maharashtra, India',
          latitude: 19.0760,
          longitude: 72.8777,
          timestamp: new Date().toLocaleString(),
        },
      };

      await sendTestEmailAPI(testEmail);
      addTestResult('✅ Test email sent successfully! Check your inbox and spam folder.');
    } catch (error) {
      addTestResult(`❌ Failed to send test email: ${error}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 border rounded-lg" style={{ background: 'var(--surface)', borderColor: 'var(--muted)' }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary)' }}>
        📧 Email System Testing
      </h3>
      
      <div className="space-y-4">
        {/* Email Configuration Test */}
        <div className="flex items-center gap-3">
          <Button
            onClick={testEmailConfig}
            disabled={isTestingConfig}
            style={{ background: 'var(--primary)', color: 'var(--surface)' }}
          >
            {isTestingConfig ? '🔄 Testing...' : '🧪 Test Email Config'}
          </Button>
          <span className="text-sm text-gray-500">
            Verify Gmail connection and credentials
          </span>
        </div>

        {/* Test Email Send */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <input
              type="email"
              placeholder="Enter test email address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="px-3 py-2 border rounded flex-1"
              style={{ 
                background: 'var(--surface)', 
                color: 'var(--foreground)', 
                borderColor: 'var(--muted)' 
              }}
            />
            <Button
              onClick={sendTestEmail}
              disabled={isSendingTest || !testEmail}
              style={{ background: 'var(--accent)', color: 'var(--surface)' }}
            >
              {isSendingTest ? '📤 Sending...' : '📧 Send Test Email'}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Send a test expense notification to verify the complete email flow
          </p>
        </div>

        {/* Clear Results */}
        {testResults.length > 0 && (
          <Button
            onClick={clearResults}
            style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
            className="text-sm"
          >
            🗑️ Clear Results
          </Button>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
              Test Results:
            </h4>
            <div 
              className="max-h-48 overflow-y-auto p-3 rounded text-sm font-mono"
              style={{ background: 'var(--accent-light)', color: 'var(--foreground)' }}
            >
              {testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Setup Instructions */}
        <div className="mt-4 p-3 rounded" style={{ background: 'var(--accent-light)' }}>
          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
            📋 Setup Instructions:
          </h4>
          <ol className="text-xs space-y-1" style={{ color: 'var(--foreground)' }}>
            <li>1. Set up Gmail App Password (see EMAIL_SETUP.md)</li>
            <li>2. Create .env.local with GMAIL_USER and GMAIL_APP_PASSWORD</li>
            <li>3. Test email configuration first</li>
            <li>4. Send test email to verify notifications work</li>
            <li>5. Check spam folder if email not received</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default EmailTestComponent;
