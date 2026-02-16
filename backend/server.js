  require('dotenv').config();
  console.log('SENDGRID_FROM:', process.env.SENDGRID_FROM);
  console.log('SENDGRID_API_KEY loaded:', !!process.env.SENDGRID_API_KEY);
  const express = require('express');
  const helmet = require('helmet');
  const compression = require('compression');
  const cors = require('cors');
  const mysql = require('mysql2');
  const bcrypt = require('bcrypt');
  const jwt = require('jsonwebtoken');
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');
  const cloudinary = require('cloudinary').v2;
  const streamifier = require('streamifier');

  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);





  // OTP EMAIL
  function sendOtpEmail(to, otp) {
    const msg = {
      to,
      from: process.env.SENDGRID_FROM,
      subject: 'DRT - OTP Code',
      html: `
      <p>Dear User,</p>

      <p>
        To proceed with your <b>DTR account verification</b>, please use the
        One-Time Password (OTP) below:
      </p>

      <h2 style="letter-spacing: 2px;">${otp}</h2>

      <p>
        For security reasons, this code will expire in <b>5 minutes</b>
        and can only be used once.
      </p>

      <p>
        If you did not initiate this request, please ignore this message
        or contact support immediately.
      </p>

      <br/>
      <p>Sincerely,<br/><b>DTR Security Team</b></p>
      `,
    };

    return sgMail.send(msg);
  }

// DOCUMENT REQUEST MESSAGES
function sendRequestStatusEmail(to, status, reason = null, documentType = '') {
  if (!to) return Promise.resolve();

  const subjects = {
    pending: 'Your document request has been submitted',
    under_review: 'Your document request is now Under Review',
    approved: 'Your document request has been Approved',
    denied: 'Your document request was Denied'
  };

  const messages = {
    pending: `
      <p>Hello,</p>
      <p>Your request for <b>${documentType}</b> has been <b>submitted</b> and is now <b>pending review</b>.</p>
      <p>You will receive another update once staff begins processing your request.</p>
    `,
    under_review: `
      <p>Hello,</p>
      <p>Your request for <b>${documentType}</b> is now <b>Under Review</b>.</p>
    `,
    approved: `
      <p>Hello,</p>
      <p>Your request for <b>${documentType}</b> has been <b>Approved and processed</b>.</p>
    `,
    denied: `
      <p>Hello,</p>
      <p>Unfortunately, your request for <b>${documentType}</b> was <b>Denied</b>.</p>
      <p><b>Reason:</b> ${reason || 'No reason provided.'}</p>
    `
  };

  const msg = {
    to,
    from: process.env.SENDGRID_FROM,
    subject: subjects[status],
    html: messages[status]
  };

  return sgMail.send(msg);
}

  const app = express();
  app.use(helmet({
  contentSecurityPolicy: false, // Can be enabled if needed
}));
  app.use(compression());
//app.use(express.static(path.join(__dirname, 'public')));

  app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://angelescitydrt.org', 'https://www.angelescitydrt.org']
    : ['http://localhost:4200', 'http://localhost:4000'],
  credentials: true
}));

  app.use(express.json());

  const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectTimeout: 10000
});

db.connect(err => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL');
});

// Handle database errors
db.on('error', (err) => {
  console.error('Database error:', err);
});

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  const upload = multer({ storage: multer.memoryStorage() });

  const uploadToCloudinary = (fileBuffer, folder) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
        if (result) resolve(result);
        else reject(error);
      });
      streamifier.createReadStream(fileBuffer).pipe(stream);
    });
  }


