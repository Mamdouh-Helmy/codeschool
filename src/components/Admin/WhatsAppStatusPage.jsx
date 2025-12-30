"use client";

import { useState, useEffect } from 'react';
import { 
  Smartphone, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Send,
  Clock,
  MessageCircle,
  Mail,
  User,
  Calendar,
  Phone,
  Globe
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function WhatsAppStatusPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentMessages, setRecentMessages] = useState([]);
  const [testForm, setTestForm] = useState({
    phoneNumber: '',
    studentName: '',
    language: 'ar',
    customMessage: ''
  });
  const [sendingTest, setSendingTest] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/whatsapp/send-welcome');
      const data = await res.json();
      
      if (data.success) {
        setStatus(data.data);
        
        // تحميل الرسائل الحديثة
        const messagesRes = await fetch('/api/students?whatsappStatus=sent&limit=10');
        const messagesData = await messagesRes.json();
        
        if (messagesData.success) {
          setRecentMessages(messagesData.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading status:', error);
      toast.error('Failed to load WhatsApp status');
    } finally {
      setLoading(false);
    }
  };

  const sendTestMessage = async (type) => {
    try {
      setSendingTest(true);
      
      let body = {};
      let endpoint = '/api/whatsapp/send-welcome';
      
      if (type === 'welcome' && testForm.phoneNumber && testForm.studentName) {
        body = {
          phoneNumber: testForm.phoneNumber,
          studentName: testForm.studentName,
          language: testForm.language
        };
      } else if (type === 'custom' && testForm.phoneNumber && testForm.customMessage) {
        body = {
          phoneNumber: testForm.phoneNumber,
          message: testForm.customMessage
        };
      } else {
        toast.error('Please fill in all required fields');
        setSendingTest(false);
        return;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (data.success) {
        toast.success(`${type === 'welcome' ? 'Welcome' : 'Custom'} message sent successfully!`);
        setTestForm({
          phoneNumber: '',
          studentName: '',
          language: 'ar',
          customMessage: ''
        });
        loadStatus();
      } else {
        toast.error(`Failed: ${data.message}`);
      }
    } catch (error) {
      toast.error('Error sending test message');
      console.error('Error:', error);
    } finally {
      setSendingTest(false);
    }
  };

  const resendMessage = async (studentId) => {
    try {
      toast.loading('Resending message...');
      
      // جلب بيانات الطالب
      const studentRes = await fetch(`/api/students/${studentId}`);
      const studentData = await studentRes.json();
      
      if (!studentData.success) {
        toast.error('Student not found');
        return;
      }
      
      const student = studentData.data;
      
      // إعادة إرسال الرسالة
      const res = await fetch('/api/whatsapp/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: student.personalInfo.whatsappNumber,
          studentName: student.personalInfo.fullName,
          language: student.communicationPreferences?.preferredLanguage || 'ar'
        })
      });

      const data = await res.json();
      
      if (data.success) {
        toast.success('Message resent successfully!');
        loadStatus();
      } else {
        toast.error(`Failed: ${data.message}`);
      }
    } catch (error) {
      toast.error('Error resending message');
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading WhatsApp status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              WhatsApp Automation Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor and manage WhatsApp message sending automation
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={loadStatus}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-all"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-darkmode p-6 rounded-xl border border-gray-200 dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Service Status</p>
              <p className={`text-2xl font-bold mt-1 ${
                status?.enabled ? 'text-green-600' : 'text-red-600'
              }`}>
                {status?.enabled ? 'ACTIVE' : 'INACTIVE'}
              </p>
            </div>
            <div className={`p-3 rounded-full ${status?.enabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {status?.enabled ? (
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {status?.enabled ? 'Service is running properly' : 'Service requires configuration'}
          </p>
        </div>

        <div className="bg-white dark:bg-darkmode p-6 rounded-xl border border-gray-200 dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Operation Mode</p>
              <p className={`text-2xl font-bold mt-1 ${
                status?.mode === 'PRODUCTION' ? 'text-blue-600' : 'text-yellow-600'
              }`}>
                {status?.mode || 'SIMULATION'}
              </p>
            </div>
            <div className={`p-3 rounded-full ${status?.mode === 'PRODUCTION' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
              <Smartphone className={`w-6 h-6 ${status?.mode === 'PRODUCTION' ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {status?.mode === 'PRODUCTION' ? 'Real messages being sent' : 'Simulation mode (no real messages)'}
          </p>
        </div>

        <div className="bg-white dark:bg-darkmode p-6 rounded-xl border border-gray-200 dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Instance</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1 truncate">
                {status?.instanceId || 'Not configured'}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Last checked: {new Date(status?.lastChecked).toLocaleTimeString()}
          </p>
        </div>

        <div className="bg-white dark:bg-darkmode p-6 rounded-xl border border-gray-200 dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Messages Sent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {recentMessages.length}
              </p>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
              <Send className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total welcome messages sent to students
          </p>
        </div>
      </div>

      {/* Test Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Test Welcome Message */}
        <div className="bg-white dark:bg-darkmode rounded-xl border border-gray-200 dark:border-dark_border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Test Welcome Message
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Send a test welcome message to any phone number
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={testForm.phoneNumber}
                  onChange={(e) => setTestForm({...testForm, phoneNumber: e.target.value})}
                  placeholder="01234567890"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark_input dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Student Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={testForm.studentName}
                  onChange={(e) => setTestForm({...testForm, studentName: e.target.value})}
                  placeholder="Enter student name"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark_input dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={testForm.language}
                  onChange={(e) => setTestForm({...testForm, language: e.target.value})}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark_input dark:text-white"
                >
                  <option value="ar">Arabic</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => sendTestMessage('welcome')}
              disabled={sendingTest || !testForm.phoneNumber || !testForm.studentName}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sendingTest ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Test Welcome Message
                </>
              )}
            </button>
          </div>
        </div>

        {/* Custom Message */}
        <div className="bg-white dark:bg-darkmode rounded-xl border border-gray-200 dark:border-dark_border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Custom Message
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Send any custom message to test the service
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={testForm.phoneNumber}
                onChange={(e) => setTestForm({...testForm, phoneNumber: e.target.value})}
                placeholder="01234567890"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-dark_input dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Custom Message
              </label>
              <textarea
                value={testForm.customMessage}
                onChange={(e) => setTestForm({...testForm, customMessage: e.target.value})}
                placeholder="Type your message here..."
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-dark_input dark:text-white resize-none"
              />
            </div>

            <button
              onClick={() => sendTestMessage('custom')}
              disabled={sendingTest || !testForm.phoneNumber || !testForm.customMessage}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sendingTest ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Custom Message
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Messages Table */}
      <div className="bg-white dark:bg-darkmode rounded-xl border border-gray-200 dark:border-dark_border overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-dark_border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent WhatsApp Messages
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Last 10 messages sent to students
            </p>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm font-medium">
            {recentMessages.length} Messages
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Student
                </th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Sent At
                </th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentMessages.length > 0 ? (
                recentMessages.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.personalInfo?.fullName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {student.enrollmentNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {student.personalInfo?.whatsappNumber}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        student.whatsappStatus === 'sent' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : student.whatsappStatus === 'failed'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {student.whatsappStatus?.toUpperCase() || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {student.whatsappSentAt ? new Date(student.whatsappSentAt).toLocaleString() : 'Not sent'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => resendMessage(student.id)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Resend
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 px-6 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium">No messages sent yet</p>
                      <p className="text-sm mt-1">WhatsApp messages will appear here once sent</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Important Information
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>• WhatsApp messages are sent automatically when creating new students</p>
              <p>• Messages include both Arabic and English content</p>
              <p>• Phone numbers are automatically formatted with country code (+20 for Egypt)</p>
              <p>• In simulation mode, messages are logged but not actually sent</p>
              <p>• Configure <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">WHATSAPP_API_TOKEN</code> and <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">WHATSAPP_INSTANCE_ID</code> for production</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}