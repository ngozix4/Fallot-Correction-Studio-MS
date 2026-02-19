import * as SQLite from 'expo-sqlite';
import { File, Directory, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

class DatabaseService {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async init() {
    try {
      console.log('🟡 [DEBUG] Initializing database...');
      
      // Close existing connection if any
      if (this.db) {
        try {
          await this.db.closeAsync();
        } catch (error) {
          console.log('🟡 [DEBUG] No existing connection to close');
        }
      }
      
      this.db = await SQLite.openDatabaseAsync('fallo_tailor.db');
      console.log('✅ [DEBUG] Database opened');
      
      await this.createTables();
      await this.checkAndFixSchema();
      
      this.initialized = true;
      console.log('✅ Database initialized');
      
    } catch (error) {
      console.error('❌ [DEBUG] Error initializing database:', error.message);
      this.initialized = false;
      throw error;
    }
  }

  // Add a helper method to ensure database is ready
  async ensureInitialized() {
    if (!this.initialized || !this.db) {
      console.log('🟡 [DEBUG] Database not initialized, initializing now...');
      await this.init();
    }
  }

  async createTables() {
    try {
      console.log('🟡 [DEBUG] Creating/checking tables...');
      
      await this.db.execAsync(`
        -- Users Table (UPDATED WITH PROFILE PICTURE)
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          password TEXT NOT NULL,
          businessName TEXT,
          phone TEXT,
          address TEXT,
          profilePicture TEXT,  -- NEW: Profile picture URI
          startingCapital REAL DEFAULT 0,
          currentBalance REAL DEFAULT 0,
          accountType TEXT DEFAULT 'Premium',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Jobs Table (UPDATED WITH MISSING COLUMNS)
        CREATE TABLE IF NOT EXISTS jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          customerName TEXT NOT NULL,
          customerPhone TEXT,
          dueDate DATETIME,
          status TEXT DEFAULT 'pending',
          progress INTEGER DEFAULT 0,
          price REAL,
          depositAmount REAL DEFAULT 0,
          depositReceived BOOLEAN DEFAULT 0,
          finalPaymentAmount REAL DEFAULT 0,
          finalPaymentReceived BOOLEAN DEFAULT 0,
          invoiceId INTEGER,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          userId INTEGER,
          FOREIGN KEY (userId) REFERENCES users(id)
        );

        -- Invoices Table (UPDATED FOR NEW FORMAT)
        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoiceNumber TEXT UNIQUE NOT NULL,
          customerName TEXT NOT NULL,
          customerEmail TEXT,
          customerPhone TEXT,
          customerAddress TEXT,
          jobDescription TEXT NOT NULL,
          items TEXT NOT NULL DEFAULT '[]',
          subtotal REAL NOT NULL,
          tax REAL DEFAULT 0,
          totalAmount REAL NOT NULL,
          depositAmount REAL NOT NULL,
          balanceDue REAL NOT NULL,
          paymentStatus TEXT DEFAULT 'pending',
          invoiceDate DATETIME DEFAULT CURRENT_TIMESTAMP,
          dueDate DATETIME,
          notes TEXT,
          bankDetails TEXT,
          terms TEXT,
          jobId INTEGER,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          userId INTEGER,
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (jobId) REFERENCES jobs(id)
        );

        -- Expenses Table
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          description TEXT NOT NULL,
          paymentMethod TEXT NOT NULL,
          date DATETIME NOT NULL,
          recurring BOOLEAN DEFAULT 0,
          receiptNumber TEXT,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          userId INTEGER,
          FOREIGN KEY (userId) REFERENCES users(id)
        );

        -- Gallery Table
        CREATE TABLE IF NOT EXISTS gallery (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL,
          clientName TEXT,
          dateCompleted DATETIME,
          featured BOOLEAN DEFAULT 0,
          tags TEXT DEFAULT '[]',
          views INTEGER DEFAULT 0,
          likes INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          userId INTEGER,
          FOREIGN KEY (userId) REFERENCES users(id)
        );

        -- Gallery Images Table
        CREATE TABLE IF NOT EXISTS gallery_images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          galleryId INTEGER NOT NULL,
          uri TEXT NOT NULL,
          filename TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (galleryId) REFERENCES gallery(id) ON DELETE CASCADE
        );

        -- Goals Table
        CREATE TABLE IF NOT EXISTS goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          goalName TEXT NOT NULL,
          targetAmount REAL NOT NULL,
          currentAmount REAL DEFAULT 0,
          periodType TEXT NOT NULL,
          startDate DATETIME NOT NULL,
          endDate DATETIME NOT NULL,
          progress REAL DEFAULT 0,
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          userId INTEGER,
          FOREIGN KEY (userId) REFERENCES users(id)
        );
      `);
      
      console.log('✅ [DEBUG] Tables created/checked successfully');
      
    } catch (error) {
      console.error('❌ [DEBUG] Error in createTables:', error.message);
      console.error('❌ [DEBUG] Error stack:', error.stack);
      throw error;
    }
  }

  async checkAndFixSchema() {
    try {
      console.log('🟡 [DEBUG] Checking and fixing schema...');
      
      // Check if users table has profilePicture column
      const usersTableInfo = await this.db.getAllAsync('PRAGMA table_info(users)');
      const userColumnNames = usersTableInfo.map(col => col.name);
      
      // Add profilePicture column if missing
      if (!userColumnNames.includes('profilePicture')) {
        console.log('🟡 [DEBUG] Adding profilePicture column to users table');
        await this.db.execAsync('ALTER TABLE users ADD COLUMN profilePicture TEXT');
      }
      
      // Check and fix other tables as before
      const tableInfo = await this.db.getAllAsync('PRAGMA table_info(jobs)');
      
      if (tableInfo.length === 0) {
        console.log('🟡 [DEBUG] Jobs table does not exist, creating...');
        return;
      }
      
      const columnNames = tableInfo.map(col => col.name);
      console.log('🟡 [DEBUG] Existing columns in jobs:', columnNames);
      
      // Add missing columns
      if (!columnNames.includes('depositAmount')) {
        console.log('🟡 [DEBUG] Adding depositAmount column to jobs table');
        await this.db.execAsync('ALTER TABLE jobs ADD COLUMN depositAmount REAL DEFAULT 0');
      }
      
      if (!columnNames.includes('depositReceived')) {
        console.log('🟡 [DEBUG] Adding depositReceived column to jobs table');
        await this.db.execAsync('ALTER TABLE jobs ADD COLUMN depositReceived BOOLEAN DEFAULT 0');
      }
      
      if (!columnNames.includes('finalPaymentAmount')) {
        console.log('🟡 [DEBUG] Adding finalPaymentAmount column to jobs table');
        await this.db.execAsync('ALTER TABLE jobs ADD COLUMN finalPaymentAmount REAL DEFAULT 0');
      }
      
      if (!columnNames.includes('finalPaymentReceived')) {
        console.log('🟡 [DEBUG] Adding finalPaymentReceived column to jobs table');
        await this.db.execAsync('ALTER TABLE jobs ADD COLUMN finalPaymentReceived BOOLEAN DEFAULT 0');
      }
      if (!columnNames.includes('invoiceId')) {
        console.log('🟡 [DEBUG] Adding invoiceId column to jobs table');
        await this.db.execAsync('ALTER TABLE jobs ADD COLUMN invoiceId INTEGER DEFAULT NULL');
      }

      console.log('🟡 [DEBUG] Checking invoices table...');
      const invoicesTableInfo = await this.db.getAllAsync('PRAGMA table_info(invoices)');
      const invoiceColumnNames = invoicesTableInfo.map(col => col.name);
      console.log('🟡 [DEBUG] Existing columns in invoices:', invoiceColumnNames);
      
      // Add jobId column to invoices table if missing
      if (!invoiceColumnNames.includes('jobId')) {
        console.log('🟡 [DEBUG] Adding jobId column to invoices table');
        await this.db.execAsync('ALTER TABLE invoices ADD COLUMN jobId INTEGER DEFAULT NULL');
      }
      
      console.log('✅ [DEBUG] Schema check/fix completed');
    } catch (error) {
      console.error('❌ [DEBUG] Error in checkAndFixSchema:', error);
      // If migration fails, drop and recreate tables
      console.log('🟡 [DEBUG] Migration failed, recreating tables...');
      await this.db.execAsync(`
        DROP TABLE IF EXISTS gallery_images;
        DROP TABLE IF EXISTS gallery;
        DROP TABLE IF EXISTS goals;
        DROP TABLE IF EXISTS expenses;
        DROP TABLE IF EXISTS invoices;
        DROP TABLE IF EXISTS jobs;
        DROP TABLE IF EXISTS users;
      `);
      await this.createTables();
    }
  }

  // ============ USER OPERATIONS ============
  async createUser(userData) {
    try {
      const result = await this.db.runAsync(
        `INSERT INTO users (email, name, password, businessName, phone, address, startingCapital, currentBalance, profilePicture)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.email.toLowerCase(),
          userData.name,
          userData.password,
          userData.businessName,
          userData.phone,
          userData.address,
          userData.startingCapital || 0,
          userData.currentBalance || 0,
          userData.profilePicture || null  // NEW: Handle profile picture
        ]
      );
      
      const user = await this.getUserById(result.lastInsertRowId);
      await AsyncStorage.setItem('currentUserId', result.lastInsertRowId.toString());
      return { success: true, user };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const users = await this.db.getAllAsync(
        'SELECT * FROM users WHERE email = ?',
        [email.toLowerCase()]
      );
      return users[0] || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async getUserById(id) {
    try {
      const users = await this.db.getAllAsync(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      return users[0] || null;
    } catch (error) {
      console.error('Error getting user by id:', error);
      return null;
    }
  }

  async getCurrentUser() {
    const userId = await AsyncStorage.getItem('currentUserId');
    if (!userId) return null;
    return await this.getUserById(userId);
  }

  async updateUser(userId, updates) {
    try {
      const fields = [];
      const values = [];
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });
      
      if (fields.length === 0) return null;
      
      values.push(userId);
      await this.db.runAsync(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      
      return await this.getUserById(userId);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // ============ INVOICE OPERATIONS (UPDATED) ============
 async createInvoice(invoiceData, userId) {
  console.log('🟡 [DEBUG] createInvoice called');
  console.log('🟡 [DEBUG] invoiceData:', JSON.stringify(invoiceData, null, 2));
  console.log('🟡 [DEBUG] userId:', userId);
  
  try {
    // Check if database is initialized
    if (!this.db) {
      console.error('❌ [DEBUG] Database not initialized!');
      await this.init();
    }
    
    console.log('🟡 [DEBUG] Starting transaction...');
    await this.db.execAsync('BEGIN TRANSACTION');
    console.log('✅ [DEBUG] Transaction started');
    
    // Generate invoice number like INV0002
    console.log('🟡 [DEBUG] Getting invoice count...');
    const invoiceCount = await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM invoices WHERE userId = ?',
      [userId]
    );
    const invoiceNumber = `INV${(invoiceCount.count + 1).toString().padStart(4, '0')}`;
    console.log('🟡 [DEBUG] Generated invoice number:', invoiceNumber);
    
    // Store items as JSON string
    const itemsJSON = JSON.stringify(invoiceData.items || []);
    console.log('🟡 [DEBUG] itemsJSON:', itemsJSON);
    
    // Insert invoice
    console.log('🟡 [DEBUG] Attempting to insert invoice...');
    
    const invoiceResult = await this.db.runAsync(
      `INSERT INTO invoices (
        invoiceNumber, customerName, customerEmail, customerPhone,
        customerAddress, jobDescription, items, subtotal, tax, totalAmount,
        depositAmount, balanceDue, paymentStatus, invoiceDate, dueDate, 
        notes, bankDetails, terms, userId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber,
        invoiceData.customerName,
        invoiceData.customerEmail || '',
        invoiceData.customerPhone || '',
        invoiceData.customerAddress || '',
        invoiceData.jobDescription,
        itemsJSON,
        invoiceData.subtotal,
        invoiceData.tax || 0,
        invoiceData.totalAmount,
        invoiceData.depositAmount,
        invoiceData.balanceDue,
        'pending',
        invoiceData.invoiceDate || new Date().toISOString(),
        invoiceData.dueDate.toISOString(),
        invoiceData.notes || '',
        invoiceData.bankDetails || 'FNB:- ) Banking Details Account Number 62924305312. Branch 250655.',
        invoiceData.terms || '50% of deposit upfront, then the balance will be paid on the day of collection',
        userId
      ]
    );
    
    console.log('✅ [DEBUG] Invoice inserted successfully. ID:', invoiceResult.lastInsertRowId);
    
    const invoiceId = invoiceResult.lastInsertRowId;
    
    // Create corresponding job
    console.log('🟡 [DEBUG] Creating corresponding job...');
    const jobData = {
      title: `Job for ${invoiceData.customerName}`,
      description: invoiceData.jobDescription,
      customerName: invoiceData.customerName,
      customerPhone: invoiceData.customerPhone || '',
      dueDate: invoiceData.dueDate,
      status: 'pending',
      progress: 0,
      price: invoiceData.totalAmount,
      notes: `Created from invoice: ${invoiceNumber}`,
      depositAmount: invoiceData.depositAmount,
      depositReceived: false,
      finalPaymentAmount: invoiceData.balanceDue,
      finalPaymentReceived: false
    };

    const jobResult = await this.db.runAsync(
      `INSERT INTO jobs (
        title, description, customerName, customerPhone, dueDate, 
        status, progress, price, notes, depositAmount, depositReceived,
        finalPaymentAmount, finalPaymentReceived, invoiceId, userId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        jobData.title,
        jobData.description,
        jobData.customerName,
        jobData.customerPhone,
        jobData.dueDate.toISOString(),
        jobData.status,
        jobData.progress,
        jobData.price,
        jobData.notes,
        jobData.depositAmount,
        0, // depositReceived
        jobData.finalPaymentAmount,
        0, // finalPaymentReceived
        invoiceId,
        userId
      ]
    );

    const jobId = jobResult.lastInsertRowId;
    console.log('✅ [DEBUG] Job created. ID:', jobId);

    // Link invoice to job
    await this.db.runAsync(
      'UPDATE invoices SET jobId = ? WHERE id = ?',
      [jobId, invoiceId]
    );
    
    // Update user balance
    console.log('🟡 [DEBUG] Updating user balance...');
    await this.db.runAsync(
      'UPDATE users SET currentBalance = currentBalance + ? WHERE id = ?',
      [invoiceData.totalAmount, userId]
    );
    
    console.log('🟡 [DEBUG] Committing transaction...');
    await this.db.execAsync('COMMIT');
    console.log('✅ [DEBUG] Transaction committed');
    
    const createdInvoice = await this.getInvoiceById(invoiceId);
    console.log('✅ [DEBUG] Returning created invoice');
    return createdInvoice;
  } catch (error) {
    console.error('❌ [DEBUG] Error in createInvoice:', error.message);
    console.error('❌ [DEBUG] Error code:', error.code);
    console.error('❌ [DEBUG] Error stack:', error.stack);
    
    try {
      console.log('🟡 [DEBUG] Attempting rollback...');
      if (this.db) {
        await this.db.execAsync('ROLLBACK');
        console.log('✅ [DEBUG] Rollback successful');
      }
    } catch (rollbackError) {
      console.error('❌ [DEBUG] Failed to rollback:', rollbackError.message);
    }
    
    throw error;
  }
}

  async getInvoices(userId) {
    try {
      const invoices = await this.db.getAllAsync(
        `SELECT * FROM invoices WHERE userId = ? ORDER BY createdAt DESC`,
        [userId]
      );
      
      // Parse items JSON for each invoice
      for (const invoice of invoices) {
        invoice.items = JSON.parse(invoice.items || '[]');
      }
      
      return invoices;
    } catch (error) {
      console.error('Error getting invoices:', error);
      return [];
    }
  }

  async getInvoiceById(id) {
    try {
      const invoices = await this.db.getAllAsync(
        'SELECT * FROM invoices WHERE id = ?',
        [id]
      );
      
      if (invoices.length === 0) return null;
      
      const invoice = invoices[0];
      invoice.items = JSON.parse(invoice.items || '[]');
      return invoice;
    } catch (error) {
      console.error('Error getting invoice:', error);
      return null;
    }
  }

  async getInvoiceStats(userId) {
    try {
      const stats = await this.db.getFirstAsync(`
        SELECT 
          COUNT(*) as totalInvoices,
          SUM(CASE WHEN paymentStatus = 'pending' THEN 1 ELSE 0 END) as pendingInvoices,
          SUM(CASE WHEN paymentStatus = 'completed' THEN 1 ELSE 0 END) as paidInvoices,
          SUM(totalAmount) as totalRevenue
        FROM invoices 
        WHERE userId = ?
      `, [userId]);
      
      return {
        totalInvoices: stats?.totalInvoices || 0,
        pendingInvoices: stats?.pendingInvoices || 0,
        paidInvoices: stats?.paidInvoices || 0,
        totalRevenue: stats?.totalRevenue || 0
      };
    } catch (error) {
      console.error('Error getting invoice stats:', error);
      return {
        totalInvoices: 0,
        pendingInvoices: 0,
        paidInvoices: 0,
        totalRevenue: 0
      };
    }
  }

  // ============ JOB OPERATIONS ============
  async createJob(jobData, userId) {
    try {
      console.log('🟡 [DEBUG] Creating job...');
      
      const result = await this.db.runAsync(
        `INSERT INTO jobs (title, description, customerName, customerPhone, dueDate, status, progress, price, notes, depositAmount, finalPaymentAmount, userId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          jobData.title,
          jobData.description || '',
          jobData.customerName,
          jobData.customerPhone || '',
          jobData.dueDate?.toISOString() || null,
          jobData.status || 'pending',
          jobData.progress || 0,
          jobData.price || 0,
          jobData.notes || '',
          jobData.depositAmount || 0,
          jobData.finalPaymentAmount || 0,
          userId
        ]
      );

      const jobId = result.lastInsertRowId;
      console.log('✅ [DEBUG] Job created. ID:', jobId);

      // If job has price, automatically create an invoice
      if (jobData.price && jobData.price > 0) {
        try {
          const invoice = await this.createInvoiceFromJob(jobId, userId);
          console.log('✅ Invoice created from job:', invoice.id);
        } catch (invoiceError) {
          console.error('Failed to create invoice from job:', invoiceError);
          // Continue even if invoice creation fails
        }
      }

      return await this.getJobById(jobId);
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  }

  async createInvoiceFromJob(jobId, userId) {
    try {
      await this.ensureInitialized();
      
      // Get job details
      const job = await this.getJobById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Check if invoice already exists for this job
      if (job.invoiceId) {
        const existingInvoice = await this.getInvoiceById(job.invoiceId);
        if (existingInvoice) {
          return existingInvoice;
        }
      }

      // Generate invoice number
      const invoiceCount = await this.db.getFirstAsync(
        'SELECT COUNT(*) as count FROM invoices WHERE userId = ?',
        [userId]
      );
      const invoiceNumber = `INV${(invoiceCount.count + 1).toString().padStart(4, '0')}`;

      // Create items array from job price
      const items = JSON.stringify([
        {
          description: job.description || job.title,
          quantity: 1,
          unitPrice: job.price || 0,
          total: job.price || 0
        }
      ]);

      // Create invoice
      const invoiceResult = await this.db.runAsync(
        `INSERT INTO invoices (
          invoiceNumber, customerName, customerPhone, jobDescription, items,
          subtotal, tax, totalAmount, depositAmount, balanceDue,
          paymentStatus, dueDate, jobId, userId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceNumber,
          job.customerName,
          job.customerPhone || '',
          job.description || job.title,
          items,
          job.price || 0,
          0, // tax
          job.price || 0,
          job.depositAmount || job.price * 0.5,
          job.price || 0,
          'pending',
          job.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          jobId,
          userId
        ]
      );

      const invoiceId = invoiceResult.lastInsertRowId;

      // Update job with invoice reference
      await this.db.runAsync(
        'UPDATE jobs SET invoiceId = ? WHERE id = ?',
        [invoiceId, jobId]
      );

      // Update user balance
      await this.db.runAsync(
        'UPDATE users SET currentBalance = currentBalance + ? WHERE id = ?',
        [job.price || 0, userId]
      );

      return await this.getInvoiceById(invoiceId);

    } catch (error) {
      console.error('Error creating invoice from job:', error);
      throw error;
    }
  }

  async getJobs(userId) {
    try {
      return await this.db.getAllAsync(
        'SELECT * FROM jobs WHERE userId = ? ORDER BY createdAt DESC',
        [userId]
      );
    } catch (error) {
      console.error('Error getting jobs:', error);
      return [];
    }
  }

  async getJobById(id) {
    try {
      const jobs = await this.db.getAllAsync(
        'SELECT * FROM jobs WHERE id = ?',
        [id]
      );
      
      if (jobs.length === 0) return null;
      
      return jobs[0];
    } catch (error) {
      console.error('Error getting job:', error);
      return null;
    }
  }

  async getJobStats(userId) {
    try {
      const stats = await this.db.getFirstAsync(`
        SELECT 
          COUNT(*) as totalJobs,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedJobs,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgressJobs
        FROM jobs 
        WHERE userId = ?
      `, [userId]);
      
      return {
        totalJobs: stats?.totalJobs || 0,
        completedJobs: stats?.completedJobs || 0,
        inProgressJobs: stats?.inProgressJobs || 0
      };
    } catch (error) {
      console.error('Error getting job stats:', error);
      return {
        totalJobs: 0,
        completedJobs: 0,
        inProgressJobs: 0
      };
    }
  }

async syncInvoiceWithJob(invoiceId) {
    try {
        const invoice = await this.getInvoiceById(invoiceId);
        if (!invoice || !invoice.jobId) return null;
        
        const jobUpdates = {
            depositAmount: invoice.depositAmount || 0,
            depositReceived: invoice.paymentStatus === 'deposit_received' || 
                            invoice.paymentStatus === 'partial_deposit' || 
                            invoice.paymentStatus === 'completed',
            finalPaymentAmount: invoice.balanceDue || 0,
            finalPaymentReceived: invoice.paymentStatus === 'completed',
            price: invoice.totalAmount || 0
        };
        
        // Update job status based on payment status
        if (invoice.paymentStatus === 'completed') {
            jobUpdates.status = 'completed';
        } else if (invoice.depositAmount > 0) {
            jobUpdates.status = 'in_progress';
        }
        
        await this.updateJob(invoice.jobId, jobUpdates);
        return await this.getJobById(invoice.jobId);
    } catch (error) {
        console.error('Error syncing invoice with job:', error);
        throw error;
    }
}
// Add this new method to database.js for comprehensive payment syncing:
async syncPaymentBetweenInvoiceAndJob(invoiceId, paymentData) {
    try {
        await this.ensureInitialized();
        
        // Start transaction
        await this.db.execAsync('BEGIN TRANSACTION');
        
        // 1. Update invoice
        const invoice = await this.getInvoiceById(invoiceId);
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        
        let newDepositAmount = invoice.depositAmount;
        let newBalanceDue = invoice.balanceDue;
        let newPaymentStatus = invoice.paymentStatus;
        
        if (paymentData.type === 'deposit') {
            newDepositAmount = paymentData.amount;
            newBalanceDue = invoice.totalAmount - paymentData.amount;
            
            if (paymentData.amount >= invoice.totalAmount) {
                newPaymentStatus = 'completed';
            } else if (paymentData.amount >= invoice.totalAmount * 0.5) {
                newPaymentStatus = 'deposit_received';
            } else {
                newPaymentStatus = 'partial_deposit';
            }
        } else {
            newDepositAmount = invoice.depositAmount;
            newBalanceDue = Math.max(0, invoice.balanceDue - paymentData.amount);
            
            if (newBalanceDue <= 0) {
                newPaymentStatus = 'completed';
            } else {
                newPaymentStatus = 'partial_payment';
            }
        }
        
        // Update invoice
        await this.db.runAsync(
            `UPDATE invoices SET 
                depositAmount = ?, 
                balanceDue = ?, 
                paymentStatus = ? 
            WHERE id = ?`,
            [newDepositAmount, newBalanceDue, newPaymentStatus, invoiceId]
        );
        
        // 2. Update linked job if exists
        if (invoice.jobId) {
            const jobUpdates = {
                depositAmount: newDepositAmount,
                depositReceived: newDepositAmount > 0,
                finalPaymentAmount: newBalanceDue,
                finalPaymentReceived: newPaymentStatus === 'completed',
                price: invoice.totalAmount
            };
            
            // Update job status based on payment
            if (newPaymentStatus === 'completed') {
                jobUpdates.status = 'completed';
            } else if (newDepositAmount > 0) {
                jobUpdates.status = 'in_progress';
            }
            
            await this.updateJob(invoice.jobId, jobUpdates);
        }
        
        // 3. Update user balance
        await this.db.runAsync(
            'UPDATE users SET currentBalance = currentBalance + ? WHERE id = ?',
            [paymentData.amount, invoice.userId]
        );
        
        await this.db.execAsync('COMMIT');
        
        // Return updated invoice
        return await this.getInvoiceById(invoiceId);
        
    } catch (error) {
        await this.db.execAsync('ROLLBACK');
        console.error('Error syncing payment:', error);
        throw error;
    }
}

async updateJob(id, updates) {
    try {
        const fields = [];
        const values = [];
        
        Object.entries(updates).forEach(([key, value]) => {
            if (key !== 'id' && value !== undefined) {
                if (value instanceof Date) {
                    fields.push(`${key} = ?`);
                    values.push(value.toISOString());
                } else if (key === 'depositReceived' || key === 'finalPaymentReceived') {
                    fields.push(`${key} = ?`);
                    values.push(value ? 1 : 0);
                } else if (key === 'status') {
                    // Ensure status is valid
                    const validStatuses = ['not_started', 'in_progress', 'completed', 'delivered'];
                    if (validStatuses.includes(value)) {
                        fields.push(`${key} = ?`);
                        values.push(value);
                    }
                } else {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }
        });
        
        if (fields.length === 0) return null;
        
        values.push(id);
        await this.db.runAsync(
            `UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        return await this.getJobById(id);
    } catch (error) {
        console.error('Error updating job:', error);
        throw error;
    }
}

  async deleteJob(id) {
    try {
      await this.db.runAsync('DELETE FROM jobs WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting job:', error);
      throw error;
    }
  }

  // ============ INCOME OPERATIONS ============
async createIncome(incomeData, userId) {
  try {
    console.log('🟡 [DEBUG] Creating income record...');
    
    // We'll store income in expenses table with negative amount to differentiate
    const expenseData = {
      amount: -Math.abs(incomeData.amount), // Negative amount = income
      category: `income_${incomeData.category}`,
      description: `[Income] ${incomeData.source}: ${incomeData.description}`,
      paymentMethod: incomeData.paymentMethod,
      date: incomeData.date,
      recurring: incomeData.recurring || false,
      receiptNumber: incomeData.receiptNumber || '',
      notes: incomeData.notes || '',
    };

    const result = await this.db.runAsync(
      `INSERT INTO expenses (amount, category, description, paymentMethod, date, recurring, receiptNumber, notes, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expenseData.amount,
        expenseData.category,
        expenseData.description,
        expenseData.paymentMethod,
        expenseData.date.toISOString(),
        expenseData.recurring ? 1 : 0,
        expenseData.receiptNumber,
        expenseData.notes,
        userId
      ]
    );
    
    // Update user balance (income increases balance)
    await this.db.runAsync(
      'UPDATE users SET currentBalance = currentBalance + ? WHERE id = ?',
      [Math.abs(incomeData.amount), userId]
    );
    
    return { id: result.lastInsertRowId, ...incomeData };
  } catch (error) {
    console.error('Error creating income:', error);
    throw error;
  }
}

// Add method to get income records
async getIncome(userId) {
  try {
    return await this.db.getAllAsync(
      'SELECT * FROM expenses WHERE userId = ? AND amount < 0 ORDER BY date DESC',
      [userId]
    );
  } catch (error) {
    console.error('Error getting income:', error);
    return [];
  }
}

  // ============ EXPENSE OPERATIONS ============
  async createExpense(expenseData, userId) {
    try {
      const result = await this.db.runAsync(
        `INSERT INTO expenses (amount, category, description, paymentMethod, date, recurring, receiptNumber, notes, userId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          expenseData.amount,
          expenseData.category,
          expenseData.description,
          expenseData.paymentMethod,
          expenseData.date.toISOString(),
          expenseData.recurring ? 1 : 0,
          expenseData.receiptNumber || '',
          expenseData.notes || '',
          userId
        ]
      );
      
      // Update user balance
      await this.db.runAsync(
        'UPDATE users SET currentBalance = currentBalance - ? WHERE id = ?',
        [expenseData.amount, userId]
      );
      
      return { id: result.lastInsertRowId, ...expenseData };
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  async getExpenses(userId, excludeIncome = true) {
  try {
    let query = 'SELECT * FROM expenses WHERE userId = ?';
    const params = [userId];
    
    if (excludeIncome) {
      query += ' AND amount > 0'; // Positive amounts = expenses
    }
    
    query += ' ORDER BY date DESC';
    
    return await this.db.getAllAsync(query, params);
  } catch (error) {
    console.error('Error getting expenses:', error);
    return [];
  }
}

  async getExpenseStats(userId) {
  try {
    // Monthly stats - only for actual expenses (positive amounts)
    const monthlyStats = await this.db.getAllAsync(`
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(amount) as total
      FROM expenses 
      WHERE userId = ? AND amount > 0
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month DESC
      LIMIT 6
    `, [userId]);
    
    // Category stats - only for actual expenses (positive amounts)
    const categoryStats = await this.db.getAllAsync(`
      SELECT 
        category as _id,
        COUNT(*) as count,
        SUM(amount) as total
      FROM expenses 
      WHERE userId = ? AND amount > 0
      GROUP BY category
      ORDER BY total DESC
    `, [userId]);
    
    return {
      monthlyTrend: monthlyStats,
      categoryStats: categoryStats
    };
  } catch (error) {
    console.error('Error getting expense stats:', error);
    return { monthlyTrend: [], categoryStats: [] };
  }
}


  // ============ GALLERY OPERATIONS ============
  async createGalleryItem(galleryData, images, userId) {
    console.log('🎯 [DEBUG] createGalleryItem - START');
    
    try {
      // Validate parameters
      if (!galleryData || !galleryData.title || !galleryData.category) {
        throw new Error('Invalid gallery data: title and category are required');
      }
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      console.log('🎯 Parameters validated');
      console.log('🎯 Images count:', Array.isArray(images) ? images.length : 'N/A');
      
      await this.db.execAsync('BEGIN TRANSACTION');
      console.log('🎯 Transaction started');

      // Insert gallery item
      const result = await this.db.runAsync(
        `INSERT INTO gallery (
          title,
          description,
          category,
          clientName,
          dateCompleted,
          featured,
          tags,
          userId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          galleryData.title,
          galleryData.description || '',
          galleryData.category,
          galleryData.clientName || '',
          galleryData.dateCompleted?.toISOString() || new Date().toISOString(),
          galleryData.featured ? 1 : 0,
          JSON.stringify(galleryData.tags || []),
          userId,
        ]
      );

      const galleryId = result.lastInsertRowId;
      console.log('✅ Gallery record created. ID:', galleryId);

      // Process images if any
      if (Array.isArray(images) && images.length > 0) {
        console.log(`🖼️ Processing ${images.length} image(s)`);
        
        try {
          // Get the document directory using Paths.document
          console.log('🎯 Getting document directory...');
          const documentDir = Paths.document;
          console.log('✅ Document directory URI:', documentDir.uri);
          
          // Create gallery subdirectory inside documents
          const galleryDir = new Directory(documentDir, 'gallery');
          
          if (!galleryDir.exists) {
            console.log('🛠️ Creating gallery directory...');
            galleryDir.create();
            console.log('✅ Gallery directory created');
          }
          
          // Now process each image
          for (let i = 0; i < images.length; i++) {
            const image = images[i];
            console.log(`\n🖼️ Processing image ${i + 1}/${images.length}`);
            
            if (!image || typeof image !== 'object') {
              console.warn(`⚠️ Skipping invalid image ${i + 1}`);
              continue;
            }
            
            console.log('🎯 Image URI:', image.uri);
            
            if (!image.uri) {
              console.warn(`⚠️ Skipping image ${i + 1} - no URI`);
              continue;
            }
            
            // Generate filename
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 9);
            const filename = `gallery_${galleryId}_${timestamp}_${random}.jpg`;
            
            console.log('🎯 Generated filename:', filename);
            
            try {
              // Create source file
              console.log('🎯 Creating source file object...');
              const sourceFile = new File(image.uri);
              console.log('✅ Source file created');
              
              // Create destination file
              console.log('🎯 Creating destination file...');
              const destFile = new File(galleryDir, filename);
              console.log('✅ Destination file created');
              
              // Copy file
              console.log('🎯 Copying file...');
              sourceFile.copy(destFile);
              console.log('✅ File copied successfully');
              
              // Insert record
              console.log('🎯 Inserting into database...');
              await this.db.runAsync(
                `INSERT INTO gallery_images (galleryId, uri, filename)
                 VALUES (?, ?, ?)`,
                [galleryId, destFile.uri, filename]
              );
              console.log('✅ Image record inserted');
              
            } catch (fileError) {
              console.error(`❌ Failed to process image ${i + 1}:`, fileError.message);
              // Continue with other images
            }
          }
          
        } catch (fsError) {
          console.error('❌ FileSystem error:', fsError.message);
          
          // Try cache directory as fallback
          console.log('🔄 Trying cache directory as fallback...');
          try {
            const cacheDir = Paths.cache;
            const galleryDir = new Directory(cacheDir, 'gallery');
            if (!galleryDir.exists) {
              galleryDir.create();
            }
            
            // Process images with cache directory
            for (let i = 0; i < images.length; i++) {
              const image = images[i];
              if (image?.uri) {
                const timestamp = Date.now();
                const random = Math.random().toString(36).substring(2, 9);
                const filename = `gallery_${galleryId}_${timestamp}_${random}.jpg`;
                
                const sourceFile = new File(image.uri);
                const destFile = new File(galleryDir, filename);
                sourceFile.copy(destFile);
                
                await this.db.runAsync(
                  `INSERT INTO gallery_images (galleryId, uri, filename)
                   VALUES (?, ?, ?)`,
                  [galleryId, destFile.uri, filename]
                );
                console.log(`✅ Image ${i + 1} saved to cache`);
              }
            }
            
          } catch (cacheError) {
            console.error('❌ Cache directory also failed:', cacheError);
            // Save original URIs as last resort
            console.log('💾 Saving original URIs only...');
            for (let i = 0; i < images.length; i++) {
              const image = images[i];
              if (image?.uri) {
                const filename = `original_${galleryId}_${i}.jpg`;
                await this.db.runAsync(
                  `INSERT INTO gallery_images (galleryId, uri, filename)
                   VALUES (?, ?, ?)`,
                  [galleryId, image.uri, filename]
                );
                console.log(`✅ Original URI saved for image ${i + 1}`);
              }
            }
          }
        }
      } else {
        console.log('ℹ️ No images to process');
      }

      await this.db.execAsync('COMMIT');
      console.log('🎉 Transaction committed successfully!');
      
      // Return the created gallery item
      const createdItem = await this.getGalleryItemById(galleryId);
      console.log('🎯 Returning created item');
      
      return createdItem;
      
    } catch (error) {
      console.error('❌❌❌ ERROR in createGalleryItem:', error.message);
      
      try {
        await this.db.execAsync('ROLLBACK');
        console.log('🔄 Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ Failed to rollback:', rollbackError.message);
      }
      
      throw error;
    }
  }

  async getGalleryItems(userId, category = 'all') {
    try {
      let query = 'SELECT * FROM gallery WHERE userId = ?';
      const params = [userId];
      
      if (category !== 'all') {
        query += ' AND category = ?';
        params.push(category);
      }
      
      query += ' ORDER BY createdAt DESC';
      
      const items = await this.db.getAllAsync(query, params);
      
      // Get images for each item
      for (const item of items) {
        const images = await this.db.getAllAsync(
          'SELECT * FROM gallery_images WHERE galleryId = ?',
          [item.id]
        );
        item.images = images;
        item.tags = JSON.parse(item.tags || '[]');
      }
      
      return items;
    } catch (error) {
      console.error('Error getting gallery items:', error);
      return [];
    }
  }

  async getGalleryItemById(id) {
    try {
      const items = await this.db.getAllAsync(
        'SELECT * FROM gallery WHERE id = ?',
        [id]
      );
      
      if (items.length === 0) return null;
      
      const item = items[0];
      const images = await this.db.getAllAsync(
        'SELECT * FROM gallery_images WHERE galleryId = ?',
        [id]
      );
      
      item.images = images;
      item.tags = JSON.parse(item.tags || '[]');
      return item;
    } catch (error) {
      console.error('Error getting gallery item:', error);
      return null;
    }
  }

  async updateGalleryItem(id, updates) {
    try {
      const fields = [];
      const values = [];
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          if (key === 'tags') {
            fields.push(`${key} = ?`);
            values.push(JSON.stringify(value));
          } else if (key === 'featured') {
            fields.push(`${key} = ?`);
            values.push(value ? 1 : 0);
          } else {
            fields.push(`${key} = ?`);
            values.push(value);
          }
        }
      });
      
      if (fields.length === 0) return null;
      
      values.push(id);
      await this.db.runAsync(
        `UPDATE gallery SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      
      return await this.getGalleryItemById(id);
    } catch (error) {
      console.error('Error updating gallery item:', error);
      throw error;
    }
  }

  async deleteGalleryItem(id) {
    try {
      // Get images to delete from filesystem
      const images = await this.db.getAllAsync(
        'SELECT * FROM gallery_images WHERE galleryId = ?',
        [id]
      );
      
      // Delete image files using new File API
      for (const image of images) {
        try {
          const imageFile = new File(image.uri);
          if (imageFile.exists) {
            imageFile.delete();
          }
        } catch (error) {
          console.warn('Error deleting image file:', error);
        }
      }
      
      // Delete from database (cascade will delete images)
      await this.db.runAsync('DELETE FROM gallery WHERE id = ?', [id]);
      
      return true;
    } catch (error) {
      console.error('Error deleting gallery item:', error);
      throw error;
    }
  }

  async addGalleryImages(galleryId, images) {
    try {
      console.log('🟡 [DEBUG] addGalleryImages called');
      
      // Get document directory
      const documentDir = Paths.document;
      const galleryDir = new Directory(documentDir, 'gallery');
      
      if (!galleryDir.exists) {
        galleryDir.create();
      }

      // Handle both array and single image
      const imageArray = Array.isArray(images) ? images : [images];
      
      for (let i = 0; i < imageArray.length; i++) {
        const image = imageArray[i];
        
        if (image && image.uri) {
          const filename = `gallery_${galleryId}_${Date.now()}_${Math.random()
            .toString(36)
            .substring(7)}.jpg`;

          // Create source and destination files
          const sourceFile = new File(image.uri);
          const destFile = new File(galleryDir, filename);

          // Copy the file
          sourceFile.copy(destFile);

          await this.db.runAsync(
            `INSERT INTO gallery_images (galleryId, uri, filename)
             VALUES (?, ?, ?)`,
            [galleryId, destFile.uri, filename]
          );
        }
      }

      return await this.getGalleryItemById(galleryId);
    } catch (error) {
      console.error('🔴 [ERROR] Error adding gallery images:', error);
      throw error;
    }
  }

  // ============ GOAL OPERATIONS ============
  async createGoal(goalData, userId) {
    try {
      const progress = goalData.currentAmount / goalData.targetAmount * 100;
      
      const result = await this.db.runAsync(
        `INSERT INTO goals (goalName, targetAmount, currentAmount, periodType, startDate, endDate, progress, notes, userId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          goalData.goalName,
          goalData.targetAmount,
          goalData.currentAmount,
          goalData.periodType,
          goalData.startDate.toISOString(),
          goalData.endDate.toISOString(),
          progress,
          goalData.notes || '',
          userId
        ]
      );
      
      return { id: result.lastInsertRowId, ...goalData, progress };
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  }

  async getGoals(userId) {
    try {
      return await this.db.getAllAsync(
        'SELECT * FROM goals WHERE userId = ? ORDER BY createdAt DESC',
        [userId]
      );
    } catch (error) {
      console.error('Error getting goals:', error);
      return [];
    }
  }

  async updateGoal(id, updates) {
    try {
      const progress = updates.currentAmount / updates.targetAmount * 100;
      updates.progress = progress;
      
      const fields = [];
      const values = [];
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          if (value instanceof Date) {
            fields.push(`${key} = ?`);
            values.push(value.toISOString());
          } else {
            fields.push(`${key} = ?`);
            values.push(value);
          }
        }
      });
      
      if (fields.length === 0) return null;
      
      values.push(id);
      await this.db.runAsync(
        `UPDATE goals SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      
      const goals = await this.db.getAllAsync(
        'SELECT * FROM goals WHERE id = ?',
        [id]
      );
      
      return goals[0] || null;
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  }

  // ============ DASHBOARD STATS ============
  async getDashboardStats(userId) {
  try {
    console.log('📊 getDashboardStats called for userId:', userId);
    
    const [invoiceStats, jobStats, expenseStats, userData] = await Promise.all([
      this.getInvoiceStats(userId),
      this.getJobStats(userId),
      this.getExpenseStats(userId),
      this.getUserById(userId)
    ]);
    
    console.log('📊 User data retrieved:', userData ? 'Yes' : 'No');
    
    // Calculate monthly income from invoices (last 30 days)
    let monthlyIncomeResult = { total: 0 };
    try {
      monthlyIncomeResult = await this.db.getFirstAsync(`
        SELECT SUM(totalAmount) as total
        FROM invoices 
        WHERE userId = ? 
        AND createdAt >= datetime('now', '-30 days')
      `, [userId]) || { total: 0 };
    } catch (error) {
      console.error('Error calculating monthly income:', error);
    }
    
    // Calculate monthly expenses (last 30 days) - only positive amounts
    let monthlyExpensesResult = { total: 0 };
    try {
      monthlyExpensesResult = await this.db.getFirstAsync(`
        SELECT SUM(amount) as total
        FROM expenses 
        WHERE userId = ? 
        AND date >= datetime('now', '-30 days')
        AND amount > 0
      `, [userId]) || { total: 0 };
    } catch (error) {
      console.error('Error calculating monthly expenses:', error);
    }
    
    // Calculate other income (last 30 days) - negative amounts
    let otherIncomeResult = { total: 0 };
    try {
      otherIncomeResult = await this.db.getFirstAsync(`
        SELECT SUM(ABS(amount)) as total
        FROM expenses 
        WHERE userId = ? 
        AND date >= datetime('now', '-30 days')
        AND amount < 0
      `, [userId]) || { total: 0 };
    } catch (error) {
      console.error('Error calculating other income:', error);
    }
    
    const stats = {
      invoices: invoiceStats || { totalInvoices: 0, pendingInvoices: 0, paidInvoices: 0, totalRevenue: 0 },
      jobs: jobStats || { totalJobs: 0, completedJobs: 0, inProgressJobs: 0 },
      financial: {
        balance: userData?.currentBalance || 0,
        monthlyIncome: monthlyIncomeResult?.total || 0,
        monthlyExpenses: monthlyExpensesResult?.total || 0,
        otherIncome: otherIncomeResult?.total || 0,
        netProfit: (monthlyIncomeResult?.total || 0) + (otherIncomeResult?.total || 0) - (monthlyExpensesResult?.total || 0)
      },
      expenseStats: expenseStats || { monthlyTrend: [], categoryStats: [] }
    };
    
    console.log('📊 Stats calculated:', stats);
    return stats;
    
  } catch (error) {
    console.error('❌ Error getting dashboard stats:', error);
    return {
      invoices: { totalInvoices: 0, pendingInvoices: 0, paidInvoices: 0, totalRevenue: 0 },
      jobs: { totalJobs: 0, completedJobs: 0, inProgressJobs: 0 },
      financial: { balance: 0, monthlyIncome: 0, monthlyExpenses: 0, otherIncome: 0, netProfit: 0 },
      expenseStats: { monthlyTrend: [], categoryStats: [] }
    };
  }
}

  // ============ DATA EXPORT ============
  async exportData(userId) {
    try {
      const [user, invoices, expenses, gallery, goals, jobs] = await Promise.all([
        this.getUserById(userId),
        this.getInvoices(userId),
        this.getExpenses(userId),
        this.getGalleryItems(userId),
        this.getGoals(userId),
        this.getJobs(userId)
      ]);
      
      return {
        user,
        invoices,
        expenses,
        gallery,
        goals,
        jobs,
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0'
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  // ============ DATA IMPORT ============
  async importData(data, userId) {
    try {
      await this.db.execAsync('BEGIN TRANSACTION');
      
      // Update user data
      if (data.user) {
        await this.updateUser(userId, data.user);
      }
      
      // Import invoices
      if (data.invoices && Array.isArray(data.invoices)) {
        for (const invoice of data.invoices) {
          // Remove existing invoice if exists
          await this.db.runAsync('DELETE FROM invoices WHERE invoiceNumber = ? AND userId = ?', 
            [invoice.invoiceNumber, userId]);
          
          // Insert new invoice
          const invoiceResult = await this.db.runAsync(
            `INSERT INTO invoices (
              invoiceNumber, customerName, customerEmail, customerPhone,
              customerAddress, jobDescription, items, subtotal, tax, totalAmount,
              depositAmount, balanceDue, paymentStatus, invoiceDate, dueDate, 
              notes, bankDetails, terms, jobId, userId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              invoice.invoiceNumber,
              invoice.customerName,
              invoice.customerEmail,
              invoice.customerPhone,
              invoice.customerAddress,
              invoice.jobDescription,
              JSON.stringify(invoice.items || []),
              invoice.subtotal,
              invoice.tax || 0,
              invoice.totalAmount,
              invoice.depositAmount,
              invoice.balanceDue,
              invoice.paymentStatus || 'pending',
              invoice.invoiceDate,
              invoice.dueDate,
              invoice.notes || '',
              invoice.bankDetails || '',
              invoice.terms || '',
              invoice.jobId || null,
              userId
            ]
          );
        }
      }
      
      await this.db.execAsync('COMMIT');
      return { success: true, message: 'Data imported successfully' };
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      console.error('Error importing data:', error);
      throw error;
    }
  }

  // ============ BACKUP & RESTORE ============
  async backupDatabase() {
    try {
      // Get document directory
      const documentDir = Paths.document;
      
      // Create backup file
      const backupFile = new File(documentDir, `fallo_tailor_backup_${Date.now()}.db`);
      
      // Database file is in SQLite subdirectory
      const dbDir = new Directory(documentDir, 'SQLite');
      const dbFile = new File(dbDir, 'fallo_tailor.db');
      
      // Check if file exists
      if (!dbFile.exists) {
        throw new Error('Database file not found');
      }
      
      // Copy database to backup location
      dbFile.copy(backupFile);
      
      return backupFile.uri;
    } catch (error) {
      console.error('Error backing up database:', error);
      throw error;
    }
  }

  async restoreDatabase(backupUri) {
    try {
      const documentDir = Paths.document;
      const dbDir = new Directory(documentDir, 'SQLite');
      const dbFile = new File(dbDir, 'fallo_tailor.db');
      const backupFile = new File(backupUri);
      
      // Check if backup file exists
      if (!backupFile.exists) {
        throw new Error('Backup file not found');
      }
      
      // Copy backup to database location
      backupFile.copy(dbFile);
      
      // Reinitialize database connection
      await this.init();
      return true;
    } catch (error) {
      console.error('Error restoring database:', error);
      throw error;
    }
  }

  async listBackups() {
    try {
      const documentDir = Paths.document;
      const items = documentDir.list();
      
      // Filter for backup files
      const backups = items.filter(item => 
        item instanceof File && 
        item.name.startsWith('fallo_tailor_backup_') && 
        item.name.endsWith('.db')
      );
      
      return backups.map(file => ({
        name: file.name,
        uri: file.uri,
        size: file.size,
        modificationTime: file.modificationTime
      }));
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  async deleteBackup(backupUri) {
    try {
      const backupFile = new File(backupUri);
      if (backupFile.exists) {
        backupFile.delete();
      }
      return true;
    } catch (error) {
      console.error('Error deleting backup:', error);
      throw error;
    }
  }

  // Add these methods to the DatabaseService class in database.js

async getIncomeRecords(userId) {
  try {
    return await this.db.getAllAsync(
      `SELECT * FROM expenses 
       WHERE userId = ? 
       AND amount < 0 
       ORDER BY date DESC`,
      [userId]
    );
  } catch (error) {
    console.error('Error getting income records:', error);
    return [];
  }
}

async getRecentTransactions(userId, limit = 10) {
  try {
    // Get invoices
    const invoices = await this.getInvoices(userId);
    const invoiceTransactions = invoices.map(invoice => ({
      id: `invoice_${invoice.id}`,
      type: 'income',
      subType: 'invoice',
      description: `Invoice: ${invoice.customerName}`,
      amount: invoice.totalAmount,
      category: 'Invoice',
      date: invoice.createdAt,
      rawData: invoice,
    }));

    // Get income records
    const incomeRecords = await this.getIncomeRecords(userId);
    const incomeTransactions = incomeRecords.map(income => ({
      id: `income_${income.id}`,
      type: 'income',
      subType: 'other',
      description: income.description.replace('[Income] ', ''),
      amount: Math.abs(income.amount),
      category: income.category.replace('income_', ''),
      date: income.date,
      rawData: income,
    }));

    // Get expenses
    const expenses = await this.getExpenses(userId);
    const expenseTransactions = expenses
      .filter(expense => expense.amount > 0)
      .map(expense => ({
        id: `expense_${expense.id}`,
        type: 'expense',
        subType: 'expense',
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        rawData: expense,
      }));

    // Combine and sort
    const allTransactions = [
      ...invoiceTransactions,
      ...incomeTransactions,
      ...expenseTransactions,
    ].sort((a, b) => new Date(b.date) - new Date(a.date))
     .slice(0, limit);

    return allTransactions;
  } catch (error) {
    console.error('Error getting recent transactions:', error);
    return [];
  }
}

async getTransactionStats(userId, period = 'month') {
  try {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Get invoices in period
    const invoiceStats = await this.db.getFirstAsync(`
      SELECT 
        COUNT(*) as count,
        SUM(totalAmount) as total
      FROM invoices 
      WHERE userId = ? 
      AND createdAt >= datetime(?, 'unixepoch')
    `, [userId, Math.floor(startDate.getTime() / 1000)]);

    // Get other income in period
    const incomeStats = await this.db.getFirstAsync(`
      SELECT 
        COUNT(*) as count,
        SUM(ABS(amount)) as total
      FROM expenses 
      WHERE userId = ? 
      AND amount < 0
      AND date >= datetime(?, 'unixepoch')
    `, [userId, Math.floor(startDate.getTime() / 1000)]);

    // Get expenses in period
    const expenseStats = await this.db.getFirstAsync(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total
      FROM expenses 
      WHERE userId = ? 
      AND amount > 0
      AND date >= datetime(?, 'unixepoch')
    `, [userId, Math.floor(startDate.getTime() / 1000)]);

    return {
      invoiceIncome: invoiceStats?.total || 0,
      otherIncome: incomeStats?.total || 0,
      expenses: expenseStats?.total || 0,
      totalIncome: (invoiceStats?.total || 0) + (incomeStats?.total || 0),
      netProfit: (invoiceStats?.total || 0) + (incomeStats?.total || 0) - (expenseStats?.total || 0),
    };
  } catch (error) {
    console.error('Error getting transaction stats:', error);
    return {
      invoiceIncome: 0,
      otherIncome: 0,
      expenses: 0,
      totalIncome: 0,
      netProfit: 0,
    };
  }
}
}



// Create singleton instance
const database = new DatabaseService();
export default database;