// Serve the uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  }

  // Create or update user details for first-time login
  app.post('/api/user/details', verifyToken, (req, res) => {
  const userId = req.user.id;
  const { firstName, middleName, lastName, address, contactNo } = req.body;

  if (!firstName || !lastName || !address || !contactNo) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Check if user details already exist
  db.query('SELECT * FROM user_details WHERE UserID = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });

    const fullName = `${firstName} ${middleName || ''} ${lastName}`.trim();

    if (results.length === 0) {
      // Insert new details
db.query(
  `INSERT INTO user_details
    (UserID, User_FName, User_MName, User_LName, User_Address, User_ContactNo)
   VALUES (?, ?, ?, ?, ?, ?)`,
  [userId, firstName, middleName || null, lastName, address, contactNo],
  (err) => {
    if (err) return res.status(500).json({ message: 'Failed to save details', error: err.message });
    res.json({ message: 'Details saved successfully' });
  }
);

    } else {
      // Update existing details
db.query(
  `UPDATE user_details
  SET User_FName = ?, User_MName = ?, User_LName = ?, User_Address = ?, User_ContactNo = ?
  WHERE UserID = ?`,
  [firstName, middleName || null, lastName, address, contactNo, userId],
  (err) => {
    if (err) return res.status(500).json({ message: 'Failed to update details', error: err.message });
    res.json({ message: 'Details updated successfully' });
  }
);

    }
  });
});

// Optional: fetch user details for pre-fill
app.get('/api/user/details', verifyToken, (req, res) => {
  const userId = req.user.id;
  db.query('SELECT * FROM user_details WHERE UserID = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length === 0) return res.status(404).json({ message: 'User details not found' });
    res.json(results[0]);
  });
});


  // Middleware to check allowed roles
function checkRoles(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient role' });
    }
    next();
  }
}

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { contact, password } = req.body;
      console.log('Register body:', req.body);

      if (!contact || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      const isEmail = /\S+@\S+\.\S+/.test(contact);
      const email = isEmail ? contact : null;
      const phone = !isEmail ? contact : null;

      const query = email
        ? 'SELECT id FROM users WHERE email = ?'
        : 'SELECT id FROM users WHERE phone = ?';

      db.query(query, [contact], async (err, results) => {
        if (err) {
          console.error('DB SELECT error:', err);
          return res.status(500).json({ message: 'Database error' });
        }
        if (results.length > 0) {
          return res.status(400).json({ message: 'Contact already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        db.query(
          'INSERT INTO pending_users (email, phone, password, otp, otp_expires_at) VALUES (?, ?, ?, ?, ?)',
          [email, phone, hashedPassword, otp, expiresAt],
          async (err2) => {
            if (err2) {
              console.error('DB INSERT error:', err2);
              return res.status(500).json({ message: 'Database error' });
            }

            console.log('OTP:', otp);

            if (email) {
              try {
                await sendOtpEmail(email, otp);
              } catch (e) {
                console.error('sendOtpEmail error:', e);
              }
            }

            return res.status(201).json({ message: 'OTP sent. Please verify to complete registration.' });
          }
        );
      });
    } catch (e) {
      console.error('Unexpected error:', e);
      res.status(500).json({ message: 'Unexpected server error' });
    }
  });



  app.post('/api/auth/verify-otp', (req, res) => {
    const { email, phone, otp } = req.body;

    if ((!email && !phone) || !otp) {
      return res.status(400).json({ message: 'Contact and OTP are required' });
    }

    const value = email || phone;
    const query = email
      ? 'SELECT * FROM pending_users WHERE email = ?'
      : 'SELECT * FROM pending_users WHERE phone = ?';

    db.query(query, [value], (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (results.length === 0) return res.status(404).json({ message: 'No pending registration found' });

      const pendingUser = results[0];

      if (new Date(pendingUser.otp_expires_at) < new Date()) {
        return res.status(400).json({ message: 'OTP expired' });
      }

      if (String(pendingUser.otp) !== String(otp)) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }

      // Move user to main users table
      db.query(
        'INSERT INTO users (email, phone, password, role, created_at) VALUES (?, ?, ?, ?, NOW())',
        [pendingUser.email, pendingUser.phone, pendingUser.password, 3],
        (err) => {
          if (err) return res.status(500).json({ message: 'Failed to create user' });

          // Delete from pending_users
          db.query('DELETE FROM pending_users WHERE id = ?', [pendingUser.id], () => {});

          res.json({ message: 'Registration successful' });
        }
      );
    });
  });

  app.post('/api/auth/resend-otp', (req, res) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    return res.status(400).json({ message: 'Email or phone is required' });
  }

  const value = email || phone;
  const query = email
    ? 'SELECT * FROM pending_users WHERE email = ?'
    : 'SELECT * FROM pending_users WHERE phone = ?';

  db.query(query, [value], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length === 0) return res.status(404).json({ message: 'No pending registration found' });

    const pendingUser = results[0];

    // Check last OTP sent time
    const now = new Date();
    const lastSent = new Date(pendingUser.otp_expires_at.getTime() - 10*60*1000);
    const cooldown = 60 * 1000;
    if (now - lastSent < cooldown) {
      return res.status(429).json({ message: `Please wait ${Math.ceil((cooldown - (now - lastSent))/1000)} seconds before resending OTP` });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    db.query(
      'UPDATE pending_users SET otp = ?, otp_expires_at = ? WHERE id = ?',
      [otp, expiresAt, pendingUser.id],
      async (err) => {
        if (err) return res.status(500).json({ message: 'Failed to update OTP' });

        if (email) {
          try { await sendOtpEmail(email, otp); }
          catch (e) { console.error('Error sending OTP email:', e); }
        }

        res.json({ message: 'OTP resent successfully' });
      }
    );
  });
});




