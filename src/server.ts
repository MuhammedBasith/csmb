import app from './app';
import { config } from './config/config';
import { connectDB } from './config/database';

// Connect to MongoDB
connectDB();

// Function to format memory sizes
const formatMemoryUsage = (bytes: number): string => {
  return `${Math.round(bytes / 1024 / 1024 * 100) / 100} MB`;
};

// Function to get memory usage statistics
const getMemoryUsage = (): void => {
  const { heapUsed, heapTotal, rss, external, arrayBuffers } = process.memoryUsage();
  
  console.log('🔍 Detailed Memory Usage --------');
  console.log('→ Heap Used:', formatMemoryUsage(heapUsed), `(${Math.round(heapUsed/heapTotal * 100)}% of total heap)`);
  console.log('→ Heap Total:', formatMemoryUsage(heapTotal));
  console.log('→ RSS (Resident Set Size):', formatMemoryUsage(rss));
  console.log('→ External:', formatMemoryUsage(external));
  console.log('→ Array Buffers:', formatMemoryUsage(arrayBuffers));
  
  // Force garbage collection if heap usage is too high (over 800MB)
  if (heapUsed > 512 * 1024 * 1024) {
    console.log('⚠️ High memory usage detected, suggesting manual garbage collection');
    if (global.gc) {
      console.log('🧹 Running garbage collection...');
      global.gc();
    } else {
      console.log('❌ Garbage collection not available. Start node with --expose-gc flag to enable manual GC');
    }
  }
  
  console.log('--------------------');
};

const PORT = parseInt(process.env.PORT || config.port.toString(), 10);
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${config.env} mode on port ${PORT}`);
  
  // // Log initial memory usage
  // getMemoryUsage();
  
  // // Log memory usage every 5 minutes
  // setInterval(getMemoryUsage, 5 * 60 * 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});