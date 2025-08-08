const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ 
    message: 'TraderAI Test Server', 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'working',
    message: 'Basic Express server is running'
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/api/test`);
});