app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length === 0) return res.status(400).json({ message: 'Invalid credentials' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    // Check if user details exist
    db.query('SELECT * FROM user_details WHERE UserID = ?', [user.id], (err, details) => {
      if (err) return res.status(500).json({ message: 'Database error' });

      const detailsCompleted = details.length > 0;

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          detailsCompleted
        }
      });
    });
  });
});


  app.post('/api/auth/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (results.length === 0) return res.status(404).json({ message: 'User not found with this email' });

      try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.query(
          'UPDATE users SET password = ? WHERE email = ?',
          [hashedPassword, email],
          (err) => {
            if (err) return res.status(500).json({ message: 'Error updating password' });
            res.json({ message: 'Password updated successfully' });
          }
        );
      } catch (error) {
        res.status(500).json({ message: 'Server error' });
      }
    });
  });

  app.put('/api/auth/update', upload.single('image'), async (req, res) => {
    try {
      const token = req.headers['authorization']?.split(' ')[1];
      if (!token) return res.status(401).json({ message: 'Unauthorized' });

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      const userId = decoded.id;
      const { username, email, newPassword } = req.body;
      let updateFields = [];
      let values = [];

      if (username) { updateFields.push('username = ?'); values.push(username); }
      if (email) { updateFields.push('email = ?'); values.push(email); }
      if (newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        updateFields.push('password = ?');
        values.push(hashedPassword);
      }

      if (req.file) {
        const uploaded = await uploadToCloudinary(req.file.buffer, "profiles");
        updateFields.push('image = ?');
        values.push(uploaded.secure_url);
      }

      if (updateFields.length === 0) return res.status(400).json({ message: 'No fields to update' });

      values.push(userId);
      const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      db.query(sql, values, (err) => {
        if (err) return res.status(500).json({ message: 'Failed to update profile' });
        db.query('SELECT id, username, email, role, image FROM users WHERE id = ?', [userId], (err, results) => {
          if (err || results.length === 0) return res.status(500).json({ message: 'Failed to fetch updated profile' });
          res.json({ message: 'Profile updated successfully', user: results[0] });
        });
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/admin/create-user', verifyToken, checkRoles([1]), async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || ![1, 2].includes(role)) {
    return res.status(400).json({ message: 'Invalid data' });
  }

  db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length > 0) return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      'INSERT INTO users (email, password, role, created_at) VALUES (?, ?, ?, NOW())',
      [email, hashedPassword, role],
      err => {
        if (err) return res.status(500).json({ message: 'Failed to create account' });
        res.status(201).json({ message: 'Account created successfully' });
      }
    );
  });
});

