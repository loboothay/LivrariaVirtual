const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { resolve } = require('path');

// Load environment variables
dotenv.config();

const app = express();
const port = 3010;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// Load Swagger document
const swaggerDocument = YAML.load('./swagger.yaml');

// Swagger UI options
const swaggerOptions = {
  swaggerOptions: {
    persistAuthorization: true
  },
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Virtual Bookstore API Documentation'
};

// Swagger UI
app.use(['/', '/api-docs'], swaggerUi.serve);
app.get(['/', '/api-docs'], swaggerUi.setup(swaggerDocument, swaggerOptions));

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Auth endpoints
app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Sign up the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name // Store name in auth metadata
        }
      }
    });
    
    if (authError) throw authError;

    // Create the user profile in the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        { 
          id: authData.user.id, 
          name, 
          email 
        }
      ])
      .select()
      .single();
    
    if (userError) throw userError;

    // Return combined auth and user data
    res.status(201).json({
      user: userData,
      session: authData.session
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Protected routes - require authentication
// Book Favorites endpoints
app.get('/book-favorites', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('book_favorites')
      .select('*');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/book-favorites', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('book_favorites')
      .insert([{ ...req.body, user_id: req.user.id }])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Books endpoints
app.get('/books', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/books', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('books')
      .insert([req.body])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/books/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/books/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('books')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/books/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('books')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json({ message: 'Book successfully deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Categories endpoints
app.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/categories', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([req.body])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/categories/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Category successfully deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Users endpoints
app.get('/users', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/users', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([req.body])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reviews endpoints
app.get('/reviews', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/reviews', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .insert([{ ...req.body, user_id: req.user.id }])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/reviews/:id', authenticateToken, async (req, res) => {
  try {
    // Ensure user can only update their own reviews
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select()
      .eq('id', req.params.id)
      .single();

    if (reviewError) throw reviewError;
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    if (review.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    const { data, error } = await supabase
      .from('reviews')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/reviews/:id', authenticateToken, async (req, res) => {
  try {
    // Ensure user can only delete their own reviews
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select()
      .eq('id', req.params.id)
      .single();

    if (reviewError) throw reviewError;
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    if (review.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    const { data, error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ message: 'Review successfully deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Loans endpoints
app.get('/loans', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', req.user.id); // Only return loans for the authenticated user
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/loans', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('loans')
      .insert([{ 
        ...req.body, 
        user_id: req.user.id, 
        status: 'active',
        returned_at: null // Ensure returned_at is null for new loans
      }])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update endpoint for returning a loan
app.put('/loans/:id/return', authenticateToken, async (req, res) => {
  try {
    const { returned_at } = req.body;
    
    // Validate date format YYYY-MM-DD
    if (!returned_at || !/^\d{4}-\d{2}-\d{2}$/.test(returned_at)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Update only the returned_at date
    const { data, error } = await supabase
      .from('loans')
      .update({ returned_at })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Virtual Bookstore API running at http://localhost:${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api-docs`);
});