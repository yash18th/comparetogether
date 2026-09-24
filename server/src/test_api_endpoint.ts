import express from 'express';
import comparisonRoutes from './routes/comparison.js';

const app = express();
app.use(express.json());
app.use('/api/compare', comparisonRoutes);

const server = app.listen(3099, async () => {
  try {
    console.log('Sending test request to GET http://localhost:3099/api/compare?item=Masala%20Dosa ...');
    const res = await fetch('http://localhost:3099/api/compare?item=Masala%20Dosa');
    const data = await res.json();
    console.log('HTTP Status:', res.status);
    console.log('Response JSON:\n', JSON.stringify(data, null, 2));

    if (res.status === 200 && data.success && data.providers?.zomato?.status === 'not_configured' && data.providers?.swiggy?.status === 'not_configured') {
      console.log('✅ Endpoint test passed: returned 200 with status "not_configured" and zero fake data.');
    } else {
      console.error('❌ Endpoint test did not match expected structure');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Request failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