app.get('/api/admin/users', verifyToken, checkRoles([1]), (req, res) => {
  const sql = `
  SELECT
    u.id,
    u.email,
    ud.User_FullName AS full_name,
    ud.User_Address,
    ud.User_ContactNo,
    u.role,
    u.created_at
  FROM users u
  LEFT JOIN user_details ud ON u.id = ud.UserID
  ORDER BY u.role ASC, u.created_at DESC
`;

db.query(sql, (err, results) => {
  if (err) return res.status(500).json({ message: 'Database error' });
  res.json(results);
});
});

app.get('/api/admin/users/:id', verifyToken, checkRoles([1]), (req, res) => {
  const userId = req.params.id;

  const sql = `
    SELECT
      u.id,
      u.email,
      ud.User_FullName AS full_name,
      ud.User_Address,
      ud.User_ContactNo,
      u.role,
      u.created_at
    FROM users u
    LEFT JOIN user_details ud ON u.id = ud.UserID
    WHERE u.id = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(results[0]);
  });
});



app.put('/api/admin/users/:id', verifyToken, checkRoles([1]), (req, res) => {
  const { email, role } = req.body; // remove username
  const userId = req.params.id;

  if (![1, 2, 3].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  const sql = 'UPDATE users SET email = ?, role = ? WHERE id = ?';
  db.query(sql, [email, role, userId], (err, result) => {
    if (err) {
      console.error('Error updating user credentials:', err);
      return res.status(500).json({ message: 'Update failed', error: err.message });
    }
    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User updated successfully' });
  });
});


app.put('/api/admin/users/:id/password', verifyToken, checkRoles([1]), async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.params.id;

  if (!newPassword) return res.status(400).json({ message: 'Password required' });

  const hashed = await bcrypt.hash(newPassword, 10);

  db.query(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashed, userId],
    err => {
      if (err) return res.status(500).json({ message: 'Password update failed' });
      res.json({ message: 'Password changed successfully' });
    }
  );
});

app.delete('/api/admin/users/:id', verifyToken, checkRoles([1]), (req, res) => {
  const userId = req.params.id;

  if (req.user.id == userId) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ message: 'Transaction start failed' });

    db.query(`
      DELETE rsh FROM request_status_history rsh
      JOIN document_request dr ON rsh.RequestID = dr.RequestID
      WHERE dr.user_id = ?
    `, [userId], err => {

      if (err) return db.rollback(() => res.status(500).json({ message: 'Failed deleting history', error: err.message }));

      db.query('DELETE FROM document_request WHERE user_id = ?', [userId], err => {

        if (err) return db.rollback(() => res.status(500).json({ message: 'Failed deleting requests', error: err.message }));

        db.query('DELETE FROM user_details WHERE UserID = ?', [userId], err => {

          if (err) return db.rollback(() => res.status(500).json({ message: 'Failed deleting user details', error: err.message }));

          db.query('DELETE FROM users WHERE id = ?', [userId], err => {

            if (err) return db.rollback(() => res.status(500).json({ message: 'Failed deleting user', error: err.message }));

            db.commit(err => {
              if (err) return db.rollback(() => res.status(500).json({ message: 'Commit failed' }));
              res.json({ message: 'User deleted successfully' });
            });

          });
        });
      });
    });
  });
});


  app.get('/api/admin/staff', verifyToken, checkRoles([1]), (req, res) => {
    db.query('SELECT id, email, username, role, created_at FROM users WHERE role = 2', (err, results) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      res.json(results);
    });
  });

  app.delete('/api/admin/staff/:id', verifyToken, checkRoles([1]), (req, res) => {
    const staffId = req.params.id;
    db.query('DELETE FROM users WHERE id = ? AND role = 2', [staffId], (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Staff not found' });
      res.json({ message: 'Staff deleted successfully' });
    });
  });



// Get all document requests
app.get('/api/document_request', verifyToken, checkRoles([1, 2]), (req, res) => {
  const staffId = req.user.id;

  const sql = `
    SELECT *
    FROM document_request
    WHERE (status = 'pending' AND assigned_staff_id IS NULL)
       OR assigned_staff_id = ?
    ORDER BY date_created DESC
  `;

  db.query(sql, [staffId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch document requests' });
    res.json(results);
  });
});


// Get a single document request by ID
app.get('/api/document_request/:id', verifyToken, (req, res) => {
  const requestId = parseInt(req.params.id, 10);

  const sql = `
    SELECT dr.RequestID, dr.name, dr.date_created, dr.status, dr.updated_at,
    dr.file_path,      -- ADD THIS LINE
    u.email,
    CONCAT(ud.User_FName, ' ', ud.User_LName) AS full_name
    FROM document_request dr
    LEFT JOIN users u ON dr.user_id = u.id
    LEFT JOIN user_details ud ON u.id = ud.UserID
    WHERE dr.RequestID = ?
  `;

  db.query(sql, [requestId], (err, results) => {
    if (err) {
      console.error('Failed to fetch document request:', err);
      return res.status(500).json({ error: 'Failed to fetch document request' });
    }

    if (results.length === 0) return res.status(404).json({ error: 'Document request not found' });

    res.json(results[0]);
  });
});

// Admin: Get document request statistics (filterable by status)
app.get('/api/admin/document_request/statistics', verifyToken, checkRoles([1]), (req, res) => {
  const { status } = req.query; // optional: pending, under_review, approved, denied

  let sql = `SELECT status, COUNT(*) AS count FROM document_request`;
  const params = [];

  if (status) {
    sql += ` WHERE status = ?`;
    params.push(status);
  }

  sql += ` GROUP BY status`;

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    res.json(results);
  });
});


// ===== Mark request as "In Process" =====
app.post('/api/document_request/:id/process', verifyToken, checkRoles([1, 2]), async (req, res) => {
  const requestId = parseInt(req.params.id, 10);
  if (isNaN(requestId)) return res.status(400).json({ message: 'Invalid request ID' });

  const staffId = req.user.id;

  const sql = `
    UPDATE document_request
    SET status = ?, updated_at = NOW(), assigned_staff_id = ?
    WHERE RequestID = ?
  `;

  db.query(sql, ['under_review', staffId, requestId], async (err, result) => {
    if (err) return res.status(500).json({ message: 'Failed to process request', error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Request not found' });

    try {
      const [userData] = await new Promise((resolve, reject) => {
        db.query(
          'SELECT u.email, dr.document_type FROM document_request dr JOIN users u ON dr.user_id = u.id WHERE dr.RequestID = ?',
          [requestId],
          (err, results) => err ? reject(err) : resolve(results)
        );
      });

      if (userData && userData.email) {
        await sendRequestStatusEmail(userData.email, 'under_review', null, userData.document_type);

        // Log to history
        const emailMsg = `Your request for ${userData.document_type} is now In Process.`;
        db.query(
          'INSERT INTO request_status_history (RequestID, status, email_message) VALUES (?, ?, ?)',
          [requestId, 'under_review', emailMsg],
          (err) => { if (err) console.error('Failed to log history', err); }
        );
      }
    } catch (err) {
      console.error('Error sending email or logging history:', err);
    }

    res.json({ message: 'Request marked as In Process and assigned to you' });
  });
});


// ===== Mark request as "Approved" =====
app.post('/api/document_request/:id/approved', verifyToken, checkRoles([1, 2]), (req, res) => {
  const requestId = req.params.id;
  const staffId = req.user.id;

  const sql = `
    UPDATE document_request
    SET status = ?, updated_at = NOW(), assigned_staff_id = ?
    WHERE RequestID = ?
  `;
  db.query(sql, ['approved', staffId, requestId], (err, result) => {
    if (err) return res.status(500).json({ message: 'Failed to process request', error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Request not found' });

    // Get user email and document type
    db.query(
      'SELECT u.email, dr.document_type FROM document_request dr JOIN users u ON dr.user_id = u.id WHERE dr.RequestID = ?',
      [requestId],
      (err, results) => {
        if (!err && results.length > 0) {
          const email = results[0].email;
          const documentType = results[0].document_type;
          sendRequestStatusEmail(email, 'approved', null, documentType);

          const emailMsg = `Your request for ${documentType} has been Approved.`;
          db.query(
            'INSERT INTO request_status_history (RequestID, status, email_message) VALUES (?, ?, ?)',
            [requestId, 'approved', emailMsg],
            (err) => { if (err) console.error('Failed to log history', err); }
          );
        }
      }
    );

    res.json({ message: 'Request marked as Approved and assigned to you' });
  });
});

// ===== Mark request as "Denied" =====
app.put('/api/document_request/:id/deny', verifyToken, checkRoles([1, 2]), (req, res) => {
  const requestId = req.params.id;
  const staffId = req.user.id;
  const { reason } = req.body;

  if (!reason) return res.status(400).json({ message: 'Denial reason is required' });

  const sql = `
    UPDATE document_request
    SET status = ?, denial_reason = ?, updated_at = NOW(), assigned_staff_id = ?
    WHERE RequestID = ?
  `;
  db.query(sql, ['denied', reason, staffId, requestId], (err, result) => {
    if (err) return res.status(500).json({ message: 'Failed to update request', error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Request not found' });

    // Get user email and document type
    db.query(
      'SELECT u.email, dr.document_type FROM document_request dr JOIN users u ON dr.user_id = u.id WHERE dr.RequestID = ?',
      [requestId],
      (err, results) => {
        if (!err && results.length > 0) {
          const email = results[0].email;
          const documentType = results[0].document_type;
          sendRequestStatusEmail(email, 'denied', reason, documentType);

          const emailMsg = `Your request for ${documentType} was Denied. Reason: ${reason}`;
          db.query(
            'INSERT INTO request_status_history (RequestID, status, email_message) VALUES (?, ?, ?)',
            [requestId, 'denied', emailMsg],
            (err) => { if (err) console.error('Failed to log history', err); }
          );
        }
      }
    );

    res.json({ message: 'Request marked as Denied and assigned to you' });
  });
});

// Admin: Get all document requests
app.get('/api/admin/document_request', verifyToken, checkRoles([1]), (req, res) => {
  const sql = `
    SELECT RequestID, name, date_created, status, updated_at, archived
    FROM document_request
    ORDER BY date_created DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(results);
  });
});


