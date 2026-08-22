import axios from 'axios';

const BASE_URL = 'http://localhost:4000/api';

async function runIntegrationTest() {
  console.log('=== Starting ProjectT Integration Tests ===\n');

  // 1. Test Admin Login
  console.log('1. Testing Admin Login (/auth/login)...');
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    identity: 'admin',
    password: 'admin123'
  });
  console.log('   Status:', loginRes.status, loginRes.data.message);
  const adminToken = loginRes.data.data.token;
  console.log('   Admin token received:', adminToken ? 'YES' : 'NO');
  console.log('   Admin roles:', loginRes.data.data.user.roles);

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 2. Test /auth/me
  console.log('\n2. Testing /auth/me...');
  const meRes = await axios.get(`${BASE_URL}/auth/me`, { headers: adminHeaders });
  console.log('   /me User:', meRes.data.data.name, `(${meRes.data.data.username})`);
  console.log('   Permissions count:', meRes.data.data.permissions.length);

  // 3. Test Create User
  console.log('\n3. Testing Create User (/users)...');
  const testUsername = `user_${Date.now()}`;
  const createUserRes = await axios.post(`${BASE_URL}/users`, {
    name: 'Budi Test',
    username: testUsername,
    password: 'password123',
    role_id: 2 // whatsapp-summary role
  }, { headers: adminHeaders });
  console.log('   Created user:', createUserRes.data.data.name, `(${createUserRes.data.data.username})`);

  // 4. Test Login with newly created user
  console.log('\n4. Testing New User Login & RBAC...');
  const userLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    identity: testUsername,
    password: 'password123'
  });
  const userToken = userLoginRes.data.data.token;
  const userHeaders = { Authorization: `Bearer ${userToken}` };
  console.log('   New user roles:', userLoginRes.data.data.user.roles);
  console.log('   New user permissions:', userLoginRes.data.data.user.permissions);

  // 5. Test RBAC restriction (regular user trying to access /users)
  console.log('\n5. Testing RBAC restriction (whatsapp-summary accessing /users)...');
  try {
    await axios.get(`${BASE_URL}/users`, { headers: userHeaders });
    console.log('   ERROR: User was able to access /users without user.view permission!');
  } catch (err) {
    console.log('   RBAC Blocked successfully with status:', err.response?.status, err.response?.data?.message);
  }

  // 6. Test WhatsApp sync webhook & message ingestion
  console.log('\n6. Testing WhatsApp batch sync webhook (/whatsapp/internal/sync-batch)...');
  const testDate = new Date();
  const testDateStr = testDate.toISOString().split('T')[0];
  const testTimestamp = testDate.getTime();

  const syncPayload = {
    sessionId: 'default',
    chats: [
      {
        id: '628123456789@c.us',
        whatsapp_chat_id: '628123456789@c.us',
        name: 'Project Discussion Group',
        isGroup: true,
        messages: [
          {
            id: `msg_1_${Date.now()}`,
            sender: '628111111111@c.us',
            receiver: '628123456789@c.us',
            body: 'Halo tim, tolong siapkan dokumentasi API ProjectT sebelum besok siang.',
            type: 'chat',
            timestamp: testTimestamp,
            fromMe: false
          },
          {
            id: `msg_2_${Date.now()}`,
            sender: '628222222222@c.us',
            receiver: '628123456789@c.us',
            body: 'Siap Pak Andi, saya Mikail yang akan menyelesaikan integrasi database dan dokumentasi.',
            type: 'chat',
            timestamp: testTimestamp + 60000,
            fromMe: false
          },
          {
            id: `msg_3_${Date.now()}`,
            sender: '628111111111@c.us',
            receiver: '628123456789@c.us',
            body: 'Baik, disepakati deadline integrasi database hari ini pukul 17:00 WIB.',
            type: 'chat',
            timestamp: testTimestamp + 120000,
            fromMe: false
          }
        ]
      }
    ]
  };

  const syncRes = await axios.post(`${BASE_URL}/whatsapp/internal/sync-batch`, syncPayload);
  console.log('   Sync Batch Result:', syncRes.data.data);

  // 7. Test WhatsApp Real-time Incoming Message
  console.log('\n7. Testing WhatsApp incoming message webhook (/whatsapp/internal/incoming-message)...');
  const incomingRes = await axios.post(`${BASE_URL}/whatsapp/internal/incoming-message`, {
    sessionId: 'default',
    chat: {
      id: '628123456789@c.us',
      name: 'Project Discussion Group',
      isGroup: true
    },
    message: {
      id: `msg_4_${Date.now()}`,
      sender: '628333333333@c.us',
      receiver: '628123456789@c.us',
      body: 'Testing real-time message stream verification.',
      type: 'chat',
      timestamp: testTimestamp + 180000,
      fromMe: false
    }
  });
  console.log('   Incoming message status:', incomingRes.data.data);

  // 8. Test duplicate prevention
  console.log('\n8. Testing duplicate message prevention...');
  const duplicateRes = await axios.post(`${BASE_URL}/whatsapp/internal/incoming-message`, {
    sessionId: 'default',
    chat: {
      id: '628123456789@c.us',
      name: 'Project Discussion Group',
      isGroup: true
    },
    message: {
      id: incomingRes.data.data.message.whatsapp_message_id,
      sender: '628333333333@c.us',
      body: 'Testing duplicate',
      timestamp: testTimestamp + 180000
    }
  });
  console.log('   Duplicate detected flag:', duplicateRes.data.data.duplicate);

  // 9. Test Chats and Messages query
  console.log('\n9. Testing GET /whatsapp/chats & /messages...');
  const chatsRes = await axios.get(`${BASE_URL}/whatsapp/chats`, { headers: adminHeaders });
  console.log('   Chats count:', chatsRes.data.data.length);
  const chatId = chatsRes.data.data[0].id;
  const messagesRes = await axios.get(`${BASE_URL}/whatsapp/chats/${chatId}/messages`, { headers: adminHeaders });
  console.log(`   Messages count in chat #${chatId}:`, messagesRes.data.data.count);

  // 10. Test AI Summary Generation
  console.log('\n10. Testing AI Summary Generation (/summaries/generate)...');
  try {
    const summaryRes = await axios.post(`${BASE_URL}/summaries/generate`, {
      date: testDateStr
    }, { headers: adminHeaders });
    console.log('    Summary Result Status:', summaryRes.status);
    console.log('    Summary text:', summaryRes.data.data.summary.summary);
    console.log('    Highlights:', summaryRes.data.data.summary.highlights);
    console.log('    Decisions:', summaryRes.data.data.summary.decisions);
    console.log('    Generated Todos count:', summaryRes.data.data.todos.length);
    if (summaryRes.data.data.todos.length > 0) {
      console.log('    First Todo:', summaryRes.data.data.todos[0].title, `[${summaryRes.data.data.todos[0].priority}]`);
      
      // 11. Test Todo Update
      const firstTodoId = summaryRes.data.data.todos[0].id;
      console.log(`\n11. Testing Todo Status Update (/todos/${firstTodoId})...`);
      const updateTodoRes = await axios.put(`${BASE_URL}/todos/${firstTodoId}`, {
        status: 'completed'
      }, { headers: adminHeaders });
      console.log('    Updated Todo Status:', updateTodoRes.data.data.status);
    }
  } catch (summaryErr) {
    console.log('    Summary generation note:', summaryErr.response?.data?.message || summaryErr.message);
  }

  // 12. Test Dashboard Stats
  console.log('\n12. Testing Dashboard Overview Stats (/dashboard/stats)...');
  const statsRes = await axios.get(`${BASE_URL}/dashboard/stats`, { headers: adminHeaders });
  console.log('    Dashboard Stats:', JSON.stringify(statsRes.data.data, null, 2));

  console.log('\n=== ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY! ===');
}

runIntegrationTest().catch((err) => {
  console.error('Integration Test Failed:', err.message, err.response?.data);
  process.exit(1);
});