app.put('/api/document_request/:id/archive', verifyToken, checkRoles([1]), (req, res) => {
  const requestId = req.params.id;

  db.query('SELECT * FROM document_request WHERE RequestID = ?', [requestId], (err, results) => {
    if (err) return res.status(500).json({ message: 'DB error', error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'Request not found' });

    const request = results[0];
    const recipientName = request.name ? request.name.replace(/\s+/g, '_') : `request_${requestId}`;
    const timestamp = new Date(request.updated_at || new Date()).toISOString().replace(/[:.]/g, '-');

    const archiveDir = path.join(__dirname, 'archives');
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir);

    const requestFolder = path.join(archiveDir, `${recipientName}_${timestamp}`);
    if (!fs.existsSync(requestFolder)) fs.mkdirSync(requestFolder);

    if (request.file_path) {
      const oldPath = path.join(__dirname, request.file_path);
      if (fs.existsSync(oldPath)) {
        try {
          fs.renameSync(oldPath, path.join(requestFolder, path.basename(request.file_path)));
        } catch (err) {
          return res.status(500).json({ message: 'Failed to archive file', error: err.message });
        }
      }
    }

    db.query('UPDATE document_request SET archived = 1, updated_at = NOW() WHERE RequestID = ?', [requestId], (err) => {
      if (err) return res.status(500).json({ message: 'Failed to update DB', error: err.message });
      res.json({ message: 'Request archived successfully' });
    });
  });
});


// Get requests for logged in user
app.get('/api/my/requests', verifyToken, checkRoles([3]), (req, res) => {
  const userId = req.user.id;
  const sql = `
    SELECT RequestID, name, document_type, status, updated_at, file_path
    FROM document_request
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(results);
  });
});

// Get history for specific request
app.get('/api/my/requests/:id/history', verifyToken, checkRoles([3]), (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;

  db.query('SELECT * FROM document_request WHERE RequestID = ? AND user_id = ?', [requestId, userId], (err, reqResults) => {
    if (err || reqResults.length === 0) return res.status(404).json({ message: 'Request not found' });

    db.query('SELECT status, email_message, updated_at FROM request_status_history WHERE RequestID = ? ORDER BY updated_at ASC', [requestId], (err, history) => {
      if (err) return res.status(500).json({ message: 'Failed to fetch history' });
      res.json(history);
    });
  });
});

app.get('/api/my/requests/:id/download', verifyToken, checkRoles([3]), (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;

  db.query('SELECT file_path FROM document_request WHERE RequestID = ? AND user_id = ?', [requestId, userId], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ message: 'File not found' });

    const filePath = path.join(__dirname, results[0].file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File does not exist' });

    res.download(filePath);
  });
});


/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

// Use multer memory storage for upload
// Use multer memory storage for multiple file upload
const uploadDocMultiple = multer({ storage: multer.memoryStorage() }).array('files', 5); // allow max 5 files

app.post('/api/document_request', verifyToken, checkRoles([3]), (req, res) => {
  uploadDocMultiple(req, res, async (err) => {
    if (err) return res.status(500).json({ error: 'File upload failed', details: err.message });

    const { name, document_type } = req.body;
    const userId = req.user.id;

    if (!name || !document_type) {
      return res.status(400).json({ error: 'Name and document_type are required' });
    }

    let savedFiles = [];

    if (req.files && req.files.length > 0) {
      const uploadsDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

      req.files.forEach(file => {
        const filename = Date.now() + '-' + file.originalname;
        const fullPath = path.join(uploadsDir, filename);
        try {
          fs.writeFileSync(fullPath, file.buffer);
          savedFiles.push('uploads/' + filename);
        } catch (err) {
          console.error('Failed to save file:', err);
        }
      });
    }

    const filePathString = savedFiles.join(','); // save all files in 1 column

    const sql = 'INSERT INTO document_request (name, document_type, file_path, user_id) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, document_type, filePathString, userId], async (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database insert failed' });
      }

      const requestId = result.insertId;

      // Send "pending" email to user
      try {
        const userEmailResults = await new Promise((resolve, reject) => {
          db.query('SELECT email FROM users WHERE id = ?', [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
          });
        });

        if (userEmailResults.length > 0 && userEmailResults[0].email) {
          await sendRequestStatusEmail(userEmailResults[0].email, 'pending', null, document_type);
        }
      } catch (emailErr) {
        console.error('Failed to send pending email:', emailErr);
      }

      res.status(201).json({
        message: 'Document request submitted successfully',
        requestId,
        filePath: filePathString
      });
    });
  });
});



/* START SERVER */

// Serve static files from Angular build
app.use(express.static(path.join(__dirname, 'public/browser')));

// Handle Angular routing - catch-all route for all non-API routes
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/browser/index.html'));
});

// Global error handler (optional, for catching any errors)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server gracefully...');
  db.end();
  process.exit(0);
});
